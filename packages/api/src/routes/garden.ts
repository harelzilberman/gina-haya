import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';
import { getCalendarRange } from '../db/queries/calendar';
import starterTasksData from '../../../shared/data/starter_tasks.json';

// ── Types for starter_tasks.json ─────────────────────────────────────────────
interface StarterTaskEntry {
  title: string;
  titleEn?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dayOffset: number;
  lunarSensitive: boolean;
  notes?: string;
  notesEn?: string;
}
interface StarterTasksSpecies {
  speciesId: string | null;
  match: string[];
  tasks: StarterTaskEntry[];
}
interface StarterTasksJson {
  generic: { tasks: StarterTaskEntry[] };
  species: StarterTasksSpecies[];
}

const STARTER_TASKS_JSON = starterTasksData as unknown as StarterTasksJson;

// ── Resolve tasks for a plant from starter_tasks.json ────────────────────────
// Priority: speciesId match → Hebrew name match → generic.
function resolveStarterTasks(
  speciesId: string | null,
  commonNameHe: string,
): StarterTaskEntry[] {
  const { species, generic } = STARTER_TASKS_JSON;

  // 1. Match by encyclopedia speciesId (most precise)
  if (speciesId) {
    const byId = species.find(s => s.speciesId === speciesId);
    if (byId) return byId.tasks;
  }

  // 2. Match by Hebrew name (case-insensitive partial check against match[])
  const nameLower = commonNameHe.trim().toLowerCase();
  if (nameLower) {
    const byName = species.find(s =>
      s.match.some(m => m.trim().toLowerCase() === nameLower)
    );
    if (byName) return byName.tasks;
  }

  // 3. Fall back to generic tasks
  return generic.tasks;
}

// ── Biodynamic date scheduler ────────────────────────────────────────────────
// For lunarSensitive tasks: find the first favorable biodynamic day starting at
// baseDate, within a 14-day forward search window.
// Favorable = nodeActive===false AND planting_score>=4 AND score_colour not 'red'/'black'.
// Falls back to baseDate if no favorable day is found.
//
// TODO(phase2): Per-species day_type_affinity scheduling — schedule each task on
// a day whose dayType (fruit/leaf/root/flower) matches the plant's affinity
// from the `plants.day_type_affinity` column. Out of scope for Phase 1.
async function scheduledDate(
  baseDate: string,
  lunarSensitive: boolean,
): Promise<string> {
  if (!lunarSensitive) return baseDate;

  const SEARCH_DAYS = 14;
  const from = baseDate;
  const toDate = new Date(baseDate + 'T00:00:00Z');
  toDate.setUTCDate(toDate.getUTCDate() + SEARCH_DAYS);
  const to = toDate.toISOString().slice(0, 10);

  let calendarDays: import('@gina-haya/shared').BiodynamicDay[];
  try {
    calendarDays = await getCalendarRange(from, to);
  } catch {
    // Calendar table unavailable (e.g. not yet populated) — fall back silently
    return baseDate;
  }

  const favorable = calendarDays.find(
    d => !d.nodeActive && d.plantingScore >= 4 && d.scoreColour !== 'red' && d.scoreColour !== 'black'
  );
  return favorable?.date ?? baseDate;
}

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

