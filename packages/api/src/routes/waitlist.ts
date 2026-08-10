import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db/client';

export const waitlistRouter: IRouter = Router();

// Stricter limit than the global one — this is a public, unauthenticated
// write endpoint and a natural target for signup spam.
const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const waitlistSchema = z.object({
  email:        z.string().trim().toLowerCase().email(),
  source:       z.string().max(64).optional(),
  locale:       z.enum(['he', 'en']).optional(),
  product_id:   z.string().max(128).optional(),
  product_name: z.string().max(256).optional(),
  notes:        z.string().max(2000).optional(),
  category:     z.string().max(64).optional(),
});

// ── POST /api/waitlist ────────────────────────────────────────────────────
// Public signup for the mobile-app "coming soon" waitlist (LandingPage)
// and the shop product waitlist ("ספרו לי כשמוכן" on wood/biodynamic cards).
// Requires the `waitlist_signups` table — see packages/api/sql/waitlist_signups.sql.
waitlistRouter.post('/', waitlistLimiter, async (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const { email, source, locale, product_id, product_name, notes, category } = parsed.data;

  try {
    const { error } = await db
      .from('waitlist_signups')
      .insert({
        email,
        source:       source       ?? 'landing_page',
        locale:       locale       ?? 'he',
        product_id:   product_id   ?? null,
        product_name: product_name ?? null,
        notes:        notes        ?? null,
        category:     category     ?? null,
      });

    // Unique violation on email — treat as a successful (idempotent) signup
    // rather than an error, so the UI doesn't need to special-case it.
    if (error && error.code !== '23505') {
      throw error;
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[POST /api/waitlist]', err.message);
    return res.status(500).json({ error: 'signup_failed' });
  }
});
