/**
 * Irrigation utilities for the Gina-Haya API.
 *
 * IMPORTANT: lastScheduledIrrigation infers scheduled runs from config — it never
 * observes them. A returned Date means "the controller was supposed to run then",
 * not "water was actually delivered". Automatic irrigation events are never written
 * to plant_timeline; only manual waterings appear there.
 */

import { zoneOffsetMinutes, isValidIanaTimeZone, DEFAULT_CALENDAR_TIMEZONE } from '@gina-haya/shared';

interface ParsedTime { h: number; m: number }

function parseTime(t: string): ParsedTime | null {
  // Postgres TIME[] returns 'HH:MM:SS'; accept both 'HH:MM' and 'HH:MM:SS'.
  const parts = t.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { h, m };
}

/**
 * Returns true when a task is a watering task, keyed on the structured `category`
 * field — not title text. Used in both:
 *   - starter-task seeding (garden.ts): skip watering tasks for auto-irrigated plants
 *   - Chupchu analysis filtering (chupchu.ts): strip watering tasks from AI output
 * Both sites import from here so the rule lives in one place.
 */
export function isWateringTask(task: { category?: string | null }): boolean {
  return task.category === 'watering';
}

// Per-timezone Intl formatters — created once per zone, reused on every call.
interface ZoneFormatters { full: Intl.DateTimeFormat; verify: Intl.DateTimeFormat }
const FORMATTERS = new Map<string, ZoneFormatters>();

function formattersFor(timeZone: string): ZoneFormatters {
  let f = FORMATTERS.get(timeZone);
  if (!f) {
    f = {
      full: new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        weekday: 'short', hour: 'numeric', minute: 'numeric',
        hourCycle: 'h23',
      }),
      verify: new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric',
        hourCycle: 'h23',
      }),
    };
    FORMATTERS.set(timeZone, f);
  }
  return f;
}

/** Map weekday short name (en-US locale) → 0-6 where 0 = Sunday. */
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function localDateParts(d: Date, timeZone: string): {
  year: number; month0: number; day: number; weekday: number; hour: number; minute: number;
} {
  const parts = formattersFor(timeZone).full.formatToParts(d);
  const g = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? 'Sun';
  return {
    year:    g('year'),
    month0:  g('month') - 1,  // Intl months are 1-based; convert to 0-based
    day:     g('day'),
    weekday: WEEKDAY_MAP[weekdayStr] ?? 0,
    hour:    g('hour'),
    minute:  g('minute'),
  };
}

/**
 * Convert a wall-clock date+time in `timeZone` to a UTC Date, DST-correct.
 *
 * Candidate offsets are the zone's offsets 12 h either side of the anchor
 * (they differ only across a DST change); each candidate is verified via Intl.
 * Returns null when the wall-clock time does not exist (skipped by a DST
 * spring-forward).
 */
function wallClockToUtc(
  year: number, month0: number, day: number,
  h: number, m: number,
  timeZone: string,
): Date | null {
  // Anchor: treat the wall-clock as if it were UTC, then subtract the zone offset.
  const anchorUtcMs = Date.UTC(year, month0, day, h, m, 0, 0);
  const candidates = new Set([
    zoneOffsetMinutes(timeZone, anchorUtcMs - 12 * 3_600_000),
    zoneOffsetMinutes(timeZone, anchorUtcMs + 12 * 3_600_000),
  ]);
  const { verify } = formattersFor(timeZone);
  for (const offsetMin of candidates) {
    const tryMs = anchorUtcMs - offsetMin * 60_000;
    const parts = verify.formatToParts(new Date(tryMs));
    const g = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
    if (
      g('year')   === year       &&
      g('month')  === month0 + 1 &&  // Intl is 1-based
      g('day')    === day        &&
      g('hour')   === h          &&
      g('minute') === m
    ) {
      return new Date(tryMs);
    }
  }
  return null;
}

/**
 * Returns the most recent moment this plant's irrigation controller was scheduled
 * to run, at or before `now` — or null if:
 *  - autoIrrigation is false, or
 *  - irrigationDays / irrigationTimes are null or empty, or
 *  - no scheduled run falls within the past 8 days.
 *
 * @param autoIrrigation  Whether automatic irrigation is enabled.
 * @param irrigationDays  Weekday numbers 0–6 (0 = Sunday) when irrigation runs.
 * @param irrigationTimes Wall-clock times in the GARDEN's local time (its
 *                        timezone), as the user set them on the controller.
 *                        Accepts 'HH:MM' or 'HH:MM:SS' (Postgres TIME[] format).
 * @param now             Reference instant (injected — keeps this a pure function).
 * @param timeZone        The garden's IANA zone; null/invalid → Asia/Jerusalem.
 */
export function lastScheduledIrrigation(
  autoIrrigation: boolean,
  irrigationDays: number[] | null,
  irrigationTimes: string[] | null,
  now: Date,
  timeZone?: string | null,
): Date | null {
  const tz = isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_CALENDAR_TIMEZONE;
  if (!autoIrrigation || !irrigationDays?.length || !irrigationTimes?.length) {
    return null;
  }

  const times = irrigationTimes
    .map(parseTime)
    .filter((t): t is ParsedTime => t !== null);

  if (times.length === 0) return null;

  const nowMs = now.getTime();
  let best: Date | null = null;

  // Walk back at most 8 days. Subtracting exactly 24 h from a UTC timestamp always
  // lands in the previous local calendar day — DST shifts are at most 1 h, so a
  // 24 h step can never skip over a day boundary.
  for (let daysBack = 0; daysBack <= 8; daysBack++) {
    const probe = new Date(nowMs - daysBack * 86_400_000);
    const il    = localDateParts(probe, tz);

    if (!irrigationDays.includes(il.weekday)) continue;

    for (const { h, m } of times) {
      // On today (daysBack === 0) skip times that have not yet passed.
      if (daysBack === 0 && (h > il.hour || (h === il.hour && m > il.minute))) continue;

      const scheduled = wallClockToUtc(il.year, il.month0, il.day, h, m, tz);
      if (!scheduled || scheduled.getTime() > nowMs) continue;

      if (best === null || scheduled > best) {
        best = scheduled;
      }
    }
  }

  return best;
}
