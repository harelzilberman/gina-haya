import 'dotenv/config';
import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';
import { analyzePlantImage, compressImageForClaude } from '../services/plantVision';
import { fetchWeatherForRegion } from '../services/weather';
import { todayInIsrael } from '@gina-haya/shared';

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
      .select('id, tracker_id, checkin_date, growth_stage, ai_analysis, created_at')
      .in('tracker_id', trackerIds)
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
    const { plantNameHe, plantNameEn, plantId, gardenId, locationType, locationDescription } = req.body;

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
        .eq('user_id', userId);

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

// ── PATCH /api/trackers/:id ───────────────────────────────────────────────
trackersRouter.patch('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { plantNameHe, plantNameEn } = req.body;

    if (!plantNameHe || !plantNameEn) {
      return res.status(400).json({ error: 'plantNameHe and plantNameEn are required' });
    }

    const { error } = await db
      .from('plant_trackers')
      .update({ plant_name_he: plantNameHe, plant_name_en: plantNameEn, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ ok: true });
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
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const { data: checkins } = await db
      .from('plant_tracker_checkins')
      .select('*')
      .eq('tracker_id', id)
      .order('checkin_date', { ascending: false });

    res.json({ ...tracker, checkins: checkins ?? [] });
  } catch (err: any) {
    console.error('[GET /api/trackers/:id]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/trackers/:id ──────────────────────────────────────────────
trackersRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await db
      .from('plant_trackers')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
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
        .eq('user_id', userId);

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
      }, { data: compressed.data, mimeType: 'image/jpeg' });
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

    // Save checkin with photo path
    const { data: checkin, error: checkinError } = await db
      .from('plant_tracker_checkins')
      .insert({
        tracker_id:   trackerId,
        user_id:      userId,
        checkin_date: today,
        growth_stage: analysis.growthStage,
        ai_analysis:  analysis,
        growing_plan: growingPlan,
        notes:        notes ?? null,
        photo_path:   photoPath,
      })
      .select()
      .single();

    if (checkinError) throw checkinError;

    res.status(201).json({ checkin, analysis, growingPlan, suggested_tasks: tasks, used_credit: usedAnalysisCredit });
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

    // Verify tracker ownership
    const { data: tracker, error: trackerError } = await db
      .from('plant_trackers')
      .select('id')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const today = todayInIsrael();
    const [y, m, d] = today.split('-').map(Number);

    const taskRows = tasks.map((t: any, i: number) => {
      const rawTitle = t.title ? String(t.title).trim() : '';
      const title = rawTitle && rawTitle !== 'undefined' ? rawTitle : `משימה ${i + 1}`;
      const daysOut = Math.max(0, Math.min(Number(t.due_in_days) || 1, 30));
      const dueDate = new Date(Date.UTC(y, m - 1, d + daysOut)).toISOString().slice(0, 10);
      return {
        user_id:       userId,
        plan_id:       null,
        date:          dueDate,
        title,
        type:          'maintenance' as const,
        status:        'pending' as const,
        notes:         t.description ? String(t.description) : null,
        source_action: 'growing_tracker',
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

    res.json({ tasks_added: inserted?.length ?? 0, tasks_error: null });
  } catch (err: any) {
    console.error('[POST /api/trackers/:id/approve-tasks]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
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
      .single();

    if (trackerError || !tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const { data: checkin } = await db
      .from('plant_tracker_checkins')
      .select('growing_plan, checkin_date, growth_stage')
      .eq('tracker_id', trackerId)
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
