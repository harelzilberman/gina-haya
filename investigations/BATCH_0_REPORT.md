# BATCH 0 REPORT — Ownership Helpers

**Date:** 2026-08-24
**Status:** Complete. TypeScript compiles clean. 57/57 unit tests pass.

---

## Files touched

| File | Change |
|---|---|
| `packages/api/src/utils/ownership.ts` | Added types and 5 new helpers (no call-site changes) |
| `packages/api/src/tests/ownership.test.ts` | New file — 57 unit tests |

**No route files were modified. No call sites were changed. No schema or migration files were touched.**

---

## Coverage matrix — which helper serves which category

| Category | Pattern | Helper | Confirmed |
|---|---|---|---|
| A (direct `user_id` — row already fetched) | Route has the row; validate ownership for free | `checkOwnsResourceByUserId` | ✓ |
| A (direct `user_id` — row not yet fetched) | Inline `.eq('user_id', userId)` or `checkOwnsGarden` when resource IS a garden | `checkOwnsGarden` or keep inline | ✓ (Category E reads stay inline per plan) |
| B (one-hop `garden_id → gardens`) | Two-step join replacement | `checkOwnsGardenPlant` | ✓ |
| C (request-body ID validation) | Body-supplied plant ID: same two-hop path | `checkOwnsGardenPlant` | ✓ |
| D (bulk / array, partial success) | Garden-level gate + per-plant eligibility | `checkOwnsGardenAndPlants` | ✓ |
| E (implicit read filtering) | Not a gate — keep inline `.eq('user_id')` | No helper | ✓ (plan says "no helper for E") |
| F (multi-step existence + ownership, distinct 404 vs 403) | Must distinguish not_found from not_owned | `checkOwnsGardenPlantWithExistence` | ✓ |

**All 6 categories are covered. Stop condition not triggered.**

---

## Full source of each new helper

### Shared types

```typescript
export interface OwnershipResult {
  ok: boolean;
  reason?: 'not_found' | 'not_owned' | 'db_error';
  data?: { id: string };
}

export interface OwnershipResultWithExistence extends OwnershipResult {
  exists?: boolean;
}

export interface BulkOwnershipResult {
  ok: boolean;
  gardenOwned: boolean;
  owned_ids: string[];
  skipped_ids: string[];
  reason?: 'db_error';  // ← extension to plan (see Design gap note below)
}
```

### `checkOwnsGarden`

```typescript
export async function checkOwnsGarden(
  gardenId: string,
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<OwnershipResult> {
  const { data, error } = await _client
    .from('gardens')
    .select('id')
    .eq('id', gardenId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`[checkOwnsGarden]${context ? ` ${context}` : ''} DB error:`, ...);
    return { ok: false, reason: 'db_error' };
  }
  if (!data) {
    return { ok: false, reason: 'not_owned' };
  }
  return { ok: true, data: { id: data.id } };
}
```

### `checkOwnsGardenPlant`

```typescript
export async function checkOwnsGardenPlant(
  gardenPlantId: string,
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<OwnershipResult> {
  const { data: gp, error: gpError } = await _client
    .from('garden_plants')
    .select('garden_id')
    .eq('id', gardenPlantId)
    .maybeSingle();

  if (gpError) { return { ok: false, reason: 'db_error' }; }
  if (!gp)     { return { ok: false, reason: 'not_owned' }; }

  return checkOwnsGarden(gp.garden_id, userId, context, _client);
}
```

### `checkOwnsGardenPlantWithExistence`

