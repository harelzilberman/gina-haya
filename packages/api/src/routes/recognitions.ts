import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const recognitionsRouter: IRouter = Router();

recognitionsRouter.use(verifyToken);

// Valid status values from the recognition_history CHECK constraint.
// 'linked' added in migration 031 — a recognition graduates to linked when
// the plant is added to the user's garden (garden_plants_id set simultaneously).
const VALID_STATUSES = ['pending', 'confirmed', 'wrong', 'retried', 'linked'] as const;
type RecognitionStatus = typeof VALID_STATUSES[number];

// ── GET /api/recognitions ───────────────────────────────────────────────────
// Paginated list of the authenticated user's recognition history, newest first.
//
// Query params:
//   limit   — max rows to return (default 20, max 100)
//   offset  — rows to skip for pagination (default 0)
//   exclude — comma-separated status values to omit, e.g. "wrong,retried,linked"
//             Only values from the enum are accepted; others are ignored.
//
// Response: Array of recognition rows, each containing:
//   id, result_json, confidence, status, photo_storage_key, garden_plants_id, created_at
//
// Own-rows enforced via WHERE user_id = $userId (server-side, not RLS alone).
recognitionsRouter.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;

    const rawLimit  = parseInt(String(req.query.limit  ?? '20'), 10);
    const rawOffset = parseInt(String(req.query.offset ?? '0'),  10);

    const limit  = Number.isFinite(rawLimit)  && rawLimit  > 0 ? Math.min(rawLimit,  100) : 20;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    // Parse optional exclude param — only accept known enum values, silently
    // drop anything else so a bad param never causes a DB error.
    const excludedStatuses: RecognitionStatus[] = [];
    if (typeof req.query.exclude === 'string' && req.query.exclude.trim()) {
      for (const raw of req.query.exclude.split(',')) {
        const s = raw.trim() as RecognitionStatus;
        if (VALID_STATUSES.includes(s)) excludedStatuses.push(s);
      }
    }

    let query = db
      .from('recognition_history')
      .select('id, result_json, confidence, status, photo_storage_key, garden_plants_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply exclusion filter when provided — each neq() narrows the result set
    for (const s of excludedStatuses) {
      query = query.neq('status', s);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/recognitions]', error.message);
      return res.status(500).json({ error: 'failed_to_fetch_recognitions' });
    }

    res.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/recognitions] unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/recognitions/:id ─────────────────────────────────────────────
