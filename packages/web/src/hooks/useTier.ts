import { useAuthStore } from '../stores/authStore';

import type { SubscriptionTier } from '@gina-haya/shared';

const TIER_FEATURES = {
  free:         { appAccess: false, diagnosesPerMonth: 0,        adFree: false, multiGarden: false },
  gardener_pro: { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
  advanced:     { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
  professional: { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
};

const TIER_PRICES: Record<string, number | null> = {
  free:           null,
  gardener_pro:   18,
  advanced:       36,
  professional:   54,
};

const TIER_ORDER: SubscriptionTier[] = ['free', 'gardener_pro', 'advanced', 'professional'];

const CHUPCHU_MONTHLY_LIMITS: Record<SubscriptionTier, number | null> = {
  free:           54,
  gardener_pro:   250,
  advanced:       500,
  professional:   800,
};

const CHUPCHU_DAILY_LIMITS: Record<SubscriptionTier, number | null> = {
  free:           3,
  gardener_pro:   18,
  advanced:       36,
  professional:   54,
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
    monthlyLimit:    CHUPCHU_MONTHLY_LIMITS[tier],
    dailyLimit:      CHUPCHU_DAILY_LIMITS[tier],
    canUpgradeTo,
    monthlyPrice:    TIER_PRICES[tier],
  };
}
