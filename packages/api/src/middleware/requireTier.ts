import type { Request, Response, NextFunction } from 'express';
import { TIER_ORDER } from '@gina-haya/shared';
import { db } from '../db/client';

function tierRank(tier: string): number {
  const idx = (TIER_ORDER as ReadonlyArray<string>).indexOf(tier);
  return idx === -1 ? 0 : idx;
}

export function requireTier(minimumTier: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await db
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (error || !data) {
      res.status(403).json({ error: 'upgrade_required', currentTier: 'free', requiredTier: minimumTier });
      return;
    }

    const currentTier: string = data.subscription_tier ?? 'free';

    if (tierRank(currentTier) < tierRank(minimumTier)) {
      res.status(403).json({ error: 'upgrade_required', currentTier, requiredTier: minimumTier });
      return;
    }

    // Attach tier to request for downstream use
    (req as any).user.subscription_tier = currentTier;
    next();
  };
}
