import { ISRAEL_TIMEZONE } from '../constants/calendar';

export function todayInIsrael(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: ISRAEL_TIMEZONE });
}

/**
 * Converts a "YYYY-MM-DD" date string (in Israel time) to the UTC ISO timestamp
 * of midnight at the start of that day in Israel.
 *
 * Example (Israel = UTC+3 in summer):
 *   israelDateToUTCMidnight('2026-09-01') → '2026-08-31T21:00:00.000Z'
 *
 * Uses the Intl API to find the actual UTC offset at noon on that date,
 * so DST transitions are handled correctly without hard-coding offsets.
 */
export function israelDateToUTCMidnight(israelDate: string): string {
  // Use noon UTC on this date as a probe — safely within the calendar day in Israel.
  const noonUTC = new Date(`${israelDate}T12:00:00Z`);

  // What hour (0–23) is it in Israel when it's noon UTC?
  // If Israel is UTC+3, noon UTC = 15:00 Israel → israelHour = 15.
  const israelHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ISRAEL_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(noonUTC),
    10,
  );

  // Midnight Israel on `israelDate` = noon UTC − israelHour hours.
  const midnight = new Date(noonUTC);
  midnight.setUTCHours(noonUTC.getUTCHours() - israelHour, 0, 0, 0);
  return midnight.toISOString();
}

/** UTC ISO timestamp for the start of today in Israel time. */
export function startOfTodayIsrael(): string {
  return israelDateToUTCMidnight(todayInIsrael());
}

/** UTC ISO timestamp for the start of the current month in Israel time. */
export function startOfCurrentMonthIsrael(): string {
  const today = todayInIsrael();              // "YYYY-MM-DD"
  const firstOfMonth = today.slice(0, 7) + '-01';  // "YYYY-MM-01"
  return israelDateToUTCMidnight(firstOfMonth);
}

export function formatDateHe(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: ISRAEL_TIMEZONE,
  });
}

export function formatDateEn(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: ISRAEL_TIMEZONE,
  });
}
