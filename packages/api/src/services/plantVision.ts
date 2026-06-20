import axios from 'axios';
import sharp from 'sharp';
import { extractAndParseJson } from './jsonUtils';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_HEADERS = {
  'x-api-key': process.env.ANTHROPIC_API_KEY!,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
};

export async function compressImageForClaude(base64: string): Promise<{ data: string; mimeType: 'image/jpeg'; buffer: Buffer }> {
  const buffer = Buffer.from(base64, 'base64');
  const compressed = await sharp(buffer)
    .resize(1568, 1568, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  if (compressed.length > 4.5 * 1024 * 1024) {
    const err: any = new Error('image_too_large');
    err.code = 'image_too_large';
    throw err;
  }
  return { data: compressed.toString('base64'), mimeType: 'image/jpeg', buffer: compressed };
}

export interface PlantAnalysis {
  plantIdentified: string;
  plantIdentifiedEn: string;
  identificationConfidence: number;
  confidence: 'high' | 'medium' | 'low';
  growthStage: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'dormant';
  growthStageHe: string;
  growthStageEn: string;
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthHe: string;
  healthEn: string;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    naturalSolution: string;
  }>;
  observations: string;
  immediateActions: string[];
}

export interface GrowingPlan {
  summary: string;
  estimatedHarvestWeeks: number | null;
  steps: Array<{
    week: number;
    title: string;
    actions: string[];
    biodynamicTip: string;
    preparations: string[];
  }>;
  wateringSchedule: {
    frequencyDays: number;
    amountDescription: string;
    specialNotes: string;
  };
  fertilising: {
    compostAmount: string;
    timing: string;
    preparations: string[];
  };
  pestPrevention: string[];
  naturalFertilizers: string[];
}

export interface TrackerTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  due_in_days: number;
}

export interface AnalysisContext {
  plantNameHint?: string;
  locationType: string;
  locationDescription?: string;
  gardenSoilType?: string;
  gardenRegion?: string;
  previousAnalysis?: PlantAnalysis;
  previousCheckinDate?: string;
  todayCalendar?: any;
  weather?: any;
}

