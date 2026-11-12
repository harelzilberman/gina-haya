import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import {
  getVariantDay,
  getVariantDays,
  datesBetween,
  ISRAEL_CALENDAR_LOCATION,
  type CalendarLocation,
} from '../db/queries/calendar';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { localTodayISO, addDaysISO, isValidIanaTimeZone } from '@gina-haya/shared';

export const calendarRouter: IRouter = Router();

// ── Location-aware calendar (backward compatible) ────────────────────────────
//
// /today, /week, /range and /:date accept, optionally:
//   ?gardenId=<uuid>        authenticated; the caller's own garden's timezone + latitude
//   ?tz=<IANA>&lat=<number> anonymous web visitors (lat optional → north)
// With either, days come from biodynamic_calendar_variants (variant resolved
// per date, so a DST change inside a range is handled), "today" is the local
// date in that zone, and each day also carries transitions, utcOffsetHours,
// hemisphere and timezone. With neither (old app versions), the days come from
// the same table for Israel / north (Asia/Jerusalem dates, verified identical
// to the legacy biodynamic_calendar) in the legacy response shape — without
// the variant-only fields. The API no longer reads biodynamic_calendar.

const MAX_VARIANT_RANGE_DAYS = 400;
/** Parameterless /range never had a limit; keep a generous one. */
const MAX_LEGACY_RANGE_DAYS = 1000;
const LEGACY = { legacyShape: true } as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** verifyToken only when ?gardenId= is present (the endpoints stay public otherwise). */
function authIfGarden(req: Request, res: Response, next: NextFunction) {
  return req.query.gardenId ? verifyToken(req, res, next) : next();
}

type LocationResult =
  | { kind: 'legacy' }
  | { kind: 'location'; loc: CalendarLocation }
  | { kind: 'error'; status: number; body: Record<string, string> };

async function resolveCalendarLocation(req: Request): Promise<LocationResult> {
  const gardenId = typeof req.query.gardenId === 'string' ? req.query.gardenId : null;
  if (gardenId) {
    const { data: garden, error } = await db
      .from('gardens')
      .select('id, timezone, latitude')
      .eq('id', gardenId)
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (error) {
      console.error('[calendar] garden lookup failed:', error.message);
      return { kind: 'error', status: 500, body: { error: 'Internal error' } };
    }
    if (!garden) return { kind: 'error', status: 404, body: { error: 'garden_not_found' } };
    return {
      kind: 'location',
      loc: {
        timezone: isValidIanaTimeZone(garden.timezone) ? garden.timezone : null,
        latitude: garden.latitude != null ? Number(garden.latitude) : null,
      },
    };
  }

  const tz = typeof req.query.tz === 'string' ? req.query.tz.trim() : '';
  if (tz) {
    if (!isValidIanaTimeZone(tz)) {
      return { kind: 'error', status: 400, body: { error: 'invalid_tz', message: 'tz must be an IANA timezone' } };
    }
    let latitude: number | null = null;
    if (typeof req.query.lat === 'string' && req.query.lat.trim() !== '') {
      latitude = Number(req.query.lat);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return { kind: 'error', status: 400, body: { error: 'invalid_lat', message: 'lat must be between -90 and 90' } };
      }
    }
    return { kind: 'location', loc: { timezone: tz, latitude } };
  }

  return { kind: 'legacy' };
}

