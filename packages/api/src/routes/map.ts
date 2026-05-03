import 'dotenv/config';
import { Router, type IRouter } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { fetchWeatherForRegion } from '../services/weather';
import { todayInIsrael } from '@gina-haya/shared';
import { extractJson } from '../services/jsonUtils';

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
    const { gardenId } = req.query as { gardenId?: string };

    let query = db
      .from('garden_maps')
      .select('id, map_data, north_angle, garden_id, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (gardenId) query = (query as any).eq('garden_id', gardenId);

    const { data, error } = await (query as any).single();

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
  console.log('API KEY EXISTS:', !!process.env.ANTHROPIC_API_KEY, '| key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 12));
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
    const GROWING_TYPES = ['bed', 'raised-bed', 'hydroponics', 'aquaponics', 'vertical', 'pot-rect', 'pot-round', 'pergola'];
    const bedObjects = mapData.objects.filter((o: any) => GROWING_TYPES.includes(o.type));
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

    const spacingLine = plantWishlist.length > 0
      ? `\nמרווחי שתילה נכונים לצמחים המבוקשים:\n${plantWishlist.map((p: any) => {
          const name = typeof p === 'string' ? p : p.nameHe;
          const spacings: Record<string, number> = {
            'עגבנייה': 50, 'פלפל': 50, 'חציל': 50, 'מלפפון': 40,
            'קישוא': 50, 'גזר': 10, 'בצל': 10, 'שום': 15,
            'חסה': 30, 'תרד': 15, 'בזיליקום': 30, 'פטרוזיליה': 20,
            'תירס': 15, 'תות שדה': 25, 'בטטה': 20, 'ברוקולי': 40,
            'כרוב': 40, 'כרובית': 40, 'סלק': 15, 'מנגולד': 25,
          };
          const spacing = spacings[name] ?? 30;
          return `- ${name}: ${spacing}ס"מ בין צמחים`;
        }).join('\n')}`
      : '';

    const bedDimensionsLine = bedObjects.length > 0
      ? `\nממדי ערוגות הגידול (השתמש בהם לחישוב מיקום כל צמח):\n${bedObjects.map((o: any) => {
          if (o.shapeKind === 'rect') {
            return `- "${o.label}": x=${o.x?.toFixed(2)}, y=${o.y?.toFixed(2)}, רוחב=${o.width?.toFixed(2)}מ', גובה=${o.height?.toFixed(2)}מ' (x_max=${((o.x ?? 0) + (o.width ?? 0)).toFixed(2)}, y_max=${((o.y ?? 0) + (o.height ?? 0)).toFixed(2)})`;
          }
          if (o.shapeKind === 'circle') {
            return `- "${o.label}": מרכז x=${o.cx?.toFixed(2)}, y=${o.cy?.toFixed(2)}, רדיוס=${o.radius?.toFixed(2)}מ'`;
          }
          return `- "${o.label}": (${o.type})`;
        }).join('\n')}`
      : '';

    const systemPrompt = `אתה מון לבנה — מומחה גידול ביודינמי ישראלי. אתה מתכנן גינות ומייעץ על שתילה ביודינמית. \
ענה תמיד בעברית בלבד. החזר JSON תקני בלבד — ללא הסברים נוספים, ללא markdown.`;

    const objectsLine = mapData.objects.length > 0
      ? `מיקומי האובייקטים על המפה (במטרים מנקודת המוצא):
${mapData.objects.map((obj: any) => {
  if (obj.shapeKind === 'rect') {
    return `- ${obj.label} (${obj.type}): x=${obj.x?.toFixed(1)}, y=${obj.y?.toFixed(1)}, רוחב=${obj.width?.toFixed(1)}מ', גובה=${obj.height?.toFixed(1)}מ'`;
  } else if (obj.shapeKind === 'circle') {
    return `- ${obj.label} (${obj.type}): מרכז x=${obj.cx?.toFixed(1)}, y=${obj.cy?.toFixed(1)}, רדיוס=${obj.radius?.toFixed(1)}מ'`;
  } else if (obj.shapeKind === 'polygon') {
    const xs = (obj.points ?? []).map((p: [number,number]) => p[0]);
    const ys = (obj.points ?? []).map((p: [number,number]) => p[1]);
    const cx = xs.length ? xs.reduce((a: number,b: number)=>a+b,0)/xs.length : 0;
    const cy = ys.length ? ys.reduce((a: number,b: number)=>a+b,0)/ys.length : 0;
    return `- ${obj.label} (${obj.type}): מרכז x=${cx.toFixed(1)}, y=${cy.toFixed(1)}`;
  }
  return '';
}).filter(Boolean).join('\n')}