// PATCH /api/garden/:id/rename — rename a garden (dedicated Flutter endpoint)
// name is required and must be non-empty; returns 404 when not found/not owned.
gardenRouter.patch('/:id/rename', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'missing_field', message: 'name is required and must be non-empty' });
    }

    const { data, error } = await db
      .from('gardens')
      .update({ name: String(name).trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'garden_not_found' });
    res.json(data);
  } catch (err: any) {
    console.error('[PATCH /api/garden/:id/rename]', err);
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

// DELETE /api/garden/:id — delete a garden, with safety guards
gardenRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 1. Ownership check
    const { data: garden, error: findError } = await db
      .from('gardens')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !garden) return res.status(404).json({ error: 'garden_not_found' });

    // 2. Block if the garden has active (non-archived) plants — caller must remove them first
    const { count: activePlantCount, error: plantCountError } = await db
      .from('garden_plants')
      .select('id', { count: 'exact', head: true })
      .eq('garden_id', id)
      .is('archived_at', null);

    if (plantCountError) throw plantCountError;

    if ((activePlantCount ?? 0) > 0) {
      return res.status(409).json({
        error: 'garden_not_empty',
        message: `הגינה מכילה ${activePlantCount} צמחים — יש להעביר או להסיר אותם קודם`,
        plantCount: activePlantCount,
      });
    }

    // 3. Block if this is the user's last garden — must always have at least one
    const { count: gardenCount, error: gardenCountError } = await db
      .from('gardens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (gardenCountError) throw gardenCountError;

    if ((gardenCount ?? 0) <= 1) {
      return res.status(400).json({
        error: 'cannot_delete_last_garden',
        message: 'לא ניתן למחוק את הגינה היחידה שלך',
      });
    }

    // 4. Delete the garden (garden_plants cascade via FK ON DELETE CASCADE)
    const { error: deleteError } = await db
      .from('gardens')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // 5. If the deleted garden was the default, promote the next most-recently-created garden
    if (garden.is_default) {
      const { data: next } = await db
        .from('gardens')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (next) {
        await db
          .from('gardens')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq('id', next.id);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/garden/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garden/:id/plants — add a plant to a garden
gardenRouter.post('/:id/plants', async (req: any, res) => {
  try {
    const { plantId, commonNameHe, commonNameEn, notes, locationType, locationDescription, plantType, variety } = req.body;

    // commonNameHe is required — it is used as the display name throughout the app
    if (!commonNameHe) {
      return res.status(400).json({ error: 'missing_field', message: 'commonNameHe is required' });
    }

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
        garden_id:            req.params.id,
        plant_id:             plantId ?? null,
        common_name_he:       commonNameHe,
        common_name_en:       commonNameEn ?? null,
        notes:                notes || '',
        location_type:        locationType ?? 'pot',
        location_description: locationDescription ?? null,
        auto_irrigation,
        irrigation_days,
        irrigation_times,
        ...(plantType !== undefined && { plant_type: plantType }),
        ...(variety  !== undefined && { variety }),
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

// POST /api/garden/garden-plants/:id/starter-tasks
// Seeds curated care tasks for a newly added UNTRACKED plant from starter_tasks.json.
// Match order: encyclopedia speciesId → Hebrew name → generic fallback.
// Idempotent: a second call returns { skipped: 'already_generated' } without inserting.
// Never 500s the caller — on any internal error, logs and returns empty result.
gardenRouter.post('/garden-plants/:id/starter-tasks', async (req: any, res) => {
  const gardenPlantId = req.params.id;
  const language: 'he' | 'en' = req.body?.language === 'en' ? 'en' : 'he';
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Fetch the garden_plants row (include plant_id for speciesId match)
    const { data: gp, error: gpError } = await db
      .from('garden_plants')
      .select('id, common_name_he, plant_type, garden_id, plant_id')
      .eq('id', gardenPlantId)
      .single();

    if (gpError || !gp) return res.status(404).json({ error: 'not_found' });

    // 2. Verify ownership via gardens.user_id
    const { data: garden, error: gardenError } = await db
      .from('gardens')
      .select('id')
      .eq('id', gp.garden_id)
      .eq('user_id', userId)
      .single();

    if (gardenError || !garden) return res.status(403).json({ error: 'Forbidden' });

    // 3. Idempotency guard — seed exactly once per plant
    const { count, error: countError } = await db
      .from('garden_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('garden_plants_id', gardenPlantId)
      .eq('source_action', 'starter_tasks');

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      return res.json({ ok: true, tasks: [], skipped: 'already_generated' });
    }

    // 4. Resolve tasks from JSON: speciesId → Hebrew name → generic; cap at 5 by dayOffset
    const resolved = resolveStarterTasks(gp.plant_id ?? null, gp.common_name_he ?? '');
    const capped = [...resolved].sort((a, b) => a.dayOffset - b.dayOffset).slice(0, 5);

    // 5. Compute base dates and apply biodynamic scheduling for lunar-sensitive tasks
    function addDays(base: string, days: number): string {
      const d = new Date(base + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    const todayStr = new Date().toISOString().slice(0, 10);

    const rows = await Promise.all(capped.map(async t => {
      const baseDate = addDays(todayStr, t.dayOffset);
      const date = await scheduledDate(baseDate, t.lunarSensitive);
      return {
        user_id:           userId,
        garden_plants_id:  gardenPlantId,
        plant_tracker_id:  null,
        source_checkin_id: null,
        plan_id:           null,
        plant_name:        gp.common_name_he ?? null,
        title:             language === 'en' ? (t.titleEn ?? t.title) : t.title,
        notes:             language === 'en' ? (t.notesEn ?? t.notes ?? null) : (t.notes ?? null),
        category:          t.category,
        priority:          t.priority,
        type:              'custom' as const,
        status:            'pending' as const,
        source_action:     'starter_tasks',
        date,
      };
    }));

    // 6. Insert — never throw on error; return empty result instead so the app
    //    flow is never blocked by a seed failure.
    const { data: inserted, error: insertError } = await db
      .from('garden_tasks')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('[POST /api/garden/garden-plants/:id/starter-tasks] insert failed:', insertError.message);
      return res.status(201).json({ ok: true, tasks: [], seed_error: insertError.message });
    }

    console.log('[POST /api/garden/garden-plants/:id/starter-tasks] seeded', inserted?.length, 'tasks for plant', gardenPlantId);
    return res.status(201).json({ ok: true, tasks: inserted });
  } catch (err: any) {
    console.error('[POST /api/garden/garden-plants/:id/starter-tasks]', err);
    // Never block the caller — return empty result on unexpected error
    return res.status(201).json({ ok: true, tasks: [], seed_error: err.message });
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
    // Also fetch archived_at so we can detect a restore (non-null → null) below.
    const { data: gp, error: gpError } = await db
      .from('garden_plants')
      .select('garden_id, archived_at')
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
    if ('archived_at' in req.body) {
      const isRestoring = (archived_at === null || archived_at === undefined) && gp.archived_at !== null;

      // Enforce per-tier limit when restoring an archived plant (same logic as creation).
      if (isRestoring) {
        const LAUNCH_FREE_MODE_RESTORE = process.env.LAUNCH_FREE_MODE === 'true';
        const maxPlants = req.limits?.maxPlantsPerGarden ?? null;
        if (!LAUNCH_FREE_MODE_RESTORE && maxPlants !== null) {
          const { count, error: countError } = await db
            .from('garden_plants')
            .select('id', { count: 'exact', head: true })
            .eq('garden_id', gp.garden_id)
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
      }

      updateObj.archived_at = archived_at ?? null;
    }

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

// POST /api/garden/garden-plants/:id/move — move a plant to a different garden
//
// Body: { targetGardenId: string }
//
// Requires attachTier middleware (already on this router via route-level use below)
// so that req.limits.maxPlantsPerGarden is available for the tier check.
//
// Write order (two-phase with best-effort compensation):
//   1. UPDATE plant_trackers.garden_id WHERE garden_plants_id = plantId
//   2. UPDATE garden_plants.garden_id = targetGardenId WHERE id = plantId
//   If step 2 fails, attempt a revert of step 1 back to the source garden.
//
// NOTE: The two UPDATEs are not in a Postgres transaction — true atomicity requires
// a Supabase RPC.  The compensation revert makes partial failure recoverable; add
// an RPC wrapper as a follow-up when the feature is battle-tested.
gardenRouter.post('/garden-plants/:id/move', attachTier, async (req: any, res) => {
  try {
    const userId  = req.user?.id;
    const plantId = req.params.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // ── 1. Validate body ───────────────────────────────────────────────────
    const { targetGardenId } = req.body;
    if (!targetGardenId || typeof targetGardenId !== 'string') {
      return res.status(400).json({ error: 'targetGardenId_required' });
    }

    // ── 2. Fetch plant — get current garden_id ─────────────────────────────
    const { data: gp, error: gpErr } = await db
      .from('garden_plants')
      .select('garden_id')
      .eq('id', plantId)
      .single();

    if (gpErr || !gp) {
      return res.status(404).json({ error: 'plant_not_found' });
    }

    const sourceGardenId = gp.garden_id;

    // ── 3. Verify SOURCE garden ownership ──────────────────────────────────
    const { data: srcGarden, error: srcErr } = await db
      .from('gardens')
      .select('id')
      .eq('id', sourceGardenId)
      .eq('user_id', userId)
      .single();

    if (srcErr || !srcGarden) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // ── 4. Idempotent short-circuit — already in target garden ─────────────
    if (sourceGardenId === targetGardenId) {
      return res.json({ ok: true, moved: false });
    }

    // ── 5. Verify TARGET garden ownership ──────────────────────────────────
    const { data: tgtGarden, error: tgtErr } = await db
      .from('gardens')
      .select('id')
      .eq('id', targetGardenId)
      .eq('user_id', userId)
      .single();

    if (tgtErr || !tgtGarden) {
      return res.status(404).json({ error: 'target_garden_not_found' });
    }

    // ── 6. Tier check on TARGET — mirror creation check (garden.ts:445–465) ─
    // Archived plants do not consume a slot; count only active ones.
    // LAUNCH_FREE_MODE bypasses the limit — same guard as plant creation.
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
    const maxPlants = req.limits?.maxPlantsPerGarden ?? null;
    if (!LAUNCH_FREE_MODE && maxPlants !== null) {
      const { count, error: countErr } = await db
        .from('garden_plants')
        .select('id', { count: 'exact', head: true })
        .eq('garden_id', targetGardenId)
        .is('archived_at', null);

      if (countErr) throw countErr;

      if ((count ?? 0) >= maxPlants) {
        return res.status(403).json({
          error: 'plant_limit_reached',
          message: 'הגעת למגבלת הצמחים בגינת היעד בתכנית שלך.',
          tier:  req.tier,
          limit: maxPlants,
          used:  count,
        });
      }
    }

    // ── 7. Write phase — trackers first, then plant row ────────────────────
    // Updating trackers first means that if the plant UPDATE fails, the
    // tracker temporarily points at the wrong garden — the compensation revert
    // below attempts to restore it.  The inverse order (plant first) would
    // leave a tracker pointing at a garden whose plant is gone, which is
    // harder to surface and diagnose.

    // Step 7a: update all trackers linked to this plant
    const { error: trackerErr } = await db
      .from('plant_trackers')
      .update({ garden_id: targetGardenId })
      .eq('garden_plants_id', plantId);

    if (trackerErr) {
      // Non-fatal: trackers will show under the wrong garden until the move is
      // retried, but the plant itself hasn't moved yet — state is still consistent.
      console.error('[move] plant_trackers update failed:', trackerErr.message, trackerErr.details);
    }

    // Step 7b: move the plant row (the authoritative change)
    const { error: moveErr } = await db
      .from('garden_plants')
      .update({ garden_id: targetGardenId })
      .eq('id', plantId);

    if (moveErr) {
      console.error('[move] garden_plants update failed:', moveErr.message, moveErr.details);

      // Best-effort compensation: revert trackers back to the source garden so
      // we don't leave them pointing at a garden their plant isn't in.
      if (!trackerErr) {
        const { error: revertErr } = await db
          .from('plant_trackers')
          .update({ garden_id: sourceGardenId })
          .eq('garden_plants_id', plantId);

        if (revertErr) {
          console.error(
            '[move] CRITICAL: tracker revert also failed — plant_trackers.garden_id is now stale.',
            'plantId:', plantId,
            'stale garden_id:', targetGardenId,
            'intended garden_id:', sourceGardenId,
            revertErr.message,
          );
        } else {
          console.log('[move] tracker revert succeeded after garden_plants update failure');
        }
      }

      return res.status(500).json({ error: 'move_failed', detail: moveErr.message });
    }

    return res.json({ ok: true, moved: true });
  } catch (err: any) {
    console.error('[POST /api/garden/garden-plants/:id/move]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/garden/:id/plants/bulk-archive — archive multiple plants in one call
//
// Body: { plant_ids: string[] }
//
// Each ID is verified to belong to both the specified garden and the requesting
// user before archiving.  IDs that don't belong (wrong garden, already archived,
// or non-existent) are skipped and reported — they do not abort the whole request.
// Returns: { archived_count, archived_ids, skipped_ids }
gardenRouter.patch('/:id/plants/bulk-archive', async (req: any, res) => {
  try {
    const userId   = req.user?.id;
    const gardenId = req.params.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { plant_ids } = req.body;
    if (!Array.isArray(plant_ids) || plant_ids.length === 0) {
      return res.status(400).json({ error: 'plant_ids must be a non-empty array of strings' });
    }
    // Limit batch size to prevent accidental large requests
    if (plant_ids.length > 200) {
      return res.status(400).json({ error: 'plant_ids may contain at most 200 IDs per request' });
    }

    // 1. Verify garden ownership
    const { data: garden, error: gardenErr } = await db
      .from('gardens')
      .select('id')
      .eq('id', gardenId)
      .eq('user_id', userId)
      .single();

    if (gardenErr || !garden) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2. Find which of the requested IDs are active plants in this garden.
    //    Any ID that fails this check (wrong garden, already archived, non-existent)
    //    is collected into skipped_ids rather than failing the whole request.
    const { data: eligible, error: eligibleErr } = await db
      .from('garden_plants')
      .select('id')
      .in('id', plant_ids)
      .eq('garden_id', gardenId)
      .is('archived_at', null);

    if (eligibleErr) throw eligibleErr;

    const eligibleIds = (eligible ?? []).map((p: any) => p.id as string);
    const eligibleSet  = new Set(eligibleIds);
    const skippedIds   = plant_ids.filter((id: string) => !eligibleSet.has(id));

    if (eligibleIds.length === 0) {
      return res.json({ archived_count: 0, archived_ids: [], skipped_ids: skippedIds });
    }

    // 3. Batch-archive all eligible plants in a single update
    const archivedAt = new Date().toISOString();
    const { error: updateErr } = await db
      .from('garden_plants')
      .update({ archived_at: archivedAt })
      .in('id', eligibleIds);

    if (updateErr) throw updateErr;

    console.log(`[PATCH /api/garden/${gardenId}/plants/bulk-archive] archived ${eligibleIds.length} plants for user ${userId}`);

    return res.json({
      archived_count: eligibleIds.length,
      archived_ids:   eligibleIds,
      skipped_ids:    skippedIds,
    });
  } catch (err: any) {
    console.error('[PATCH /api/garden/:id/plants/bulk-archive]', err);
    res.status(500).json({ error: err.message });
  }
});
