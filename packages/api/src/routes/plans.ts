import { Router, type IRouter } from 'express';
import { verifyToken } from '../middleware/auth';
import { db } from '../db/client';
import { getCalendarRange } from '../db/queries/calendar';
import { getGardensByUser } from '../db/queries/garden';
import { fetchWeatherForRegion } from '../services/weather';
import { generateWeeklyPlan } from '../services/weeklyPlan';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';

export const plansRouter: IRouter = Router();

plansRouter.use(verifyToken);

// ── In-memory daily regenerate cap ────────────────────────────────────────────
// The planting_plans table always has at most 1 row per user per day (delete +
// insert on each generation), so we cannot count DB rows to detect extra calls.
// An in-memory counter is acceptable here: it resets on deploy, and the cost
// class (Sonnet, ~1 call/day per user in normal use) makes this safe.
// Key = userId, value = { date: YYYY-MM-DD, count: number }
const regenerateDailyCounts = new Map<string, { date: string; count: number }>();
// Allow 1 forced regeneration per day in addition to the automatic daily generation.
const REGENERATE_DAILY_LIMIT = 1;

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE });
}

async function getOrGeneratePlan(userId: string, forceRegenerate = false, language: 'he' | 'en' = 'he') {
  const today = todayISO();
  const endDate = new Date(today + 'T00:00:00');
  endDate.setDate(endDate.getDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);

  // Return cached plan if generated today
  if (!forceRegenerate) {
    const { data: existing } = await db
      .from('planting_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', today)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const generatedAt = new Date(existing.generated_at);
      const todayStart  = new Date(today + 'T00:00:00');
      if (generatedAt >= todayStart) {
        return { ...existing.plan_data, generatedAt: existing.generated_at };
      }
    }
  }

  // Generate fresh plan
  const [gardens, calendarDays] = await Promise.all([
    getGardensByUser(userId),
    getCalendarRange(today, weekEnd),
  ]);

  if (!calendarDays || calendarDays.length === 0) {
    throw new Error('No calendar data available for this week');
  }

  const garden  = gardens[0] ?? null;
  const weather = await fetchWeatherForRegion(garden?.locationRegion ?? null);
  const plan    = await generateWeeklyPlan(userId, garden, calendarDays, weather, language);

  const generatedAt = new Date().toISOString();

  // Remove stale plans for this week, then persist fresh one
  await db
    .from('planting_plans')
    .delete()
    .eq('user_id', userId)
    .eq('week_start', today);

  const { data: saved } = await db
    .from('planting_plans')
    .insert({
      user_id:      userId,
      garden_id:    garden?.id ?? null,
      week_start:   today,
      week_end:     weekEnd,
      plan_data:    plan,
      generated_at: generatedAt,
    })
    .select()
    .single();

  return { ...plan, generatedAt: saved?.generated_at ?? generatedAt };
}

// GET /api/plans/weekly
plansRouter.get('/weekly', async (req, res) => {
  try {
    const lang = (req.query.lang as string) === 'en' ? 'en' : 'he';
    const plan = await getOrGeneratePlan(req.user!.id, false, lang);
    res.json(plan);
  } catch (err: any) {
    console.error('[GET /api/plans/weekly]', err);
    if (err.message?.includes('No calendar data')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plans/weekly/regenerate
plansRouter.post('/weekly/regenerate', async (req, res) => {
  try {
    const userId = req.user!.id;
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

    // Once-per-day guard: allow at most REGENERATE_DAILY_LIMIT forced regenerations.
    const entry = regenerateDailyCounts.get(userId);
    if (entry && entry.date === todayStr) {
      if (entry.count >= REGENERATE_DAILY_LIMIT) {
        return res.status(429).json({
          error: 'regenerate_limit',
          message: 'התוכנית כבר רועננה היום, נסה שוב מחר',
        });
      }
      entry.count += 1;
    } else {
      regenerateDailyCounts.set(userId, { date: todayStr, count: 1 });
    }

    const lang = (req.body?.lang as string) === 'en' ? 'en' : 'he';
    const plan = await getOrGeneratePlan(userId, true, lang);
    res.json(plan);
  } catch (err: any) {
    console.error('[POST /api/plans/weekly/regenerate]', err);
    res.status(500).json({ error: err.message });
  }
});
