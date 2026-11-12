import cron from 'node-cron';
import { db } from '../db/client';
import webpush from 'web-push';
import { sendRenewalReminder, sendCronJobAlert } from './email';
import { getLimits } from '@gina-haya/shared';
import { reconcilePlaySubs } from './reconcilePlaySubs';
import { getHomeZonesForUsers, localClock, ISRAEL_ZONE, type Zone } from '../utils/zone';

export function startCronJobs() {
  // Person-scoped jobs run every 15 minutes (UTC) and act for each user when
  // THEIR home-zone local time (default garden → first garden → Israel)
  // reaches the send time:
  //   daily summary push      07:00 local  (de-duplicated by users.last_daily_summary_date)
  //   annual renewal reminder 09:00 local
  // Operational jobs stay on Israel wall-clock time (node-cron handles DST):
  //   Play reconcile          03:30 Asia/Jerusalem
  //   reconcile watchdog      09:00 Asia/Jerusalem
  const QUARTER_HOURLY       = '*/15 * * * *';
  const RECONCILE_SCHEDULE   = '30 3 * * *';  // 03:30 — low-traffic, no collision with existing jobs
  const WATCHDOG_SCHEDULE    = '0 9 * * *';
  const OPS_TZ = 'Asia/Jerusalem';

  cron.schedule(QUARTER_HOURLY, async () => {
    try {
      await sendDailySummary();
    } catch (e) {
      console.error('[cron] Daily summary failed:', e);
    }
    try {
      await sendAnnualRenewalReminders();
    } catch (e) {
      console.error('[cron] Annual renewal reminders failed:', e);
    }
  }, { timezone: 'UTC' });

  cron.schedule(WATCHDOG_SCHEDULE, async () => {
    try {
      await checkReconcileWatchdog();
    } catch (e) {
      console.error('[cron/renewal] Watchdog failed:', e);
    }
  }, { timezone: OPS_TZ });

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
  }, { timezone: OPS_TZ });

  const reconcileMin  = RECONCILE_SCHEDULE.split(' ')[0];
  const reconcileHour = RECONCILE_SCHEDULE.split(' ')[1];
  console.log(
    `[cron] Jobs scheduled: daily summary ${DAILY_SUMMARY_AT.hour}:00 and renewal reminders ` +
    `${RENEWAL_AT.hour}:00 in each user's home zone (checked every 15 min UTC); ` +
    `Play reconcile at ${reconcileHour}:${reconcileMin} and watchdog at ${WATCHDOG_SCHEDULE.split(' ')[1]}:00 ${OPS_TZ}`
  );
}

/** Local send times; the 15-minute window matches the quarter-hourly tick. */
const DAILY_SUMMARY_AT = { hour: 7, minute: 0 };
const RENEWAL_AT       = { hour: 9, minute: 0 };
const SEND_WINDOW_MIN  = 15;

