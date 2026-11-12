import { ISRAEL_TIMEZONE } from '../constants/calendar';

// ── Timezone-aware dates ─────────────────────────────────────────────────────
//
// Garden-scoped logic passes the garden's IANA zone; person-scoped logic the
// user's home zone (API: getUserHomeZone). A null/invalid zone falls back to
// Asia/Jerusalem, so callers without a location behave exactly as before.

function zoneOrIsrael(tz: string | null | undefined): string {
  if (typeof tz !== 'string' || !tz.trim()) return ISRAEL_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return ISRAEL_TIMEZONE;
  }
}

/**
 * Offset of `timeZone` from UTC at `instantMs`, in minutes
 * (+120 for Israel winter, +330 for India, −300 for New York winter).
 */
export function zoneOffsetMinutes(timeZone: string, instantMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((wallAsUtc - Math.floor(instantMs / 1000) * 1000) / 60_000);
}

/** Today's date ("YYYY-MM-DD") in `tz` (null/invalid → Asia/Jerusalem). */
export function todayIn(tz: string | null | undefined, now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: zoneOrIsrael(tz) });
}

/**
 * UTC ISO timestamp of local midnight at the start of `date` ("YYYY-MM-DD")
 * in `tz`. Works for DST changes and half-hour zones:
 *   localDateToUTCMidnight('2026-09-01', 'Asia/Jerusalem') → '2026-08-31T21:00:00.000Z'
 *   localDateToUTCMidnight('2026-09-01', 'Asia/Kolkata')   → '2026-08-31T18:30:00.000Z'
 */
export function localDateToUTCMidnight(date: string, tz: string | null | undefined): string {
  const zone = zoneOrIsrael(tz);
  const [y, m, d] = date.split('-').map(Number);
  const wallMidnight = Date.UTC(y, m - 1, d);
  // First guess with the offset at local noon, then correct with the offset
  // in force at that instant (matters when DST changes during the night).
  let instant = wallMidnight - zoneOffsetMinutes(zone, wallMidnight + 12 * 3_600_000) * 60_000;
  instant = wallMidnight - zoneOffsetMinutes(zone, instant) * 60_000;
  return new Date(instant).toISOString();
}

/** UTC ISO timestamp for the start of today in `tz`. */
export function startOfTodayIn(tz: string | null | undefined): string {
  return localDateToUTCMidnight(todayIn(tz), tz);
}

/** UTC ISO timestamp for the start of the current month in `tz`. */
export function startOfCurrentMonthIn(tz: string | null | undefined): string {
  return localDateToUTCMidnight(todayIn(tz).slice(0, 7) + '-01', tz);
}

// ── Israel wrappers (kept for existing callers) ──────────────────────────────

/** @deprecated Use todayIn(tz) with the garden's or user's home zone. */
export function todayInIsrael(): string {
  return todayIn(ISRAEL_TIMEZONE);
}

/** @deprecated Use localDateToUTCMidnight(date, tz). */
export function israelDateToUTCMidnight(israelDate: string): string {
  return localDateToUTCMidnight(israelDate, ISRAEL_TIMEZONE);
}

/** @deprecated Use startOfTodayIn(tz). */
export function startOfTodayIsrael(): string {
  return startOfTodayIn(ISRAEL_TIMEZONE);
}

/** @deprecated Use startOfCurrentMonthIn(tz). */
export function startOfCurrentMonthIsrael(): string {
  return startOfCurrentMonthIn(ISRAEL_TIMEZONE);
}

/** Long date in Hebrew ("12 בנובמבר 2026") in `tz` (default Asia/Jerusalem). */
export function formatDateHe(dateStr: string, tz: string | null | undefined = ISRAEL_TIMEZONE): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: zoneOrIsrael(tz),
  });
}

/** Long date in English ("12 November 2026") in `tz` (default Asia/Jerusalem). */
export function formatDateEn(dateStr: string, tz: string | null | undefined = ISRAEL_TIMEZONE): string {
  return new Date(dateStr).toLocaleDateString('en-IL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: zoneOrIsrael(tz),
  });
}
