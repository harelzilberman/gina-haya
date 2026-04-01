import 'dotenv/config';
import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { askMoosh } from '../services/claude';
import { fetchWeatherForRegion } from '../services/weather';
import type { MooshMessage, MooshContext } from '@gina-haya/shared';
import { todayInIsrael } from '@gina-haya/shared';
import { getRecentCompletedTasks } from '../db/queries/tasks';

export const mooshRouter: IRouter = Router();

// All moosh routes require auth
mooshRouter.use(verifyToken);

// Monthly limits per tier
const MONTHLY_LIMITS: Record<string, number | null> = {
  free:           20,
  grower:         50,
  gardener_pro:   null, // unlimited
  professional:   null, // unlimited
};

// ── GET /api/moosh/history ────────────────────────────────────────────────
mooshRouter.get('/history', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('moosh_conversations')
      .select('messages, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // messages is a JSONB array of { role, content, timestamp }
    const messages: MooshMessage[] = data?.messages || [];
    // Return last 20
    res.json(messages.slice(-20));
  } catch (err: any) {
    console.error('[GET /api/moosh/history]', err.message);
    res.json([]); // Return empty array on error — don't break the UI
  }
});

// ── DELETE /api/moosh/history ─────────────────────────────────────────────
mooshRouter.delete('/history', async (req: any, res) => {
  try {
    await db
      .from('moosh_conversations')
      .delete()
      .eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/moosh/history]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/moosh/chat ──────────────────────────────────────────────────
mooshRouter.post('/chat', async (req: any, res) => {
  try {
    const { message, gardenId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.user.id;

    // ── 1. Load user profile ──────────────────────────────────────────────
    const { data: userProfile } = await db
      .from('users')
      .select('subscription_tier, language_preference')
      .eq('id', userId)
      .single();

    const tier = userProfile?.subscription_tier || 'free';
    const lang = userProfile?.language_preference || 'he';

    // ── 2. Check monthly message limit ────────────────────────────────────
    const monthlyLimit = MONTHLY_LIMITS[tier];

    if (monthlyLimit !== null) {
      // Count messages sent this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: convData } = await db
        .from('moosh_conversations')
        .select('messages')
        .eq('user_id', userId)
        .gte('updated_at', startOfMonth.toISOString())
        .limit(1)
        .single();

      const existingMessages: MooshMessage[] = convData?.messages || [];
      const userMessagesThisMonth = existingMessages.filter(
        m => m.role === 'user' &&
        new Date(m.timestamp) >= startOfMonth
      ).length;

      if (userMessagesThisMonth >= monthlyLimit) {
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          tier,
          messagesUsedThisMonth: userMessagesThisMonth,
          monthlyLimit,
        });
      }
    }

    // ── 3. Fetch today's calendar ─────────────────────────────────────────
    const today = todayInIsrael();
    const { data: calendarDay } = await db
      .from('biodynamic_calendar')
      .select('*')
      .eq('date', today)
      .single();

    // ── 4. Fetch user's garden ────────────────────────────────────────────
    let garden: any = null;
    if (gardenId) {
      const { data } = await db
        .from('gardens')
        .select('*, garden_plants(*)')
        .eq('id', gardenId)
        .eq('user_id', userId)
        .single();
      garden = data;
    } else {
      const { data } = await db
        .from('gardens')
        .select('*, garden_plants(*)')
        .eq('user_id', userId)
        .limit(1)
        .single();
      garden = data;
    }

    // ── 5. Fetch weather ──────────────────────────────────────────────────
    const weather = await fetchWeatherForRegion(garden?.location_region ?? null);

    // ── 5b. Fetch recent harvests ────────────────────────────────────────────
    const { data: harvestRows } = await db
      .from('harvests')
      .select('plant_name_he, harvest_date, day_type, planting_score')
      .eq('user_id', userId)
      .order('harvest_date', { ascending: false })
      .limit(10);

    const recentHarvests = (harvestRows ?? []).map((h: any) => ({
      plantNameHe:    h.plant_name_he,
      harvestDate:    h.harvest_date,
      dayType:        h.day_type,
      plantingScore:  h.planting_score,
    }));

    // ── 5c. Fetch garden map ──────────────────────────────────────────────
    const { data: mapRow } = await db
      .from('garden_maps')
      .select('map_data, north_angle')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    let gardenMap: any = null;
    if (mapRow) {
      const md = mapRow.map_data as { objects: any[]; plants: any[] } | null;
      const objs   = md?.objects ?? [];
      const plants = md?.plants ?? [];
      const beds  = objs.filter((o: any) => ['bed','raised','pot'].includes(o.type));
      const trees = objs.filter((o: any) => o.type === 'tree');
      gardenMap = {
        hasMap:      true,
        northAngle:  mapRow.north_angle ?? 0,
        objectCount: objs.length,
        bedCount:    beds.length,
        treeCount:   trees.length,
        fruitTrees:  trees.filter((t: any) => t.isFruitTree).map((t: any) => t.fruitTreeName || 'עץ פרי'),
        plantCount:  plants.length,
        plantNames:  plants.map((p: any) => p.plantNameHe).filter(Boolean),
      };
    }

    // ── 6. Build Moosh context ────────────────────────────────────────────
    const context: MooshContext = {
      gardenName: garden?.name || null,
      locationRegion: garden?.location_region || null,
      soilType: garden?.soil_type || null,
      plants: garden?.garden_plants?.map((p: any) =>
        lang === 'he' ? p.common_name_he : p.common_name_en
      ) || [],
      todayCalendar: calendarDay ? {
        ascendingDescending: calendarDay.ascending_descending,
        nodeActive: calendarDay.node_active,
        nodeBlackoutEnd: calendarDay.node_blackout_end,
        dayType: calendarDay.day_type,
        moonSign: calendarDay.moon_sign,
        plantingScore: calendarDay.planting_score,
        scoreColour: calendarDay.score_colour,
        prep500Recommended: calendarDay.prep_500_recommended,
        prep501Recommended: calendarDay.prep_501_recommended,
        perigeeActive: calendarDay.perigee_active,
      } : {
        ascendingDescending: 'descending',
        nodeActive: false,
        nodeBlackoutEnd: null,
        dayType: 'fruit',
        moonSign: '',
        plantingScore: 5,
        scoreColour: 'yellow',
        prep500Recommended: false,
        prep501Recommended: false,
        perigeeActive: false,
      },
      userLanguage: lang as 'he' | 'en',
      weather: weather ?? null,
      recentHarvests: recentHarvests.length > 0 ? recentHarvests : null,
      gardenMap: gardenMap ?? null,
    };

    // ── 7. Load conversation history ─────────────────────────────────────
    const { data: convRecord } = await db
      .from('moosh_conversations')
      .select('id, messages')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const existingMessages: MooshMessage[] = convRecord?.messages || [];
    const last10Messages = existingMessages.slice(-10);

    // ── 7b. Fetch recent completed tasks ─────────────────────────────────
    const completedTasks = await getRecentCompletedTasks(userId, 7);
    const taskContext = completedTasks.length > 0
      ? `\n\nפעולות שהמשתמש ביצע לאחרונה בגינה:\n${completedTasks.map(t => `- ${t.title} (${t.date})`).join('\n')}`
      : '';

    // ── 8. Call Claude API ────────────────────────────────────────────────
    const newUserMessage: MooshMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    const mooshResponse = await askMoosh(
      [...last10Messages, newUserMessage],
      context,
      taskContext || undefined
    );

    const mooshMessage: MooshMessage = {
      role: 'assistant',
      content: mooshResponse,
      timestamp: new Date().toISOString(),
    };

    // ── 9. Save to DB ─────────────────────────────────────────────────────
    const updatedMessages = [...existingMessages, newUserMessage, mooshMessage];

    if (convRecord?.id) {
      await db
        .from('moosh_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', convRecord.id);
    } else {
      await db
        .from('moosh_conversations')
        .insert({
          user_id: userId,
          garden_id: garden?.id || null,
          messages: updatedMessages,
        });
    }

    // ── 10. Count usage ───────────────────────────────────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messagesUsedThisMonth = updatedMessages.filter(
      m => m.role === 'user' &&
      new Date(m.timestamp) >= startOfMonth
    ).length;

    res.json({
      response: mooshResponse,
      messagesUsedThisMonth,
      monthlyLimit,
    });

  } catch (err: any) {
    console.error('[POST /api/moosh/chat]', err.message);
    res.status(500).json({ error: err.message });
  }
});
