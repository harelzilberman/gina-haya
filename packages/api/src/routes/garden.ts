import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';

export const gardenRouter: IRouter = Router();

// All garden routes require authentication + tier attachment
gardenRouter.use(verifyToken);
gardenRouter.use(attachTier);

// ── Shared irrigation field validator ────────────────────────────────────────
// Used by both POST /:id/plants (create) and PATCH /garden-plants/:id (update).
// Returns { fields } on success or { error, message } on validation failure.
// `auto_irrigation` defaults to false when absent; arrays are nulled when false.
function validateIrrigationFields(body: any): {
  fields: { auto_irrigation: boolean; irrigation_days: number[] | null; irrigation_times: string[] | null };
} | { error: string; message: string } {
  const rawAuto = body.auto_irrigation;
  const autoIrrigation = rawAuto === undefined ? false : Boolean(rawAuto);

  // Turning off (or absent) — force arrays to null immediately, skip array validation
  if (!autoIrrigation) {
    return { fields: { auto_irrigation: false, irrigation_days: null, irrigation_times: null } };
  }

  // auto_irrigation is true — validate both arrays
  const { irrigation_days, irrigation_times } = body;

  if (
    !Array.isArray(irrigation_days) ||
    irrigation_days.length < 1 || irrigation_days.length > 7 ||
    !irrigation_days.every((d: any) => Number.isInteger(Number(d)) && Number(d) >= 0 && Number(d) <= 6) ||
    new Set(irrigation_days.map(Number)).size !== irrigation_days.length
  ) {
    return {
      error: 'invalid_irrigation_days',
      message: 'irrigation_days must be 1–7 unique integers in range 0–6 (0=Sun … 6=Sat)',
    };
  }

  if (
    !Array.isArray(irrigation_times) ||
    irrigation_times.length < 1 || irrigation_times.length > 3 ||
    !irrigation_times.every((t: any) => /^\d{2}:\d{2}$/.test(String(t)))
  ) {
    return {
      error: 'invalid_irrigation_times',
      message: 'irrigation_times must be 1–3 strings in HH:MM format',
    };
  }

  return {
    fields: {
      auto_irrigation: true,
      irrigation_days: irrigation_days.map(Number),
      irrigation_times: irrigation_times.map(String),
    },
  };
}

