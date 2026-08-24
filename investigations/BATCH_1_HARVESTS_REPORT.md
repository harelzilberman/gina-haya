# Batch 1 Report — Harvests Routes

## Executive summary

**0 of 4 routes were converted.** All four routes in `harvests.ts` use implicit
DB-level filtering (`WHERE user_id = ?`) rather than explicit fetch-then-gate
ownership checks. Wrapping a filter in a helper adds round trips and changes
external behavior. The right call is Category E (leave alone) for all four.

This is consistent with the task prompt's expectation: "I expect this batch to
convert fewer than four routes."

---

## Route-by-route analysis

### 1. `GET /harvests` — Category E, no conversion

**Current inline check (line 21–24):**
```typescript
let query = db
  .from('harvests')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)          // ← authorization is the filter
  .order('harvest_date', { ascending: false })
  .range(offset, offset + limit - 1);
```

**Classification:** Category E — the `WHERE user_id = userId` filter is the
authorization. There is no per-row ownership gate; the DB only returns rows
belonging to the caller. Wrapping this in a helper would mean fetching all rows,
then iterating with a helper per row — adding N round trips and changing
pagination semantics.

**Decision:** Leave unchanged. No helper.

---

### 2. `GET /harvests/stats` — Category E, no conversion

**Current inline check (line 53–54):**
```typescript
const { data: all, error } = await db
  .from('harvests')
  .select('plant_name_he, plant_name_en, harvest_date, day_type')
  .eq('user_id', userId)          // ← authorization is the filter
  .order('harvest_date', { ascending: false });
```

**Classification:** Category E — identical pattern to `GET /harvests`. A single
filtered query returns the caller's rows; all aggregation (counts, top plants,
day-type breakdown, streak) happens in-process on that result set. No per-row
gate exists to replace.

**Decision:** Leave unchanged. No helper.

---

### 3. `POST /harvests` — creation route, no conversion

**Current inline check:** None. The route sets `user_id: userId` directly on
insert (line 129). There is no ownership gate on any existing resource.

**Classification:** Creation route. The helper family checks ownership of
*existing* rows; there is no existing row here. The helper would not apply even
in principle.

**Bug found (not fixed):** The route accepts a `gardenId` from `req.body` and
stores it as `garden_id` without verifying that the authenticated user owns that
garden (lines 103 and 131). A user can therefore log a harvest against any
garden_id in the system. This is the source of the "stored at insert but never
re-validated" condition noted in the Category A audit. Not fixing it per the
rules — reporting it here.

**Decision:** Leave unchanged. No helper.

---

### 4. `DELETE /harvests/:id` — filter-delete pattern, no conversion

**Current inline check (lines 161–164):**
```typescript
const { error } = await db
  .from('harvests')
  .delete()
  .eq('id', id)
  .eq('user_id', userId);      // ← authorization is the WHERE clause on DELETE

if (error) throw error;
res.json({ success: true });
```

**Classification:** Category E-equivalent for mutations. The authorization is
embedded in the `WHERE id = ? AND user_id = ?` clause on the DELETE statement.
The route never fetches the row before deleting. Because it never checks affected
row count, the response is `200 { success: true }` in all three possible
outcomes:

| Scenario | DB result | Current response | Helper response |
|---|---|---|---|
| Row found, caller is owner | 1 row deleted | 200 success | 200 success (same) |
| Row not found | 0 rows deleted | **200 success** | 404 not found (different) |
| Row found, caller is NOT owner | 0 rows deleted | **200 success** | 403 forbidden (different) |

Converting to the fetch-then-helper pattern would necessarily change the
response for the not-found and not-owned cases. The "behavior must not change"
rule prohibits this.

**Bug found (not fixed):** The route is over-permissive and non-idiomatic. A
caller that tries to delete another user's harvest gets `200 { success: true }`
rather than a `403`. A caller that deletes a non-existent harvest also gets `200
{ success: true }` rather than `404`. These are existing bugs. Not fixing.

**Decision:** Leave unchanged. No helper.

---

## Nullable `garden_id` walkthrough

