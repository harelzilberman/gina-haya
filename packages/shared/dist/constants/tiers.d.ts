export interface TierLimits {
    maxGardens: number | null;
    maxPlantsPerGarden: number | null;
    maxTrackers: number | null;
    maxCheckinsPerTrackerPerMonth: number | null;
    maxTotalCheckinsEver: number | null;
    maxChupChuPerMonth: number | null;
    maxChupChuPerDay: number | null;
    maxVisionLooksPerMonth: number | null;
    maxVisionLooksPerDay: number | null;
    maxPlantsInChupchuContext: number;
    encyclopediaAccess: boolean;
    displayNameHe: string;
}
export declare const TIER_LIMITS: Record<string, TierLimits>;
export declare function getLimits(tier: string): TierLimits;
export interface TierPricing {
    monthly: number | null;
    annual: number | null;
}
export declare const TIER_PRICING: Record<string, TierPricing>;
export declare const TIER_ORDER: readonly ["free", "gardener_pro", "advanced", "professional"];
//# sourceMappingURL=tiers.d.ts.map