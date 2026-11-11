import { isValidIanaTimeZone, localTodayISO, DEFAULT_CALENDAR_TIMEZONE } from '@gina-haya/shared';
import { useAuthStore } from '../stores/authStore';
import { useGardenStore } from '../stores/gardenStore';
import { useGardenLocation } from './useGardenLocation';

// ── Calendar zone ────────────────────────────────────────────────────────────
//
// Which timezone and hemisphere the biodynamic calendar is shown for, and the
// query that makes /api/calendar/* serve that variant:
//   logged in with a garden → ?gardenId=  (server uses the garden's timezone +
//                             latitude; garden without timezone → Israel)
//   otherwise               → ?tz=<browser zone> (latitude unknown → north)

export interface CalendarZone {
  /** IANA zone used for "today" and date formatting. */
  timezone: string;
  hemisphere: 'north' | 'south';
  /** Query string for /api/calendar/* (no leading "?"). */
  query: string;
  /** Bearer token to send (gardenId mode only). */
  token?: string;
  /** False while gardens are still loading for a logged-in user. */
  ready: boolean;
}

export function browserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidIanaTimeZone(tz) ? tz : DEFAULT_CALENDAR_TIMEZONE;
  } catch {
    return DEFAULT_CALENDAR_TIMEZONE;
  }
}

export function useCalendarZone(): CalendarZone {
  const token = useAuthStore(s => s.session?.access_token);
  const gardensLoading = useGardenStore(s => s.isLoading);
  const gardenCount = useGardenStore(s => s.gardens.length);
  const { garden } = useGardenLocation();

  if (token && garden) {
    const lat = garden.latitude != null ? Number(garden.latitude) : null;
    return {
      timezone: isValidIanaTimeZone(garden.timezone) ? garden.timezone : DEFAULT_CALENDAR_TIMEZONE,
      hemisphere: lat != null && lat < 0 ? 'south' : 'north',
      query: `gardenId=${encodeURIComponent(garden.id)}`,
      token,
      ready: true,
    };
  }

  const tz = browserTimeZone();
  return {
    timezone: tz,
    hemisphere: 'north',
    query: `tz=${encodeURIComponent(tz)}`,
    // Logged in but gardens not loaded yet: wait instead of fetching twice.
    ready: !(token && gardensLoading && gardenCount === 0),
  };
}

/** Append the zone query to an /api/calendar path. */
export function withZone(path: string, zone: Pick<CalendarZone, 'query'>): string {
  return `${path}${path.includes('?') ? '&' : '?'}${zone.query}`;
}

/** Today ("YYYY-MM-DD") in the zone. */
export function zoneToday(zone: Pick<CalendarZone, 'timezone'>): string {
  return localTodayISO(zone.timezone);
}

/** Milliseconds until the next local midnight in `timeZone`. */
export function msUntilLocalMidnight(timeZone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  const elapsed = get('hour') * 3600 + get('minute') * 60 + get('second');
  return Math.max(1000, (86_400 - elapsed) * 1000 + 500);
}
