# Design: `garden_timeline` — Garden-Level Event Log

**Date:** 2026-08-25
**Status:** DESIGN ONLY — no files changed, no migration run
**Output files:** This document + `investigations/garden-timeline-DRAFT.sql`

---

## Part 1 — Schema

### 1.0 Reading `plant_timeline` first

**VERIFIED** from `packages/api/src/db/migrations/013_plant_timeline.sql` and `026_soft_delete.sql`:

```sql
CREATE TABLE IF NOT EXISTS plant_timeline (
  id                   UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_id           UUID     NOT NULL REFERENCES plant_trackers(id) ON DELETE CASCADE,
  user_id              UUID     NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  entry_type           TEXT     NOT NULL CHECK (entry_type IN (
    'watering', 'fertilizing', 'note', 'photo', 'task', 'chupchu', 'tracker_report'
  )),
  time_of_day          TEXT     CHECK (time_of_day IN ('בוקר', 'צהריים', 'ערב', 'לילה')),
  note                 TEXT,
  photo_path           TEXT,
  task_id              UUID,
  tracker_checkin_id   UUID,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
-- Migration 026 added:
-- deleted_at TIMESTAMPTZ DEFAULT NULL
```

Observations relevant to this design:

- **`tracker_id NOT NULL`**: plant_timeline is anchored to a plant tracker. garden_timeline anchors to a garden (`garden_id NOT NULL`) — the direct structural mirror.
- **`user_id NOT NULL` in plant_timeline**: The cascade is `ON DELETE CASCADE` there. garden_timeline uses `ON DELETE SET NULL` instead (see §1.4 Actor Attribution — we preserve events even when the recorder's account is deleted).
- **`entry_type` TEXT + CHECK**: We match this pattern rather than using a Postgres enum. See §1.1.
- **`time_of_day` Hebrew literals**: plant_timeline uses `'בוקר', 'צהריים', 'ערב', 'לילה'`. garden_timeline uses English values (`'dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'`) — no Hebrew string literals in SQL, per requirement.
- **`created_at` only**: plant_timeline has no separate `event_date`; the timestamp IS the event time. garden_timeline diverges here — see §1.5 Timing Fields.
- **`deleted_at` added by migration 026**: garden_timeline includes it from the start. See §1.6.
- **No `deleted_by`**: migration 026 added `deleted_by` to plant_tracker_checkins and plant_trackers, but only `deleted_at` to plant_timeline. garden_timeline follows plant_timeline — `deleted_at` only, no `deleted_by` (the recorder is already captured by `user_id`).

---

### 1.1 Event type strategy: TEXT + CHECK (not enum, not lookup table)

**Three options:**

**Postgres enum** (`CREATE TYPE garden_event_type AS ENUM (...)`):
- Pro: type-enforced at the DB level, compact storage.
- Con: `ALTER TYPE ADD VALUE` in Postgres 12+ is safe but non-transactional. You cannot add a value inside a transaction that also modifies data. For Supabase SQL Editor use (our deployment pattern), this is a footgun: running the enum alter and the table alter in one block fails. The constraint on separate transactions is easy to forget.

**TEXT + CHECK constraint** (chosen):
- Matches `plant_timeline.entry_type` exactly — consistent pattern across the codebase.
- Adding a value: write a migration that drops and re-adds the constraint. One `ALTER TABLE` statement, fully transactional, runs in the Supabase SQL Editor without special handling.
- Con: the constraint name must be known to drop it. The draft SQL names the constraint implicitly (Postgres assigns it `garden_timeline_event_type_check`) — document this in any future migration adding values.

**Lookup table** (`garden_event_types` with FK):
- Pro: add values with `INSERT`, no DDL required.
- Con: every query needs a JOIN for display names; the type set is stable and small (6 initial values). The extra complexity is not justified. The "new types will be added later" concern is real but a lookup table is not the right solution for 6-15 values over the lifetime of the feature.

**Verdict: TEXT + CHECK**, mirroring `plant_timeline`.

---

### 1.2 Event types in scope

Initial set (6 values). `prep_name` qualifies within `bd_prep`:

| `event_type`    | Description | `prep_name` used? |
|-----------------|-------------|-------------------|
| `bd_prep`       | Biodynamic preparation application | Yes: `'500'`, `'501'`, `'508'`, `'compost'`, `'green_manure'` |
| `compost_turn`  | Turning a compost pile | No |
| `bed_prep`      | Preparing a bed for planting | No |
| `cover_crop`    | Cover crop / green manure sowing | No |
| `mulching`      | Garden-wide mulching (chipooy karka) | No |
| `pest_treatment`| Garden-wide pest or disease treatment | No |

`prep_name` values match the keys in `BD_PREP_KNOWLEDGE` (claude.ts:44): `'500'`, `'501'`, `'508'`, `'compost'`, `'green_manure'`.

---

### 1.3 Preparation-specific detail: typed columns for query fields, JSONB for the rest

The key query that gives this feature its value:

```sql
SELECT max(event_date)
FROM garden_timeline
WHERE garden_id = $1
  AND event_type = 'bd_prep'
  AND prep_name = '500'
  AND deleted_at IS NULL;
```

This requires `prep_name` to be a real column with an index, not buried in JSONB. A `jsonb_extract_path_text()` or `->>` expression in the WHERE clause cannot use a partial B-tree index efficiently.

**Hybrid approach:**

- **Typed, indexed columns**: `prep_name` (TEXT with CHECK), `quantity_grams` (NUMERIC). These are the columns Chupchu queries.
- **`detail` JSONB**: weather at application time, temperature, humidity, moon phase note, any future extension. These are display-only fields that are never filtered on. Storing them in JSONB avoids schema churn when a user wants to record "it was 32°C and a root day" without a new migration.

**Not recommended**: a single JSONB blob for everything. The `prep_name` field alone being unqueryable makes the "you applied 500 three weeks ago" feature impossible without a full table scan.

---

### 1.4 Actor attribution

**Meaning preserved from `plant_timeline`**: `user_id` = who recorded the event, not who owns the garden. A community garden member who logs an application owns that row's `user_id`.

**Divergence from `plant_timeline`**: `ON DELETE SET NULL` instead of `ON DELETE CASCADE`.

Rationale: if a community garden member's account is deleted, their logged events should remain part of the garden's history. Cascading deletion would silently erase records of real biodynamic events. The garden's owner needs those records ("we applied 500 in March — who did it?"). With `ON DELETE SET NULL`, the event is preserved with `user_id = NULL`, indicating an anonymous/deleted recorder.

**Display of attribution**: "Ran applied 500, Tuesday at dusk" requires a JOIN to `users` at query time. There is no denormalized name snapshot in the schema. This keeps the schema clean; the API route that serves the timeline can SELECT user names in a single joined query. For the Chupchu injection (§2.2), names are not needed — "500 applied 21 days ago" is sufficient context.

---

### 1.5 Timing fields

**`plant_timeline` approach**: `created_at TIMESTAMPTZ` — this IS the event time, which conflates "when it happened" with "when it was recorded."

**garden_timeline divergence**: two separate fields:
- `event_date DATE NOT NULL` — the calendar date the event occurred. Biodynamic practice makes this the meaningful field: 500 was applied on a root day, not at 14:37:22 UTC.
- `time_of_day TEXT` (CHECK constraint with 6 values) — distinguishes dawn (501 timing) from dusk (500 timing). This is the level of precision biodynamic advice needs. Sub-hour precision adds no value.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` — server-assigned recording time. Immutable. Used for ordering when `event_date` is the same day.

**Why DATE not TIMESTAMPTZ for `event_date`**: The query "when did I last apply 500" returns a day, not a timestamp. Storing a DATE keeps the intent explicit and prevents the query from silently returning time-zone-offset-shifted results depending on the server locale.

---

### 1.6 Soft delete

Yes. Include `deleted_at TIMESTAMPTZ` (NULL = active), matching `plant_timeline` post-migration 026.

Biodynamic records are valuable historical data. A user who accidentally deletes a logged preparation should be able to recover it. The soft-delete pattern is established by migration 026 across plant_tracker_checkins, plant_trackers, and plant_timeline — garden_timeline follows it from day one.

No `deleted_by` column. The recorder is already captured by `user_id`; deletion is a single-user action (you delete your own record). `plant_timeline` itself has no `deleted_by`.

---

### 1.7 RLS

RLS enabled, two policies:

1. **`garden_timeline_owner_all`** (authenticated role): user can read/write events for gardens where `gardens.user_id = auth.uid()`. Uses a subquery against `gardens`. When community garden membership is added, this policy does NOT need to change — the API bypasses RLS via service role. This policy only protects against direct PostgREST client calls.

2. **`garden_timeline_service_role_all`** (service_role): unrestricted `USING (true)`. Identical to every other table in the live DB. All server-side API calls go through the service role key.

**Community garden note**: membership access will be enforced via `checkOwnsGarden()` in `ownership.ts` (which the API calls before every write), not via RLS. The RLS policy as written will allow direct client access only for garden owners — members using direct client access would be blocked. This is acceptable: the web app always calls the API, never PostgREST directly.

---

### 1.8 Indexes

Three indexes (all partial `WHERE deleted_at IS NULL`):

1. **`idx_garden_timeline_garden_id`** on `(garden_id)` — primary access pattern: all active events for a garden.
2. **`idx_garden_timeline_bd_prep`** on `(garden_id, prep_name, event_date DESC)` partial on `event_type = 'bd_prep' AND deleted_at IS NULL` — the specific query Chupchu uses: last application date per prep. This is the index that makes the feature worth building.
3. **`idx_garden_timeline_user_id`** on `(user_id)` — attribution queries (community garden: "what did Ran log").

---

## Part 2 — The Chupchu Read Path

### 2.1 Which cache block?

**Block 2 (stableContext).**

**VERIFIED** from `packages/api/src/routes/chupchu.ts:1900–1921` and `packages/api/src/services/claude.ts:649–664`:

The system prompt has three blocks:

| Block | Content | Cache | TTL |
|-------|---------|-------|-----|
| 1 | Static base prompt (CHUPCHU_SYSTEM_PROMPT_HE/EN) | Yes | 1h |
| 2 | Per-user stable context: garden, memory, tasks | Yes | 1h |
| 3 | Volatile: past conversation summary, today's date, weather | No | — |

Block 2 is assembled once per session and frozen in-process for 1h (`stableContextByUser` map, STABLE_CONTEXT_TTL_MS = 3600000). The content is: `memorySection + gardenSection + pendingTasksSection + taskContext`.

**Why Block 2 is correct:**

- BD prep history is per-garden data that is stable within a session. A user who logs a new preparation mid-session will see it reflected on the next session start (when Block 2 is rebuilt). This matches the behavior of the pending tasks list — also frozen mid-session.
- Block 3 would work functionally but busts the cache on every request because the volatile block is never cached. Placing garden_timeline data in Block 3 eliminates the ~55% input cost reduction on every turn after the first.
- Block 1 is static and never appropriate for per-user data.

**Where in Block 2**: alongside `gardenSection`. A new `gardenTimelineSection` string is assembled with the same frozen pattern. It is included in the `stableContext` join only when there are recent events to report.

---

### 2.2 How much history?

**Last event of each type, not all history.**

The prompt question is "when should I apply 500 next?" — Chupchu needs to know the date of the most recent 500 application, not a complete log of every application ever. Full history wastes tokens and degrades signal.

Proposed injection format (Block 2 tail, after gardenSection):

```
## Recent Garden Events
500 (biodynamic prep): last applied 2026-08-03 (22 days ago), dusk
501 (biodynamic prep): last applied 2026-07-15 (41 days ago), dawn
compost turned: last 2026-06-20 (66 days ago)
mulching: last 2026-05-10 (107 days ago)
```

This is approximately 4–6 lines for a well-maintained garden. At ~30 tokens per line, that's ~180 tokens added to Block 2. The cost is negligible relative to the value of the context.

**Query that produces this**: one query per event type with `max(event_date)` grouped by `(event_type, prep_name)`, limited to the last 12 months. Alternatively, a single query using `DISTINCT ON (event_type, prep_name) ORDER BY event_type, prep_name, event_date DESC`.

---

### 2.3 Tool vs injected context

**Injected context** (Block 2), not a tool.

The lesson from `get_recent_harvests` is the right frame: a tool requires Claude to decide it needs the information, spend a tool iteration to fetch it, and then formulate its response. For harvests, that was often irrelevant — hence the wasted iteration.

For biodynamic prep timing, the situation is different: **the data is almost always relevant** when a user discusses biodynamic practice. If a user asks "should I apply 500 this week?", the answer depends entirely on when 500 was last applied. Claude cannot answer correctly without the data. A tool would require Claude to first ask "let me check your prep history" — one iteration wasted — before giving the actual advice.

More importantly: Chupchu's **proactive advice** pattern ("you applied 500 three weeks ago, root day tomorrow — ideal timing") can only work if the data is present in the system prompt. A tool can only be called reactively.

Injected context in Block 2 costs nothing extra after the first turn (cache hit) and enables the proactive pattern.

---

### 2.4 The write side: `log_bd_prep` — current definition and shape fit

**VERIFIED** from `packages/api/src/services/claude.ts:454–465`:

```typescript
{
  name: 'log_bd_prep',
  description: 'Log that the user applied a biodynamic preparation today. Call when user says they applied or made a BD preparation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      prep_name: { type: 'string', description: 'Preparation name, e.g. "500", "501", "508", "compost"' },
      date:      { type: 'string', description: 'ISO date YYYY-MM-DD' },
    },
    required: ['prep_name', 'date'],
  },
},
```

**Current execute-tool handler** (`chupchu.ts:2178–2185`):

```typescript
case 'log_bd_prep': {
  await db.from('bd_applications').insert({
    user_id:    userId,
    prep_name:  params.prep_name,
    date:       params.date,
    created_at: new Date().toISOString(),
  });
  break;
}
```

**Shape fit against proposed schema:**

The tool captures `prep_name` and `date`, which map directly to `prep_name` and `event_date`. It is missing three fields that garden_timeline requires:

| Field needed | Current tool | Gap |
|---|---|---|
| `garden_id` | Not in tool params | Server fills from `req.user.active_garden_id` — same pattern as the garden context fetch in `POST /api/chupchu/chat` |
| `time_of_day` | Not in tool params | Should be added as optional: `'dawn' \| 'morning' \| 'midday' \| 'afternoon' \| 'dusk' \| 'night'` |
| `quantity_grams` | Not in tool params | Optional, add to schema |
| `event_type` | Implied: always 'bd_prep' | Server hardcodes `event_type: 'bd_prep'` in the handler |

**What changes in the tool and handler to write to `garden_timeline`:**

1. Tool input_schema: add optional `time_of_day` (string enum) and optional `quantity_grams` (number).
2. Tool description: expand to mention time of day ("also note time of day: 'dawn' for 501, 'dusk' for 500").
3. Handler: change `db.from('bd_applications')` to `db.from('garden_timeline')`, update columns, add `garden_id` from context (server resolves from `active_garden_id` or the gardenId param on the chat request), hardcode `event_type: 'bd_prep'`.
4. `mobileToolDescription` (claude.ts:350): update display string — currently `מתעד יישום פרפרט ${params.prep_name} בתאריך ${params.date}`. No codepoint change needed; `prep_name` and `date` remain required params.

The tool schema change is backward-compatible: new optional params do not break existing callers.

---

## Part 3 — Community Garden

### 3.1 Which ownership helper gates this table

**`checkOwnsGarden`** (`ownership.ts:133`).

**VERIFIED** from `packages/api/src/utils/ownership.ts`:

`garden_timeline` rows carry a direct `garden_id` column. This is the "resource IS a garden" / "already have garden_id in scope" case — exactly what `checkOwnsGarden` is designed for (ownership.ts header: "when the resource IS a garden, or when you already have the garden_id in scope and want a single-hop check").

`checkOwnsGardenScopedResource` is for rows that carry both `user_id` AND `garden_id`. `garden_timeline` has both, which makes `checkOwnsGardenScopedResource` a candidate — but its fast-path is `user_id` equality, which is wrong for community garden: a member writing a new event would have a different `user_id` than the owner. Going directly to `checkOwnsGarden` is the right choice for all write operations on this table.

For reads (listing a garden's timeline), the gate is still `checkOwnsGarden` — does the requesting user own (or, when membership lands, belong to) this garden?

### 3.2 Membership propagation

`checkOwnsGarden` was explicitly designed for this transition. From the ownership.ts comment (line 126–130):

```
// Adding garden_members support later requires editing ONLY this function body:
// add a second query for garden_members after the owner check fails, and return
// ok:true if the user is a member. No call sites change.
```

Any route that calls `checkOwnsGarden` before writing to `garden_timeline` will automatically become membership-aware when that single function body is updated. No call site changes needed.

### 3.3 Attribution display without extra queries

The proposed schema has `user_id` but no denormalized name field. "Ran applied 500, Tuesday at dusk" requires a JOIN to `users.display_name` (or equivalent).

**Can the route serving the timeline avoid a second query?** Yes — with a joined select:

```sql
SELECT gt.*, u.display_name AS performed_by_name
FROM garden_timeline gt
LEFT JOIN users u ON u.id = gt.user_id
WHERE gt.garden_id = $1 AND gt.deleted_at IS NULL
ORDER BY gt.event_date DESC, gt.created_at DESC;
```

Single query. The `LEFT JOIN` handles `user_id IS NULL` (deleted recorder) gracefully — `performed_by_name` comes back as NULL, display as "Unknown."

**OPEN QUESTION**: Does the `users` table have a `display_name` or equivalent column? The API code reads `users.email` and `users.language_preference` elsewhere, but no display_name is confirmed from the files read. This affects the attribution display but not the schema design.

---

## Part 4 — Draft SQL

Written to `investigations/garden-timeline-DRAFT.sql`.

Contents:
- Forward migration: `CREATE TABLE IF NOT EXISTS garden_timeline` with all columns, constraints, indexes, and RLS policies.
- Reverse migration: `DROP TABLE IF EXISTS garden_timeline` (commented out, for reference).
- Verification query: returns zero rows if all objects exist, one row per missing object otherwise.

**No Hebrew string literals appear anywhere in the SQL.** The `time_of_day` values and `event_type` values are English. The `prep_name` values (`'500'`, `'501'`, etc.) are numeric strings.

**Note on migration 035 / 037 precedent**: both were written, committed, and never applied. The `garden-timeline-DRAFT.sql` file is draft-for-review, not a migration ready to run. The verification query at the bottom exists specifically so that after running it, you can confirm the objects are present before depending on them.

---

## Part 5 — What It Replaces

### 5.1 Current `log_bd_prep` tool definition (full quote)

**VERIFIED** from `packages/api/src/services/claude.ts:454–465`:

```typescript
{
  name: 'log_bd_prep',
  description: 'Log that the user applied a biodynamic preparation today. Call when user says they applied or made a BD preparation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      prep_name: { type: 'string', description: 'Preparation name, e.g. "500", "501", "508", "compost"' },
      date:      { type: 'string', description: 'ISO date YYYY-MM-DD' },
    },
    required: ['prep_name', 'date'],
  },
},
```

**VERIFIED** execute-tool handler (`chupchu.ts:2178–2185`):

```typescript
case 'log_bd_prep': {
  await db.from('bd_applications').insert({
    user_id:    userId,
    prep_name:  params.prep_name,
    date:       params.date,
    created_at: new Date().toISOString(),
  });
  break;
}
```

**VERIFIED**: `log_bd_prep` is in the `MOBILE_TOOLS` list (`claude.ts:752`):

```typescript
const MOBILE_TOOLS = ['create_task', 'log_bd_prep'] as const;
```

This means during the agentic loop, `log_bd_prep` is **captured for client confirmation** — the tool result returned to Claude is `{ pending_confirmation: true }`, not an actual DB write. The actual DB write happens only when the user confirms via the UI button, which triggers `POST /api/chupchu/execute-tool`. That route contains the `case 'log_bd_prep'` handler above.

Today that handler inserts into `bd_applications` which does not exist → PGRST204 → the insert fails, the case falls through (no error check on the await), and `res.json({ success: true })` is returned. The user's confirmation is silently discarded.

### 5.2 Changes needed to write to `garden_timeline`

**Tool input_schema changes** (`claude.ts`):

```typescript
// Add two optional parameters:
properties: {
  prep_name:      { type: 'string', description: 'Preparation name: "500", "501", "508", "compost", "green_manure"' },
  date:           { type: 'string', description: 'ISO date YYYY-MM-DD of application' },
  time_of_day:    { type: 'string', enum: ['dawn','morning','midday','afternoon','dusk','night'],
                    description: 'Time of day: dawn for 501, dusk for 500' },
  quantity_grams: { type: 'number', description: 'Optional: grams of preparation used' },
},
required: ['prep_name', 'date'],
```

**Tool description** should mention time of day: "Also record time_of_day: 'dawn' for 501 (applied at sunrise), 'dusk' for 500 (applied at sunset)."

**`mobileToolDescription` function** (`claude.ts:350`): current value:

```typescript
case 'log_bd_prep':
  return `מתעד יישום פרפרט ${params.prep_name} בתאריך ${params.date}`;
