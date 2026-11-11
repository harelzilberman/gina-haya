import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import { spawn } from 'child_process';
import {
  getCalendarDay,
  getCalendarRange,
  getVariantDay,
  getVariantDays,
  datesBetween,
  type CalendarLocation,
} from '../db/queries/calendar';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { todayInIsrael, localTodayISO, addDaysISO, isValidIanaTimeZone } from '@gina-haya/shared';

export const calendarRouter: IRouter = Router();

// ── Location-aware calendar (backward compatible) ────────────────────────────
//
// /today, /week, /range and /:date accept, optionally:
//   ?gardenId=<uuid>        authenticated; the caller's own garden's timezone + latitude
//   ?tz=<IANA>&lat=<number> anonymous web visitors (lat optional → north)
// With either, days come from biodynamic_calendar_variants (variant resolved
// per date, so a DST change inside a range is handled), "today" is the local
// date in that zone, and each day also carries transitions, utcOffsetHours,
// hemisphere and timezone. With neither, behaviour is exactly as before:
// biodynamic_calendar, Israel time — old app versions depend on it.

const MAX_VARIANT_RANGE_DAYS = 400;
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

    const day = await getCalendarDay(todayInIsrael());
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

    const from = todayInIsrael();
    const toDate = new Date(from + 'T00:00:00');
    toDate.setDate(toDate.getDate() + 6);
    const to = toDate.toISOString().slice(0, 10);
    const days = await getCalendarRange(from, to);
    res.json(days);
  } catch (err: any) {
    console.error('[GET /api/calendar/week]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/status — date range and row count of current calendar data
calendarRouter.get('/status', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('biodynamic_calendar')
      .select('date')
      .order('date', { ascending: true });

    if (error) throw error;

    const dates = (data ?? []).map((r: { date: string }) => r.date);
    res.json({
      count: dates.length,
      minDate: dates[0] ?? null,
      maxDate: dates[dates.length - 1] ?? null,
    });
  } catch (err: any) {
    console.error('[GET /api/calendar/status]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/regenerate — trigger Python calendar script (admin only)
calendarRouter.post('/regenerate', (req: any, res) => {
  const secret = req.headers['x-regenerate-secret'];
  if (secret !== process.env.REGENERATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const python = spawn('python3', ['packages/api/scripts/generate_calendar.py'], {
    env: { ...process.env },
  });

  const TIMEOUT_MS = 120_000;
  let responded = false;

  const killer = setTimeout(() => {
    python.kill('SIGTERM');
    if (!responded) {
      responded = true;
      res.status(504).json({ error: 'תהליך יצירת הלוח לקח יותר מדי זמן' });
    }
  }, TIMEOUT_MS);

  python.stdout.on('data', d => console.log('[calendar/regenerate]', d.toString().trim()));
  python.stderr.on('data', d => console.error('[calendar/regenerate]', d.toString().trim()));

  python.on('close', (code) => {
    clearTimeout(killer);
    // Timezone/hemisphere variants (biodynamic_calendar_variants) run after the
    // normal run, in the background: 54 variants × 400 days take longer than an
    // HTTP request should be held open. Result is logged only.
    runVariantsInBackground();
    if (responded) return;
    responded = true;
    if (code === 0) {
      res.json({ success: true, message: 'הלוח עודכן בהצלחה', variants: 'started' });
    } else {
      res.status(500).json({ error: `תהליך Python נכשל עם קוד ${code}`, variants: 'started' });
    }
  });
});

const VARIANTS_TIMEOUT_MS = 15 * 60_000;
let variantsRunning = false;

/** `generate_calendar.py --variants` — at most one run at a time per process. */
function runVariantsInBackground(): void {
  if (variantsRunning) {
    console.warn('[calendar/regenerate --variants] already running — skipped');
    return;
  }
  variantsRunning = true;
  const proc = spawn('python3', ['packages/api/scripts/generate_calendar.py', '--variants'], {
    env: { ...process.env },
  });
  const killer = setTimeout(() => proc.kill('SIGTERM'), VARIANTS_TIMEOUT_MS);
  proc.stdout.on('data', d => console.log('[calendar/regenerate --variants]', d.toString().trim()));
  proc.stderr.on('data', d => console.error('[calendar/regenerate --variants]', d.toString().trim()));
  proc.on('error', err => console.error('[calendar/regenerate --variants] spawn failed:', err.message));
  proc.on('close', code => {
    clearTimeout(killer);
    variantsRunning = false;
    // 0 = ok, 2 = stored but the regression check found mismatches, other = failed
    console.log(`[calendar/regenerate --variants] exited with code ${code}`);
  });
}

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

    const days = await getCalendarRange(from, to);
    res.json(days);
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

    const day = await getCalendarDay(date);
    if (!day) return res.status(404).json({ error: 'No calendar data for this date' });
    res.json(day);
  } catch (err: any) {
    console.error('[GET /api/calendar/:date]', err);
    res.status(500).json({ error: err.message });
  }
});
