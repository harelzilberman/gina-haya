export interface TierLimits {
  maxGardens: number | null;
  maxPlantsPerGarden: number | null;
  maxTrackers: number | null;
  maxCheckinsPerTrackerPerMonth: number | null;
  maxTotalCheckinsEver: number | null;
  maxChupChuPerMonth: number | null;
  maxChupChuPerDay: number | null;        // null = unlimited; fair-use ceiling for paid tiers
  maxVisionLooksPerMonth: number | null;  // null = unlimited
  encyclopediaAccess: boolean;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    maxGardens:                    1,
    maxPlantsPerGarden:            15,
    maxTrackers:                   1,
    maxCheckinsPerTrackerPerMonth: null,
    maxTotalCheckinsEver:          1,
    maxChupChuPerMonth:            54,
    maxChupChuPerDay:              3,
    maxVisionLooksPerMonth:        3,
    encyclopediaAccess:            false,
  },
  grower: {
    maxGardens:                    3,
    maxPlantsPerGarden:            25,
    maxTrackers:                   3,
    maxCheckinsPerTrackerPerMonth: 3,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            50,
    maxChupChuPerDay:              18,
    maxVisionLooksPerMonth:        10,
    encyclopediaAccess:            true,
  },
  gardener_pro: {
    maxGardens:                    10,
    maxPlantsPerGarden:            null,
    maxTrackers:                   10,
    maxCheckinsPerTrackerPerMonth: 10,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            null,
    maxChupChuPerDay:              18,
    maxVisionLooksPerMonth:        null,
    encyclopediaAccess:            true,
  },
  professional: {
    maxGardens:                    null,
    maxPlantsPerGarden:            null,
    maxTrackers:                   null,
    maxCheckinsPerTrackerPerMonth: null,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            null,
    maxChupChuPerDay:              54,
    maxVisionLooksPerMonth:        null,
    encyclopediaAccess:            true,
  },
};

export function getLimits(tier: string): TierLimits {
  if (!TIER_LIMITS[tier]) {
    console.warn(`[getLimits] Unknown tier key: "${tier}" — falling back to free limits`);
    return TIER_LIMITS.free;
  }
  return TIER_LIMITS[tier];
}
