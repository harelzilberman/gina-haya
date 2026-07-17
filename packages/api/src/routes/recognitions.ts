import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const recognitionsRouter: IRouter = Router();

recognitionsRouter.use(verifyToken);

// ── GET /api/recognitions ───────────────────────────────────────────────────
// Paginated list of the authenticated user's recognition history, newest first.
//
// Query params:
//   limit  — max rows to return (default 20, max 100)
//   offset — number of rows to skip for pagination (default 0)
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

    const { data, error } = await db
      .from('recognition_history')
      .select('id, result_json, confidence, status, photo_storage_key, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
