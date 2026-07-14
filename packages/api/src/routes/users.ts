import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';
import { getLimits } from '../config/tiers';
import { countVisionUsesThisMonth } from '../services/visionQuota';

export const usersRouter: IRouter = Router();

usersRouter.use(verifyToken);

// ── POST /api/users/push-token ──────────────────────────────────────────────
// Save an Expo push token for the authenticated user.
//
// Required DB migration (run once in Supabase SQL editor):
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
//
const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(200),
});

// ── PATCH /api/users/profile ────────────────────────────────────────────────
usersRouter.patch('/profile', async (req, res) => {
  const { id } = req.user!;
  const { activeGardenId } = req.body;

  const updates: Record<string, any> = {};
  if (activeGardenId !== undefined) updates.active_garden_id = activeGardenId;

  if (Object.keys(updates).length === 0) return res.json({ ok: true });

  const { error } = await db.from('users').update(updates).eq('id', id);
  if (error) {
    console.error('[users/profile PATCH]', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
  return res.json({ ok: true });
});

usersRouter.post('/push-token', async (req, res) => {
  const parsed = pushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid pushToken' });
  }

  const { id } = req.user!;

  const { error } = await db
    .from('users')
    .update({ push_token: parsed.data.pushToken })
    .eq('id', id);

  if (error) {
    console.error('[users/push-token POST]', error);
    return res.status(500).json({ error: 'Failed to save push token' });
  }

  return res.json({ ok: true });
});

// ── GET /api/users/usage ────────────────────────────────────────────────────
usersRouter.get('/usage', async (req: any, res) => {
  try {
    const userId = req.user.id;

    const { data: userRow } = await db
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const tier = userRow?.subscription_tier ?? 'free';
    const limits = getLimits(tier);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const resetsAt = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString();

    // Count analyses this month
    const { count: analysesUsed } = await db
      .from('plant_tracker_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString());

    // Count active trackers
    const { count: trackersActive } = await db
      .from('plant_trackers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Count active (non-archived) plants across all user gardens.
    // garden_plants has no user_id column; ownership is through garden_id → gardens.user_id.
    // Fix: join via the gardens we already have in gardensCount query, resolved by garden_id IN (...).
    const { data: userGardensForPlants } = await db
      .from('gardens')
      .select('id')
      .eq('user_id', userId);
    const userGardenIds = (userGardensForPlants ?? []).map((g: any) => g.id);
    const { count: plantsCount } = userGardenIds.length > 0
      ? await db
          .from('garden_plants')
          .select('id', { count: 'exact', head: true })
          .in('garden_id', userGardenIds)
          .is('archived_at', null)
      : { count: 0 };

    // Count gardens
    const { count: gardensCount } = await db
      .from('gardens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Count chupchu messages this month
    const { data: convData } = await db
      .from('chupchu_conversations')
      .select('messages')
      .eq('user_id', userId)
      .gte('updated_at', startOfMonth.toISOString())
      .limit(1)
      .single();

    const chupChuUsed = (convData?.messages ?? []).filter(
      (m: any) => m.role === 'user' && new Date(m.timestamp) >= startOfMonth
    ).length;

    res.json({
      tier,
      analyses: {
        used:     analysesUsed ?? 0,
        limit:    limits.maxCheckinsPerTrackerPerMonth ?? limits.maxTotalCheckinsEver ?? null,
        resetsAt,
      },
      trackers: {
        active: trackersActive ?? 0,
        limit:  limits.maxTrackers,
      },
      plants: {
        count: plantsCount ?? 0,
        limit: limits.maxPlantsPerGarden,
      },
      chupchu: {
        used:     chupChuUsed,
        limit:    limits.maxChupChuPerMonth,
        resetsAt,
      },
      gardens: {
        count: gardensCount ?? 0,
        limit: limits.maxGardens,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/users/usage]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/me/usage ─────────────────────────────────────────────────
// Returns the authenticated user's current-month usage against their effective
// tier limits.  Uses attachTier so LAUNCH_FREE_MODE is honoured the same way
// the quota gates honour it.  Count queries are extracted from / identical to
// the gate implementations — no parallel logic that can drift.
//
// Response includes per-garden plant counts (for overflow detection) and a
// top-level has_plant_overflow convenience flag so the client can decide whether
// to show the overflow resolution screen without looping through gardens itself.

usersRouter.get('/me/usage', attachTier, async (req: any, res) => {
  try {
    const userId: string = req.user.id;
    const tier: string   = req.tier ?? 'free';
    const limits         = req.limits ?? getLimits(tier);
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';

    // Period boundary — first of current month at midnight, same as quota gates.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const resetsAt = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      1,
    ).toISOString();

    // ── ChupChu text messages this month ──────────────────────────────────
    // Identical query to the chat gate (chupchu.ts POST /chat, text-only path).
    let chupChuUsed: number | null = 0;
    {
      const { data: convData, error: convError } = await db
        .from('chupchu_conversations')
        .select('messages')
        .eq('user_id', userId)
        .gte('updated_at', startOfMonth.toISOString())
        .limit(1)
        .single();

      if (convError && convError.code !== 'PGRST116') {
        // PGRST116 = no rows — that's 0 messages, not an error.
        console.error('[GET /api/users/me/usage] chupchu count error:', convError.message);
        chupChuUsed = null;
      } else {
        chupChuUsed = (convData?.messages ?? []).filter(
          (m: any) => m.role === 'user' && new Date(m.timestamp) >= startOfMonth,
        ).length;
      }
    }

    // ── Vision uses this month ────────────────────────────────────────────
    // Delegates to countVisionUsesThisMonth which shares the count query with
    // checkAndRecordVisionUse in visionQuota.ts.
    const visionUsed = await countVisionUsesThisMonth(userId);

    // ── Per-garden plant counts (for overflow detection) ──────────────────
    // plant_limit mirrors LAUNCH_FREE_MODE semantics used by the create/restore
    // gates: in launch mode the limit is not enforced, so we report null here too
    // rather than a misleading finite number.
    const plantLimit: number | null = LAUNCH_FREE_MODE ? null : (limits.maxPlantsPerGarden ?? null);

    const { data: gardensList, error: gardensErr } = await db
      .from('gardens')
      .select('id, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (gardensErr) throw gardensErr;

    const gardenIds = (gardensList ?? []).map((g: any) => g.id as string);

    // Fetch all active plants across all user gardens in one query, aggregate in JS.
    // garden_plants has no user_id column; ownership flows through garden_id.
    let countByGarden = new Map<string, number>();
    if (gardenIds.length > 0) {
      const { data: activePlants, error: plantsErr } = await db
        .from('garden_plants')
        .select('garden_id')
        .in('garden_id', gardenIds)
        .is('archived_at', null);

      if (plantsErr) throw plantsErr;

      for (const p of activePlants ?? []) {
        countByGarden.set(p.garden_id, (countByGarden.get(p.garden_id) ?? 0) + 1);
      }
    }

    const gardens = (gardensList ?? []).map((g: any) => ({
      garden_id:          g.id,
      garden_name:        g.name,
      active_plant_count: countByGarden.get(g.id) ?? 0,
      plant_limit:        plantLimit,
    }));

    const has_plant_overflow =
      plantLimit !== null &&
      gardens.some(g => g.active_plant_count > plantLimit);

    res.json({
      tier,
      tier_label_he:    limits.displayNameHe,
      launch_free_mode: LAUNCH_FREE_MODE,
      has_plant_overflow,
      chupchu: {
        used:  chupChuUsed,
        limit: limits.maxChupChuPerMonth,
      },
      vision: {
        used:  visionUsed,
        limit: limits.maxVisionLooksPerMonth,
      },
      period: {
        resets_at: resetsAt,
      },
      gardens,
    });
  } catch (err: any) {
    console.error('[GET /api/users/me/usage]', err.message);
    res.status(500).json({ error: err.message });
  }
});
