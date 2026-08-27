import axios from 'axios';
import articlesData from '../../../shared/data/articles.json';
import Anthropic from '@anthropic-ai/sdk'; // kept for TypeScript types only — no client instantiated
import type { ChupChuContext, ChupChuMessage } from '@gina-haya/shared';
import { db } from '../db/client';
import { logApiUsage } from './apiUsage';
import { resolveGardenId } from '../utils/garden';
import { todayInIsrael } from '@gina-haya/shared';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_HEADERS = {
  'x-api-key':        process.env.ANTHROPIC_API_KEY!,
  'anthropic-version': '2023-06-01',
  'content-type':      'application/json',
  // Note: cache_control ttl:'1h' (extended prompt-cache TTL) is now GA — no beta header needed.
  // The 'extended-cache-ttl-2025-02-19' beta flag was removed after Anthropic rejected it as unrecognised.
};

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5';
const VISION_MODEL = 'claude-opus-4-5';
// Text-only chat model.  Set CHAT_TEXT_MODEL=claude-haiku-4-5-20251001 on Railway to
// enable Haiku routing without touching image or full-diagnosis paths.
const CHAT_TEXT_MODEL = process.env.CHAT_TEXT_MODEL ?? MODEL;

const MAX_TOOL_ITERATIONS = 3;

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

## דשנים טבעיים / Natural Fertilizers
- compost-tea → תה קומפוסט / Compost Tea
- seaweed-spray → ריסוס אצות ים / Seaweed Spray
- green-manure → דשן ירוק / Green Manure
- diluted-urine → שתן מדולל / Diluted Urine
- neem-oil → שמן נים / Neem Oil

## הדברה / Pest Control
- beneficial-beetles → חיפושיות טובות / Beneficial Beetles
- yellow-traps → מלכודות צהובות / Yellow Sticky Traps
- companion-plants → צמחי מלווים להדברה / Companion Plants

## קומפוסט / Compost
- compost-pile → ערימת קומפוסט / Compost Pile
- vermicompost → ורמיקומפוסט / Vermicompost
- compost-dont → מה לא לשים בקומפוסט / What Not to Compost

## פרפרטים BD / BD Preps
- bd500 → פרפרט 500 / Horn Manure
- bd501 → פרפרט 501 / Horn Silica
- cpp → CPP / Cow Pat Pit
- biodynamic-calendar → הלוח הביודינמי / Biodynamic Calendar

## שיתופי פעולה / Companion Planting
- tomato-basil → עגבנייה + בזיליקום / Tomato & Basil
- three-sisters → שלוש האחיות / The Three Sisters
- flowers-vegetables → פרחים בין ירקות / Flowers Among Vegetables

## השקיה וטכניקות / Irrigation & Techniques
- watering-pots → השקיית עציצים / Watering Potted Plants
- ground-mulching → חיפוי קרקע / Ground Mulching
`;

// ── System prompts ─────────────────────────────────────────────────────────

// Single source of truth for the Hebrew terminology glossary.
// Referenced from CHUPCHU_SYSTEM_PROMPT_HE (chat), full-diagnosis, and
// starter-tasks so wording stays in sync across all three paths.
export const CHUPCHU_GLOSSARY_HE = `## מינוח מחייב
השתמש תמיד במונחים הבאים כאשר אתה כותב עברית. כשנדרש מונח שאינו ברשימה ואינך בטוח במונח העברי הסטנדרטי — **תאר את הפעולה בעברית פשוטה** במקום להמציא מונח או לתעתק מאנגלית.

מונחים נדרשים:
- חיפוי קרקע — הפרקטיקה הכללית של כיסוי הקרקע (mulching)
- גזם גרוס — גזם עצים וגינה גרוס המשמש כחומר חיפוי
- פרפרט — פרפרטים ביודינמיים (500, 501, 508 וכד׳)
- קומפוסט
- קומפוסט נוזלי — compost tea
- זבל ירוק — green manure / cover crop
- העברת שתיל — transplanting
- תערובת שתילה — potting mix
- פקעת — root ball
- נביטה — germination