The task requires an explicit walk-through of the three hazard cases for
production rows where `garden_id` is NULL, points at an unowned garden, or
points at a deleted garden.

### For the two list routes (GET /harvests, GET /harvests/stats)

Both filter exclusively on `user_id`. The `garden_id` column is selected (for
`GET /harvests`) or not (for stats, which selects named columns without it).
Neither route touches `garden_id` in any predicate. All three hazard cases are
invisible to these routes — they return data based solely on `user_id`. No
impact.

### For POST /harvests

Accepts `gardenId` from the request body and stores it as-is. The three hazard
cases don't affect existing rows; they describe what a future row could look
like. The bug is in the missing validation at write time (see above). No
`garden_id` re-validation occurs on read either. No impact on behavior.

### For DELETE /harvests/:id

Deletes with `WHERE id = ? AND user_id = ?`. The `garden_id` column is never
read, never compared, never involved in the predicate. For all three hazard
cases, if the calling user is the `user_id` owner of the row, the delete
succeeds. If they are not, the delete is a no-op and returns 200.

**Conclusion for owner fast-path:** Because none of these routes ever look at
`garden_id`, and `checkOwnsGardenScopedResource`'s fast path resolves on
`row.user_id === userId` alone (no DB call, never touches `garden_id`), all
three hazard cases would be handled correctly if conversion were to happen in a
later batch. The fast path makes `garden_id` irrelevant for the owner. This
confirms the helper's design is sound for this table.

---

## Routes converted vs. left alone

| Route | Decision | Reason |
|---|---|---|
| `GET /harvests` | Left alone | Category E: implicit filter |
| `GET /harvests/stats` | Left alone | Category E: implicit filter |
| `POST /harvests` | Left alone | Creation route, no ownership gate |
| `DELETE /harvests/:id` | Left alone | Filter-delete; conversion changes behavior |

**Routes beyond the four listed:** None. `harvests.ts` contains exactly these
four routes.

---

## Bugs found and not fixed

1. **POST /harvests — missing gardenId ownership validation.** The route accepts
   an arbitrary `gardenId` from the client and stores it without verifying the
   user owns that garden. This is the root of the "stored at insert but never
   re-validated" condition.

2. **DELETE /harvests/:id — over-permissive response.** Returns `200 { success:
   true }` for not-found and not-owned rows. No 403 or 404 is ever returned.
   This is both a security gap (confirms nothing to the caller) and a UX issue
   (client can't distinguish success from silent failure).

---

## Test results

No code changes → running the existing suite to confirm nothing was broken.

```
── Results: 70 passed, 0 failed ──
```

---

## Device test checklist

Even though no code changed, the behavior-preservation guarantee needs manual
verification on device. Run these flows on the Xiaomi and report back as
`1✅ 2✅ 3❌` etc.

1. **Log a harvest (with garden).** Open a plant in a garden. Log a harvest.
   Confirm it appears in the harvest list with the correct plant name and date.

2. **Log a harvest (without garden / standalone plant).** Log a harvest from a
   plant not linked to any garden. Confirm it saves and appears in the list.

3. **View harvest list.** Navigate to the harvests screen. Confirm the list
   loads, is ordered by date descending, and includes both garden-linked and
   standalone harvests.

4. **View harvest stats.** Open the stats view. Confirm total harvests, this
   month, last month, top plants, and day-type breakdown all display without
   error.

5. **Delete a harvest.** Swipe-delete or tap delete on an existing harvest.
   Confirm it disappears from the list and does not reappear on refresh.

6. **Delete already-deleted harvest (idempotent check).** Attempt to delete a
   harvest ID that no longer exists (e.g., by double-tapping delete quickly or
   replaying the request). Confirm the app does not crash or show an error
   (current behavior: 200 success regardless).

---

## `git diff --stat`

```
 investigations/BATCH_1_HARVESTS_REPORT.md | (new file)
```

Only the report file is added. `harvests.ts` is untouched.
`packages/api/src/utils/ownership.ts` and the test file are also untouched
(no changes since Batch 0.5's commit).
