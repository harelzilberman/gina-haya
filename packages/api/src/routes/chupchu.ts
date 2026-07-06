import 'dotenv/config';
import { Router, type IRouter } from 'express';
import axios from 'axios';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { askChupChu, type ProposedTask, type MobileToolCall } from '../services/claude';
import { compressImageForClaude } from '../services/plantVision';
import { fetchWeatherForRegion, getCachedWeatherForCoords } from '../services/weather';
import type { ChupChuMessage, ChupChuContext } from '@gina-haya/shared';
import { todayInIsrael } from '@gina-haya/shared';
import { getRecentCompletedTasks } from '../db/queries/tasks';
import { getLimits } from '../config/tiers';
import { checkAndRecordVisionUse } from '../services/visionQuota';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_HEADERS = {
  'x-api-key': process.env.ANTHROPIC_API_KEY!,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
};

export const chupChuRouter: IRouter = Router();

// All chupchu routes require auth
chupChuRouter.use(verifyToken);

// In-memory lock: one in-flight request per user at a time
const inFlight = new Set<string>();

// In-memory daily cap for memory/summarize (resets on deploy — acceptable for
// this cost class; Haiku is cheap and 10/day is far above legitimate use).
// Key = userId, value = { date: YYYY-MM-DD, count: number }
const summarizeDailyCap = new Map<string, { date: string; count: number }>();
const SUMMARIZE_DAILY_LIMIT = 10;

