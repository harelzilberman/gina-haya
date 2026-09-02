import { db } from '../db/client';
import { getLimits } from '../config/tiers';
import { startOfCurrentMonthIsrael, startOfTodayIsrael } from '@gina-haya/shared';

// Valid values must match the CHECK constraint in migration 019.
// 'passport_chip' is reserved for Phase 2.
export type VisionSource = 'full_diagnosis' | 'chat_image' | 'tracker_checkin' | 'passport_chip';

export interface VisionQuotaResult {
  allowed: boolean;
  used: number;
  limit: number | null;  // null = unlimited
  // Discriminates daily from monthly when allowed=false.
  // null when allowed=true or the limit is unlimited.
  limitType: 'daily' | 'monthly' | null;
  // ID of the vision_uses row that was inserted on this call.
  // null when the quota was exceeded (no row inserted) or on DB error.
  visionUseId: string | null;
}

/**
 * Returns the number of billable vision uses for the user this calendar month.
 * Free retries (is_free_retry = true) are excluded so they do not count toward
 * the displayed quota.  Returns null on DB error.
 *
 * Uses the same filter as checkVisionQuota so the two can never drift.
 */
export async function countVisionUsesThisMonth(userId: string): Promise<number | null> {
  const startOfMonth = startOfCurrentMonthIsrael();

  const { count, error } = await db
    .from('vision_uses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_free_retry', false)
    .gte('created_at', startOfMonth);

  if (error) {
    console.error('[visionQuota] countVisionUsesThisMonth error:', error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Read-only quota check.  Does NOT insert a vision_uses row.
 *
 * Checks both the daily cap (Israel calendar day) and the monthly cap.
 * Daily is checked first; if it triggers, limitType='daily' is returned so
 * the caller can show "come back tomorrow" copy rather than "upgrade your plan".
 *
 * Returns { allowed, used, limit, limitType, effectiveTier } so the caller can
 * decide whether to proceed.  Call recordVisionUse() after a successful Anthropic
 * response to consume the quota credit.
 *
 * Race note: two simultaneous requests at (used = limit - 1) could both pass
 * before either INSERT commits, briefly allowing limit+1 uses.  This is an
 * acceptable trade-off — no pessimistic locking needed.
 *
 * Note: the chat daily quota (chat_uses) still uses UTC midnight and is
 * therefore inconsistent with this daily cap.  Do not change chat_uses windows
 * here — that is a separate concern.
 *
 * @param userId  - Supabase auth user UUID
 * @param tier    - If already resolved (e.g. from attachTier middleware),
 *                  pass it to skip the extra DB query.  Omit to auto-resolve.
 */
export async function checkVisionQuota(
  userId: string,
  tier?: string,
): Promise<{ allowed: boolean; used: number; limit: number | null; limitType: 'daily' | 'monthly' | null; effectiveTier: string }> {
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

  // ── 2. Get limits for this tier ───────────────────────────────────────────
  const tierLimits    = getLimits(effectiveTier);
  const monthlyLimit  = tierLimits.maxVisionLooksPerMonth;
  const dailyLimit    = tierLimits.maxVisionLooksPerDay;

  // null monthly = unlimited — skip counting entirely
  if (monthlyLimit === null) {
    return { allowed: true, used: 0, limit: null, limitType: null, effectiveTier };
  }

  // ── 3. Count billable uses today and this month (Israel timezone) ─────────
  // is_free_retry = true rows are excluded: they must not count toward caps.
  // Both windows use Israel timezone midnight (UTC+2/+3 depending on DST),
  // not bare UTC midnight which resets 2–3 hours late for Israeli users.
  const startOfDay   = startOfTodayIsrael();
  const startOfMonth = startOfCurrentMonthIsrael();

  // Two parallel count queries to avoid two round-trips serialised.
  const [dailyResult, monthlyResult] = await Promise.all([
    dailyLimit !== null
      ? db
          .from('vision_uses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_free_retry', false)
          .gte('created_at', startOfDay)
      : Promise.resolve({ count: 0, error: null }),
    db
      .from('vision_uses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_free_retry', false)
      .gte('created_at', startOfMonth),
  ]);

  if (dailyResult.error) {
    console.error('[visionQuota] daily count error — failing open:', dailyResult.error.message);
  }
  if (monthlyResult.error) {
    console.error('[visionQuota] monthly count error — failing open:', monthlyResult.error.message);
    return { allowed: true, used: 0, limit: monthlyLimit, limitType: null, effectiveTier };
  }

  const usedToday = dailyResult.count ?? 0;
  const usedMonth = monthlyResult.count ?? 0;

  // ── 4. Daily check (runs first — "come back tomorrow" beats "upgrade") ─────
  if (dailyLimit !== null && usedToday >= dailyLimit) {
    console.log(`[visionQuota] user ${userId} daily quota exceeded (${usedToday}/${dailyLimit}, tier=${effectiveTier})`);
    return { allowed: false, used: usedToday, limit: dailyLimit, limitType: 'daily', effectiveTier };
  }

  // ── 5. Monthly check ──────────────────────────────────────────────────────
  if (usedMonth >= monthlyLimit) {
    console.log(`[visionQuota] user ${userId} monthly quota exceeded (${usedMonth}/${monthlyLimit}, tier=${effectiveTier})`);
    return { allowed: false, used: usedMonth, limit: monthlyLimit, limitType: 'monthly', effectiveTier };
  }

  return { allowed: true, used: usedMonth, limit: monthlyLimit, limitType: null, effectiveTier };
}

/**
 * Inserts a vision_uses row to record a successful (billed) Anthropic call.
 *
 * Call this AFTER the Anthropic response has been received, parsed, and
 * validated — not before.  A failed analysis should not consume quota.
 *
 * If the insert fails but the analysis succeeded, the error is logged loudly
 * and the successful response is still returned to the caller.  Losing a quota
 * count is better than failing a call the user already waited 30s for.
 *
 * @returns the new vision_uses row ID, or null on DB error.
 */
export async function recordVisionUse(
  userId: string,
  source: VisionSource,
  gardenPlantsId?: string | null,
): Promise<string | null> {
  const { data: insertedRow, error: insertError } = await db.from('vision_uses').insert({
    user_id:          userId,
    source,
    garden_plants_id: gardenPlantsId ?? null,
  }).select('id').single();

  if (insertError) {
    console.error('[visionQuota] QUOTA RECORD FAILED — analysis succeeded but vision_uses insert failed:', insertError.message);
  }

  return insertedRow?.id ?? null;
}

/**
 * Convenience wrapper: check quota then, if allowed, immediately record.
 *
 * Use this only for call sites where check-then-record in the same step is
 * acceptable (e.g. free-retry eligibility checks, backward-compat callers).
 * Prefer checkVisionQuota() + recordVisionUse() separated around the Anthropic
 * call for all new code.
 *
 * @param userId        - Supabase auth user UUID
 * @param source        - Which entry point triggered the vision call
 * @param gardenPlantsId - Optional FK into garden_plants (nullable in DB)
 * @param tier          - If already resolved pass it to skip the extra DB query.
 */
export async function checkAndRecordVisionUse(
  userId: string,
  source: VisionSource,
  gardenPlantsId?: string | null,
  tier?: string,
): Promise<VisionQuotaResult> {
  const check = await checkVisionQuota(userId, tier);

  if (!check.allowed) {
    return { allowed: false, used: check.used, limit: check.limit, limitType: check.limitType, visionUseId: null };
  }

  // null = unlimited — record immediately
  if (check.limit === null) {
    const visionUseId = await recordVisionUse(userId, source, gardenPlantsId);
    return { allowed: true, used: 0, limit: null, limitType: null, visionUseId };
  }

  const visionUseId = await recordVisionUse(userId, source, gardenPlantsId);
  return { allowed: true, used: check.used + 1, limit: check.limit, limitType: null, visionUseId };
}

/**
 * Inserts a free-retry vision_uses row without checking or incrementing the
 * monthly quota.  Call this instead of checkAndRecordVisionUse when the retry
 * qualifies as free (no prior free retry for the same original recognition).
 *
 * The inserted row has is_free_retry = true and links back to the original via
 * retry_of_id.  The rolling-month count query in checkVisionQuota and
 * countVisionUsesThisMonth both exclude is_free_retry = true rows, so the user
 * is never penalised for the retry.
 *
 * Returns the new vision_uses row ID, or null on DB error.
 */
export async function recordFreeRetryVisionUse(
  userId: string,
  source: VisionSource,
  retryOfVisionUseId: string,
): Promise<string | null> {
  const { data: insertedRow, error } = await db.from('vision_uses').insert({
    user_id:        userId,
    source,
    is_free_retry:  true,
    retry_of_id:    retryOfVisionUseId,
  }).select('id').single();
  if (error) {
    console.error('[visionQuota] recordFreeRetryVisionUse insert error:', error.message);
    return null;
  }
  return insertedRow?.id ?? null;
}