הבחנה: **חיפוי קרקע** היא הפרקטיקה הכללית; **גזם גרוס** הוא חומר הגלם הספציפי — גזם עצים וגינה גרוס המשמש כחיפוי. אל תחליף ביניהם.
**אסור**: מולצה | מולצ׳ינג | מולץ׳ — כל תעתיק של "mulch". עבור פרפרטים ביודינמיים: תמיד פרפרט — לא הכנה ולא תכשיר.
**כלל לפערים**: כשאתה זקוק למונח שאינו ברשימה — **תאר את הפעולה בעברית פשוטה**. לדוגמה: "hardening off" → הרגלת שתילים לתנאי חוץ, לא הרדנינג. תיאור פעולה — תמיד מקובל. מונח מומצא או מתועתק — לא.`;

const CHUPCHU_SYSTEM_PROMPT_HE = `\
ענה באיזון. קצר את התשובה ככל הצורך. חזור ישירות לעניין, ללא מילויים או תת-הוראות.

כלל מחייב: בכל פעם שאתה מציע תוכנית עם 2 שלבים ומעלה, אתה חייב לקרוא לכלי create_tasks באותה תשובה. זה לא אופציונלי. אם לא קראת ל-create_tasks, התשובה שלך אינה שלמה. הכלי מכין את המשימות לאישור המשתמש — המשתמש עדיין יצטרך ללחוץ על כפתור כדי לשמור.
אחרי שקראת ל-log_bd_prep או ל-create_task, תאר מה הכנת ובקש מהמשתמש לאשר. אל תאמר שנרשם או שנשמר.

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
- **חיפוי קרקע עמוק** (15-20 ס"מ) סביב אזור השורשים, לא נוגע בגזע — מגן על מיקרוביום הקרקע.
- **גיזום בתזמון ירח**: גזום בירח פוחת (אחרי מלאה), בימי פרי או שורש, לעולם לא בימי עלה.
- **האבקה**: עצים עם פרי דל לעיתים קרובות סובלים מבעיות האבקה — האם יש עצים נוספים מאותו מין בקרבת מקום? האם יש דבורים?

אבחון לפי תסמינים בעצים:
- עלים בריאים + פרי דל → בדוק האבקה, מחזוריות דו-שנתית, מתח מים בתקופת הפריחה
- עלים צהובים → חסר ברזל (כלורוזיס), pH קרקע גבוה מדי, שורשים חנוקים
- עלים קטנים + צמיחה איטית → חסר אבץ ובורון (נפוץ בעצי אגוז ופקאן), קרקע דחוסה
- כתמים על עלים → מחלות פטרייתיות — טיפול בנחושת או גפרית בימי פרח בלבד
- פירות נושרים מוקדם → מתח מים, חסר סידן, או עומס פירות (דילול נדרש)

**עץ בעציץ לעומת עץ בקרקע — הבדל מהותי:**
בדוק קודם בסעיף "הגינה של המשתמש" — אם מיקום הגידול של הצמח רשום שם, השתמש בו ישירות ואל תשאל ואל תבקש אישור. רק אם הצמח לא מופיע שם או שמיקום הגידול חסר — התייחס לשני המצבים בנפרד:
- עץ בקרקע: מתמקד בבנייה ארוכת טווח של חיי קרקע, הכנה 500, חיפוי קרקע, האבקה
- עץ בעציץ: אדמה מוגבלת = השקיה מדויקת יותר, דשן נוזלי קבוע, החלפת אדמה כל 3-4 שנים, גודל עציץ מתאים

## מבנה תשובה חובה לכל שאלת טיפול בצמח או עץ
1. **אבחון קצר** (2-3 משפטים): מה אני חושב שקורה ולמה
2. **פעולות מיידיות** (רשימה ממוספרת): מה לעשות השבוע
3. **תוכנית עונתית** (רשימה ממוספרת): מה לעשות החודשים הקרובים
4. **תזמון ביודינמי**: באיזה ימי לוח תון לבצע כל פעולה
5. **שאלה אחת** להעמקת ההבנה של המצב — חייבת להיות על משהו שאינו ניתן לתשובה מנתוני הגינה (למשל: שלב הצמיחה, תסמינים שנראים, מתי הושקה לאחרונה). לעולם לא שאלה על פרט שכבר רשום בסעיף הגינה.

אסור לתת תשובה כללית בלבד. תמיד תן עצות ספציפיות וניתנות לביצוע.
אם חסרים פרטים שאינם קיימים בנתוני הגינה (גיל השתיל? תסמינים? מתי הושקה לאחרונה?), ציין את שני התרחישים האפשריים. לעולם אל תבקש מהמשתמש לאשר פרט שכבר רשום בנתוני הגינה — פשוט השתמש בו.
ענה באיזון. קצר את התשובה ככל הצורך. חזור ישירות לעניין, ללא מילויים או תת-הוראות.

## הקשר אוטומטי
המידע על הגינה של המשתמש, הצמחים, המשימות הממתינות מוזרקים אוטומטית לתוך ההקשר שלך לפני כל תשובה. אין צורך לקרוא לכלים כדי לקבל מידע בסיסי זה — הוא כבר כאן. השתמש בו ישירות בתשובותיך.
כאשר המשתמש שואל על משימות, תמיד בדוק את רשימת המשימות הממתינות שקיבלת. כאשר הוא שואל מה לגדל, השתמש ברשימת הצמחים שלו.
היסטוריית יישום הפרפרטים הביודינמיים מוזרקת כ-## אירועי גינה אחרונים. כשמשתמש שואל מתי יישם פרפרט לאחרונה, או האם כדאי ליישם כעת — קרא ל-get_bd_prep_history לאחזור מדויק לפי תאריך.

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
אם המשתמש שואל על שיחות קודמות — השתמש במידע מהיסטוריית השיחות שסופקה לך. אם אין לך מידע על שיחה מסוימת, אמור זאת בכנות.

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
- אם המשימה קשורה לצמח או עץ ספציפי שהוזכר בשיחה, מלא את שדה plant_name בשם הצמח בעברית

## שימון בכלים
כשאתה זקוק למידע ספציפי — נתוני לוח היום, פרטי הגינה, מזג אוויר, מידע על צמח, הוראות פרפרט — השתמש בכלים המתאימים לפני שאתה עונה.
לפני מענה על שאלות גינון מפורטות — בדוק אם יש מאמר רלוונטי ב-ARTICLE_INDEX וקרא אותו עם get_article.
כשמשתמש מתאר בעיה בצמח, חסר תזונתי, מחלה, או מזיק — חפש תמיד תחילה במאגר הידע עם search_knowledge_base, ואחר כך שלב את הממצאים עם הידע הביודינמי שלך.

${CHUPCHU_GLOSSARY_HE}

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
- If the task relates to a specific plant or tree mentioned in the conversation, fill plant_name with the plant's name in Hebrew

After calling log_bd_prep or create_task, describe what you have prepared and ask the user to confirm it. Do not say it has been recorded or saved.

## Automatic Context
Your garden data, plant list, and pending tasks are injected automatically before each response — no tool call needed for that baseline. Use them directly.
Biodynamic prep application history is injected as ## Recent Garden Events. When the user asks when a prep was last applied, or whether it is time to apply one again — call get_bd_prep_history for an exact date and days-elapsed lookup.

## Tool use
When you need specific information — today's calendar, the user's garden, weather, plant details, prep instructions — call the appropriate tool before answering.
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
  plant_name?: string;
}

