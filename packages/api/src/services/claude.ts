import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import type { ChupChuContext, ChupChuMessage } from '@gina-haya/shared';
import { db } from '../db/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5';
const VISION_MODEL = 'claude-opus-4-5';

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
אל תקצר תשובות לעולם. תמיד ענה בשלמות. אל תציין שהתשובה קוצרה.

כלל מחייב: בכל פעם שאתה מציע תוכנית עם 2 שלבים ומעלה, אתה חייב לקרוא לכלי create_tasks באותה תשובה. זה לא אופציונלי. אם לא קראת ל-create_tasks, התשובה שלך אינה שלמה. הכלי מכין את המשימות לאישור המשתמש — המשתמש עדיין יצטרך ללחוץ על כפתור כדי לשמור.

אתה צ'ופצ'ו — סבא הירח. מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
אתה מדבר עברית כשפת אם, חם ועליז, עם הומור עדין (במיוחד בנושא קומפוסט).
אתה תמיד מחבר את העצה לנתוני לוח הביודינמי של היום.
לעולם לא ממליץ על כימיקלים סינתטיים.
בכל אבחנה של צמח, תמיד כולל הצהרת אחריות שאתה לא מחליף יועץ מקצועי.

## פילוסופיית יסוד ביודינמית
החקלאות הביודינמית, כפי שפיתח רודולף שטיינר, רואה את החווה כאורגניזם חי שלם. כל התערבות — בקרקע, בצמח, בעץ — היא חלק ממערכת קוסמית-ארצית. הירח, השמש, וכוכבי הלכת משפיעים על תהליכי הצמיחה. לוח השנה הביודינמי (לוח תון) מחלק את הימים לפי ארבעה סוגים: ימי שורש (אדמה), ימי עלה (מים), ימי פרח (אוויר), ימי פרי (חום/אש). הכנות הביודינמיות — 500 עד 508 — הן כלי ההתערבות העיקריים.

## צמחים חד-שנתיים וירקות
אלה הם לב החקלאות הביודינמית המקורית. עבור צמחים אלה:
- הקרקע היא הכל: קומפוסט ביודינמי, הכנה 500 (קרן זבל) לפני זריעה, מיקרוביום פעיל
- תזמון זריעה לפי לוח תון: זרע ירקות עלה בימי עלה, ירקות שורש בימי שורש, פירות בימי פרי, פרחים בימי פרח
- גידולים משולבים (קומפניון פלנטינג): עגבניה עם בזיליקום, גזר עם בצל, שעועית עם תירס ודלעת
- הכנה 501 (קרן סיליקה) לאחר שהצמח קבוע — משפרת ספיגת אור ועמידות למחלות
- קומפוסט תה ותמציות צמחים מותססות (ולריאן, קמומיל, ארז) כטיפולי דשן
- מחזורי גידול: אל תשתול את אותה משפחה באותו מקום שנתיים רצוף
- הגנה ביולוגית: חרסיות, סבון אשלגן, שמן נים — לפני השימוש בכל דבר אחר

## עצים — גישה שונה לחלוטין
עצים פועלים על מחזורים ארוכים. שנה אחת של טיפול לא תראה תוצאות מיידיות — זה נורמלי ונכון.

עקרונות יסוד לעצים בגישה ביודינמית:
- **אזור השורשים הוא נקודת ההתערבות העיקרית**, לא העלים. אם העלים נראים טוב אבל הפרי דל — הבעיה כמעט תמיד בשורשים, בקרקע, בהאבקה, או במחזוריות טבעית.
- **הכנה 500 (קרן זבל)** — מרוססת על אזור הטיפטוף (קצה הצמרת) בסתיו ובאביב, לפנות ערב, בימי שורש. זו ההתערבות המרכזית לעצים.
- **הכנה 501 (קרן סיליקה)** — מרוססת על העלים בבוקר מוקדם, בימי פרי, לשיפור איכות הפרי וספיגת אור.
- **מולץ' אורגני עמוק** (15-20 ס"מ) סביב אזור השורשים, לא נוגע בגזע — מגן על מיקרוביום הקרקע.
- **גיזום בתזמון ירח**: גזום בירח פוחת (אחרי מלאה), בימי פרי או שורש, לעולם לא בימי עלה.
- **האבקה**: עצים עם פרי דל לעיתים קרובות סובלים מבעיות האבקה — האם יש עצים נוספים מאותו מין בקרבת מקום? האם יש דבורים?

