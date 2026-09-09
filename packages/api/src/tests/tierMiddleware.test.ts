/**
 * Unit tests for stale-active subscription detection logic in tierMiddleware.ts.
 * Self-contained — no server, DB, or email sending required.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/tierMiddleware.test.ts
 */

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
  assert(actual === expected, `${label} — got "${JSON.stringify(actual)}", expected "${JSON.stringify(expected)}"`);
}

// ── Extracted logic under test ─────────────────────────────────────────────────
//
// These functions mirror the exact logic in tierMiddleware.ts attachTier().
// If the production implementation changes, update these to match.

const MS_24H = 24 * 60 * 60 * 1000;

type PlaySubClassification = 'stale_active' | 'downgrade' | 'ok';

/**
 * Classifies a Play subscription row for the safety-net and stale-active paths.
 * Mirrors tierMiddleware.ts lines 107–148.
 */
function classifyPlaySub(
  expiresAt: string | null,
  status: string | null,
  now: Date = new Date(),
): PlaySubClassification {
  if (!expiresAt) return 'ok';

  const expiredMoreThan24hAgo = now.getTime() - new Date(expiresAt).getTime() > MS_24H;
  const notActive = status !== 'active' && status !== 'grace_period';

  if (expiredMoreThan24hAgo && notActive)  return 'downgrade';
  if (expiredMoreThan24hAgo && !notActive) return 'stale_active';
  return 'ok';
}

/**
 * Rate-limiter for stale-active alerts.
 * Mirrors alertStaleActive() rate-limit logic in tierMiddleware.ts lines 36–38.
 * Returns true if the alert should be sent and records the timestamp.
 */
function shouldSendAlert(
  sentMap: Map<string, number>,
  userId: string,
  now: number = Date.now(),
): boolean {
  const lastSent = sentMap.get(userId) ?? 0;
  if (now - lastSent < MS_24H) return false;
  sentMap.set(userId, now);
  return true;
}

/**
 * Wraps an alert function so that a thrown error is caught and logged — not re-thrown.
 * Mirrors the try/catch in alertStaleActive() (tierMiddleware.ts lines 39–52).
 * Returns true if alert completed without throw, false if it threw.
 */
async function alertWithFallback(
  alertFn: () => Promise<void>,
  warnLog: string[],
): Promise<boolean> {
  try {
    await alertFn();
    return true;
  } catch (alertErr: any) {
    warnLog.push(`stale-active alert failed (non-fatal): ${alertErr?.message ?? String(alertErr)}`);
    return false;
  }
}

// ── Test 1: Stale + active → stale_active (tier unchanged) ───────────────────
console.log('\nTest 1: Stale-active Play sub (expires_at > 24 h ago, status=active)');
{
  const now = new Date('2026-09-09T12:00:00Z');
  const expiresAt = '2026-09-07T12:00:00Z';   // 48 h ago
  const status = 'active';

  const result = classifyPlaySub(expiresAt, status, now);
  assertEqual(result, 'stale_active', 'classification');

  // Tier must be unchanged — stale_active does NOT trigger a downgrade
  const tierAfter = result === 'downgrade' ? 'free' : 'professional';
  assertEqual(tierAfter, 'professional', 'tier is unchanged');
}

// ── Test 2: Stale + expired → downgrade (regression guard) ──────────────────
console.log('\nTest 2: Stale expired Play sub (expires_at > 24 h ago, status=expired)');
{
  const now = new Date('2026-09-09T12:00:00Z');
  const expiresAt = '2026-09-07T12:00:00Z';   // 48 h ago
  const status = 'expired';

  const result = classifyPlaySub(expiresAt, status, now);
  assertEqual(result, 'downgrade', 'classification');

  // Regression guard: downgrade path still fires — this commit did not change it
  const tierAfter = result === 'downgrade' ? 'free' : 'professional';
  assertEqual(tierAfter, 'free', 'tier is downgraded to free');
}

// ── Test 3: Not stale + active → ok (no action) ───────────────────────────────
console.log('\nTest 3: Recently renewed sub (expires_at < 24 h ago, status=active)');
{
  const now = new Date('2026-09-09T12:00:00Z');
  const expiresAt = '2026-09-09T06:00:00Z';   // 6 h ago — within grace window
  const status = 'active';

  const result = classifyPlaySub(expiresAt, status, now);
  assertEqual(result, 'ok', 'classification');

  const tierAfter = result === 'downgrade' ? 'free' : 'professional';
  assertEqual(tierAfter, 'professional', 'tier is unchanged');
}

// ── Test 4: Stale + grace_period → stale_active (same as case 1) ─────────────
console.log('\nTest 4: Stale grace_period sub (expires_at > 24 h ago, status=grace_period)');
{
  const now = new Date('2026-09-09T12:00:00Z');
  const expiresAt = '2026-09-07T00:00:00Z';   // 60 h ago
  const status = 'grace_period';

  const result = classifyPlaySub(expiresAt, status, now);
  assertEqual(result, 'stale_active', 'classification — grace_period treated same as active');

  const tierAfter = result === 'downgrade' ? 'free' : 'professional';
  assertEqual(tierAfter, 'professional', 'tier is unchanged');
}

// ── Test 5: Rate limit — two calls for same user within window → one alert ────
console.log('\nTest 5: Rate limiter allows first alert, suppresses second within 24 h');
{
  const sentMap = new Map<string, number>();
  const userId = 'user-abc-123';
  const baseTime = Date.now();

  // First call — should send
  const first = shouldSendAlert(sentMap, userId, baseTime);
  assert(first, 'first call within empty window sends alert');

  // Second call 1 h later — should be suppressed
  const second = shouldSendAlert(sentMap, userId, baseTime + 60 * 60 * 1000);
  assert(!second, 'second call within 24 h window is suppressed');

  // Third call 25 h later — window expired, should send again
  const third = shouldSendAlert(sentMap, userId, baseTime + 25 * 60 * 60 * 1000);
  assert(third, 'third call after 24 h window sends alert again');

  // Different user — unaffected by first user's window
  const otherUser = shouldSendAlert(sentMap, 'user-different', baseTime + 60 * 60 * 1000);
  assert(otherUser, 'different user has independent window');
}

// ── Test 6: Alert throws → request still succeeds, tier still attached ─────────
// (async — wrapped in IIFE because tsx targets CJS which disallows top-level await)
(async () => {
  console.log('\nTest 6: Alert function throws — error is caught, does not propagate');
  {
    const warnLog: string[] = [];
    let tierAssigned: string | null = null;

    // Simulate the alertStaleActive wrapper: even if the inner function throws,
    // the surrounding code (which sets req.tier) must still complete.
    async function runWithThrowingAlert(): Promise<void> {
      const alertFn = async () => { throw new Error('Resend connection refused'); };
      await alertWithFallback(alertFn, warnLog);
      // Code that sets tier — must always run even after alert failure
      tierAssigned = 'professional';
    }

    await runWithThrowingAlert();

    assert(warnLog.length === 1, 'warn log captured the error message');
    assert(warnLog[0].includes('Resend connection refused'), 'error message surfaced in warn log');
    assertEqual(tierAssigned, 'professional', 'tier was still assigned after alert failure');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
