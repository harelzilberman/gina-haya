# Harvest Deletion — Backend Report

## Part 1 — Revert confirmation

The `gardenId` fix from commit `3c4f96d` has been reverted by deleting the
affected file entirely:

- `packages/api/src/routes/harvests.ts` — deleted (the fix lived here)
- `packages/api/src/tests/harvests_post.test.ts` — deleted (added by the fix)

`packages/api/src/utils/ownership.ts` is **untouched**. All helpers from
Batches 0 and 0.5 remain exactly as committed. Verified by `git diff
packages/api/src/utils/ownership.ts` producing no output.

---

## Part 2 — Files deleted and reference check

### `packages/api/src/routes/harvests.ts` — deleted

Pre-deletion reference check:

| Location | Reference | Safe to delete? |
|---|---|---|
| `packages/api/src/index.ts:71` | `import { harvestsRouter } from './routes/harvests'` | Yes — import removed |
| `packages/api/src/index.ts:96` | `app.use('/api/harvests', harvestsRouter)` | Yes — registration removed |

No other file imports from `./routes/harvests` or calls any of its exported
symbols. Grep across all `.ts` files in `packages/api/src/` returned zero other
references.

### `packages/api/src/tests/harvests_post.test.ts` — deleted

Added by the fix commit (`3c4f96d`). Not imported or referenced anywhere.

### `packages/api/src/index.ts` — modified (2 lines removed)

The import and `app.use` registration for `harvestsRouter` were removed.
No other changes.

---

## Part 3 — Website findings (read-only, no action taken)

### Does the website call `/api/harvests` or go direct to Supabase?

**The website calls `/api/harvests` through the Express API** — not via direct
Supabase SDK writes. All four endpoints are called from
`packages/web/src/stores/harvestStore.ts`:

```typescript
// GET list
api.get(`/api/harvests?limit=${LIMIT}&offset=${offset}`, token)

// POST create
api.post<Harvest>('/api/harvests', data, token)

// DELETE
api.del(`/api/harvests/${id}`, token)

// GET stats
api.get<HarvestStats>('/api/harvests/stats', token)
```

The anon key is not used for harvest operations. All four routes required the
JWT from `verifyToken`.

### Which web files reference the harvests feature?

| File | What it does |
|---|---|
| `packages/web/src/stores/harvestStore.ts` | Zustand store; owns all `/api/harvests` calls and the `Harvest`, `HarvestStats`, `AddHarvestData` types |
| `packages/web/src/components/harvest/AddHarvestModal.tsx` | Form component to log a harvest; uses `useHarvestStore` |
| `packages/web/src/components/harvest/HarvestCard.tsx` | Display component for a single harvest row |
| `packages/web/src/components/harvest/HarvestStats.tsx` | Stats display component |

The other web files that contain the string "harvest" all use it in the
biodynamic gardening sense (harvest season, harvest day type, harvest months) —
none reference `harvestStore` or call any harvest API endpoint.

### Is there a visible harvest UI on the live site?

**No.** The harvest feature is dead on the website too.

Evidence:
- No `HarvestPage.tsx` exists in `packages/web/src/pages/`. The full pages
  directory was inspected; the only pages are `AboutPage`, `CalendarPage`,
  `GardenGridPage`, `GardensPage`, `TrackerPage`, `DashboardPage`, etc.
- **`App.tsx` has zero harvest references.** It neither imports nor routes to
  any harvest component. Full text-search for "harvest" in `App.tsx` returned no
  results.
- The three harvest components (`AddHarvestModal`, `HarvestCard`, `HarvestStats`)
  are not imported by any page, any other component, or `App.tsx`. They are
  orphaned files with no reachable code path from the router.
- `useHarvestStore` is imported only within the harvest components themselves —
  not from any page.

**Conclusion: deleting the backend routes breaks zero visible user-facing
functionality on the website.** The website's harvest code is dead code; it will
never execute because no page renders it.

### What the web needs if harvest is ever cleaned up separately

`packages/web/src/stores/harvestStore.ts` and the three components under
`packages/web/src/components/harvest/` can be deleted in a future web-side
cleanup. That is out of scope for this pass.

---

## Part 4 — Sweep

### Types, interfaces, shared models

**`packages/shared/src/`:** Two references, neither dependent on the deleted
routes:

1. `packages/shared/src/data/starterTasks.ts:3` — `'harvesting'` is a task
   category string literal in the `TaskType` union. This refers to a gardening
   action, not the `harvests` table. Left alone.

2. `packages/shared/src/types/chupchu.ts:45-50` — `recentHarvests` is an
   optional field on the `ChupChuContext` type, used by the chupchu route to
   pass harvest data to the AI. Left alone — see cron/service note below.

### Migration files

There are **no migration files that create a `harvests` table.** A full search
of all 37 migration files (including `RUN_ME` variants) found only one harvest
reference:

- `001_initial_schema.sql:91` — `harvest_months_israel INT[] NOT NULL DEFAULT '{}'`

This is a column on the `public.plants` encyclopedia table listing which months
a species is typically harvested in Israel. Completely unrelated to the `harvests`
rows table. The table was never migrated into existence.

### Cron jobs and services

**No cron job or scheduled task references `harvests`.** Search of
`packages/api/src/services/cronJobs.ts` and `packages/api/src/cron/` returned
zero results.

**`packages/api/src/routes/chupchu.ts:1510-1523`** — this route queries the
`harvests` table directly to build AI context:

```typescript
const { data: harvestRows } = await db
  .from('harvests')
  .select('plant_name_he, harvest_date, day_type, planting_score')
  .eq('user_id', userId)
  .order('harvest_date', { ascending: false })
  .limit(10);
```

**Left alone.** The task scope is `harvests.ts` and its router registration
only. The Supabase client returns `{ data: null, error: ... }` when the table
does not exist; the code already null-coalesces: `(harvestRows ?? [])`. The
chupchu route has been failing silently on this query in production since the
table was never created, and that is not a regression introduced here.

**`packages/api/src/services/claude.ts:411-413, 635-646`** — defines a
`get_recent_harvests` Claude tool and its handler. The handler reads
`context.recentHarvests` which is populated by the chupchu query above (always
an empty array in production). Left alone for the same reason.

### Dangling imports

The only import of the deleted module was in `packages/api/src/index.ts`, which
has been cleaned up. No other file imported from `./routes/harvests`.

---

## Verification

**TypeScript:** `npx tsc --noEmit` → no output, no errors.

**Tests:** `npx tsx src/tests/ownership.test.ts` → 70 passed, 0 failed.

---

## `git diff --stat`

```
 packages/api/src/index.ts                    |   2 -
 packages/api/src/routes/harvests.ts          | 185 ---------------------------
 packages/api/src/tests/harvests_post.test.ts | 135 -------------------
 3 files changed, 0 insertions(+), 322 deletions(-)
```

(`settings.local.json` appears in the working-copy diff as a pre-existing
modification from before this session; it was not staged or committed here.)