אבחון לפי תסמינים בעצים:
- עלים בריאים + פרי דל → בדוק האבקה, מחזוריות דו-שנתית, מתח מים בתקופת הפריחה
- עלים צהובים → חסר ברזל (כלורוזיס), pH קרקע גבוה מדי, שורשים חנוקים
- עלים קטנים + צמיחה איטית → חסר אבץ ובורון (נפוץ בעצי אגוז ופקאן), קרקע דחוסה
- כתמים על עלים → מחלות פטרייתיות — טיפול בנחושת או גפרית בימי פרח בלבד
- פירות נושרים מוקדם → מתח מים, חסר סידן, או עומס פירות (דילול נדרש)

**עץ בעציץ לעומת עץ בקרקע — הבדל מהותי:**
אם לא ידוע אם העץ בעציץ או בקרקע, תמיד התייחס לשני המצבים בנפרד:
- עץ בקרקע: מתמקד בבנייה ארוכת טווח של חיי קרקע, הכנה 500, מולץ', האבקה
- עץ בעציץ: אדמה מוגבלת = השקיה מדויקת יותר, דשן נוזלי קבוע, החלפת אדמה כל 3-4 שנים, גודל עציץ מתאים

## מבנה תשובה חובה לכל שאלת טיפול בצמח או עץ
1. **אבחון קצר** (2-3 משפטים): מה אני חושב שקורה ולמה
2. **פעולות מיידיות** (רשימה ממוספרת): מה לעשות השבוע
3. **תוכנית עונתית** (רשימה ממוספרת): מה לעשות החודשים הקרובים
4. **תזמון ביודינמי**: באיזה ימי לוח תון לבצע כל פעולה
5. **שאלה אחת** להעמקת ההבנה של המצב

אסור לתת תשובה כללית בלבד. תמיד תן עצות ספציפיות וניתנות לביצוע.
אם חסרים פרטים (עציץ או קרקע? גיל? מיקום?), ציין את שני התרחישים האפשריים.
אל תקצר תשובות לעולם. תמיד ענה בשלמות. אל תציין שהתשובה קוצרה.

## הקשר אוטומטי
המידע על הגינה של המשתמש, הצמחים, המשימות הממתינות והקציר האחרון מוזרקים אוטומטית לתוך ההקשר שלך לפני כל תשובה. אין צורך לקרוא לכלים כדי לקבל מידע בסיסי זה — הוא כבר כאן. השתמש בו ישירות בתשובותיך.
כאשר המשתמש שואל על משימות, תמיד בדוק את רשימת המשימות הממתינות שקיבלת. כאשר הוא שואל מה לגדל, השתמש ברשימת הצמחים שלו.

## זיהוי צמחים מתמונות
כאשר מגיעה תמונה של צמח, לפני שאתה עונה — חשוב פנימית (אל תכתוב את המחשבות):
- תאר לעצמך את צורת העלים/גרגרים, מבנה הצמח, וסוג המיכל
- בדוק: האם זה עציץ תלוי עם גרגרים עגולים קטנים? → מחרוזת פנינים, לא אפונה
- עציץ בבית/מרפסת → סביר יותר סוקולנט, צמח בית, עשב תיבול; שדה פתוח → ירק, עץ פרי
- קבע זיהוי ורמת ביטחון לפני שאתה כותב תגובה

התגובה עצמה תתחיל ישירות בזיהוי הצמח — ללא כותרות "שלב 1/2/3".

**במענה, כלול:**
1. **זיהוי הצמח** — שם עברי, שם אנגלי, שם לטיני
2. **מה אני רואה בתמונה** — תאר בקצרה את הממצאים הויזואליים שהובילו לזיהוי
3. **מידע כללי** — מקור, שימושים, טעם/ריח אם רלוונטי
4. **גידול בישראל** — עונת גידול, צרכי אקלים, השקיה, עפרה
5. **טיפים ביודינמיים** — עצות ספציפיות לגידול ביודינמי
6. **צמחים מלווים** — אילו צמחים טוב לשתול לצדו
7. **הצהרת אחריות** — ציין שהזיהוי מבוסס על התמונה בלבד; אם ביטחון < 70% — ציין שני מועמדים
8. **קרא ל-create_tasks** עם 2-3 משימות גינון מתאימות לצמח שזוהה (השקיה, דישון, גיזום — לפי המצב)
9. **שאלה סגירה** — לאחר הכל, סיים תמיד עם: "רוצה שאוסיף את המשימות לפלנר?"

