import { Router } from 'express';
import { searchPlants } from '../db/queries/plants';

export const plantsRouter = Router();

// GET /api/plants?q=&lang=he
// Public — no auth required. Plants are public read (no RLS).
plantsRouter.get('/', async (req, res) => {
  const q = (req.query.q as string | undefined) ?? '';
  const lang = ((req.query.lang as string) === 'en' ? 'en' : 'he') as 'he' | 'en';

  try {
    const plants = await searchPlants(q, lang);
    return res.json(plants);
  } catch (err) {
    console.error('[plants]', err);
    return res.status(500).json({ error: 'Failed to fetch plants' });
  }
});
