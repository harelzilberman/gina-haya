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

// ── Test 6: Cross-user token check — three-way branch ────────────────────────
//
// Mirrors the three-way branch in POST /api/billing/play/verify (billing.ts).
//
// The argument is the full row object (or null if no row exists) — NOT just the
// user_id field.  The previous test passed null for both "no row" and "orphaned
// row (user_id=null)", which made them indistinguishable and missed Case C.
//
// Cases:
//   A — row exists, same user_id  → ok (idempotent upsert)
//   B — row exists, different live user_id  → 409
//   C — row exists, user_id IS NULL (orphaned / deleted account)  → ok (adopt)
//   D — no row at all  → ok (fresh insert)
console.log('\nTest 6: Cross-user token check — three-way branch');
function simulateCrossUserCheck(
  existingRow: { id: string; user_id: string | null } | null,
  requestUserId: string
): { status: 409 | 'ok'; adopted: boolean } {
  if (!existingRow) {
    // Case D: no row — proceed to upsert as a fresh insert
    return { status: 'ok', adopted: false };
  }
  if (existingRow.user_id === null) {
    // Case C: orphaned row (previous owner deleted their account).
    // Adopt the row — upsert re-associates it with the new user.
    return { status: 'ok', adopted: true };
  }
  if (existingRow.user_id !== requestUserId) {
    // Case B: token belongs to a different live user. Real conflict.
    return { status: 409, adopted: false };
  }
  // Case A: same user re-registering — idempotent upsert.
  return { status: 'ok', adopted: false };
}

// Case A — same user re-registering → ok, not adopted
const caseA = simulateCrossUserCheck({ id: 'row-1', user_id: 'user-A' }, 'user-A');
assert(caseA.status === 'ok'   && !caseA.adopted, 'Case A: same user -> ok, not adopted');

// Case B — different live user → 409
const caseB = simulateCrossUserCheck({ id: 'row-1', user_id: 'user-A' }, 'user-B');
assert(caseB.status === 409    && !caseB.adopted, 'Case B: different live user -> 409');

// Case C — orphaned row (user_id = null) → ok, adopted
const caseC = simulateCrossUserCheck({ id: 'row-1', user_id: null }, 'user-B');
assert(caseC.status === 'ok'   &&  caseC.adopted, 'Case C: orphaned row -> ok, adopted');

// Case D — no row at all → ok, not adopted (distinct from Case C)
const caseD = simulateCrossUserCheck(null, 'user-B');
assert(caseD.status === 'ok'   && !caseD.adopted, 'Case D: no existing row -> ok, not adopted');

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
