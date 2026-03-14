import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const authRouter = Router();

// All routes require a valid JWT
authRouter.use(verifyToken);

// ── POST /api/auth/profile ──────────────────────────────────────────────────
// Called after OAuth sign-in to sync / update the public.users profile row.

const profileSchema = z.object({
  displayName: z.string().max(100).optional(),
});

authRouter.post('/profile', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { id, email } = req.user!;
  const displayName = parsed.data.displayName ?? '';

  const { data, error } = await db
    .from('users')
    .upsert(
      { id, email, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select('id, email, display_name, language_preference, subscription_tier, created_at')
    .single();

  if (error) {
    console.error('[auth/profile]', error);
    return res.status(500).json({ error: 'Failed to upsert profile' });
  }

  return res.json(data);
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
// Returns the current user's profile row.

authRouter.get('/me', async (req, res) => {
  const { id } = req.user!;

  const { data, error } = await db
    .from('users')
    .select('id, email, display_name, language_preference, subscription_tier, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }

  return res.json(data);
});
