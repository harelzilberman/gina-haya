import { db } from '../db/client';
import { getLimits } from '../config/tiers';

// Valid values must match the CHECK constraint in migration 019.
// 'passport_chip' is reserved for Phase 2.
export type VisionSource = 'full_diagnosis' | 'chat_image' | 'tracker_checkin' | 'passport_chip';

export interface VisionQuotaResult {
  allowed: boolean;
  used: number;
  limit: number | null;  // null = unlimited
}

/**
 * Returns the number of vision uses for the user this calendar month, or null
 * on a DB error.  Uses the same count query as checkAndRecordVisionUse so the
 * two can never drift.
 */
export async function countVisionUsesThisMonth(userId: string): Promise<number | null> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('vision_uses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('[visionQuota] countVisionUsesThisMonth error:', error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Checks whether the user is within their monthly vision-use quota, and if so,
 * inserts a vision_uses row to record the call.
 *
 * Call this BEFORE any Anthropic API spend.  On refusal, return HTTP 200 with
 * the structured body:
 *   { ok: false, reason: 'vision_quota_exceeded', used, limit }
 *
 * @param userId        - Supabase auth user UUID
 * @param source        - Which entry point triggered the vision call
 * @param gardenPlantsId - Optional FK into garden_plants (nullable in DB)
 * @param tier          - If already resolved (e.g. from attachTier middleware),
 *                        pass it to skip the extra DB query.  Omit to auto-resolve.
 *
 * Race note: two simultaneous requests at (used = limit - 1) could both pass
 * before either INSERT commits, briefly allowing limit+1 uses.  This is an
 * acceptable trade-off for this product — no pessimistic locking needed.
 */
export async function checkAndRecordVisionUse(
  userId: string,
  source: VisionSource,
  gardenPlantsId?: string | null,
  tier?: string,
): Promise<VisionQuotaResult> {
  // ── 1. Resolve effective tier ─────────────────────────────────────────────
  let effectiveTier = tier;
  if (!effectiveTier) {
    const { data: userRow } = await db
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();
    effectiveTier = userRow?.subscription_tier ?? 'free';
  }

  // LAUNCH_FREE_MODE: grant top-tier limits during launch period.
  // Uses 'professional' (the real top-tier key in TIER_LIMITS) — not 'pro'
  // which has no entry and falls back to free.
  const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
  if (LAUNCH_FREE_MODE) {
    effectiveTier = 'professional';
  }

  // ── 2. Get limit for this tier ────────────────────────────────────────────
  const limit = getLimits(effectiveTier).maxVisionLooksPerMonth;

  // null = unlimited — skip count and record immediately
  if (limit === null) {
    const { error: insertError } = await db.from('vision_uses').insert({
      user_id:          userId,
      source,
      garden_plants_id: gardenPlantsId ?? null,
    });
    if (insertError) {
      console.error('[visionQuota] insert error (unlimited path):', insertError.message);
    }
    return { allowed: true, used: 0, limit: null };
  }

  // ── 3. Count uses this rolling month ─────────────────────────────────────
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error: countError } = await db
    .from('vision_uses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  if (countError) {
    // Log and fail-open: better to let an Anthropic call through than to block
    // all users due to a DB hiccup.
    console.error('[visionQuota] count error — failing open:', countError.message);
    return { allowed: true, used: 0, limit };
  }

  const used = count ?? 0;

  // ── 4. Enforce limit ──────────────────────────────────────────────────────
  if (used >= limit) {
    console.log(`[visionQuota] user ${userId} quota exceeded (${used}/${limit}, tier=${effectiveTier})`);
    return { allowed: false, used, limit };
  }

  // ── 5. Record use ─────────────────────────────────────────────────────────
  const { error: insertError } = await db.from('vision_uses').insert({
    user_id:          userId,
    source,
    garden_plants_id: gardenPlantsId ?? null,
  });
  if (insertError) {
    // Non-fatal: the user is within quota; don't block the call over a log failure.
    console.error('[visionQuota] insert error:', insertError.message);
  }

  return { allowed: true, used: used + 1, limit };
}
