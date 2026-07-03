export interface TierLimits {
  maxGardens: number | null;
  maxPlantsPerGarden: number | null;
  maxTrackers: number | null;
  maxCheckinsPerTrackerPerMonth: number | null;
  maxTotalCheckinsEver: number | null;
  maxChupChuPerMonth: number | null;
  maxVisionLooksPerMonth: number | null;  // null = unlimited
  encyclopediaAccess: boolean;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    maxGardens:                    1,
    maxPlantsPerGarden:            10,
    maxTrackers:                   1,
    maxCheckinsPerTrackerPerMonth: null,
    maxTotalCheckinsEver:          1,
    maxChupChuPerMonth:            20,
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
    maxVisionLooksPerMonth:        null,
    encyclopediaAccess:            true,
  },
};

export function getLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}
