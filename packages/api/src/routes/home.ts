import { Router } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const homeRouter = Router();

// GET /api/home/summary
// Returns all home screen sections in one payload
homeRouter.get('/summary', verifyToken, async (req: any, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // ── 1. Today's tasks ──────────────────────────────────────────────────
    const { data: tasks, error: tasksError } = await db
      .from('garden_tasks')
      .select('id, title, date, status, plant_name')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('date', today)
      .order('date', { ascending: true })
      .limit(5);

    if (tasksError) console.error('tasks error:', tasksError);

    // ── 2. Garden health snapshot ─────────────────────────────────────────
    const { data: gardens, error: gardensError } = await db
      .from('gardens')
      .select('id, name')
      .eq('user_id', userId);

    if (gardensError) console.error('gardens error:', gardensError);

    const gardenIds = (gardens || []).map((g: any) => g.id);

    let plantCount = 0;
    let trackerCount = 0;

    if (gardenIds.length > 0) {
      const { count: pCount } = await db
        .from('garden_plants')
        .select('id', { count: 'exact', head: true })
        .in('garden_id', gardenIds)
        .is('archived_at', null);
      plantCount = pCount ?? 0;

      const { count: tCount } = await db
        .from('plant_trackers')
        .select('id', { count: 'exact', head: true })
        .in('garden_id', gardenIds)
        .is('deleted_at', null);
      trackerCount = tCount ?? 0;
    }

    // ── 3. Recent activity ────────────────────────────────────────────────
    const { data: recentTimeline } = await db
      .from('plant_timeline')
      .select(`
        id, entry_type, created_at, photo_path,
        garden_plants!inner(common_name_he, garden_id, gardens!inner(user_id))
      `)
      .eq('garden_plants.gardens.user_id', userId)
      .in('entry_type', ['watering', 'photo', 'chupchu'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Pick last of each type
    const timeline = (recentTimeline ?? []) as any[];
    const lastWatering = timeline.find((e: any) => e.entry_type === 'watering');
    const lastPhoto = timeline.find((e: any) => e.entry_type === 'photo');
    const lastChupchu = timeline.find((e: any) => e.entry_type === 'chupchu');

    const formatRelativeTime = (isoDate: string): string => {
      const diff = Date.now() - new Date(isoDate).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `לפני ${days} ${days === 1 ? 'יום' : 'ימים'}`;
      if (hours > 0) return `לפני ${hours} ${hours === 1 ? 'שעה' : 'שעות'}`;
      return `לפני ${minutes} דקות`;
    };

    const recentActivity = [
      lastWatering ? {
        type: 'watering',
        plantName: lastWatering.garden_plants?.common_name_he ?? '',
        timeAgo: formatRelativeTime(lastWatering.created_at),
      } : null,
      lastPhoto ? {
        type: 'photo',
        plantName: lastPhoto.garden_plants?.common_name_he ?? '',
        timeAgo: formatRelativeTime(lastPhoto.created_at),
        photoPath: lastPhoto.photo_path,
      } : null,
      lastChupchu ? {
        type: 'chupchu',
        plantName: lastChupchu.garden_plants?.common_name_he ?? '',
        timeAgo: formatRelativeTime(lastChupchu.created_at),
      } : null,
    ].filter(Boolean);

    // ── 4. Next planting window ───────────────────────────────────────────
    const { data: nextWindows } = await db
      .from('biodynamic_calendar')
      .select('date, day_type, day_type_he, day_type_emoji, planting_score, moon_phase_name_he')
      .gt('date', today)
      .gte('planting_score', 7)
      .order('date', { ascending: true })
      .limit(3);

    // ── 5. Assemble response ──────────────────────────────────────────────
    res.json({
      todayTasks: tasks || [],
      gardenHealth: {
        gardenCount: (gardens || []).length,
        plantCount,
        trackerCount,
      },
      recentActivity,
      nextPlantingWindows: (nextWindows || []).map((w: any) => ({
        date: w.date,
        dayType: w.day_type,
        dayTypeHe: w.day_type_he,
        dayTypeEmoji: w.day_type_emoji,
        score: w.planting_score,
        moonPhaseHe: w.moon_phase_name_he,
      })),
    });
  } catch (e) {
    console.error('home summary error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});
