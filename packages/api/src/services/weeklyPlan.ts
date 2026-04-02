import Anthropic from '@anthropic-ai/sdk';
import type { BiodynamicDay } from '@gina-haya/shared';
import type { WeatherData } from './weather';

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
  monTip: string;
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
  weather: WeatherData | null
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

  const userPrompt = `הכן תכנית שבועית לגינה:

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
      "monTip": "טיפ קצר ואישי של מון"
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
- monTip: חם, אישי, קצר (משפט אחד עד שניים)
- 7 ימים בדיוק ב-days, בסדר כרונולוגי`;

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system:     'אתה מון לבנה — סבא הירח. מומחה גידול ביודינמי ישראלי. אתה מכין תכנית שבועית מותאמת אישית. כתוב בעברית. החזר JSON תקני בלבד.',
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No response from Claude');

  let jsonText = textBlock.text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();

  const raw = JSON.parse(jsonText) as WeeklyPlan;

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