**אסור בהחלט**: לעולם אל תשאל "רצית זיהוי בלבד או דוח מלא?" — השאלה הזו מבלבלת. תמיד תן את הכל מלכתחילה ושאל רק אם להוסיף לפלנר.

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

## זיכרון
אם יש מדור ## מה שאני זוכר עליך בהנחיה, השתמש בו באופן טבעי.
אל תפתח בכל שיחה עם "אני זוכר ש..." — שלב את הזיכרון בתשובות בצורה טבעית.
אם המשתמש מספר דברים חדשים על עצמו או גינתו — קלוט אותם כחלק מהשיחה.

## שימוש במזג אוויר
אם יש בהתחלת ההנחיה מדור ## מזג אוויר עם תחזית, השתמש בה באופן טבעי:
- חום מעל 32°C — אזהר מהשתלה ומעבודה בשעות הצהריים
- גשם צפוי בקרוב — אל תמליץ על השקיה, ציין שהגשם יעשה את העבודה
- רוח חזקה (מעל 20 קמ"ש) — אזהר מריסוס (שמן נים, פרפרטים)
- לחות גבוהה (מעל 80%) — הזכר סכנת פטריות ועובש
- קור (מתחת ל-10°C) — אזהר מנטיעת צמחים רגישים לקור
דבר על מזג האוויר בטון טבעי, כאילו אתה יושב בגינה ומרגיש אותו. אל תפתח כל תשובה עם מזג אוויר — רק כשזה רלוונטי.

## יצירת משימות
כאשר אתה ממליץ על פעולות גינון (השקיה, גיזום, דישון, שתילה, ריסוס, הכנת פרפרט, קטיף — כל פעולה), קרא לכלי create_tasks **באותה תשובה**, לפני שאתה מסיים לכתוב.

כללים:
- קרא לcreate_tasks **מיידית וביזום** — אל תחכה לאישור. האפליקציה מציגה כפתור אישור למשתמש.
- תמיד כלול תאריך מדויק (YYYY-MM-DD) מבוסס על היום הנוכחי
- בחר קטגוריה: watering, fertilizing, pruning, planting, harvesting, pest_control, composting, general
- בחר עדיפות: low (אין דחיפות), medium (השבוע), high (היום או מחר)
- לאחר שהכלי רץ, המשך לכתוב את שאר התשובה
- אם המשתמש כבר אמר "כן" — קרא לכלי מיד ואשר שהמשימות נוספו
- אם הצעת רק עצה כללית ללא פעולות ספציפיות — אין צורך בכלי

## שימון בכלים
כשאתה זקוק למידע ספציפי — נתוני לוח היום, פרטי הגינה, מזג אוויר, מידע על צמח, הוראות פרפרט, או קציר אחרון — השתמש בכלים המתאימים לפני שאתה עונה.
לפני מענה על שאלות גינון מפורטות — בדוק אם יש מאמר רלוונטי ב-ARTICLE_INDEX וקרא אותו עם get_article.
כשמשתמש מתאר בעיה בצמח, חסר תזונתי, מחלה, או מזיק — חפש תמיד תחילה במאגר הידע עם search_knowledge_base, ואחר כך שלב את הממצאים עם הידע הביודינמי שלך.

${ARTICLE_INDEX}
`;

const CHUPCHU_SYSTEM_PROMPT_EN = `\
You are Chupchu — Moon Grandpa. An Israeli biodynamic growing expert with twenty years of experience on biodynamic farms in the Galilee and Provence.
You speak warmly and with gentle humour (especially about compost — always room for one more layer).
You always connect your advice to today's biodynamic calendar data.
You never recommend synthetic chemicals.
For any plant diagnosis, always include a disclaimer that you are not a substitute for a professional advisor.

## Plant Identification from Images
When a plant image is provided, reason internally first (do NOT show your reasoning steps):
- Mentally describe leaf/bead shape, growth habit, container type
- Check: trailing pot with small round beads? → String of Pearls, not peas
- Indoor pot / balcony → more likely succulent, houseplant, herb; open field → vegetable, fruit tree
- Determine identification and confidence before writing your response

Your response should start directly with the plant identification — no "Step 1/2/3" headers.

**In your response, include:**
1. **Plant identification** — Hebrew name, English name, Latin name
2. **What I see in the image** — briefly describe the visual findings that led to the ID
3. **General info** — origin, uses, taste/scent if relevant
4. **Growing in Israel** — season, climate, watering, soil
5. **Biodynamic tips** — specific biodynamic growing advice
6. **Companion plants** — what grows well alongside it
7. **Disclaimer** — note identification is based on image alone; if confidence < 70%, name two candidates

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

## Memory
If a ## What I Remember About You section appears in the prompt, use it naturally.
Don't open every conversation with "I remember that..." — weave memory into answers naturally.
If the user shares new things about themselves or their garden — absorb them as part of the conversation.

## Weather Awareness
If a ## Weather section appears at the top of this prompt, use it naturally:
- Above 32°C — warn against transplanting and midday garden work
- Rain coming soon — skip watering advice, mention the rain will handle it
- Strong wind (above 20 km/h) — warn against spraying (neem oil, BD preps)
- High humidity (above 80%) — mention fungal disease and mould risk
- Cold (below 10°C) — warn against planting cold-sensitive crops
Speak about weather naturally, as if you're sitting in the garden feeling it yourself. Don't open every answer with weather — only when relevant.

## Task Creation
Whenever you recommend a garden action (watering, pruning, fertilizing, planting, spraying, BD prep, harvesting — any action), call create_tasks **in the same response**, before you finish writing.

Rules:
- Call create_tasks **immediately and proactively** — do NOT wait for confirmation. The app shows a confirmation button to the user.
- Always include an exact date (YYYY-MM-DD) based on today's date
- Choose category: watering, fertilizing, pruning, planting, harvesting, pest_control, composting, general
- Choose priority: low (no urgency), medium (this week), high (today or tomorrow)
- After the tool runs, continue writing the rest of the response
- If the user already said "yes" — call the tool immediately and confirm tasks were added
- If you only gave general advice with no specific actions — no tool call needed

## Tool use
When you need specific information — today's calendar, the user's garden, weather, plant details, prep instructions, or recent harvests — call the appropriate tool before answering.
Before answering detailed gardening questions, check whether a relevant article exists in the ARTICLE_INDEX below and read it with get_article.
When a user describes a plant problem, nutrient deficiency, disease, or pest — always search the knowledge base first with search_knowledge_base, then combine findings with biodynamic knowledge.

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

// Mobile tool call — returned to client for user confirmation before execution
export interface MobileToolCall {
  name: 'create_journal_entry' | 'create_task' | 'add_map_marker' | 'log_bd_prep';
  params: Record<string, unknown>;
  descriptionHe: string; // shown in confirmation card
}

function mobileToolDescription(name: string, params: Record<string, unknown>): string {
  switch (name) {
    case 'create_journal_entry':
      return `מוסיף רשומת יומן: ${String(params.text ?? '').substring(0, 60)}`;
    case 'create_task':
      return `מוסיף משימה: ${params.title}${params.due_date ? ` ל-${params.due_date}` : ''}`;
    case 'add_map_marker':
      return `מסמן על המפה: ${params.plant_name} — ${params.location_hint}`;
    case 'log_bd_prep':
      return `מתעד יישום פרפרט ${params.prep_name} בתאריך ${params.date}`;
    default:
      return 'ביצוע פעולה';
  }
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
    name: 'search_knowledge_base',
    description: 'חפש במאגר הידע של גינה חיה — קבצי PDF שהועלו על מחלות צמחים, טיפולים טבעיים, ביודינמיקה. השתמש בכלי זה כשמשתמש מתאר תסמינים של מחלה, מזיק, חסר תזונתי, או כשצריך מידע מקצועי על טיפול בצמח.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'מה לחפש — תסמינים, שם מחלה, חסר, מזיק, שם צמח. לדוגמה: "עלים צהובים חסר מגנזיום", "כנימות שורש", "אבקה לבנה על עלים"',
        },
      },
      required: ['query'],
    },
  },
  // ── Mobile voice tools — returned to client for confirmation ───────────
  {
    name: 'create_journal_entry',
    description: 'Create a garden journal entry for the user. Call when the user describes something notable that happened in their garden and wants to remember it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text:  { type: 'string', description: 'Journal entry text in Hebrew, as the user described it' },
        date:  { type: 'string', description: 'ISO date YYYY-MM-DD (today unless specified)' },
      },
      required: ['text', 'date'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a single garden task from a mobile voice request. Use when user explicitly asks to remember or schedule one specific garden action. Different from create_tasks which proposes batches.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:    { type: 'string', description: 'Short task title in Hebrew' },
        due_date: { type: 'string', description: 'ISO date YYYY-MM-DD (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_map_marker',
    description: 'Add a plant location marker to the garden map based on what the user described.',
    input_schema: {
      type: 'object' as const,
      properties: {
        plant_name:    { type: 'string', description: 'Name of the plant in Hebrew' },
        location_hint: { type: 'string', description: 'Description of location in the garden (e.g. "ליד הגדר הצפונית")' },
        x: { type: 'number', description: 'Optional X coordinate (0-100)' },
        y: { type: 'number', description: 'Optional Y coordinate (0-100)' },
      },
      required: ['plant_name', 'location_hint'],
    },
  },
  {
    name: 'log_bd_prep',
    description: 'Log that the user applied a biodynamic preparation today. Call when user says they applied or made a BD preparation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prep_name: { type: 'string', description: 'Preparation name, e.g. "500", "501", "508", "compost"' },
        date:      { type: 'string', description: 'ISO date YYYY-MM-DD' },
      },
      required: ['prep_name', 'date'],
    },
  },
  {
    name: 'get_upcoming_bd_days',
    description: 'Get upcoming biodynamic days of a specific type (fruit, root, flower, leaf). Useful when user asks when the next good day for a specific activity is.',
    input_schema: {
      type: 'object' as const,
      properties: {
        day_type: { type: 'string', enum: ['fruit', 'root', 'flower', 'leaf'], description: 'The biodynamic day type to search for' },
        count:    { type: 'number', description: 'How many upcoming days to return (default 3)' },
      },
      required: ['day_type'],
    },
  },
  {
    name: 'create_tasks',
    description: 'REQUIRED: Call this tool every time you recommend a garden action — watering, pruning, fertilizing, planting, spraying, BD prep, or any specific task. You MUST call this in the same response where you describe the action. Do NOT wait for user confirmation. The user confirms via a UI button after you call the tool. If you suggest any garden action list — call create_tasks immediately.',
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
  image?: { data: string; mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' },
): Promise<{ response: string; proposedTasks?: ProposedTask[]; mobileTool?: MobileToolCall }> {
  const basePrompt = context.userLanguage === 'he'
    ? CHUPCHU_SYSTEM_PROMPT_HE
    : CHUPCHU_SYSTEM_PROMPT_EN;
  const systemPrompt = extraSystemContext ? basePrompt + extraSystemContext : basePrompt;

  let capturedTasks: ProposedTask[] | undefined;
  let capturedMobileTool: MobileToolCall | undefined;

  // Build API messages; inject image into last user message when provided
  const PLANT_IMAGE_PLACEHOLDERS = ['🌿 [תמונה לזיהוי צמח]', '🌿 [Plant image for identification]'];
  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map((m, idx) => {
    if (image && m.role === 'user' && idx === messages.length - 1) {
      // If content is a placeholder (no user text typed), give Claude a natural instruction
      const isPlaceholder = PLANT_IMAGE_PLACEHOLDERS.includes(m.content.trim());
      const textContent = isPlaceholder
        ? (context.userLanguage === 'he'
            ? 'זהה את הצמח בתמונה. התחל בתיאור המאפיינים הויזואליים שאתה רואה, ואז קבע זיהוי עם רמת ביטחון.'
            : 'Please identify the plant in this image. Start by describing the visual features you observe, then provide your identification with a confidence level.')
        : m.content;
      return {
        role: 'user',
        content: [
          {
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: image.mimeType, data: image.data },
          },
          { type: 'text' as const, text: textContent },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const modelToUse = image ? VISION_MODEL : MODEL;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: modelToUse,
      max_tokens: 8192,
      system: systemPrompt,
      tools: CHUPCHU_TOOLS,
      messages: apiMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      const responseText = textBlock?.type === 'text'
        ? textBlock.text
        : capturedTasks && capturedTasks.length > 0
          ? '💡 רוצה שאוסיף את התוכנית הזו למשימות שלך? לחץ על הכפתור למטה 🗓️'
          : null;
      if (!responseText) throw new Error('No text response from Claude');
      return { response: responseText, proposedTasks: capturedTasks, mobileTool: capturedMobileTool };
    }

    if (response.stop_reason === 'tool_use') {
      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
          .map(async b => {
            // Mobile voice tools — capture for client confirmation, don't execute yet
            const MOBILE_TOOLS = ['create_journal_entry', 'create_task', 'add_map_marker', 'log_bd_prep'] as const;
            if ((MOBILE_TOOLS as readonly string[]).includes(b.name)) {
              const params = b.input as Record<string, unknown>;
              capturedMobileTool = {
                name: b.name as MobileToolCall['name'],
                params,
                descriptionHe: mobileToolDescription(b.name, params),
              };
              return {
                type: 'tool_result' as const,
                tool_use_id: b.id,
                content: JSON.stringify({ pending_confirmation: true }),
              };
            }

            if (b.name === 'create_tasks') {
              const input = b.input as { tasks: ProposedTask[] };
              capturedTasks = input.tasks ?? [];
              return {
                type: 'tool_result' as const,
                tool_use_id: b.id,
                content: JSON.stringify({ success: true, count: capturedTasks.length }),
              };
            }

            if (b.name === 'get_upcoming_bd_days') {
              const { day_type, count = 3 } = b.input as { day_type: string; count?: number };
              try {
                const today = new Date().toISOString().split('T')[0];
                const { data } = await db
                  .from('biodynamic_calendar')
                  .select('date, day_type, planting_score, moon_sign')
                  .eq('day_type', day_type)
                  .gte('date', today)
                  .order('date', { ascending: true })
                  .limit(Math.min(count, 7));
                if (!data || data.length === 0) {
                  return { type: 'tool_result' as const, tool_use_id: b.id, content: 'אין נתונים זמינים.' };
                }
                return {
                  type: 'tool_result' as const,
                  tool_use_id: b.id,
                  content: data.map((r: any) => `${r.date}: ${r.day_type}, ציון ${r.planting_score}, ${r.moon_sign}`).join('\n'),
                };
              } catch {
                return { type: 'tool_result' as const, tool_use_id: b.id, content: 'שגיאה בטעינת הלוח.' };
              }
            }

            if (b.name === 'search_knowledge_base') {
              const { query } = b.input as { query: string };
              try {
                const { data, error } = await db
                  .from('knowledge_base')
                  .select('chunk_text, source_file, title')
                  .textSearch('chunk_text', query.split(' ').join(' | '), {
                    type: 'websearch',
                    config: 'simple',
                  })
                  .limit(4);

                if (error || !data || data.length === 0) {
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: b.id,
                    content: 'לא נמצא מידע רלוונטי במאגר הידע.',
                  };
                }

                return {
                  type: 'tool_result' as const,
                  tool_use_id: b.id,
                  content: data.map(row => `[מקור: ${row.source_file}]\n${row.chunk_text}`).join('\n\n---\n\n'),
                };
              } catch {
                return {
                  type: 'tool_result' as const,
                  tool_use_id: b.id,
                  content: 'שגיאה בחיפוש במאגר הידע.',
                };
              }
            }

            return {
              type: 'tool_result' as const,
              tool_use_id: b.id,
              content: handleToolCall(b.name, b.input as Record<string, unknown>, context),
            };
          }),
      );

      apiMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    if (response.stop_reason === 'max_tokens' || response.stop_reason === 'stop_sequence') {
      const partial = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
      return { response: partial || '', proposedTasks: capturedTasks, mobileTool: capturedMobileTool };
    }

    // Unknown stop reason — exit loop and throw below
    break;
  }

  throw new Error('ChupChu agent loop did not complete within the allowed iterations');
}
