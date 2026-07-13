export interface TierLimits {
  maxGardens: number | null;
  maxPlantsPerGarden: number | null;
  maxTrackers: number | null;
  maxCheckinsPerTrackerPerMonth: number | null;
  maxTotalCheckinsEver: number | null;
  maxChupChuPerMonth: number | null;
  maxChupChuPerDay: number | null;              // null = unlimited; fair-use ceiling for paid tiers
  maxVisionLooksPerMonth: number | null;         // null = unlimited
  maxPlantsInChupchuContext: number;             // plants shown to Claude per request (cached block 2)
  encyclopediaAccess: boolean;
  displayNameHe: string;                         // customer-facing Hebrew tier name
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
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            false,
    displayNameHe:                 'גנן מתחיל',
  },
  grower: {
    // grower is retired dead config — kept for backward compat, uses free-tier values
    maxGardens:                    1,
    maxPlantsPerGarden:            15,
    maxTrackers:                   3,
    maxCheckinsPerTrackerPerMonth: 3,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            50,
    maxChupChuPerDay:              18,
    maxVisionLooksPerMonth:        3,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            true,
    displayNameHe:                 'גנן מתחיל',
  },
  gardener_pro: {
    maxGardens:                    2,
    maxPlantsPerGarden:            30,
    maxTrackers:                   10,
    maxCheckinsPerTrackerPerMonth: 10,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            250,
    maxChupChuPerDay:              18,
    maxVisionLooksPerMonth:        18,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            true,
    displayNameHe:                 'גנן ביתי',
  },
  advanced: {
    maxGardens:                    5,
    maxPlantsPerGarden:            30,
    maxTrackers:                   null,
    maxCheckinsPerTrackerPerMonth: null,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            500,
    maxChupChuPerDay:              36,
    maxVisionLooksPerMonth:        36,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            true,
    displayNameHe:                 'גנן מתקדם',
  },
  professional: {
    maxGardens:                    10,
    maxPlantsPerGarden:            30,
    maxTrackers:                   null,
    maxCheckinsPerTrackerPerMonth: null,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            800,
    maxChupChuPerDay:              54,
    maxVisionLooksPerMonth:        54,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            true,
    displayNameHe:                 'גנן מקצועי',
  },
};

export function getLimits(tier: string): TierLimits {
  if (!TIER_LIMITS[tier]) {
    console.warn(`[getLimits] Unknown tier key: "${tier}" — falling back to free limits`);
    return TIER_LIMITS.free;
  }
  return TIER_LIMITS[tier];
}