// Updates a recognition's status.  Two client-writable transitions:
//
//   { status: 'confirmed' }
//     pending   → confirmed : 200 { id, status: 'confirmed' }
//     confirmed → confirmed : 200 idempotent (no DB write)
//     wrong | retried | linked : 409 { error: 'invalid_transition' }
//       linked is blocked because the recognition has already graduated to a
//       garden plant; re-confirming would leave a stale garden_plants_id on a
//       row that looks un-linked to the query layer.
//
//   { status: 'linked', garden_plants_id: '<uuid>' }
//     guard is keyed on garden_plants_id, not on current status:
//       row.garden_plants_id null               : proceed
//       row.garden_plants_id === requested      : 200 idempotent
//       row.garden_plants_id !== requested      : 400 { error: 'already_linked_to_other_plant' }
//     wrong | retried (no garden_plants_id set) : 400 { error: 'cannot_link_invalidated_recognition' }
//     garden_plants_id missing from body        : 400
//     garden_plant not owned                   : 404 { error: 'garden_plant_not_found' }
//
// 'wrong' and 'retried' are set server-side by the retry flow and are blocked
// from client override here.
//
// Own-row enforced: fetch by id + user_id; 404 if not found or not owned.
recognitionsRouter.patch('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id }  = req.params;

    // ── 1. Validate request body ───────────────────────────────────────────
    const { status, garden_plants_id } = req.body ?? {};

    if (status !== 'confirmed' && status !== 'linked') {
      return res.status(400).json({ error: 'invalid_status', allowed: ['confirmed', 'linked'] });
    }

    if (status === 'linked') {
      if (!garden_plants_id || typeof garden_plants_id !== 'string') {
        return res.status(400).json({ error: 'garden_plants_id_required' });
      }
    }

    // ── 2. Fetch the recognition row — enforces own-row and existence ──────
    const { data: row, error: fetchErr } = await db
      .from('recognition_history')
      .select('id, user_id, status, garden_plants_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !row) {
      return res.status(404).json({ error: 'recognition_not_found' });
    }

    // ── 4. Route by requested status ──────────────────────────────────────

    if (status === 'confirmed') {
      // wrong, retried, and linked cannot be re-confirmed.
      // wrong/retried: invalidated by the retry flow — no going back.
      // linked: recognition has already graduated to a garden plant; "confirming"
      // it again would be meaningless and would silently leave a stale garden_plants_id
      // on a row that looks un-linked to the query layer.
      if (row.status === 'wrong' || row.status === 'retried' || row.status === 'linked') {
        return res.status(409).json({ error: 'invalid_transition', current_status: row.status });
      }

      if (row.status === 'confirmed') {
        // Idempotent — no DB write needed
        return res.json({ id: row.id, status: 'confirmed' });
      }

      // row.status === 'pending' (only remaining valid case after checks above)
      const { error: updateErr } = await db
        .from('recognition_history')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .eq('user_id', userId);  // belt-and-braces ownership check on write

      if (updateErr) {
        console.error('[PATCH /api/recognitions/:id] confirm update failed:', updateErr.message);
        return res.status(500).json({ error: 'failed_to_confirm_recognition' });
      }

      return res.json({ id: row.id, status: 'confirmed' });
    }

    // status === 'linked'

    // Guard A: only pending/confirmed/linked may transition to linked.
    // wrong/retried are invalidated states that must never be linked to a plant.
    // Returns 400 (not 409) so callers can distinguish "invalidated" from a
    // generic confirm-path invalid_transition.
    if (row.status !== 'pending' && row.status !== 'confirmed' && row.status !== 'linked') {
      console.warn(`[recognitions] rejected link: id=${id} status=${row.status} attempted_plant=${garden_plants_id}`);
      return res.status(400).json({ error: 'cannot_link_invalidated_recognition' });
    }

    // Guard B: keyed on garden_plants_id, not on status.
    // A stale garden_plants_id can survive a linked→confirmed transition, so
    // checking status alone would allow a bypass (linked→confirmed→linked(B)).
    // We check the data column directly, regardless of current status.
    if (row.garden_plants_id) {
      if (row.garden_plants_id === garden_plants_id) {
        // Idempotent — already linked to the requested plant.
        return res.json({ id: row.id, status: row.status, garden_plants_id: row.garden_plants_id });
      }
      // Linked to a different plant — reject regardless of current status.
      console.warn(`[recognitions] rejected link: id=${id} status=${row.status} existing_plant=${row.garden_plants_id} attempted_plant=${garden_plants_id}`);
      return res.status(400).json({ error: 'already_linked_to_other_plant' });
    }

    // row.garden_plants_id is null — allowed to link

    // ── 5. Verify garden plant ownership ──────────────────────────────────
    // Join through gardens to confirm the plant belongs to this user.
    const { data: gp, error: gpErr } = await db
      .from('garden_plants')
      .select('id, garden_id, gardens!inner(user_id)')
      .eq('id', garden_plants_id)
      .single();

    if (gpErr || !gp) {
      return res.status(404).json({ error: 'garden_plant_not_found' });
    }

    const gardenUserId = (gp as any).gardens?.user_id;
    if (gardenUserId !== userId) {
      return res.status(403).json({ error: 'garden_plant_not_owned' });
    }

    // ── 6. Update to linked ────────────────────────────────────────────────
    const { error: updateErr } = await db
      .from('recognition_history')
      .update({ status: 'linked', garden_plants_id })
      .eq('id', id)
      .eq('user_id', userId);  // belt-and-braces ownership check on write

    if (updateErr) {
      console.error('[PATCH /api/recognitions/:id] link update failed:', updateErr.message);
      return res.status(500).json({ error: 'failed_to_link_recognition' });
    }

    return res.json({ id: row.id, status: 'linked', garden_plants_id });

  } catch (err: any) {
    console.error('[PATCH /api/recognitions/:id] unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
