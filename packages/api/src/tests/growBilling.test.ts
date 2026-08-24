/**
 * Unit tests for Grow webhook tier resolution logic.
 * Self-contained — no server, DB, or HTTP required.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/growBilling.test.ts
 */

import { TIER_PRICING } from '@gina-haya/shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  assert(actual === expected, `${label} — got "${actual}", expected "${expected}"`);
}

// ── Extracted logic under test ─────────────────────────────────────────────────
//
// These functions mirror the exact logic in billing.ts POST /grow/webhook/:secret.
// If the billing.ts implementation changes, update these to match.

const TIER_ORDER = ['free', 'gardener_pro', 'advanced', 'professional'];
const VALID_PAYMENT_MODES = ['recurring', 'one_time_monthly', 'one_time_annual'] as const;
type PaymentMode = typeof VALID_PAYMENT_MODES[number];

function resolveGrowTier(
  paymentModeFromWebhook: string,
  tierFromPayload: string | undefined,
): string | null {
  const isShopPurchase = !VALID_PAYMENT_MODES.includes(paymentModeFromWebhook as PaymentMode);
  return !isShopPurchase && tierFromPayload && TIER_ORDER.includes(tierFromPayload)
    ? tierFromPayload
    : null;
}

function detectSumMismatch(
  resolvedTier: string,
  paymentModeFromWebhook: string,
  rawSum: unknown,
): boolean {
  if (rawSum === undefined || rawSum === null) return false;
  const chargedAmount = parseFloat(String(rawSum).replace(',', '.'));
  if (isNaN(chargedAmount)) return false;
  const pricing = TIER_PRICING[resolvedTier];
  const expectedAmount: number | null =
    paymentModeFromWebhook === 'one_time_annual'   ? (pricing?.annual  ?? null)
    : paymentModeFromWebhook === 'one_time_monthly' ? (pricing?.monthly ?? null)
    :                                                   (pricing?.monthly ?? null); // recurring
  if (expectedAmount === null) return false;
  return Math.abs(chargedAmount - expectedAmount) > 0.01;
}

// ── Test 1: Valid cField2 values ──────────────────────────────────────────────
console.log('\nTest 1: Valid cField2 resolves to the correct tier');
assertEqual(resolveGrowTier('recurring',        'gardener_pro'), 'gardener_pro', 'recurring + gardener_pro');
assertEqual(resolveGrowTier('recurring',        'advanced'),     'advanced',     'recurring + advanced');
assertEqual(resolveGrowTier('recurring',        'professional'), 'professional', 'recurring + professional');
assertEqual(resolveGrowTier('one_time_monthly', 'gardener_pro'), 'gardener_pro', 'monthly + gardener_pro');
assertEqual(resolveGrowTier('one_time_annual',  'professional'), 'professional', 'annual + professional');

// ── Test 2: Missing cField2 — must not grant any tier ────────────────────────
console.log('\nTest 2: Missing cField2 resolves to null (no tier grant)');
assertEqual(resolveGrowTier('recurring',        undefined),   null, 'recurring + undefined cField2 -> null');
assertEqual(resolveGrowTier('one_time_monthly', undefined),   null, 'monthly + undefined cField2 -> null');
assertEqual(resolveGrowTier('one_time_annual',  undefined),   null, 'annual + undefined cField2 -> null');
assertEqual(resolveGrowTier('recurring',        ''),          null, 'recurring + empty string cField2 -> null');

// ── Test 3: Unrecognised cField2 — must not grant any tier ───────────────────
console.log('\nTest 3: Unrecognised cField2 resolves to null (no fallback to gardener_pro)');
assertEqual(resolveGrowTier('recurring',        'grower'),          null, '"grower" (retired) -> null');
assertEqual(resolveGrowTier('recurring',        'pro'),             null, '"pro" (wrong key) -> null');
assertEqual(resolveGrowTier('recurring',        'GARDENER_PRO'),    null, 'wrong case -> null');
assertEqual(resolveGrowTier('recurring',        'premium'),         null, 'unknown value -> null');
assertEqual(resolveGrowTier('one_time_monthly', 'owner'),           null, '"owner" (not in TIER_ORDER) -> null');

