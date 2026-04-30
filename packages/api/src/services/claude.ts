import Anthropic from '@anthropic-ai/sdk';
import type { ChupChuContext, ChupChuMessage } from '@gina-haya/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MAX_TOOL_ITERATIONS = 8;

// ── Static knowledge bases ─────────────────────────────────────────────────

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

const BD_PREP_KNOWLEDGE: Record<string, string> = {
  '500': `פרפרט 500 (גיר): רגיש לקרינה — לשמור מכוסה. מכינים אחה"צ מ-15:00. מיישמים ביום הזריעה/שתילה. 10.7 גרם ל-4 ליטר מים חמים (35 מעלות), דינמיזציה שעה, 5-7 ליטר למ"ר. מכינים פעמיים בשנה — סתיו ואביב.`,
  '501': `פרפרט 501 (צורן): אוהב קרינה — לא ביום שמשי חזק. 0.29 גרם ל-4 ליטר, מיישמים בבוקר מיד אחרי הכנה. לנבטים עם 2-3 עלים אמיתיים, בגובה 10 ס"מ, כ-2 שבועות אחרי שתילה. 3 יישומים לגידול עם הפרש שבוע-שבועיים.`,
  '508': `פרפרט 508 (שבטבט): מניעת פטריות ומחלות. 12 גרם מיובש ל-1 ליטר, השריה לילה, הרתחה בבוקר + 3-4 שעות בצמצום. מדללים ל-0.3%, דינמיזציה 20 דקות. מיישמים אחה"צ. באביב: 6 יישומים בהפרש שבוע. שאר העונות: 3 יישומים בהפרש 1-3 שבועות.`,
  compost: `קומפוסט ביודינמי: 2/3 צואת בעלי חיים + 1/3 חומר צמחי. תוספות: 3-5% אדמה מקומית, 1% אבקת בזלת, ו-6 הפרפרטים הביודינמיים. לחות 40-60%. לא להכניס: נייר, קרטון, נסורת מנגרייה. מפזרים בסתיו: 5-15 ליטר למ"ר לירקות.`,
  green_manure: `זבל ירוק: כל 3-7 שנים. חורף: תלתן, באקיה, אפונה, אספסת, חילבה, תורמוס, חומוס, עדשים, פול. קיץ: שעועית לבנה/ירוקה/תאילנדית, לוביה. 3 חודשים גידול עד לפני שיא הפריחה → פליחה → פרפרט 500 → 4-5 שבועות המתנה.`,
};

// ── System prompts ─────────────────────────────────────────────────────────

const MOOSH_SYSTEM_PROMPT_HE = `\
אתה צ'ופצ'ו — סבא הירח. מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
אתה מדבר עברית כשפת אם, חם ועליז, עם הומור עדין (במיוחד בנושא קומפוסט).
אתה תמיד מחבר את העצה לנתוני לוח הביודינמי של היום.
לעולם לא ממליץ על כימיקלים סינתטיים.
בכל אבחנה של צמח, תמיד כולל הצהרת אחריות שאתה לא מחליף יועץ מקצועי.

## ידע ביודינמי מקצועי שלמדת בקורס

**עיבוד קרקע:** לא עובדים על קרקע יבשה מדי או רטובה מדי — המרקם הנכון הוא "אבקתי". פולחים עם קילשון לאוורור הקרקע, מקלטרים בתנועות קטנות, לא גוררים.

**דינמיזציה:** דלי 10 ליטר, מי גשם/מעיין/כנרת, מחממים ל-35 מעלות (מעל אש, לא חשמל). מערבבים מעגלים קטנים במרכז עד מערבולת, ואז הופכים כיוון — חוזרים על כך לאורך הזמן המוגדר.

**גיזום:** לא גוזמים עץ עם פרחים/פירות. תמיד מעל פיצול ענף, בזווית לא אנך. משחת גזעים על הגדם. דילול פרי — מיד אחרי חנטה: פרי בקצה, באמצע, ובמוצא הענף.

**לוח ביודינמי לישראל:**
- ספטמבר: לשתול שבועיים לפני שוויון סתיו (23.9)
- עד אמצע דצמבר: ניתן לשתול צמחי חורף
- מאמצע פברואר: חזרה לשתילת חורף
- קיץ: להתחיל שבועיים לפני שוויון אביב (21.3), עד אמצע אפריל
- חצילים, בטטה, שעועית: רק אחרי מאי

השתמש בידע זה בטבעיות כחלק מניסיון חייך — לא כציטוט מספר לימוד.

## שימון בכלים
כשאתה זקוק למידע ספציפי — נתוני לוח היום, פרטי הגינה, מזג אוויר, מידע על צמח, הוראות פרפרט, או קציר אחרון — השתמש בכלים המתאימים לפני שאתה עונה.
`;