// GET /api/garden — get all gardens for current user
gardenRouter.get('/', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('gardens')
      .select('*, garden_plants(*)')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.json(data || []);
  } catch (err: any) {
    console.error('[GET /api/garden]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/garden/:id — get a single garden
gardenRouter.get('/:id', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('gardens')
      .select('*, garden_plants(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'garden_not_found' });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.json(data);
  } catch (err: any) {
    console.error('[GET /api/garden/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garden — create a new garden
gardenRouter.post('/', async (req: any, res) => {
  try {
    const { name, locationRegion, soilType, location, description, plantIds = [] } = req.body;

    // Enforce per-tier garden limit.
    // Explicit LAUNCH_FREE_MODE guard: when true, alpha testers bypass the cap entirely
    // (professional now has a finite limit of 10, so we can't rely on null-check alone).
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
    const maxGardens = req.limits?.maxGardens ?? null;
    if (!LAUNCH_FREE_MODE && maxGardens !== null) {
      const { count } = await db
        .from('gardens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id);

      if ((count ?? 0) >= maxGardens) {
        return res.status(403).json({
          error: 'garden_limit_reached',
          message: 'הגעת למגבלת הגינות בתכנית שלך.',
          tier: req.tier,
          limit: maxGardens,
          used: count,
        });
      }
    }

    // If this is the first garden, mark it as default
    const { count: existingCount } = await db
      .from('gardens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const isFirst = (existingCount ?? 0) === 0;

    // Create the garden
    const { data: garden, error: gardenError } = await db
      .from('gardens')
      .insert({
        user_id: req.user.id,
        name: name || 'הגינה שלי',
        location_region: locationRegion || null,
        location: location || null,
        description: description || null,
        soil_type: soilType || null,
        notes: '',
        is_default: isFirst,
      })
      .select()
      .single();

    if (gardenError) throw gardenError;

    // Add plants if provided
    if (plantIds.length > 0) {
      // Fetch plant details
      const { data: plants } = await db
        .from('plants')
        .select('id, common_name_he, common_name_en')
        .in('id', plantIds);

      if (plants && plants.length > 0) {
        const plantRows = plants.map((p: any) => ({
          garden_id: garden.id,
          plant_id: p.id,
          common_name_he: p.common_name_he,
          common_name_en: p.common_name_en,
        }));

        await db.from('garden_plants').insert(plantRows);
      }
    }

    res.status(201).json(garden);
  } catch (err: any) {
    console.error('[POST /api/garden]', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/garden/:id — update a garden
gardenRouter.patch('/:id', async (req: any, res) => {
  try {
    const { name, locationRegion, soilType, notes, location, description } = req.body;

    const { data, error } = await db
      .from('gardens')
      .update({
        ...(name !== undefined && { name }),
        ...(locationRegion !== undefined && { location_region: locationRegion }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
        ...(soilType !== undefined && { soil_type: soilType }),
        ...(notes !== undefined && { notes }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[PATCH /api/garden/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/garden/:id/set-default — make a garden the default
gardenRouter.patch('/:id/set-default', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Unset current default, then set new one
    await db.from('gardens').update({ is_default: false }).eq('user_id', userId).eq('is_default', true);
    const { data, error } = await db
      .from('gardens')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[PATCH /api/garden/:id/set-default]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/garden/:id — delete a garden (not the default)
gardenRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership + check not default
    const { data: garden, error: findError } = await db
      .from('gardens')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !garden) return res.status(404).json({ error: 'garden_not_found' });
    if (garden.is_default) {
      return res.status(403).json({ error: 'cannot_delete_default', message: 'לא ניתן למחוק את הגינה הראשית.' });
    }

    const { error } = await db.from('gardens').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/garden/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garden/:id/plants — add a plant to a garden
gardenRouter.post('/:id/plants', async (req: any, res) => {
  try {
    const { plantId, commonNameHe, commonNameEn, notes, locationType, locationDescription } = req.body;

    // Enforce per-tier plant-per-garden limit.
    // Only count active (non-archived) plants — archived plants do not consume
    // a slot and must not block new additions.
    // Explicit LAUNCH_FREE_MODE guard: professional now has finite limit (60),
    // so we can't rely on null-check alone to bypass for alpha testers.
    const LAUNCH_FREE_MODE_PLANT = process.env.LAUNCH_FREE_MODE === 'true';
    const maxPlants = req.limits?.maxPlantsPerGarden ?? null;
    if (!LAUNCH_FREE_MODE_PLANT && maxPlants !== null) {
      const { count, error: countError } = await db
        .from('garden_plants')
        .select('id', { count: 'exact', head: true })
        .eq('garden_id', req.params.id)
        .is('archived_at', null);

      if (countError) throw countError;

      if ((count ?? 0) >= maxPlants) {
        return res.status(403).json({
          error: 'plant_limit_reached',
          message: 'הגעת למגבלת הצמחים לגינה זו בתכנית שלך.',
          tier: req.tier,
          limit: maxPlants,
          used: count,
        });
      }
    }

    // Validate and normalise irrigation fields (auto_irrigation defaults false)
    const irrigationResult = validateIrrigationFields(req.body);
    if ('error' in irrigationResult) {
      return res.status(400).json(irrigationResult);
    }
    const { auto_irrigation, irrigation_days, irrigation_times } = irrigationResult.fields;

    const { data, error } = await db
      .from('garden_plants')
      .insert({
        garden_id:           req.params.id,
        plant_id:            plantId,
        common_name_he:      commonNameHe,
        common_name_en:      commonNameEn,
        notes:               notes || '',
        location_type:       locationType ?? 'pot',
        location_description: locationDescription ?? null,
        auto_irrigation,
        irrigation_days,
        irrigation_times,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[POST /api/garden/:id/plants]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/garden/:id/plants/:plantId — remove a plant
gardenRouter.delete('/:id/plants/:plantId', async (req: any, res) => {
  try {
    const { error } = await db
      .from('garden_plants')
      .delete()
      .eq('garden_id', req.params.id)
      .eq('plant_id', req.params.plantId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/garden/:id/plants/:plantId]', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/garden/garden-plants/:id — update a garden_plants row
gardenRouter.patch('/garden-plants/:id', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const {
      location_type, location_description, notes, sun_exposure, companions, soil,
      variety, plant_type, archived_at,
      auto_irrigation, irrigation_days, irrigation_times,
    } = req.body;

    // Verify ownership: garden_plants has no user_id, ownership flows through garden_id -> gardens.user_id
    const { data: gp, error: gpError } = await db
      .from('garden_plants')
      .select('garden_id')
      .eq('id', id)
      .single();

    if (gpError || !gp) return res.status(404).json({ error: 'not_found' });

    const { data: garden, error: gardenError } = await db
      .from('gardens')
      .select('id')
      .eq('id', gp.garden_id)
      .eq('user_id', userId)
      .single();

    if (gardenError || !garden) return res.status(403).json({ error: 'Forbidden' });

    const updateObj: any = {};
    if (location_type !== undefined) updateObj.location_type = location_type;
    if (location_description !== undefined) updateObj.location_description = location_description;
    if (notes !== undefined) updateObj.notes = notes;
    if (sun_exposure !== undefined) updateObj.sun_exposure = sun_exposure;
    if (companions !== undefined) updateObj.companions = companions;
    if (soil !== undefined) updateObj.soil = soil;
    if (variety !== undefined) updateObj.variety = variety;
    if (plant_type !== undefined) updateObj.plant_type = plant_type;
    // archived_at: ISO timestamp string to archive, null to un-archive.
    // Explicit undefined check so the client can send { archived_at: null } to unarchive.
    if ('archived_at' in req.body) updateObj.archived_at = archived_at ?? null;

    // ── Auto-irrigation fields (only applied when any of the three are present) ──
    if (auto_irrigation !== undefined || irrigation_days !== undefined || irrigation_times !== undefined) {
      const irrigationResult = validateIrrigationFields(req.body);
      if ('error' in irrigationResult) {
        return res.status(400).json(irrigationResult);
      }
      const irr = irrigationResult.fields;
      updateObj.auto_irrigation   = irr.auto_irrigation;
      updateObj.irrigation_days   = irr.irrigation_days;
      updateObj.irrigation_times  = irr.irrigation_times;
    }

    const { data, error } = await db
      .from('garden_plants')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, plant: data });
  } catch (err: any) {
    console.error('[PATCH /api/garden/garden-plants/:id]', err);
    res.status(500).json({ error: err.message });
  }
});