// ── GET /api/chupchu/history ────────────────────────────────────────────────
chupChuRouter.get('/history', async (req: any, res) => {
  try {
    const { data: convRows } = await db
      .from('chupchu_conversations')
      .select('id, messages')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    let messages: ChupChuMessage[] = [];
    if (convRows && convRows.length > 0) {
      if (convRows.length === 1) {
        messages = convRows[0].messages || [];
      } else {
        // Multiple rows — merge and deduplicate
        const allMessages = convRows.flatMap((r: any) => r.messages || []);
        const seen = new Set<string>();
        messages = allMessages.filter((m: any) => {
          const key = `${m.role}:${typeof m.content === 'string' ? m.content.slice(0, 50) : JSON.stringify(m.content).slice(0, 50)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }

    // Return last 20
    res.json(messages.slice(-20));
  } catch (err: any) {
    console.error('[GET /api/chupchu/history]', err.message);
    res.json([]); // Return empty array on error — don't break the UI
  }
});

// ── POST /api/chupchu/analyze-image ────────────────────────────────────────
// LEGACY route — may be removed once Flutter call sites are confirmed gone.
// Gated behind vision quota to match full-diagnosis and chat image turns.
chupChuRouter.post('/analyze-image', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    console.warn('[analyze-image] legacy route called by user', userId);

    const { image, mimeType = 'image/jpeg', language = 'he' } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // ── Vision quota gate (same shape as full-diagnosis) ─────────────────────
    if (userId) {
      const quota = await checkAndRecordVisionUse(userId, 'chat_image', null);
      if (!quota.allowed) {
        return res.json({ ok: false, reason: 'vision_quota_exceeded', used: quota.used, limit: quota.limit });
      }
    }

    const langInstruction = language === 'he'
      ? 'ענה בעברית בלבד.'
      : 'Reply in English only.';

    const response = (await axios.post(ANTHROPIC_URL, {
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as any,
              data: image,
            },
          },
          {
            type: 'text',
            text: `אתה צ'ופצ'ו, מומחה גינון ביודינמי חכם וחמים. ${langInstruction}
נתח את התמונה הזו מהגינה ותן תשובה טבעית וזורמת ללא כותרות, ללא markdown, ללא כוכביות.
דבר ישירות כאילו אתה מדבר עם חבר בגינה.
כלול: מה אתה רואה, בעיות אם יש, המלצות מעשיות.
דבר בגוף ראשון כצ'ופצ'ו, בחמימות ובביטחון. עד 150 מילים.`,
          },
        ],
      }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 90000 })).data;

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => (b as any).text)
      .join('');

    res.json({ response: text });
  } catch (err: any) {
    console.error('[POST /api/chupchu/analyze-image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chupchu/full-diagnosis ───────────────────────────────────────
chupChuRouter.post('/full-diagnosis', async (req: any, res) => {
  try {
    const { image, mimeType = 'image/jpeg', language = 'he', plant_id, tracker_id, source } = req.body;
    if (!image) return res.status(400).json({ success: false, error: 'No image provided' });

    // ── Vision quota gate ────────────────────────────────────────────────────
    // Checked BEFORE any Anthropic spend.
    // Tier not pre-loaded on this route — helper will resolve it from the DB.
    // Refusal shape: { ok: false, reason: 'vision_quota_exceeded', used, limit }
    // HTTP 200 so the app can render an upsell rather than a generic error.
    {
      const userId = req.user?.id;
      if (userId) {
        // Validate source against the allowed VisionSource values; fall back to 'full_diagnosis'.
        const VALID_SOURCES: import('../services/visionQuota').VisionSource[] = [
          'full_diagnosis', 'chat_image', 'tracker_checkin', 'passport_chip',
        ];
        const resolvedSource: import('../services/visionQuota').VisionSource =
          VALID_SOURCES.includes(source) ? source : 'full_diagnosis';
        const quota = await checkAndRecordVisionUse(userId, resolvedSource, plant_id ?? null);
        if (!quota.allowed) {
          return res.json({ ok: false, reason: 'vision_quota_exceeded', used: quota.used, limit: quota.limit });
        }
      }
    }

    const systemPrompt = language === 'he'
      ? `אתה צ'ופצ'ו, מומחה גינה ביודינמי. קיבלת תמונה של צמח. עליך לנתח אותה לעומק ולהחזיר תשובה בפורמט JSON בלבד — ללא טקסט נוסף, ללא markdown, רק JSON תקין. נתח: זיהוי הצמח, מצב בריאותו, בעיות שנראות, צעדי טיפול מפורטים, משימות דחופות, וטיפ ביודינמי. אם הצמח בריא, מלא את השדות בהתאם עם tasks ריק או עם משימות תחזוקה שגרתיות.`
      : `You are Chupchu, a biodynamic garden expert. You received a plant photo. Analyze it deeply and return a response in JSON format only — no extra text, no markdown, just valid JSON. Analyze: plant identification, health status, visible issues, detailed treatment steps, urgent tasks, and a biodynamic tip. If the plant is healthy, fill fields accordingly with empty tasks or routine maintenance tasks.`;

    const userPrompt = language === 'he'
      ? `נתח את הצמח בתמונה והחזר JSON תקין בלבד עם המבנה הבא בדיוק:
{
  "plant_name": "שם הצמח בעברית",
  "plant_name_latin": "Latin name",
  "confidence": "high",
  "health_status": "healthy",
  "health_status_label": "תיאור קצר של המצב",
  "summary": "תיאור קצר 2-3 משפטים של מה שנראה בתמונה",
  "issues": [
    {
      "name": "שם הבעיה",
      "severity": "low",
      "description": "תיאור הבעיה"
    }
  ],
  "treatment_steps": [
    {
      "step": 1,
      "title": "כותרת הצעד",
      "description": "תיאור מפורט"
    }
  ],
  "biodynamic_tip": "טיפ ביודינמי אחד ספציפי לטיפול בבעיה זו",
  "tasks": [
    {
      "title": "שם המשימה",
      "description": "תיאור",
      "urgency": "this_week",
      "urgency_label": "השבוע הזה"
    }
  ],
  "prevention_tips": ["טיפ 1", "טיפ 2", "טיפ 3"]
}
ערכים חוקיים: confidence = high|medium|low, health_status = healthy|stressed|diseased|pest_damage, severity = low|medium|high, urgency = today|this_week|this_month.`
      : `Analyze the plant in the image and return ONLY valid JSON with this exact structure: {"plant_name":"...","plant_name_latin":"...","confidence":"high","health_status":"healthy","health_status_label":"...","summary":"...","issues":[{"name":"...","severity":"low","description":"..."}],"treatment_steps":[{"step":1,"title":"...","description":"..."}],"biodynamic_tip":"...","tasks":[{"title":"...","description":"...","urgency":"this_week","urgency_label":"This week"}],"prevention_tips":["...","..."]}. Valid values: confidence=high|medium|low, health_status=healthy|stressed|diseased|pest_damage, severity=low|medium|high, urgency=today|this_week|this_month.`;

    const response = (await axios.post(ANTHROPIC_URL, {
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as any,
              data: image,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 90000 })).data;

    const raw = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => (b as any).text)
      .join('');

    let diagnosis: any;
    try {
      diagnosis = JSON.parse(raw);
    } catch {
      // Try to extract JSON object from the response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          diagnosis = JSON.parse(match[0]);
        } catch {
          console.error('[POST /api/chupchu/full-diagnosis] JSON parse failed, raw:', raw.slice(0, 200));
          return res.json({ success: false, error: 'parse_error', raw });
        }
      } else {
        console.error('[POST /api/chupchu/full-diagnosis] No JSON found, raw:', raw.slice(0, 200));
        return res.json({ success: false, error: 'parse_error', raw });
      }
    }

    // ── Fetch plant context, suppress watering tasks, persist timeline ────────
    // All three steps share a single garden_plants fetch — only runs when plant_id is set.
    let timelineEntryId: string | null = null;
    if (plant_id) {
      const { data: gpRow } = await db
        .from('garden_plants')
        .select('auto_irrigation')
        .eq('id', plant_id)
        .single();

      // Suppress watering tasks for auto-irrigated plants (belt-and-braces;
      // the full-diagnosis prompt has no per-plant context, so filtering is the primary guard)
      if (gpRow?.auto_irrigation === true && Array.isArray(diagnosis.tasks)) {
        diagnosis.tasks = diagnosis.tasks.filter(
          (t: any) => !/השק/u.test(String(t.title ?? ''))
        );
      }

      const { data: tlData, error: tlError } = await db
        .from('plant_timeline')
        .insert({
          plant_id,
          tracker_id: tracker_id ?? null,
          user_id: req.user.id,
          entry_type: 'chupchu_analysis',
          content: diagnosis,
          note: `צ'ופצ'ו הסתכל · ${diagnosis.plant_name ?? ''}`,
        })
        .select('id');
      if (tlError) {
        console.error('[diagnosis/persist]', tlError.message, tlError.details);
      } else {
        timelineEntryId = tlData?.[0]?.id ?? null;
      }
    }

    res.json({ success: true, diagnosis, timeline_entry_id: timelineEntryId });
  } catch (err: any) {
    console.error('[POST /api/chupchu/full-diagnosis]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/chupchu/history ─────────────────────────────────────────────
chupChuRouter.delete('/history', async (req: any, res) => {
  try {
    await db
      .from('chupchu_conversations')
      .delete()
      .eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/chupchu/history]', err.message);
    res.status(500).json({ error: 'אירעה שגיאה. נסה שוב מאוחר יותר.' });
  }
});

// ── GET /api/chupchu/memory ─────────────────────────────────────────────────
chupChuRouter.get('/memory', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('chupchu_memory')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ memory: data ?? null });
  } catch (err: any) {
    console.error('[GET /api/chupchu/memory]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chupchu/memory/summarize ─────────────────────────────────────
chupChuRouter.post('/memory/summarize', async (req: any, res) => {
  try {
    const { conversationHistory, lang, existingMemory } = req.body;
    const userId = req.user.id;

    // ── Daily cap (in-memory, resets on deploy) ───────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const capEntry = summarizeDailyCap.get(userId);
    if (capEntry && capEntry.date === todayStr) {
      if (capEntry.count >= SUMMARIZE_DAILY_LIMIT) {
        return res.status(429).json({ error: 'summarize_limit' });
      }
      capEntry.count += 1;
    } else {
      summarizeDailyCap.set(userId, { date: todayStr, count: 1 });
    }

    if (!Array.isArray(conversationHistory) || conversationHistory.length < 4) {
      return res.json({ ok: true, skipped: true });
    }

    const existingSummaryHe = existingMemory?.summary_he ?? 'אין זיכרון קודם';
    const existingSummaryEn = existingMemory?.summary_en ?? 'No previous memory';
    const existingFacts     = existingMemory?.garden_facts ?? {};

    const convText = conversationHistory
      .slice(-20)
      .filter((m: any) => typeof m.content === 'string')
      .map((m: any) => {
        const label = m.role === 'user' ? (lang === 'he' ? 'משתמש' : 'User') : (lang === 'he' ? "צ'ופצ'ו" : 'Chupchu');
        // Fix E: codepoint-safe truncation — .slice on UTF-16 code units can split surrogate pairs
        const body  = Array.from(String(m.content)).slice(0, 200).join('');
        return `${label}: ${body}`;
      })
      .join('\n');

    // Fix B: tightened to 2-3 sentences (down from 3-5) to reduce token budget pressure
    const summaryPrompt = lang === 'he' ? `
אתה עוזר שמסכם שיחות עם גנן.
הזיכרון הקיים:
${existingSummaryHe}

עובדות ידועות:
${JSON.stringify(existingFacts, null, 2)}

השיחה החדשה:
${convText}

צור סיכום מעודכן ועובדות מובנות. החזר JSON בלבד:
{
  "summary_he": "סיכום בעברית 2-3 משפטים על המשתמש, גינתו, אתגרים, העדפות",
  "summary_en": "2-3 sentence English summary about the user, their garden, challenges, preferences",
  "garden_facts": {
    "gardenType": "...",
    "location": "...",
    "plants": [{"name": "שם הצמח", "locationType": "עציץ|אדמה פתוחה|ערוגה|הידרופוניקה|חממה", "notes": "הערות רלוונטיות — השמט אם אין"}],
    "experience": "beginner|intermediate|advanced",
    "preferredTopics": [],
    "gardenSize": "...",
    "challenges": []
  }
}` : `
You are an assistant that summarizes conversations with a gardener.
Existing memory:
${existingSummaryEn}

Known facts:
${JSON.stringify(existingFacts, null, 2)}

New conversation:
${convText}

Create an updated summary and structured facts. Return JSON only:
{
  "summary_he": "2-3 sentence Hebrew summary about the user, their garden, challenges, preferences",
  "summary_en": "2-3 sentence English summary about the user, their garden, challenges, preferences",
  "garden_facts": {
    "gardenType": "...",
    "location": "...",
    "plants": [{"name": "plant name", "locationType": "pot|open ground|raised bed|hydroponic|greenhouse", "notes": "relevant notes — omit if none"}],
    "experience": "beginner|intermediate|advanced",
    "preferredTopics": [],
    "gardenSize": "...",
    "challenges": []
  }
}`;

    // Fix B: raised from 2500 → 4096 to give headroom above the tighter schema
    const aiRes = (await axios.post(ANTHROPIC_URL, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: summaryPrompt }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 90000 })).data;

    // Fix A: short-circuit before any parse attempt if the model hit the token limit.
    // Mirrors the stop_reason handling in services/claude.ts:820.
    if (aiRes.stop_reason === 'max_tokens') {
      console.error('[memory/summarize] response truncated at max_tokens — skipping upsert');
      return res.json({ ok: true, skipped: true, reason: 'max_tokens' });
    }

    const text = aiRes.content[0].type === 'text' ? aiRes.content[0].text : '';
    const cleaned = text.replace(/```json|```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Fallback: attempt to extract a JSON object via greedy regex.
      // NOTE: kept greedy (\{[\s\S]*\}) deliberately — non-greedy would break on
      // nested garden_facts. Fix C's validation gate below makes it safe.
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          // Fix D: log full raw response so Railway shows the actual failure, not a 200-char slice
          console.error('[memory/summarize] JSON parse fallback also failed. raw response (full):', text);
          return res.json({ ok: true, skipped: true, reason: 'parse_failed' });
        }
      } else {
        // Fix D: log full raw response
        console.error('[memory/summarize] no JSON object found in response. raw response (full):', text);
        return res.json({ ok: true, skipped: true, reason: 'no_json' });
      }
    }

    // Fix C: validate before upsert — the greedy regex can extract a partial object
    // (e.g. truncated mid-value but containing a } in a string) that parses successfully
    // but is missing fields. Never overwrite existing memory with nulls.
    if (
      typeof parsed.summary_he !== 'string' || !parsed.summary_he.trim() ||
      typeof parsed.summary_en !== 'string' || !parsed.summary_en.trim() ||
      typeof parsed.garden_facts !== 'object' || parsed.garden_facts === null
    ) {
      console.error('[memory/summarize] incomplete response — upsert skipped. raw response (full):', text);
      return res.json({ ok: true, skipped: true, reason: 'incomplete_response' });
    }

    const { error } = await db
      .from('chupchu_memory')
      .upsert({
        user_id:      userId,
        summary_he:   parsed.summary_he,
        summary_en:   parsed.summary_en,
        garden_facts: parsed.garden_facts,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
    res.json({ ok: true, summary: parsed });
  } catch (err: any) {
    console.error('[POST /api/chupchu/memory/summarize]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chupchu/starter-tasks ────────────────────────────────────────
// Generates 2–3 AI starter task PROPOSALS for a newly added plant.
// The Flutter app renders these as a "Chupchu prepared tasks" card on the Plant
// Passport. Accepted tasks are written to the DB by the client via the existing
// POST /api/tasks/bulk (which already supports garden_plants_id).
// This endpoint only GENERATES proposals — it does NOT write to garden_tasks.
//
// QUOTA NOTE: this endpoint is intentionally NOT counted against the user's
// monthly Chupchu message quota (maxChupChuPerMonth in getLimits()). It is
// triggered automatically by the app on plant creation, not by a user chat
// message. When monetizing this feature, introduce a separate counter
// (e.g. maxStarterTasksPerMonth) rather than folding it into the chat quota.
chupChuRouter.post('/starter-tasks', async (req: any, res) => {
  try {
    const { plant_name, variety, plant_type, location_type, garden_plants_id } = req.body;

    if (!plant_name || !String(plant_name).trim()) {
      return res.status(400).json({ error: 'plant_name is required' });
    }

    const today = todayInIsrael();

    // Check auto_irrigation so we can suppress watering tasks for drip plants
    let autoIrrigation = false;
    if (garden_plants_id) {
      const { data: gpRow } = await db
        .from('garden_plants')
        .select('auto_irrigation')
        .eq('id', String(garden_plants_id))
        .single();
      autoIrrigation = gpRow?.auto_irrigation === true;
    }

    // Build a concise context string for the user turn
    const plantLabel = variety
      ? `${String(plant_name).trim()} (זן: ${String(variety).trim()})`
      : String(plant_name).trim();

    const locationMap: Record<string, string> = {
      pot:          'עציץ',
      garden:       'גינה פתוחה',
      bed:          'ערוגה',
      hydroponic:   'הידרופוניקה',
      greenhouse:   'חממה',
    };
    const typeMap: Record<string, string> = {
      annual:     'חד-שנתי',
      perennial:  'רב-שנתי',
      tree:       'עץ',
      shrub:      'שיח',
    };

    const contextParts: string[] = [`צמח: ${plantLabel}`];
    if (plant_type)    contextParts.push(`סוג: ${typeMap[String(plant_type)]    ?? String(plant_type)}`);
    if (location_type) contextParts.push(`מיקום גידול: ${locationMap[String(location_type)] ?? String(location_type)}`);
    contextParts.push(`תאריך היום: ${today}`);

    const irrigationRule = autoIrrigation
      ? '\n- הצמח מושקה אוטומטית — אל תציע משימות השקיה'
      : '\n- משימה ראשונה: השקיה ראשונית — היום או מחר, category: watering';

    const systemPrompt = `אתה צ'ופצ'ו — מומחה גינון ביודינמי חמים ומעשי. המשתמש זה עתה הוסיף צמח חדש לגינה שלו ואתה מכין עבורו 2–3 משימות התחלתיות מעשיות לטיפוח הצמח בשבועות הקרובים.

החזר מערך JSON בלבד — ללא markdown, ללא גרשיים מסביב, ללא הקדמה, ללא סיומת. רק מערך JSON תקין.

כל משימה במבנה הבא:
{"title":"כותרת קצרה ופעילה בעברית עד 8 מילים","notes":"הנחיה מעשית של 1–2 משפטים בעברית בסגנון חמים וישיר","date":"YYYY-MM-DD","category":"ערך מהרשימה המותרת","priority":"medium"}

ערכי category מותרים בלבד: watering | fertilizing | pruning | planting | harvesting | pest_control | composting | general

כללים:
- 2–3 משימות בלבד
- תאריכים בטווח 14 הימים הקרובים החל מהיום (${today})${irrigationRule}
- משימה שנייה: הזנה, מולץ, או הכנת הקרקע — 7–14 ימים מהיום, category: fertilizing או general
- משימה שלישית (אופציונלית): תצפית או בדיקה מותאמת לסוג הצמח — category: general
- priority תמיד "medium" אלא אם יש סיבה ברורה אחרת`;

    const aiRes = (await axios.post(ANTHROPIC_URL, {
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: contextParts.join('\n') }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 60000 })).data;

    const raw: string = (aiRes.content as any[])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text as string)
      .join('');

    // Safe parse: strip any accidental markdown fences, then try JSON.parse,
    // then fall back to regex extraction of the first JSON array in the response.
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let tasks: any[];
    try {
      tasks = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          tasks = JSON.parse(match[0]);
        } catch {
          console.error('[POST /api/chupchu/starter-tasks] JSON parse fallback failed:', cleaned.slice(0, 200));
          return res.status(502).json({ error: 'parse_error' });
        }
      } else {
        console.error('[POST /api/chupchu/starter-tasks] No JSON array found in response:', cleaned.slice(0, 200));
        return res.status(502).json({ error: 'parse_error' });
      }
    }

    if (!Array.isArray(tasks)) {
      console.error('[POST /api/chupchu/starter-tasks] Parsed value is not an array');
      return res.status(502).json({ error: 'parse_error' });
    }

    // Belt-and-braces: post-filter watering tasks for auto-irrigated plants
    // (Haiku may ignore the prompt instruction)
    const filteredTasks = autoIrrigation
      ? tasks.filter((t: any) => String(t.category ?? '') !== 'watering')
      : tasks;

    // Echo garden_plants_id back on each task so the client can pass it straight
    // to POST /api/tasks/bulk without any additional mapping.
    const gpId = garden_plants_id ?? null;
    const enriched = filteredTasks.map((t: any) => ({
      title:            String(t.title ?? ''),
      notes:            t.notes ? String(t.notes) : null,
      date:             String(t.date ?? today),
      category:         String(t.category ?? 'general'),
      priority:         String(t.priority ?? 'medium'),
      garden_plants_id: gpId,
    }));

    res.json({ tasks: enriched });
  } catch (err: any) {
    console.error('[POST /api/chupchu/starter-tasks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Past conversation context builder ───────────────────────────────────────
// Takes everything BEFORE the last-20-message context window (the same boundary
// historyForClaude uses), picks up to 5 evenly-spaced user+reply pairs, and
// returns a compact Hebrew summary for injection into the system prompt.
// Zero extra DB queries — reuses already-loaded existingMessages.
function buildPastContextSummary(allMessages: ChupChuMessage[], userId?: string): string {
  console.log('[Memory] called for userId:', userId ?? 'unknown');
  console.log('[Memory] rows found:', allMessages?.length ?? 0);

  if (!allMessages || allMessages.length <= 5) {
    console.log('[ChupChu Memory] skip — not enough history (need >5, got', allMessages?.length ?? 0, ')');
    return '';
  }

  // "Past" = everything before the current context window (last 5 messages)
  const pastMessages = allMessages.slice(0, -5);
  console.log('[ChupChu Memory] past messages available:', pastMessages.length);

  if (pastMessages.length === 0) return '';

  // Collect all user messages from the past, with their index into pastMessages
  const userMsgs = pastMessages
    .map((m, i) => ({ msg: m, idx: i }))
    .filter(({ msg }) => msg.role === 'user');

  console.log('[ChupChu Memory] user messages in past:', userMsgs.length);
  if (userMsgs.length === 0) return '';

  // Pick up to 5 evenly spaced across the past to cover the full history
  const step    = Math.max(1, Math.floor(userMsgs.length / 5));
  const picked  = userMsgs.filter((_, i) => i % step === 0).slice(0, 5);

  const lines: string[] = ['## היסטוריית שיחות קודמות'];

  for (const { msg: userMsg, idx } of picked) {
    // Find the next assistant reply after this user message
    const reply = pastMessages.slice(idx + 1).find(m => m.role === 'assistant');

    // Format date safely — guard against missing/invalid timestamps
    let date: string;
    try {
      const d = new Date(userMsg.timestamp);
      date = isNaN(d.getTime())
        ? 'בעבר'
        : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
    } catch { date = 'בעבר'; }

    // Fix E: codepoint-safe truncation to avoid splitting surrogate pairs on emoji
    const topic     = Array.from(String(userMsg.content ?? '').replace(/🌿 \[.*?\]/g, '[תמונה]')).slice(0, 120).join('');
    const replyText = Array.from(String(reply?.content ?? '')).slice(0, 150).join('');

    lines.push(
      `שיחה מ-${date}: המשתמש שאל: "${topic}".` +
      (replyText ? ` עניתי: "${replyText}..."` : ''),
    );
  }

  if (lines.length <= 1) return '';

  const summary = lines.join('\n');
  console.log('[Memory] summary built (chars):', summary.length);
  console.log('[Memory] summary preview:', summary.substring(0, 300));
  return summary;
}

// ── Role-alternation safety helper ──────────────────────────────────────────
// Ensures the messages array sent to Claude starts with a user message and has
// no consecutive same-role messages (which the Anthropic API rejects).
function ensureRoleAlternation(messages: ChupChuMessage[]): ChupChuMessage[] {
  const result: ChupChuMessage[] = [];
  for (const msg of messages) {
    if (result.length === 0 && msg.role !== 'user') continue; // skip leading assistant
    if (result.length > 0 && result[result.length - 1].role === msg.role) {
      result[result.length - 1] = msg; // keep newer of two consecutive same-role messages
    } else {
      result.push(msg);
    }
  }
  // History must end with an assistant message so the new user message can follow
  while (result.length > 0 && result[result.length - 1].role === 'user') {
    result.pop();
  }
  return result;
}

// ── POST /api/chupchu/chat ──────────────────────────────────────────────────
chupChuRouter.post('/chat', async (req: any, res) => {
  req.setTimeout(120000);
  res.setTimeout(120000);
  try {
    const { message, gardenId, location, imageBase64, conversationHistory: clientHistory } = req.body;

    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;
    const hasText  = typeof message === 'string' && message.trim().length > 0;

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: 'Message or image is required' });
    }

    const userId = req.user.id;

    if (inFlight.has(userId)) {
      return res.status(429).json({ error: 'אירעה שגיאה. נסה שוב מאוחר יותר.' });
    }
    inFlight.add(userId);

    try {

    // ── 1. Load user profile ──────────────────────────────────────────────
    const { data: userProfile } = await db
      .from('users')
      .select('subscription_tier, language_preference, active_garden_id')
      .eq('id', userId)
      .single();

    const tier = userProfile?.subscription_tier || 'free';
    const lang = userProfile?.language_preference || 'he';

    // ── 2. Check monthly limits ───────────────────────────────────────────
    // Fix 4: use 'professional' (the real top-tier key in TIER_LIMITS) so
    // LAUNCH_FREE_MODE users get genuine unlimited limits, not the free fallback
    // that 'pro' (a non-existent key) would produce via getLimits().
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
    const effectiveTier = LAUNCH_FREE_MODE ? 'professional' : tier;

    // Image turns consume a vision look, not a text-message credit.
    // Check the vision quota instead and skip the chat-message counter entirely
    // — this prevents double-charging an image turn against both quotas.
    // monthlyLimit is declared here so it is in scope for the final res.json().
    const monthlyLimit = getLimits(effectiveTier).maxChupChuPerMonth;
    if (hasImage) {
      const quota = await checkAndRecordVisionUse(userId, 'chat_image', null, effectiveTier);
      if (!quota.allowed) {
        return res.json({ ok: false, reason: 'vision_quota_exceeded', used: quota.used, limit: quota.limit });
      }
    } else {
      // Text-only turn: check the chat message quota as before.
      if (!LAUNCH_FREE_MODE && monthlyLimit !== null) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: convData } = await db
          .from('chupchu_conversations')
          .select('messages')
          .eq('user_id', userId)
          .gte('updated_at', startOfMonth.toISOString())
          .limit(1)
          .single();

        const existingMessages: ChupChuMessage[] = convData?.messages || [];
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
    }

    // ── 3. Fetch today's calendar ─────────────────────────────────────────
    const today = todayInIsrael();
    const { data: calendarDay } = await db
      .from('biodynamic_calendar')
      .select('*')
      .eq('date', today)
      .single();

    // ── 4. Fetch user's garden (active garden takes priority) ─────────────
    let garden: any = null;
    const resolvedGardenId = gardenId || userProfile?.active_garden_id || null;
    if (resolvedGardenId) {
      const { data } = await db
        .from('gardens')
        .select('*, garden_plants(*)')
        .eq('id', resolvedGardenId)
        .eq('user_id', userId)
        .single();
      garden = data;
    }
    if (!garden) {
      const { data } = await db
        .from('gardens')
        .select('*, garden_plants(*)')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
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

    // ── 6. Build ChupChu context ────────────────────────────────────────────
    const context: ChupChuContext = {
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
      } : null,
      userLanguage: lang as 'he' | 'en',
      weather: weather ?? null,
      recentHarvests: recentHarvests.length > 0 ? recentHarvests : null,
      gardenMap: gardenMap ?? null,
    };

    // ── 7. Load conversation history ─────────────────────────────────────
    const { data: convRows } = await db
      .from('chupchu_conversations')
      .select('id, messages')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // Merge duplicate rows if they exist (caused by concurrent INSERTs or transient .single() failures)
    let existingMessages: ChupChuMessage[] = [];
    let primaryRowId: string | null = null;

    if (convRows && convRows.length > 0) {
      primaryRowId = convRows[0].id;
      if (convRows.length === 1) {
        existingMessages = convRows[0].messages || [];
      } else {
        console.log('[CHAT] WARNING: duplicate rows found:', convRows.length, '— merging');
        const allMessages = convRows.flatMap((r: any) => r.messages || []);
        const seen = new Set<string>();
        existingMessages = allMessages.filter((m: any) => {
          const key = `${m.role}:${typeof m.content === 'string' ? m.content.slice(0, 50) : JSON.stringify(m.content).slice(0, 50)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // Delete all duplicate rows — keep only the most-recently-updated one
        const duplicateIds = convRows.slice(1).map((r: any) => r.id);
        await db
          .from('chupchu_conversations')
          .delete()
          .in('id', duplicateIds);
      }
    }

    // Use client-provided history when available — it is always up-to-date and bypasses
    // any silent DB save/load failures that cause context loss between messages.
    // Fall back to DB history (for older clients or first-ever messages).
    let historyForClaude: ChupChuMessage[];
    if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      historyForClaude = (clientHistory as Array<{ role: string; content: string }>)
        .slice(-20)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          // Fix E: codepoint-safe truncation to avoid splitting surrogate pairs on emoji
          content: Array.from(String(m.content ?? '')).slice(0, 500).join(''),
          timestamp: new Date().toISOString(),
        }));
    } else {
      historyForClaude = existingMessages.slice(-20);
    }
    console.log(`[CHAT] user=${userId?.slice(0,8)} rows=${convRows?.length ?? 0} msgs=${existingMessages?.length ?? 0} sending=${historyForClaude?.length ?? 0} source=${Array.isArray(clientHistory) && clientHistory.length > 0 ? 'client' : 'db'}`);
    console.log('[Memory] query result (first 2 msgs):', JSON.stringify(existingMessages?.slice(0, 2), null, 2));

    // ── 7b. Load user memory ─────────────────────────────────────────────
    let memorySection = '';
    try {
      const { data: memory } = await db
        .from('chupchu_memory')
        .select('summary_he, summary_en, garden_facts')
        .eq('user_id', userId)
        .single();
      if (memory) {
        const summary = lang === 'he' ? memory.summary_he : memory.summary_en;
        const facts   = (memory.garden_facts as Record<string, any>) ?? {};
        if (summary) {
          const lines = [summary];
          if (facts.plants?.length) {
            // Backward-compatible: old rows store plants as string[], new rows as {name, locationType?, notes?}[]
            const plantStrs = (facts.plants as any[]).map((p: any) =>
              typeof p === 'string'
                ? p
                : [p.name, p.locationType ? `(${p.locationType})` : '', p.notes ? `— ${p.notes}` : ''].filter(Boolean).join(' ')
            );
            lines.push(lang === 'he' ? `צמחים: ${plantStrs.join(', ')}` : `Plants: ${plantStrs.join(', ')}`);
          }
          if (facts.gardenType)         lines.push(lang === 'he' ? `סוג גינה: ${facts.gardenType}` : `Garden type: ${facts.gardenType}`);
          if (facts.experience)         lines.push(lang === 'he' ? `ניסיון: ${facts.experience}` : `Experience: ${facts.experience}`);
          if (facts.challenges?.length) lines.push(lang === 'he' ? `אתגרים: ${facts.challenges.join(', ')}` : `Challenges: ${facts.challenges.join(', ')}`);
          memorySection = (lang === 'he' ? '## מה שאני זוכר עליך\n' : '## What I Remember About You\n') + lines.join('\n');
        }
      }
    } catch {
      // no memory yet — fine
    }

    // ── 7c. Fetch recent completed tasks ─────────────────────────────────
    const completedTasks = await getRecentCompletedTasks(userId, 7);
    const taskContext = completedTasks.length > 0
      ? `\n\nפעולות שהמשתמש ביצע לאחרונה בגינה:\n${completedTasks.map(t => `- ${t.title} (${t.date})`).join('\n')}`
      : '';

    // ── 7d. Fetch pending tasks ───────────────────────────────────────────
    const { data: pendingTasksData } = await db
      .from('garden_tasks')
      .select('id, title, date, priority, category, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .limit(15);
    const pendingTasks = pendingTasksData ?? [];

    // ── 7e. Build garden section (inject plants directly, no tool call needed)
    // Day-of-week number → Hebrew letter (0=Sunday … 6=Saturday, Israel convention)
    const DAY_HE = ['א','ב','ג','ד','ה','ו','ש'];

    // Per-plant detail maps (used by buildPlantDetailLine below)
    const LOCATION_TYPE_HE: Record<string, string> = {
      pot:        'עציץ',
      garden:     'אדמה פתוחה',
      bed:        'ערוגה',
      hydroponic: 'הידרופוניקה',
      greenhouse: 'חממה',
      // legacy values
      balcony:    'עציץ',
      soil:       'אדמה פתוחה',
      other:      'עציץ',
    };
    const LOCATION_TYPE_EN: Record<string, string> = {
      pot:        'pot',
      garden:     'open ground',
      bed:        'raised bed',
      hydroponic: 'hydroponic',
      greenhouse: 'greenhouse',
      // legacy values
      balcony:    'pot',
      soil:       'open ground',
      other:      'pot',
    };
    const PLANT_TYPE_HE: Record<string, string> = { annual: 'חד-שנתי', perennial: 'רב-שנתי', tree: 'עץ', shrub: 'שיח' };
    const PLANT_TYPE_EN: Record<string, string> = { annual: 'annual', perennial: 'perennial', tree: 'tree', shrub: 'shrub' };

    // Build a compact one-line summary for a single plant row
    const buildPlantDetailLine = (p: any, l: string): string => {
      const name = l === 'he'
        ? (p.common_name_he || p.common_name_en || '')
        : (p.common_name_en || p.common_name_he || '');
      if (!name) return '';
      const varietyStr = p.variety
        ? (l === 'he' ? ` (זן: ${p.variety})` : ` (variety: ${p.variety})`)
        : '';
      const label = `${name}${varietyStr}`;
      const details: string[] = [];
      const locMap  = l === 'he' ? LOCATION_TYPE_HE : LOCATION_TYPE_EN;
      const typeMap = l === 'he' ? PLANT_TYPE_HE    : PLANT_TYPE_EN;
      const locStr  = p.location_type ? (locMap[String(p.location_type)]  ?? null) : null;
      if (locStr)          details.push(l === 'he' ? `גידול: ${locStr}` : `growing: ${locStr}`);
      if (p.sun_exposure)  details.push(p.sun_exposure);
      const typeStr = p.plant_type ? (typeMap[String(p.plant_type)] ?? null) : null;
      if (typeStr)         details.push(typeStr);
      if (p.auto_irrigation && p.irrigation_days?.length && p.irrigation_times?.length) {
        const days  = (p.irrigation_days  as number[]).map((d: number) => DAY_HE[d] ?? d).join(',');
        const times = (p.irrigation_times as string[]).join(', ');
        details.push(l === 'he'
          ? `השקיה אוטומטית (ימים ${days}; ${times})`
          : `auto-irrigated (days ${days}; ${times})`);
      }
      return details.length ? `${label} — ${details.join(', ')}` : label;
    };

    const GARDEN_DETAIL_LIMIT = 30;
    let gardenSection = '';
    if (garden) {
      // Filter archived plants; sort newest-added first so token cap keeps the most relevant 30
      const allActivePlants = ((garden.garden_plants ?? []) as any[])
        .filter((p: any) => !p.archived_at)
        .sort((a: any, b: any) => {
          const ta = a.added_at ? new Date(a.added_at).getTime() : 0;
          const tb = b.added_at ? new Date(b.added_at).getTime() : 0;
          return tb - ta;
        });
      const detailPlants    = allActivePlants.slice(0, GARDEN_DETAIL_LIMIT);
      const remainingPlants = allActivePlants.slice(GARDEN_DETAIL_LIMIT);

      const lines: string[] = [];
      if (lang === 'he') {
        lines.push(`## הגינה של המשתמש`);
        lines.push(`נתונים אמיתיים מהגינה — אל תשאל את המשתמש על פרטים הרשומים כאן (כגון: מיקום גידול, זן); השתמש בהם ישירות בתשובתך.`);
        if (garden.name)      lines.push(`שם הגינה: ${garden.name}`);
        if (garden.soil_type) lines.push(`סוג קרקע: ${garden.soil_type}`);
        if (garden.size_sqm)  lines.push(`גודל: ${garden.size_sqm} מ"ר`);
        if (allActivePlants.length === 0) {
          lines.push('אין צמחים רשומים בגינה עדיין.');
        } else {
          lines.push(`צמחים בגינה (${allActivePlants.length}):`);
          for (const p of detailPlants) {
            const line = buildPlantDetailLine(p, lang);
            if (line) lines.push(`  • ${line}`);
          }
          if (remainingPlants.length > 0) {
            const extraNames = remainingPlants
              .map((p: any) => p.common_name_he || p.common_name_en)
              .filter(Boolean).join(', ');
            lines.push(`  ועוד ${remainingPlants.length} צמחים: ${extraNames}`);
          }
        }
      } else {
        lines.push(`## User's Garden`);
        lines.push(`Real garden data — do not ask the user for details already listed here (e.g. growing location, variety); reference them naturally instead.`);
        if (garden.name)      lines.push(`Garden name: ${garden.name}`);
        if (garden.soil_type) lines.push(`Soil type: ${garden.soil_type}`);
        if (garden.size_sqm)  lines.push(`Size: ${garden.size_sqm} sqm`);
        if (allActivePlants.length === 0) {
          lines.push('No plants registered yet.');
        } else {
          lines.push(`Plants in garden (${allActivePlants.length}):`);
          for (const p of detailPlants) {
            const line = buildPlantDetailLine(p, lang);
            if (line) lines.push(`  • ${line}`);
          }
          if (remainingPlants.length > 0) {
            const extraNames = remainingPlants
              .map((p: any) => p.common_name_en || p.common_name_he)
              .filter(Boolean).join(', ');
            lines.push(`  and ${remainingPlants.length} more: ${extraNames}`);
          }
        }
      }
      gardenSection = lines.join('\n');
    }

    // ── 7f. Build pending tasks section ──────────────────────────────────
    let pendingTasksSection = '';
    if (pendingTasks.length > 0) {
      const header = lang === 'he' ? '## משימות ממתינות בגינה' : '## Pending Garden Tasks';
      const taskLines = pendingTasks.map((t: any) => {
        const priority = lang === 'he'
          ? (t.priority === 'high' ? 'גבוהה' : t.priority === 'medium' ? 'בינונית' : 'נמוכה')
          : t.priority;
        return `- ${t.title} | תאריך: ${t.date} | עדיפות: ${priority} | קטגוריה: ${t.category}`;
      });
      pendingTasksSection = header + '\n' + taskLines.join('\n');
    } else {
      pendingTasksSection = lang === 'he'
        ? '## משימות ממתינות\nאין משימות ממתינות כרגע.'
        : '## Pending Tasks\nNo pending tasks at the moment.';
    }

    // ── 7g. Build harvests section (inject directly, no tool call needed) ─
    let harvestsSection = '';
    if (context.recentHarvests && context.recentHarvests.length > 0) {
      const header = lang === 'he' ? '## קציר אחרון' : '## Recent Harvests';
      const harvestLines = context.recentHarvests.slice(0, 5).map((h: any) =>
        `- ${h.plantNameHe ?? ''} (${h.harvestDate})`
      );
      harvestsSection = header + '\n' + harvestLines.join('\n');
    }

    // ── 8. Fetch IP-based weather forecast (non-blocking) ────────────────
    let weatherSection = '';
    if (location?.lat && location?.lon) {
      try {
        weatherSection = await getCachedWeatherForCoords(
          Number(location.lat),
          Number(location.lon),
          String(location.city || 'Unknown'),
          lang as 'he' | 'en',
        );
      } catch (err: any) {
        console.error('[Chupchu] Weather fetch failed:', err.message);
      }
    }

    // ── 9. Call Claude API ────────────────────────────────────────────────

    // Compress image if provided — bail early on size errors
    let compressedImage: { data: string; mimeType: 'image/jpeg' } | undefined;
    if (hasImage) {
      try {
        const result = await compressImageForClaude(imageBase64);
        compressedImage = { data: result.data, mimeType: result.mimeType };
      } catch (imgErr: any) {
        if (imgErr.code === 'image_too_large') {
          return res.status(400).json({ error: lang === 'he' ? 'התמונה גדולה מדי. אנא השתמש בתמונה קטנה יותר.' : 'Image is too large. Please use a smaller image.' });
        }
        throw imgErr;
      }
    }

    // Content stored in DB (never store raw image bytes)
    const messageContent = hasText
      ? message.trim()
      : (lang === 'he' ? '🌿 [תמונה לזיהוי צמח]' : '🌿 [Plant image for identification]');

    const newUserMessage: ChupChuMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    const todayFormatted = new Date().toLocaleDateString(
      lang === 'he' ? 'he-IL' : 'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jerusalem' }
    );
    const dateSection = lang === 'he'
      ? `## תאריך היום\nהיום הוא ${todayFormatted}. השתמש בתאריך זה לחישוב "מחר", "השבוע" וכו'.`
      : `## Today's Date\nToday is ${todayFormatted}. Use this to calculate "tomorrow", "this week" etc.`;

    // ── 8b. Build past conversation context (messages older than the current window)
    // Prefer client history when it is longer than what's in DB — this survives silent
    // DB save failures that would otherwise freeze existingMessages at a stale length.
    const clientHistoryFull: ChupChuMessage[] = Array.isArray(clientHistory) && clientHistory.length > 0
      ? (clientHistory as Array<{ role: string; content: string }>).map(m => ({
          role:      m.role as 'user' | 'assistant',
          content:   String(m.content ?? ''),
          timestamp: new Date().toISOString(),
        }))
      : [];
    const bestHistory = clientHistoryFull.length > existingMessages.length
      ? clientHistoryFull
      : existingMessages;
    console.log('[Memory] bestHistory length:', bestHistory.length, '(client:', clientHistoryFull.length, 'db:', existingMessages.length, ')');
    const pastContextSection = buildPastContextSummary(bestHistory, userId);
    console.log('[Memory] injecting context:', pastContextSection.length > 0 ? `YES (${pastContextSection.length} chars)` : 'NO - empty');

    const extraContext = [
      memorySection,
      pastContextSection,
      gardenSection,
      pendingTasksSection,
      harvestsSection,
      dateSection,
      weatherSection,
      taskContext,
    ].filter(Boolean).join('\n\n');
    // Always prepend history (with role-alternation safety) before the current user message,
    // even when the current message includes an image.
    const { response: chupChuText, proposedTasks, mobileTool } = await askChupChu(
      [...ensureRoleAlternation(historyForClaude), newUserMessage],
      context,
      extraContext || undefined,
      compressedImage,
    );

    const chupChuMessage: ChupChuMessage = {
      role: 'assistant',
      content: chupChuText,
      timestamp: new Date().toISOString(),
    };

    // ── 10. Save to DB (fire-and-forget — never blocks the response) ─────────
    const updatedMessages = [...existingMessages, newUserMessage, chupChuMessage];

    (async () => {
      try {
        if (primaryRowId) {
          const { error: saveError } = await db
            .from('chupchu_conversations')
            .update({
              messages: updatedMessages,
              updated_at: new Date().toISOString(),
            })
            .eq('id', primaryRowId);
          if (saveError) console.error('[Memory] DB save (update) failed:', saveError.message);
          else console.log('[Memory] DB save (update) ok — total msgs now:', updatedMessages.length);
        } else {
          // First message ever for this user — insert once
          const { error: insertError } = await db
            .from('chupchu_conversations')
            .insert({
              user_id: userId,
              garden_id: garden?.id || null,
              messages: updatedMessages,
            });
          if (insertError) console.error('[Memory] DB save (insert) failed:', insertError.message);
          else console.log('[Memory] DB save (insert) ok — total msgs now:', updatedMessages.length);
        }
      } catch (e: any) {
        console.error('[Memory] Save threw unexpectedly:', e?.message);
      }
    })();

    // ── 11. Count usage ───────────────────────────────────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messagesUsedThisMonth = updatedMessages.filter(
      m => m.role === 'user' &&
      new Date(m.timestamp) >= startOfMonth
    ).length;

    res.json({
      response: chupChuText,
      messagesUsedThisMonth,
      monthlyLimit,
      ...(proposedTasks && proposedTasks.length > 0 ? { proposedTasks } : {}),
      ...(mobileTool ? { mobileTool } : {}),
    });

    } finally {
      inFlight.delete(userId);
    }

  } catch (err: any) {
    console.error('[CHAT ERROR]', err?.message);
    console.error('[CHAT ERROR STACK]', err?.stack?.slice(0, 800));
    res.status(500).json({ error: err?.message ?? 'unknown error' });
  }
});

