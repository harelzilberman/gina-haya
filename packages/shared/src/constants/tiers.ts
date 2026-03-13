import type { SubscriptionTier } from '../types/user';

export const TIER_PRICES: Record<SubscriptionTier, number | null> = {
  free:           null,
  grower:         9,
  gardener_pro:   14,
  professional:   49,
};

export const TIER_FEATURES = {
  free:         { appAccess: false, diagnosesPerMonth: 0,        adFree: false, multiGarden: false },
  grower:       { appAccess: true,  diagnosesPerMonth: 5,        adFree: false, multiGarden: false },
  gardener_pro: { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
  professional: { appAccess: true,  diagnosesPerMonth: Infinity, adFree: true,  multiGarden: true  },
};