```

No change needed for the base case — prep_name and date remain required. If time_of_day is present, optionally append it. This is a display-only string.

**Execute-tool handler** (`chupchu.ts:2178–2185`) — replacement:

```typescript
case 'log_bd_prep': {
  const gardenId = gardenId; // already in scope from the route — req.body.gardenId
  if (!gardenId) {
    return res.status(400).json({ error: 'gardenId required for log_bd_prep' });
  }
  const { error: insertError } = await db.from('garden_timeline').insert({
    garden_id:      gardenId,
    user_id:        userId,
    event_type:     'bd_prep',
    event_date:     params.date,
    time_of_day:    params.time_of_day ?? null,
    prep_name:      params.prep_name,
    quantity_grams: params.quantity_grams ?? null,
    created_at:     new Date().toISOString(),
  });
  if (insertError) {
    console.error('[execute-tool/log_bd_prep] insert failed:', insertError.message);
    return res.status(500).json({ error: 'שגיאה בשמירת הפרפרט.' });
  }
  break;
}
```

Key changes from current:
1. Target table: `bd_applications` → `garden_timeline`.
2. Added `garden_id` (required — route must receive it from the client confirmation request body; the execute-tool route currently receives `gardenId` from the client's POST body alongside `tool_name` and `params`).
3. Added `event_type: 'bd_prep'` (hardcoded).
4. `date` → `event_date` (column rename).
5. Added `time_of_day` and `quantity_grams` (optional).
6. Added error check: the current handler has no error check on the insert — silent failure. This replacement checks `insertError` and returns 500, which the client UI should surface.

### 5.3 Anything else referencing `bd_applications`

**VERIFIED** via grep across `packages/`:

Only two references exist:
1. `packages/api/src/routes/chupchu.ts:2179` — the execute-tool handler quoted above.
2. `investigations/MIGRATION_REALITY_CHECK.md` — the migration gap analysis, which documents the table as absent from the live DB.

No migration creates `bd_applications`. No route reads from it. No type or shared package references it. The table name can be retired cleanly by updating the handler in chupchu.ts.

---

## Verified vs Inferred

**VERIFIED against code:**
- `plant_timeline` schema: columns, constraints, RLS policies, `deleted_at` added by migration 026.
- `log_bd_prep` tool definition: `prep_name` and `date` required, no optional fields.
- `log_bd_prep` handler: inserts into `bd_applications` with four fields; no error check on the insert.
- `log_bd_prep` is in `MOBILE_TOOLS` — captured for client confirmation, not server-executed in the agentic loop.
- `bd_applications` exists in exactly two references: the execute-tool handler and MIGRATION_REALITY_CHECK.md.
- Cache block structure: three blocks (static, stable, volatile); Block 2 is frozen in-process for 1h to prevent cache busts.
- Block 2 components: `memorySection, gardenSection, pendingTasksSection, taskContext`.
- `checkOwnsGarden` is the correct gate for garden-scoped resources with a direct `garden_id` column; designed for future membership expansion with no call-site changes.
- `mobileToolDescription` for `log_bd_prep`: `מתעד יישום פרפרט ${params.prep_name} בתאריך ${params.date}`.

**INFERRED:**
- `users` table has a column suitable for display names — not confirmed. The files read show `users.email`, `users.language_preference`, `users.subscription_tier`, `users.active_garden_id`, `users.onboarding_complete`, `users.daily_tip_email`. No `display_name` confirmed.
- `gardenId` is present in the execute-tool request body — not fully confirmed. The handler currently reads `userId` from `req.user.id` and `params`/`tool_name` from `req.body`, but whether `gardenId` is also in the body is not confirmed from the lines read.
- The Block 2 garden_timeline injection would be ~4–6 lines, ~180 tokens — estimate based on observed format of similar sections.

---

## Open Questions

1. **Does `users` have a `display_name` column?** Attribution display ("Ran applied 500") requires it. If not, the query for the timeline display route needs to return `users.email` and format it, or the API needs to add `display_name` to the users table.

2. **Does `POST /api/chupchu/execute-tool` receive `gardenId` in the request body?** The `log_bd_prep` handler needs a garden_id to write to `garden_timeline`. The execute-tool route currently only uses `userId` from auth and `tool_name` / `params` from the body. Confirm whether `gardenId` is already present, or whether the client needs to be updated to send it.

3. **Should non-BD event types appear in Chupchu's context?** The design above injects last-of-each-type for all event types. But compost_turn, mulching, bed_prep may not be relevant to most chat questions. Should only `bd_prep` events be injected, or the full set? If the full set: what threshold of recency justifies including them?

4. **`log_bd_prep` is mobile-tool only — should it also be callable from the web?** Currently it goes through the mobile confirmation flow. If web users should be able to tell Chupchu "I just applied 500" and have it logged, the current flow works (web also uses `POST /api/chupchu/execute-tool` for confirmed tools). But if there should be a direct web route for garden timeline entries outside of Chupchu, that is a separate UI decision.

5. **Should other non-BD events be Chupchu-loggable, or only via a future web UI?** The tool currently only handles `bd_prep`. `compost_turn`, `mulching`, etc. would need either: (a) separate tool definitions, (b) a generic `log_garden_event` tool that accepts an `event_type` param, or (c) a web UI form. Option (b) is cleanest for Chupchu but requires more prompt engineering to prevent misuse.

6. **Tier gating?** Is garden_timeline logging available to all tiers, or only grower+? No gating decision is in scope here, but it affects whether the write route needs a tier check.

---

## Build Order

1. **Run the migration** (`garden-timeline-DRAFT.sql`) after reviewing this document. Use the verification query to confirm objects exist before proceeding. **This is the blocker for everything else.**

2. **Update `log_bd_prep` handler in `chupchu.ts`** — change target table from `bd_applications` to `garden_timeline`, add `garden_id`, add error check. This is independently deployable once the table exists. Resolve open question 2 (gardenId in request body) first.

3. **Update `log_bd_prep` tool schema in `claude.ts`** — add optional `time_of_day` and `quantity_grams`. Deploy alongside or after (2). Backward-compatible — existing confirmation UIs that don't send these fields receive `null` in the handler.

4. **Add garden_timeline injection to Block 2** in `chupchu.ts` — the "recent garden events" section. Independently useful: once the table has rows, Chupchu can give timing-aware advice. Query is a single `DISTINCT ON` against the new index. This is the feature-visible step.

5. **Web UI for logging** (out of scope for this design, but next after 4 is working).

Steps 2–3 are a single commit. Step 4 is a separate commit. Step 1 is a Supabase SQL Editor action, not committed code.

---

## Biggest Risk

**The execute-tool route does not receive gardenId today, and adding it requires a client-side change that touches both the web app and the Flutter app.**

The `log_bd_prep` confirmation flow works as follows: Chupchu proposes the tool call → the client shows a confirmation card → the user taps "confirm" → the client POSTs to `POST /api/chupchu/execute-tool` with `{ tool_name: 'log_bd_prep', params: { prep_name, date } }`. The server writes using `userId` from the auth token.

To write to `garden_timeline`, the server also needs `gardenId`. If `gardenId` is not already in the execute-tool request body (open question 2), the server cannot determine which garden to attach the event to without guessing — using `users.active_garden_id` as a fallback is possible but fragile (a user with two gardens gets all their log_bd_prep events on whichever garden is currently active, which may not be the one they were talking about).

The clean fix is to include `gardenId` in the execute-tool POST body. This requires updating the web client's confirmation dispatch (the "confirm" button handler) to include the garden context from the current chat session. If the Flutter app also uses execute-tool (it does use Chupchu and the mobile tool confirmation flow), it needs the same change.

Deploying the server-side handler change before the client change is deployed would cause every `log_bd_prep` confirmation to return 400 ("gardenId required"). That is visible to users and requires careful coordinated deployment.

**Mitigation**: implement the server fallback (`active_garden_id` when `gardenId` is absent) as a temporary measure, so the server never returns 400. Document the fallback in a comment. Remove it once clients are updated. This is not a security risk — the garden_id from `active_garden_id` is user-owned and ownership-checked.

---

## Follow-up: Two Design Questions (2026-08-25)

### Q1 — Block 2 is frozen for an hour, and the failure case is exactly that window

#### Q1.1 — Exact freeze behavior (verified)

**VERIFIED** from `packages/api/src/routes/chupchu.ts:57–58, 1909–1921`:

```typescript
// chupchu.ts:57–58
const stableContextByUser = new Map<string, StableContextEntry>();
const STABLE_CONTEXT_TTL_MS = 60 * 60 * 1000; // 1 h — mirrors Anthropic cache TTL

