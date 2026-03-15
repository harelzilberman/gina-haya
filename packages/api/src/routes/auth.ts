import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const authRouter: IRouter = Router();

authRouter.use(verifyToken);

// ── POST /api/auth/profile ──────────────────────────────────────────────────
// Upsert profile row — called once right after sign-up / OAuth.

const postProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
});

authRouter.post('/profile', async (req, res) => {
  const parsed = postProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { id, email } = req.user!;
  const displayName = parsed.data.displayName ?? '';

  const { data, error } = await db
    .from('users')
    .upsert(
      { id, email, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select('id, email, display_name, language_preference, subscription_tier, onboarding_complete, created_at')
    .single();

  if (error) {
    console.error('[auth/profile POST]', error);
    return res.status(500).json({ error: 'Failed to upsert profile' });
  }

  return res.json(data);
});

// ── PATCH /api/auth/profile ─────────────────────────────────────────────────
// Partial update — used by onboarding to set onboarding_complete, etc.

const patchProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  languagePreference: z.enum(['he', 'en']).optional(),
  onboardingComplete: z.boolean().optional(),
});

authRouter.patch('/profile', async (req, res) => {
  const parsed = patchProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { id } = req.user!;
  const updates: Record<string, unknown> = {};

  if (parsed.data.displayName !== undefined) updates.display_name = parsed.data.displayName;
  if (parsed.data.languagePreference !== undefined) updates.language_preference = parsed.data.languagePreference;
  if (parsed.data.onboardingComplete !== undefined) updates.onboarding_complete = parsed.data.onboardingComplete;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, email, display_name, language_preference, subscription_tier, onboarding_complete, created_at')
    .single();

  if (error) {
    console.error('[auth/profile PATCH]', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  return res.json(data);
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────

authRouter.get('/me', async (req, res) => {
  const { id } = req.user!;

  const { data, error } = await db
    .from('users')
    .select('id, email, display_name, language_preference, subscription_tier, onboarding_complete, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Profile not found' });
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }

  return res.json(data);
});