const MOOSH_SYSTEM_PROMPT_EN = `\
You are Chupchu — Moon Grandpa. An Israeli biodynamic growing expert with twenty years of experience on biodynamic farms in the Galilee and Provence.
You speak warmly and with gentle humour (especially about compost — always room for one more layer).
You always connect your advice to today's biodynamic calendar data.
You never recommend synthetic chemicals.
For any plant diagnosis, always include a disclaimer that you are not a substitute for a professional advisor.

## Biodynamic professional knowledge

**Soil cultivation:** Never work soil that is too dry or too wet — the correct texture is "dusty-crumbly". Loosen with a garden fork for aeration, cultivate with small motions, never drag.

**Dynamization:** Use a 10-litre bucket, rain/spring/Sea of Galilee water, warmed to 35°C (over flame, not electric). Stir small circles in the centre until a vortex forms, then reverse direction — repeat throughout the required time.

**Pruning:** Never prune a tree in flower or fruit. Always cut above a branch fork, at an angle not perpendicular. Apply wound paste to the cut. Fruit thinning — immediately after fruit set: keep one fruit at the branch tip, one in the middle, one at the base.

**Biodynamic calendar for Israel:**
- September: plant two weeks before autumn equinox (23 Sep)
- Until mid-December: winter crops can be planted
- From mid-February: return to winter planting
- Summer: start two weeks before spring equinox (21 Mar), until mid-April
- Aubergine, sweet potato, beans: only after May

Draw on this knowledge naturally as part of your lived experience — not as a textbook recitation.

## Tool use
When you need specific information — today's calendar, the user's garden, weather, plant details, prep instructions, or recent harvests — call the appropriate tool before answering.
`;

// ── Tool definitions ───────────────────────────────────────────────────────

