import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';

export const gardenRouter: IRouter = Router();

// All garden routes require authentication + tier attachment
gardenRouter.use(verifyToken);
gardenRouter.use(attachTier);

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

    // Enforce per-tier garden limit
    const maxGardens = req.limits?.maxGardens ?? null;
    if (maxGardens !== null) {
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
          current: count,
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

    // Enforce per-tier plant-per-garden limit
    const maxPlants = req.limits?.maxPlantsPerGarden ?? null;
    if (maxPlants !== null) {
      const { count } = await db
        .from('garden_plants')
        .select('id', { count: 'exact', head: true })
        .eq('garden_id', req.params.id);

      if ((count ?? 0) >= maxPlants) {
        return res.status(403).json({
          error: 'plant_limit_reached',
          message: 'הגעת למגבלת הצמחים לגינה זו בתכנית שלך.',
          tier: req.tier,
          limit: maxPlants,
          current: count,
        });
      }
    }

    const { data, error } = await db
      .from('garden_plants')
      .insert({
        garden_id: req.params.id,
        plant_id: plantId,
        common_name_he: commonNameHe,
        common_name_en: commonNameEn,
        notes: notes || '',
        location_type: locationType ?? 'pot',
        location_description: locationDescription ?? null,
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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { location_type, location_description, notes, sun_exposure, companions, soil, variety } = req.body;

  const updateObj: any = {};
  if (location_type !== undefined) updateObj.location_type = location_type;
  if (location_description !== undefined) updateObj.location_description = location_description;
  if (notes !== undefined) updateObj.notes = notes;
  if (sun_exposure !== undefined) updateObj.sun_exposure = sun_exposure;
  if (companions !== undefined) updateObj.companions = companions;
  if (soil !== undefined) updateObj.soil = soil;
  if (variety !== undefined) updateObj.variety = variety;

  const { data, error } = await db
    .from('garden_plants')
    .update(updateObj)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, plant: data });
});
