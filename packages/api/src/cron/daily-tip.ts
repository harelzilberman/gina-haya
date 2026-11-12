import { db } from '../db/client';
import { getVariantDay } from '../db/queries/calendar';
import { sendDailyTip, type EmailUser } from '../services/email';
import { todayIn, resolveVariant, type BiodynamicDay } from '@gina-haya/shared';
import { getHomeZonesForUsers, calendarLocationOf, ISRAEL_ZONE } from '../utils/zone';


function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendDailyTipToAllUsers(): Promise<void> {
  console.log('[daily-tip cron] Starting daily tip send...');

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

  // Person-scoped: each user's home zone decides "today" and the calendar
  // variant. Days are cached per (local date, variant).
  const homeZones = await getHomeZonesForUsers((users as EmailUser[]).map(u => u.id));
  const dayCache = new Map<string, Promise<BiodynamicDay | null>>();
  const dayFor = (userId: string): Promise<BiodynamicDay | null> => {
    const zone = homeZones.get(userId) ?? ISRAEL_ZONE;
    const date = todayIn(zone.timezone);
    const v = resolveVariant(date, zone.timezone, zone.latitude);
    const key = `${date}|${v.utcOffsetHours}|${v.hemisphere}`;
    if (!dayCache.has(key)) dayCache.set(key, getVariantDay(date, calendarLocationOf(zone)).catch(() => null));
    return dayCache.get(key)!;
  };

  console.log(`[daily-tip cron] Sending to ${users.length} users`);

  let sent = 0;
  let failed = 0;

  for (const user of users as EmailUser[]) {
    try {
      const calendarDay = await dayFor(user.id);
      if (!calendarDay) {
        console.warn(`[daily-tip cron] No calendar data for user ${user.id}'s local today — skipped.`);
        failed++;
        continue;
      }
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
