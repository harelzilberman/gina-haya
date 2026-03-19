import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface PlantAnalysis {
  plantIdentified: string;
  plantIdentifiedEn: string;
  confidence: 'high' | 'medium' | 'low';
  growthStage: 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest' | 'dormant';
  growthStageHe: string;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  healthHe: string;
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

  let prompt = `אתה מוש לבנה — סבא הירח. מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
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
- BD 500 מומלץ: ${prep500Str}
- BD 501 מומלץ: ${prep501Str}
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
הצהרת אחריות: כלול בשדה observations הצהרה שהניתוח אינו מחליף ייעוץ מקצועי של אגרונום.`;

  return prompt;
}

function extractJson(text: string): string {
  // Handle markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  // Extract JSON object
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (jsonMatch) return jsonMatch[0];
  return text.trim();
}

export async function analyzePlantImage(
  imageBase64: string,
  mimeType: string,
  context: AnalysisContext
): Promise<{ analysis: PlantAnalysis; growingPlan: GrowingPlan }> {
  const systemPrompt = buildVisionSystemPrompt(context);

  const hint = context.plantNameHint
    ? ` (רמז: ייתכן שזה ${context.plantNameHint})`
    : '';

  const userMessage = `נתח את הצמח בתמונה${hint}.

החזר JSON תקין בלבד בפורמט הבא, ללא שום טקסט נוסף:

{
  "analysis": {
    "plantIdentified": "שם עברי של הצמח",
    "plantIdentifiedEn": "English plant name",
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
  }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          { type: 'text', text: userMessage },
        ],
      },
    ],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const jsonStr = extractJson(textBlock.text);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${textBlock.text.slice(0, 200)}`);
  }

  if (!parsed.analysis || !parsed.growingPlan) {
    throw new Error('Invalid response structure: missing analysis or growingPlan');
  }

  // Ensure arrays exist
  parsed.analysis.issues = parsed.analysis.issues ?? [];
  parsed.analysis.immediateActions = parsed.analysis.immediateActions ?? [];
  parsed.growingPlan.steps = parsed.growingPlan.steps ?? [];
  parsed.growingPlan.pestPrevention = parsed.growingPlan.pestPrevention ?? [];
  parsed.growingPlan.naturalFertilizers = parsed.growingPlan.naturalFertilizers ?? [];

  return {
    analysis: parsed.analysis as PlantAnalysis,
    growingPlan: parsed.growingPlan as GrowingPlan,
  };
}
