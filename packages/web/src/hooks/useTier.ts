import { useAuthStore } from '../stores/authStore';
import { getLimits, TIER_PRICING, TIER_ORDER } from '@gina-haya/shared';
import type { SubscriptionTier } from '@gina-haya/shared';

export function useTier() {
  const profile = useAuthStore(s => s.profile);
  const tier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? 'free';

  const limits = getLimits(tier);
  const currentIdx = (TIER_ORDER as ReadonlyArray<string>).indexOf(tier);
  const canUpgradeTo: SubscriptionTier | null =
    currentIdx !== -1 && currentIdx < TIER_ORDER.length - 1
      ? (TIER_ORDER[currentIdx + 1] as SubscriptionTier)
      : null;

  return {
    tier,
    isAdFree:     tier !== 'free',
    monthlyLimit: limits.maxChupChuPerMonth,
    dailyLimit:   limits.maxChupChuPerDay,
    canUpgradeTo,
    monthlyPrice: TIER_PRICING[tier]?.monthly ?? null,
  };
}
