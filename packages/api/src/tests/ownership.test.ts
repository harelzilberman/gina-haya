/**
 * Unit tests for the new ownership helpers in utils/ownership.ts.
 * Self-contained — no DB or server required. Uses in-process mock clients.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/ownership.test.ts
 */

import {
  checkOwnsGarden,
  checkOwnsGardenPlant,
  checkOwnsGardenPlantWithExistence,
  checkOwnsResourceByUserId,
  checkOwnsGardenAndPlants,
} from '../utils/ownership';

// ── Test harness ──────────────────────────────────────────────────────────────

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

// ── Mock DB factory ───────────────────────────────────────────────────────────
//
// Builds a minimal Supabase-shaped client that returns a fixed result for every
// query regardless of filters. For multi-table helpers (checkOwnsGardenPlant,
// etc.) use makeTableDbMock to return different results per table.

type MockResult = { data: any; error: any };

function makeChain(result: MockResult): any {
  // The chain is both chainable and thenable so it works whether the caller
  // uses `.maybeSingle()` (point queries) or directly awaits the chain
  // (list queries like `.in('id', ids).eq(...).is(...)`).
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    is: () => chain,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    // Make the chain itself awaitable (covers list queries with no terminal call)
    then: (resolve: (v: MockResult) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function makeDbMock(result: MockResult): any {
  return { from: (_table: string) => makeChain(result) };
}

/**
 * Returns a different mock result per table name. Useful for helpers that
 * query multiple tables (garden_plants then gardens, etc.).
 */
function makeTableDbMock(results: Record<string, MockResult>): any {
  return {
    from: (table: string) => makeChain(results[table] ?? { data: null, error: null }),
  };
}

// ── Tests: checkOwnsGarden ────────────────────────────────────────────────────

console.log('\n[1] checkOwnsGarden');

{
  // Owner allowed
  (async () => {
    const client = makeDbMock({ data: { id: 'garden-1' }, error: null });
    const result = await checkOwnsGarden('garden-1', 'user-1', undefined, client);
    assert(result.ok === true, 'owner allowed → ok: true');
    assertEqual(result.data?.id, 'garden-1', 'owner allowed → data.id set');
  })();

  // Non-owner denied
  (async () => {
    const client = makeDbMock({ data: null, error: null });
    const result = await checkOwnsGarden('garden-1', 'user-2', undefined, client);
    assert(result.ok === false, 'non-owner denied → ok: false');
    assertEqual(result.reason, 'not_owned', 'non-owner denied → reason: not_owned');
  })();

  // Nonexistent garden
  (async () => {
    const client = makeDbMock({ data: null, error: null });
    const result = await checkOwnsGarden('garden-nonexistent', 'user-1', undefined, client);
    assert(result.ok === false, 'nonexistent → ok: false');
    assertEqual(result.reason, 'not_owned', 'nonexistent → reason: not_owned (indistinguishable by design)');
  })();

  // DB error → denied with db_error reason
  (async () => {
    const client = makeDbMock({ data: null, error: { message: 'connection refused' } });
    const result = await checkOwnsGarden('garden-1', 'user-1', '[test]', client);
    assert(result.ok === false, 'db error → ok: false');
    assertEqual(result.reason, 'db_error', 'db error → reason: db_error');
  })();
}

// ── Tests: checkOwnsGardenPlant ───────────────────────────────────────────────

console.log('\n[2] checkOwnsGardenPlant');

{
  // Owner allowed (plant in owned garden)
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: { garden_id: 'garden-1' }, error: null },
      gardens:       { data: { id: 'garden-1' },        error: null },
    });
    const result = await checkOwnsGardenPlant('plant-1', 'user-1', undefined, client);
    assert(result.ok === true, 'owner allowed → ok: true');
  })();

  // Non-owner denied (garden owned by different user)
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: { garden_id: 'garden-1' }, error: null },
      gardens:       { data: null,                       error: null },
    });
    const result = await checkOwnsGardenPlant('plant-1', 'user-2', undefined, client);
    assert(result.ok === false, 'non-owner denied → ok: false');
    assertEqual(result.reason, 'not_owned', 'non-owner denied → reason: not_owned');
  })();

  // Nonexistent plant → not_owned (same as non-owner, by design)
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: null, error: null },
      gardens:       { data: null, error: null },
    });
    const result = await checkOwnsGardenPlant('plant-nonexistent', 'user-1', undefined, client);
    assert(result.ok === false, 'nonexistent plant → ok: false');
    assertEqual(result.reason, 'not_owned', 'nonexistent plant → reason: not_owned');
  })();

  // DB error on garden_plants fetch → db_error
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: null, error: { message: 'timeout' } },
      gardens:       { data: null, error: null },
    });
    const result = await checkOwnsGardenPlant('plant-1', 'user-1', '[test]', client);
    assert(result.ok === false, 'db error on plant fetch → ok: false');
    assertEqual(result.reason, 'db_error', 'db error on plant fetch → reason: db_error');
  })();

  // DB error on gardens fetch → db_error
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: { garden_id: 'garden-1' }, error: null },
      gardens:       { data: null, error: { message: 'timeout' } },
    });
    const result = await checkOwnsGardenPlant('plant-1', 'user-1', '[test]', client);
    assert(result.ok === false, 'db error on garden fetch → ok: false');
    assertEqual(result.reason, 'db_error', 'db error on garden fetch → reason: db_error');
  })();
}

