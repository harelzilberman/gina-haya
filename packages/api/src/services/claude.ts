import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import type { ChupChuContext, ChupChuMessage } from '@gina-haya/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514';

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

const ARTICLE_INDEX = `
# מאמרים זמינים — השתמש בכלי get_article לקבלת תוכן מלא

## עברית (language: "he")
- compost-tea → תה קומפוסט — המדריך המלא לאדמה חיה
- seaweed-spray → ריסוס אצות ים לצמחים — כוח הים בגינה
- green-manure → דשן ירוק — להאכיל את הקרקע לפני הצמח
- neem-oil → שמן נים — נשק סודי נגד מזיקים
- watering-pots → השקיית עציצים — המדריך המקצועי
- plant-stress-signs → סימני סטרס בצמחים — מה הגינה מנסה לספר לך
- ground-mulching → חיפוי קרקע — חיסכון במים והפחתת עשביה

## English (language: "en")
- compost-tea → Compost Tea — The Complete Guide to Living Soil
- seaweed-spray → Seaweed Spray — Ocean Power in Your Garden
- green-manure → Green Manure — Feed the Soil Before the Plants
- neem-oil → Neem Oil — Secret Weapon Against Pests
- watering-pots → Watering Potted Plants — The Professional Guide
- mulching → Mulching — Save Water and Reduce Weeds
- plant-stress-signs → Plant Stress Signs — What Your Garden Is Trying to Tell You
`;

// Hardcoded slug → filename map (covers Hebrew filenames that can't be auto-derived)
const SLUG_TO_FILE: Record<string, Record<string, string>> = {
  he: {
    'compost-tea':        '01_תה_קומפוסט.md',
    'seaweed-spray':      '02_ריסוס_אצות_ים.md',
    'green-manure':       '03_דשן_ירוק.md',
    'neem-oil':           '04_שמן_נים.md',
    'watering-pots':      '21_השקיה_עציצים.md',
    'plant-stress-signs': '23_סימני_סטרס_בצמחים.md',
    'ground-mulching':    'חיפוי_קרקע.md',
  },
  en: {
    'compost-tea':        '01_compost_tea.md',
    'seaweed-spray':      '02_seaweed_spray.md',
    'green-manure':       '03_green_manure.md',
    'neem-oil':           '04_neem_oil.md',
    'watering-pots':      '21_watering_pots.md',
    'mulching':           '22_mulching.md',
    'plant-stress-signs': '23_plant_stress_signs.md',
  },
};

