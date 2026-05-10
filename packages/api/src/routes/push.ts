import { Router, type IRouter } from 'express';
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

pushRouter.use(verifyToken);

// GET /api/push/vapid-public-key
pushRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? '' });
});

// POST /api/push/subscribe
pushRouter.post('/subscribe', async (req, res) => {
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
pushRouter.delete('/subscribe', async (req, res) => {
  try {
    await db.from('push_subscriptions').delete().eq('user_id', req.user!.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/push/settings
pushRouter.get('/settings', async (req, res) => {
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
pushRouter.patch('/settings', async (req, res) => {
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

// POST /api/push/send-daily — called by a cron job or manually
pushRouter.post('/send-daily', async (req, res) => {
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

        const payload = JSON.stringify({
          title: '🌱 גינה חיה — משימות היום',
          body: tasks.map((t: any) => `• ${t.title}`).join('\n'),
          url: '/plan',
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

export async function sendPushToUser(userId: string, title: string, body: string, url = '/plan') {
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
