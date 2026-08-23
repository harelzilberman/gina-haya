import cron from 'node-cron';
import { db } from '../db/client';
import webpush from 'web-push';
import { sendRenewalReminder } from './email';
import { getLimits } from '@gina-haya/shared';

export function startCronJobs() {
  // Daily garden task push — 7:00am Israel time (04:00 UTC)
  cron.schedule('0 4 * * *', async () => {
    console.log('[cron] Sending daily garden task notifications...');
    try {
      await sendDailySummary();
    } catch (e) {
      console.error('[cron] Daily summary failed:', e);
    }
  }, { timezone: 'Asia/Jerusalem' });

  // Annual subscription renewal reminders — 9:00am Israel time (06:00 UTC)
  cron.schedule('0 6 * * *', async () => {
    console.log('[cron] Sending annual renewal reminders...');
    try {
      await sendAnnualRenewalReminders();
    } catch (e) {
      console.error('[cron] Annual renewal reminders failed:', e);
    }
  }, { timezone: 'Asia/Jerusalem' });

  console.log('[cron] Jobs scheduled: daily summary at 7:00am, renewal reminders at 9:00am Israel time');
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

      // Look up user language preference — fall back to Hebrew on any error.
      // The Supabase client returns errors in the result object, not as throws.
      const { data: userData, error: langError } = await db
        .from('users')
        .select('language_preference')
        .eq('id', sub.user_id)
        .maybeSingle();
      const isHe = langError || !userData || userData.language_preference !== 'en';

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
      const more = tasks.length > 5
        ? (isHe ? `\n+ עוד ${tasks.length - 5} משימות` : `\n+ ${tasks.length - 5} more tasks`)
        : '';

      const payload = JSON.stringify({
        title: isHe
          ? `🌱 גינה חיה — ${tasks.length} משימות להיום`
          : `🌱 Gina Haya — ${tasks.length} tasks today`,
        body: taskLines + more,
        url: '/tasks',
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

// Exported so it can be invoked directly for manual testing without waiting for the schedule.
export async function sendAnnualRenewalReminders(): Promise<void> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find active annual Grow subscriptions expiring within the next 7 days.
  // base_plan_id = 'annual' is the queryable label set by the webhook handler.
  const { data: expiring, error } = await db
    .from('user_subscriptions')
    .select('user_id, product_id, expires_at')
    .eq('platform', 'grow')
    .eq('base_plan_id', 'annual')
    .eq('status', 'active')
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in7Days.toISOString());

  if (error) {
    console.error('[cron/renewal] Failed to query expiring subscriptions:', error);
    return;
  }

  if (!expiring || expiring.length === 0) {
    console.log('[cron/renewal] No annual subscriptions expiring within 7 days');
    return;
  }

  console.log(`[cron/renewal] Found ${expiring.length} subscriptions to remind`);

  let emailSent = 0;
  let emailFailed = 0;
  let pushSent = 0;

  for (const row of expiring) {
    // Fetch user details for the email and language preference
    const { data: user } = await db
      .from('users')
      .select('email, display_name, language_preference')
      .eq('id', row.user_id)
      .maybeSingle();

    if (!user?.email) {
      console.warn(`[cron/renewal] No email found for user_id=${row.user_id} — skipping`);
      continue;
    }

    const tierNameHe = getLimits(row.product_id)?.displayNameHe ?? row.product_id;
    const expiresAt  = new Date(row.expires_at);
    const userLang   = (user.language_preference as 'he' | 'en') ?? 'he';
    const renewalIsHe = userLang !== 'en';

    // Primary channel: email (doesn't require push permission to be active)
    try {
      await sendRenewalReminder({
        email:       user.email,
        displayName: user.display_name ?? '',
        tierNameHe,
        expiresAt,
        language:    userLang,
      });
      emailSent++;
    } catch (err) {
      console.error(`[cron/renewal] Email failed for user_id=${row.user_id}:`, err);
      emailFailed++;
    }

    // Secondary channel: push notification (best-effort, stale subscriptions auto-cleaned)
    try {
      const { data: pushSub } = await db
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', row.user_id)
        .maybeSingle();

      if (pushSub?.subscription) {
        const expiryStr = expiresAt.toLocaleDateString(renewalIsHe ? 'he-IL' : 'en-US', {
          month: 'long', day: 'numeric', timeZone: 'Asia/Jerusalem',
        });
        await webpush.sendNotification(
          pushSub.subscription,
          JSON.stringify({
            title: renewalIsHe
              ? '🌿 המנוי השנתי שלך מסתיים בקרוב'
              : '🌿 Your annual subscription is ending soon',
            body: renewalIsHe
              ? `תוכנית ${tierNameHe} מסתיימת ב-${expiryStr} — לחץ לחידוש`
              : `Your ${tierNameHe} plan expires on ${expiryStr} — tap to renew`,
            url:   '/pricing',
          })
        );
        pushSent++;
      }
    } catch (e: any) {
      // Remove stale push subscription — don't let it block the loop
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('user_id', row.user_id);
      }
    }
  }

  console.log(
    `[cron/renewal] Done. email sent=${emailSent} failed=${emailFailed} push sent=${pushSent}`
  );
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

    // Look up user language preference — fall back to Hebrew on any error.
    const { data: smartUserData, error: smartLangError } = await db
      .from('users')
      .select('language_preference')
      .eq('id', userId)
      .maybeSingle();
    const smartIsHe = smartLangError || !smartUserData || smartUserData.language_preference !== 'en';

    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title: smartIsHe ? '🌙 מון — תזכורת חכמה' : '🌙 Chupchu — smart reminder',
      body: message,
      url: '/tasks',
    }));
  } catch (e) {
    console.error('[push] Smart reminder failed:', e);
  }
}