function buildSlugMap(language: 'he' | 'en'): Record<string, string> {
  const articlesDir = path.join(__dirname, '../../../web/public/articles', language);
  if (!fs.existsSync(articlesDir)) return {};
  const map: Record<string, string> = {};
  fs.readdirSync(articlesDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .forEach(filename => {
      const slug = filename
        .replace(/^\d+_/, '')
        .replace(/\.md$/, '')
        .replace(/_/g, '-')
        .toLowerCase();
      map[slug] = filename;
    });
  return map;
}

// ── System prompts ─────────────────────────────────────────────────────────

const CHUPCHU_SYSTEM_PROMPT_HE = `\
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

## שימוש במזג אוויר
אם יש בהתחלת ההנחיה מדור ## מזג אוויר עם תחזית, השתמש בה באופן טבעי:
- חום מעל 32°C — אזהר מהשתלה ומעבודה בשעות הצהריים
- גשם צפוי בקרוב — אל תמליץ על השקיה, ציין שהגשם יעשה את העבודה
- רוח חזקה (מעל 20 קמ"ש) — אזהר מריסוס (שמן נים, פרפרטים)
- לחות גבוהה (מעל 80%) — הזכר סכנת פטריות ועובש
- קור (מתחת ל-10°C) — אזהר מנטיעת צמחים רגישים לקור
דבר על מזג האוויר בטון טבעי, כאילו אתה יושב בגינה ומרגיש אותו. אל תפתח כל תשובה עם מזג אוויר — רק כשזה רלוונטי.

## יצירת משימות
כאשר אתה ממליץ על פעולות גינון ספציפיות, הצע להוסיף אותן כמשימות ליומן המשתמש.
כללים:
- כשאתה מציע משימות, סיים עם: "רוצה שאוסיף את המשימות האלה ליומן שלך?"
- רק לאחר שהמשתמש מאשר ("כן", "בטח", "הוסף") — קרא לכלי create_tasks
- תמיד כלול תאריך מדויק (YYYY-MM-DD) מבוסס על היום הנוכחי
- בחר קטגוריה: watering, fertilizing, pruning, planting, harvesting, pest_control, composting, general
- בחר עדיפות: low (אין דחיפות), medium (השבוע), high (היום או מחר)
- לאחר שהכלי רץ, אשר כמה משימות הוצעו
- אל תיצור משימות ללא אישור מפורש

## שימון בכלים
כשאתה זקוק למידע ספציפי — נתוני לוח היום, פרטי הגינה, מזג אוויר, מידע על צמח, הוראות פרפרט, או קציר אחרון — השתמש בכלים המתאימים לפני שאתה עונה.
לפני מענה על שאלות גינון מפורטות — בדוק אם יש מאמר רלוונטי ב-ARTICLE_INDEX וקרא אותו עם get_article.

${ARTICLE_INDEX}
`;

const CHUPCHU_SYSTEM_PROMPT_EN = `\
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

## Weather Awareness
If a ## Weather section appears at the top of this prompt, use it naturally:
- Above 32°C — warn against transplanting and midday garden work
- Rain coming soon — skip watering advice, mention the rain will handle it
- Strong wind (above 20 km/h) — warn against spraying (neem oil, BD preps)
- High humidity (above 80%) — mention fungal disease and mould risk
- Cold (below 10°C) — warn against planting cold-sensitive crops
Speak about weather naturally, as if you're sitting in the garden feeling it yourself. Don't open every answer with weather — only when relevant.

## Task Creation
When recommending specific garden actions, offer to add them as tasks to the user's task manager.
Rules:
- When suggesting tasks, end with: "Want me to add these tasks to your task manager?"
- Only after explicit user confirmation ("yes", "sure", "add them") — call the create_tasks tool
- Always include an exact date (YYYY-MM-DD) based on today's date
- Choose category: watering, fertilizing, pruning, planting, harvesting, pest_control, composting, general
- Choose priority: low (no urgency), medium (this week), high (today or tomorrow)
- After the tool runs, confirm how many tasks were proposed
- Never create tasks without explicit confirmation

## Tool use
When you need specific information — today's calendar, the user's garden, weather, plant details, prep instructions, or recent harvests — call the appropriate tool before answering.
Before answering detailed gardening questions, check whether a relevant article exists in the ARTICLE_INDEX below and read it with get_article.

${ARTICLE_INDEX}
`;

// ── Task proposal type ─────────────────────────────────────────────────────

export interface ProposedTask {
  title: { he: string; en: string };
  description: { he: string; en: string };
  date: string;
  category: 'watering' | 'fertilizing' | 'pruning' | 'planting' | 'harvesting' | 'pest_control' | 'composting' | 'general';
  priority: 'low' | 'medium' | 'high';
}

// ── Tool definitions ───────────────────────────────────────────────────────

const CHUPCHU_TOOLS: Anthropic.Messages.Tool[] = [
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
  {
    name: 'get_article',
    description: 'קרא מאמר מלא על נושא גינון. השתמש בכלי זה כשיש שאלה מפורטת על נושא שיש עליו מאמר.',
    input_schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'מזהה המאמר — ראה את הרשימה ב-ARTICLE_INDEX. לדוגמה: compost-tea, neem-oil',
        },
        language: {
          type: 'string',
          enum: ['he', 'en'],
          description: 'שפת המאמר — he לעברית, en לאנגלית',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'create_tasks',
    description: 'Propose a list of garden tasks for the user to add to their task manager. Call this ONLY after the user explicitly confirms they want to add tasks. Returns proposed tasks to the frontend for user selection.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'object',
                properties: {
                  he: { type: 'string', description: 'Task title in Hebrew' },
                  en: { type: 'string', description: 'Task title in English' },
                },
                required: ['he', 'en'],
              },
              description: {
                type: 'object',
                properties: {
                  he: { type: 'string', description: 'Task description in Hebrew' },
                  en: { type: 'string', description: 'Task description in English' },
                },
                required: ['he', 'en'],
              },
              date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
              category: {
                type: 'string',
                enum: ['watering', 'fertilizing', 'pruning', 'planting', 'harvesting', 'pest_control', 'composting', 'general'],
              },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['title', 'description', 'date', 'category', 'priority'],
          },
        },
      },
      required: ['tasks'],
    },
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
      if (!plantName) return 'לא סופק שם צמח.';
      const allLines = PLANT_SPACING_KNOWLEDGE.split('\n');
      // Primary: line starts with the plant name
      const exactLines = allLines.filter(l => l.trimStart().startsWith(plantName));
      if (exactLines.length > 0) return exactLines.join('\n');
      // Fallback: case-insensitive includes
      const fuzzyLines = allLines.filter(l => l.toLowerCase().includes(plantName.toLowerCase()));
      if (fuzzyLines.length > 0) return fuzzyLines.join('\n');
      return `הצמח "${plantName}" אינו נמצא בבסיס הנתונים שלנו עדיין.`;
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

    case 'get_article': {
      const slug = String(input.slug ?? '').trim();
      const language = (input.language === 'en' ? 'en' : 'he') as 'he' | 'en';
      if (!slug) return 'לא סופק slug למאמר.';

      const hardcoded = SLUG_TO_FILE[language] ?? {};
      const dynamic   = buildSlugMap(language);
      const filename  = hardcoded[slug] ?? dynamic[slug];

      if (!filename) {
        const available = Object.keys(hardcoded).join(', ');
        return `לא נמצא מאמר עם slug "${slug}" בשפה "${language}". האפשרויות: ${available}`;
      }

      const articlePath = path.join(__dirname, '../../../web/public/articles', language, filename);
      if (!fs.existsSync(articlePath)) return `קובץ המאמר לא נמצא: ${filename}`;

      const raw = fs.readFileSync(articlePath, 'utf-8');
      const cleaned = raw
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/^##\s+\d+\.\s+מדריך חזותי[\s\S]*?(?=^##|\s*$)/gm, '')
        .replace(/^##\s+\d+\.\s+Visual Guide[\s\S]*?(?=^##|\s*$)/gm, '')
        .trim();
      return cleaned.length > 4000
        ? cleaned.substring(0, 4000) + '\n\n[המאמר קוצר לשמירת מקום]'
        : cleaned;
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
): Promise<{ response: string; proposedTasks?: ProposedTask[] }> {
  const basePrompt = context.userLanguage === 'he'
    ? CHUPCHU_SYSTEM_PROMPT_HE
    : CHUPCHU_SYSTEM_PROMPT_EN;
  const systemPrompt = extraSystemContext ? basePrompt + extraSystemContext : basePrompt;

  let capturedTasks: ProposedTask[] | undefined;

  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: CHUPCHU_TOOLS,
      messages: apiMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude');
      return { response: textBlock.text, proposedTasks: capturedTasks };
    }

    if (response.stop_reason === 'tool_use') {
      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        .map(b => {
          if (b.name === 'create_tasks') {
            const input = b.input as { tasks: ProposedTask[] };
            capturedTasks = input.tasks ?? [];
            return {
              type: 'tool_result' as const,
              tool_use_id: b.id,
              content: JSON.stringify({ success: true, count: capturedTasks.length }),
            };
          }
          return {
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: handleToolCall(b.name, b.input as Record<string, unknown>, context),
          };
        });

      apiMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    if (response.stop_reason === 'max_tokens' || response.stop_reason === 'stop_sequence') {
      const partial = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
      return { response: (partial || '') + '\n\n_(התגובה קוצרה — שאל אותי שוב לפרטים נוספים)_' };
    }

    // Unknown stop reason — exit loop and throw below
    break;
  }

  throw new Error('ChupChu agent loop did not complete within the allowed iterations');
}
