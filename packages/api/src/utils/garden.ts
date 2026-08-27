import { db } from '../db/client';

// ── Garden resolution helper ─────────────────────────────────────────────────
//
// Single source of truth for "which garden does this request act on?".
// Before this helper existed, /chat and execute-tool each had their own
// inline resolution logic and had drifted — /chat had a three-step fallback
// chain, execute-tool had only two steps and never queried the gardens table.
// The mismatch caused execute-tool to fail for every user whose users.active_garden_id
// is NULL (38 of 40 users have a default garden; only 2 of 49 have active_garden_id set).
//
// Resolution order:
//   1. bodyGardenId — caller-supplied; validated against userId before returning.
//   2. users.active_garden_id — DB lookup with error check; validated it still exists.
//   3. gardens WHERE user_id = userId AND is_default = true — the reliable case (95%).
//   4. If the user has exactly one garden (any), use it.
//   5. Unresolved: return reason + the user's gardens so the caller can name them.
//
// The _client parameter is a testing seam (same convention as ownership.ts).
// Pass the real `db` in all production code — never reference _client outside
// this file or tests.

export type GardenResolutionReason =
  | 'resolved-from-body'
  | 'resolved-from-active'
  | 'resolved-from-default'
  | 'resolved-only-garden'
  | 'ambiguous-multiple-gardens'
  | 'no-gardens'
  | 'db-error';

export interface GardenResolutionResult {
  gardenId: string | null;
  reason: GardenResolutionReason;
  /** Present when reason is 'ambiguous-multiple-gardens' or 'no-gardens'. */
  gardens?: { id: string; name: string }[];
}

/**
 * Resolves which garden a request should act on, in priority order.
 *
 * Never throws. All DB errors are caught and returned as reason:'db-error'.
 *
 * @param userId        - Authenticated user id.
 * @param bodyGardenId  - Optional garden id supplied by the client in the request body.
 * @param _client       - Testing seam. Always omit in production.
 */
export async function resolveGardenId(
  userId: string,
  bodyGardenId?: string | null,
  /* @internal */ _client: typeof db = db,
): Promise<GardenResolutionResult> {

  // ── Step 1: explicit caller-supplied garden id ──────────────────────────
  if (bodyGardenId) {
    const { data, error } = await _client
      .from('gardens')
      .select('id')
      .eq('id', bodyGardenId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[resolveGardenId] step 1 DB error:', error.message, { userId, bodyGardenId });
      return { gardenId: null, reason: 'db-error' };
    }
    if (data) {
      return { gardenId: (data as any).id as string, reason: 'resolved-from-body' };
    }
    // bodyGardenId supplied but doesn't belong to this user — do not trust it.
    console.warn('[resolveGardenId] bodyGardenId not owned:', bodyGardenId, 'user:', userId);
    // Fall through to other steps.
  }

  // ── Step 2: users.active_garden_id ─────────────────────────────────────
  {
    const { data: userRow, error: userErr } = await _client
      .from('users')
      .select('active_garden_id')
      .eq('id', userId)
      .single();

    if (userErr) {
      console.error('[resolveGardenId] step 2 users query error:', userErr.message, { userId });
      return { gardenId: null, reason: 'db-error' };
    }

    const activeId = (userRow as any)?.active_garden_id as string | null | undefined;
    if (activeId) {
      // Validate the id still belongs to this user and the garden still exists.
      const { data: activeGarden, error: activeErr } = await _client
        .from('gardens')
        .select('id')
        .eq('id', activeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (activeErr) {
        console.error('[resolveGardenId] step 2 active garden validation error:', activeErr.message, { userId, activeId });
        return { gardenId: null, reason: 'db-error' };
      }
      if (activeGarden) {
        return { gardenId: (activeGarden as any).id as string, reason: 'resolved-from-active' };
      }
      // active_garden_id stale (garden deleted or transferred) — fall through.
      console.warn('[resolveGardenId] active_garden_id stale:', activeId, 'user:', userId);
    }
  }

  // ── Steps 3–5 require fetching the user's gardens ──────────────────────
  const { data: allGardens, error: allErr } = await _client
    .from('gardens')
    .select('id, name, is_default')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (allErr) {
    console.error('[resolveGardenId] step 3 gardens query error:', allErr.message, { userId });
    return { gardenId: null, reason: 'db-error' };
  }

  const rows = (allGardens ?? []) as { id: string; name: string; is_default: boolean }[];

  if (rows.length === 0) {
    return { gardenId: null, reason: 'no-gardens', gardens: [] };
  }

  // ── Step 3: garden with is_default = true ───────────────────────────────
  const defaultGarden = rows.find(g => g.is_default);
  if (defaultGarden) {
    return { gardenId: defaultGarden.id, reason: 'resolved-from-default' };
  }

  // ── Step 4: exactly one garden, no default set ──────────────────────────
  if (rows.length === 1) {
    return { gardenId: rows[0].id, reason: 'resolved-only-garden' };
  }

  // ── Step 5: multiple gardens, no default, no active_garden_id ───────────
  return {
    gardenId: null,
    reason: 'ambiguous-multiple-gardens',
    gardens: rows.map(g => ({ id: g.id, name: g.name })),
  };
}
