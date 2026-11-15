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
/** Internal owner tier (unlimited, never sold). Not in TIER_ORDER. */
export declare const OWNER_TIER = "owner";
/**
 * True for every known tier except free (owner counts as paid). Missing or
 * unknown tiers count as free, matching getLimits()' free fallback.
 */
export declare function isPaidTier(tier: string | null | undefined): boolean;
/**
 * True when a higher tier exists in TIER_ORDER. Owner never upgrades.
 * Unknown tiers rank as free, matching getLimits()' free fallback.
 */
export declare function canUpgrade(tier: string | null | undefined): boolean;
//# sourceMappingURL=tiers.d.ts.map