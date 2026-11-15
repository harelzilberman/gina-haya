import SunCalc from 'suncalc';
import { localDateToUTCMidnight } from './date';
import { DEFAULT_CALENDAR_TIMEZONE, isValidIanaTimeZone, localTodayISO } from './calendarVariant';

/** Israel default location (Jerusalem) — used when a garden has no coordinates. */
export const ISRAEL_DEFAULT_COORDS = { latitude: 31.78, longitude: 35.22 } as const;

export interface MoonRiseSet {
  /** Moonrise during the local day, or null when the moon does not rise that day. */
  rise: Date | null;
  /** Moonset during the local day, or null when the moon does not set that day. */
  set: Date | null;
  /** No rise/set that day and the moon is above the horizon all day. */
  alwaysUp: boolean;
  /** No rise/set that day and the moon is below the horizon all day. */
  alwaysDown: boolean;
}

const HOUR_MS = 3_600_000;
const RAD = Math.PI / 180;
/** Horizon correction (refraction + semi-diameter), as in suncalc.getMoonTimes. */
const HORIZON = 0.133 * RAD;

/**
 * Moonrise and moonset during the LOCAL day `date` ("YYYY-MM-DD") in `timeZone`
 * at the given coordinates.
 *
 * suncalc.getMoonTimes() always scans from midnight in the runtime's zone (or
 * UTC); this runs the same algorithm (altitude sampled every hour with a
 * quadratic fit through 3 points) from the garden's local midnight to the next
 * local midnight, so it is correct for any zone, including DST days.
 */
export function moonRiseSetForLocalDate(
  date: string,
  latitude: number,
  longitude: number,
  timeZone: string | null | undefined,
): MoonRiseSet {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_CALENDAR_TIMEZONE;
  const start = Date.parse(localDateToUTCMidnight(date, zone));
  const [y, m, d] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const end = Date.parse(localDateToUTCMidnight(nextDate, zone));
  const hours = Math.max(1, Math.round((end - start) / HOUR_MS));

  const alt = (h: number) =>
    SunCalc.getMoonPosition(new Date(start + h * HOUR_MS), latitude, longitude).altitude - HORIZON;

  let rise: number | null = null;
  let set: number | null = null;
  let h0 = alt(0);
  let ye = 0;

  // Two hours per step: fit a parabola through h0 (i−1), h1 (i), h2 (i+1).
  for (let i = 1; i <= hours; i += 2) {
    const h1 = alt(i);
    const h2 = alt(Math.min(i + 1, hours));
    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const xe = -b / (2 * a);
    ye = (a * xe + b) * xe + h1;
    const disc = b * b - 4 * a * h1;
    let roots = 0;
    let x1 = 0;
    let x2 = 0;

    if (disc >= 0) {
      const dx = Math.sqrt(disc) / (Math.abs(a) * 2);
      x1 = xe - dx;
      x2 = xe + dx;
      if (Math.abs(x1) <= 1) roots++;
      if (Math.abs(x2) <= 1) roots++;
      if (x1 < -1) x1 = x2;
    }

    if (roots === 1) {
      if (h0 < 0) rise = i + x1;
      else set = i + x1;
    } else if (roots === 2) {
      rise = i + (ye < 0 ? x2 : x1);
      set  = i + (ye < 0 ? x1 : x2);
    }

    if (rise !== null && set !== null) break;
    h0 = h2;
  }

  const toDate = (h: number | null) =>
    h === null || h < 0 || h > hours ? null : new Date(start + h * HOUR_MS);
  const riseAt = toDate(rise);
  const setAt  = toDate(set);
  const none = riseAt === null && setAt === null;

  return {
    rise: riseAt,
    set: setAt,
    alwaysUp: none && ye > 0,
    alwaysDown: none && ye <= 0,
  };
}

/** "HH:MM" for an instant in `timeZone` (24-hour for he, locale default otherwise). */
export function formatTimeInZone(instant: Date, timeZone: string | null | undefined, locale: string): string {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_CALENDAR_TIMEZONE;
  return instant.toLocaleTimeString(locale, { timeZone: zone, hour: '2-digit', minute: '2-digit' });
}

