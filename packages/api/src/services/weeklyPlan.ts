import Anthropic from '@anthropic-ai/sdk';
import type { BiodynamicDay } from '@gina-haya/shared';
import type { WeatherData } from './weather';
import { extractJson } from './jsonUtils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface DayPlan {
  date: string;
  dateHe: string;
  dayOfWeek: string;
  dayType: string;
  dayTypeHe: string;
  dayTypeEmoji: string;
  plantingScore: number;
  scoreColour: string;
  nodeActive: boolean;
  moonDirection: string;
  moonDirectionHe: string;
  prep500: boolean;
  prep501: boolean;
  recommendedActions: string[];
  recommendedPlants: string[];
  avoidActions: string[];
  chupChuTip: string;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  weekSummary: string;
  bestDayForPlanting: string;
  bestDayForHarvest: string;
  days: DayPlan[];
  gardenTasks: string[];
  weatherSummary: string;
}

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatHeDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function hebrewDayOfWeek(dateStr: string): string {
  return HE_DAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

const DAY_TYPE_EMOJI: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

export async function generateWeeklyPlan(
  userId: string,
  garden: any,
  calendarDays: BiodynamicDay[],
  weather: WeatherData | null,
  language: 'he' | 'en' = 'he'
): Promise<WeeklyPlan> {
  const weekStart = calendarDays[0].date;
  const weekEnd   = calendarDays[calendarDays.length - 1].date;

  const plants = (garden?.plants ?? [])
    .map((p: any) => p.commonNameHe ?? p.common_name_he)
    .filter(Boolean);

  const soilType       = garden?.soilType ?? garden?.soil_type ?? 'לא ידוע';
  const locationRegion = garden?.locationRegion ?? garden?.location_region
    ?? weather?.locationRegion ?? 'ישראל';

  const weatherStr = weather
    ? `${weather.weatherDescriptionHe}, ${weather.tempMin}–${weather.tempMax}°C, לחות ${weather.humidity}%, רוח ${weather.windSpeed} קמ"ש`
    : 'נתוני מזג אוויר לא זמינים';

  const daysJson = calendarDays.map(d => ({
    date:                d.date,
    dayType:             d.dayType,
    dayTypeHe:           d.dayTypeHe,
    plantingScore:       d.plantingScore,
    scoreColour:         d.scoreColour,
    nodeActive:          d.nodeActive,
    ascendingDescending: d.ascendingDescending,
    ascendingDescendingHe: (d as any).ascendingDescendingHe ?? (d.ascendingDescending === 'ascending' ? 'עולה' : 'יורד'),
    moonSign:            d.moonSign,
    moonSignHe:          d.moonSignHe,
    prep500Recommended:  d.prep500Recommended,
    prep501Recommended:  d.prep501Recommended,
    perigeeActive:       d.perigeeActive,
  }));

  const isEn = language === 'en';

  const userPrompt = isEn
    ? `Prepare a weekly garden plan:

**Garden details:**
- Name: ${garden?.name ?? 'My Garden'}
- Location: ${locationRegion}
- Soil type: ${soilType}
- Plants in garden: ${plants.length > 0 ? plants.join(', ') : 'not specified'}

**Weekly weather:**
${weatherStr}

**Biodynamic calendar data (${weekStart} to ${weekEnd}):**
${JSON.stringify(daysJson, null, 2)}

Return JSON in exactly this format with no extra text:

{
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "weekSummary": "General description of the week (2-3 sentences in English)",
  "bestDayForPlanting": "YYYY-MM-DD",
  "bestDayForHarvest": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dateHe": "date in Hebrew",
      "dayOfWeek": "Hebrew day name",
      "dayType": "fruit/root/flower/leaf",
      "dayTypeHe": "Hebrew day type name",
      "dayTypeEmoji": "emoji",
      "plantingScore": 0,
      "scoreColour": "green/yellow/orange/red/black",
      "nodeActive": false,
      "moonDirection": "ascending/descending",
      "moonDirectionHe": "עולה/יורד",
      "prep500": false,
      "prep501": false,
      "recommendedActions": ["Action 1 in English", "Action 2 in English"],
      "recommendedPlants": ["Plant 1"],
      "avoidActions": [],
      "chupChuTip": "Short personal tip in English (1-2 sentences)"
    }
  ],
  "gardenTasks": ["Task 1 in English", "Task 2 in English", "Task 3 in English"],
  "weatherSummary": "Summary of the weather and its effect on the garden in English"
}

Instructions:
- bestDayForPlanting: day with highest score that is not a node day
- bestDayForHarvest: ascending moon day with score 5 or higher
- recommendedPlants: plants from the garden suitable for the day type; if none — general ones
- On node days: recommendedActions=["Garden rest day"], avoidActions=["sowing","planting","harvesting"]
- chupChuTip: warm, personal, brief (1-2 sentences in English)
- Exactly 7 days in days array, in chronological order`
    : `הכן תכנית שבועית לגינה:

**פרטי הגינה:**
- שם: ${garden?.name ?? 'הגינה שלי'}
- מיקום: ${locationRegion}
- סוג אדמה: ${soilType}
- צמחים בגינה: ${plants.length > 0 ? plants.join(', ') : 'לא צוינו'}

**מזג אוויר השבוע:**
${weatherStr}

**נתוני לוח ביודינמי (${weekStart} עד ${weekEnd}):**
${JSON.stringify(daysJson, null, 2)}

החזר JSON בדיוק בפורמט הבא ללא טקסט נוסף:

{
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "weekSummary": "תיאור כללי של השבוע (2-3 משפטים)",
  "bestDayForPlanting": "YYYY-MM-DD",
  "bestDayForHarvest": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dateHe": "תאריך בעברית",
      "dayOfWeek": "שם היום בעברית",
      "dayType": "fruit/root/flower/leaf",
      "dayTypeHe": "שם סוג היום",
      "dayTypeEmoji": "אמוג'י",
      "plantingScore": 0,
      "scoreColour": "green/yellow/orange/red/black",
      "nodeActive": false,
      "moonDirection": "ascending/descending",
      "moonDirectionHe": "עולה/יורד",
      "prep500": false,
      "prep501": false,
      "recommendedActions": ["פעולה 1", "פעולה 2"],
      "recommendedPlants": ["צמח 1"],
      "avoidActions": [],
      "chupChuTip": "טיפ קצר ואישי של מון"
    }
  ],
  "gardenTasks": ["משימה 1", "משימה 2", "משימה 3"],
  "weatherSummary": "סיכום מזג האוויר והשפעתו על הגינה"
}

הנחיות:
- bestDayForPlanting: יום עם הציון הגבוה ביותר שאינו יום צומת
- bestDayForHarvest: יום ירח עולה עם ציון 5 ומעלה
- recommendedPlants: צמחים מהגינה המתאימים לסוג היום; אם אין — כלליים
- ביום צומת: recommendedActions=["יום מנוחה לגינה"], avoidActions=["זריעה","שתילה","קציר"]
- chupChuTip: חם, אישי, קצר (משפט אחד עד שניים)
- 7 ימים בדיוק ב-days, בסדר כרונולוגי`;

  const systemPrompt = isEn
    ? "You are Chupchu — a biodynamic gardening expert. You prepare personalized weekly garden plans. Respond entirely in English. Return raw JSON only — no markdown, no code fences, no backticks, no explanation before or after. The first character of your response must be { and the last must be }."
    : "אתה צ'ופצ'ו — המומחה הביודינמי שלך. מומחה גידול ביודינמי ישראלי. אתה מכין תכנית שבועית מותאמת אישית. כתוב בעברית. החזר JSON גולמי בלבד — ללא markdown, ללא code fences, ללא backticks, ללא טקסט לפני או אחרי. התו הראשון חייב להיות { והאחרון }.";

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No response from Claude');

  const jsonStr = extractJson(textBlock.text);
  let raw: WeeklyPlan;
  try {
    raw = JSON.parse(jsonStr) as WeeklyPlan;
  } catch {
    throw new Error(`Failed to parse weekly plan JSON: ${textBlock.text.slice(0, 200)}`);
  }

  // Ensure per-day fields are accurate (calendar data is source of truth)
  raw.days = raw.days.map((d, i) => {
    const cal = calendarDays[i];
    return {
      ...d,
      dateHe:      d.dateHe      || formatHeDate(d.date),
      dayOfWeek:   d.dayOfWeek   || hebrewDayOfWeek(d.date),
      dayTypeEmoji: d.dayTypeEmoji || DAY_TYPE_EMOJI[d.dayType] || '🌱',
      nodeActive:  cal?.nodeActive          ?? d.nodeActive,
      prep500:     cal?.prep500Recommended  ?? d.prep500,
      prep501:     cal?.prep501Recommended  ?? d.prep501,
    };
  });

  return raw;
}