כיוון צפון: ${northAngle} מעלות
אזורי שמש:
- דרום (שמש מלאה): כיוון ${(northAngle + 180) % 360}°
- מזרח (שמש בוקר): כיוון ${(northAngle + 90) % 360}°
- מערב (שמש אחה״צ): כיוון ${(northAngle + 270) % 360}°
- צפון (צל): כיוון ${northAngle}°`
      : '';

    const userPrompt = `תכנן לי גינה ביודינמית בהתאם לנתונים הבאים:

גינה: ${garden?.name ?? 'ללא שם'}
אזור: ${garden?.location_region ?? 'לא צוין'}
סוג אדמה: ${garden?.soil_type ?? 'לא צוין'}
${weatherLine}
${calLine}

מפת הגינה: ${mapSummary}
${objectsLine}
${wishlistLine}
${spacingLine}
${bedDimensionsLine}

חשוב מאוד: עבור כל צמח שאתה ממליץ, ציין את המיקום המדויק שלו על המפה
בשדות x ו-y (במטרים). המיקום צריך להיות:
1. בתוך האובייקט המתאים (ערוגה/עציץ/אזור גידול) — השתמש בממדים שצוינו למעלה.
2. פרוס צמחים על כל רוחב הערוגה — חשב: x = bed.x + (index / total) * bed.width
3. אל תצבור צמחים בתחילת הערוגה — לכל צמח x שונה לחלוטין.
4. במרחק הנכון מצמחים אחרים (spacingCm/100 מטרים בין מרכז למרכז)
5. מחוץ לאזורי הבית והגדרות
6. מותאם לאזור השמש הנכון לסוג הצמח:
   - צמחי פרי (עגבנייה, פלפל, מלפפון): שמש מלאה → אזור דרומי
   - עלים (חסה, תרד): צל חלקי → אזור צפוני
   - שורשים (גזר, בצל): שמש בינונית
   - תבלינים (בזיליקום, נענע): שמש מלאה עד חלקית

כל צמח חייב x שונה מכל צמח אחר באותה ערוגה.
אם יש N צמחים בערוגה ברוחב W החל מ-x0: צמח i יקבל x = x0 + (i+0.5) * (W/N).

החזר JSON בצורה הבאה בדיוק:
{"summary":"משפט אחד","beds":[{"name":"שם","location":"מיקום","sunExposure":"שמש מלאה","plants":[{"nameHe":"שם","nameEn":"name","spacingCm":50,"quantity":2,"x":5.0,"y":8.0,"plantingTime":"ספט-אוק","bdDayType":"פרי","notes":""}],"notes":""}],"generalTips":["טיפ"],"warnings":[],"companionNotes":[],"wateringAdvice":"","seasonalNotes":""}

חוקים קריטיים לתגובה:
1. החזר JSON תקני בלבד — ללא markdown, ללא backticks, ללא טקסט נוסף לפני או אחרי.
2. כל ערך מחרוזת — עד 40 תווים.
3. השמט שדות אופציונליים ריקים (notes, warnings, companionNotes, wateringAdvice, seasonalNotes) אם אין תוכן.
4. התגובה הכוללת חייבת להיות קצרה מ-3000 טוקן.
5. spacingCm חייב להיות מספר שלם חיובי (כגון 30, 50) — לעולם לא null, לא undefined, לא מחרוזת.`;

    // ── 7. Call Claude ───────────────────────────────────────────────────────
    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = (aiResponse.content.find(b => b.type === 'text') as any)?.text ?? '{}';
    console.log('Wizard response length:', rawText.length, 'tokens approx:', Math.round(rawText.length / 4));
    let plan: any;
    try {
      plan = JSON.parse(extractJson(rawText));
    } catch (e) {
      console.error('JSON parse failed, raw length:', rawText.length, 'last 200 chars:', rawText.slice(-200));
      return res.status(422).json({ error: 'AI response was too long or malformed. Try a simpler garden layout.' });
    }

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
    console.error('[POST /api/map/:id/wizard] FULL ERROR:', err);
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
