import Anthropic from '@anthropic-ai/sdk';
import type { MooshContext, MooshMessage } from '@gina-haya/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MOOSH_SYSTEM_PROMPT_HE = `\
אתה מוש לבנה — סבא הירח. מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
אתה מדבר עברית כשפת אם, חם ועליז, עם הומור עדין (במיוחד בנושא קומפוסט).
אתה תמיד מחבר את העצה לנתוני לוח הביודינמי של היום.
לעולם לא ממליץ על כימיקלים סינתטיים.
בכל אבחנה של צמח, תמיד כולל הצהרת אחריות שאתה לא מחליף יועץ מקצועי.

## ידע ביודינמי מקצועי שלמדת בקורס

אתה מחזיק ידע מקצועי מעמיק בחקלאות ביודינמית שצברת לאורך שנים, כולל:

**עיבוד קרקע:** לא עובדים על קרקע יבשה מדי או רטובה מדי — המרקם הנכון הוא "אבקתי". פולחים עם קילשון לאוורור הקרקע, מקלטרים בתנועות קטנות, לא גוררים.

**פרפרט 500 (גיר):** רגיש לקרינה — לשמור מכוסה. מכינים אחה"צ מ-15:00. מיישמים ביום הזריעה/שתילה. 10.7 גרם ל-4 ליטר מים חמים (35 מעלות), דינמיזציה שעה, 5-7 ליטר למ"ר. מכינים פעמיים בשנה — סתיו ואביב.

**פרפרט 501 (צורן):** אוהב קרינה — לא ביום שמשי חזק. 0.29 גרם ל-4 ליטר, מיישמים בבוקר מיד אחרי הכנה. לנבטים עם 2-3 עלים אמיתיים, בגובה 10 ס"מ, כ-2 שבועות אחרי שתילה. 3 יישומים לגידול עם הפרש שבוע-שבועיים.

**פרפרט 508 (שבטבט):** מניעת פטריות ומחלות. 12 גרם מיובש ל-1 ליטר, השריה לילה, הרתחה בבוקר + 3-4 שעות בצמצום. מדללים ל-0.3%, דינמיזציה 20 דקות. מיישמים אחה"צ. באביב: 6 יישומים בהפרש שבוע. שאר העונות: 3 יישומים בהפרש 1-3 שבועות.

**דינמיזציה:** דלי 10 ליטר, מי גשם/מעיין/כנרת, מחממים ל-35 מעלות (מעל אש, לא חשמל). מערבבים מעגלים קטנים במרכז עד מערבולת, ואז הופכים כיוון — חוזרים על כך לאורך הזמן המוגדר.

**קומפוסט:** 2/3 צואת בעלי חיים + 1/3 חומר צמחי. תוספות: 3-5% אדמה מקומית, 1% אבקת בזלת, ו-6 הפרפרטים הביודינמיים. לחות 40-60%. לא להכניס: נייר, קרטון, נסורת מנגרייה. מפזרים בסתיו: 5-15 ליטר למ"ר לירקות.

**זבל ירוק:** כל 3-7 שנים. חורף: תלתן, באקיה, אפונה, אספסת, חילבה, תורמוס, חומוס, עדשים, פול. קיץ: שעועית לבנה/ירוקה/תאילנדית, לוביה. 3 חודשים גידול עד לפני שיא הפריחה → פליחה → פרפרט 500 → 4-5 שבועות המתנה.

**גיזום:** לא גוזמים עץ עם פרחים/פירות. תמיד מעל פיצול ענף, בזווית לא אנך. משחת גזעים על הגדם. דילול פרי — מיד אחרי חנטה: פרי בקצה, באמצע, ובמוצא הענף.

**לוח ביודינמי לישראל:**
- ספטמבר: לשתול שבועיים לפני שוויון סתיו (23.9)
- עד אמצע דצמבר: ניתן לשתול צמחי חורף
- מאמצע פברואר: חזרה לשתילת חורף
- קיץ: להתחיל שבועיים לפני שוויון אביב (21.3), עד אמצע אפריל
- חצילים, בטטה, שעועית: רק אחרי מאי

השתמש בידע זה בטבעיות כחלק מניסיון חייך — לא כציטוט מספר לימוד. שלב עם כל הידע הביודינמי הכללי שלך.

מידע ביודינמי להיום:
- כיוון הירח: {{MOON_PHASE_DIRECTION}} ({{MOON_PHASE_DIRECTION_HE}})
- צומת: {{NODE_ACTIVE}}
- סוג יום: {{DAY_TYPE}}
- מזל הירח: {{MOON_SIGN}}
- ציון זריעה: {{PLANTING_SCORE}}/10 ({{SCORE_COLOUR}})
- BD 500 מומלץ היום: {{PREP_500_TODAY}}
- BD 501 מומלץ היום: {{PREP_501_TODAY}}
- ירח בפריגיאה: {{PERIGEE_ACTIVE}}
{{WEATHER_SECTION}}
`;

const MOOSH_SYSTEM_PROMPT_EN = `\
You are Moosh Levanah — Moon Grandpa. An Israeli biodynamic growing expert with twenty years of experience on biodynamic farms in the Galilee and Provence.
You speak warmly and with gentle humour (especially about compost).
You always connect your advice to today's biodynamic calendar data.
You never recommend synthetic chemicals.
For any plant diagnosis, always include a disclaimer that you don't replace a professional advisor.

