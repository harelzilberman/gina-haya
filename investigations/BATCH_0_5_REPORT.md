# Batch 0.5 Report — `checkOwnsGardenScopedResource`

## Full source of the new helper

```typescript
/**
 * Ownership check for rows that carry both a user_id and a garden_id column
 * (e.g. plant_trackers, harvests, chupchu_conversations, recognition_history).
 *
 * Fast path: if row.user_id === userId the check resolves immediately with no
 * DB query — this is the common case and must stay free.
 *
 * Membership path: if the row is not directly owned AND garden_id is non-null,
 * delegates to checkOwnsGarden(row.garden_id, userId, context, _client) and
 * forwards its result verbatim (including db_error). This means that when
 * garden_members support is added inside checkOwnsGarden, all callers of
 * checkOwnsGardenScopedResource pick it up automatically — no change needed here.
 *
 * Null garden_id: if row.user_id !== userId and garden_id is null, returns
 * { ok: false, reason: 'not_owned' } without querying. Tables such as harvests
 * and chupchu_conversations allow a null garden_id for personal (non-garden) use.
 *
 * Fail-closed: null/undefined row.user_id never matches a real userId, so
 * malformed rows fall through to the denial paths rather than throwing.
 *
 * Adding garden_members support requires NO change to this function — edit only
 * checkOwnsGarden, and this helper inherits the new behaviour automatically.
 *
 * Serves: Category A routes operating on garden-scoped tables.
 */
export async function checkOwnsGardenScopedResource<
  T extends { user_id: string; garden_id: string | null },
>(
  row: T,
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<OwnershipResult> {
  // Fast path: direct owner — no DB query.
  if (row.user_id === userId) {
    const id =
      'id' in row && typeof (row as Record<string, unknown>).id === 'string'
        ? { id: (row as Record<string, unknown>).id as string }
        : undefined;
    return { ok: true, ...(id ? { data: id } : {}) };
  }

  // Non-owner: try garden membership if a garden_id is present.
  if (row.garden_id != null) {
    return checkOwnsGarden(row.garden_id, userId, context, _client);
  }

  // Non-owner with no garden reference — deny.
  if (context) {
    console.warn(
      `[checkOwnsGardenScopedResource] ${context} not owned (null garden_id)`,
      { rowUserId: row.user_id, requestUserId: userId },
    );
  }
  return { ok: false, reason: 'not_owned' };
}
```

---

## Updated module doc comment

The convention block at the top of `ownership.ts` was expanded with a "WHICH HELPER TO USE" section:

```
// ── WHICH HELPER TO USE (read this before converting a route) ────────────────
//
//   checkOwnsResourceByUserId  — ONLY for genuinely personal tables that have
//     no garden linkage at all: users, user_subscriptions, push_subscriptions,
//     notification_settings, chat_uses, chupchu_memory.  Synchronous; zero DB
//     queries; can NEVER become membership-aware because it has no garden
//     reference.  Do NOT use this for garden-scoped tables — the wrong choice
//     here will silently lock out community-garden members forever.
//
//   checkOwnsGardenScopedResource  — for rows that carry BOTH a user_id and a
//     garden_id column: plant_trackers, harvests, chupchu_conversations,
//     recognition_history, and similar garden-scoped tables.  Uses user_id
//     fast-path when possible; falls back to checkOwnsGarden (and therefore
//     picks up future garden_members logic automatically).
//
//   checkOwnsGardenPlant  — for rows linked via garden_plants_id rather than a
//     direct garden_id column.  Two-hop: garden_plants → gardens → user_id.
//
//   checkOwnsGarden  — when the resource IS a garden, or when you already have
//     the garden_id in scope and want a single-hop check.
```

---

## Confirmation: adding `garden_members` requires NO change to this helper

**Reasoning:**

`checkOwnsGardenScopedResource` does not implement membership logic itself. After the owner fast-path fails, it calls `checkOwnsGarden(row.garden_id, userId, context, _client)` and returns the result verbatim.

When `garden_members` support is added, it will land inside `checkOwnsGarden` as a second query after the `user_id` equality check fails — exactly as the doc comment in that function already describes:

> Adding garden_members support later requires editing ONLY this function body:
> add a second query for garden_members after the owner check fails, and return
> ok:true if the user is a member. No call sites change.

Since `checkOwnsGardenScopedResource` is a thin wrapper that delegates rather than re-implementing the membership logic, it inherits the change automatically. Zero edits needed here when community garden ships.

---

## Test results

```
── Results: 70 passed, 0 failed ──
```

13 new tests added (section [5]) covering:
- Owner fast path — no DB call (proved by an error-throwing mock)
- Owner fast path — row without id field
- Non-owner, garden owned → ok: true (delegated to checkOwnsGarden)
- Non-owner, garden not owned → not_owned
- Non-owner, null garden_id → not_owned, no DB call
- DB error during garden check → db_error forwarded (not collapsed to not_owned)
- Malformed/empty user_id → falls through to garden denial

All 57 pre-existing tests continue to pass.

---

## `git diff --stat`

```
 .claude/settings.local.json              |  7 ++-   ← pre-existing (in git status at session start)
 packages/api/src/tests/ownership.test.ts | 72 +++++++++++++++++++++++++++++-
 packages/api/src/utils/ownership.ts      | 79 ++++++++++++++++++++++++++++++++
 3 files changed, 156 insertions(+), 2 deletions(-)
```

Only `ownership.ts` and `ownership.test.ts` were changed by this batch. The `settings.local.json` modification was pre-existing before this session began (visible in the initial `git status`).
