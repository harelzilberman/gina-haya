import { Router } from 'express';
import { getCalendarDay, getCalendarRange } from '../db/queries/calendar';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';

export const calendarRouter = Router();

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
