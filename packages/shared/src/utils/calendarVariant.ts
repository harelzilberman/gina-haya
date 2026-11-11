import type { KnownHemisphere } from './season';

// ── Biodynamic calendar variant selection ────────────────────────────────────
//
// biodynamic_calendar_variants holds one row per (date, utc_offset_hours,
// hemisphere): 27 whole-hour offsets (-12 … +14) × north/south, each row
// computed at local noon for its offset. These helpers pick the variant for a
// garden on a given date.

export const DEFAULT_CALENDAR_TIMEZONE = 'Asia/Jerusalem';
export const MIN_VARIANT_OFFSET = -12;
export const MAX_VARIANT_OFFSET = 14;

export interface CalendarVariant {
  utcOffsetHours: number;
  hemisphere: KnownHemisphere;
}

/** True when `tz` is an IANA zone the runtime recognises. */
export function isValidIanaTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zoneOrDefault(tz: string | null | undefined): string {
  return isValidIanaTimeZone(tz) ? tz : DEFAULT_CALENDAR_TIMEZONE;
}

/** Offset of `timeZone` from UTC at `instantMs`, in minutes (e.g. +120 for Israel winter). */
function offsetMinutesAt(timeZone: string, instantMs: number): number {
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

/**
 * Variant for a garden on `dateISO` ("YYYY-MM-DD", the garden's local date).
 *
 * The UTC offset is measured at LOCAL NOON of that date, so DST is handled per
 * date (a range crossing a DST change gets two variants). Half- and
 * quarter-hour zones round to the nearest whole hour (India +5:30 → +6,
 * Newfoundland −3:30 → −3), clamped to −12 … +14.
 *
 * Defaults: timezone null/invalid → Asia/Jerusalem; latitude null → north.
 */
export function resolveVariant(
  dateISO: string,
  timezone: string | null | undefined,
  latitude: number | null | undefined,
): CalendarVariant {
  const tz = zoneOrDefault(timezone);
  const [y, m, d] = dateISO.split('-').map(Number);
  const utcNoon = Date.UTC(y, (m || 1) - 1, d || 1, 12);
  // Two passes: the offset at UTC noon locates local noon; measure there.
  const firstGuess = offsetMinutesAt(tz, utcNoon);
  const offsetMin = offsetMinutesAt(tz, utcNoon - firstGuess * 60_000);
  const hours = Math.min(MAX_VARIANT_OFFSET, Math.max(MIN_VARIANT_OFFSET, Math.round(offsetMin / 60)));

  const lat = latitude == null ? NaN : Number(latitude);
  return {
    utcOffsetHours: hours === 0 ? 0 : hours, // normalise -0
    hemisphere: Number.isFinite(lat) && lat < 0 ? 'south' : 'north',
  };
}

/** Today's date ("YYYY-MM-DD") in `timezone` (null/invalid → Asia/Jerusalem). */
export function localTodayISO(timezone: string | null | undefined, now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: zoneOrDefault(timezone) });
}

/** "YYYY-MM-DD" + n days (calendar arithmetic, timezone-free). */
export function addDaysISO(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
