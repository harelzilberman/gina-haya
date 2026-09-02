export interface TierLimits {
  maxGardens: number | null;
  maxPlantsPerGarden: number | null;
  maxTrackers: number | null;
  maxCheckinsPerTrackerPerMonth: number | null;
  maxTotalCheckinsEver: number | null;
  maxChupChuPerMonth: number | null;
  maxChupChuPerDay: number | null;              // null = unlimited; fair-use ceiling for paid tiers
  maxVisionLooksPerMonth: number | null;         // null = unlimited
  maxVisionLooksPerDay: number | null;           // null = unlimited; anti-abuse ceiling per calendar day (Israel time)
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
    maxVisionLooksPerDay:          2,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            false,
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
    maxVisionLooksPerDay:          5,
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
    maxVisionLooksPerDay:          8,
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
    maxVisionLooksPerDay:          12,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            true,
    displayNameHe:                 'גנן מקצועי',
  },
  // Internal owner tier — unlimited everything, never advertised or sold.
  // Set via direct DB update only; excluded from TIER_PRICING and TIER_ORDER
  // so it never appears in upgrade flows or billing endpoints.
  owner: {
    maxGardens:                    null,
    maxPlantsPerGarden:            null,
    maxTrackers:                   null,
    maxCheckinsPerTrackerPerMonth: null,
    maxTotalCheckinsEver:          null,
    maxChupChuPerMonth:            null,
    maxChupChuPerDay:              null,
    maxVisionLooksPerMonth:        null,
    maxVisionLooksPerDay:          null,
    maxPlantsInChupchuContext:     30,
    encyclopediaAccess:            true,
    displayNameHe:                 'בעלים',
  },
};

export function getLimits(tier: string): TierLimits {
  if (!TIER_LIMITS[tier]) {
    console.error(`[getLimits] Unknown tier key: "${tier}" — falling back to free limits`);
    return TIER_LIMITS.free;
  }
  return TIER_LIMITS[tier];
}

export interface TierPricing {
  monthly: number | null;  // ILS per month; null for the free tier
  annual: number | null;   // ILS per year total; null for the free tier
}

// Canonical ILS prices — single source of truth for website display and billing logic.
// Annual = 10× monthly (2 months free, ~17% discount).
export const TIER_PRICING: Record<string, TierPricing> = {
  free:           { monthly: null, annual: null },
  gardener_pro:   { monthly: 18,   annual: 180  },
  advanced:       { monthly: 36,   annual: 360  },
  professional:   { monthly: 54,   annual: 540  },
};

// Canonical tier ordering from lowest to highest — used for rank comparisons and upgrade paths.
// All code that needs to order tiers should import this rather than defining its own array.
export const TIER_ORDER = ['free', 'gardener_pro', 'advanced', 'professional'] as const;
