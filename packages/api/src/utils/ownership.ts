import { db } from '../db/client';

// ── Ownership helper convention ─────────────────────────────────────────────
//
// TWO GENERATIONS of helpers live here during the transition period:
//
//   LEGACY (boolean return) — do not use in new code:
//     userOwnsGarden(gardenId, userId)            → Promise<boolean>
//     userOwnsGardenPlant(gardenPlantId, userId)  → Promise<boolean>
//
//   NEW (discriminated OwnershipResult) — use for all new code and
//   for call sites converted during the ownership-refactor batches:
//     checkOwnsGarden(...)                        → Promise<OwnershipResult>
//     checkOwnsGardenPlant(...)                   → Promise<OwnershipResult>
//     checkOwnsGardenPlantWithExistence(...)      → Promise<OwnershipResultWithExistence>
//     checkOwnsResourceByUserId(...)              → OwnershipResult  (sync, no DB)
//     checkOwnsGardenScopedResource(...)          → Promise<OwnershipResult>
//     checkOwnsGardenAndPlants(...)               → Promise<BulkOwnershipResult>
//
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
//
// Call sites may return 403 on reason:'not_owned', 404 on reason:'not_found',
// and 500 on reason:'db_error'. The boolean helpers collapse these into false.
// ────────────────────────────────────────────────────────────────────────────

// ── Shared types ─────────────────────────────────────────────────────────────

export interface OwnershipResult {
  ok: boolean;
  reason?: 'not_found' | 'not_owned' | 'db_error';
  data?: { id: string };
}

export interface OwnershipResultWithExistence extends OwnershipResult {
  /**
   * true  → the resource row exists in the DB (ownership may still be denied)
   * false → the resource row does not exist
   * undefined → unknown (db_error before existence could be determined)
   */
  exists?: boolean;
}

export interface BulkOwnershipResult {
  ok: boolean;         // true if at least one plant passed
  gardenOwned: boolean; // false → caller should return 403
  owned_ids: string[];
  skipped_ids: string[];
  reason?: 'db_error'; // present when a DB error prevented plant lookup
}

// ── LEGACY helpers (boolean return) — left unchanged for existing call sites ─

/**
 * Returns true if userId owns the garden identified by gardenId.
 * On DB error or missing row, returns false. Never throws.
 */
export async function userOwnsGarden(gardenId: string, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from('gardens')
    .select('id')
    .eq('id', gardenId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[userOwnsGarden] DB error:', error.message, { gardenId, userId });
    return false;
  }
  return data !== null;
}

/**
 * Returns true if userId owns the garden_plants row identified by gardenPlantId.
 * Ownership is transitive: garden_plants.garden_id → gardens.user_id.
 * On DB error or missing row, returns false. Never throws.
 */
export async function userOwnsGardenPlant(gardenPlantId: string, userId: string): Promise<boolean> {
  // Step 1: fetch garden_id from garden_plants (no user_id column on garden_plants)
  const { data: gp, error: gpError } = await db
    .from('garden_plants')
    .select('garden_id')
    .eq('id', gardenPlantId)
    .maybeSingle();
  if (gpError) {
    console.error('[userOwnsGardenPlant] DB error fetching garden_plant:', gpError.message, { gardenPlantId, userId });
    return false;
  }
  if (!gp) return false;

  // Step 2: verify the garden belongs to the user
  return userOwnsGarden(gp.garden_id, userId);
}

// ── NEW helpers (discriminated result) ───────────────────────────────────────

// _client is an internal testing seam. Pass the real `db` in all production
// code paths — this parameter exists only to allow unit tests to inject a mock
// without touching call sites. Never reference it outside this file or tests.

