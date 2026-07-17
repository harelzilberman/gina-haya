import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const recognitionsRouter: IRouter = Router();

recognitionsRouter.use(verifyToken);

// Valid status values from the recognition_history CHECK constraint.
const VALID_STATUSES = ['pending', 'confirmed', 'wrong', 'retried'] as const;
type RecognitionStatus = typeof VALID_STATUSES[number];

// ── GET /api/recognitions ───────────────────────────────────────────────────
// Paginated list of the authenticated user's recognition history, newest first.
//
// Query params:
//   limit   — max rows to return (default 20, max 100)
//   offset  — rows to skip for pagination (default 0)
//   exclude — comma-separated status values to omit, e.g. "wrong,retried"
//             Only values from the enum are accepted; others are ignored.
//
// Response: Array of recognition rows, each containing:
//   id, result_json, confidence, status, photo_storage_key, created_at
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
      .select('id, result_json, confidence, status, photo_storage_key, created_at')
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
// Confirms a pending recognition.  Only { status: 'confirmed' } is accepted
// from the client — 'wrong' and 'retried' are set server-side by the retry
// flow and must not be overrideable here.
//
// Transition rules:
//   pending  → confirmed : 200 { id, status: 'confirmed' }
//   confirmed → confirmed: 200 idempotent (no DB write)
//   wrong | retried      : 409 { error: 'invalid_transition' }
//
// Own-row enforced: fetch by id + user_id; 404 if not found or not owned.
recognitionsRouter.patch('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id }  = req.params;

    // ── 1. Validate request body ───────────────────────────────────────────
    const { status } = req.body ?? {};
    if (status !== 'confirmed') {
      return res.status(400).json({ error: 'invalid_status', allowed: ['confirmed'] });
    }

    // ── 2. Fetch the row — enforces own-row and existence ─────────────────
    const { data: row, error: fetchErr } = await db
      .from('recognition_history')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !row) {
      return res.status(404).json({ error: 'recognition_not_found' });
    }

    // ── 3. Enforce transition rules ────────────────────────────────────────
    if (row.status === 'confirmed') {
      // Already confirmed — idempotent success, no DB write needed
      return res.json({ id: row.id, status: 'confirmed' });
    }

    if (row.status === 'wrong' || row.status === 'retried') {
      return res.status(409).json({ error: 'invalid_transition', current_status: row.status });
    }

    // row.status === 'pending' — the only remaining valid case

    // ── 4. Update ──────────────────────────────────────────────────────────
    const { error: updateErr } = await db
      .from('recognition_history')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .eq('user_id', userId);  // belt-and-braces ownership check on write

    if (updateErr) {
      console.error('[PATCH /api/recognitions/:id] update failed:', updateErr.message);
      return res.status(500).json({ error: 'failed_to_confirm_recognition' });
    }

    res.json({ id: row.id, status: 'confirmed' });
  } catch (err: any) {
    console.error('[PATCH /api/recognitions/:id] unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
