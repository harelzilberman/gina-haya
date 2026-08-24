/**
 * Tests for the garden-ownership validation added to POST /api/harvests.
 *
 * We test the validation gate in isolation: the logic
 *
 *   if (gardenId != null) {
 *     const check = await checkOwnsGarden(gardenId, userId, context, client);
 *     if (!check.ok) return check.reason === 'db_error' ? 500 : 403;
 *   }
 *   // proceed with insert
 *
 * is extracted into a thin helper below so the tests do not depend on the
 * full Express stack, a real DB, or the calendar/insert queries that follow.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/harvests_post.test.ts
 */

import { checkOwnsGarden } from '../utils/ownership';

// ── Harness ───────────────────────────────────────────────────────────────────

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

// ── Mock DB factory (mirrors ownership.test.ts) ───────────────────────────────

type MockResult = { data: any; error: any };

function makeChain(result: MockResult): any {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    is: () => chain,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (v: MockResult) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function makeDbMock(result: MockResult): any {
  return { from: (_table: string) => makeChain(result) };
}

// ── Extracted validation gate (mirrors the route logic verbatim) ──────────────
//
// Returns: null → validation passed, proceed with insert
//          number → HTTP status code to return immediately
//
async function validateGardenId(
  gardenId: string | null | undefined,
  userId: string,
  client: any,
): Promise<number | null> {
  if (gardenId != null) {
    const check = await checkOwnsGarden(gardenId, userId, '[test]', client);
    if (!check.ok) {
      return check.reason === 'db_error' ? 500 : 403;
    }
  }
  return null; // proceed
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n[POST /api/harvests] gardenId ownership validation');

// 1. Valid own garden → proceed with insert (null result)
(async () => {
  const client = makeDbMock({ data: { id: 'garden-1' }, error: null });
  const status = await validateGardenId('garden-1', 'user-1', client);
  assert(status === null, 'own garden → validation passes (null: proceed)');
})();

// 2. Garden owned by another user → 403
(async () => {
  const client = makeDbMock({ data: null, error: null }); // query returns nothing for user-2
  const status = await validateGardenId('garden-1', 'user-2', client);
  assertEqual(status, 403, 'garden owned by another user → 403');
})();

// 3. Null gardenId → skip check entirely, proceed
(async () => {
  // Use an error-throwing mock to confirm the DB is never called
  const client = makeDbMock({ data: null, error: { message: 'should not be called' } });
  const status = await validateGardenId(null, 'user-1', client);
  assert(status === null, 'null gardenId → skip check, proceed (null)');
})();

// 4. Undefined gardenId → skip check entirely, proceed
(async () => {
  const client = makeDbMock({ data: null, error: { message: 'should not be called' } });
  const status = await validateGardenId(undefined, 'user-1', client);
  assert(status === null, 'undefined gardenId → skip check, proceed (null)');
})();

// 5. Nonexistent gardenId (DB returns no row) → 403
(async () => {
  const client = makeDbMock({ data: null, error: null }); // row not found
  const status = await validateGardenId('garden-nonexistent', 'user-1', client);
  assertEqual(status, 403, 'nonexistent gardenId → 403 (not_owned, indistinguishable from wrong owner)');
})();

// 6. DB error during garden check → 500 (fail closed, never falls through to insert)
(async () => {
  const client = makeDbMock({ data: null, error: { message: 'connection refused' } });
  const status = await validateGardenId('garden-1', 'user-1', client);
  assertEqual(status, 500, 'DB error → 500 (fail closed)');
})();

// ── Summary ───────────────────────────────────────────────────────────────────

setTimeout(() => {
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) {
    process.exit(1);
  }
}, 100);
