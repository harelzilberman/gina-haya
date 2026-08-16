/**
 * Irrigation utilities for the Gina-Haya API.
 *
 * IMPORTANT: lastScheduledIrrigation infers scheduled runs from config — it never
 * observes them. A returned Date means "the controller was supposed to run then",
 * not "water was actually delivered". Automatic irrigation events are never written
 * to plant_timeline; only manual waterings appear there.
 */

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

// Shared Intl formatters — created once, reused on every call.
const ISRAEL_FULL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric', month: 'numeric', day: 'numeric',
  weekday: 'short', hour: 'numeric', minute: 'numeric',
  hour12: false,
});

const ISRAEL_VERIFY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric',
  hour12: false,
});

/** Map weekday short name (en-US locale) → 0-6 where 0 = Sunday. */
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function israelDateParts(d: Date): {
  year: number; month0: number; day: number; weekday: number; hour: number; minute: number;
} {
  const parts = ISRAEL_FULL_FORMATTER.formatToParts(d);
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
 * Convert an Israel wall-clock date+time to a UTC Date, DST-correct.
 *
 * Israel is always UTC+2 (standard, Oct–Mar) or UTC+3 (DST, Mar–Oct).
 * Both offsets are tried and verified via Intl — no hard-coded offset constant.
 * Returns null only if neither offset produces the expected wall-clock reading
 * (should never happen for valid Israel dates).
 */
function israelWallClockToUtc(
  ilYear: number, ilMonth0: number, ilDay: number,
  h: number, m: number,
): Date | null {
  // Anchor: treat the wall-clock as if it were UTC, then subtract the Israel offset.
  const anchorUtcMs = Date.UTC(ilYear, ilMonth0, ilDay, h, m, 0, 0);
  for (const subtractMs of [2 * 3_600_000, 3 * 3_600_000]) {
    const tryMs = anchorUtcMs - subtractMs;
    const parts = ISRAEL_VERIFY_FORMATTER.formatToParts(new Date(tryMs));
    const g = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
    if (
      g('year')   === ilYear      &&
      g('month')  === ilMonth0 + 1 &&  // Intl is 1-based
      g('day')    === ilDay        &&
      g('hour')   === h            &&
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
 * @param irrigationTimes Wall-clock times in Asia/Jerusalem local time.
 *                        Accepts 'HH:MM' or 'HH:MM:SS' (Postgres TIME[] format).
 * @param now             Reference instant (injected — keeps this a pure function).
 */
export function lastScheduledIrrigation(
  autoIrrigation: boolean,
  irrigationDays: number[] | null,
  irrigationTimes: string[] | null,
  now: Date,
): Date | null {
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
  // lands in the previous Israel calendar day — DST shifts are at most 1 h, so a
  // 24 h step can never skip over a day boundary.
  for (let daysBack = 0; daysBack <= 8; daysBack++) {
    const probe = new Date(nowMs - daysBack * 86_400_000);
    const il    = israelDateParts(probe);

    if (!irrigationDays.includes(il.weekday)) continue;

    for (const { h, m } of times) {
      // On today (daysBack === 0) skip times that have not yet passed.
      if (daysBack === 0 && (h > il.hour || (h === il.hour && m > il.minute))) continue;

      const scheduled = israelWallClockToUtc(il.year, il.month0, il.day, h, m);
      if (!scheduled || scheduled.getTime() > nowMs) continue;

      if (best === null || scheduled > best) {
        best = scheduled;
      }
    }
  }

  return best;
}
