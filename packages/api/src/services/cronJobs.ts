import cron from 'node-cron';
import { db } from '../db/client';
import webpush from 'web-push';
import { sendRenewalReminder, sendCronJobAlert } from './email';
import { getLimits } from '@gina-haya/shared';
import { reconcilePlaySubs } from './reconcilePlaySubs';

export function startCronJobs() {
  // Convention: wall-clock Israel time + explicit timezone.
  // node-cron interprets the schedule in the given timezone, so IDT/IST
  // transitions are handled automatically — no UTC arithmetic needed.

  // 07:00 Israel time daily
  const DAILY_SCHEDULE     = '0 7 * * *';
  const RENEWAL_SCHEDULE   = '0 9 * * *';
  const RECONCILE_SCHEDULE = '30 3 * * *';  // 03:30 — low-traffic, no collision with existing jobs
  const TZ = 'Asia/Jerusalem';

  cron.schedule(DAILY_SCHEDULE, async () => {
    console.log('[cron] Sending daily garden task notifications...');
    try {
      await sendDailySummary();
    } catch (e) {
      console.error('[cron] Daily summary failed:', e);
    }
  }, { timezone: TZ });

  // 09:00 Israel time daily
  cron.schedule(RENEWAL_SCHEDULE, async () => {
    console.log('[cron] Sending annual renewal reminders...');
    try {
      await sendAnnualRenewalReminders();
    } catch (e) {
      console.error('[cron] Annual renewal reminders failed:', e);
    }
  }, { timezone: TZ });

  // 03:30 Israel time daily — reconcile Google Play subscriptions against live API data.
  // This is insurance against silent RTDN delivery failure (the Pub/Sub topic lost its
  // subscription for weeks in a prior incident; nothing is drifting today).
  cron.schedule(RECONCILE_SCHEDULE, async () => {
    console.log('[cron/reconcile] Starting Play subscription reconcile...');
    try {
      await runReconcilePlaySubs();
    } catch (e) {
      console.error('[cron/reconcile] Unexpected error outside runReconcilePlaySubs:', e);
    }
  }, { timezone: TZ });

  // Derive log times from schedule strings so this line cannot drift silently.
  const dailyHour     = DAILY_SCHEDULE.split(' ')[1];
  const renewalHour   = RENEWAL_SCHEDULE.split(' ')[1];
  const reconcileMin  = RECONCILE_SCHEDULE.split(' ')[0];
  const reconcileHour = RECONCILE_SCHEDULE.split(' ')[1];
  console.log(
    `[cron] Jobs scheduled: daily summary at ${dailyHour}:00, renewal reminders at ${renewalHour}:00, ` +
    `Play reconcile at ${reconcileHour}:${reconcileMin} ${TZ}`
  );
}