// ── Tests: checkOwnsGardenPlantWithExistence ──────────────────────────────────

console.log('\n[3] checkOwnsGardenPlantWithExistence');

{
  // Owner allowed
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: { id: 'plant-1', garden_id: 'garden-1' }, error: null },
      gardens:       { data: { id: 'garden-1' },                        error: null },
    });
    const result = await checkOwnsGardenPlantWithExistence('plant-1', 'user-1', undefined, client);
    assert(result.ok === true, 'owner allowed → ok: true');
    assert(result.exists === true, 'owner allowed → exists: true');
    assertEqual(result.data?.id, 'plant-1', 'owner allowed → data.id: plant-1');
  })();

  // Nonexistent plant → not_found + exists: false
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: null, error: null },
      gardens:       { data: null, error: null },
    });
    const result = await checkOwnsGardenPlantWithExistence('plant-gone', 'user-1', undefined, client);
    assert(result.ok === false, 'nonexistent → ok: false');
    assertEqual(result.reason, 'not_found', 'nonexistent → reason: not_found');
    assert(result.exists === false, 'nonexistent → exists: false');
  })();

  // Plant exists but owned by different user → not_owned + exists: true
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: { id: 'plant-1', garden_id: 'garden-1' }, error: null },
      gardens:       { data: null,                                       error: null },
    });
    const result = await checkOwnsGardenPlantWithExistence('plant-1', 'user-2', undefined, client);
    assert(result.ok === false, 'not owned → ok: false');
    assertEqual(result.reason, 'not_owned', 'not owned → reason: not_owned');
    assert(result.exists === true, 'not owned → exists: true');
  })();

  // DB error on existence check
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: null, error: { message: 'connection refused' } },
      gardens:       { data: null, error: null },
    });
    const result = await checkOwnsGardenPlantWithExistence('plant-1', 'user-1', '[test]', client);
    assert(result.ok === false, 'db error → ok: false');
    assertEqual(result.reason, 'db_error', 'db error → reason: db_error');
    assert(result.exists === false, 'db error → exists: false (unknown before error)');
  })();

  // DB error on garden ownership check (plant exists)
  (async () => {
    const client = makeTableDbMock({
      garden_plants: { data: { id: 'plant-1', garden_id: 'garden-1' }, error: null },
      gardens:       { data: null, error: { message: 'timeout' } },
    });
    const result = await checkOwnsGardenPlantWithExistence('plant-1', 'user-1', '[test]', client);
    assert(result.ok === false, 'db error on garden → ok: false');
    assertEqual(result.reason, 'db_error', 'db error on garden → reason: db_error');
    assert(result.exists === true, 'db error on garden → exists: true (plant was found)');
  })();
}

// ── Tests: checkOwnsResourceByUserId ─────────────────────────────────────────

console.log('\n[4] checkOwnsResourceByUserId (synchronous)');

{
  // Owner allowed
  {
    const row = { id: 'harvest-1', user_id: 'user-1', amount: 100 };
    const result = checkOwnsResourceByUserId(row, 'user-1', '[test]');
    assert(result.ok === true, 'owner allowed → ok: true');
    assertEqual(result.data?.id, 'harvest-1', 'owner allowed → data.id set');
  }

  // Non-owner denied
  {
    const row = { id: 'harvest-1', user_id: 'user-1', amount: 100 };
    const result = checkOwnsResourceByUserId(row, 'user-2', '[test]');
    assert(result.ok === false, 'non-owner denied → ok: false');
    assertEqual(result.reason, 'not_owned', 'non-owner denied → reason: not_owned');
  }

  // Row without id field — ok but no data
  {
    const row = { user_id: 'user-1' };
    const result = checkOwnsResourceByUserId(row, 'user-1');
    assert(result.ok === true, 'row without id → ok: true');
    assert(result.data === undefined, 'row without id → data: undefined');
  }

  // No DB call possible to test — this is purely synchronous
  // (there is no db_error case: the helper never queries the DB)
}