// ── Test 4: Shop purchase (cField3 = 'shop') ─────────────────────────────────
console.log('\nTest 4: Shop / unrecognised payment mode -> null (no tier grant, even with valid cField2)');
assertEqual(resolveGrowTier('shop',    'gardener_pro'), null, 'shop + valid cField2 -> null');
assertEqual(resolveGrowTier('shop',    'professional'), null, 'shop + professional -> null');
assertEqual(resolveGrowTier('shop',    undefined),      null, 'shop + no cField2 -> null');
assertEqual(resolveGrowTier('unknown', 'gardener_pro'), null, 'unknown paymentMode + valid cField2 -> null');

// ── Test 5: Sum cross-check — detects mismatches ──────────────────────────────
console.log('\nTest 5: Sum mismatch detection');
// Exact matches should NOT trigger a mismatch
assert(!detectSumMismatch('gardener_pro', 'recurring',        18),  'gardener_pro monthly ₪18 -> no mismatch');
assert(!detectSumMismatch('advanced',     'recurring',        36),  'advanced monthly ₪36 -> no mismatch');
assert(!detectSumMismatch('professional', 'recurring',        54),  'professional monthly ₪54 -> no mismatch');
assert(!detectSumMismatch('gardener_pro', 'one_time_annual',  180), 'gardener_pro annual ₪180 -> no mismatch');
assert(!detectSumMismatch('advanced',     'one_time_annual',  360), 'advanced annual ₪360 -> no mismatch');
assert(!detectSumMismatch('professional', 'one_time_annual',  540), 'professional annual ₪540 -> no mismatch');

// Mismatches should be detected
assert(detectSumMismatch('gardener_pro', 'recurring',       54), 'gardener_pro charged ₪54 -> mismatch (professional price)');
assert(detectSumMismatch('professional', 'one_time_annual', 18), 'professional annual charged ₪18 -> mismatch');
assert(detectSumMismatch('advanced',     'recurring',       18), 'advanced charged ₪18 -> mismatch (gardener_pro price)');

// Missing sum should not trigger mismatch (field may be absent from webhook body)
assert(!detectSumMismatch('professional', 'recurring', undefined), 'missing sum -> no mismatch check');
assert(!detectSumMismatch('professional', 'recurring', null),      'null sum -> no mismatch check');

// Comma-decimal notation (some locales) should parse correctly
assert(!detectSumMismatch('gardener_pro', 'recurring', '18,00'),  'comma decimal "18,00" -> no mismatch');
assert(!detectSumMismatch('professional', 'recurring', '54,00'),  'comma decimal "54,00" -> no mismatch');
assert(detectSumMismatch('gardener_pro',  'recurring', '54,00'),  'comma decimal "54,00" for gardener_pro -> mismatch');

// ── Test 6: TIER_PRICING sanity — confirms sum mapping is unambiguous ─────────
console.log('\nTest 6: TIER_PRICING values are as expected (unambiguous sum mapping)');
assertEqual(TIER_PRICING['gardener_pro']?.monthly, 18,  'gardener_pro monthly = 18');
assertEqual(TIER_PRICING['advanced']?.monthly,     36,  'advanced monthly = 36');
assertEqual(TIER_PRICING['professional']?.monthly, 54,  'professional monthly = 54');
assertEqual(TIER_PRICING['gardener_pro']?.annual,  180, 'gardener_pro annual = 180');
assertEqual(TIER_PRICING['advanced']?.annual,      360, 'advanced annual = 360');
assertEqual(TIER_PRICING['professional']?.annual,  540, 'professional annual = 540');

// Confirm all monthly prices are distinct
const monthlyPrices = [
  TIER_PRICING['gardener_pro']?.monthly,
  TIER_PRICING['advanced']?.monthly,
  TIER_PRICING['professional']?.monthly,
];
const monthlySet = new Set(monthlyPrices);
assert(monthlySet.size === monthlyPrices.length, 'monthly prices are all distinct (no ambiguity)');

// Confirm all annual prices are distinct
const annualPrices = [
  TIER_PRICING['gardener_pro']?.annual,
  TIER_PRICING['advanced']?.annual,
  TIER_PRICING['professional']?.annual,
];
const annualSet = new Set(annualPrices);
assert(annualSet.size === annualPrices.length, 'annual prices are all distinct (no ambiguity)');

// Confirm no monthly price equals any annual price (no cross-mode ambiguity)
for (const m of monthlyPrices) {
  for (const a of annualPrices) {
    assert(m !== a, `monthly ₪${m} !== annual ₪${a} (no cross-mode collision)`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
