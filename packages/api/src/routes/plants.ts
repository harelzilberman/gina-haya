import { Router, type IRouter } from 'express';
import { db } from '../db/client';

export const plantsRouter: IRouter = Router();

// GET /api/plants?search=tomato&category=vegetables&lang=he
plantsRouter.get('/', async (req, res) => {
  try {
    const { search, category, lang = 'he' } = req.query as {
      search?: string;
      category?: string;
      lang?: string;
    };

    let query = db
      .from('plants')
      .select('id, common_name_he, common_name_en, latin_name, category, day_type_affinity, description_he, description_en')
      .limit(50);

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(
        `common_name_he.ilike.%${s}%,common_name_en.ilike.%${s}%,latin_name.ilike.%${s}%`
      );
    }

    if (category) {
      query = query.eq('category', category);
    }

    // Order by name in selected language
    query = query.order(lang === 'he' ? 'common_name_he' : 'common_name_en');

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err: any) {
    console.error('[GET /api/plants]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plants/:id
plantsRouter.get('/:id', async (req, res) => {
  try {
    const { data, error } = await db
      .from('plants')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Plant not found' });

    res.json(data);
  } catch (err: any) {
    console.error('[GET /api/plants/:id]', err);
    res.status(500).json({ error: err.message });
  }
});
