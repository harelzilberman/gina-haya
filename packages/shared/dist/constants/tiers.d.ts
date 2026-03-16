import type { SubscriptionTier } from '../types/user';
export declare const TIER_PRICES: Record<SubscriptionTier, number | null>;
export declare const TIER_FEATURES: {
    free: {
        appAccess: boolean;
        diagnosesPerMonth: number;
        adFree: boolean;
        multiGarden: boolean;
    };
    grower: {
        appAccess: boolean;
        diagnosesPerMonth: number;
        adFree: boolean;
        multiGarden: boolean;
    };
    gardener_pro: {
        appAccess: boolean;
        diagnosesPerMonth: number;
        adFree: boolean;
        multiGarden: boolean;
    };
    professional: {
        appAccess: boolean;
        diagnosesPerMonth: number;
        adFree: boolean;
        multiGarden: boolean;
    };
};
//# sourceMappingURL=tiers.d.ts.map