/**
 * Checks whether userId owns the garden identified by gardenId.
 *
 * Returns { ok: true, data: { id } } on success.
 * Returns { ok: false, reason: 'not_owned' } if garden doesn't exist OR is
 *   owned by a different user (intentionally indistinguishable — 403 either way).
 * Returns { ok: false, reason: 'db_error' } on a Supabase error (logged).
 *
 * Adding garden_members support later requires editing ONLY this function body:
 * add a second query for garden_members after the owner check fails, and return
 * ok:true if the user is a member. No call sites change.
 *
 * Serves: Categories A (resource IS a garden), B (step 2 of two-hop join), D
 * (garden-level gate before bulk operations).
 */
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
    console.error(
      `[checkOwnsGarden]${context ? ` ${context}` : ''} DB error:`,
      error.message,
      { gardenId, userId },
    );
    return { ok: false, reason: 'db_error' };
  }
  if (!data) {
    return { ok: false, reason: 'not_owned' };
  }
  return { ok: true, data: { id: (data as any).id as string } };
}

/**
 * Checks whether userId owns the garden_plants row identified by gardenPlantId.
 * Ownership is transitive: garden_plants.garden_id → gardens.user_id.
 *
 * Does NOT distinguish "plant doesn't exist" from "plant belongs to a different
 * garden" — both return reason:'not_owned' (403 in both cases). Use
 * checkOwnsGardenPlantWithExistence when a distinct 404 vs 403 is required.
 *
 * DB cost: 2 queries. For routes that already have the plant's garden_id in
 * scope, call checkOwnsGarden(garden_id, userId) directly to save a round trip.
 *
 * Serves: Categories B (full two-hop replacement), C (request-body plant ID).
 */
