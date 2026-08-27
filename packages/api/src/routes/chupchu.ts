import 'dotenv/config';
import { Router, type IRouter } from 'express';
import axios from 'axios';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { askChupChu, CHUPCHU_GLOSSARY_HE, type ProposedTask, type MobileToolCall } from '../services/claude';
import { compressImageForClaude } from '../services/plantVision';
import { fetchWeatherForRegion, getCachedWeatherForCoords } from '../services/weather';
import type { ChupChuMessage, ChupChuContext } from '@gina-haya/shared';
import { todayInIsrael } from '@gina-haya/shared';
import { getRecentCompletedTasks } from '../db/queries/tasks';
import { getLimits } from '../config/tiers';
import { checkAndRecordVisionUse, recordFreeRetryVisionUse } from '../services/visionQuota';
import { logApiUsage } from '../services/apiUsage';
import { lastScheduledIrrigation, isWateringTask } from '../utils/irrigation';
import { userOwnsGardenPlant } from '../utils/ownership';
import { resolveGardenId } from '../utils/garden';

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

// ── Block 2 (stableContext) in-process cache ──────────────────────────────────
// Root cause of cache-bust investigation (Part 0): pendingTasksSection is rebuilt from
// a live garden_tasks query on every message.  Since create_tasks fires on almost every
// advice turn, the user may confirm tasks between messages, changing the pending-task list
// → Block 2 content differs across consecutive messages → Anthropic 5-min TTL misses even
// on rapid follow-ups.  Same applies to taskContext (completed tasks) and memorySection
// (written by summarize calls).
//
// Fix: assemble the stableContext STRING once per session and freeze it for 1 hour.
// This matches the Anthropic ttl:3600 on Block 2 — when the string is identical, the
// cache hits.  Claude already knows mid-session task creations from the conversation
// itself, so stale pending-task data in the prompt is harmless within a session.
// The cache expires on its own when the user goes cold, ensuring the next session starts
// with fresh garden/task state.
interface StableContextEntry {
  context: string;
  builtAt: number;
}
const stableContextByUser = new Map<string, StableContextEntry>();
const STABLE_CONTEXT_TTL_MS = 60 * 60 * 1000; // 1 h — mirrors Anthropic cache TTL

