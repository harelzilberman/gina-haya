import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { getLimits, type TierLimits } from '../config/tiers';

declare global {
  namespace Express {
    interface Request {
      tier?: string;
      limits?: TierLimits;
    }
  }
}

const FREE_TIERS = new Set(['free', 'owner']);
const MS_24H = 24 * 60 * 60 * 1000;

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
    // Fix 4: use 'professional' (the real top-tier key in TIER_LIMITS) — 'pro'
    // has no entry and falls back to free limits via getLimits().
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
    let tier = LAUNCH_FREE_MODE
      ? 'professional'
      : (data?.subscription_tier ?? 'free');

    // Safety net: check Google Play and Grow subscriptions for silent expiry.
    // Only runs when LAUNCH_FREE_MODE is off and the tier is a paid tier.
    if (!LAUNCH_FREE_MODE && !FREE_TIERS.has(tier)) {
      try {
        // Fetch both platform subscriptions in parallel (one query each).
        const [{ data: playSub }, { data: growSub }] = await Promise.all([
          db.from('user_subscriptions')
            .select('expires_at, status')
            .eq('user_id', userId)
            .eq('platform', 'google_play')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          db.from('user_subscriptions')
            .select('expires_at, status')
            .eq('user_id', userId)
            .eq('platform', 'grow')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const now = new Date();
        const growExpiresAt   = growSub?.expires_at ? new Date(growSub.expires_at) : null;
        const growNotExpired  = growSub !== null && (growExpiresAt === null || growExpiresAt > now);
        // active OR cancellation_requested-but-not-yet-expired both count as valid Grow access.
        const hasActiveGrow   = growNotExpired && (
          growSub!.status === 'active' || growSub!.status === 'cancellation_requested'
        );

        // ── 1. Google Play expiry check ──────────────────────────────────────
        if (playSub?.expires_at) {
          const expiredMoreThan24hAgo =
            Date.now() - new Date(playSub.expires_at).getTime() > MS_24H;
          const notActive =
            playSub.status !== 'active' && playSub.status !== 'grace_period';

          if (expiredMoreThan24hAgo && notActive) {
            if (hasActiveGrow) {
              // User's paid tier is valid via Grow — don't downgrade based on a
              // stale google_play row (e.g. an old test subscription).
              console.warn(
                `[attachTier] safety-net: skipping google_play downgrade for user=${userId} ` +
                `— active Grow subscription found (expires_at=${growSub?.expires_at ?? 'null'})`
              );
            } else {
              // Inline downgrade — Pub/Sub must have missed the Play expiry notification
              // and there is no active Grow subscription to fall back on.
              console.warn(
                `[attachTier] safety-net: downgrading user=${userId} to free ` +
                `— google_play sub expired+inactive, no active Grow sub`
              );
              await db.from('users').update({
                subscription_tier: 'free',
                updated_at: new Date().toISOString(),
              }).eq('id', userId);
              tier = 'free';
            }
          }
        }

        // ── 2. Grow cancellation expiry check ────────────────────────────────
        // Covers Grow-only users (no Play sub). If the most recent Grow row has
        // status='cancellation_requested' and expires_at has passed, downgrade.
        // This is the automatic tier-revocation mechanism after a manual Grow cancel.
        if (!FREE_TIERS.has(tier) &&
            growSub?.status === 'cancellation_requested' &&
            growExpiresAt !== null &&
            growExpiresAt <= now) {
          console.warn(
            `[attachTier] safety-net: downgrading user=${userId} to free ` +
            `— Grow cancellation period ended (expires_at=${growSub.expires_at})`
          );
          await db.from('users').update({
            subscription_tier: 'free',
            updated_at: new Date().toISOString(),
          }).eq('id', userId);
          tier = 'free';
        }
      } catch (safetyErr) {
        // Fail-open: keep current tier if the check errors
        console.warn('[attachTier] safety-net check failed (non-fatal):', safetyErr);
      }
    }

    req.tier = tier;
    req.limits = getLimits(tier);
  } catch {
    req.tier = 'free';
    req.limits = getLimits('free');
  }

  next();
}