function inSendWindow(zone: Zone, at: { hour: number; minute: number }, now: Date): { inWindow: boolean; localDate: string } {
  const { date, minutes } = localClock(zone.timezone, now);
  const start = at.hour * 60 + at.minute;
  return { inWindow: minutes >= start && minutes < start + SEND_WINDOW_MIN, localDate: date };
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
  // 2. Run the reconcile (targeted: stale active/grace rows + pending rows)
  //    staleOnly=true means we query status IN ('active','grace_period')
  //    AND expires_at < now() - 25h, plus every status='pending' row (unsettled
  //    payments — granted and acknowledged here if RTDN missed the settlement). The
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

async function sendDailySummary(now: Date = new Date()) {
  // Get all push subscriptions
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('user_id, subscription');

  if (error || !subs || subs.length === 0) return;

  // Users whose home-zone local time is 07:00–07:14 right now.
  const subsByUser = new Map<string, any[]>();
  for (const sub of subs) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub.subscription);
    subsByUser.set(sub.user_id, list);
  }
  const zones = await getHomeZonesForUsers([...subsByUser.keys()]);
  const due = new Map<string, string>(); // user_id → local date
  for (const userId of subsByUser.keys()) {
    const { inWindow, localDate } = inSendWindow(zones.get(userId) ?? ISRAEL_ZONE, DAILY_SUMMARY_AT, now);
    if (inWindow) due.set(userId, localDate);
  }
  if (due.size === 0) return;

  console.log(`[cron] Daily summary: ${due.size} user(s) at 07:00 local`);

  // Language + de-duplication column for the due users, in one query.
  const { data: userRows, error: usersError } = await db
    .from('users')
    .select('id, language_preference, last_daily_summary_date')
    .in('id', [...due.keys()]);
  if (usersError) {
    console.error('[cron] Daily summary: users lookup failed:', usersError.message);
    return;
  }
  const userById = new Map((userRows ?? []).map((u: any) => [u.id, u]));

  let sent = 0;
  let failed = 0;
  let skippedAlreadySent = 0;

  for (const [userId, localDate] of due) {
    const user: any = userById.get(userId);
    // Already sent for this local date (another tick, a restart or another replica).
    if (user?.last_daily_summary_date === localDate) {
      skippedAlreadySent++;
      continue;
    }
    try {
      // Check notification settings
      const { data: settings } = await db
        .from('notification_settings')
        .select('enabled, daily_summary')
        .eq('user_id', userId)
        .single();

      // Skip if disabled
      if (settings && (!settings.enabled || !settings.daily_summary)) continue;

      // Default Hebrew — English only when explicitly set.
      const isHe = !user || user.language_preference !== 'en';

      // Today's pending tasks — "today" in the user's home zone.
      const { data: tasks } = await db
        .from('garden_tasks')
        .select('title, type')
        .eq('user_id', userId)
        .eq('date', localDate)
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

      let delivered = false;
      for (const subscription of subsByUser.get(userId) ?? []) {
        try {
          await webpush.sendNotification(subscription, payload);
          delivered = true;
        } catch (e: any) {
          // Remove invalid/expired subscription
          if (e.statusCode === 404 || e.statusCode === 410) {
            await db.from('push_subscriptions').delete().eq('user_id', userId);
          }
        }
      }

      if (delivered) {
        sent++;
        const { error: markError } = await db
          .from('users')
          .update({ last_daily_summary_date: localDate })
          .eq('id', userId);
        if (markError) console.error(`[cron] Daily summary: could not mark user ${userId}:`, markError.message);
      } else {
        failed++;
      }
    } catch (e: any) {
      failed++;
      console.error(`[cron] Daily summary failed for user ${userId}:`, e?.message ?? e);
    }
  }

  console.log(`[cron] Daily summary: sent=${sent} failed=${failed} already_sent=${skippedAlreadySent}`);
}

/**
 * Cross-check: verify the Play reconcile job is still running.
 * If its last_finished_at is older than 48 hours, alert the admin.
 *
 * This catches "the reconcile job stopped running" — it does NOT catch
 * "node-cron itself died and ALL jobs stopped." That residual gap
 * requires an external uptime monitor (e.g. pointing at /api/health/jobs).
 * Runs once a day (09:00 Israel); it used to run inside the renewal job.
 */
async function checkReconcileWatchdog(): Promise<void> {
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

}

// In-process guard against a second reminder for the same user and local
// date (the 15-minute window already allows only one tick per day).
const renewalSentFor = new Set<string>();

/**
 * Annual renewal reminders (email + push) for subscriptions expiring within 7
 * days, sent at 09:00 in each user's home zone. Runs every 15 minutes.
 * Exported so it can be invoked directly for manual testing; pass
 * { ignoreLocalTime: true } to send to everyone due regardless of the hour.
 */
export async function sendAnnualRenewalReminders(
  opts: { now?: Date; ignoreLocalTime?: boolean } = {},
): Promise<void> {
  const now = opts.now ?? new Date();
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

  if (!expiring || expiring.length === 0) return;

  // Only users whose home-zone local time is 09:00–09:14 now (unless forced).
  const zones = await getHomeZonesForUsers(expiring.map((r: any) => r.user_id));
  const dueRows: Array<{ row: any; zone: Zone; localDate: string }> = [];
  for (const row of expiring) {
    const zone = zones.get(row.user_id) ?? ISRAEL_ZONE;
    const { inWindow, localDate } = inSendWindow(zone, RENEWAL_AT, now);
    if (!opts.ignoreLocalTime && !inWindow) continue;
    const key = `${row.user_id}|${localDate}`;
    if (renewalSentFor.has(key)) continue;
    dueRows.push({ row, zone, localDate });
  }
  if (dueRows.length === 0) return;

  console.log(`[cron/renewal] Found ${dueRows.length} subscriptions to remind (09:00 local)`);

  let emailSent = 0;
  let emailFailed = 0;
  let pushSent = 0;

  for (const { row, zone, localDate } of dueRows) {
    renewalSentFor.add(`${row.user_id}|${localDate}`);
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
        timeZone:    zone.timezone,
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
          month: 'long', day: 'numeric', timeZone: zone.timezone,
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