// ── Shared helper: persist a chupchu analysis to plant_timeline ──────────────
async function insertChupChuTimelineEntry(
  userId: string,
  plantId: string,
  diagnosis: any,
  trackerId?: string | null,
  photoPath?: string | null,
): Promise<string | null> {
  const { data, error } = await db
    .from('plant_timeline')
    .insert({
      plant_id:   plantId,
      tracker_id: trackerId ?? null,
      user_id:    userId,
      entry_type: 'chupchu_analysis',
      content:    diagnosis,
      note:       `צ'ופצ'ו הסתכל · ${diagnosis.plant_name ?? ''}`,
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .select('id');
  if (error) {
    console.error('[insertChupChuTimelineEntry]', error.message, error.details);
    return null;
  }
  return data?.[0]?.id ?? null;
}

// ── Shared helper: upload a Chupchu diagnosis photo to Supabase Storage ───────
// Reuses the tracker-photos bucket (path: {userId}/chupchu/{timestamp}.jpg),
// so the website's TimelinePhoto component (which already reads from that
// bucket via signed URL) requires no changes.
// Non-blocking: on failure, logs and returns null — callers continue normally.
async function uploadChupChuPhoto(
  userId: string,
  imageBase64: string,
  subfolder?: string,
): Promise<string | null> {
  try {
    const compressed = await compressImageForClaude(imageBase64);
    const folder = subfolder ? `chupchu/${subfolder}` : 'chupchu';
    const storagePath = `${userId}/${folder}/${Date.now()}.jpg`;
    const { error: uploadError } = await db.storage
      .from('tracker-photos')
      .upload(storagePath, compressed.buffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) {
      console.error('[uploadChupChuPhoto] Upload failed:', uploadError.message, uploadError);
      return null;
    }
    return storagePath;
  } catch (err: any) {
    console.error('[uploadChupChuPhoto] Exception:', err.message, err.stack);
    return null;
  }
}

// ── Shared helper: translate a full-diagnosis payload into the shapes expected ─
// by plant_tracker_checkins (ai_analysis + growing_plan columns).
// Used by both full-diagnosis and attach-diagnosis so the mapping stays canonical.
//
// Returns { aiAnalysis, growingPlan } as separate objects so the two DB columns
// are written independently — growing_plan must NOT be nested inside ai_analysis.
//
// GrowingPlan shape mirrors trackerStore.ts:GrowingPlan (website type source of truth).
// Empty arrays/strings are used where the diagnosis payload has no equivalent —
// AnalysisResult.tsx guards array sections with .length > 0 so they render as absent,
// not as empty bullets.  wateringSchedule.frequencyDays is rendered unconditionally
// ("כל X ימים") so 3 is used as a safe default rather than null/0.
function buildCheckinAnalysis(diagnosis: any): { aiAnalysis: Record<string, any>; growingPlan: Record<string, any> } {
  const healthMap: Record<string, string> = {
    healthy: 'good', stressed: 'fair', diseased: 'poor', pest_damage: 'poor',
  };

  const aiAnalysis = {
    plantIdentified:   diagnosis.plant_name        ?? '',
    plantIdentifiedEn: diagnosis.plant_name_latin  ?? '',
    confidence:        diagnosis.confidence         ?? 'medium',
    growthStage:       'vegetative',
    growthStageHe:     '',   // Fixed: was diagnosis.plant_name (wrong field — website has its own stage map)
    health:            healthMap[diagnosis.health_status as string] ?? 'fair',
    healthHe:          diagnosis.health_status_label ?? '',
    issues: (diagnosis.issues ?? []).map((i: any) => ({
      type:            i.name        ?? '',
      severity:        i.severity    ?? 'low',
      description:     i.description ?? '',
      naturalSolution: '',
    })),
    observations:     diagnosis.summary ?? '',
    immediateActions: (diagnosis.tasks ?? [])  // Fixed: was hardcoded []
      .filter((t: any) => t.urgency === 'today')
      .map((t: any) => t.title ?? ''),
  };

  const growingPlan = {
    summary:               diagnosis.summary           ?? '',
    estimatedHarvestWeeks: null as number | null,
    steps:                 [] as any[],
    wateringSchedule: {
      frequencyDays:     3,   // rendered unconditionally ("כל X ימים") — 3 is a safe default
      amountDescription: '',
      specialNotes:      '',
    },
    fertilising: {
      compostAmount: '',
      timing:        '',
      preparations:  [] as string[],
    },
    pestPrevention:     (diagnosis.prevention_tips ?? []) as string[],
    naturalFertilizers: [] as string[],
  };

  return { aiAnalysis, growingPlan };
}

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
          const key = `${m.role}:${m.timestamp ?? ''}:${typeof m.content === 'string' ? m.content.slice(0, 50) : JSON.stringify(m.content).slice(0, 50)}`;
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

    // Persist real token data — fire-and-forget
    void logApiUsage({ userId, endpoint: 'vision_chat_image', model: 'claude-opus-4-5', usage: response.usage });

    res.json({ response: text });
  } catch (err: any) {
    console.error('[POST /api/chupchu/analyze-image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chupchu/full-diagnosis ───────────────────────────────────────
chupChuRouter.post('/full-diagnosis', async (req: any, res) => {
  try {
    const {
      image, mimeType = 'image/jpeg', language = 'he',
      plant_id, tracker_id, source, photo_storage_key,
      established_plant_name: rawEstablishedName,
      user_hint: rawUserHint,
    } = req.body;
    if (!image && !photo_storage_key) return res.status(400).json({ success: false, error: 'No image provided' });

    const userId = req.user?.id;

    // Ownership check: plant_id is caller-supplied — verify before the vision quota
    // burn, before the storage download, and before any DB read or write involving it.
    // Matches the pattern applied to /starter-tasks and /attach-diagnosis.
    // Fails closed via userOwnsGardenPlant (returns false on DB error).
    if (plant_id) {
      if (!userId || !(await userOwnsGardenPlant(String(plant_id), userId))) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    // Sanitise the optional identification fields.
    // user_hint: human-sourced correction — capped at 200 chars, matching the
    //   chat-retry truncation policy.
    // established_plant_name: model- or user-confirmed name from a prior recognition.
    const userHint: string | null =
      typeof rawUserHint === 'string' && rawUserHint.trim().length > 0
        ? rawUserHint.trim().slice(0, 200)
        : null;
    const establishedName: string | null =
      typeof rawEstablishedName === 'string' && rawEstablishedName.trim().length > 0
        ? rawEstablishedName.trim()
        : null;

    // identification_source determines how the final plant_name was reached.
    // Computed server-side from the input fields, not from the model response.
    const identificationSource: 'fresh' | 'established' | 'user' =
      userHint        ? 'user'        :
      establishedName ? 'established' :
      'fresh';

    // Log the identification context so Railway logs show what the model was told.
    if (establishedName || userHint) {
      console.log(
        `[full-diagnosis] established identification supplied — source=${identificationSource}` +
        ` name="${establishedName ?? '(none)'}` +
        `${userHint ? `" hint="${userHint}` : ''}"`,
      );
    }

    // ── Validate photo_storage_key if provided ───────────────────────────────
    // The client may supply a key it already uploaded to tracker-photos, in which
    // case we skip the server-side upload and use the key directly.
    let clientPhotoKey: string | null = null;
    if (photo_storage_key !== undefined && photo_storage_key !== null) {
      const userId = req.user?.id;
      if (
        typeof photo_storage_key !== 'string' ||
        photo_storage_key.trim().length === 0 ||
        photo_storage_key.startsWith('/') ||
        photo_storage_key.startsWith('file://') ||
        !userId ||
        !photo_storage_key.startsWith(`${userId}/`)
      ) {
        return res.status(400).json({ success: false, error: 'invalid_photo_storage_key' });
      }
      clientPhotoKey = photo_storage_key;
    }

    // ── Resolve effective image ──────────────────────────────────────────────
    // When the client omits image but supplies photo_storage_key (restored-card
    // path: base64 is no longer in memory but the photo exists in Storage), we
    // download the object from the tracker-photos bucket and use it as the image.
    //
    // Security: clientPhotoKey is validated above to start with the authenticated
    // user's own userId prefix, so no cross-user access is possible.  The db
    // client uses the service role key (bypasses RLS for server-side operations).
    //
    // Errors:
    //   photo_not_found_in_storage — key supplied but download failed (missing/
    //     deleted file), distinguishable from "no key at all" (No image provided).
    let effectiveImage: string = image ?? '';
    let effectiveMimeType: string = mimeType;
    if (!image && clientPhotoKey) {
      const { data: blob, error: dlErr } = await db.storage
        .from('tracker-photos')
        .download(clientPhotoKey);
      if (dlErr || !blob) {
        console.error('[full-diagnosis] storage download failed:', dlErr?.message ?? 'no blob', 'key:', clientPhotoKey);
        return res.status(400).json({ success: false, error: 'photo_not_found_in_storage' });
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      effectiveImage = buf.toString('base64');
      effectiveMimeType = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';
      console.log(`[full-diagnosis] resolved image from storage key=${clientPhotoKey} size=${buf.length}b mime=${effectiveMimeType}`);
    }

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
      ? `אתה צ'ופצ'ו, מומחה גינה ביודינמי. קיבלת תמונה של צמח. עליך לנתח אותה לעומק ולהחזיר תשובה בפורמט JSON בלבד — ללא טקסט נוסף, ללא markdown, רק JSON תקין. נתח: זיהוי הצמח, מצב בריאותו, בעיות שנראות, צעדי טיפול מפורטים, משימות דחופות, וטיפ ביודינמי. אם הצמח בריא, מלא את השדות בהתאם עם tasks ריק או עם משימות תחזוקה שגרתיות.\n\n${CHUPCHU_GLOSSARY_HE}`
      : `You are Chupchu, a biodynamic garden expert. You received a plant photo. Analyze it deeply and return a response in JSON format only — no extra text, no markdown, just valid JSON. Analyze: plant identification, health status, visible issues, detailed treatment steps, urgent tasks, and a biodynamic tip. If the plant is healthy, fill fields accordingly with empty tasks or routine maintenance tasks.`;

    // ── Identification context prefix ────────────────────────────────────────
    // When an established identification is supplied, it is injected before the
    // JSON instruction so the model cannot miss it.  Authority levels:
    //
    //   user        — human-sourced correction; treat as fact, do not re-identify.
    //                 If the image clearly contradicts the hint, note it in
    //                 identification_conflict rather than silently replacing plant_name.
    //   established — model-confirmed prior; treat as a strong prior, not a fact.
    //                 May disagree, but must do so explicitly in identification_conflict.
    //   fresh       — no prior; identify from scratch.
    //
    // The identification_conflict field is added to the schema only when a prior exists.
    const buildIdentificationPrefix = (lang: string): string => {
      if (!establishedName && !userHint) return '';

      if (lang === 'he') {
        if (userHint) {
          return (
            `המשתמש כבר זיהה את הצמח הזה בעצמו: "${establishedName ?? userHint}" (לפי דבריו: "${userHint}").\n` +
            `התייחס לזיהוי הזה כנתון. אל תזהה מחדש מאפס — נתח את מצב הבריאות, הבעיות והטיפול של הצמח הזה.\n` +
            `השתמש בשם שצוין בשדה plant_name. ` +
            `אם התמונה סותרת את הזיהוי בבירור, ציין זאת במפורש בשדה identification_conflict — אך אל תחליף את השם בשקט.\n\n`
          );
        }
        // established only (model-sourced prior)
        return (
          `זיהוי קודם של הצמח: "${establishedName}".\n` +
          `התייחס לכך כמידע חזק אך לא מוחלט. אם אתה מסכים — השתמש בשם הזה בשדה plant_name. ` +
          `אם אתה חושב שהזיהוי שגוי, ציין את דעתך בשדה identification_conflict ונמק — אך אל תחליף את השם בשקט.\n\n`
        );
      } else {
        if (userHint) {
          return (
            `The user has already identified this plant as: "${establishedName ?? userHint}" (their exact words: "${userHint}").\n` +
            `Treat this identification as established fact. Do not re-identify from scratch — analyse the health, issues, and care of this specific plant.\n` +
            `Use the supplied name in the plant_name field. ` +
            `If the image clearly contradicts the identification, state that explicitly in identification_conflict — do not silently substitute a different name.\n\n`
          );
        }
        return (
          `Prior plant identification: "${establishedName}".\n` +
          `Treat this as a strong prior, not an absolute fact. If you agree, use it in plant_name. ` +
          `If you believe the identification is wrong, explain in identification_conflict — do not silently substitute.\n\n`
        );
      }
    };

    const identificationPrefix = buildIdentificationPrefix(language);

    // conflict field appended to schema when a prior exists (so model knows the slot is available)
    const conflictFieldHe  = establishedName || userHint
      ? `  "identification_conflict": null\n`
      : '';
    const conflictFieldEn  = establishedName || userHint
      ? `,"identification_conflict":null`
      : '';

    const userPrompt = language === 'he'
      ? `${identificationPrefix}נתח את הצמח בתמונה והחזר JSON תקין בלבד עם המבנה הבא בדיוק:
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
  "prevention_tips": ["טיפ 1", "טיפ 2", "טיפ 3"]${conflictFieldHe ? `,\n${conflictFieldHe.trimEnd()}` : ''}
}
ערכים חוקיים: confidence = high|medium|low, health_status = healthy|stressed|diseased|pest_damage, severity = low|medium|high, urgency = today|this_week|this_month.`
      : `${identificationPrefix}Analyze the plant in the image and return ONLY valid JSON with this exact structure: {"plant_name":"...","plant_name_latin":"...","confidence":"high","health_status":"healthy","health_status_label":"...","summary":"...","issues":[{"name":"...","severity":"low","description":"..."}],"treatment_steps":[{"step":1,"title":"...","description":"..."}],"biodynamic_tip":"...","tasks":[{"title":"...","description":"...","urgency":"this_week","urgency_label":"This week"}],"prevention_tips":["...","..."]${conflictFieldEn}}. Valid values: confidence=high|medium|low, health_status=healthy|stressed|diseased|pest_damage, severity=low|medium|high, urgency=today|this_week|this_month.`;

    const response = (await axios.post(ANTHROPIC_URL, {
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: effectiveMimeType as any,
              data: effectiveImage,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 90000 })).data;

    // Persist real token data — fire-and-forget
    void logApiUsage({ userId: req.user?.id, endpoint: 'vision_full_diagnosis', model: 'claude-opus-4-5', usage: response.usage });

    // Stop-reason guard: a truncated response produces invalid JSON — never parse it.
    if (response.stop_reason === 'max_tokens' || response.stop_reason === 'stop_sequence') {
      console.warn(`[POST /api/chupchu/full-diagnosis] stop_reason=${response.stop_reason} — response truncated, returning error`);
      return res.json({ success: false, error: 'response_truncated', stop_reason: response.stop_reason });
    }

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
          console.error('[POST /api/chupchu/full-diagnosis] JSON parse failed, full raw:', raw);
          return res.json({ success: false, error: 'parse_error' });
        }
      } else {
        console.error('[POST /api/chupchu/full-diagnosis] No JSON found, full raw:', raw);
        return res.json({ success: false, error: 'parse_error' });
      }
    }

    // Validation gate: a partial object that parses is still incomplete.
    // These are the minimum fields buildCheckinAnalysis and the client both read.
    if (
      typeof diagnosis?.plant_name !== 'string' || !diagnosis.plant_name ||
      typeof diagnosis?.health_status !== 'string' || !diagnosis.health_status ||
      typeof diagnosis?.summary !== 'string' || !diagnosis.summary ||
      !Array.isArray(diagnosis?.treatment_steps) ||
      !Array.isArray(diagnosis?.tasks)
    ) {
      console.error('[POST /api/chupchu/full-diagnosis] Validation failed — missing required fields, diagnosis:', JSON.stringify(diagnosis));
      return res.json({ success: false, error: 'validation_error' });
    }

    // ── Disagreement detection ────────────────────────────────────────────────
    // When an established name was supplied, compare it to what the model returned.
    // A mismatch means the model silently substituted a different name — exactly the
    // failure mode these fields exist to prevent.  Log it so it is visible in Railway,
    // and surface it in the response so the client's graduation guard can act on it.
    if (establishedName && diagnosis?.plant_name) {
      const returnedName: string = String(diagnosis.plant_name).trim();
      const namesMatch =
        returnedName.toLowerCase() === establishedName.trim().toLowerCase();
      if (!namesMatch) {
        console.warn(
          `[full-diagnosis] identification disagreement — ` +
          `established="${establishedName}" returned="${returnedName}" ` +
          `conflict="${diagnosis.identification_conflict ?? '(none)'}"`,
        );
      }
    }

    // ── Upload photo to tracker-photos bucket (skipped when client pre-uploaded) ─
    // When clientPhotoKey is set the client already owns a copy in the bucket, so
    // we skip the server-side upload to avoid a second storage copy.
    // Non-blocking when we do upload: failure returns null and does not affect the
    // diagnosis response.
    // Path (server upload): {userId}/chupchu/{timestamp}.jpg
    const photoPath = clientPhotoKey !== null
      ? null  // no server upload — client key used for checkin; timeline entry will have photo_path = null
      : await uploadChupChuPhoto(req.user.id, image);

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
      // the full-diagnosis prompt has no per-plant context, so filtering is the primary guard).
      // isWateringTask() keys on the structured `category` field — same rule as starter-task
      // seeding in garden.ts, both importing from utils/irrigation.ts.
      if (gpRow?.auto_irrigation === true && Array.isArray(diagnosis.tasks)) {
        diagnosis.tasks = diagnosis.tasks.filter((t: any) => !isWateringTask(t));
      }

      // When clientPhotoKey is set the client already created a photo timeline entry,
      // so pass null here to avoid a visual double in the timeline.
      timelineEntryId = await insertChupChuTimelineEntry(
        req.user.id,
        plant_id,
        diagnosis,
        tracker_id ?? null,
        clientPhotoKey !== null ? null : photoPath,
      );
    }

    // ── Mirror the analysis into plant_tracker_checkins when called from a tracker ─
    // full-diagnosis writes only to plant_timeline, so the tracker widget (which reads
    // plant_tracker_checkins) always showed "no analysis yet" for analyses done via the
    // mobile "track" flow.  When tracker_id is supplied we verify ownership then insert
    // a translated check-in row so the widget resolves latest_checkin correctly.
    // Non-blocking — failure does not affect the diagnosis response.
    if (tracker_id && req.user?.id) {
      try {
        const { data: trackerRow } = await db
          .from('plant_trackers')
          .select('id')
          .eq('id', tracker_id)
          .eq('user_id', req.user.id)
          .is('deleted_at', null)
          .single();

        if (trackerRow) {
          const { aiAnalysis, growingPlan } = buildCheckinAnalysis(diagnosis);
          // Use clientPhotoKey when the client pre-uploaded the photo; otherwise use
          // the server-uploaded path.  This keeps the tracker widget photo correct
          // without creating a second storage copy.
          const checkinPhotoPath = clientPhotoKey ?? photoPath ?? null;
          const { error: checkinErr } = await db.from('plant_tracker_checkins').insert({
            tracker_id:   tracker_id,
            user_id:      req.user.id,
            checkin_date: todayInIsrael(),
            growth_stage: 'vegetative',
            ai_analysis:  aiAnalysis,
            growing_plan: growingPlan,
            photo_path:   checkinPhotoPath,
          });
          if (checkinErr) {
            console.error('[full-diagnosis] plant_tracker_checkins insert failed:', checkinErr.message);
          } else {
            console.log('[full-diagnosis] created check-in for tracker', tracker_id);
          }
        }
      } catch (checkinInsertErr: any) {
        console.error('[full-diagnosis] check-in insert threw:', checkinInsertErr.message);
      }
    }

    // When no plant_id was supplied (chat "add to garden" flow), return photo_path
    // so the client can forward it to attach-diagnosis once a plant is created.
    res.json({
      success: true,
      diagnosis,
      timeline_entry_id: timelineEntryId,
      photo_path: photoPath,
      // Tells the client which path produced plant_name:
      //   "fresh"       — model identified from scratch (no prior supplied)
      //   "established" — model-confirmed prior was supplied; model used or contested it
      //   "user"        — human-typed correction was supplied; model was instructed to honour it
      // When identificationSource is not "fresh", diagnosis.identification_conflict (if set)
      // contains the model's explicit disagreement — the client should surface this rather
      // than silently proceeding with the returned plant_name.
      identification_source: identificationSource,
    });
  } catch (err: any) {
    console.error('[POST /api/chupchu/full-diagnosis]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/chupchu/attach-diagnosis ─────────────────────────────────────
// Persists a previously-returned full-diagnosis JSON to plant_timeline for a
// plant that was created after the analysis ran.  No Anthropic call — pure DB
// write.  Used when the user adds a plant to their garden after viewing the
// report, so the timeline entry is created retroactively.
//
// Request:  { garden_plants_id: string, diagnosis: <full-diagnosis payload>,
//             photo_path?: string, tracker_id?: string }
// Response: { success: true, timeline_entry_id: string }
chupChuRouter.post('/attach-diagnosis', async (req: any, res) => {
  try {
    const { garden_plants_id, diagnosis, photo_path, tracker_id } = req.body;

    if (!garden_plants_id || typeof garden_plants_id !== 'string') {
      return res.status(400).json({ success: false, error: 'garden_plants_id is required' });
    }
    if (!diagnosis || typeof diagnosis !== 'object' || Array.isArray(diagnosis)) {
      return res.status(400).json({ success: false, error: 'diagnosis object is required' });
    }

    const userId = req.user.id;
    const validatedPhotoPath = typeof photo_path === 'string' && photo_path.length > 0 ? photo_path : null;
    const validatedTrackerId = typeof tracker_id === 'string' && tracker_id.length > 0 ? tracker_id : null;

    // Verify ownership: garden_plants has no direct user_id column; ownership
    // flows through garden_id → gardens.user_id (same pattern as garden PATCH).
    const { data: gp, error: gpError } = await db
      .from('garden_plants')
      .select('garden_id')
      .eq('id', garden_plants_id)
      .single();

    if (gpError || !gp) {
      return res.status(404).json({ success: false, error: 'plant_not_found' });
    }

    const { data: garden, error: gardenError } = await db
      .from('gardens')
      .select('id')
      .eq('id', gp.garden_id)
      .eq('user_id', userId)
      .single();

    if (gardenError || !garden) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const timelineEntryId = await insertChupChuTimelineEntry(
      userId,
      garden_plants_id,
      diagnosis,
      validatedTrackerId,
      validatedPhotoPath,
    );

    if (!timelineEntryId) {
      return res.status(500).json({ success: false, error: 'Failed to persist diagnosis' });
    }

    // ── Mirror analysis into plant_tracker_checkins ────────────────────────
    // GET /api/trackers resolves latest_checkin from plant_tracker_checkins,
    // not plant_timeline, so the tracker summary window shows "no analysis yet"
    // unless we write here too.  Non-blocking — failure does not affect response.
    if (validatedTrackerId) {
      try {
        const { data: trackerRow } = await db
          .from('plant_trackers')
          .select('id')
          .eq('id', validatedTrackerId)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .single();

        if (trackerRow) {
          const { aiAnalysis, growingPlan } = buildCheckinAnalysis(diagnosis);
          const { error: checkinErr } = await db.from('plant_tracker_checkins').insert({
            tracker_id:   validatedTrackerId,
            user_id:      userId,
            checkin_date: todayInIsrael(),
            growth_stage: 'vegetative',
            ai_analysis:  aiAnalysis,
            growing_plan: growingPlan,
            photo_path:   validatedPhotoPath,
          });
          if (checkinErr) {
            console.error('[attach-diagnosis] plant_tracker_checkins insert failed:', checkinErr.message);
          } else {
            console.log('[attach-diagnosis] created check-in for tracker', validatedTrackerId);
          }
        } else {
          console.log('[attach-diagnosis] tracker not found or not owned — skipping checkin', validatedTrackerId);
        }
      } catch (checkinInsertErr: any) {
        console.error('[attach-diagnosis] check-in insert threw:', checkinInsertErr.message);
      }
    }

    res.json({ success: true, timeline_entry_id: timelineEntryId });
  } catch (err: any) {
    console.error('[POST /api/chupchu/attach-diagnosis]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/chupchu/history ─────────────────────────────────────────────
chupChuRouter.delete('/history', async (req: any, res) => {
  try {
    const { error } = await db
      .from('chupchu_conversations')
      .delete()
      .eq('user_id', req.user.id);
    if (error) throw error;
    // NOTE: chat_uses is intentionally NOT touched here — deleting conversation
    // context must not reset the quota counter.
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
      // For assistant turns: pass if there is a pre-built prose summary (vision turns),
      // or if the content is not a vision payload / raw JSON. User turns always pass.
      // isPastContextUnsuitable is still needed for the ~40 existing rows without summary,
      // and for any turn where JSON parsing failed at write time (no summary set).
      // sanitizeForPastContext is not applied here — turns with summary are already clean
      // prose; others are text-only after the filter (fence regex fixed in 2904274).
      .filter((m: any) => m.role !== 'assistant' || m.summary || !isPastContextUnsuitable(String(m.content)))
      .map((m: any) => {
        const label = m.role === 'user' ? (lang === 'he' ? 'משתמש' : 'User') : (lang === 'he' ? "צ'ופצ'ו" : 'Chupchu');
        // Fix E: codepoint-safe truncation — .slice on UTF-16 code units can split surrogate pairs.
        // Prefer summary over raw content for assistant turns — avoids echoing vision JSON.
        const body  = Array.from(String(m.summary ?? m.content)).slice(0, 200).join('');
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
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { plant_name, variety, plant_type, location_type, garden_plants_id, language } = req.body;

    if (!plant_name || !String(plant_name).trim()) {
      return res.status(400).json({ error: 'plant_name is required' });
    }

    // Ownership check: garden_plants_id is attacker-controlled — verify ownership
    // before any read involving that id. Uses the shared helper (same as the
    // garden-plants GET/DELETE routes) which fails closed on DB error.
    if (garden_plants_id) {
      if (!(await userOwnsGardenPlant(String(garden_plants_id), userId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const today = todayInIsrael();

    // Check auto_irrigation so we can suppress watering tasks for drip plants
    let autoIrrigation = false;
    if (garden_plants_id) {
      const { data: gpRow, error: gpError } = await db
        .from('garden_plants')
        .select('auto_irrigation')
        .eq('id', String(garden_plants_id))
        .single();
      if (gpError) throw gpError;
      autoIrrigation = gpRow?.auto_irrigation === true;
    }

    // Language: default Hebrew — English only when explicitly requested.
    // Flutter sends `language` in the JSON body for all Chupchu endpoints; if the
    // field is absent the value is undefined, which falls through to 'he'.
    const lang: 'he' | 'en' = language === 'en' ? 'en' : 'he';
    const isHe = lang === 'he';

    // Build a concise context string for the user turn
    const plantLabel = isHe
      ? (variety ? `${String(plant_name).trim()} (זן: ${String(variety).trim()})` : String(plant_name).trim())
      : (variety ? `${String(plant_name).trim()} (variety: ${String(variety).trim()})` : String(plant_name).trim());

    const locationMap: Record<string, string> = isHe
      ? { pot: 'עציץ', garden: 'גינה פתוחה', bed: 'ערוגה', hydroponic: 'הידרופוניקה', greenhouse: 'חממה' }
      : { pot: 'pot', garden: 'open garden', bed: 'raised bed', hydroponic: 'hydroponics', greenhouse: 'greenhouse' };
    const typeMap: Record<string, string> = isHe
      ? { annual: 'חד-שנתי', perennial: 'רב-שנתי', tree: 'עץ', shrub: 'שיח' }
      : { annual: 'annual', perennial: 'perennial', tree: 'tree', shrub: 'shrub' };

    const contextParts: string[] = isHe ? [`צמח: ${plantLabel}`] : [`Plant: ${plantLabel}`];
    if (plant_type)    contextParts.push(isHe ? `סוג: ${typeMap[String(plant_type)] ?? String(plant_type)}` : `Type: ${typeMap[String(plant_type)] ?? String(plant_type)}`);
    if (location_type) contextParts.push(isHe ? `מיקום גידול: ${locationMap[String(location_type)] ?? String(location_type)}` : `Growing location: ${locationMap[String(location_type)] ?? String(location_type)}`);
    contextParts.push(isHe ? `תאריך היום: ${today}` : `Today's date: ${today}`);

    const irrigationRule = isHe
      ? (autoIrrigation
          ? '\n- הצמח מושקה אוטומטית — אל תציע משימות השקיה'
          : '\n- משימה ראשונה: השקיה ראשונית — היום או מחר, category: watering')
      : (autoIrrigation
          ? '\n- The plant is auto-irrigated — do not suggest watering tasks'
          : '\n- First task: initial watering — today or tomorrow, category: watering');

    const systemPrompt = isHe
      ? `אתה צ'ופצ'ו — מומחה גינון ביודינמי חמים ומעשי. המשתמש זה עתה הוסיף צמח חדש לגינה שלו ואתה מכין עבורו 2–3 משימות התחלתיות מעשיות לטיפוח הצמח בשבועות הקרובים.

החזר מערך JSON בלבד — ללא markdown, ללא גרשיים מסביב, ללא הקדמה, ללא סיומת. רק מערך JSON תקין.

כל משימה במבנה הבא:
{"title":"כותרת קצרה ופעילה בעברית עד 8 מילים","notes":"הנחיה מעשית של 1–2 משפטים בעברית בסגנון חמים וישיר","date":"YYYY-MM-DD","category":"ערך מהרשימה המותרת","priority":"medium"}

ערכי category מותרים בלבד: watering | fertilizing | pruning | planting | harvesting | pest_control | composting | general

כללים:
- 2–3 משימות בלבד
- תאריכים בטווח 14 הימים הקרובים החל מהיום (${today})${irrigationRule}
- משימה שנייה: הזנה, חיפוי קרקע, או הכנת הקרקע — 7–14 ימים מהיום, category: fertilizing או general
- משימה שלישית (אופציונלית): תצפית או בדיקה מותאמת לסוג הצמח — category: general
- priority תמיד "medium" אלא אם יש סיבה ברורה אחרת

${CHUPCHU_GLOSSARY_HE}`
      : `You are Chupchu — a warm, practical biodynamic gardening expert. The user has just added a new plant to their garden and you are preparing 2–3 practical starter tasks to care for the plant over the coming weeks.

Return a JSON array only — no markdown, no surrounding quotes, no preamble, no suffix. Only valid JSON.

Each task in this structure:
{"title":"short active title in English up to 8 words","notes":"practical instruction of 1–2 sentences in a warm, direct style","date":"YYYY-MM-DD","category":"value from the allowed list","priority":"medium"}

Allowed category values only: watering | fertilizing | pruning | planting | harvesting | pest_control | composting | general

Rules:
- 2–3 tasks only
- Dates within the next 14 days from today (${today})${irrigationRule}
- Second task: feeding, mulching, or soil preparation — 7–14 days from today, category: fertilizing or general
- Third task (optional): observation or check suited to the plant type — category: general
- priority always "medium" unless there is a clear reason otherwise`;

    const aiRes = (await axios.post(ANTHROPIC_URL, {
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: contextParts.join('\n') }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 60000 })).data;

    // Stop-reason guard: a truncated array is unparseable and produces an incomplete task list.
    if (aiRes.stop_reason === 'max_tokens' || aiRes.stop_reason === 'stop_sequence') {
      console.warn(`[POST /api/chupchu/starter-tasks] stop_reason=${aiRes.stop_reason} — response truncated, returning error`);
      return res.status(502).json({ error: 'response_truncated', stop_reason: aiRes.stop_reason });
    }

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
          console.error('[POST /api/chupchu/starter-tasks] JSON parse fallback failed, full raw:', cleaned);
          return res.status(502).json({ error: 'parse_error' });
        }
      } else {
        console.error('[POST /api/chupchu/starter-tasks] No JSON array found in response, full raw:', cleaned);
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

// ── Past conversation context builder — sanitization helpers ────────────────

// Returns true when an assistant turn is a vision payload or raw JSON that
// should never be injected as "what I said before".
// Matches: turns starting with ``` or {, or containing "plant_name" / "plant_name_latin".
function isPastContextUnsuitable(content: string): boolean {
  const trimmed = content.trimStart();
  return (
    trimmed.startsWith('```') ||
    trimmed.startsWith('{')   ||
    content.includes('"plant_name"') ||
    content.includes('"plant_name_latin"')
  );
}

// Remove formatting artifacts that produce bad model behaviour when injected.
// Strips code fence marker lines (preserving text between them), ** bold markers,
// leading ✅/❌, and double-quote characters (we wrap result in "..." in template).
function sanitizeForPastContext(raw: string): string {
  return raw
    .replace(/^```[^\n]*\n?/gm, '') // strip fence marker lines, keep content between them
    .replace(/\*\*/g, '')            // remove bold markers
    .replace(/^[✅❌]\s*/u, '')      // remove leading ✅ / ❌
    .replace(/"/g, '')               // strip double-quotes — wrapper provides them
    .trim();
}

// Truncate at maxCp codepoints, then back off to the last whitespace so the
// fragment never ends mid-token. Returns the empty string unchanged.
function truncateSafeCP(text: string, maxCp = 150): string {
  const cps = Array.from(text);
  if (cps.length <= maxCp) return text;
  const truncated = cps.slice(0, maxCp).join('');
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}

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
    const followingMsgs = pastMessages.slice(idx + 1);

    // Format date safely — guard against missing/invalid timestamps
    let date: string;
    try {
      const d = new Date(userMsg.timestamp);
      date = isNaN(d.getTime())
        ? 'בעבר'
        : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
    } catch { date = 'בעבר'; }

    // Fix E: codepoint-safe truncation to avoid splitting surrogate pairs on emoji
    const topic = Array.from(String(userMsg.content ?? '').replace(/🌿 \[.*?\]/g, '[תמונה]')).slice(0, 120).join('');

    let replyText = '';
    // Prefer pre-built summary (vision turns): clean prose, no filtering needed.
    // Fall back: walk forward past unsuitable turns (raw JSON, code fences).
    const firstAssistant = followingMsgs.find(m => m.role === 'assistant');
    if (firstAssistant?.summary) {
      replyText = truncateSafeCP(firstAssistant.summary, 150);
    } else {
      const cleanReply = followingMsgs
        .find(m => m.role === 'assistant' && !isPastContextUnsuitable(String(m.content ?? '')));
      if (cleanReply) {
        const cleaned = sanitizeForPastContext(String(cleanReply.content ?? ''));
        replyText = truncateSafeCP(cleaned, 150);
      }
    }

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
    const { message, gardenId, location, imageBase64, conversationHistory: clientHistory, retryOf, language } = req.body;

    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;
    const hasText  = typeof message === 'string' && message.trim().length > 0;

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: 'Message or image is required' });
    }

    // Reject storage-key-only retries: a retry always requires a new imageBase64.
    if (retryOf && !hasImage) {
      return res.status(400).json({ error: 'retry_requires_image' });
    }

    const userId = req.user.id;

    if (inFlight.has(userId)) {
      return res.status(429).json({ error: 'אירעה שגיאה. נסה שוב מאוחר יותר.' });
    }
    inFlight.add(userId);

    // Retry tracking — populated during the hasImage quota block below.
    // Declared in the outer try scope so they are visible to the post-Claude block.
    let retryOriginal: { id: string; vision_use_id: string | null; status: string; retry_of_id: string | null } | null = null;
    let retryVisionUseId: string | null = null;  // vision_uses.id charged for this turn
    let recognitionForResponse: Record<string, any> | null = null;  // set after parsing Claude response

    try {

    // ── 1. Load user profile ──────────────────────────────────────────────
    const { data: userProfile } = await db
      .from('users')
      .select('subscription_tier, language_preference, active_garden_id')
      .eq('id', userId)
      .single();

    const tier = userProfile?.subscription_tier || 'free';
    const lang = (language === 'he' || language === 'en')
      ? language
      : userProfile?.language_preference || 'he';

    // ── 2. Check monthly limits ───────────────────────────────────────────
    // Fix 4: use 'professional' (the real top-tier key in TIER_LIMITS) so
    // LAUNCH_FREE_MODE users get genuine unlimited limits, not the free fallback
    // that 'pro' (a non-existent key) would produce via getLimits().
    const LAUNCH_FREE_MODE = process.env.LAUNCH_FREE_MODE === 'true';
    const effectiveTier = LAUNCH_FREE_MODE ? 'professional' : tier;

    // Image turns consume a vision look, not a text-message credit.
    // Check the vision quota instead and skip the chat-message counter entirely
    // — this prevents double-charging an image turn against both quotas.
    // monthlyLimit and dailyLimit declared here so they are in scope for the final res.json().
    const tierLimits = getLimits(effectiveTier);
    const monthlyLimit = tierLimits.maxChupChuPerMonth;
    const dailyLimit   = tierLimits.maxChupChuPerDay;
    if (hasImage) {
      // ── Retry validation (one-hop max, ownership, not already retried) ──────
      if (retryOf?.recognitionId) {
        const { data: orig, error: origErr } = await db
          .from('recognition_history')
          .select('id, user_id, status, retry_of_id, vision_use_id')
          .eq('id', retryOf.recognitionId)
          .single();

        if (origErr || !orig || orig.user_id !== userId) {
          return res.status(400).json({ error: 'invalid_retry_target' });
        }
        if (orig.retry_of_id !== null) {
          return res.status(400).json({ error: 'retry_chain_limit' });
        }
        if (orig.status === 'retried') {
          return res.status(400).json({ error: 'already_retried' });
        }
        retryOriginal = orig;
        if (retryOf?.userHint) {
          console.log(`[chupchu/chat] retry with userHint="${retryOf.userHint}"`);
        }
      }

      // ── Vision quota (free retry bypasses the counter) ────────────────────
      if (retryOriginal?.vision_use_id) {
        // Check whether a free retry already exists for this original vision use
        const { count: priorFreeCount } = await db
          .from('vision_uses')
          .select('id', { count: 'exact', head: true })
          .eq('retry_of_id', retryOriginal.vision_use_id)
          .eq('is_free_retry', true);

        if ((priorFreeCount ?? 0) === 0) {
          // First retry for this recognition — grant it free
          retryVisionUseId = await recordFreeRetryVisionUse(userId, 'chat_image', retryOriginal.vision_use_id);
        } else {
          // Second retry onwards — charge normally
          const quota = await checkAndRecordVisionUse(userId, 'chat_image', null, effectiveTier);
          if (!quota.allowed) {
            return res.json({ ok: false, reason: 'vision_quota_exceeded', used: quota.used, limit: quota.limit });
          }
          retryVisionUseId = quota.visionUseId;
        }
      } else {
        // Normal (non-retry) image turn
        const quota = await checkAndRecordVisionUse(userId, 'chat_image', null, effectiveTier);
        if (!quota.allowed) {
          return res.json({ ok: false, reason: 'vision_quota_exceeded', used: quota.used, limit: quota.limit });
        }
        retryVisionUseId = quota.visionUseId;
      }
    } else {
      // Text-only turn: check daily quota first, then monthly.
      // Both checks are skipped entirely when LAUNCH_FREE_MODE is active (alpha testing bypass).
      if (!LAUNCH_FREE_MODE && (monthlyLimit !== null || dailyLimit !== null)) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Count from chat_uses — survives history deletion (see migration 029).
        // Two separate queries: daily and monthly. Errors are logged and
        // fail-open (count falls back to 0) so a DB hiccup never hard-blocks chat.
        const { count: countToday, error: countTodayErr } = await db
          .from('chat_uses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString());
        if (countTodayErr) console.error('[chat limit] daily count query failed:', countTodayErr.message);

        const { count: countMonth, error: countMonthErr } = await db
          .from('chat_uses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', startOfMonth.toISOString());
        if (countMonthErr) console.error('[chat limit] monthly count query failed:', countMonthErr.message);

        const messagesUsedToday     = countToday  ?? 0;
        const messagesUsedThisMonth = countMonth  ?? 0;

        // Daily limit check runs first.
        if (dailyLimit !== null && messagesUsedToday >= dailyLimit) {
          return res.status(429).json({
            error:                'rate_limit_exceeded',
            limitType:            'daily',
            tier,
            messagesUsedThisMonth,
            monthlyLimit,
            messagesUsedToday,
            dailyLimit,
          });
        }

        // Monthly limit check.
        if (monthlyLimit !== null && messagesUsedThisMonth >= monthlyLimit) {
          return res.status(429).json({
            error:                'rate_limit_exceeded',
            limitType:            'monthly',
            tier,
            messagesUsedThisMonth,
            monthlyLimit,
            messagesUsedToday,
            dailyLimit,
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

    // ── 4. Fetch user's garden (shared resolution helper) ────────────────
    // On ambiguous-multiple-gardens or no-gardens, proceed with garden = null
    // (conversation still works without garden context — never refuse chat).
    let garden: any = null;
    const gardenResolution = await resolveGardenId(userId, gardenId);
    if (gardenResolution.gardenId) {
      const { data } = await db
        .from('gardens')
        .select('*, garden_plants(*)')
        .eq('id', gardenResolution.gardenId)
        .eq('user_id', userId)
        .single();
      garden = data;
    }

    // ── 4b. Fetch active tracker garden_plant_ids (for plant prioritization) ──
    // Used in the gardenSection builder to put tracked plants first in the
    // context cap, so Claude always has data on the plants the user cares about.
    let trackedGardenPlantIds = new Set<string>();
    if (garden?.id) {
      const { data: trackerRows } = await db
        .from('plant_trackers')
        .select('garden_plants_id')
        .eq('user_id', userId)
        .eq('garden_id', garden.id)
        .is('deleted_at', null)
        .not('garden_plants_id', 'is', null);
      if (trackerRows) {
        for (const t of trackerRows) {
          if (t.garden_plants_id) trackedGardenPlantIds.add(t.garden_plants_id);
        }
      }
    }

    // ── 4c. Resolve last_watering for each active garden plant ────────────────
    // Single batched plant_timeline query — no N+1. Attaches .last_watering to each
    // plant object so buildPlantDetailLine can include it without extra DB calls.
    // Lives here in the volatile / per-request section (not in any cached block).
    const gardenPlantsList: any[] = garden?.garden_plants ?? [];
    if (gardenPlantsList.length > 0) {
      const plantIds = gardenPlantsList.map((p: any) => p.id);
      const { data: wateringRows, error: wateringError } = await db
        .from('plant_timeline')
        .select('plant_id, created_at')
        .in('plant_id', plantIds)
        .eq('entry_type', 'watering')
        .order('created_at', { ascending: false });

      if (wateringError) {
        console.error('[chupchu] plant_timeline batch query failed:', wateringError.message);
      }

      const latestManual = new Map<string, string>();
      for (const row of (wateringRows ?? [])) {
        if (!latestManual.has(row.plant_id)) latestManual.set(row.plant_id, row.created_at);
      }

      const now = new Date();
      for (const p of gardenPlantsList) {
        const manualAtStr = latestManual.get(p.id) ?? null;
        const scheduled   = lastScheduledIrrigation(
          p.auto_irrigation ?? false,
          p.irrigation_days  ?? null,
          p.irrigation_times ?? null,
          now,
        );
        const manualDate = manualAtStr ? new Date(manualAtStr) : null;
        if (manualDate && scheduled) {
          p.last_watering = manualDate >= scheduled
            ? { at: manualDate.toISOString(), source: 'manual' }
            : { at: scheduled.toISOString(),  source: 'scheduled' };
        } else if (manualDate) {
          p.last_watering = { at: manualDate.toISOString(), source: 'manual' };
        } else if (scheduled) {
          p.last_watering = { at: scheduled.toISOString(), source: 'scheduled' };
        } else {
          p.last_watering = null;
        }
      }
    }

    // ── 5. Fetch weather ──────────────────────────────────────────────────
    const weather = await fetchWeatherForRegion(garden?.location_region ?? null);

    // ── 6. Build ChupChu context ────────────────────────────────────────────
    const context: ChupChuContext = {
      gardenName: garden?.name || null,
      locationRegion: garden?.location_region || null,
      soilType: garden?.soil_type || null,
      plants: garden?.garden_plants?.map((p: any) =>
        lang === 'he' ? p.common_name_he : (p.common_name_en || p.common_name_he)
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
          const key = `${m.role}:${m.timestamp ?? ''}:${typeof m.content === 'string' ? m.content.slice(0, 50) : JSON.stringify(m.content).slice(0, 50)}`;
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
      historyForClaude = (clientHistory as Array<any>)
        .slice(-20)
        .map(m => {
          const msg: ChupChuMessage = {
            role: m.role as 'user' | 'assistant',
            // Fix E: codepoint-safe truncation to avoid splitting surrogate pairs on emoji
            content: Array.from(String(m.content ?? '')).slice(0, 500).join(''),
            timestamp: new Date().toISOString(),
          };
          // Preserve summary if the client round-tripped it from /history.
          if (typeof m.summary === 'string' && m.summary) msg.summary = m.summary;
          return msg;
        });
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
        const nDays  = (p.irrigation_days as number[]).length;
        const days   = (p.irrigation_days as number[]).map((d: number) => DAY_HE[d] ?? d).join(',');
        const liters: (number | null)[] | null = Array.isArray(p.irrigation_liters) ? p.irrigation_liters : null;
        const anyVolume = liters?.some((v: number | null) => v !== null);
        const timeStrs  = (p.irrigation_times as string[]).map((t: string, i: number) => {
          const norm = String(t).slice(0, 5);
          const lit  = liters?.[i] ?? null;
          return lit !== null
            ? (l === 'he' ? `${norm} · ${lit} ליטר` : `${norm} · ${lit}L`)
            : norm;
        });
        const timePart = timeStrs.join(', ');
        let weeklyClause = '';
        if (anyVolume) {
          const dailyL  = (liters as (number | null)[]).reduce((s, v) => s + (v ?? 0), 0);
          const weeklyL = dailyL * nDays;
          const fmt = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(1);
          weeklyClause = l === 'he'
            ? `; ~${fmt(weeklyL)} ליטר בשבוע`
            : `; ~${fmt(weeklyL)}L/week`;
        }
        details.push(l === 'he'
          ? `השקיה אוטומטית (ימים ${days}; ${timePart}${weeklyClause})`
          : `auto-irrigated (days ${days}; ${timePart}${weeklyClause})`);
      }
      // Resolved last watering (computed earlier in the volatile/per-request section).
      if (p.last_watering?.at) {
        const daysAgo = Math.round((Date.now() - new Date(p.last_watering.at).getTime()) / 86_400_000);
        const daysStr = daysAgo === 0
          ? (l === 'he' ? 'היום' : 'today')
          : daysAgo === 1
            ? (l === 'he' ? 'אתמול' : 'yesterday')
            : (l === 'he' ? `לפני ${daysAgo} ימים` : `${daysAgo} days ago`);
        const sourceNote = p.last_watering.source === 'scheduled'
          ? (l === 'he' ? ' (לפי לוח ההשקיה)' : ' (scheduled)')
          : '';
        details.push(l === 'he'
          ? `השקיה אחרונה: ${daysStr}${sourceNote}`
          : `last watered: ${daysStr}${sourceNote}`);
      }
      return details.length ? `${label} — ${details.join(', ')}` : label;
    };

    // Per-tier plant context cap: how many plants Claude sees in each request.
    // LAUNCH_FREE_MODE uses professional's cap (180) — same effectiveTier used elsewhere.
    const contextCap = getLimits(effectiveTier).maxPlantsInChupchuContext;

    let gardenSection = '';
    if (garden) {
      // 1. Exclude archived plants.
      // 2. Prioritize: plants with an active tracker first, then most recently added.
      //    This ensures Claude always has full detail on the plants the user monitors closely.
      const allActivePlants = ((garden.garden_plants ?? []) as any[])
        .filter((p: any) => !p.archived_at)
        .sort((a: any, b: any) => {
          const aTracked = trackedGardenPlantIds.has(a.id) ? 1 : 0;
          const bTracked = trackedGardenPlantIds.has(b.id) ? 1 : 0;
          if (bTracked !== aTracked) return bTracked - aTracked; // tracked first
          const ta = a.added_at ? new Date(a.added_at).getTime() : 0;
          const tb = b.added_at ? new Date(b.added_at).getTime() : 0;
          return tb - ta; // then most recently added
        });
      const detailPlants    = allActivePlants.slice(0, contextCap);
      const remainingPlants = allActivePlants.slice(contextCap);

      const lines: string[] = [];
      if (lang === 'he') {
        lines.push(`## הגינה של המשתמש`);
        lines.push(`אלה נתונים מאומתים מהמסד — הם גוברים על כל הנחיה לשאול על פרטים חסרים. אל תשאל ואל תבקש אישור על פרט שמופיע כאן (כגון: מיקום גידול, זן, סוג צמח); השתמש בו ישירות.`);
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
            lines.push(`  (ועוד ${remainingPlants.length} צמחים בגינה — שאלו אותי על צמח ספציפי בשמו)`);
          }
        }
      } else {
        lines.push(`## User's Garden`);
        lines.push(`Verified data from the database — this overrides any instruction to ask about missing details. Do not ask or request confirmation for any detail listed here (e.g. growing location, variety, plant type); use it directly.`);
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
            lines.push(`  (and ${remainingPlants.length} more plants in the garden — ask me about a specific plant by name)`);
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

    // ── Build image-turn instruction for Claude (image path only) ────────────
    // Lives in the volatile user message — does NOT touch any cached system block.
    // On image turns we ask Claude to return a strict JSON mini-card.  The hint
    // from a retry (retryOf.userHint) is prepended so Claude re-identifies with
    // the user's correction in scope.
    let messageForClaude: ChupChuMessage = newUserMessage;
    if (hasImage) {
      const retryHintLine = retryOriginal && retryOf?.userHint
        ? (lang === 'he'
            ? `המשתמש אמר שהזיהוי הקודם היה שגוי, ולפי דבריו הצמח הוא: "${String(retryOf.userHint).slice(0, 200)}".\nהתייחס לכך כמידע אמין ממקור אנושי. אמת אותו מול התמונה: אם הוא מתיישב עם מה שנראה בתמונה — השתמש בו, כולל הזן/הווריאציה אם צוינו. אם הוא סותר בבירור את התמונה — ציין זאת בעדינות ב-chupchu_comment והסבר מה כן נראה.\n`
            : `The user suggests the plant is likely ${String(retryOf.userHint).slice(0, 200)} — factor this into your identification.\n`)
        : '';

      const imageInstruction = lang === 'he'
        ? `${retryHintLine}זהה את הצמח בתמונה והחזר JSON בלבד עם המבנה הבא (ללא טקסט נוסף, ללא markdown):
{"plant_name":"שם הצמח בעברית","plant_name_latin":"Latin species name","confidence":"high|medium|low","key_facts":["עובדה 1","עובדה 2","עובדה 3"],"summary":"1-2 משפטים בעברית","chupchu_comment":"שורה אחת חמה בסגנון צ'ופצ'ו"}`
        : `${retryHintLine}Identify the plant in the image and return ONLY JSON with this exact structure (no extra text, no markdown):
{"plant_name":"Hebrew plant name","plant_name_latin":"Latin species name","confidence":"high|medium|low","key_facts":["fact 1","fact 2","fact 3"],"summary":"1-2 sentences","chupchu_comment":"one warm Chupchu-style line"}`;

      messageForClaude = {
        role: 'user',
        content: imageInstruction,
        timestamp: new Date().toISOString(),
      };
    }

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

    // Stable context: per-user data that does NOT change within a session.
    // This block is sent with cache_control (ttl:3600) so Claude can reuse cached tokens.
    //
    // We cache the assembled STRING in-process (stableContextByUser) for 1 h so that
    // mid-session task creations, completions, and memory writes do NOT alter Block 2
    // between consecutive messages.  A changed Block 2 string busts the Anthropic cache
    // even when messages arrive within 5 min — this was the primary cache-miss cause.
    // Claude knows about tasks it created from the conversation itself (not the prompt),
    // so freezing the pending-task list mid-session is safe.
    const nowMs = Date.now();
    const cachedStable = stableContextByUser.get(userId);
    let stableContext: string;
    if (cachedStable && nowMs - cachedStable.builtAt < STABLE_CONTEXT_TTL_MS) {
      stableContext = cachedStable.context;
    } else {
      stableContext = [
        memorySection,
        gardenSection,
        pendingTasksSection,
        taskContext,
      ].filter(Boolean).join('\n\n');
      stableContextByUser.set(userId, { context: stableContext, builtAt: nowMs });
    }

    // ── 8c. Build garden timeline summary (volatile — Block 3) ──────────────
    // Placed in Block 3 (not Block 2) because Block 2 is frozen in-process for
    // 1 h with no invalidation path. A user who logs a BD prep mid-session would
    // not see it in Chupchu's context for up to an hour if this were in Block 2.
    // Block 3 is rebuilt on every request from a live DB query — no staleness.
    // Also correct under Railway multi-instance: no inter-process state needed.
    //
    // Tolerates the table not existing: PostgREST returns code PGRST204 or
    // a 404-class error when the table is absent. The explicit error check below
    // catches that and falls through to gardenTimelineSection = '' so the app
    // behaves exactly as before the migration was run.
    let gardenTimelineSection = '';
    if (gardenResolution.gardenId) {
      try {
        const { data: timelineRows, error: timelineError } = await db
          .from('garden_timeline')
          .select('event_type, prep_name, event_date, time_of_day')
          .eq('garden_id', gardenResolution.gardenId)
          .is('deleted_at', null)
          .order('event_date', { ascending: false })
          .limit(60); // fetch enough to get last-of-each-type across all 6 types × 5 prep_names

        if (timelineError) {
          // Log but do not throw — the table may not exist yet (PGRST204).
          // Any other DB error is similarly non-fatal for this section.
          console.warn('[Chupchu] garden_timeline query failed (table may not exist yet):', timelineError.code, timelineError.message);
        } else if (timelineRows && timelineRows.length > 0) {
          // Deduplicate in JS: keep first (most recent) row per (event_type, prep_name) pair.
          // PostgREST does not support DISTINCT ON natively.
          const seen = new Set<string>();
          const deduped: typeof timelineRows = [];
          for (const row of timelineRows) {
            const key = `${row.event_type}:${row.prep_name ?? ''}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(row);
            }
          }

          const todayStr = todayInIsrael();
          const todayMs  = new Date(todayStr).getTime();

          const formatRow = (row: (typeof deduped)[number]): string => {
            const daysAgo = Math.round((todayMs - new Date(row.event_date).getTime()) / 86_400_000);
            const daysStr = daysAgo === 0
              ? (lang === 'he' ? 'היום' : 'today')
              : daysAgo === 1
                ? (lang === 'he' ? 'אתמול' : 'yesterday')
                : (lang === 'he' ? `לפני ${daysAgo} ימים` : `${daysAgo} days ago`);

            const timeStr = row.time_of_day ? ` (${row.time_of_day})` : '';

            const eventLabel: Record<string, { he: string; en: string }> = {
              bd_prep:       { he: 'פרפרט', en: 'BD prep' },
              compost_turn:  { he: 'הפיכת קומפוסט', en: 'compost turned' },
              bed_prep:      { he: 'הכנת ערוגה', en: 'bed prepared' },
              cover_crop:    { he: 'זבל ירוק', en: 'cover crop sown' },
              mulching:      { he: 'חיפוי קרקע', en: 'mulching' },
              pest_treatment:{ he: 'טיפול בהדברה', en: 'pest treatment' },
            };
            const label = eventLabel[row.event_type]?.[lang] ?? row.event_type;
            const prepPart = row.prep_name ? ` ${row.prep_name}` : '';

            return lang === 'he'
              ? `${label}${prepPart}: ${row.event_date} (${daysStr})${timeStr}`
              : `${label}${prepPart}: ${row.event_date} (${daysStr})${timeStr}`;
          };

          const lines = deduped.slice(0, 6).map(formatRow);
          gardenTimelineSection = lang === 'he'
            ? `## אירועי גינה אחרונים\n${lines.join('\n')}`
            : `## Recent Garden Events\n${lines.join('\n')}`;
        }
      } catch (timelineErr: any) {
        // Non-fatal: treat as empty section rather than breaking the request.
        console.warn('[Chupchu] garden_timeline section threw unexpectedly:', timelineErr.message);
      }
    }

    // Volatile context: changes on every request — must NOT be cached.
    // pastContextSection shifts every exchange; date/weather change constantly.
    // gardenTimelineSection: volatile because user may log a prep mid-session.
    const volatileContext = [
      pastContextSection,
      dateSection,
      weatherSection,
      gardenTimelineSection,
    ].filter(Boolean).join('\n\n');

    // Always prepend history (with role-alternation safety) before the current user message,
    // even when the current message includes an image.
    // For image turns, messageForClaude contains the JSON recognition instruction
    // (NOT stored in DB — newUserMessage with the placeholder is stored instead).
    //
    // Substitute summary for content on vision turns: Claude receives prose ("I identified
    // tomato (Solanum lycopersicum) — ...") rather than a raw JSON blob. summary is only
    // present on messages where recognition succeeded; all others are passed through as-is.
    const historyWithSummary = historyForClaude.map(m =>
      m.summary ? { ...m, content: m.summary } : m
    );
    const { response: chupChuText, proposedTasks, mobileTool } = await askChupChu(
      [...ensureRoleAlternation(historyWithSummary), messageForClaude],
      context,
      stableContext || undefined,
      volatileContext || undefined,
      compressedImage,
      userId,
    );

    const chupChuMessage: ChupChuMessage = {
      role: 'assistant',
      content: chupChuText,
      timestamp: new Date().toISOString(),
    };

    // ── 9b. Recognition: parse JSON mini-card, upload photo, persist row ─────
    // Only runs on image turns.  Parse failure falls back to raw-text response
    // (recognitionForResponse stays null — existing chat behaviour unchanged).
    if (hasImage) {
      let recognitionResult: any = null;

      // Try direct parse, then regex-extract fallback (same pattern as full-diagnosis)
      try {
        recognitionResult = JSON.parse(chupChuText.trim());
      } catch {
        const match = chupChuText.match(/\{[\s\S]*\}/);
        if (match) {
          try { recognitionResult = JSON.parse(match[0]); } catch {}
        }
      }

      // Validate: must have at least plant_name and confidence to be a mini-card
      const isValidCard = recognitionResult !== null &&
        typeof recognitionResult.plant_name === 'string' &&
        typeof recognitionResult.confidence === 'string';

      if (isValidCard) {
        // Upload (awaited so we can include the key in both response and DB row)
        const photoStorageKey = await uploadChupChuPhoto(userId, imageBase64, 'chat');

        // Insert recognition_history row — explicit error check per spec
        const rhPayload: Record<string, any> = {
          user_id:     userId,
          source:      'chat_image',
          result_json: recognitionResult,
          confidence:  ['high', 'medium', 'low'].includes(recognitionResult.confidence)
            ? recognitionResult.confidence
            : null,
          status: 'pending',
        };
        if (photoStorageKey)        rhPayload.photo_storage_key = photoStorageKey;
        if (retryVisionUseId)       rhPayload.vision_use_id     = retryVisionUseId;
        if (retryOriginal) {
          rhPayload.retry_of_id = retryOriginal.id;
          if (retryOf?.userHint)   rhPayload.user_hint = String(retryOf.userHint).slice(0, 200);
        }

        const { data: rhData, error: rhErr } = await db
          .from('recognition_history')
          .insert(rhPayload)
          .select('id')
          .single();

        if (rhErr) {
          console.error('[chat] recognition_history insert failed:', rhErr.message, rhErr.details);
        } else {
          const newRhId = rhData?.id ?? null;

          // Patch assistant message so restored history cards can render the photo.
          // content stays as chupChuText — Flutter's card detection reads it.
          if (newRhId) chupChuMessage.recognition_id = newRhId;
          chupChuMessage.recognition_photo_key = photoStorageKey ?? null;

          // Build a prose summary for model-input readers (historyForClaude,
          // buildPastContextSummary, convText). content is never modified here.
          {
            const plantName = recognitionResult.plant_name as string;
            const plantLatin = typeof recognitionResult.plant_name_latin === 'string' && recognitionResult.plant_name_latin
              ? recognitionResult.plant_name_latin as string : null;
            const comment = typeof recognitionResult.chupchu_comment === 'string' && recognitionResult.chupchu_comment
              ? recognitionResult.chupchu_comment as string : null;
            const namePart = plantLatin ? `${plantName} (${plantLatin})` : plantName;
            chupChuMessage.summary = lang === 'he'
              ? (comment ? `זיהיתי ${namePart} — ${comment}` : `זיהיתי ${namePart}`)
              : (comment ? `I identified ${namePart} — ${comment}` : `I identified ${namePart}`);
          }
          // Persist retry metadata onto the message so both fields survive a
          // history restore.  is_retry blocks the client from offering a second
          // retry; user_hint lets the client display the correction that was given.
          chupChuMessage.is_retry = !!retryOriginal;
          if (retryOriginal && retryOf?.userHint) {
            chupChuMessage.user_hint = String(retryOf.userHint).slice(0, 200);
          }

          // Mark original recognition as retried (non-fatal on failure)
          if (retryOriginal && newRhId) {
            const { error: updateErr } = await db
              .from('recognition_history')
              .update({ status: 'retried' })
              .eq('id', retryOriginal.id);
            if (updateErr) {
              console.error('[chat] recognition_history status update failed:', updateErr.message);
            }
          }

          recognitionForResponse = {
            id: newRhId,
            ...recognitionResult,
            photo_storage_key: photoStorageKey ?? null,
            // Tells the client this card is itself a retry-result — the backend
            // allows only one retry per original recognition (retry_chain_limit),
            // so the client should not offer "טעית בזיהוי" again on this card.
            is_retry: !!retryOriginal,
            // The user-supplied correction hint (if any) that seeded this retry.
            // Mirrored here so the client has it on the live response without a
            // separate fetch; also stored on chupChuMessage for history restore.
            user_hint: (retryOriginal && retryOf?.userHint)
              ? String(retryOf.userHint).slice(0, 200)
              : null,
          };
        }
      } else {
        console.log('[chat] image turn — Claude did not return JSON mini-card, falling back to text response');
      }
    }

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

    // ── 10b. Record chat_uses row ─────────────────────────────────────────────
    // Persists through history deletion — billing-adjacent quota counter.
    // Awaited with explicit error check; do NOT fire-and-forget.
    // Image turns are gated by vision_uses (checkAndRecordVisionUse) — skip here.
    if (!hasImage) {
      const { error: chatUsesErr } = await db
        .from('chat_uses')
        .insert({ user_id: userId });
      if (chatUsesErr) {
        console.error('[chat limit] CRITICAL: failed to insert chat_uses row:', chatUsesErr.message);
      }
    }

    // ── 11. Count usage ───────────────────────────────────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let messagesUsedThisMonth = 0;
    let messagesUsedToday = 0;
    for (const m of updatedMessages) {
      if (m.role !== 'user') continue;
      const ts = new Date(m.timestamp);
      if (ts >= startOfMonth) messagesUsedThisMonth++;
      if (ts >= startOfDay)   messagesUsedToday++;
    }

    res.json({
      response: chupChuText,
      messagesUsedThisMonth,
      monthlyLimit,
      messagesUsedToday,
      dailyLimit,
      ...(proposedTasks && proposedTasks.length > 0 ? { proposedTasks } : {}),
      ...(mobileTool ? { mobileTool } : {}),
      // Present on image turns where Claude returned a parseable JSON mini-card.
      // null/absent on text turns or when parse failed (response falls back to chupChuText).
      ...(recognitionForResponse ? { recognition: recognitionForResponse } : {}),
    });

    } finally {
      inFlight.delete(userId);
    }

  } catch (err: any) {
    // Log the axios response body when available (contains the actual Anthropic error detail).
    // Without this, Railway logs show only the generic "Request failed with status code 4xx"
    // message and the root cause (e.g. invalid model, missing beta header) stays hidden.
    if (err?.response?.data) {
      console.error('[CHAT ERROR] Upstream API response:', JSON.stringify(err.response.data));
    }
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
  console.log('[execute-tool] body:', { tool_name, gardenId: req.body.gardenId ?? '(absent)' });

  try {
    switch (tool_name) {
      case 'create_task': {
        const { error: taskInsertError } = await db.from('garden_tasks').insert({
          user_id:       userId,
          title:         params.title,
          date:          (params.due_date as string | undefined) || todayInIsrael(),
          type:          'custom',
          status:        'pending',
          priority:      params.priority ?? 'medium',
          category:      params.category ?? 'general',
          source_action: 'chupchu',
          created_at:    new Date().toISOString(),
        });
        if (taskInsertError) {
          console.error('[execute-tool/create_task] insert failed:', taskInsertError.message, taskInsertError.code);
          return res.status(500).json({ error: 'שגיאה בשמירת המשימה. נסה שוב.' });
        }
        break;
      }
      case 'log_bd_prep': {
        // Resolve garden_id via shared helper (body → active_garden_id → is_default → only-garden).
        // time_of_day and quantity_grams are intentionally not accepted here yet —
        // extending the tool schema requires a coordinated Flutter update (FOLLOW-UP).
        const { gardenId: bdGardenId, reason: gardenReason, gardens: gardenList } =
          await resolveGardenId(userId, req.body.gardenId as string | null | undefined);
        console.log('[execute-tool/log_bd_prep] garden resolution:', gardenReason, 'user:', userId);

        if (!bdGardenId) {
          if (gardenReason === 'db-error') {
            return res.status(500).json({ error: 'שגיאת מסד נתונים בחיפוש הגינה. נסה שוב.' });
          }
          if (gardenReason === 'no-gardens') {
            return res.status(400).json({ error: 'לא נמצאה גינה בחשבון. צור גינה ונסה שוב.' });
          }
          // ambiguous-multiple-gardens: name the gardens so the user can pick
          const names = (gardenList ?? []).map(g => g.name).join(', ');
          return res.status(400).json({
            error: `נמצאו ${gardenList?.length ?? 0} גינות: ${names}. פתח את הגינה הרצויה ונסה שוב.`,
          });
        }
        const { error: bdInsertError } = await db.from('garden_timeline').insert({
          garden_id:  bdGardenId,
          user_id:    userId,
          event_type: 'bd_prep',
          event_date: (params.date as string | undefined) || todayInIsrael(),
          prep_name:  params.prep_name,
          created_at: new Date().toISOString(),
        });
        if (bdInsertError) {
          console.error('[execute-tool/log_bd_prep] insert failed:', bdInsertError.message, bdInsertError.code);
          return res.status(500).json({ error: 'שגיאה בשמירת הפרפרט. נסה שוב.' });
        }
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
