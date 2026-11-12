import { db } from '../db/client';
import { isValidIanaTimeZone, DEFAULT_CALENDAR_TIMEZONE } from '@gina-haya/shared';
import type { CalendarLocation } from '../db/queries/calendar';

// ── Garden zone / user home zone ─────────────────────────────────────────────
//
// Garden-scoped logic (tasks, irrigation, calendar, prep scheduling) uses the
// GARDEN's zone. Person-scoped logic (push, email, dashboard) uses the user's
// HOME zone: their is_default garden's, else their first garden's (by
// created_at), else Asia/Jerusalem. No location → Israel / north defaults.

export interface Zone {
  /** Valid IANA zone (Asia/Jerusalem when the garden has none). */
  timezone: string;
  /** Latitude, or null (→ north). */
  latitude: number | null;
}

export const ISRAEL_ZONE: Readonly<Zone> = Object.freeze({
  timezone: DEFAULT_CALENDAR_TIMEZONE,
  latitude: null,
});

type GardenLike = { timezone?: string | null; latitude?: number | string | null } | null | undefined;

/** The garden's zone (Israel / north for missing values). */
export function getGardenZone(garden: GardenLike): Zone {
  const lat = garden?.latitude == null ? NaN : Number(garden.latitude);
  return {
    timezone: isValidIanaTimeZone(garden?.timezone) ? garden!.timezone! : DEFAULT_CALENDAR_TIMEZONE,
    latitude: Number.isFinite(lat) ? lat : null,
  };
}

/** Zone → calendar location (variant lookup). */
export function calendarLocationOf(zone: Zone): CalendarLocation {
  return { timezone: zone.timezone, latitude: zone.latitude };
}

type HomeGardenRow = {
  user_id: string;
  timezone: string | null;
  latitude: number | string | null;
  is_default: boolean | null;
  created_at: string | null;
};

function pickHome(rows: HomeGardenRow[]): Zone {
  if (rows.length === 0) return { ...ISRAEL_ZONE };
  const sorted = [...rows].sort((a, b) => {
    if (!!a.is_default !== !!b.is_default) return a.is_default ? -1 : 1;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });
  return getGardenZone(sorted[0]);
}

/** Home zones for many users in one query (cron jobs). Missing users → Israel. */
export async function getHomeZonesForUsers(userIds: string[]): Promise<Map<string, Zone>> {
  const out = new Map<string, Zone>();
  const ids = [...new Set(userIds)];
  const byUser = new Map<string, HomeGardenRow[]>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await db
      .from('gardens')
      .select('user_id, timezone, latitude, is_default, created_at')
      .in('user_id', chunk);
    if (error) {
      console.warn('[zone] home-zone lookup failed, using Israel:', error.message);
      continue;
    }
    for (const row of (data ?? []) as HomeGardenRow[]) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row);
      byUser.set(row.user_id, list);
    }
  }
  for (const id of ids) out.set(id, pickHome(byUser.get(id) ?? []));
  return out;
}

// Per-request memo: keyed on the request object, so it is dropped with it.
const requestCache = new WeakMap<object, Map<string, Promise<Zone>>>();

/**
 * The user's home zone. Pass the Express `req` to cache the lookup for the
 * rest of that request; without it, every call queries.
 */
export function getUserHomeZone(userId: string, req?: object): Promise<Zone> {
  let memo: Map<string, Promise<Zone>> | undefined;
  if (req) {
    memo = requestCache.get(req);
    if (!memo) {
      memo = new Map();
      requestCache.set(req, memo);
    }
    const hit = memo.get(userId);
    if (hit) return hit;
  }
  const p = getHomeZonesForUsers([userId]).then(m => m.get(userId) ?? { ...ISRAEL_ZONE });
  memo?.set(userId, p);
  return p;
}

/** The garden's zone by id (owner-scoped when userId is given). Israel when not found. */
export async function getGardenZoneById(gardenId: string | null | undefined, userId?: string): Promise<Zone> {
  if (!gardenId) return { ...ISRAEL_ZONE };
  let q = db.from('gardens').select('timezone, latitude').eq('id', gardenId);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return { ...ISRAEL_ZONE };
  return getGardenZone(data);
}

/** Local date ("YYYY-MM-DD") and minutes since local midnight in `timeZone` at `now`. */
export function localClock(timeZone: string, now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  return {
    date: now.toLocaleDateString('sv-SE', { timeZone }),
    minutes: get('hour') * 60 + get('minute'),
  };
}