const MOOSH_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'get_today_calendar',
    description: "Returns today's biodynamic calendar data: moon direction, node crossing, day type, moon sign, planting score, prep recommendations, perigee status.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_user_garden',
    description: "Returns the user's garden details: name, soil type, location, bed count, tree count, plant list, and garden map summary.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_weather',
    description: "Returns today's weather for the user's region: temperature, humidity, wind, rain today/tomorrow, UV index, sunrise/sunset, moonrise/moonset.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_plant_info',
    description: 'Looks up spacing and planting seasons for a specific plant in Israel. Returns spacing in cm and recommended planting months.',
    input_schema: {
      type: 'object',
      properties: {
        plant_name: { type: 'string', description: 'Plant name in Hebrew or English' },
      },
      required: ['plant_name'],
    },
  },
  {
    name: 'get_bd_prep_info',
    description: 'Returns detailed preparation instructions for a biodynamic preparation.',
    input_schema: {
      type: 'object',
      properties: {
        prep_name: {
          type: 'string',
          enum: ['500', '501', '508', 'compost', 'green_manure'],
          description: 'Which BD preparation to look up',
        },
      },
      required: ['prep_name'],
    },
  },
  {
    name: 'get_recent_harvests',
    description: "Returns the user's recent harvest records: plant name, harvest date, day type, and planting score.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// ── Tool handlers ──────────────────────────────────────────────────────────

function handleToolCall(
  name: string,
  input: Record<string, unknown>,
  context: ChupChuContext,
): string {
  switch (name) {
    case 'get_today_calendar': {
      const cal = context.todayCalendar;
      if (!cal) return 'אין נתוני לוח ביודינמי להיום. ענה על סמך עקרונות כלליים בלבד.';
      return JSON.stringify({
        ascendingDescending: cal.ascendingDescending,
        nodeActive: cal.nodeActive,
        dayType: cal.dayType,
        moonSign: cal.moonSign,
        plantingScore: cal.plantingScore,
        scoreColour: cal.scoreColour,
        prep500Recommended: cal.prep500Recommended,
        prep501Recommended: cal.prep501Recommended,
        perigeeActive: cal.perigeeActive,
      }, null, 2);
    }

    case 'get_user_garden': {
      const m = context.gardenMap;
      const result: Record<string, unknown> = {
        gardenName: context.gardenName ?? null,
        soilType: context.soilType ?? null,
        plants: context.plants,
      };
      if (m?.hasMap) {
        result.map = {
          bedCount: m.bedCount,
          treeCount: m.treeCount,
          plantCount: m.plantCount,
          fruitTrees: m.fruitTrees,
          plantNames: m.plantNames,
          northAngle: m.northAngle,
        };
      }
      return JSON.stringify(result, null, 2);
    }

    case 'get_weather': {
      const w = context.weather;
      if (!w) return 'No weather data available.';
      return JSON.stringify({
        locationRegion: w.locationRegion,
        tempCurrent: w.tempCurrent,
        tempMax: w.tempMax,
        tempMin: w.tempMin,
        weatherDescription: w.weatherDescription,
        weatherDescriptionHe: w.weatherDescriptionHe,
        humidity: w.humidity,
        windSpeed: w.windSpeed,
        uvIndex: w.uvIndex,
        willRainToday: w.willRainToday,
        willRainTomorrow: w.willRainTomorrow,
        sunrise: w.sunrise,
        sunset: w.sunset,
        moonrise: w.moonrise,
        moonset: w.moonset,
      }, null, 2);
    }

    case 'get_plant_info': {
      const plantName = String(input.plant_name ?? '').trim();
      const lines = PLANT_SPACING_KNOWLEDGE.split('\n').filter(l => l.includes(plantName));
      if (lines.length === 0) {
        return `הצמח "${plantName}" אינו נמצא בבסיס הנתונים שלנו עדיין.`;
      }
      return lines.join('\n');
    }

    case 'get_bd_prep_info': {
      const prepName = String(input.prep_name ?? '');
      const info = BD_PREP_KNOWLEDGE[prepName];
      if (!info) return `לא נמצא מידע על פרפרט "${prepName}".`;
      return info;
    }

    case 'get_recent_harvests': {
      const harvests = context.recentHarvests;
      if (!harvests || harvests.length === 0) return 'No recent harvests recorded.';
      const lines = harvests.map(h => {
        const dateParts = h.harvestDate.split('-');
        const dateFormatted = dateParts.length === 3
          ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
          : h.harvestDate;
        return `${h.plantNameHe} — ${dateFormatted} (${h.dayType}, ציון ${h.plantingScore})`;
      });
      return lines.join('\n');
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Agentic loop ───────────────────────────────────────────────────────────

export async function askChupChu(
  messages: ChupChuMessage[],
  context: ChupChuContext,
  extraSystemContext?: string,
): Promise<string> {
  const basePrompt = context.userLanguage === 'he'
    ? MOOSH_SYSTEM_PROMPT_HE
    : MOOSH_SYSTEM_PROMPT_EN;
  const systemPrompt = extraSystemContext ? basePrompt + extraSystemContext : basePrompt;

  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: MOOSH_TOOLS,
      messages: apiMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude');
      return textBlock.text;
    }

    if (response.stop_reason === 'tool_use') {
      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        .map(b => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: handleToolCall(b.name, b.input as Record<string, unknown>, context),
        }));

      apiMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    if (response.stop_reason === 'max_tokens' || response.stop_reason === 'stop_sequence') {
      const partial = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
      return (partial || '') + '\n\n_(התגובה קוצרה — שאל אותי שוב לפרטים נוספים)_';
    }

    // Unknown stop reason — exit loop and throw below
    break;
  }

  throw new Error('ChupChu agent loop did not complete within the allowed iterations');
}
