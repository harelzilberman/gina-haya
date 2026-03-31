import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const usersRouter: IRouter = Router();

usersRouter.use(verifyToken);

// ── POST /api/users/push-token ──────────────────────────────────────────────
// Save an Expo push token for the authenticated user.
//
// Required DB migration (run once in Supabase SQL editor):
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
//
const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(200),
});

usersRouter.post('/push-token', async (req, res) => {
  const parsed = pushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid pushToken' });
  }

  const { id } = req.user!;

  const { error } = await db
    .from('users')
    .update({ push_token: parsed.data.pushToken })
    .eq('id', id);

  if (error) {
    console.error('[users/push-token POST]', error);
    return res.status(500).json({ error: 'Failed to save push token' });
  }

  return res.json({ ok: true });
});
