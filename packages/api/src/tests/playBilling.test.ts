/**
 * Unit tests for Google Play Billing logic.
 * Self-contained — no server or DB required.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/playBilling.test.ts
 */

import {
  PLAY_PRODUCT_TO_TIER,
  TIER_LABEL_HE,
  mapSubscriptionState,
  isActiveState,
} from '../config/playProducts';

// ── helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  assert(actual === expected, `${label} — got "${actual}", expected "${expected}"`);
}

// ── Test 1: Correct tier mapping for all 3 products ──────────────────────────
console.log('\nTest 1: Product ID -> tier mapping');
assertEqual(PLAY_PRODUCT_TO_TIER['gardener_pro_sub'], 'gardener_pro',  'gardener_pro_sub -> gardener_pro');
assertEqual(PLAY_PRODUCT_TO_TIER['advanced_sub'],     'advanced',      'advanced_sub -> advanced');
assertEqual(PLAY_PRODUCT_TO_TIER['professional_sub'], 'professional',  'professional_sub -> professional');

// ── Test 2: Hebrew label lookup ───────────────────────────────────────────────
console.log('\nTest 2: Hebrew tier labels');
assertEqual(TIER_LABEL_HE['gardener_pro'],  'גנן ביתי',    'gardener_pro label');
assertEqual(TIER_LABEL_HE['advanced'],      'גנן מתקדם',   'advanced label');
assertEqual(TIER_LABEL_HE['professional'],  'גנן מקצועי',  'professional label');
assertEqual(TIER_LABEL_HE['free'],          'גנן מתחיל',   'free label');

// ── Test 3: Unknown productId -> no tier (400 scenario) ──────────────────────
console.log('\nTest 3: Unknown productId returns undefined (400)');
assert(PLAY_PRODUCT_TO_TIER['unknown_product'] === undefined, 'unknown product has no mapping');

// ── Test 4: Subscription state mapping ───────────────────────────────────────
console.log('\nTest 4: subscriptionState -> status mapping');
assertEqual(mapSubscriptionState('SUBSCRIPTION_STATE_ACTIVE'),          'active',      'ACTIVE');
assertEqual(mapSubscriptionState('SUBSCRIPTION_STATE_IN_GRACE_PERIOD'), 'grace_period','IN_GRACE_PERIOD');
assertEqual(mapSubscriptionState('SUBSCRIPTION_STATE_CANCELED'),        'cancelled',   'CANCELED');
assertEqual(mapSubscriptionState('SUBSCRIPTION_STATE_EXPIRED'),         'expired',     'EXPIRED');
assertEqual(mapSubscriptionState('SUBSCRIPTION_STATE_PAUSED'),          'paused',      'PAUSED');
assertEqual(mapSubscriptionState('SUBSCRIPTION_STATE_ON_HOLD'),         'paused',      'ON_HOLD');
assertEqual(mapSubscriptionState(null),                                  'unknown',     'null state');
assertEqual(mapSubscriptionState(undefined),                             'unknown',     'undefined state');

// ── Test 5: isActiveState (determines tier grant vs downgrade) ────────────────
console.log('\nTest 5: isActiveState');
assert(isActiveState('SUBSCRIPTION_STATE_ACTIVE'),          'ACTIVE is active');
assert(isActiveState('SUBSCRIPTION_STATE_IN_GRACE_PERIOD'), 'IN_GRACE_PERIOD is active');
assert(!isActiveState('SUBSCRIPTION_STATE_CANCELED'),       'CANCELED is not active');
assert(!isActiveState('SUBSCRIPTION_STATE_EXPIRED'),        'EXPIRED is not active -> tier=free');
assert(!isActiveState('SUBSCRIPTION_STATE_PAUSED'),         'PAUSED is not active -> tier=free');
assert(!isActiveState(null),                                'null is not active');

// ── Test 6: Cross-user token check logic (409 scenario) ──────────────────────
console.log('\nTest 6: Cross-user token check (409 scenario)');
function simulateCrossUserCheck(existingUserId: string | null, requestUserId: string): 409 | 'ok' {
  if (existingUserId && existingUserId !== requestUserId) return 409;
  return 'ok';
}
assertEqual(simulateCrossUserCheck('user-A', 'user-B'), 409,  'different user -> 409');
assertEqual(simulateCrossUserCheck('user-A', 'user-A'), 'ok', 'same user -> ok (idempotent)');
assertEqual(simulateCrossUserCheck(null,     'user-B'), 'ok', 'no existing record -> ok');

// ── Test 7: Expired subscription -> tier 'free' ───────────────────────────────
console.log('\nTest 7: Expired state -> free tier');
function simulateTierFromState(
  state: string,
  status: string,
  productTier: string
): string {
  const active = isActiveState(state);
  if (active && productTier) return productTier;
  if (status === 'cancelled') return 'current_tier'; // keeps access until expiry
  return 'free';
}
assertEqual(simulateTierFromState('SUBSCRIPTION_STATE_EXPIRED',   'expired',   'professional'), 'free', 'expired -> free');
assertEqual(simulateTierFromState('SUBSCRIPTION_STATE_PAUSED',    'paused',    'gardener_pro'), 'free', 'paused -> free');
assertEqual(simulateTierFromState('SUBSCRIPTION_STATE_ACTIVE',    'active',    'advanced'),     'advanced', 'active -> advanced');
assertEqual(simulateTierFromState('SUBSCRIPTION_STATE_CANCELED',  'cancelled', 'professional'), 'current_tier', 'cancelled -> keep access');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