function buildVisionSystemPrompt(context: AnalysisContext): string {
  const locationTypeMap: Record<string, string> = {
    garden: 'גינה',
    pot: 'עציץ',
    balcony: 'מרפסת',
    greenhouse: 'חממה',
    other: 'אחר',
  };
  const locationHe = locationTypeMap[context.locationType] ?? context.locationType;

  let prompt = `אתה צ'ופצ'ו — מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
אתה מנתח תמונות צמחים ומספק אבחון מקצועי ותכנית גידול ביודינמית מותאמת אישית.
לעולם לא ממליץ על כימיקלים סינתטיים — רק פתרונות טבעיים וביודינמיים.
תמיד כולל הצהרת אחריות שהניתוח אינו מחליף יועץ מקצועי.

## ידע ביודינמי מקצועי

**פרפרט 500 (גיר):** 10.7 גרם ל-4 ליטר מים חמים (35°), דינמיזציה שעה, 5-7 ליטר למ"ר. מיישמים אחה"צ ביום זריעה/שתילה.
**פרפרט 501 (צורן):** 0.29 גרם ל-4 ליטר, יישום בבוקר. לנבטים עם 2-3 עלים אמיתיים, 3 יישומים בהפרש שבוע.
**פרפרט 508 (שבטבט):** מניעת פטריות ומחלות. 12 גרם ל-1 ליטר, השריה לילה, הרתחה + 3 שעות. מדללים ל-0.3%, יישום אחה"צ.
**קומפוסט:** 2/3 צואת בעלי חיים + 1/3 חומר צמחי. לחות 40-60%. 5-15 ליטר למ"ר בסתיו.
**גיזום:** לא גוזמים עץ עם פרחים/פירות. תמיד מעל פיצול ענף, בזווית. משחת גזעים על הגדם.

**לוח ביודינמי לישראל:**
- ספטמבר: שתילה שבועיים לפני שוויון סתיו
- עד אמצע דצמבר: ניתן לשתול צמחי חורף
- מאמצע פברואר: חזרה לשתילת חורף
- קיץ: שבועיים לפני שוויון אביב (21.3), עד אמצע אפריל
- חצילים, בטטה, שעועית: רק אחרי מאי

## הקשר הגינה

- סוג מיקום: ${locationHe}`;

  if (context.locationDescription) {
    prompt += `\n- תיאור מיקום: ${context.locationDescription}`;
  }
  if (context.gardenSoilType) {
    prompt += `\n- סוג אדמה: ${context.gardenSoilType}`;
  }
  if (context.gardenRegion) {
    prompt += `\n- אזור: ${context.gardenRegion}`;
  }

  // Calendar data
  const cal = context.todayCalendar;
  if (cal) {
    const directionHe = cal.ascendingDescending === 'descending' ? 'יורד' : 'עולה';
    const nodeStr = cal.nodeActive ? 'כן — יום מנוחה' : 'לא';
    const prep500Str = cal.prep500Recommended ? 'כן' : 'לא';
    const prep501Str = cal.prep501Recommended ? 'כן' : 'לא';
    prompt += `

## מידע ביודינמי להיום
- כיוון הירח: ${cal.ascendingDescending} (${directionHe})
- צומת: ${nodeStr}
- סוג יום: ${cal.dayType}
- מזל הירח: ${cal.moonSign}
- ציון זריעה: ${cal.plantingScore}/10 (${cal.scoreColour})
- פרפרט 500 מומלץ: ${prep500Str}
- פרפרט 501 מומלץ: ${prep501Str}
- ירח בפריגיאה: ${cal.perigeeActive ? 'כן' : 'לא'}`;
  }

  // Weather data
  const w = context.weather;
  if (w) {
    prompt += `

## מזג אוויר באזור ${w.locationRegion}
- טמפרטורה: ${w.tempCurrent}°C (מקס ${w.tempMax}°C, מינ ${w.tempMin}°C)
- ${w.weatherDescriptionHe}
- לחות: ${w.humidity}%
- רוח: ${w.windSpeed} קמ"ש
- UV: ${w.uvIndex}
- גשם היום: ${w.willRainToday ? 'כן' : 'לא'}`;
  }

  // Previous analysis context
  if (context.previousAnalysis && context.previousCheckinDate) {
    prompt += `

## בדיקה קודמת (${context.previousCheckinDate})
- שם הצמח: ${context.previousAnalysis.plantIdentified}
- שלב גדילה: ${context.previousAnalysis.growthStageHe}
- בריאות: ${context.previousAnalysis.healthHe}
- בעיות שנמצאו: ${context.previousAnalysis.issues.map(i => i.type).join(', ') || 'אין'}

השווה את הבדיקה הנוכחית לבדיקה הקודמת: האם הצמח גדל? האם הבריאות השתפרה או הידרדרה? האם הבעיות שטופלו?`;
  }

  prompt += `

## הוראות לניתוח
ענה ONLY ב-JSON תקין בלבד. אל תוסיף שום טקסט לפני או אחרי ה-JSON.
אסור בהחלט לעטוף את התשובה ב-markdown code fences (כגון \`\`\`json או \`\`\`). החזר JSON גולמי בלבד — התו הראשון חייב להיות { והתו האחרון }.
IMPORTANT: Return raw JSON only. No markdown, no code fences, no explanation. First character must be { and last character must be }.
הצהרת אחריות: כלול בשדה observations הצהרה שהניתוח אינו מחליף ייעוץ מקצועי של אגרונום.`;

  return prompt;
}


