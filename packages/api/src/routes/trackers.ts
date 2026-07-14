import 'dotenv/config';
import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';
import { analyzePlantImage, compressImageForClaude } from '../services/plantVision';
import { fetchWeatherForRegion } from '../services/weather';
import { todayInIsrael } from '@gina-haya/shared';
import { checkAndRecordVisionUse } from '../services/visionQuota';

export const trackersRouter: IRouter = Router();

trackersRouter.use(verifyToken);
trackersRouter.use(attachTier);

// ── GET /api/trackers ──────────────────────────────────────────────────────
trackersRouter.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { gardenId } = req.query as { gardenId?: string };

    let query = db
      .from('plant_trackers')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (gardenId) query = (query as any).eq('garden_id', gardenId);

    const { data: trackers, error } = await (query as any);

    if (error) throw error;
    if (!trackers || trackers.length === 0) {
      return res.json({ trackers: [] });
    }

    // Fetch latest checkin for each tracker
    const trackerIds = trackers.map((t: any) => t.id);
    const { data: checkins } = await db
      .from('plant_tracker_checkins')
      .select('id, tracker_id, checkin_date, growth_stage, ai_analysis, suggested_tasks, created_at')
      .in('tracker_id', trackerIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const latestCheckin: Record<string, any> = {};
    for (const c of checkins ?? []) {
      if (!latestCheckin[c.tracker_id]) {
        latestCheckin[c.tracker_id] = c;
      }
    }

    const result = trackers.map((t: any) => ({
      ...t,
      latest_checkin: latestCheckin[t.id] ?? null,
    }));

    res.json({ trackers: result });
  } catch (err: any) {
    console.error('[GET /api/trackers]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trackers ────────────────────────────────────────────────────
trackersRouter.post('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { plantNameHe, plantNameEn, plantId, gardenId, gardenPlantId, locationType, locationDescription } = req.body;

    // plantNameHe/En may be empty for auto-identification via Claude vision
    if (!locationType) {
      return res.status(400).json({ error: 'locationType is required' });
    }

    // Enforce per-tier tracker limit (with credit fallback)
    const maxTrackers = req.limits?.maxTrackers ?? null;
    if (maxTrackers !== null) {
      const { count } = await db
        .from('plant_trackers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);

      if ((count ?? 0) >= maxTrackers) {
        // Check purchased tracker credits before blocking
        const { data: creditRow } = await db
          .from('user_credits')
          .select('id, total, used')
          .eq('user_id', userId)
          .eq('credit_type', 'tracker')
          .single();

        const available = Math.max(0, (creditRow?.total ?? 0) - (creditRow?.used ?? 0));

        if (available <= 0) {
          console.log(`[limit] user ${userId} hit tracker_limit (tier=${req.tier}, max=${maxTrackers})`);
          return res.status(403).json({
            error: 'tracker_limit_reached',
            message: 'הגעת למגבלת מעקבי הגידול בתכנית שלך.',
            tier: req.tier,
            limit: maxTrackers,
            current: count,
          });
        }

        // Consume one tracker credit
        await db
          .from('user_credits')
          .update({ used: (creditRow!.used ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', creditRow!.id);

        console.log(`[credits] user ${userId} used tracker credit (${available - 1} remaining)`);
      }
    }

    const { data, error } = await db
      .from('plant_trackers')
      .insert({
        user_id:              userId,
        garden_id:            gardenId ?? null,
        plant_id:             plantId ?? null,
        garden_plants_id:     gardenPlantId ?? null,
        plant_name_he:        plantNameHe ?? '',
        plant_name_en:        plantNameEn ?? '',
        location_type:        locationType,
        location_description: locationDescription ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[POST /api/trackers]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trackers/photos/all ──────────────────────────────────────────
// Returns all photo timeline entries for all gardens belonging to the current user
trackersRouter.get('/photos/all', async (req: any, res) => {
  const userId = req.user.id;

  const { data, error } = await db
    .from('plant_timeline')
    .select(`
      id,
      photo_path,
      created_at,
      time_of_day,
      plant_id,
      garden_plants!inner(
        id,
        common_name_he,
        garden_id,
        gardens!inner(
          id,
          name,
          user_id
        )
      )
    `)
    .eq('entry_type', 'photo')
    .eq('garden_plants.gardens.user_id', userId)
    .not('photo_path', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /photos/all error:', error);
    return res.status(500).json({ error: error.message });
  }

  // Fetch biodynamic data for all unique dates in the results
  const uniqueDates = [...new Set((data || []).map((row: any) => {
    const d = new Date(row.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }))];

  const { data: bioData } = await db
    .from('biodynamic_calendar')
    .select('date, day_type_he, day_type_emoji, moon_phase_name_he')
    .in('date', uniqueDates);

  const bioMap: Record<string, any> = {};
  (bioData || []).forEach((b: any) => { bioMap[b.date] = b; });

  const hebrewMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  const photos = (data || []).map((row: any) => {
    const createdAt = new Date(row.created_at);
    const photoDate = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
    const bio = bioMap[photoDate] || {};
    const formattedDate = `${createdAt.getDate()} ב${hebrewMonths[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

    return {
      timeline_id: row.id,
      photo_path: row.photo_path,
      taken_at: row.created_at,
      time_of_day: row.time_of_day,
      plant_id: row.plant_id,
      plant_name: row.garden_plants?.common_name_he ?? '',
      garden_id: row.garden_plants?.garden_id ?? '',
      garden_name: row.garden_plants?.gardens?.name ?? '',
      day_type_he: bio.day_type_he ?? '',
      day_type_emoji: bio.day_type_emoji ?? '',
      moon_phase_he: bio.moon_phase_name_he ?? '',
      formatted_date: formattedDate,
    };
  });

  res.json(photos);
});

// ── PATCH /api/trackers/:id ───────────────────────────────────────────────
trackersRouter.patch('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      plantNameHe,
      plantNameEn,
      variety,
      sun_exposure,
      companions,
      soil,
      location_description,
      location_type,
    } = req.body;

    // Only update fields that were provided
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (plantNameHe !== undefined) updates.plant_name_he = plantNameHe;
    if (plantNameEn !== undefined) updates.plant_name_en = plantNameEn;
    if (variety !== undefined) updates.variety = variety;
    if (sun_exposure !== undefined) updates.sun_exposure = sun_exposure;
    if (companions !== undefined) updates.companions = companions;
    if (soil !== undefined) updates.soil = soil;
    if (location_description !== undefined) updates.location_description = location_description;
    if (location_type !== undefined) updates.location_type = location_type;

    const { data, error } = await db
      .from('plant_trackers')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, tracker: data });
  } catch (err: any) {
    console.error('[PATCH /api/trackers/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trackers/:id ─────────────────────────────────────────────────
trackersRouter.get('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const { data: checkins } = await db
      .from('plant_tracker_checkins')
      .select('*')
      .eq('tracker_id', id)
      .is('deleted_at', null)
      .order('checkin_date', { ascending: false });

    res.json({ ...tracker, checkins: checkins ?? [] });
  } catch (err: any) {
    console.error('[GET /api/trackers/:id]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/trackers/:id/checkins/:checkinId ─────────────────────────
// Soft-deletes a single check-in (sets deleted_at/deleted_by) and its linked
// plant_timeline rows. Photo is retained in storage — this is recoverable.
//
// First call (no body):
//   – If the check-in has linked garden_tasks (source_checkin_id match),
//     returns { requiresConfirmation: true, linkedTaskCount: N } without
//     modifying anything, so the client can ask the user what to do.
//   – If no linked tasks, proceeds immediately.
//
// Second call (with body):
//   { deleteLinkedTasks: true }  → hard-delete linked tasks then soft-delete check-in
//   { deleteLinkedTasks: false } → leave tasks, soft-delete check-in only
trackersRouter.delete('/:id/checkins/:checkinId', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id: trackerId, checkinId } = req.params;
    const { deleteLinkedTasks } = req.body ?? {};

    // Verify ownership — checkin must belong to this user AND this tracker,
    // and must not already be soft-deleted. Pre-fetch fields for audit snapshot.
    const { data: checkin, error: fetchError } = await db
      .from('plant_tracker_checkins')
      .select('id, tracker_id, photo_path, user_id, checkin_date, growth_stage, ai_analysis')
      .eq('id', checkinId)
      .eq('tracker_id', trackerId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !checkin) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    // Check for linked garden_tasks
    const { data: linkedTasks } = await db
      .from('garden_tasks')
      .select('id')
      .eq('source_checkin_id', checkinId);

    const linkedTaskCount = linkedTasks?.length ?? 0;

    // If linked tasks exist and caller hasn't told us what to do, ask first
    if (linkedTaskCount > 0 && deleteLinkedTasks === undefined) {
      return res.json({ requiresConfirmation: true, linkedTaskCount });
    }

    // Hard-delete linked tasks if requested (tasks are not part of soft-delete)
    if (deleteLinkedTasks === true && linkedTaskCount > 0) {
      await db
        .from('garden_tasks')
        .delete()
        .eq('source_checkin_id', checkinId);
    }

    // Write audit log before modifying anything
    await db.from('deletion_audit_log').insert({
      table_name: 'plant_tracker_checkins',
      row_id:     checkinId,
      user_id:    userId,
      action:     'soft_delete',
      source:     'DELETE /api/trackers/:id/checkins/:checkinId',
      metadata: {
        tracker_id:   checkin.tracker_id,
        checkin_date: checkin.checkin_date,
        growth_stage: checkin.growth_stage,
        ai_analysis:  checkin.ai_analysis,
      },
    });

    // Soft-delete plant_timeline rows tied to this check-in
    await db
      .from('plant_timeline')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tracker_checkin_id', checkinId);

    // Soft-delete the check-in row itself (photo stays in storage — recoverable)
    const { error: deleteError } = await db
      .from('plant_tracker_checkins')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', checkinId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    console.log('[DELETE /api/trackers/:id/checkins/:checkinId] soft-deleted', { checkinId, trackerId, userId });
    res.json({ deleted: true });
  } catch (err: any) {
    console.error('[DELETE /api/trackers/:id/checkins/:checkinId]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/trackers/:id ──────────────────────────────────────────────
// Soft-deletes the tracker, all its live check-ins, and related timeline rows.
// Linked garden_tasks are still hard-deleted (tasks are not soft-deleted).
trackersRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const now = new Date().toISOString();

    // Hard-delete tasks linked to this tracker (tasks are not soft-deleted)
    await db
      .from('garden_tasks')
      .delete()
      .eq('user_id', userId)
      .eq('plant_tracker_id', id);

    // Collect live checkin IDs for the audit log before soft-deleting them
    const { data: checkinRows } = await db
      .from('plant_tracker_checkins')
      .select('id')
      .eq('tracker_id', id)
      .eq('user_id', userId)
      .is('deleted_at', null);

    const checkinIds = (checkinRows ?? []).map((c: any) => c.id);

    if (checkinIds.length > 0) {
      // One audit log entry summarising all checkins in this batch
      await db.from('deletion_audit_log').insert({
        table_name: 'plant_tracker_checkins',
        row_id:     id,
        user_id:    userId,
        action:     'soft_delete',
        source:     'DELETE /api/trackers/:id',
        metadata:   { tracker_id: id, checkin_ids: checkinIds, count: checkinIds.length },
      });

      // Soft-delete the checkins
      await db
        .from('plant_tracker_checkins')
        .update({ deleted_at: now, deleted_by: userId })
        .eq('tracker_id', id)
        .eq('user_id', userId)
        .is('deleted_at', null);
    }

    // Soft-delete related plant_timeline rows
    await db
      .from('plant_timeline')
      .update({ deleted_at: now })
      .eq('tracker_id', id)
      .eq('user_id', userId);

    // Soft-delete the tracker itself
    const { error } = await db
      .from('plant_trackers')
      .update({ deleted_at: now, deleted_by: userId })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[DELETE /api/trackers/:id] soft-deleted', { trackerId: id, userId, checkinCount: checkinIds.length });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/trackers/:id]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trackers/:id/checkin ────────────────────────────────────────
trackersRouter.post('/:id/checkin', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id: trackerId } = req.params;
    const { imageBase64, mimeType, notes } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    // Verify tracker ownership
    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('*, gardens(*)')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const limits = req.limits;
    const tier   = req.tier ?? 'free';
    let usedAnalysisCredit = false;

    // Helper: consume analysis credit if available, else block
    async function checkAnalysisCredit(errPayload: object): Promise<boolean> {
      const { data: creditRow } = await db
        .from('user_credits')
        .select('id, total, used')
        .eq('user_id', userId)
        .eq('credit_type', 'analysis')
        .single();

      const available = Math.max(0, (creditRow?.total ?? 0) - (creditRow?.used ?? 0));
      if (available <= 0) return false; // no credits — block

      await db
        .from('user_credits')
        .update({ used: (creditRow!.used ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', creditRow!.id);

      console.log(`[credits] user ${userId} used analysis credit (${available - 1} remaining)`);
      usedAnalysisCredit = true;
      return true;
    }

    // Free tier: hard cap on total checkins ever
    if (limits?.maxTotalCheckinsEver !== null && limits?.maxTotalCheckinsEver !== undefined) {
      const { count } = await db
        .from('plant_tracker_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);

      if ((count ?? 0) >= limits.maxTotalCheckinsEver) {
        const errPayload = { error: 'limit_exceeded', message: 'limit_exceeded', tier, limit: limits.maxTotalCheckinsEver, type: 'checkins' };
        const credited = await checkAnalysisCredit(errPayload);
        if (!credited) {
          console.log(`[limit] user ${userId} hit maxTotalCheckinsEver (tier=${tier})`);
          return res.status(429).json(errPayload);
        }
      }
    } else if (limits?.maxCheckinsPerTrackerPerMonth !== null && limits?.maxCheckinsPerTrackerPerMonth !== undefined) {
      // Paid tiers: per tracker per month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await db
        .from('plant_tracker_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('tracker_id', trackerId)
        .is('deleted_at', null)
        .gte('created_at', startOfMonth.toISOString());

      if ((count ?? 0) >= limits.maxCheckinsPerTrackerPerMonth) {
        const resetsAt = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString();
        const errPayload = { error: 'analysis_limit_reached', message: 'הגעת למגבלת הניתוחים החודשית עבור מעקב זה.', tier, limit: limits.maxCheckinsPerTrackerPerMonth, current: count, resets_at: resetsAt };
        const credited = await checkAnalysisCredit(errPayload);
        if (!credited) {
          console.log(`[limit] user ${userId} hit maxCheckinsPerTrackerPerMonth (tier=${tier})`);
          return res.status(403).json(errPayload);
        }
      }
    }

    // ── Vision quota gate ─────────────────────────────────────────────────────
    // Checked BEFORE any Anthropic spend.
    // tier is already resolved via attachTier middleware (req.tier).
    // garden_plants_id from the tracker row is recorded for billing context.
    // Refusal shape: { ok: false, reason: 'vision_quota_exceeded', used, limit }
    // HTTP 200 so the app can render an upsell rather than a generic error.
    {
      const gardenPlantsId: string | null = (tracker as any).garden_plants_id ?? null;
      const quota = await checkAndRecordVisionUse(userId, 'tracker_checkin', gardenPlantsId, req.tier);
      if (!quota.allowed) {
        return res.json({ ok: false, reason: 'vision_quota_exceeded', used: quota.used, limit: quota.limit });
      }
    }

    // Fetch today's calendar
    const today = todayInIsrael();
    const { data: calendarDay } = await db
      .from('biodynamic_calendar')
      .select('*')
      .eq('date', today)
      .single();

    const todayCalendar = calendarDay ? {
      ascendingDescending:  calendarDay.ascending_descending,
      nodeActive:           calendarDay.node_active,
      dayType:              calendarDay.day_type,
      moonSign:             calendarDay.moon_sign,
      plantingScore:        calendarDay.planting_score,
      scoreColour:          calendarDay.score_colour,
      prep500Recommended:   calendarDay.prep_500_recommended,
      prep501Recommended:   calendarDay.prep_501_recommended,
      perigeeActive:        calendarDay.perigee_active,
    } : undefined;

    // Fetch weather
    const garden = tracker.gardens as any;
    const weather = await fetchWeatherForRegion(garden?.location_region ?? null);

    // Get previous checkin for comparison
    const { data: previousCheckins } = await db
      .from('plant_tracker_checkins')
      .select('ai_analysis, checkin_date')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const previousCheckin = previousCheckins?.[0] ?? null;
    const previousAnalysis = previousCheckin?.ai_analysis ?? undefined;
    const previousCheckinDate = previousCheckin?.checkin_date ?? undefined;

    // Compress image — may throw image_too_large if compressed size > 4.5MB
    let compressed: Awaited<ReturnType<typeof compressImageForClaude>>;
    try {
      compressed = await compressImageForClaude(imageBase64);
    } catch (compressErr: any) {
      if (compressErr.code === 'image_too_large') {
        return res.status(422).json({ error: 'image_too_large', error_code: 'image_too_large', message: 'התמונה גדולה מדי לניתוח' });
      }
      throw compressErr;
    }

    // Upload compressed image to storage (non-blocking — failure does not stop analysis)
    let photoPath: string | null = null;
    try {
      const storagePath = `${userId}/${trackerId}/${Date.now()}.jpg`;
      const { error: uploadError } = await db.storage
        .from('tracker-photos')
        .upload(storagePath, compressed.buffer, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) {
        console.error('[checkin] Photo upload failed:', uploadError.message, uploadError);
      } else {
        photoPath = storagePath;
      }
    } catch (uploadErr: any) {
      console.error('[checkin] Photo upload exception:', uploadErr.message, uploadErr.stack);
    }

    // Call Claude vision with pre-compressed data (avoids double compression)
    let analysisResult: Awaited<ReturnType<typeof analyzePlantImage>>;
    try {
      analysisResult = await analyzePlantImage(imageBase64, mimeType, {
        plantNameHint:       tracker.plant_name_he,
        locationType:        tracker.location_type,
        locationDescription: tracker.location_description ?? undefined,
        gardenSoilType:      garden?.soil_type ?? undefined,
        gardenRegion:        garden?.location_region ?? undefined,
        previousAnalysis,
        previousCheckinDate,
        todayCalendar,
        weather: weather ?? undefined,
      }, { data: compressed.data, mimeType: 'image/jpeg' }, req.user?.id);
    } catch (visionErr: any) {
      if (visionErr.code === 'image_too_large') {
        return res.status(422).json({ error: 'image_too_large', error_code: 'image_too_large', message: 'התמונה גדולה מדי לניתוח' });
      }
      const isParseFailure = visionErr.message?.includes('Failed to parse') || visionErr.message?.includes('Invalid response');
      return res.status(503).json({
        error: visionErr.message,
        error_code: isParseFailure ? 'analysis_failed' : 'api_unavailable',
      });
    }
    const { analysis, growingPlan, tasks } = analysisResult;

    // Suppress watering tasks for auto-irrigated plants
    // (tracker tasks have no category field — filter by Hebrew title keyword)
    let filteredTasks = tasks;
    const gardenPlantId = (tracker as any).garden_plants_id ?? null;
    if (gardenPlantId) {
      const { data: gpRow } = await db
        .from('garden_plants')
        .select('auto_irrigation')
        .eq('id', gardenPlantId)
        .single();
      if (gpRow?.auto_irrigation === true) {
        filteredTasks = tasks.filter(
          (t: any) => !/השק/u.test(String(t.title ?? ''))
        );
      }
    }

    // Save checkin with photo path
    const { data: checkin, error: checkinError } = await db
      .from('plant_tracker_checkins')
      .insert({
        tracker_id:      trackerId,
        user_id:         userId,
        checkin_date:    today,
        growth_stage:    analysis.growthStage,
        ai_analysis:     analysis,
        growing_plan:    growingPlan,
        notes:           notes ?? null,
        photo_path:      photoPath,
        suggested_tasks: filteredTasks.length > 0 ? filteredTasks : null,
      })
      .select()
      .single();

    if (checkinError) throw checkinError;

    // Log the photo + AI report to plant_timeline so it shows up in the plant
    // passport's history (mirrors the water/fertilize logging elsewhere in this
    // file). Non-blocking / best-effort — a failure here shouldn't fail the
    // checkin itself. Requires a linked garden_plants_id; legacy trackers
    // created before that FK existed simply skip this.
    if (gardenPlantId) {
      try {
        const timelineRows: any[] = [];
        if (photoPath) {
          timelineRows.push({
            tracker_id:         trackerId,
            plant_id:           gardenPlantId,
            user_id:            userId,
            entry_type:         'photo',
            photo_path:         photoPath,
            tracker_checkin_id: checkin.id,
            created_at:         checkin.created_at,
          });
        }
        timelineRows.push({
          tracker_id:         trackerId,
          plant_id:           gardenPlantId,
          user_id:            userId,
          entry_type:         'tracker_report',
          note:                `${analysis.healthHe} · ${analysis.growthStageHe}`,
          tracker_checkin_id: checkin.id,
          created_at:         checkin.created_at,
        });
        const { error: tlErr } = await db.from('plant_timeline').insert(timelineRows);
        if (tlErr) console.error('[checkin] plant_timeline insert failed:', tlErr.message, tlErr.details, tlErr.hint);
      } catch (tlErr: any) {
        console.error('[checkin] plant_timeline insert threw:', tlErr.message);
      }
    }

    res.status(201).json({ checkin, analysis, growingPlan, suggested_tasks: filteredTasks, used_credit: usedAnalysisCredit });
  } catch (err: any) {
    console.error('[POST /api/trackers/:id/checkin]', err.message, err.stack);
    res.status(500).json({ error: err.message, message: err.message, error_code: 'unknown' });
  }
});

// ── POST /api/trackers/:id/approve-tasks ─────────────────────────────────
trackersRouter.post('/:id/approve-tasks', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id: trackerId } = req.params;
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.json({ tasks_added: 0, tasks_error: null });
    }

    // Verify tracker ownership — also fetch garden_plants_id so we can link tasks
    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('id, plant_name_he, garden_plants_id')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const today = todayInIsrael();
    const [y, m, d] = today.split('-').map(Number);

    // Look up the latest checkin up-front — its id becomes source_checkin_id on
    // each created task, and we also clear its suggested_tasks after insertion.
    const { data: latestCheckin } = await db
      .from('plant_tracker_checkins')
      .select('id')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const taskRows = tasks.map((t: any, i: number) => {
      const rawTitle = t.title ? String(t.title).trim() : '';
      const title = rawTitle && rawTitle !== 'undefined' ? rawTitle : `משימה ${i + 1}`;
      const daysOut = Math.max(0, Math.min(Number(t.due_in_days) || 1, 30));
      const dueDate = new Date(Date.UTC(y, m - 1, d + daysOut)).toISOString().slice(0, 10);
      return {
        user_id:            userId,
        plan_id:            null,
        plant_tracker_id:   trackerId,
        garden_plants_id:   (tracker as any).garden_plants_id || null,
        plant_name:         tracker.plant_name_he || null,
        date:               dueDate,
        title,
        type:               'maintenance' as const,
        status:             'pending' as const,
        notes:              t.description ? String(t.description) : null,
        source_action:      'growing_tracker',
        source_checkin_id:  latestCheckin?.id ?? null,
      };
    });

    const { data: inserted, error: insertError } = await db
      .from('garden_tasks')
      .insert(taskRows)
      .select('id');

    if (insertError) {
      console.error('[approve-tasks] Insert failed:', insertError.message);
      return res.status(500).json({ tasks_added: 0, tasks_error: insertError.message });
    }

    // Clear pending suggested tasks from the latest checkin now that they've been approved
    if (latestCheckin) {
      await db
        .from('plant_tracker_checkins')
        .update({ suggested_tasks: null })
        .eq('id', latestCheckin.id);
    }

    res.json({ tasks_added: inserted?.length ?? 0, tasks_error: null });
  } catch (err: any) {
    console.error('[POST /api/trackers/:id/approve-tasks]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trackers/:id/id-feedback ───────────────────────────────────
trackersRouter.post('/:id/id-feedback', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id: trackerId } = req.params;
    const { confirmed, correctedNameHe, correctedNameEn, checkinId } = req.body;

    // Verify tracker ownership
    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('id, plant_name_he')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    // Update tracker name/confirmation status
    const updatePayload: Record<string, any> = {
      identification_confirmed: confirmed,
      updated_at: new Date().toISOString(),
    };
    if (correctedNameHe) updatePayload.plant_name_he = correctedNameHe;
    if (correctedNameEn) updatePayload.plant_name_en = correctedNameEn;

    await db
      .from('plant_trackers')
      .update(updatePayload)
      .eq('id', trackerId)
      .eq('user_id', userId);

    // Store feedback row for learning (table may not exist — non-blocking)
    try {
      await db.from('tracker_id_feedback').upsert(
        {
          tracker_id:         trackerId,
          checkin_id:         checkinId ?? null,
          confirmed,
          ai_name_he:         tracker.plant_name_he ?? null,
          corrected_name_he:  correctedNameHe ?? null,
          corrected_name_en:  correctedNameEn ?? null,
          created_at:         new Date().toISOString(),
        },
        { onConflict: 'tracker_id,checkin_id' }
      );
    } catch (feedbackErr: any) {
      console.warn('[id-feedback] feedback table upsert skipped:', feedbackErr.message);
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[POST /api/trackers/:id/id-feedback]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trackers/:id/water ────────────────────────────────────────
trackersRouter.patch('/:id/water', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { time_of_day, watered_at } = req.body;

    // Get current watering count
    const { data: current } = await db
      .from('plant_trackers')
      .select('watering_count')
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    const newCount = (current?.watering_count ?? 0) + 1;

    const { data, error } = await db
      .from('plant_trackers')
      .update({
        last_watered_at: watered_at || new Date().toISOString(),
        watering_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Resolve garden_plants_id: use stored FK directly, fall back to join for legacy rows
    let gardenPlantId: string | null = (data as any)?.garden_plants_id ?? null;
    if (!gardenPlantId) {
      try {
        const { data: trackerData } = await db
          .from('plant_trackers')
          .select('plant_id, garden_id')
          .eq('id', id)
          .single();
        if (trackerData) {
          const { data: gpData } = await db
            .from('garden_plants')
            .select('id')
            .eq('plant_id', trackerData.plant_id)
            .eq('garden_id', trackerData.garden_id)
            .single();
          gardenPlantId = gpData?.id ?? null;
        }
      } catch (_) {}
    }

    // Log to plant_timeline
    let timelineError: string | null = null;
    try {
      const { data: tlData, error: tlErr } = await db.from('plant_timeline').insert({
        tracker_id: id,
        plant_id: gardenPlantId,
        user_id: userId,
        entry_type: 'watering',
        time_of_day: time_of_day ?? null,
        created_at: watered_at || new Date().toISOString(),
        note: `השקיה · ${time_of_day ?? ''}`,
      }).select();
      if (tlErr) {
        console.error('[Tracker] plant_timeline insert failed (water):', tlErr.message, tlErr.details, tlErr.hint);
        timelineError = tlErr.message;
      }
    } catch (timelineErr: any) {
      console.error('[Tracker] plant_timeline insert threw (water):', timelineErr.message);
      timelineError = timelineErr.message;
    }

    res.json({ success: true, tracker: data, timeline_error: timelineError });
  } catch (err: any) {
    console.error('[Tracker] water error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/trackers/:id/fertilize ────────────────────────────────────
trackersRouter.patch('/:id/fertilize', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { time_of_day, fertilized_at } = req.body;

    const { data, error } = await db
      .from('plant_trackers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Resolve garden_plants_id: use stored FK directly, fall back to join for legacy rows
    let gardenPlantId: string | null = (data as any)?.garden_plants_id ?? null;
    if (!gardenPlantId) {
      try {
        const { data: trackerData } = await db
          .from('plant_trackers')
          .select('plant_id, garden_id')
          .eq('id', id)
          .single();
        if (trackerData) {
          const { data: gpData } = await db
            .from('garden_plants')
            .select('id')
            .eq('plant_id', trackerData.plant_id)
            .eq('garden_id', trackerData.garden_id)
            .single();
          gardenPlantId = gpData?.id ?? null;
        }
      } catch (_) {}
    }

    // Log to plant_timeline
    let timelineError: string | null = null;
    try {
      const { data: tlData, error: tlErr } = await db.from('plant_timeline').insert({
        tracker_id: id,
        plant_id: gardenPlantId,
        user_id: userId,
        entry_type: 'fertilizing',
        time_of_day: time_of_day ?? null,
        created_at: fertilized_at || new Date().toISOString(),
        note: `דישון · ${time_of_day ?? ''}`,
      }).select();
      if (tlErr) {
        console.error('[Tracker] plant_timeline insert failed (fertilize):', tlErr.message, tlErr.details, tlErr.hint);
        timelineError = tlErr.message;
      }
    } catch (timelineErr: any) {
      console.error('[Tracker] plant_timeline insert threw (fertilize):', timelineErr.message);
      timelineError = timelineErr.message;
    }

    res.json({ success: true, tracker: data, timeline_error: timelineError });
  } catch (err: any) {
    console.error('[Tracker] fertilize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trackers/:id/note ───────────────────────────────────────────
trackersRouter.post('/:id/note', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { note } = req.body;

    if (!note?.trim()) return res.status(400).json({ error: 'Note required' });

    const { data, error } = await db
      .from('plant_timeline')
      .insert({
        tracker_id: id,
        user_id: userId,
        entry_type: 'note',
        note: note.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, entry: data });
  } catch (err: any) {
    console.error('[Tracker] note error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trackers/plant/:plantId/timeline ────────────────────────────
// Returns timeline for a plant by garden_plants UUID — works with or without a tracker
trackersRouter.get('/plant/:plantId/timeline', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { plantId } = req.params;
  const { data, error } = await db
    .from('plant_timeline')
    .select('*')
    .eq('plant_id', plantId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

// ── POST /api/trackers/plant/:plantId/water ───────────────────────────────
// Logs a watering entry for a plant that has no tracker
trackersRouter.post('/plant/:plantId/water', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { plantId } = req.params;
  const { time_of_day, watered_at } = req.body;

  let timelineError: string | null = null;
  try {
    const { error: tlErr } = await db.from('plant_timeline').insert({
      plant_id: plantId,
      tracker_id: null,
      user_id: userId,
      entry_type: 'watering',
      time_of_day: time_of_day ?? null,
      created_at: watered_at || new Date().toISOString(),
      note: `השקיה · ${time_of_day ?? ''}`,
    });
    if (tlErr) {
      console.error('[Tracker] plant timeline insert failed (plant water):', tlErr.message);
      timelineError = tlErr.message;
    }
  } catch (err: any) {
    console.error('[Tracker] plant timeline insert threw (plant water):', err.message);
    timelineError = err.message;
  }

  return res.json({ success: true, timeline_error: timelineError });
});

// ── POST /api/trackers/plant/:plantId/fertilize ───────────────────────────
trackersRouter.post('/plant/:plantId/fertilize', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { plantId } = req.params;
  const { time_of_day, fertilized_at } = req.body;

  let timelineError: string | null = null;
  try {
    const { error: tlErr } = await db.from('plant_timeline').insert({
      plant_id: plantId,
      tracker_id: null,
      user_id: userId,
      entry_type: 'fertilizing',
      time_of_day: time_of_day ?? null,
      created_at: fertilized_at || new Date().toISOString(),
      note: `דישון · ${time_of_day ?? ''}`,
    });
    if (tlErr) {
      console.error('[Tracker] plant timeline insert failed (plant fertilize):', tlErr.message);
      timelineError = tlErr.message;
    }
  } catch (err: any) {
    timelineError = err.message;
  }

  return res.json({ success: true, timeline_error: timelineError });
});

// ── POST /api/trackers/plant/:plantId/note ────────────────────────────────
// Adds a note entry for a plant that has no tracker (mirrors water/fertilize above).
trackersRouter.post('/plant/:plantId/note', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { plantId } = req.params;
  const { note } = req.body;

  if (!note?.trim()) return res.status(400).json({ error: 'Note required' });

  const { data, error } = await db
    .from('plant_timeline')
    .insert({
      plant_id: plantId,
      tracker_id: null,
      user_id: userId,
      entry_type: 'note',
      note: note.trim(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, entry: data });
});

// ── GET /api/trackers/:id/timeline ────────────────────────────────────────
trackersRouter.get('/:id/timeline', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data, error } = await db
      .from('plant_timeline')
      .select('*')
      .eq('tracker_id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ entries: data ?? [] });
  } catch (err: any) {
    console.error('[Tracker] timeline error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trackers/:id/timeline-photo ────────────────────────────────
trackersRouter.post('/:id/timeline-photo', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id: trackerId } = req.params;
    const { file_path, note, taken_at } = req.body;

    if (!file_path) {
      return res.status(400).json({ error: 'file_path required' });
    }

    // Verify tracker ownership (also fetch FK columns needed for timeline insert)
    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('id, garden_plants_id, plant_id, garden_id')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    // Resolve garden_plants_id: use stored FK directly, fall back to join for legacy rows
    let gardenPlantId: string | null = (tracker as any).garden_plants_id ?? null;
    if (!gardenPlantId) {
      try {
        const { data: gpData } = await db
          .from('garden_plants')
          .select('id')
          .eq('plant_id', (tracker as any).plant_id)
          .eq('garden_id', (tracker as any).garden_id)
          .single();
        gardenPlantId = gpData?.id ?? null;
      } catch (_) {}
    }

    // Store ONLY the local file path — no upload, no Supabase Storage
    const { data: entry, error: insertError } = await db
      .from('plant_timeline')
      .insert({
        tracker_id: trackerId,
        plant_id: gardenPlantId,
        user_id: userId,
        entry_type: 'photo',
        photo_path: file_path,
        note: note ?? null,
        created_at: taken_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, entry });
  } catch (err: any) {
    console.error('[POST /api/trackers/:id/timeline-photo]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trackers/plant/:plantId/timeline-photo ─────────────────────
// Saves a photo timeline entry for a plant without a tracker
trackersRouter.post('/plant/:plantId/timeline-photo', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { plantId } = req.params;
  const { file_path, note, taken_at } = req.body;

  const { data: entry, error: insertError } = await db
    .from('plant_timeline')
    .insert({
      plant_id: plantId,
      tracker_id: null,
      user_id: userId,
      entry_type: 'photo',
      photo_path: file_path,
      note: note ?? null,
      created_at: taken_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Tracker] plant photo insert failed:', insertError.message);
    return res.status(500).json({ error: insertError.message });
  }

  return res.json({ success: true, entry });
});

// ── GET /api/trackers/:id/plan ────────────────────────────────────────────
trackersRouter.get('/:id/plan', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id: trackerId } = req.params;

    // Verify ownership
    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('id')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const { data: checkin } = await db
      .from('plant_tracker_checkins')
      .select('growing_plan, checkin_date, growth_stage')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!checkin) {
      return res.status(404).json({ error: 'No checkins found for this tracker' });
    }

    res.json({
      growingPlan:  checkin.growing_plan,
      checkinDate:  checkin.checkin_date,
      growthStage:  checkin.growth_stage,
    });
  } catch (err: any) {
    console.error('[GET /api/trackers/:id/plan]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});