// GET /api/calendar/today — no auth required (auth only with ?gardenId=)
calendarRouter.get('/today', authIfGarden, async (req, res) => {
  try {
    const where = await resolveCalendarLocation(req);
    if (where.kind === 'error') return res.status(where.status).json(where.body);
    if (where.kind === 'location') {
      const day = await getVariantDay(localTodayISO(where.loc.timezone), where.loc);
      if (!day) return res.status(404).json({ error: 'No calendar data for today' });
      return res.json(day);
    }

    const day = await getVariantDay(localTodayISO(ISRAEL_CALENDAR_LOCATION.timezone), ISRAEL_CALENDAR_LOCATION, LEGACY);
    if (!day) return res.status(404).json({ error: 'No calendar data for today' });
    res.json(day);
  } catch (err: any) {
    console.error('[GET /api/calendar/today]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/week — next 7 days, no auth required (auth only with ?gardenId=)
calendarRouter.get('/week', authIfGarden, async (req, res) => {
  try {
    const where = await resolveCalendarLocation(req);
    if (where.kind === 'error') return res.status(where.status).json(where.body);
    if (where.kind === 'location') {
      const from = localTodayISO(where.loc.timezone);
      return res.json(await getVariantDays(datesBetween(from, addDaysISO(from, 6)), where.loc));
    }

    const from = localTodayISO(ISRAEL_CALENDAR_LOCATION.timezone);
    res.json(await getVariantDays(datesBetween(from, addDaysISO(from, 6)), ISRAEL_CALENDAR_LOCATION, LEGACY));
  } catch (err: any) {
    console.error('[GET /api/calendar/week]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/status — date range and day count of current calendar data
// (one variant — every variant covers the same dates)
calendarRouter.get('/status', async (_req, res) => {
  try {
    const oneVariant = (head = false) => db
      .from('biodynamic_calendar_variants')
      .select('date', head ? { count: 'exact', head: true } : undefined)
      .eq('utc_offset_hours', 2)
      .eq('hemisphere', 'north');
    const [countRes, minRes, maxRes] = await Promise.all([
      oneVariant(true),
      oneVariant().order('date', { ascending: true }).limit(1),
      oneVariant().order('date', { ascending: false }).limit(1),
    ]);
    const error = countRes.error ?? minRes.error ?? maxRes.error;
    if (error) throw error;

    res.json({
      count: countRes.count ?? 0,
      minDate: minRes.data?.[0]?.date ?? null,
      maxDate: maxRes.data?.[0]?.date ?? null,
    });
  } catch (err: any) {
    console.error('[GET /api/calendar/status]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/regenerate — admin only. Not available on the API server:
// the container (node:22-alpine) has no Python, so the calendar (legacy Israel
// table + timezone × hemisphere variants) is generated by the "Calendar" GitHub
// Action (.github/workflows/calendar.yml) — monthly, or manually via "Run workflow".
calendarRouter.post('/regenerate', (req: any, res) => {
  const expected = process.env.REGENERATE_SECRET;
  const secret = req.headers['x-regenerate-secret'];
  if (!expected || secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.status(501).json({
    error: 'Calendar regeneration is not available on the API server (no Python in the container). '
      + 'Run it from GitHub: Actions → "Calendar" workflow → "Run workflow".',
    workflow: '.github/workflows/calendar.yml',
  });
});

// GET /api/calendar/range?from=DATE&to=DATE — no auth required (auth only with ?gardenId=)
calendarRouter.get('/range', authIfGarden, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  try {
    const where = await resolveCalendarLocation(req);
    if (where.kind === 'error') return res.status(where.status).json(where.body);
    if (where.kind === 'location') {
      if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
        return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
      }
      const dates = datesBetween(from, to);
      if (dates.length > MAX_VARIANT_RANGE_DAYS) {
        return res.status(400).json({ error: `range must be at most ${MAX_VARIANT_RANGE_DAYS} days` });
      }
      return res.json(await getVariantDays(dates, where.loc));
    }

    if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
      return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
    }
    const dates = datesBetween(from, to);
    if (dates.length > MAX_LEGACY_RANGE_DAYS) {
      return res.status(400).json({ error: `range must be at most ${MAX_LEGACY_RANGE_DAYS} days` });
    }
    res.json(await getVariantDays(dates, ISRAEL_CALENDAR_LOCATION, LEGACY));
  } catch (err: any) {
    console.error('[GET /api/calendar/range]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/:date — specific date YYYY-MM-DD, no auth required (auth only with ?gardenId=)
calendarRouter.get('/:date', authIfGarden, async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }
  try {
    const where = await resolveCalendarLocation(req);
    if (where.kind === 'error') return res.status(where.status).json(where.body);
    if (where.kind === 'location') {
      const day = await getVariantDay(date, where.loc);
      if (!day) return res.status(404).json({ error: 'No calendar data for this date' });
      return res.json(day);
    }

    const day = await getVariantDay(date, ISRAEL_CALENDAR_LOCATION, LEGACY);
    if (!day) return res.status(404).json({ error: 'No calendar data for this date' });
    res.json(day);
  } catch (err: any) {
    console.error('[GET /api/calendar/:date]', err);
    res.status(500).json({ error: err.message });
  }
});
