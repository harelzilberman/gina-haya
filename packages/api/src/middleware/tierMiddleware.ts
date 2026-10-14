import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { getLimits, TIER_LIMITS, type TierLimits } from '../config/tiers';
import { sendGrantFailureAlert } from '../services/email';
import { LS_ACTIVE_STATUSES } from '../routes/billing';

declare global {
  namespace Express {
    interface Request {
      tier?: string;
      limits?: TierLimits;
    }
  }
}

const FREE_TIERS = new Set(['free', 'owner']);
export const MS_24H = 24 * 60 * 60 * 1000;

// In-memory rate-limit: at most one stale-active alert per user per 24 h.
// Resets on deploy; not shared across instances — a rolling deploy may send a
// duplicate alert for the same user. Acceptable: a DB-backed limiter would be
// disproportionate for a low-frequency alert path.
export const staleAlertSent = new Map<string, number>();

/**
 * Fires a grant-failure alert when a Play subscription appears stale-active.
 * Rate-limited to one alert per user per 24 h. Never throws — a mail error must not
 * interrupt the request.
 */
async function alertStaleActive(
  userId: string,
  platform: string,
  status: string,
  expiresAt: string,
  daysPastDue: number,
): Promise<void> {
  const lastSent = staleAlertSent.get(userId) ?? 0;
  if (Date.now() - lastSent < MS_24H) return;
  staleAlertSent.set(userId, Date.now());
  try {
    await sendGrantFailureAlert({
      context:       'stale_subscription',
      userId,
      userEmail:     undefined,
      productOrTier: `${platform} (stale-active, ${daysPastDue}d past due)`,
      transactionId: undefined,
      provider:      platform,
      errorMessage:  `status=${status} expires_at=${expiresAt} — RTDN or webhook may have been missed`,
    });
  } catch (alertErr: any) {
    // Alert failures must never break the request. Log and carry on.
    console.warn('[attachTier] stale-active alert failed (non-fatal):', alertErr?.message ?? String(alertErr));
  }
}

export async function attachTier(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).user?.id;
  if (!userId) { next(); return; }

  try {
    const { data } = await db
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    // LAUNCH MODE — everyone gets Pro access
    // Remove this when payments are ready.
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
    let tier = LAUNCH_FREE_MODE
      ? 'professional'
      : (data?.subscription_tier ?? 'free');

    // Safety net: check Google Play and Lemon Squeezy subscriptions for silent expiry.
    // Only runs when LAUNCH_FREE_MODE is off and the tier is a paid tier.
    if (!LAUNCH_FREE_MODE && !FREE_TIERS.has(tier)) {
      try {
        // Fetch both platform subscriptions in parallel (one query each).
        const [{ data: playSub }, { data: lsSub }] = await Promise.all([
          db.from('user_subscriptions')
            .select('expires_at, status')
            .eq('user_id', userId)
            .eq('platform', 'google_play')
            // A pending (unsettled) purchase never granted a tier, so it must not
            // drive the expiry safety net for a tier held via an earlier purchase.
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          db.from('user_subscriptions')
            .select('expires_at, status')
            .eq('user_id', userId)
            .eq('platform', 'lemonsqueezy')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const now = new Date();
        const lsExpiresAt  = lsSub?.expires_at ? new Date(lsSub.expires_at) : null;

        // LS counts as valid access when:
        //   - status is active / on_trial / past_due, OR
        //   - status is cancelled but ends_at hasn't passed yet.
        const hasActiveLS = lsSub !== null && (
          LS_ACTIVE_STATUSES.has(lsSub.status) ||
          (lsSub.status === 'cancelled' && lsExpiresAt !== null && lsExpiresAt > now)
        );

        // ── 1. Google Play expiry check ──────────────────────────────────────
        if (playSub?.expires_at) {
          const expiredMoreThan24hAgo =
            Date.now() - new Date(playSub.expires_at).getTime() > MS_24H;
          const notActive =
            playSub.status !== 'active' && playSub.status !== 'grace_period';

          if (expiredMoreThan24hAgo && notActive) {
            if (hasActiveLS) {
              // User's paid tier is valid via Lemon Squeezy — don't downgrade based on a
              // stale google_play row (e.g. an old test subscription).
              console.warn(
                `[attachTier] safety-net: skipping google_play downgrade for user=${userId} ` +
                `— active Lemon Squeezy subscription found (expires_at=${lsSub?.expires_at ?? 'null'})`
              );
            } else {
              // Row status is already terminal (expired/cancelled/paused); the tier column
              // was not updated — inline downgrade to recover from the missed write.
              console.warn(
                `[attachTier] safety-net: downgrading user=${userId} to free ` +
                `— google_play sub expired+inactive, no active Lemon Squeezy sub`
              );
              await db.from('users').update({
                subscription_tier: 'free',
                updated_at: new Date().toISOString(),
              }).eq('id', userId);
              tier = 'free';
            }
          } else if (expiredMoreThan24hAgo && !notActive) {
            // Stale-active: expires_at is > 24 h in the past but status is still
            // active or grace_period. Cannot determine whether the subscription
            // renewed (and we missed the RTDN) or lapsed (and we missed the RTDN).
            // Tier is intentionally left unchanged — changing it risks locking out
            // a paying subscriber whose renewal notification was simply delayed.
            const daysPastDue = Math.floor(
              (Date.now() - new Date(playSub.expires_at).getTime()) / MS_24H
            );
            console.warn(
              `[attachTier] stale-active: user=${userId} platform=google_play ` +
              `status=${playSub.status} expires_at=${playSub.expires_at} ` +
              `days_past_due=${daysPastDue} — RTDN may have been missed; tier unchanged`
            );
            await alertStaleActive(userId, 'google_play', playSub.status, playSub.expires_at, daysPastDue);
          }
        }

        // ── 2. Lemon Squeezy expiry downgrade ────────────────────────────────
        // If the most recent LS row is cancelled-past-ends_at, expired, or unpaid,
        // and there's no valid Play sub, downgrade to free.
        if (!FREE_TIERS.has(tier)) {
          const lsExpiredOrCancelled = lsSub !== null && (
            (lsSub.status === 'cancelled' && lsExpiresAt !== null && lsExpiresAt <= now) ||
            lsSub.status === 'expired' ||
            lsSub.status === 'unpaid'
          );

          const hasActivePlay = playSub !== null && (
            playSub.status === 'active' || playSub.status === 'grace_period'
          ) && (
            !playSub.expires_at || new Date(playSub.expires_at) > now
          );

          if (lsExpiredOrCancelled && !hasActivePlay) {
            console.warn(
              `[attachTier] safety-net: downgrading user=${userId} to free ` +
              `— Lemon Squeezy subscription ended (status=${lsSub!.status} expires_at=${lsSub!.expires_at})`
            );
            await db.from('users').update({
              subscription_tier: 'free',
              updated_at: new Date().toISOString(),
            }).eq('id', userId);
            tier = 'free';
          }
        }
      } catch (safetyErr) {
        // Fail-open: keep current tier if the check errors
        console.warn('[attachTier] safety-net check failed (non-fatal):', safetyErr);
      }
    }

    if (!(tier in TIER_LIMITS)) {
      console.warn(`[attachTier] unknown tier="${tier}" for user=${userId} — falling back to free limits`);
    }
    req.tier = tier;
    req.limits = getLimits(tier);
  } catch {
    req.tier = 'free';
    req.limits = getLimits('free');
  }

  next();
}
