import cron from 'node-cron';
import { db } from '../db/client';
import webpush from 'web-push';

export function startCronJobs() {
  // Daily summary — every day at 7:00am Israel time (UTC+3 = 04:00 UTC)
  cron.schedule('0 4 * * *', async () => {
    console.log('[cron] Sending daily garden task notifications...');
    try {
      await sendDailySummary();
    } catch (e) {
      console.error('[cron] Daily summary failed:', e);
    }
  }, { timezone: 'Asia/Jerusalem' });

  console.log('[cron] Jobs scheduled: daily summary at 7:00am Israel time');
}

async function sendDailySummary() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

  // Get all push subscriptions
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('user_id, subscription');

  if (error || !subs || subs.length === 0) return;

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      // Check notification settings
      const { data: settings } = await db
        .from('notification_settings')
        .select('enabled, daily_summary')
        .eq('user_id', sub.user_id)
        .single();

      // Skip if disabled
      if (settings && (!settings.enabled || !settings.daily_summary)) continue;

      // Get today's pending tasks
      const { data: tasks } = await db
        .from('garden_tasks')
        .select('title, type')
        .eq('user_id', sub.user_id)
        .eq('date', today)
        .eq('status', 'pending');

      if (!tasks || tasks.length === 0) continue;

      // Build notification
      const taskLines = tasks.slice(0, 5).map((t: any) => `• ${t.title}`).join('\n');
      const more = tasks.length > 5 ? `\n+ עוד ${tasks.length - 5} משימות` : '';

      const payload = JSON.stringify({
        title: `🌱 גינה חיה — ${tasks.length} משימות להיום`,
        body: taskLines + more,
        url: '/plan',
      });

      await webpush.sendNotification(sub.subscription, payload);
      sent++;
    } catch (e: any) {
      failed++;
      // Remove invalid/expired subscription
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }
  }

  console.log(`[cron] Daily summary: sent=${sent} failed=${failed}`);
}

export async function sendSmartReminder(userId: string, message: string) {
  try {
    const { data: sub } = await db
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (!sub) return;

    const { data: settings } = await db
      .from('notification_settings')
      .select('enabled, smart_reminders')
      .eq('user_id', userId)
      .single();

    if (settings && (!settings.enabled || !settings.smart_reminders)) return;

    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title: '🌙 מון — תזכורת חכמה',
      body: message,
      url: '/plan',
    }));
  } catch (e) {
    console.error('[push] Smart reminder failed:', e);
  }
}
