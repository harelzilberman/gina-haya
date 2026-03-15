import { db } from '../db/client';
import { getCalendarDay } from '../db/queries/calendar';
import { sendDailyTip, type EmailUser } from '../services/email';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendDailyTipToAllUsers(): Promise<void> {
  console.log('[daily-tip cron] Starting daily tip send...');

  // Fetch today's calendar data
  const today = todayISO();
  const calendarDay = await getCalendarDay(today);

  if (!calendarDay) {
    console.warn(`[daily-tip cron] No calendar data for ${today} — skipping send.`);
    return;
  }

  // Fetch all opted-in users
  const { data: users, error } = await db
    .from('users')
    .select('id, email, display_name, language_preference')
    .eq('daily_tip_email', true);

  if (error) {
    console.error('[daily-tip cron] Failed to fetch users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('[daily-tip cron] No opted-in users found.');
    return;
  }

  console.log(`[daily-tip cron] Sending to ${users.length} users for ${today}`);

  let sent = 0;
  let failed = 0;

  for (const user of users as EmailUser[]) {
    try {
      await sendDailyTip(user, calendarDay);
      sent++;
    } catch (err) {
      console.error(`[daily-tip cron] Failed to send to ${user.email}:`, err);
      failed++;
    }
    // Avoid Resend rate limits
    await sleep(500);
  }

  console.log(`[daily-tip cron] Done. Sent: ${sent}, Failed: ${failed}`);
}