// ── Moon orientation as seen from a location ─────────────────────────────────

export interface MoonDisplayAngle {
  /**
   * Zenith angle of the moon's bright limb, in radians: the direction of the
   * lit side's midpoint on the disc, measured from "straight up" (towards the
   * observer's zenith) counter-clockwise as the observer sees the sky.
   * 0 = lit at the top, π/2 = left, π = bottom, 3π/2 = right.
   */
  angleRad: number;
  /** The instant the angle is computed for. */
  at: Date;
  /** That instant as "HH:MM" (24-hour) in the location's timezone. */
  atLocalTime: string;
}

const MINUTE_MS = 60_000;
const TRANSIT_STEP_MS = 10 * MINUTE_MS;
/** Longer than one lunar day (~24 h 50 m), so a sampled window always holds a transit. */
const TRANSIT_SEARCH_MS = 26 * HOUR_MS;

function moonAltitude(ms: number, latitude: number, longitude: number): number {
  return SunCalc.getMoonPosition(new Date(ms), latitude, longitude).altitude;
}

/**
 * The first upper transit (local maximum of the moon's altitude) after `fromMs`:
 * sampled every 10 minutes, then refined by ternary search to well under a minute.
 */
function nextUpperTransit(fromMs: number, latitude: number, longitude: number): number {
  const alt = (ms: number) => moonAltitude(ms, latitude, longitude);
  const steps = Math.ceil(TRANSIT_SEARCH_MS / TRANSIT_STEP_MS);
  let prev = alt(fromMs);
  let cur = alt(fromMs + TRANSIT_STEP_MS);
  for (let i = 2; i <= steps; i++) {
    const t = fromMs + i * TRANSIT_STEP_MS;
    const next = alt(t);
    if (cur >= prev && cur > next) {
      let a = t - 2 * TRANSIT_STEP_MS;
      let b = t;
      for (let k = 0; k < 30; k++) {
        const m1 = a + (b - a) / 3;
        const m2 = b - (b - a) / 3;
        if (alt(m1) < alt(m2)) a = m1; else b = m2;
      }
      return (a + b) / 2;
    }
    prev = cur;
    cur = next;
  }
  return fromMs; // not reached: every 26 h window contains an upper transit
}

/** Zenith angle of the bright limb at an instant (suncalc: illumination.angle − parallacticAngle). */
export function moonBrightLimbAngleAt(instant: Date, latitude: number, longitude: number): number {
  const chi = SunCalc.getMoonIllumination(instant).angle;
  const q = SunCalc.getMoonPosition(instant, latitude, longitude).parallacticAngle;
  const a = (chi - q) % (2 * Math.PI);
  return a < 0 ? a + 2 * Math.PI : a;
}

/**
 * How the moon is oriented in the sky for the LOCAL day `date` ("YYYY-MM-DD")
 * at a location — the angle at which to draw the lit side.
 *
 * The instant used:
 *   • today (in `timeZone`): now, if the moon is above the horizon; otherwise
 *     its next upper transit (highest altitude);
 *   • any other date: that night's upper transit — the first one after local
 *     noon of `date`.
 */
export function moonDisplayAngle(
  date: string,
  latitude: number,
  longitude: number,
  timeZone: string | null | undefined,
  now: Date = new Date(),
): MoonDisplayAngle {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_CALENDAR_TIMEZONE;
  let atMs: number;
  if (date === localTodayISO(zone, now)) {
    atMs = moonAltitude(now.getTime(), latitude, longitude) > HORIZON
      ? now.getTime()
      : nextUpperTransit(now.getTime(), latitude, longitude);
  } else {
    const localNoon = Date.parse(localDateToUTCMidnight(date, zone)) + 12 * HOUR_MS;
    atMs = nextUpperTransit(localNoon, latitude, longitude);
  }
  const at = new Date(atMs);
  return {
    angleRad: moonBrightLimbAngleAt(at, latitude, longitude),
    at,
    atLocalTime: at.toLocaleTimeString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}
