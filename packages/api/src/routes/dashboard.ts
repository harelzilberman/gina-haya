import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { getCalendarDay } from '../db/queries/calendar';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';

export const dashboardRouter: IRouter = Router();
dashboardRouter.use(verifyToken);

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE });
}

const DAY_TYPE_AFFINITY: Record<string, string[]> = {
  fruit: [
    'עגבנייה', 'מלפפון', 'פלפל', 'דלעת', 'אבטיח', 'מלון', 'תירס', 'חציל',
    'שעועית', 'אפונה', 'עגבנייה שרי', 'קישוא',
    'tomato', 'cucumber', 'pepper', 'zucchini', 'watermelon', 'melon',
    'corn', 'eggplant', 'beans', 'peas', 'squash',
  ],
  leaf: [
    'חסה', 'תרד', 'עלי סלק', 'כרוב', 'מנגולד', 'רוקט', 'בזיליקום',
    'פטרוזיליה', 'כוסברה', 'שמיר', 'נענע', 'עשבי תיבול',
    'lettuce', 'spinach', 'chard', 'cabbage', 'rocket', 'arugula',
    'basil', 'parsley', 'cilantro', 'dill', 'mint', 'herbs',
  ],
  root: [
    'גזר', 'בצל', 'שום', 'סלק', 'לפת', 'צנון', 'תפוח אדמה', 'שומר',
    'כרישה', "ג'ינג'ר", 'שאלוט',
    'carrot', 'onion', 'garlic', 'beetroot', 'radish', 'turnip',
    'potato', 'fennel', 'leek', 'ginger', 'shallot',
  ],
  flower: [
    'ורד', 'חמנייה', 'קלנדולה', 'נסטורציום', "בוראג'", 'לבנדר',
    'כלנית', 'נרקיס', 'צבעוני',
    'rose', 'sunflower', 'calendula', 'nasturtium', 'borage', 'lavender',
    'anemone', 'narcissus', 'tulip',
  ],
};

function isPlantMatch(nameHe: string, nameEn: string, dayType: string): boolean {
  const keywords = DAY_TYPE_AFFINITY[dayType] ?? [];
  const heLower = (nameHe ?? '').toLowerCase().trim();
  const enLower = (nameEn ?? '').toLowerCase().trim();
  return keywords.some(kw => {
    const kwLower = kw.toLowerCase();
    return heLower.includes(kwLower) || kwLower.includes(heLower) ||
           enLower.includes(kwLower) || kwLower.includes(enLower);
  });
}

function getAction(dayType: string): string {
  if (dayType === 'fruit')  return 'harvest';
  if (dayType === 'leaf')   return 'harvest';
  if (dayType === 'root')   return 'plant';
  if (dayType === 'flower') return 'harvest';
  return 'harvest';
}

// GET /api/dashboard/today-actions
dashboardRouter.get('/today-actions', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const today = todayISO();

    // 1. Calendar data
    const calendarDay = await getCalendarDay(today);
    const dayType = calendarDay?.dayType ?? 'leaf';
    const isNode = calendarDay?.nodeActive ?? false;

    // 2. Garden maps — extract all plants from all beds
    const { data: maps, error: mapsErr } = await db
      .from('garden_maps')
      .select('id, map_data')
      .eq('user_id', userId);

    if (mapsErr) throw mapsErr;

    const allPlants: Array<{
      plantNameHe: string;
      plantNameEn: string;
      emoji: string;
      gardenName: string;
    }> = [];

    for (const map of maps ?? []) {
      const mapData = map.map_data as any;
      for (const bed of mapData?.beds ?? []) {
        const bedName: string = bed?.name ?? '';
        for (const plant of bed?.plants ?? []) {
          const nameHe: string = plant?.plantNameHe ?? plant?.plant_name_he ?? '';
          const nameEn: string = plant?.plantNameEn ?? plant?.plant_name_en ?? '';
          if (nameHe || nameEn) {
            allPlants.push({
              plantNameHe: nameHe,
              plantNameEn: nameEn,
              emoji: plant?.emoji ?? '🌿',
              gardenName: bedName,
            });
          }
        }
      }
    }

    // 3. Plant trackers with latest checkin date
    const { data: trackers } = await db
      .from('plant_trackers')
      .select('id, plant_name_he, plant_name_en')
      .eq('user_id', userId)
      .is('deleted_at', null);

    const trackerAlerts: Array<{
      plantNameHe: string;
      plantNameEn: string;
      lastAnalysisDaysAgo: number | null;
    }> = [];

    if (trackers && trackers.length > 0) {
      const trackerIds = (trackers as any[]).map(t => t.id);
      const { data: checkins } = await db
        .from('plant_tracker_checkins')
        .select('tracker_id, checkin_date')
        .in('tracker_id', trackerIds)
        .is('deleted_at', null)
        .order('checkin_date', { ascending: false });

      const latestCheckin: Record<string, string> = {};
      for (const c of (checkins ?? []) as any[]) {
        if (!latestCheckin[c.tracker_id]) latestCheckin[c.tracker_id] = c.checkin_date;
      }

      const todayMs = Date.now();
      for (const tracker of trackers as any[]) {
        const lastDate = latestCheckin[tracker.id];
        const lastAnalysisDaysAgo = lastDate
          ? Math.floor((todayMs - new Date(lastDate).getTime()) / 86_400_000)
          : null;
        trackerAlerts.push({
          plantNameHe: tracker.plant_name_he,
          plantNameEn: tracker.plant_name_en,
          lastAnalysisDaysAgo,
        });
      }
    }

    // 4. Cross-reference plants with today's day type
    const action = getAction(dayType);
    const matchingPlants: Array<{
      plantNameHe: string;
      plantNameEn: string;
      emoji: string;
      gardenName: string;
      action: string;
    }> = [];
    const nonMatchingPlants: Array<{
      plantNameHe: string;
      plantNameEn: string;
      emoji: string;
    }> = [];

    if (!isNode) {
      for (const plant of allPlants) {
        if (isPlantMatch(plant.plantNameHe, plant.plantNameEn, dayType)) {
          matchingPlants.push({ ...plant, action });
        } else {
          nonMatchingPlants.push({
            plantNameHe: plant.plantNameHe,
            plantNameEn: plant.plantNameEn,
            emoji: plant.emoji,
          });
        }
      }
    }

    res.json({
      dayType,
      score: calendarDay?.plantingScore ?? null,
      ascending: calendarDay?.ascendingDescending === 'ascending',
      nodeActive: isNode,
      matchingPlants,
      nonMatchingPlants,
      trackerAlerts,
      hasGardenData: allPlants.length > 0,
    });
  } catch (err: any) {
    console.error('[GET /api/dashboard/today-actions]', err.message);
    res.status(500).json({ error: err.message });
  }
});