// Mobile tool call — returned to client for user confirmation before execution
export interface MobileToolCall {
  name: 'create_task' | 'log_bd_prep';
  params: Record<string, unknown>;
  descriptionHe: string; // shown in confirmation card
}

function mobileToolDescription(name: string, params: Record<string, unknown>): string {
  switch (name) {
    case 'create_task':
      return `מוסיף משימה: ${params.title}${params.due_date ? ` ל-${params.due_date}` : ''}`;
    case 'log_bd_prep':
      return `מתעד יישום פרפרט ${params.prep_name} בתאריך ${params.date}`;
    default:
      return 'ביצוע פעולה';
  }
}

// ── Tool definitions ───────────────────────────────────────────────────────
// CacheControlExtended extends the SDK's CacheControlEphemeral with optional ttl.
// Per the API, ttl is the string enum '5m' | '1h' — NOT a number of seconds.
// The SDK type (0.39) does not yet include ttl — we use a local type to avoid casting everywhere.
type CacheControlExtended = { type: 'ephemeral'; ttl?: '5m' | '1h' };
type ToolWithCache = Omit<Anthropic.Messages.Tool, 'cache_control'> & {
  cache_control?: CacheControlExtended | null;
};

const CHUPCHU_TOOLS: ToolWithCache[] = [
  {
    name: 'get_today_calendar',
    description: "Returns today's biodynamic calendar data: moon direction, node crossing, day type, moon sign, planting score, prep recommendations, perigee status.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_user_garden',
    description: "Returns the user's garden details: name, soil type, location, and plant list.",
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
    name: 'create_task',
    description: 'Create a single garden task. Use when the user explicitly asks to remember or schedule one specific garden action. Always call this tool for such requests. Different from create_tasks, which proposes batches.',
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
    name: 'log_bd_prep',
    description: 'Record a פרפרט (biodynamic preparation) application to the garden log. Call this whenever the user says they applied, sprayed, or made a BD preparation. Always call this tool for such statements — do not reply without calling it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prep_name: { type: 'string', description: 'Preparation name, e.g. "500", "501", "508", "compost"' },
        date:      { type: 'string', description: 'ISO date YYYY-MM-DD. Omit entirely when the user means today — the server will fill in the correct date. Supply only for an explicitly past date (e.g. "I applied 500 last Tuesday").' },
      },
      required: ['prep_name'],
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
    name: 'get_bd_prep_history',
    description: "Returns when each biodynamic preparation (500, 501, 508, etc.) was last applied in the user's garden. Call this whenever the user asks when they last applied a preparation, whether they are due to apply one again, or how long it has been since a prep was used. Always call this before advising on whether to apply a preparation — do not answer from the calendar alone.",
    input_schema: {
      type: 'object' as const,
      properties: {
        prep_name: {
          type: 'string',
          description: 'Optional. Filter to one preparation, e.g. "500". Omit to return all.',
        },
      },
      required: [],
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
              plant_name: {
                type: 'string',
                description: 'שם הצמח או העץ שהמשימה קשורה אליו (אם רלוונטי)',
              },
            },
            required: ['title', 'description', 'date', 'category', 'priority'],
          },
        },
      },
      required: ['tasks'],
    },
    // cache_control on the LAST tool caches all 12 tool definitions as a single block
    // (~1,150 tokens off uncached input per call once warm).
    cache_control: { type: 'ephemeral', ttl: '1h' },
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
      const result: Record<string, unknown> = {
        gardenName: context.gardenName ?? null,
        soilType: context.soilType ?? null,
        plants: context.plants,
      };
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

    case 'get_article': {
      const slug     = String(input.slug ?? '').trim();
      const language = (input.language === 'en' ? 'en' : 'he') as 'he' | 'en';
      if (!slug) return 'לא סופק slug למאמר.';

      const article = (articlesData as any[]).find((a: any) => a.id === slug);
      if (!article) {
        const available = (articlesData as any[]).map((a: any) => a.id).join(', ');
        return `לא נמצא מאמר עם slug "${slug}". האפשרויות: ${available}`;
      }

      if (article.comingSoon) return 'המאמר הזה עדיין בהכנה.';

      const raw: string | null = language === 'en' ? article.htmlContentEn : article.htmlContent;
      if (!raw) return 'המאמר הזה עדיין בהכנה.';

      const text = raw
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      return text.length > 4000
        ? text.substring(0, 4000) + '\n\n[המאמר קוצר לשמירת מקום]'
        : text;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Agentic loop ───────────────────────────────────────────────────────────

export async function askChupChu(
  messages: ChupChuMessage[],
  context: ChupChuContext,
  stableContext?: string,
  volatileContext?: string,
  image?: { data: string; mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' },
  userId?: string,
): Promise<{ response: string; proposedTasks?: ProposedTask[]; mobileTool?: MobileToolCall }> {
  const basePrompt = context.userLanguage === 'he'
    ? CHUPCHU_SYSTEM_PROMPT_HE
    : CHUPCHU_SYSTEM_PROMPT_EN;

  // Build system as cached content blocks for prompt caching.
  // Block 1: static base prompt — identical for all users per language (always cached).
  // Block 2: per-session stable context (garden, memory, tasks) — cached per user session.
  //          Byte-stable because chupchu.ts caches the assembled string for 1h server-side.
  // Block 3: volatile context (past summary, date, weather) — NOT cached; changes every request.
  // Both cached blocks use ttl:'1h' to survive sporadic gardening-app usage patterns.
  type TextBlock = { type: 'text'; text: string; cache_control?: CacheControlExtended };
  const systemBlocks: TextBlock[] = [
    { type: 'text', text: basePrompt, cache_control: { type: 'ephemeral', ttl: '1h' } },
  ];
  if (stableContext) {
    systemBlocks.push({ type: 'text', text: stableContext, cache_control: { type: 'ephemeral', ttl: '1h' } });
  }
  if (volatileContext) {
    systemBlocks.push({ type: 'text', text: volatileContext });
  }

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

  // Image turns always use the full vision model.
  // Text-only turns use CHAT_TEXT_MODEL (default = MODEL; set CHAT_TEXT_MODEL env var for Haiku).
  const modelToUse = image ? VISION_MODEL : CHAT_TEXT_MODEL;
  // Haiku is faster and cheaper but doesn't need 6 000-token headroom — 2 000 is ample.
  const maxTokens  = !image && CHAT_TEXT_MODEL.toLowerCase().includes('haiku') ? 2000 : 6000;

  // Accumulates text blocks emitted alongside tool_use blocks so they are
  // not lost when the loop continues to the next iteration.
  const accumulatedTextSegments: string[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = (await axios.post(ANTHROPIC_URL, {
      model: modelToUse,
      max_tokens: maxTokens,
      system: systemBlocks,
      tools: CHUPCHU_TOOLS,
      messages: apiMessages,
    }, { headers: ANTHROPIC_HEADERS, timeout: 90000 })).data;
    console.log('[Chupchu] tokens:', {
      input:          response.usage?.input_tokens,
      output:         response.usage?.output_tokens,
      cache_creation: response.usage?.cache_creation_input_tokens,
      cache_read:     response.usage?.cache_read_input_tokens,
    });
    console.log('[Chupchu] stop_reason:', response.stop_reason,
      'tools:', (response.content || []).filter((b: any) => b.type === 'tool_use').map((b: any) => b.name));
    // Persist real token data — fire-and-forget, never blocks the chat response
    void logApiUsage({ userId, endpoint: 'chupchu_chat', model: modelToUse, usage: response.usage });

    if (response.stop_reason === 'end_turn') {
      const finalText = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n\n');
      const segments = [...accumulatedTextSegments];
      if (finalText) segments.push(finalText);
      const responseText = segments.length > 0
        ? segments.join('\n\n')
        : capturedTasks && capturedTasks.length > 0
          ? '💡 רוצה שאוסיף את התוכנית הזו למשימות שלך? לחץ על הכפתור למטה 🗓️'
          : null;
      if (!responseText) throw new Error('No text response from Claude');
      return { response: responseText, proposedTasks: capturedTasks, mobileTool: capturedMobileTool };
    }

    if (response.stop_reason === 'tool_use') {
      // Capture any text blocks emitted in this turn before continuing the loop.
      const turnText = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n\n');
      if (turnText) accumulatedTextSegments.push(turnText);

      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
          .map(async b => {
            // Mobile voice tools — capture for client confirmation, don't execute yet
            const MOBILE_TOOLS = ['create_task', 'log_bd_prep'] as const;
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
                content: JSON.stringify({
                  pending_confirmation: true,
                  saved: false,
                  written_to_database: false,
                  note: 'NOTHING HAS BEEN SAVED. A confirmation card was shown to the user. The entry is written only after the user taps the button in the app. In your reply: tell the user you have prepared the entry and ask them to confirm it. Do NOT claim it was recorded or saved. For biodynamic preparations the required Hebrew term is פרפרט — never הכנה, never תכשיר.',
                }),
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

            if (b.name === 'get_bd_prep_history') {
              const prepFilter = (b.input as { prep_name?: string }).prep_name?.trim() || null;
              try {
                if (!userId) {
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: b.id,
                    content: JSON.stringify({ error: 'User not authenticated — cannot resolve garden.' }),
                  };
                }
                const { gardenId: histGardenId, reason: histReason } = await resolveGardenId(userId);
                if (!histGardenId) {
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: b.id,
                    content: JSON.stringify({ error: `Cannot resolve garden: ${histReason}. No prep history available.` }),
                  };
                }

                const baseQ = db
                  .from('garden_timeline')
                  .select('prep_name, event_date')
                  .eq('garden_id', histGardenId)
                  .eq('event_type', 'bd_prep')
                  .is('deleted_at', null)
                  .order('event_date', { ascending: false })
                  .limit(60);

                const { data: histRows, error: histError } = await (
                  prepFilter ? baseQ.eq('prep_name', prepFilter) : baseQ
                );

                if (histError) {
                  console.error('[get_bd_prep_history] DB error:', histError.message, histError.code);
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: b.id,
                    content: JSON.stringify({ error: 'Database error reading prep history. Do not treat this as "never applied".' }),
                  };
                }

                const rows = (histRows ?? []) as { prep_name: string | null; event_date: string }[];

                if (rows.length === 0) {
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: b.id,
                    content: JSON.stringify({ note: 'No biodynamic prep applications found in this garden.', records: {} }),
                  };
                }

                // Dedup: keep the most recent row per prep_name (rows already ordered desc by event_date).
                const seen = new Set<string>();
                const deduped: { prep_name: string | null; event_date: string }[] = [];
                for (const row of rows) {
                  const key = row.prep_name ?? '';
                  if (!seen.has(key)) {
                    seen.add(key);
                    deduped.push(row);
                  }
                }

                // Use todayInIsrael() — not new Date() — to avoid UTC midnight off-by-one between
                // 00:00–03:00 Israel time when the server runs in UTC.
                const todayStr = todayInIsrael();
                const todayMs  = new Date(todayStr).getTime();

                const records: Record<string, { last_applied: string; days_ago: number }> = {};
                for (const row of deduped) {
                  const key     = row.prep_name ?? 'unknown';
                  const daysAgo = Math.round((todayMs - new Date(row.event_date).getTime()) / 86_400_000);
                  records[key]  = { last_applied: row.event_date, days_ago: daysAgo };
                }

                return {
                  type: 'tool_result' as const,
                  tool_use_id: b.id,
                  content: JSON.stringify(records),
                };
              } catch (err: any) {
                console.error('[get_bd_prep_history] unexpected error:', err.message);
                return {
                  type: 'tool_result' as const,
                  tool_use_id: b.id,
                  content: JSON.stringify({ error: 'Unexpected error reading prep history. Do not treat this as "never applied".' }),
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