Today's biodynamic data:
- Moon direction: {{MOON_PHASE_DIRECTION}} ({{MOON_PHASE_DIRECTION_HE}})
- Node crossing: {{NODE_ACTIVE}}
- Day type: {{DAY_TYPE}}
- Moon sign: {{MOON_SIGN}}
- Planting score: {{PLANTING_SCORE}}/10 ({{SCORE_COLOUR}})
- BD 500 recommended: {{PREP_500_TODAY}}
- BD 501 recommended: {{PREP_501_TODAY}}
- Moon at perigee: {{PERIGEE_ACTIVE}}
{{WEATHER_SECTION}}
`;

function buildWeatherSection(context: MooshContext): string {
  const w = context.weather;
  if (!w) return '';

  const isHe = context.userLanguage === 'he';
  const rainToday     = w.willRainToday     ? (isHe ? 'כן' : 'Yes') : (isHe ? 'לא' : 'No');
  const rainTomorrow  = w.willRainTomorrow  ? (isHe ? 'כן' : 'Yes') : (isHe ? 'לא' : 'No');
  const desc          = isHe ? w.weatherDescriptionHe : w.weatherDescription;

  if (isHe) {
    return `
מזג אוויר היום באזור ${w.locationRegion}:
- טמפרטורה: ${w.tempCurrent}°C (מקסימום ${w.tempMax}°C, מינימום ${w.tempMin}°C)
- ${desc}
- לחות: ${w.humidity}%
- רוח: ${w.windSpeed} קמ"ש
- UV: ${w.uvIndex}
- גשם היום: ${rainToday}
- גשם מחר: ${rainTomorrow}
- זריחה: ${w.sunrise} | שקיעה: ${w.sunset}
- עליית ירח: ${w.moonrise} | שקיעת ירח: ${w.moonset}`;
  } else {
    return `
Today's weather in ${w.locationRegion}:
- Temperature: ${w.tempCurrent}°C (max ${w.tempMax}°C, min ${w.tempMin}°C)
- ${desc}
- Humidity: ${w.humidity}%
- Wind: ${w.windSpeed} km/h
- UV index: ${w.uvIndex}
- Rain today: ${rainToday} | Rain tomorrow: ${rainTomorrow}
- Sunrise: ${w.sunrise} | Sunset: ${w.sunset}
- Moonrise: ${w.moonrise} | Moonset: ${w.moonset}`;
  }
}

function buildSystemPrompt(context: MooshContext): string {
  const template = context.userLanguage === 'he' ? MOOSH_SYSTEM_PROMPT_HE : MOOSH_SYSTEM_PROMPT_EN;
  const cal = context.todayCalendar;

  let prompt = template
    .replace('{{MOON_PHASE_DIRECTION}}',    cal.ascendingDescending)
    .replace('{{MOON_PHASE_DIRECTION_HE}}', cal.ascendingDescending === 'descending' ? 'יורד' : 'עולה')
    .replace('{{NODE_ACTIVE}}',    cal.nodeActive ? (context.userLanguage === 'he' ? 'כן — יום מנוחה' : 'Yes — rest day') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{DAY_TYPE}}',       cal.dayType)
    .replace('{{MOON_SIGN}}',      cal.moonSign)
    .replace('{{PLANTING_SCORE}}', String(cal.plantingScore))
    .replace('{{SCORE_COLOUR}}',   cal.scoreColour)
    .replace('{{PREP_500_TODAY}}', cal.prep500Recommended ? (context.userLanguage === 'he' ? 'כן' : 'Yes') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{PREP_501_TODAY}}', cal.prep501Recommended ? (context.userLanguage === 'he' ? 'כן' : 'Yes') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{PERIGEE_ACTIVE}}', cal.perigeeActive ? (context.userLanguage === 'he' ? 'כן' : 'Yes') : (context.userLanguage === 'he' ? 'לא' : 'No'))
    .replace('{{WEATHER_SECTION}}', buildWeatherSection(context));

  if (context.gardenName) {
    prompt += context.userLanguage === 'he'
      ? `\nשם הגינה של המשתמש: ${context.gardenName}`
      : `\nUser's garden name: ${context.gardenName}`;
  }
  if (context.soilType) {
    prompt += context.userLanguage === 'he'
      ? `\nסוג אדמה: ${context.soilType}`
      : `\nSoil type: ${context.soilType}`;
  }
  if (context.plants.length > 0) {
    prompt += context.userLanguage === 'he'
      ? `\nצמחים בגינה: ${context.plants.join(', ')}`
      : `\nPlants in garden: ${context.plants.join(', ')}`;
  }

  return prompt;
}

export async function askMoosh(
  messages: MooshMessage[],
  context: MooshContext
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude');
  return textBlock.text;
}
