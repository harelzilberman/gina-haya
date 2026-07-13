// Re-exports from @gina-haya/shared so that API-internal code continues to use
// the same import path (`../config/tiers`) without a duplicate definition.
//
// The retired 'grower' tier key is absent from TIER_LIMITS; getLimits('grower')
// falls back to free limits with a console warning — the intended behavior.
export type { TierLimits, TierPricing } from '@gina-haya/shared';
export { TIER_LIMITS, getLimits, TIER_PRICING } from '@gina-haya/shared';