// ── GET /api/chupchu/pending-tasks ──────────────────────────────────────────
chupChuRouter.get('/pending-tasks', async (req: any, res) => {
  try {
    const { data } = await db
      .from('garden_tasks')
      .select('id, title, date, priority, category, status')
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .order('date', { ascending: true, nullsFirst: false })
      .limit(10);
    // Return date as due_date so mobile clients don't need an update
    res.json((data ?? []).map((t: any) => ({ ...t, due_date: t.date })));
  } catch (err: any) {
    console.error('[GET /api/chupchu/pending-tasks]', err.message);
    res.json([]);
  }
});

// ── POST /api/chupchu/execute-tool ──────────────────────────────────────────
chupChuRouter.post('/execute-tool', async (req: any, res) => {
  const { tool_name, params } = req.body as { tool_name: string; params: Record<string, any> };
  const userId = req.user.id;

  try {
    switch (tool_name) {
      case 'create_journal_entry': {
        await db.from('journal_entries').insert({
          user_id:    userId,
          text:       params.text,
          date:       params.date,
          photo_url:  params.photo_url ?? null,
          created_at: new Date().toISOString(),
        });
        break;
      }
      case 'create_task': {
        await db.from('garden_tasks').insert({
          user_id:       userId,
          title:         params.title,
          date:          params.due_date ?? new Date().toISOString().slice(0, 10),
          type:          'custom',
          status:        'pending',
          priority:      params.priority ?? 'medium',
          category:      params.category ?? 'general',
          source_action: 'chupchu',
          created_at:    new Date().toISOString(),
        });
        break;
      }
      case 'add_map_marker': {
        await db.from('garden_map_markers').insert({
          user_id:       userId,
          plant_name:    params.plant_name,
          location_hint: params.location_hint,
          x:             params.x ?? null,
          y:             params.y ?? null,
          created_at:    new Date().toISOString(),
        });
        break;
      }
      case 'log_bd_prep': {
        await db.from('bd_applications').insert({
          user_id:    userId,
          prep_name:  params.prep_name,
          date:       params.date,
          created_at: new Date().toISOString(),
        });
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown tool: ${tool_name}` });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/chupchu/execute-tool]', err.message);
    res.status(500).json({ error: 'שגיאה בביצוע הפעולה. נסה שוב.' });
  }
});

// ── POST /api/chupchu/upload-journal-photo ───────────────────────────────────
chupChuRouter.post('/upload-journal-photo', async (req: any, res) => {
  try {
    const { base64, mimeType = 'image/jpeg' } = req.body as { base64: string; mimeType?: string };
    if (!base64) return res.status(400).json({ error: 'base64 required' });

    const ext      = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `${req.user.id}/${Date.now()}.${ext}`;
    const buffer   = Buffer.from(base64, 'base64');

    const { error } = await db.storage
      .from('journal-photos')
      .upload(filename, buffer, { contentType: mimeType, upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = db.storage
      .from('journal-photos')
      .getPublicUrl(filename);

    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[POST /api/chupchu/upload-journal-photo]', err.message);
    res.status(500).json({ error: 'שגיאה בהעלאת התמונה.' });
  }
});