export async function checkOwnsGardenPlant(
  gardenPlantId: string,
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<OwnershipResult> {
  // Step 1: fetch garden_id from garden_plants
  const { data: gp, error: gpError } = await _client
    .from('garden_plants')
    .select('garden_id')
    .eq('id', gardenPlantId)
    .maybeSingle();

  if (gpError) {
    console.error(
      `[checkOwnsGardenPlant]${context ? ` ${context}` : ''} DB error fetching plant:`,
      gpError.message,
      { gardenPlantId, userId },
    );
    return { ok: false, reason: 'db_error' };
  }
  if (!gp) {
    return { ok: false, reason: 'not_owned' };
  }

  // Step 2: verify the garden belongs to the user
  return checkOwnsGarden((gp as any).garden_id as string, userId, context, _client);
}

/**
 * Like checkOwnsGardenPlant, but distinguishes existence from ownership.
 *
 * Returns { ok: false, reason: 'not_found',  exists: false } → 404 (plant gone)
 * Returns { ok: false, reason: 'not_owned',  exists: true  } → 403 (wrong user)
 * Returns { ok: false, reason: 'db_error',   exists: false } → 500
 * Returns { ok: true,                        exists: true, data: { id } } → proceed
 *
 * DB cost: 2 queries (existence + garden ownership).
 *
 * Serves: Category F (routes that must return distinct 404 vs 403).
 */
export async function checkOwnsGardenPlantWithExistence(
  gardenPlantId: string,
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<OwnershipResultWithExistence> {
  // Step 1: check existence without user filter
  const { data: gp, error: gpError } = await _client
    .from('garden_plants')
    .select('id, garden_id')
    .eq('id', gardenPlantId)
    .maybeSingle();

  if (gpError) {
    console.error(
      `[checkOwnsGardenPlantWithExistence]${context ? ` ${context}` : ''} DB error:`,
      gpError.message,
      { gardenPlantId, userId },
    );
    return { ok: false, reason: 'db_error', exists: false };
  }
  if (!gp) {
    return { ok: false, reason: 'not_found', exists: false };
  }

  // Step 2: verify garden ownership
  const gardenCheck = await checkOwnsGarden(
    (gp as any).garden_id as string,
    userId,
    context,
    _client,
  );
  if (!gardenCheck.ok) {
    return {
      ok: false,
      reason: gardenCheck.reason === 'db_error' ? 'db_error' : 'not_owned',
      exists: true,
    };
  }

  return { ok: true, exists: true, data: { id: (gp as any).id as string } };
}

/**
 * Synchronous ownership check on an already-fetched row with a user_id column.
 * Zero DB queries — validates that row.user_id matches the authenticated userId.
 *
 * Use this when the route has already read the row for other reasons (existence
 * check, data access) and just needs to gate ownership before proceeding.
 *
 * Returns { ok: false, reason: 'not_owned' } if row.user_id !== userId.
 * Returns { ok: true, data: { id } } if the row has an id field; { ok: true }
 * otherwise.
 *
 * Serves: Category A (route has the row), Category F (already fetched for
 * existence, now validate ownership for free).
 */
export function checkOwnsResourceByUserId<T extends { user_id: string }>(
  row: T,
  userId: string,
  context?: string,
): OwnershipResult {
  if (row.user_id !== userId) {
    if (context) {
      console.warn(
        `[checkOwnsResourceByUserId] ${context} not owned`,
        { rowUserId: row.user_id, requestUserId: userId },
      );
    }
    return { ok: false, reason: 'not_owned' };
  }
  const id =
    'id' in row && typeof (row as Record<string, unknown>).id === 'string'
      ? { id: (row as Record<string, unknown>).id as string }
      : undefined;
  return { ok: true, ...(id ? { data: id } : {}) };
}

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

/**
 * Bulk ownership check: verifies that userId owns gardenId, then returns which
 * of the requested plantIds are active (non-archived) members of that garden.
 * Items that fail either check appear in skipped_ids rather than failing the
 * entire request (partial-success semantics matching the bulk-archive route).
 *
 * Returns:
 *   gardenOwned: false   → caller should return 403 immediately
 *   ok: false, reason: 'db_error' → caller should return 500
 *   ok: false (no plants matched) but gardenOwned: true → return 200 with all skipped
 *   ok: true → proceed with owned_ids; surface skipped_ids in response
 *
 * DB cost: 2 queries (garden ownership + plant batch fetch).
 *
 * Note: this helper is garden-scoped. If a future bulk endpoint accepts plants
 * from multiple gardens, a different approach is needed — flag it then, not now.
 *
 * Serves: Category D (bulk/array operations).
 */
export async function checkOwnsGardenAndPlants(
  gardenId: string,
  plantIds: string[],
  userId: string,
  context?: string,
  /* @internal */ _client: typeof db = db,
): Promise<BulkOwnershipResult> {
  // Step 1: verify garden ownership
  const gardenCheck = await checkOwnsGarden(gardenId, userId, context, _client);
  if (!gardenCheck.ok) {
    return {
      ok: false,
      gardenOwned: false,
      owned_ids: [],
      skipped_ids: plantIds,
    };
  }

  // Short-circuit if no plant IDs were supplied
  if (plantIds.length === 0) {
    return {
      ok: false,
      gardenOwned: true,
      owned_ids: [],
      skipped_ids: [],
    };
  }

  // Step 2: find which of the requested plant IDs are active in this garden
  const { data: eligible, error: eligibleErr } = await _client
    .from('garden_plants')
    .select('id')
    .in('id', plantIds)
    .eq('garden_id', gardenId)
    .is('archived_at', null);

  if (eligibleErr) {
    console.error(
      `[checkOwnsGardenAndPlants]${context ? ` ${context}` : ''} DB error fetching plants:`,
      eligibleErr.message,
      { gardenId, userId },
    );
    return {
      ok: false,
      gardenOwned: true,
      reason: 'db_error',
      owned_ids: [],
      skipped_ids: plantIds,
    };
  }

  const eligibleIds = (eligible ?? []).map((p: any) => p.id as string);
  const eligibleSet = new Set(eligibleIds);
  const skippedIds = plantIds.filter(id => !eligibleSet.has(id));

  return {
    ok: eligibleIds.length > 0,
    gardenOwned: true,
    owned_ids: eligibleIds,
    skipped_ids: skippedIds,
  };
}
