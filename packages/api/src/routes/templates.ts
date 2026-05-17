import 'dotenv/config';
import { Router } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const templatesRouter = Router();

const ADMIN_EMAIL = 'harelzilberman@gmail.com';

// GET /api/templates — public: returns all override rows (gallery + admin)
templatesRouter.get('/', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('garden_template_overrides')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/templates]', {
      message: err.message,
      code: (err as any).code,
      details: (err as any).details,
      hint: (err as any).hint,
    });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates — admin: bulk upsert overrides
templatesRouter.put('/', verifyToken, async (req: any, res) => {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // ── 1. Log raw body ───────────────────────────────────────────────────────
    const rawBody = req.body;
    console.log('[PUT /api/templates] raw body keys:', Object.keys(rawBody ?? {}));
    console.log('[PUT /api/templates] overrides count:', Array.isArray(rawBody?.overrides) ? rawBody.overrides.length : 'NOT AN ARRAY');

    const { overrides } = rawBody as { overrides: any[] };
    if (!Array.isArray(overrides) || overrides.length === 0) {
      return res.json({ ok: true, count: 0 });
    }

    // ── 2. Log first row for shape inspection (omit full elements payload) ────
    const firstRaw = overrides[0];
    console.log('[PUT /api/templates] first override shape:', {
      id: firstRaw?.id,
      keys: Object.keys(firstRaw ?? {}),
      elementsLength: Array.isArray(firstRaw?.elements) ? firstRaw.elements.length : typeof firstRaw?.elements,
    });

    const rows = overrides.map(o => ({
      id: o.id,
      title_he: o.title_he ?? null,
      title_en: o.title_en ?? null,
      description_he: o.description_he ?? null,
      description_en: o.description_en ?? null,
      is_hidden: Boolean(o.is_hidden),
      sort_order: Number(o.sort_order) || 0,
      icon: o.icon ?? null,
      category_he: o.category_he ?? null,
      category_en: o.category_en ?? null,
      is_custom: Boolean(o.is_custom),
      elements: o.elements ?? null,
      updated_at: new Date().toISOString(),
    }));

    // ── 3. Probe table existence before upsert ────────────────────────────────
    const { error: probeError } = await db
      .from('garden_template_overrides')
      .select('id')
      .limit(1);
    if (probeError) {
      console.error('[PUT /api/templates] TABLE PROBE FAILED — table may not exist:', JSON.stringify(probeError));
      return res.status(500).json({ error: `Table probe failed: ${probeError.message}` });
    }
    console.log('[PUT /api/templates] table probe OK, proceeding with upsert of', rows.length, 'rows');

    // ── 4. Upsert ─────────────────────────────────────────────────────────────
    const { error } = await db
      .from('garden_template_overrides')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[PUT /api/templates] UPSERT FAILED:', JSON.stringify(error));
      console.error('[PUT /api/templates] upsert error detail:', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      throw error;
    }

    console.log('[PUT /api/templates] upsert OK, count:', rows.length);
    res.json({ ok: true, count: rows.length });
  } catch (err: any) {
    console.error('[PUT /api/templates] CAUGHT EXCEPTION:', err?.message ?? String(err));
    console.error('[PUT /api/templates] full exception:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
});

// DELETE /api/templates/:id — admin: remove an override row
templatesRouter.delete('/:id', verifyToken, async (req: any, res) => {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { error } = await db
      .from('garden_template_overrides')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[DELETE /api/templates/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});
