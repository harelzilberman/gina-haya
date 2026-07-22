/**
 * Google Play subscription product IDs -> internal tier keys.
 * These must match the product IDs configured in Google Play Console.
 */
export const PLAY_PRODUCT_TO_TIER: Record<string, string> = {
  gardener_pro_sub: 'gardener_pro',
  advanced_sub:     'advanced',
  professional_sub: 'professional',
};

/** The Flutter app's package name registered in Google Play Console. */
export const PLAY_PACKAGE_NAME = 'com.ginahaya.gina_haya';

/**
 * Customer-facing Hebrew tier display names.
 * Never use "Pro" or English tier keys in customer-facing strings.
 * Source of truth is tiers.ts displayNameHe; this mirrors it for routes
 * that don't want to import the full shared package.
 */
export const TIER_LABEL_HE: Record<string, string> = {
  free:           'גנן מתחיל',
  gardener_pro:   'גנן ביתי',
  advanced:       'גנן מתקדם',
  professional:   'גנן מקצועי',
  owner:          'בעלים',
};

/** Maps Google subscriptionState string -> internal status string. */
export function mapSubscriptionState(state: string | undefined | null): string {
  switch (state) {
    case 'SUBSCRIPTION_STATE_ACTIVE':           return 'active';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':  return 'grace_period';
    case 'SUBSCRIPTION_STATE_ON_HOLD':          return 'paused';
    case 'SUBSCRIPTION_STATE_PAUSED':           return 'paused';
    case 'SUBSCRIPTION_STATE_CANCELED':         return 'cancelled';
    case 'SUBSCRIPTION_STATE_EXPIRED':          return 'expired';
    default:                                    return 'unknown';
  }
}

/** Returns true if this status means the user has active access. */
export function isActiveStatus(status: string): boolean {
  return status === 'active' || status === 'grace_period';
}

/** Returns true if this subscription state means the user has active access. */
export function isActiveState(state: string | undefined | null): boolean {
  return (
    state === 'SUBSCRIPTION_STATE_ACTIVE' ||
    state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
  );
}
