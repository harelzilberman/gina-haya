// Pure helpers for Lemon Squeezy plan changes — no I/O.
// Unit-tested in src/tests/lemonsqueezy.test.ts.
import { TIER_ORDER } from '@gina-haya/shared';

export type BillingInterval = 'monthly' | 'yearly';
export type PlanChangeKind  = 'same' | 'upgrade' | 'downgrade';

/**
 * upgrade   = higher tier, or same tier monthly → yearly.
 *             Applied immediately; the prorated difference is charged right away.
 * downgrade = lower tier, or same tier yearly → monthly.
 *             The customer keeps the current plan until the paid period ends.
 */
export function classifyPlanChange(
  curTier: string, curInterval: BillingInterval,
  newTier: string, newInterval: BillingInterval,
): PlanChangeKind {
  const order = TIER_ORDER as readonly string[];
  const a = order.indexOf(curTier);
  const b = order.indexOf(newTier);
  if (b > a) return 'upgrade';
  if (b < a) return 'downgrade';
  if (curInterval === newInterval) return 'same';
  return newInterval === 'yearly' ? 'upgrade' : 'downgrade';
}

/** Grace window so a renewal webhook that lands slightly early still applies the pending change. */
export const PENDING_DUE_TOLERANCE_MS = 60 * 60 * 1000;

/** True when a scheduled downgrade should take effect now. */
export function isPendingDue(effectiveAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!effectiveAt) return false;
  const t = new Date(effectiveAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() >= t - PENDING_DUE_TOLERANCE_MS;
}
