import { Router, type IRouter } from 'express';
import { exec } from 'child_process';
import { getCalendarDay, getCalendarRange } from '../db/queries/calendar';
import { db } from '../db/client';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';

export const calendarRouter: IRouter = Router();

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE });
}

// GET /api/calendar/today — no auth required
calendarRouter.get('/today', async (_req, res) => {
  try {
    const day = await getCalendarDay(todayISO());
    if (!day) return res.status(404).json({ error: 'No calendar data for today' });
    res.json(day);
  } catch (err: any) {
    console.error('[GET /api/calendar/today]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/week — next 7 days, no auth required
calendarRouter.get('/week', async (_req, res) => {
  try {
    const from = todayISO();
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
calendarRouter.post('/regenerate', async (req: any, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  exec(
    'python packages/api/scripts/generate_calendar.py',
    { env: { ...process.env } },
    (error, stdout, stderr) => {
      if (error) {
        console.error('[calendar/regenerate] error:', error);
        return;
      }
      console.log('[calendar/regenerate] Done:', stdout);
    }
  );

  res.json({ message: 'Calendar regeneration started', status: 'running' });
});

// GET /api/calendar/range?from=DATE&to=DATE — no auth required
calendarRouter.get('/range', async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  try {
    const days = await getCalendarRange(from, to);
    res.json(days);
  } catch (err: any) {
    console.error('[GET /api/calendar/range]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/:date — specific date YYYY-MM-DD, no auth required
calendarRouter.get('/:date', async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }
  try {
    const day = await getCalendarDay(date);
    if (!day) return res.status(404).json({ error: 'No calendar data for this date' });
    res.json(day);
  } catch (err: any) {
    console.error('[GET /api/calendar/:date]', err);
    res.status(500).json({ error: err.message });
  }
});
