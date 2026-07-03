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
    const tier = LAUNCH_FREE_MODE
      ? 'professional'
      : (data?.subscription_tier ?? 'free');
    req.tier = tier;
    req.limits = getLimits(tier);
  } catch {
    req.tier = 'free';
    req.limits = getLimits('free');
  }

  next();
}
