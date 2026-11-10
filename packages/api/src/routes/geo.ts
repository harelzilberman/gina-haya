import { Router, type IRouter } from 'express';
import { verifyToken } from '../middleware/auth';
import { searchPlaces } from '../services/geo';

// ── /api/geo — place search for the garden city picker (web + mobile) ────────
export const geoRouter: IRouter = Router();

geoRouter.use(verifyToken);

// GET /api/geo/search?q=&lang=he|en
// Proxies the Open-Meteo geocoding API. Results are cached in memory for 24h.
// Returns [{ name, admin1, country, latitude, longitude, timezone }].
geoRouter.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const lang = req.query.lang === 'en' ? 'en' : 'he';

  if (q.length < 2) {
    return res.status(400).json({ error: 'query_too_short', message: 'q must be at least 2 characters' });
  }
  if (q.length > 100) {
    return res.status(400).json({ error: 'query_too_long', message: 'q must be at most 100 characters' });
  }

  try {
    const results = await searchPlaces(q, lang);
    res.json(results);
  } catch (err: any) {
    console.error('[GET /api/geo/search]', err?.message ?? err);
    res.status(502).json({ error: 'geocoding_unavailable' });
  }
});