```typescript
export async function checkOwnsGardenPlantWithExistence(
  gardenPlantId: string,
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<OwnershipResultWithExistence> {
  // Step 1: existence check (no user filter)
  const { data: gp, error: gpError } = await _client
    .from('garden_plants')
    .select('id, garden_id')
    .eq('id', gardenPlantId)
    .maybeSingle();

  if (gpError) { return { ok: false, reason: 'db_error', exists: false }; }
  if (!gp)     { return { ok: false, reason: 'not_found', exists: false }; }

  // Step 2: garden ownership
  const gardenCheck = await checkOwnsGarden(gp.garden_id, userId, context, _client);
  if (!gardenCheck.ok) {
    return {
      ok: false,
      reason: gardenCheck.reason === 'db_error' ? 'db_error' : 'not_owned',
      exists: true,
    };
  }
  return { ok: true, exists: true, data: { id: gp.id } };
}
```

### `checkOwnsResourceByUserId`

```typescript
export function checkOwnsResourceByUserId<T extends { user_id: string }>(
  row: T,
  userId: string,
  context?: string,
): OwnershipResult {
  if (row.user_id !== userId) {
    if (context) console.warn(...);
    return { ok: false, reason: 'not_owned' };
  }
  const id = 'id' in row && typeof row.id === 'string' ? { id: row.id } : undefined;
  return { ok: true, ...(id ? { data: id } : {}) };
}
```

### `checkOwnsGardenAndPlants`

```typescript
export async function checkOwnsGardenAndPlants(
  gardenId: string,
  plantIds: string[],
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<BulkOwnershipResult> {
  const gardenCheck = await checkOwnsGarden(gardenId, userId, context, _client);
  if (!gardenCheck.ok) {
    return { ok: false, gardenOwned: false, owned_ids: [], skipped_ids: plantIds };
  }

  if (plantIds.length === 0) {
    return { ok: false, gardenOwned: true, owned_ids: [], skipped_ids: [] };
  }

  const { data: eligible, error: eligibleErr } = await _client
    .from('garden_plants')
    .select('id')
    .in('id', plantIds)
    .eq('garden_id', gardenId)
    .is('archived_at', null);

  if (eligibleErr) {
    return {
      ok: false, gardenOwned: true, reason: 'db_error',
      owned_ids: [], skipped_ids: plantIds,
    };
  }

  const eligibleIds = (eligible ?? []).map(p => p.id as string);
  const eligibleSet = new Set(eligibleIds);
  return {
    ok: eligibleIds.length > 0,
    gardenOwned: true,
    owned_ids: eligibleIds,
    skipped_ids: plantIds.filter(id => !eligibleSet.has(id)),
  };
}
```

---

## Membership diff for `checkOwnsGarden` (Requirement 1)

This demonstrates that adding `garden_members` support requires editing **only `checkOwnsGarden`** — no call site changes.

```diff
 export async function checkOwnsGarden(
   gardenId: string,
   userId: string,
   context?: string,
   _client: typeof db = db,
 ): Promise<OwnershipResult> {
-  const { data, error } = await _client
+  // Check if user is the garden owner
+  const { data, error } = await _client
     .from('gardens')
     .select('id')
     .eq('id', gardenId)
     .eq('user_id', userId)
     .maybeSingle();

   if (error) {
     console.error(...);
     return { ok: false, reason: 'db_error' };
   }
-  if (!data) {
-    return { ok: false, reason: 'not_owned' };
-  }
-  return { ok: true, data: { id: data.id } };
+  if (data) {
+    return { ok: true, data: { id: data.id } };
+  }
+
+  // Check if user is a garden member
+  const { data: member, error: memberErr } = await _client
+    .from('garden_members')
+    .select('garden_id')
+    .eq('garden_id', gardenId)
+    .eq('user_id', userId)
+    .maybeSingle();
+
+  if (memberErr) {
+    console.error(...);
+    return { ok: false, reason: 'db_error' };
+  }
+  if (!member) {
+    return { ok: false, reason: 'not_owned' };
+  }
+  return { ok: true, data: { id: gardenId } };
 }
```

**Effect:** `checkOwnsGardenPlant`, `checkOwnsGardenPlantWithExistence`, and `checkOwnsGardenAndPlants` all delegate their garden step to `checkOwnsGarden`. They inherit the membership check automatically. No call site changes. No other function edits.

