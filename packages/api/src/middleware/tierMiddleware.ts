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

    // Safety net: for paid-tier users with a Google Play subscription,
    // check whether the subscription has silently expired (missed RTDN).
    // Only runs when LAUNCH_FREE_MODE is off and the tier is a paid tier.
    if (!LAUNCH_FREE_MODE && !FREE_TIERS.has(tier)) {
      try {
        const { data: sub } = await db
          .from('user_subscriptions')
          .select('expires_at, status')
          .eq('user_id', userId)
          .eq('platform', 'google_play')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub?.expires_at) {
          const expiredMoreThan24hAgo =
            Date.now() - new Date(sub.expires_at).getTime() > MS_24H;
          const notActive =
            sub.status !== 'active' && sub.status !== 'grace_period';

          if (expiredMoreThan24hAgo && notActive) {
            // Inline downgrade — Pub/Sub must have missed the expiry notification
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

    req.tier = tier;
    req.limits = getLimits(tier);
  } catch {
    req.tier = 'free';
    req.limits = getLimits('free');
  }

  next();
}
