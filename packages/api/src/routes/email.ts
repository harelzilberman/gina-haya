import { Router, type IRouter } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { sendDailyTipToAllUsers } from '../cron/daily-tip';

export const emailRouter: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET!;

// ── GET /api/email/unsubscribe?token=JWT ─────────────────────────────────────
emailRouter.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send(unsubscribePageHtml('שגיאה: קישור לא תקין.', false));
  }

  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: string; purpose: string };
  } catch {
    return res.status(400).send(unsubscribePageHtml('שגיאה: הקישור פג תוקף או אינו תקין.', false));
  }

  if (payload.purpose !== 'unsubscribe') {
    return res.status(400).send(unsubscribePageHtml('שגיאה: קישור לא תקין.', false));
  }

  const { error } = await db
    .from('users')
    .update({ daily_tip_email: false })
    .eq('id', payload.userId);

  if (error) {
    console.error('[email/unsubscribe]', error);
    return res.status(500).send(unsubscribePageHtml('שגיאה פנימית — נסה שנית מאוחר יותר.', false));
  }

  return res.send(unsubscribePageHtml('הוסרת בהצלחה מרשימת התפוצה 🌱', true));
});

// ── PATCH /api/email/preferences ────────────────────────────────────────────
const preferencesSchema = z.object({
  dailyTipEmail: z.boolean().optional(),
  language: z.enum(['he', 'en']).optional(),
});

emailRouter.patch('/preferences', verifyToken, async (req, res) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.dailyTipEmail !== undefined) {
    updates.daily_tip_email = parsed.data.dailyTipEmail;
  }
  if (parsed.data.language !== undefined) {
    updates.language_preference = parsed.data.language;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', req.user!.id)
    .select('id, email, display_name, language_preference, subscription_tier, onboarding_complete, daily_tip_email, created_at')
    .single();

  if (error) {
    console.error('[email/preferences PATCH]', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }

  return res.json(data);
});

// ── GET /api/email/test-daily-tip (development only) ─────────────────────────
if (process.env.NODE_ENV !== 'production') {
  emailRouter.get('/test-daily-tip', async (_req, res) => {
    try {
      await sendDailyTipToAllUsers();
      res.json({ ok: true, message: 'Test daily tip sent — check logs for details.' });
    } catch (err: any) {
      console.error('[email/test-daily-tip]', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function unsubscribePageHtml(message: string, success: boolean): string {
  const colour = success ? '#4A7C59' : '#A33030';
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>גינה חיה — הסרה מרשימת תפוצה</title>
  <style>
    body { margin: 0; padding: 40px 16px; background: #FDF6EC; font-family: Arial, sans-serif; direction: rtl; text-align: center; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 48px 32px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .msg { font-size: 20px; font-weight: bold; color: ${colour}; margin-bottom: 12px; }
    .sub { font-size: 14px; color: #888; }
    a { color: #4A7C59; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '🌱' : '⚠️'}</div>
    <div class="msg">${message}</div>
    <div class="sub">
      ${success ? 'ניתן לחזור ולהירשם בכל עת דרך ההגדרות.' : ''}
      <br><a href="${process.env.APP_URL || 'https://gina-haya.com'}">חזרה לגינה חיה</a>
    </div>
  </div>
</body>
</html>`;
}
