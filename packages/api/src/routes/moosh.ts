import 'dotenv/config';
import { Router } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { askMoosh } from '../services/claude';
import type { MooshMessage, MooshContext } from '@gina-haya/shared';
import { todayInIsrael } from '@gina-haya/shared';

export const mooshRouter = Router();

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

    // ── 5. Build Moosh context ────────────────────────────────────────────
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
    };

    // ── 6. Load conversation history ──────────────────────────────────────
    const { data: convRecord } = await db
      .from('moosh_conversations')
      .select('id, messages')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const existingMessages: MooshMessage[] = convRecord?.messages || [];
    const last10Messages = existingMessages.slice(-10);

    // ── 7. Call Claude API ────────────────────────────────────────────────
    const newUserMessage: MooshMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    const mooshResponse = await askMoosh(
      [...last10Messages, newUserMessage],
      context
    );

    const mooshMessage: MooshMessage = {
      role: 'assistant',
      content: mooshResponse,
      timestamp: new Date().toISOString(),
    };

    // ── 8. Save to DB ─────────────────────────────────────────────────────
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

    // ── 9. Count usage ────────────────────────────────────────────────────
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