export async function analyzePlantImage(
  imageBase64: string,
  mimeType: string,
  context: AnalysisContext,
  preCompressed?: { data: string; mimeType: 'image/jpeg' }
): Promise<{ analysis: PlantAnalysis; growingPlan: GrowingPlan; tasks: TrackerTask[] }> {
  const systemPrompt = buildVisionSystemPrompt(context);

  // Use pre-compressed data if provided (avoids double compression when caller already compressed)
  const { data: compressedImage, mimeType: compressedMimeType } = preCompressed
    ?? await compressImageForClaude(imageBase64);

  const UNKNOWN_HINTS = /^\s*(don'?t know|לא יודע|unknown|לא ידוע|אין מושג|לא זוהה|)\s*$/i;
  const isUnknownHint = !context.plantNameHint || UNKNOWN_HINTS.test(context.plantNameHint);
  const hint = isUnknownHint
    ? ''
    : ` (רמז: ייתכן שזה ${context.plantNameHint})`;
  const identifyInstruction = isUnknownHint
    ? `\nזיהוי צמח — חובה לבצע את השלבים הבאים לפני כל מסקנה:

⚠️ אזהרה: אל תזהה לפי "מה נפוץ בגינות" — זהה לפי מה שאתה רואה בתמונה בפועל.

שלב 1 — תאר בדיוק מה אתה רואה (לפני כל זיהוי):
- צורת העלים/הגרגרים: עגול? שטוח? ארוך? מחוטי? בשרני?
- האם יש גבעול נראה לעין, או שהגרגרים/עלים יושבים ישירות על ענפים?
- האם הצמח זוחל/תלוי, זקוף, או שכוב על האדמה?
- גודל הגרגרים/עלים: קטנים (>1 ס"מ), בינוניים, גדולים?
- צבע: ירוק בהיר? כהה? כחלחל? אפרפר?
- סוג המיכל: עציץ בית? אדנית? שדה?

שלב 2 — השווה לאפשרויות:
אם אתה רואה גרגרים עגולים קטנים על ענפים דקים תלויים בעציץ:
→ כנראה String of Pearls (מחרוזת פנינים) — סוקולנט, לא ירק!
→ גרגרי אפונה גדלים על שיחים זקופים עם קנוקנות, לא בעציץ תלוי

שלב 3 — בדוק את הקונטקסט:
- עציץ בבית/מרפסת → סביר יותר: סוקולנט, צמח בית, עשב תיבול
- שדה/גינה פתוחה → סביר יותר: ירק, עץ פרי
- אדמה חשופה עם שתילים קטנים → שתילים צעירים

שלב 4 — רק אחרי שלבים 1-3, קבע זיהוי סופי עם רמת ביטחון (0-100%).
אם רמת הביטחון < 70%, ציין שני מועמדים בשדה plantIdentified.`
    : '';

  const userMessage = `נתח את הצמח בתמונה${hint}.${identifyInstruction}

החזר JSON תקין בלבד בפורמט הבא, ללא שום טקסט נוסף.
// Single source of truth for all enum constraints:
// confidence: high | medium | low
// growthStage: seedling | vegetative | flowering | fruiting | dormant
// health: excellent | good | fair | poor | critical
// severity: low | medium | high
// priority: high | medium | low

{
  "analysis": {
    "plantIdentified": "שם עברי של הצמח",
    "plantIdentifiedEn": "English plant name",
    "identificationConfidence": 85,
    "confidence": "high",
    "growthStage": "vegetative",
    "growthStageHe": "צמיחה וגטטיבית",
    "health": "good",
    "healthHe": "טוב",
    "issues": [
      {
        "type": "שם הבעיה",
        "severity": "low",
        "description": "תיאור הבעיה בעברית",
        "naturalSolution": "פתרון טבעי ביודינמי בעברית"
      }
    ],
    "observations": "תצפיות כלליות ומקיפות בעברית, כולל הצהרת אחריות",
    "immediateActions": ["פעולה ראשונה שצריך לעשות עכשיו", "פעולה שנייה"]
  },
  "growingPlan": {
    "summary": "סיכום תכנית הגידול בעברית — מה הצמח צריך כדי לפרוח",
    "estimatedHarvestWeeks": 8,
    "steps": [
      {
        "week": 1,
        "title": "כותרת שלב ראשון",
        "actions": ["פעולה 1", "פעולה 2"],
        "biodynamicTip": "טיפ ביודינמי ספציפי לשבוע זה בהתאם ללוח",
        "preparations": ["500"]
      }
    ],
    "wateringSchedule": {
      "frequencyDays": 3,
      "amountDescription": "תיאור כמות ההשקיה המומלצת",
      "specialNotes": "הערות מיוחדות להשקיה"
    },
    "fertilising": {
      "compostAmount": "כמות קומפוסט מומלצת",
      "timing": "תזמון הדשנה אופטימלי",
      "preparations": ["500"]
    },
    "pestPrevention": ["טיפ מניעת מזיקים 1", "טיפ 2"],
    "naturalFertilizers": ["מחזק/דשן טבעי 1", "מחזק 2"]
  },
  "tasks": [
    {
      "title": "כותרת משימה קצרה בעברית",
      "description": "מה לעשות ולמה, בעברית",
      "priority": "high",
      "due_in_days": 1
    }
  ]
}

הוראות ל-tasks: צור 2-5 משימות קונקרטיות לביצוע בגינה המבוססות ישירות על ממצאי הניתוח.
כל משימה צריכה להיות פעולה ספציפית (השקיה, דישון, גיזום, טיפול במזיקים, כוונון שמש/צל, העתקה לעציץ גדול יותר וכו').
due_in_days: מתי לבצע את המשימה (1-14 ימים). priority: high=דחוף/נדרש עכשיו, medium=השבוע, low=בשבועיים הקרובים.`;

  const response = (await axios.post(ANTHROPIC_URL, {
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: compressedMimeType,
              data: compressedImage,
            },
          },
          { type: 'text', text: userMessage },
        ],
      },
    ],
  }, { headers: ANTHROPIC_HEADERS, timeout: 90000 })).data;

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = extractAndParseJson(textBlock.text);

  if (!parsed.analysis || !parsed.growingPlan) {
    throw new Error('Invalid response structure: missing analysis or growingPlan');
  }

  // Ensure arrays exist
  parsed.analysis.issues = parsed.analysis.issues ?? [];
  parsed.analysis.immediateActions = parsed.analysis.immediateActions ?? [];

  // Single source of truth for all enum constraints
  const VALID_GROWTH_STAGES = new Set(['seedling', 'vegetative', 'flowering', 'fruiting', 'dormant']);
  if (!VALID_GROWTH_STAGES.has(parsed.analysis.growthStage)) {
    console.warn(`[plantVision] Unexpected growthStage "${parsed.analysis.growthStage}" — falling back to "vegetative"`);
    parsed.analysis.growthStage = 'vegetative';
  }

  const VALID_HEALTH = new Set(['excellent', 'good', 'fair', 'poor', 'critical']);
  if (!VALID_HEALTH.has(parsed.analysis.health)) {
    console.warn(`[plantVision] Unexpected health "${parsed.analysis.health}" — falling back to "good"`);
    parsed.analysis.health = 'good';
  }

  // Add English translations for growth stage and health
  const STAGE_MAP: Record<string, string> = {
    'שתיל צעיר': 'Young seedling',
    'שתיל': 'Seedling',
    'צמיחה': 'Growing',
    'צמיחה וגטטיבית': 'Vegetative growth',
    'צמח בוגר': 'Mature plant',
    'בוגר': 'Mature',
    'פריחה': 'Flowering',
    'פירות': 'Fruiting',
    'רדום': 'Dormant',
    'נבט': 'Sprout',
    'זרע': 'Seed',
    'קציר': 'Harvest',
  };
  const HEALTH_MAP: Record<string, string> = {
    'מצוין': 'Excellent',
    'טוב': 'Good',
    'סביר': 'Fair',
    'גרוע': 'Poor',
  };
  parsed.analysis.growthStageEn = STAGE_MAP[parsed.analysis.growthStageHe] ?? parsed.analysis.growthStageHe;
  parsed.analysis.healthEn = HEALTH_MAP[parsed.analysis.healthHe] ?? parsed.analysis.health;
  parsed.growingPlan.steps = parsed.growingPlan.steps ?? [];
  parsed.growingPlan.pestPrevention = parsed.growingPlan.pestPrevention ?? [];
  parsed.growingPlan.naturalFertilizers = parsed.growingPlan.naturalFertilizers ?? [];
  const tasks: TrackerTask[] = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
    .slice(0, 7)
    .map((t: any, i: number) => {
      const rawTitle = t.title ? String(t.title).trim() : '';
      return {
        title: rawTitle && rawTitle !== 'undefined' ? rawTitle : `משימה ${i + 1}`,
        description: t.description ? String(t.description) : '',
        priority: (['high', 'medium', 'low'] as const).includes(t.priority) ? t.priority : 'medium',
        due_in_days: Math.max(1, Math.min(30, Number(t.due_in_days) || 3)),
      };
    });

  return {
    analysis: parsed.analysis as PlantAnalysis,
    growingPlan: parsed.growingPlan as GrowingPlan,
    tasks,
  };
}
