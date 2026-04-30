import { Router, type IRouter } from 'express';
import { spawn } from 'child_process';
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
    if (responded) return;
    responded = true;
    if (code === 0) {
      res.json({ success: true, message: 'הלוח עודכן בהצלחה' });
    } else {
      res.status(500).json({ error: `תהליך Python נכשל עם קוד ${code}` });
    }
  });
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
