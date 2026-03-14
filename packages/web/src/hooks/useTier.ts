import { useAuthStore } from '../stores/authStore';
import { TIER_FEATURES, TIER_PRICES } from '@gina-haya/shared';
import type { SubscriptionTier } from '@gina-haya/shared';

const TIER_ORDER: SubscriptionTier[] = ['free', 'grower', 'gardener_pro', 'professional'];

const MOOSH_MONTHLY_LIMITS: Record<SubscriptionTier, number | null> = {
  free:           20,
  grower:         50,
  gardener_pro:   null,
  professional:   null,
};

export function useTier() {
  const profile = useAuthStore(s => s.profile);
  const tier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? 'free';

  const features = TIER_FEATURES[tier];
  const currentIdx = TIER_ORDER.indexOf(tier);
  const canUpgradeTo: SubscriptionTier | null =
    currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null;

  const diagnosesLeft =
    features.diagnosesPerMonth === Infinity
      ? null
      : features.diagnosesPerMonth;

  return {
    tier,
    isAdFree:        features.adFree,
    canUseDiagnosis: features.diagnosesPerMonth > 0,
    diagnosesLeft,
    monthlyLimit:    MOOSH_MONTHLY_LIMITS[tier],
    canUpgradeTo,
    monthlyPrice:    TIER_PRICES[tier],
  };
}
