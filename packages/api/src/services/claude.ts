import Anthropic from '@anthropic-ai/sdk';
import type { MooshContext, MooshMessage } from '@gina-haya/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const PLANT_SPACING_KNOWLEDGE = `
מרווחי שתילה נכונים (ס"מ בין צמחים):
עגבנייה: 50ס"מ | פלפל: 50ס"מ | חציל: 50ס"מ | מלפפון: 40ס"מ
קישוא: 50ס"מ | דלעת: 250ס"מ | אבטיח: 50ס"מ | מלון: 40ס"מ
גזר: 1ס"מ (זריעה צפופה) | בצל: 10ס"מ | שום: 15ס"מ | לוף: 10ס"מ
חסה: 30ס"מ | תרד: 4ס"מ | מנגולד: 25ס"מ | סלק: 15ס"מ
ברוקולי: 40ס"מ | כרובית: 40ס"מ | כרוב: 40ס"מ | רוקולה: 0.7ס"מ
בזיליקום: 30ס"מ | שומר: 20ס"מ | פטרוזיליה: 0.75ס"מ | כוסברה: 0.75ס"מ
תות שדה: 25ס"מ | בטטה: 20ס"מ | תירס: 15ס"מ | חמניות: 45ס"מ

זמני שתילה בישראל (חודשים):
עגבנייה/פלפל/חציל: מרץ-יוני | מלפפון/קישוא: פברואר-מרץ
גזר: אוקטובר-יוני | חסה: ספטמבר-יולי | תרד: ספטמבר-מאי
בצל: ספטמבר/נובמבר/פברואר-מרץ | שום: ספטמבר | ברוקולי/כרוב: ספטמבר-פברואר
בטטה: מרץ-יוני | תות שדה: ספטמבר/מרץ
`;

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

## טבלת זמני שתילה ומרווחים (ישראל)
${PLANT_SPACING_KNOWLEDGE}
השתמש בנתונים אלה לייעוץ מדויק על זמני שתילה ומרווחים.

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

function buildHarvestSection(context: MooshContext): string {
  const harvests = context.recentHarvests;
  if (!harvests || harvests.length === 0) return '';

  const isHe = context.userLanguage === 'he';
  const lines = harvests.map(h => {
    const dateParts = h.harvestDate.split('-');
    const dateFormatted = dateParts.length === 3
      ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
      : h.harvestDate;
    const dayTypeHe: Record<string, string> = { fruit: 'יום פרי', root: 'יום שורש', flower: 'יום פרח', leaf: 'יום עלה' };
    const dayLabel = isHe ? (dayTypeHe[h.dayType] ?? h.dayType) : h.dayType;
    return `${h.plantNameHe} — ${dateFormatted} (${dayLabel}, ציון ${h.plantingScore})`;
  });

  return isHe
    ? `\nקציר אחרון של המשתמש:\n${lines.join('\n')}`
    : `\nUser's recent harvests:\n${lines.join('\n')}`;
}

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
    .replace('{{WEATHER_SECTION}}', buildWeatherSection(context) + buildHarvestSection(context));

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

  if (context.gardenMap?.hasMap) {
    const m = context.gardenMap;
    const fruitLine = m.fruitTrees.length > 0 ? `, פרי: ${m.fruitTrees.join(', ')}` : '';
    const plantLine = m.plantNames.length > 0 ? `, צמחים: ${m.plantNames.slice(0, 8).join(', ')}` : '';
    const summary = `${m.bedCount} ערוגות, ${m.treeCount} עצים${fruitLine}, ${m.plantCount} צמחים מסומנים${plantLine}. צפון: ${m.northAngle}°`;
    prompt += context.userLanguage === 'he'
      ? `\nמפת הגינה: ${summary}`
      : `\nGarden map: ${m.bedCount} beds, ${m.treeCount} trees${fruitLine}, ${m.plantCount} plants${plantLine}. North: ${m.northAngle}°`;
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
