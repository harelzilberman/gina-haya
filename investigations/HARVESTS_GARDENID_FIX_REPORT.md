# Fix Report — `POST /api/harvests` unvalidated `gardenId`

## The diff

```diff
+import { checkOwnsGarden } from '../utils/ownership';

 // POST /api/harvests
 harvestsRouter.post('/', async (req: any, res) => {
   ...
   if (!plantNameHe || !plantNameEn) {
     return res.status(400).json({ error: 'plantNameHe and plantNameEn are required' });
   }

+  // Validate gardenId ownership before the insert.
+  // Null/absent gardenId is valid — harvests without a garden are legitimate.
+  if (gardenId != null) {
+    const gardenCheck = await checkOwnsGarden(gardenId, userId, '[POST /api/harvests]');
+    if (!gardenCheck.ok) {
+      if (gardenCheck.reason === 'db_error') {
+        return res.status(500).json({ error: 'Database error' });
+      }
+      return res.status(403).json({ error: 'Forbidden' });
+    }
+  }

   // Auto-fetch calendar data if not provided
   ...
```

The check is placed **before** the calendar lookup and before the insert. No side effect of any kind can occur before the ownership gate passes.

---

## What `harvests.plant_id` references

**Conclusion: shared encyclopedia table (`public.plants`). No validation needed.**

Evidence chain:

1. `migration 001_initial_schema.sql` defines `garden_plants.plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL` — linking a garden plant to the species encyclopedia.
2. The web's `AddHarvestModal.tsx` sets `plantId` via `setPlantId(plant.plant_id)` where `plant` is a row from `activeGarden.garden_plants`. So `plantId` is whatever `garden_plants.plant_id` contains — a `plants` encyclopedia UUID.
3. The `plants` table is a public read-only encyclopedia with no user ownership (`migration 001` shows no `user_id` column and no RLS policy). Any authenticated user can reference any plant.

Therefore `harvests.plant_id` points at a shared, non-user-scoped table. A user providing any valid `plants.id` is legitimate. No `checkOwnsGardenPlant` call is needed or appropriate.

---

## Client confirmation: both clients send only the caller's own `gardenId`

### Web (`packages/web/src/components/harvest/AddHarvestModal.tsx`)

```typescript
gardenId: activeGarden?.id,
```

`activeGarden` comes from `useGardenStore()`, which is loaded by the authenticated user's session and contains only that user's own gardens. The value is either the caller's own garden ID or `undefined` (which becomes `null` in the API). No cross-user garden ID is ever present in this store.

**Safe. No change needed.**

### Flutter (`D:\gina_haya\lib\features\garden\services\harvest_service.dart`)

The Flutter app writes harvests via **direct Supabase SDK calls**, not through `POST /api/harvests`. It does not call this route at all:

```dart
final response = await _db
    .from('harvests')
    .insert(data)
    .select()
    .single();
```

The API route change does not affect the Flutter app. Supabase RLS policies govern direct writes.

**Unaffected.**

---

## Read-only SQL for counting pre-existing bad rows

Run in the Supabase SQL Editor. No data is modified.

```sql
-- Count harvests rows where garden_id is non-null and does not belong
-- to the row's own user_id (i.e., pointing at someone else's garden).
SELECT COUNT(*) AS bad_rows
FROM   harvests h
WHERE  h.garden_id IS NOT NULL
  AND  NOT EXISTS (
         SELECT 1
         FROM   gardens g
         WHERE  g.id      = h.garden_id
           AND  g.user_id = h.user_id
       );
```

If the result is 0, no cleanup is needed. If it is non-zero, those rows will have been inserted before this fix and require a separate remediation decision.

---

## Test results

### New tests (`packages/api/src/tests/harvests_post.test.ts`)

```
── Results: 6 passed, 0 failed ──
```

Cases covered:
1. Valid own garden → validation passes, insert proceeds
2. Garden owned by another user → 403
3. `null` gardenId → check skipped entirely (DB not called), insert proceeds
4. `undefined` gardenId → check skipped entirely (DB not called), insert proceeds
5. Nonexistent gardenId (DB returns no row) → 403 (indistinguishable from wrong owner, by design)
6. DB error during garden check → 500 (fail closed — never falls through to insert)

### Existing tests (unchanged)

```
── Results: 70 passed, 0 failed ──
```

---

## `git diff --stat`

```
 packages/api/src/routes/harvests.ts               | 13 +++++++++++++
 packages/api/src/tests/harvests_post.test.ts       | (new file, 6 tests)
```

Only `harvests.ts` and the new test file were changed. `settings.local.json` was pre-existing.

---

## Device test checklist

1. **Log a harvest attached to the active garden.** Select a plant from the garden dropdown, fill in harvest details, submit. Confirm the harvest appears in the harvest list with the correct plant name, date, and garden association.

2. **Log a harvest without a garden (standalone plant).** Use the "custom plant" option or open the harvest screen without an active garden. Submit. Confirm it saves and appears in the list.

3. **View harvest list.** Navigate to the harvests screen. Confirm the list loads correctly, is ordered by date descending, and shows both garden-linked and standalone harvests.

4. **View harvest stats.** Open the stats view. Confirm total harvests, this month, last month, top plants, and day-type breakdown all display without error.

5. **Delete a harvest.** Delete an existing harvest. Confirm it disappears from the list and does not reappear on refresh.
