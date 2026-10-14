/**
 * Unit tests for Lemon Squeezy webhook signature verification
 * and status → tier mapping logic.
 * Self-contained — no server, DB, or HTTP required.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/lemonsqueezy.test.ts
 */

import crypto from 'crypto';
import { lsStatusToTierAction, LS_ACTIVE_STATUSES } from '../routes/billing';

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
  assert(
    actual === expected,
    `${label} — got "${actual}", expected "${expected}"`
  );
}

// ── Webhook signature verification ───────────────────────────────────────────

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = signPayload(rawBody, secret);
  try {
    const headerBuf   = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (headerBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(headerBuf, expectedBuf);
  } catch {
    return false;
  }
}

console.log('\nTest 1: Webhook signature verification');

const SECRET  = 'test-secret-key-1234';
const PAYLOAD = JSON.stringify({ meta: { event_name: 'subscription_created' } });
const VALID_SIG = signPayload(PAYLOAD, SECRET);

assert(verifySignature(PAYLOAD, VALID_SIG, SECRET), 'valid signature is accepted');
assert(!verifySignature(PAYLOAD, 'deadbeef'.repeat(8), SECRET), 'wrong signature is rejected');
assert(!verifySignature(PAYLOAD, '', SECRET), 'empty signature is rejected (length mismatch)');
assert(!verifySignature(PAYLOAD + 'x', VALID_SIG, SECRET), 'tampered payload is rejected');
assert(!verifySignature(PAYLOAD, VALID_SIG, SECRET + 'x'), 'wrong secret is rejected');

// Different payload with same length should still not collide
const PAYLOAD2 = JSON.stringify({ meta: { event_name: 'subscription_cancelled' } });
const SIG2     = signPayload(PAYLOAD2, SECRET);
assert(!verifySignature(PAYLOAD, SIG2, SECRET), 'different payload rejects other payload signature');

// ── LS_ACTIVE_STATUSES ────────────────────────────────────────────────────────

console.log('\nTest 2: LS_ACTIVE_STATUSES set contents');

assert(LS_ACTIVE_STATUSES.has('active'),   '"active" is in active set');
assert(LS_ACTIVE_STATUSES.has('on_trial'), '"on_trial" is in active set');
assert(LS_ACTIVE_STATUSES.has('past_due'), '"past_due" is in active set');
assert(!LS_ACTIVE_STATUSES.has('cancelled'), '"cancelled" is NOT in active set');
assert(!LS_ACTIVE_STATUSES.has('expired'),   '"expired" is NOT in active set');
assert(!LS_ACTIVE_STATUSES.has('unpaid'),    '"unpaid" is NOT in active set');

// ── lsStatusToTierAction ─────────────────────────────────────────────────────

console.log('\nTest 3: lsStatusToTierAction — active statuses grant the tier');

const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const pastDate   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

for (const status of ['active', 'on_trial', 'past_due']) {
  assertEqual(
    lsStatusToTierAction(status, futureDate, 'gardener_pro').newTier,
    'gardener_pro',
    `${status} → gardener_pro`
  );
  assertEqual(
    lsStatusToTierAction(status, null, 'professional').newTier,
    'professional',
    `${status} (no endsAt) → professional`
  );
}

console.log('\nTest 4: lsStatusToTierAction — cancelled');

// Cancelled with future endsAt → keep access
assertEqual(
  lsStatusToTierAction('cancelled', futureDate, 'advanced').newTier,
  'advanced',
  'cancelled + future endsAt → keep tier'
);

// Cancelled with past endsAt → downgrade
assertEqual(
  lsStatusToTierAction('cancelled', pastDate, 'advanced').newTier,
  'free',
  'cancelled + past endsAt → free'
);

// Cancelled with null endsAt → downgrade (period ended or no record)
assertEqual(
  lsStatusToTierAction('cancelled', null, 'advanced').newTier,
  'free',
  'cancelled + null endsAt → free'
);

console.log('\nTest 5: lsStatusToTierAction — expired and unpaid');

assertEqual(
  lsStatusToTierAction('expired', futureDate, 'professional').newTier,
  'free',
  'expired → free (regardless of endsAt)'
);
assertEqual(
  lsStatusToTierAction('unpaid', futureDate, 'professional').newTier,
  'free',
  'unpaid → free'
);

console.log('\nTest 6: lsStatusToTierAction — unknown status');

assertEqual(
  lsStatusToTierAction('unknown_state', futureDate, 'gardener_pro').newTier,
  null,
  'unknown status → null (leave tier unchanged)'
);
assertEqual(
  lsStatusToTierAction('paused', futureDate, 'gardener_pro').newTier,
  null,
  'paused → null (leave tier unchanged)'
);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