// ---------------------------------------------------------------------------
// runReconcilePlaySubs — the scheduled reconcile job
// ---------------------------------------------------------------------------
async function runReconcilePlaySubs(): Promise<void> {
  const JOB_NAME   = 'reconcile_play_subs';
  const instanceId = process.env.RAILWAY_REPLICA_ID ?? process.env.RAILWAY_SERVICE_ID ?? 'default';

  // ------------------------------------------------------------------
  // 1. Claim the distributed lock
  //    A single atomic conditional UPDATE. If another instance started
  //    the job within the last hour, the WHERE clause matches no row
  //    and data will be empty — log and return immediately.
  // ------------------------------------------------------------------
  const lockThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

  const { data: claimed, error: claimError } = await db
    .from('job_runs')
    .update({
      last_started_at: new Date().toISOString(),
      instance_id:     instanceId,
      updated_at:      new Date().toISOString(),
    })
    .eq('job_name', JOB_NAME)
    .or(`last_started_at.is.null,last_started_at.lt.${lockThreshold}`)
    .select();

  if (claimError) {
    console.error(`[cron/reconcile] Lock claim query failed: ${claimError.message}`);
    // Do not proceed — we cannot guarantee exclusive execution.
    return;
  }

  if (!claimed || claimed.length === 0) {
    // Another instance holds the lock. This is the expected outcome on one of
    // two instances during a rolling deploy. Not an error.
    console.log('[cron/reconcile] Lock held by another instance — skipping this run.');
    return;
  }

  console.log(`[cron/reconcile] Lock claimed by instance=${instanceId}`);

  // ------------------------------------------------------------------
  // 2. Run the reconcile (targeted: stale active/grace rows only)
  //    staleOnly=true means we query only status IN ('active','grace_period')
  //    AND expires_at < now() - 25h. Today this returns zero rows; the
  //    steady-state cost is one DB query and no Google API calls.
  //    apply=true: this job IS the correction mechanism.
  // ------------------------------------------------------------------
  let lastStatus: 'ok' | 'error' | 'skipped' = 'ok';
  let lastDetail = '';

  try {
    const result = await reconcilePlaySubs({ apply: true, staleOnly: true });

    const examined    = result.rows.length;
    const changed     = result.changed;
    const orphans     = result.orphans.length;
    const reviewCount = result.needsReview.length;

    lastStatus = 'ok';
    lastDetail =
      `checked=${examined} changed=${changed} orphans=${orphans} needs_review=${reviewCount}`;

    console.log(`[cron/reconcile] Done. ${lastDetail}`);

    // ------------------------------------------------------------------
    // 3. Alert when something noteworthy happened.
    //    Clean zero-row runs are the normal case — do not alert on them.
    // ------------------------------------------------------------------
    if (changed > 0) {
      // Rows were actually changed — RTDN delivery must have failed for these subs.
      // This is exactly the scenario the job exists to catch.
      try {
        await sendCronJobAlert({
          jobName:      JOB_NAME,
          context:      'changed_rows',
          detail:       `Reconcile corrected ${changed} subscription row(s). RTDN delivery may have failed.`,
          changedCount: changed,
          reviewCount,
        });
      } catch (alertErr: any) {
        console.error('[cron/reconcile] Alert (changed_rows) send failed:', alertErr?.message);
      }
    }

    if (reviewCount > 0) {
      const reviewSummary = result.needsReview
        .map(r => `id=${r.row.id}: ${r.needsReview}`)
        .join('; ');
      try {
        await sendCronJobAlert({
          jobName:     JOB_NAME,
          context:     'needs_review',
          detail:      reviewSummary,
          reviewCount,
        });
      } catch (alertErr: any) {
        console.error('[cron/reconcile] Alert (needs_review) send failed:', alertErr?.message);
      }
    }

  } catch (err: any) {
    // The reconcile threw (DB failure, missing credentials, etc.).
    // Record error heartbeat, then alert. Never rethrow.
    lastStatus = 'error';
    lastDetail = err?.message ?? String(err);
    console.error(`[cron/reconcile] Job threw: ${lastDetail}`);

    try {
      await sendCronJobAlert({
        jobName:      JOB_NAME,
        context:      'error',
        detail:       'Reconcile job threw an exception. See error message.',
        errorMessage: lastDetail,
      });
    } catch (alertErr: any) {
      console.error('[cron/reconcile] Alert (error) send failed:', alertErr?.message);
    }
  }

  // ------------------------------------------------------------------
  // 4. Write heartbeat — MUST happen on every exit path: success,
  //    zero rows, or error. A job that dies without writing its finish
  //    time is the silent failure this table was built to prevent.
  // ------------------------------------------------------------------
  try {
    await db
      .from('job_runs')
      .update({
        last_finished_at: new Date().toISOString(),
        last_status:      lastStatus,
        last_detail:      lastDetail,
        updated_at:       new Date().toISOString(),
      })
      .eq('job_name', JOB_NAME);
  } catch (heartbeatErr: any) {
    // Log but do not throw — a heartbeat failure must not crash the cron runner.
    console.error(`[cron/reconcile] Failed to write heartbeat: ${heartbeatErr?.message}`);
  }
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

  // ------------------------------------------------------------------
  // Cross-check: verify the Play reconcile job is still running.
  // If its last_finished_at is older than 48 hours, alert the admin.
  //
  // This catches "the reconcile job stopped running" — it does NOT catch
  // "node-cron itself died and ALL jobs stopped." That residual gap
  // requires an external uptime monitor (e.g. pointing at /api/health/jobs).
  // ------------------------------------------------------------------
  try {
    const { data: reconcileJob } = await db
      .from('job_runs')
      .select('last_finished_at, last_status')
      .eq('job_name', 'reconcile_play_subs')
      .maybeSingle();

    if (reconcileJob) {
      const staleAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const lastFinished = reconcileJob.last_finished_at
        ? new Date(reconcileJob.last_finished_at)
        : null;
      const isStale = !lastFinished || lastFinished < staleAt;

      if (isStale) {
        console.error(
          `[cron/renewal] WATCHDOG: reconcile_play_subs has not finished in >48h ` +
          `(last_finished_at=${reconcileJob.last_finished_at ?? 'never'})`
        );
        await sendCronJobAlert({
          jobName:  'reconcile_play_subs',
          context:  'error',
          detail:   `Watchdog: job has not finished in >48 hours. RTDN drift may be accumulating undetected.`,
          errorMessage: `last_finished_at=${reconcileJob.last_finished_at ?? 'never'} last_status=${reconcileJob.last_status ?? 'never'}`,
        });
      }
    }
  } catch (watchdogErr: any) {
    console.error('[cron/renewal] Watchdog check failed:', watchdogErr?.message);
  }

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