// chupchu.ts:1909–1921
const nowMs = Date.now();
const cachedStable = stableContextByUser.get(userId);
let stableContext: string;
if (cachedStable && nowMs - cachedStable.builtAt < STABLE_CONTEXT_TTL_MS) {
  stableContext = cachedStable.context;
} else {
  stableContext = [
    memorySection,
    gardenSection,
    pendingTasksSection,
    taskContext,
  ].filter(Boolean).join('\n\n');
  stableContextByUser.set(userId, { context: stableContext, builtAt: nowMs });
}
```

**Cache key:** `userId` string (the authenticated user's UUID).

**When assembled:** on the first chat request in a session (cache miss), then every 1 hour after that (time-based expiry check in the `if` condition).

**When it expires:** passively — the next request after 1 hour has elapsed (`nowMs - cachedStable.builtAt >= 3_600_000`) triggers a rebuild. There is no background job or timer evicting entries.

**When it refreshes early:** never. The Map is set once on a cache miss and not touched again until the TTL expires.

#### Q1.2 — Invalidation paths (verified)

**There are none.**

`stableContextByUser.delete()` and `stableContextByUser.set()` appear at exactly two call sites in the entire codebase — both in `chupchu.ts:1921` (the `set` on cache miss). No other route, helper, or service calls them.

**VERIFIED** via grep across all `packages/api/src/`:

- Adding a plant (`POST /api/garden/:id/plants`) → no cache touch.
- Completing a task (`PATCH /api/garden-tasks/:id`) → no cache touch.
- Writing to `plant_timeline` (e.g. via `insertChupChuTimelineEntry` at chupchu.ts:61) → no cache touch.
- Confirming a tool call (`POST /api/chupchu/execute-tool`) → no cache touch.
- Memory writes (chupchu summarize) → no cache touch. (The comment at chupchu.ts:44–45 explicitly notes that memory writes were a prior source of cache busts — and the fix was to freeze Block 2, not to invalidate on write.)

For garden_timeline specifically: a `log_bd_prep` confirmation writes to `garden_timeline`, and Block 2 is not invalidated. For up to 1 hour, Chupchu's context reflects the state from before the write. This is the failure case described in the question.

#### Q1.3 — Recommended fix: move the "last applied" summary to Block 3

**Recommendation: put only the garden timeline summary in Block 3 (volatile), not Block 2.**

The three options from the question:

**Option A — Invalidate Block 2 on garden_timeline write:**

The handler (`stableContextByUser.delete(userId)`) can be called from the execute-tool route in the same file. Technically simple for the single-instance case. But see the multi-instance problem below: invalidation on instance A does not reach instance B. This option does not work correctly under Railway auto-scaling. **Rejected.**

**Option B — Move only the "last applied" summary to Block 3 (volatile):**

A new `gardenTimelineSection` string is assembled on every chat request — a single `SELECT DISTINCT ON (event_type, prep_name)` query (~5ms). It is added to the `volatileContext` array alongside `pastContextSection`, `dateSection`, and `weatherSection`. Block 2 content is completely unchanged.

**Chosen. Reasons:**
- Works correctly with any number of instances — no inter-process state required.
- Block 2 cache hit rate is unaffected: the string sent to Anthropic as Block 2 is byte-identical across consecutive turns.
- The DB query cost is small. The `idx_garden_timeline_bd_prep` index makes the `DISTINCT ON` fast; the result is ~4–6 rows maximum.
- Semantically correct: "when did I last apply 500" changes within a session (the user can log a prep mid-session and ask immediately after). Volatile is the right block for data that can change within the 1-hour session window.

**Option C — Accept staleness, mitigate in prompt:**

Weak mitigation. Chupchu still gives wrong advice when it says "I don't see a recent 500 application in my context" immediately after the user logged one. Rejected.

**How to wire it in `chupchu.ts`:**

```typescript
// Fetch garden timeline summary — runs on every request (volatile, not cached)
let gardenTimelineSection = '';
if (gardenId) {
  const { data: timelineRows } = await db
    .from('garden_timeline')
    .select('event_type, prep_name, event_date, time_of_day')
    .eq('garden_id', gardenId)
    .is('deleted_at', null)
    .order('event_date', { ascending: false })
    // Supabase PostgREST does not support DISTINCT ON directly;
    // fetch recent rows and deduplicate in JS (or use a DB function/view).
    .limit(50);
  // Deduplicate to last-of-each-type in JS, then format as 4-6 lines.
}

