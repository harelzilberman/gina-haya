import 'dotenv/config';
import { Router, type IRouter } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { fetchWeatherForRegion } from '../services/weather';
import { todayInIsrael } from '@gina-haya/shared';

export const mapRouter: IRouter = Router();
mapRouter.use(verifyToken);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Wizard limits per tier ────────────────────────────────────────────────────
const WIZARD_MONTHLY_LIMITS: Record<string, number | null> = {
  free:           1,   // 1 ever (checked separately)
  grower:         2,
  gardener_pro:   5,
  professional:   null, // unlimited
};

// ── GET /api/map ──────────────────────────────────────────────────────────────
mapRouter.get('/', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('garden_maps')
      .select('id, map_data, north_angle, garden_id, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return res.json({ exists: false });

    res.json({ exists: true, ...data });
  } catch (err: any) {
    console.error('[GET /api/map]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/map ─────────────────────────────────────────────────────────────
mapRouter.post('/', async (req: any, res) => {
  try {
    const { gardenId, mapData, northAngle = 0 } = req.body;

    const { data, error } = await db
      .from('garden_maps')
      .insert({
        user_id:    req.user.id,
        garden_id:  gardenId ?? null,
        map_data:   mapData ?? { objects: [], plants: [] },
        north_angle: Number(northAngle) || 0,
      })
      .select('id, map_data, north_angle, garden_id, created_at, updated_at')
      .single();

    if (error) throw error;
    res.status(201).json({ exists: true, ...data });
  } catch (err: any) {
    console.error('[POST /api/map]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/map/:id ────────────────────────────────────────────────────────
mapRouter.patch('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { mapData, northAngle } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (mapData    !== undefined) updates.map_data    = mapData;
    if (northAngle !== undefined) updates.north_angle = Number(northAngle);

    const { data, error } = await db
      .from('garden_maps')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('id, map_data, north_angle, updated_at')
      .single();

    if (error) throw error;
    res.json({ exists: true, ...data });
  } catch (err: any) {
    console.error('[PATCH /api/map/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/map/wizard-status ────────────────────────────────────────────────
mapRouter.get('/wizard-status', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { data: userProfile } = await db
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const tier = userProfile?.subscription_tier ?? 'free';
    const { count, canRun, runsUsed } = await getWizardStatus(userId, tier);

    res.json({ runsUsedThisMonth: runsUsed, limit: count, canRun });
  } catch (err: any) {
    console.error('[GET /api/map/wizard-status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/map/:id/wizard ──────────────────────────────────────────────────
mapRouter.post('/:id/wizard', async (req: any, res) => {
  try {
    const { id: mapId } = req.params;
    const { plantWishlist = [] } = req.body;
    const userId = req.user.id;

    // ── 1. Check tier ────────────────────────────────────────────────────────
    const { data: userProfile } = await db
      .from('users')
      .select('subscription_tier, language_preference')
      .eq('id', userId)
      .single();

    const tier = userProfile?.subscription_tier ?? 'free';
    const { count: limit, canRun, runsUsed } = await getWizardStatus(userId, tier);

    if (!canRun) {
      return res.status(429).json({
        error: 'wizard_limit_exceeded',
        tier,
        limit,
        runsUsedThisMonth: runsUsed,
      });
    }

    // ── 2. Load map ──────────────────────────────────────────────────────────
    const { data: mapRow, error: mapErr } = await db
      .from('garden_maps')
      .select('id, map_data, north_angle, garden_id')
      .eq('id', mapId)
      .eq('user_id', userId)
      .single();

    if (mapErr || !mapRow) return res.status(404).json({ error: 'Map not found' });

    const mapData = mapRow.map_data as { objects: any[]; plants: any[] };
    const northAngle: number = mapRow.north_angle ?? 0;

    // ── 3. Load garden ───────────────────────────────────────────────────────
    const gardenId = mapRow.garden_id;
    let garden: any = null;
    if (gardenId) {
      const { data } = await db
        .from('gardens')
        .select('name, location_region, soil_type')
        .eq('id', gardenId)
        .single();
      garden = data;
    } else {
      const { data } = await db
        .from('gardens')
        .select('name, location_region, soil_type')
        .eq('user_id', userId)
        .limit(1)
        .single();
      garden = data;
    }

    // ── 4. Load today's calendar ─────────────────────────────────────────────
    const today = todayInIsrael();
    const { data: calDay } = await db
      .from('biodynamic_calendar')
      .select('day_type, planting_score, score_colour, ascending_descending, node_active')
      .eq('date', today)
      .single();

    // ── 5. Fetch weather ─────────────────────────────────────────────────────
    const weather = await fetchWeatherForRegion(garden?.location_region ?? null);

    // ── 6. Build Claude prompt ───────────────────────────────────────────────
    const bedObjects = mapData.objects.filter((o: any) => ['bed', 'raised', 'pot'].includes(o.type));
    const treeObjects = mapData.objects.filter((o: any) => o.type === 'tree');
    const fruitTrees = treeObjects.filter((o: any) => o.isFruitTree).map((o: any) => o.fruitTreeName || 'עץ פרי');

    const mapSummary = [
      `${mapData.objects.length} אובייקטים (${bedObjects.length} ערוגות, ${treeObjects.length} עצים)`,
      `${mapData.plants.length} צמחים מסומנים`,
      `צפון: ${northAngle} מעלות`,
      fruitTrees.length > 0 ? `עצי פרי: ${fruitTrees.join(', ')}` : '',
    ].filter(Boolean).join('. ');

    const weatherLine = weather
      ? `מזג אוויר: ${weather.tempCurrent}°C, ${weather.weatherDescriptionHe}, לחות ${weather.humidity}%`
      : '';

    const calLine = calDay
      ? `לוח ביודינמי: סוג יום ${calDay.day_type}, ציון ${calDay.planting_score}/10, ירח ${calDay.ascending_descending === 'ascending' ? 'עולה' : 'יורד'}${calDay.node_active ? ', יום צומת!' : ''}`
      : '';

    const wishlistLine = plantWishlist.length > 0
      ? `הצמחים שהמשתמש רוצה לגדל:\n${plantWishlist.map((p: any) => {
          const name = typeof p === 'string' ? p : p.nameHe;
          const qty  = typeof p === 'object' && p.quantity ? p.quantity : 1;
          return `- ${name} × ${qty}`;
        }).join('\n')}`
      : 'לא צוינה רשימת צמחים מבוקשת';

    const systemPrompt = `אתה מוש לבנה — מומחה גידול ביודינמי ישראלי. אתה מתכנן גינות ומייעץ על שתילה ביודינמית. \
ענה תמיד בעברית בלבד. החזר JSON תקני בלבד — ללא הסברים נוספים, ללא markdown.`;

    const userPrompt = `תכנן לי גינה ביודינמית בהתאם לנתונים הבאים:

גינה: ${garden?.name ?? 'ללא שם'}
אזור: ${garden?.location_region ?? 'לא צוין'}
סוג אדמה: ${garden?.soil_type ?? 'לא צוין'}
${weatherLine}
${calLine}

מפת הגינה: ${mapSummary}
${wishlistLine}

החזר JSON בצורה הבאה בדיוק:
{
  "summary": "סיכום כללי של התכנית",
  "beds": [
    {
      "name": "שם הערוגה",
      "location": "תיאור מיקום בגינה",
      "sunExposure": "שמש מלאה / צל חלקי / צל",
      "plants": [
        {
          "nameHe": "שם עברי",
          "nameEn": "English name",
          "spacing": 30,
          "quantity": 4,
          "plantingTime": "ספטמבר-אוקטובר",
          "notes": "הערות"
        }
      ],
      "notes": "הערות לערוגה"
    }
  ],
  "generalTips": ["טיפ 1", "טיפ 2"],
  "warnings": ["אזהרה 1"],
  "companionNotes": ["הערה על חברים"],
  "wateringAdvice": "עצת השקיה",
  "seasonalNotes": "הערות עונתיות"
}`;

    // ── 7. Call Claude ───────────────────────────────────────────────────────
    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = (aiResponse.content.find(b => b.type === 'text') as any)?.text ?? '{}';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const plan = JSON.parse(cleaned);

    // ── 8. Save to wizard_runs ───────────────────────────────────────────────
    await db.from('wizard_runs').insert({
      user_id:        userId,
      map_id:         mapId,
      plant_wishlist: plantWishlist,
      plan_result:    plan,
    });

    // ── 9. Count usage ───────────────────────────────────────────────────────
    const { runsUsed: newRunsUsed } = await getWizardStatus(userId, tier);

    res.json({ plan, runsUsedThisMonth: newRunsUsed, limit });
  } catch (err: any) {
    console.error('[POST /api/map/:id/wizard]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function getWizardStatus(userId: string, tier: string) {
  const limit = WIZARD_MONTHLY_LIMITS[tier] ?? null;

  if (limit === null) {
    return { count: null, runsUsed: 0, canRun: true };
  }

  const isFree = tier === 'free';
  let query = db
    .from('wizard_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!isFree) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    query = query.gte('created_at', startOfMonth.toISOString());
  }

  const { count } = await query;
  const runsUsed = count ?? 0;
  return { count: limit, runsUsed, canRun: runsUsed < limit };
}