// ── Tests: checkOwnsGardenAndPlants ──────────────────────────────────────────

console.log('\n[5] checkOwnsGardenAndPlants');

{
  // All plants owned — full success
  (async () => {
    const client = makeTableDbMock({
      gardens:       { data: { id: 'garden-1' },                                              error: null },
      garden_plants: { data: [{ id: 'plant-1' }, { id: 'plant-2' }],                         error: null },
    });
    const result = await checkOwnsGardenAndPlants(
      'garden-1', ['plant-1', 'plant-2'], 'user-1', undefined, client,
    );
    assert(result.ok === true, 'all owned → ok: true');
    assert(result.gardenOwned === true, 'all owned → gardenOwned: true');
    assert(result.owned_ids.length === 2, 'all owned → 2 owned_ids');
    assert(result.skipped_ids.length === 0, 'all owned → 0 skipped_ids');
  })();

  // Partial success — one plant in garden, one not
  (async () => {
    const client = makeTableDbMock({
      gardens:       { data: { id: 'garden-1' }, error: null },
      garden_plants: { data: [{ id: 'plant-1' }], error: null }, // only plant-1 eligible
    });
    const result = await checkOwnsGardenAndPlants(
      'garden-1', ['plant-1', 'plant-2'], 'user-1', undefined, client,
    );
    assert(result.ok === true, 'partial → ok: true (at least one passed)');
    assert(result.gardenOwned === true, 'partial → gardenOwned: true');
    assert(result.owned_ids.includes('plant-1'), 'partial → plant-1 in owned_ids');
    assert(result.skipped_ids.includes('plant-2'), 'partial → plant-2 in skipped_ids');
  })();

  // Garden not owned → all skipped, gardenOwned: false
  (async () => {
    const client = makeTableDbMock({
      gardens:       { data: null, error: null },
      garden_plants: { data: [],   error: null },
    });
    const result = await checkOwnsGardenAndPlants(
      'garden-1', ['plant-1', 'plant-2'], 'user-2', undefined, client,
    );
    assert(result.ok === false, 'garden not owned → ok: false');
    assert(result.gardenOwned === false, 'garden not owned → gardenOwned: false');
    assert(result.skipped_ids.length === 2, 'garden not owned → all 2 in skipped_ids');
  })();

  // DB error on plant fetch → db_error + gardenOwned: true
  (async () => {
    const client = makeTableDbMock({
      gardens:       { data: { id: 'garden-1' },            error: null },
      garden_plants: { data: null, error: { message: 'timeout' } },
    });
    const result = await checkOwnsGardenAndPlants(
      'garden-1', ['plant-1'], 'user-1', '[test]', client,
    );
    assert(result.ok === false, 'plant db error → ok: false');
    assert(result.gardenOwned === true, 'plant db error → gardenOwned: true');
    assertEqual(result.reason, 'db_error', 'plant db error → reason: db_error');
    assert(result.skipped_ids.includes('plant-1'), 'plant db error → plant-1 in skipped_ids');
  })();

  // Empty plantIds → ok: false, gardenOwned: true, no DB plant query
  (async () => {
    const client = makeTableDbMock({
      gardens: { data: { id: 'garden-1' }, error: null },
      // garden_plants not called — short-circuit
    });
    const result = await checkOwnsGardenAndPlants('garden-1', [], 'user-1', undefined, client);
    assert(result.ok === false, 'empty plantIds → ok: false');
    assert(result.gardenOwned === true, 'empty plantIds → gardenOwned: true');
    assert(result.owned_ids.length === 0, 'empty plantIds → owned_ids empty');
    assert(result.skipped_ids.length === 0, 'empty plantIds → skipped_ids empty');
  })();
}

// ── Summary ───────────────────────────────────────────────────────────────────

// Allow all async tests to settle before printing summary
setTimeout(() => {
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) {
    process.exit(1);
  }
}, 100);