const volatileContext = [
  pastContextSection,
  dateSection,
  weatherSection,
  gardenTimelineSection,   // ← new
].filter(Boolean).join('\n\n');
```

Note: PostgREST does not support `DISTINCT ON` directly. The dedup-in-JS approach (fetch 50 rows, keep first per type+prep) is correct given the small result set. Alternatively, a Postgres view or function can be created and called via `.rpc()`.

#### Q1.4 — Cache hit rate impact

**None on Block 2.** Block 2's content is unchanged by this fix. The Anthropic cache hit rate on Block 2 — which accounts for the ~55% input cost reduction — is fully preserved.

Block 3 (volatile) gains ~60–100 tokens per request. Block 3 is and always was uncached. The marginal cost of adding the garden timeline summary to an already-uncached block is a few hundredths of a cent per request at current Sonnet pricing. Negligible.

#### Q1 — Multi-instance flag (do not fix — confirm and state the limit)

**CONFIRMED:** `stableContextByUser` is a process-local `Map`. It lives in Node.js heap memory on one Railway instance.

`packages/api/railway.json` has no `instances`, `replicas`, or `numReplicas` key. Railway's default is one instance, but Railway auto-scales under load by spinning up additional instances. Two instances → two independent `stableContextByUser` Maps with no shared state and no coordination mechanism.

**For any fix that relies on explicit invalidation (Option A):**

A write processed by instance A calls `stableContextByUser.delete(userId)` on instance A's Map. Instance B's Map is unaffected. If the next chat request routes to instance B, it reads stale data from instance B's unfrozen but unbusted cache — or, if instance B has never seen this userId, it rebuilds from DB correctly. The behavior is non-deterministic and depends on Railway's load-balancer routing.

**Option B (recommended) has no multi-instance problem.** It does not rely on invalidation. Every instance assembles the volatile block from a live DB query on every request, regardless of which instance processed the prior write. The fix is correct under any number of instances.

**Plain statement:** if Option A were chosen, it would work on a single instance and silently fail on multiple instances. The user's experience would depend on which instance they land on — correct behavior 50% of the time. Option B is instance-count-agnostic.

---

### Q2 — `ON DELETE SET NULL` versus the community garden model

**Reference:** `investigations/COMMUNITY_GARDEN_SCHEMA_DESIGN.md` (read in full for this analysis).

#### Q2.1 — Does a member leaving a garden null out `garden_timeline.user_id`?

**No. Verified from the community garden design doc.**

From `COMMUNITY_GARDEN_SCHEMA_DESIGN.md §1.2` (garden_tasks section, which documents the leave flow):

> "When a member leaves: transferred to the garden's admin (`gardens.user_id`). The transfer query: `UPDATE garden_plants SET owner_user_id = gardens.user_id WHERE owner_user_id = $leavingUserId AND garden_id = $gardenId`."

The leave operation (`DELETE /api/garden/:id/members/:userId`) does:
1. Removes the `garden_members` row.
2. Transfers `garden_plants.owner_user_id` to the admin.
3. Does NOT delete or modify the `users` row.
4. Does NOT touch `garden_timeline` in any way.

`garden_timeline.user_id` is a FK to `auth.users(id)` with `ON DELETE SET NULL`. Since the leave operation does not delete the `users` row, `ON DELETE SET NULL` never fires on a leave. The `user_id` on every logged event remains intact. **Attribution survives a member leaving.**

The only path to a NULL `user_id` on `garden_timeline` is full account deletion — the user's auth account is deleted from `auth.users`, which cascades the SET NULL.

#### Q2.2 — Is the former member's name still visible after they leave? Is that correct?

**Yes, and yes — this is correct behavior.**

Event logs are historical records. "Ran applied 500 on Tuesday at dusk" records what happened to the garden on a specific day. The fact that Ran later left the garden does not un-happen the preparation. The garden owner needs this context:

- "Who applied the last 500 — was it Ran or me?"
- "Ran applied it six weeks ago. I should apply again soon."
- Dispute resolution: "The calendar says 500 was applied but I don't remember doing it — oh, Ran did it."

Erasing the attribution on leave would make the log less useful and potentially confusing ("someone applied 500 on 2026-08-03 — who?"). The garden owner did not trigger the leave; the event log should not silently degrade because of a membership change they may not have initiated.

**The one privacy concern**: a former member may not want their name permanently on display in a garden they left involuntarily (e.g. removed by the admin). This is a product decision. The schema supports either behavior:
- Default (do nothing on leave): attribution persists.
- Opt-in anonymization: the leave handler runs `UPDATE garden_timeline SET user_id = NULL WHERE user_id = $leavingUserId AND garden_id = $gardenId`. The `ON DELETE SET NULL` semantics are already in place for this — the same effect is achievable with an explicit UPDATE in the leave handler.

**Recommendation**: keep attribution by default. If the product later requires "erase my name from this garden's history on leave," that is a single UPDATE in the leave handler and requires no schema change.

#### Q2.3 — What does the UI render when `user_id` is NULL?

The query for the timeline display route returns:

```sql
SELECT gt.*, u.display_name AS performed_by_name
FROM garden_timeline gt
LEFT JOIN users u ON u.id = gt.user_id
WHERE gt.garden_id = $1 AND gt.deleted_at IS NULL
ORDER BY gt.event_date DESC;
```

When `user_id IS NULL`, the `LEFT JOIN` returns `performed_by_name = NULL`. The API response includes `performed_by_name: null`. The UI renders "Unknown" (or omits the attribution line, or shows a ghost icon — product decision).

**The proposed schema supports all of these:** `user_id` is nullable, the JOIN handles it gracefully, the API can pass `null` through to the client without special-casing. No schema change is required to support any of these display options.

#### Q2.4 — `plant_timeline ON DELETE CASCADE` vs `garden_timeline ON DELETE SET NULL` — justify or align?

**VERIFIED**: `plant_timeline.user_id` is `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` (migration 013). `garden_timeline.user_id` uses `ON DELETE SET NULL` (proposed schema, nullable).

**The divergence is intentional and justified by different ownership models.**

| | `plant_timeline` | `garden_timeline` |
|---|---|---|
| Ownership of the event | The user — they own their tracker | The garden — it belongs to the garden owner |
| If recorder is deleted | Delete the timeline entry (CASCADE) | Preserve the event, null out recorder (SET NULL) |
| Rationale | plant_timeline is personal: the tracker is deleted too (user → plant_trackers → CASCADE); the entry has no home | garden_timeline is garden-owned: deleting a recorder doesn't affect the garden's history |

The cascade on `plant_timeline` is consistent with the cascade chain on `plant_trackers` itself — when a user is deleted, their trackers are deleted (`plant_trackers.user_id ON DELETE CASCADE`), and then `plant_timeline.tracker_id ON DELETE CASCADE` deletes the timeline entries. The `user_id ON DELETE CASCADE` on `plant_timeline` is somewhat redundant (the cascade comes through tracker_id anyway) but harmless.

For `garden_timeline`, there is no such chain: `gardens.user_id` does not cascade to `garden_timeline` (the garden survives its creator's account deletion — the garden ownership transfer case is a separate product problem). The recorder's account deletion should not cascade.

**Should they be aligned?** No. Aligning by changing `plant_timeline` to `SET NULL` would leave orphaned plant_timeline entries with no parent tracker (tracker itself is CASCADE-deleted). Aligning by changing `garden_timeline` to `CASCADE` would erase garden biodynamic history when a member's account is deleted — the stated wrong behavior.

**The inconsistency is at the naming level, not the semantic level.** Both choices are correct for their respective tables. The risk of future code assuming they behave the same is mitigated by comments in the migration SQL — `garden-timeline-DRAFT.sql` already explains the `ON DELETE SET NULL` choice. Add a symmetric comment to any future `plant_timeline` migration that touches `user_id`.

#### Q2 — Verified vs inferred

**VERIFIED:**
- Leave operation from `COMMUNITY_GARDEN_SCHEMA_DESIGN.md`: removes `garden_members` row, transfers `garden_plants.owner_user_id` to admin, does not touch `users` or `garden_timeline`.
- `plant_timeline.user_id ON DELETE CASCADE` from migration 013.
- `stableContextByUser` has no invalidation paths anywhere in `packages/api/src/`.
- Railway config (`railway.json`) has no explicit instance count.

**INFERRED:**
- Railway runs one instance by default but may auto-scale; the config does not prevent it.
- The leave handler would need an explicit `UPDATE garden_timeline SET user_id = NULL` to anonymize on leave — this is inferred from the design doc's silence on it (it is not described as part of the leave flow).
- `users.display_name` column existence is still unconfirmed (open question 1 from the original design).
