import { Router, type IRouter } from 'express';
import { timingSafeEqual } from 'crypto';
import { verifyToken } from '../middleware/auth';
import { db } from '../db/client';
import webpush from 'web-push';

export const pushRouter: IRouter = Router();

// Configure VAPID — keys read from env
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:gina.haya.contact@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// NOTE: verifyToken is applied per-route (not as a router-level middleware) so
// that POST /send-daily can be gated by CRON_SECRET instead of a user token.

// Timing-safe string comparison for the CRON_SECRET header.
// Both inputs are converted to Buffer so timingSafeEqual can operate on them.
// Returns false immediately (without the timing-safe comparison) when lengths
// differ — length difference is not a secret and avoids the length-mismatch
// exception thrown by timingSafeEqual when buffers differ in size.
function secretsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// GET /api/push/vapid-public-key
pushRouter.get('/vapid-public-key', verifyToken, (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? '' });
});

// POST /api/push/subscribe
pushRouter.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { subscription, settings } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription required' });

    await db.from('push_subscriptions').upsert({
      user_id: req.user!.id,
      subscription,
    }, { onConflict: 'user_id' });

    // Save notification settings if provided
    if (settings) {
      await db.from('notification_settings').upsert({
        user_id: req.user!.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/push/subscribe — unsubscribe
pushRouter.delete('/subscribe', verifyToken, async (req, res) => {
  try {
    await db.from('push_subscriptions').delete().eq('user_id', req.user!.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/push/settings
pushRouter.get('/settings', verifyToken, async (req, res) => {
  try {
    const { data } = await db
      .from('notification_settings')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();
    res.json(data ?? {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/push/settings
pushRouter.patch('/settings', verifyToken, async (req, res) => {
  try {
    const { data, error } = await db
      .from('notification_settings')
      .upsert({
        user_id: req.user!.id,
        ...req.body,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/send-daily — operational endpoint, NOT a user endpoint.
//
// Gated by CRON_SECRET header (x-cron-secret), not a user bearer token.
// This route deliberately does NOT use verifyToken — an external scheduler
// (Railway cron, GitHub Actions, etc.) will have no user session to present.
//
// DEPLOY ORDERING: set CRON_SECRET in the Railway environment BEFORE deploying
// this build. Any caller must send the header:
//   x-cron-secret: <value of CRON_SECRET env var>
//
// Fail closed: if CRON_SECRET is unset or empty, every request is rejected.
pushRouter.post('/send-daily', async (req, res) => {
  const secret = process.env.CRON_SECRET;

  // Fail closed — no secret configured means no access, ever.
  if (!secret) {
    console.error('[POST /api/push/send-daily] CRON_SECRET env var is not set — rejecting request');
    return res.status(503).json({ error: 'cron_not_configured' });
  }

  const provided = req.headers['x-cron-secret'];
  if (typeof provided !== 'string' || !secretsEqual(secret, provided)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all users with push subscriptions and notifications enabled
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('user_id, subscription');

    if (!subs || subs.length === 0) return res.json({ sent: 0 });

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    let sent = 0;

    for (const sub of subs) {
      try {
        // Get today's tasks for this user
        const { data: tasks } = await db
          .from('garden_tasks')
          .select('title, type')
          .eq('user_id', sub.user_id)
          .eq('date', today)
          .eq('status', 'pending');

        if (!tasks || tasks.length === 0) continue;

        // Look up user language — fall back to Hebrew on any error.
        const { data: langData, error: langErr } = await db
          .from('users')
          .select('language_preference')
          .eq('id', sub.user_id)
          .maybeSingle();
        const pushIsHe = langErr || !langData || langData.language_preference !== 'en';

        const payload = JSON.stringify({
          title: pushIsHe ? '🌱 גינה חיה — משימות היום' : '🌱 Gina Haya — tasks today',
          body: tasks.map((t: any) => `• ${t.title}`).join('\n'),
          url: '/tasks',
        });

        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (e) {
        // Remove invalid subscriptions
        await db.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }

    res.json({ sent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export async function sendPushToUser(userId: string, title: string, body: string, url = '/tasks') {
  try {
    const { data: sub } = await db
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();
    if (!sub) return;
    await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url }));
  } catch (e) {
    // Subscription may be stale
    await db.from('push_subscriptions').delete().eq('user_id', userId);
  }
}
