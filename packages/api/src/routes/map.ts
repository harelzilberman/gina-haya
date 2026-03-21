import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const mapRouter: IRouter = Router();

mapRouter.use(verifyToken);

// ── GET /api/map ─────────────────────────────────────────────────────────────
// Returns the user's garden map, creating a blank one if none exists
mapRouter.get('/', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('garden_maps')
      .select('id, width_m, height_m, beds')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      // Return a default empty map — will be persisted on first save
      return res.json({ id: null, width_m: 10, height_m: 8, beds: [] });
    }

    res.json(data);
  } catch (err: any) {
    console.error('[GET /api/map]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/map ─────────────────────────────────────────────────────────────
// Upsert (create or replace) the user's garden map
mapRouter.post('/', async (req: any, res) => {
  try {
    const { id, width_m = 10, height_m = 8, beds = [] } = req.body;

    // Validate dimensions
    const w = Math.max(2, Math.min(50, Number(width_m) || 10));
    const h = Math.max(2, Math.min(50, Number(height_m) || 8));

    let result: any;

    if (id) {
      // Update existing map (verify ownership)
      const { data, error } = await db
        .from('garden_maps')
        .update({ width_m: w, height_m: h, beds, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select('id, width_m, height_m, beds')
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new map (delete any previous one first to keep 1 map per user)
      await db.from('garden_maps').delete().eq('user_id', req.user.id);

      const { data, error } = await db
        .from('garden_maps')
        .insert({ user_id: req.user.id, width_m: w, height_m: h, beds })
        .select('id, width_m, height_m, beds')
        .single();

      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[POST /api/map]', err.message);
    res.status(500).json({ error: err.message });
  }
});
