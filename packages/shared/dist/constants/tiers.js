"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_FEATURES = exports.TIER_PRICES = void 0;
exports.TIER_PRICES = {
    free: null,
    grower: 9,
    gardener_pro: 14,
    professional: 49,
};
exports.TIER_FEATURES = {
    free: { appAccess: false, diagnosesPerMonth: 0, adFree: false, multiGarden: false },
    grower: { appAccess: true, diagnosesPerMonth: 5, adFree: false, multiGarden: false },
    gardener_pro: { appAccess: true, diagnosesPerMonth: Infinity, adFree: true, multiGarden: true },
    professional: { appAccess: true, diagnosesPerMonth: Infinity, adFree: true, multiGarden: true },
};
//# sourceMappingURL=tiers.js.map