---

## DB round trips per helper

| Helper | Queries | Notes |
|---|---|---|
| `checkOwnsGarden` | 1 | Same cost as legacy `userOwnsGarden` |
| `checkOwnsGardenPlant` | 2 | Same as `userOwnsGardenPlant`. For routes that already have `garden_id`, call `checkOwnsGarden` directly to save one trip. |
| `checkOwnsGardenPlantWithExistence` | 2 | Existence + garden ownership. Eliminates the current triple-query pattern (exist → own → fetch-data) seen in Category F routes. |
| `checkOwnsResourceByUserId` | **0** | Synchronous. Reuses an already-fetched row. |
| `checkOwnsGardenAndPlants` | 2 | Garden ownership + plant batch fetch. Same cost as current inline code. |

**Note on reuse:** `checkOwnsGardenPlant` and `checkOwnsGardenPlantWithExistence` can both avoid their first query at routes that already have the plant's `garden_id` in scope (e.g., from an earlier fetch). In those cases, call `checkOwnsGarden(garden_id, userId)` directly. The batch prompts will call this out per route.

---

## Design gap: `BulkOwnershipResult.reason`

The plan's `BulkOwnershipResult` interface did not include a `reason` field. However, Design Requirement 3 states:

> "Distinguish clearly in the return value between 'denied because not owner' and 'denied because the query failed' — the caller may want to return 403 for one and 500 for the other."

Without `reason`, a DB error on the plant-batch fetch is indistinguishable from "no plants matched" (both yield `ok: false, gardenOwned: true, owned_ids: [], skipped_ids: all`). The current inline code throws on `eligibleErr`, causing a 500 — the caller needs a way to replicate this. Adding `reason?: 'db_error'` to `BulkOwnershipResult` covers this with no breaking change to existing fields.

**This is the only deviation from the plan's interface spec.** It is additive (an optional field) and required by Requirement 3. All 6 categories remain covered; the stop condition was not triggered.

---

## Tests

Tests are in `packages/api/src/tests/ownership.test.ts` and run with the same hand-rolled `npx tsx` pattern as the existing `playBilling.test.ts`.

The test file uses an in-process mock Supabase client (a plain JS object with a thenable chainable API). No real DB or network is required.

```
cd packages/api && npx tsx src/tests/ownership.test.ts
```

**Result: 57/57 pass.**

### Coverage per helper

| Helper | owner allowed | non-owner denied | nonexistent resource | query error denies | partial success |
|---|---|---|---|---|---|
| `checkOwnsGarden` | ✓ | ✓ | ✓ | ✓ | n/a |
| `checkOwnsGardenPlant` | ✓ | ✓ | ✓ | ✓ (both queries) | n/a |
| `checkOwnsGardenPlantWithExistence` | ✓ | ✓ (exists: true) | ✓ (not_found, exists: false) | ✓ (both queries) | n/a |
| `checkOwnsResourceByUserId` | ✓ | ✓ | n/a (sync, no DB) | n/a (no DB call possible) | n/a |
| `checkOwnsGardenAndPlants` | ✓ | ✓ (garden not owned) | n/a | ✓ (plant query error) | ✓ |

### Why `checkOwnsResourceByUserId` has no "query error" test

This helper is synchronous and performs no DB calls. There is no error state to test. Any route using it already fetched the row (and should handle the fetch error itself before calling this helper).

---

## TypeScript compile

```
cd packages/api && npx tsc --noEmit
```

**Exit 0. No errors.**

---

## Confirmation: no call sites modified

Files written or modified:

1. `packages/api/src/utils/ownership.ts` — added types and 5 helpers; existing `userOwnsGarden` and `userOwnsGardenPlant` are byte-for-byte identical to the pre-batch version.
2. `packages/api/src/tests/ownership.test.ts` — new test file.

No route files, no migration files, no schema files, no `packages/web` files.
