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
  email:  z.string().trim().toLowerCase().email(),
  source: z.string().max(64).optional(),
  locale: z.enum(['he', 'en']).optional(),
});

// ── POST /api/waitlist ────────────────────────────────────────────────────
// Public signup for the mobile app "coming soon" waitlist (see LandingPage
// MobileAppComingSoon section). Requires the `waitlist_signups` table —
// see packages/api/sql/waitlist_signups.sql for the migration to run in the
// Supabase SQL editor.
waitlistRouter.post('/', waitlistLimiter, async (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const { email, source, locale } = parsed.data;

  try {
    const { error } = await db
      .from('waitlist_signups')
      .insert({ email, source: source ?? 'landing_page', locale: locale ?? 'he' });

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
