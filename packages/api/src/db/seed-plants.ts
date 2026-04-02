import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const plants = [
  // ── VEGETABLES ──────────────────────────────────────────────────────────
  { common_name_he: 'עגבנייה', common_name_en: 'Tomato', latin_name: 'Solanum lycopersicum', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [2,3,4], harvest_months_israel: [6,7,8,9], description_he: 'ירק פרי פופולרי ביותר בגינה הישראלית. אוהב שמש מלאה וגדל היטב באדמה עשירה ומנוקזת. מומלץ לשתול ביום פרי על פי הלוח הביודינמי.' },
  { common_name_he: 'פלפל', common_name_en: 'Pepper', latin_name: 'Capsicum annuum', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [2,3,4], harvest_months_israel: [7,8,9,10], description_he: 'ירק פרי עשיר בויטמין C. גדל היטב בחום הישראלי ואוהב שמש מלאה. קיים במגוון צבעים וחריפויות.' },
  { common_name_he: 'מלפפון', common_name_en: 'Cucumber', latin_name: 'Cucumis sativus', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [3,4,5], harvest_months_israel: [6,7,8,9], description_he: 'ירק מרענן המתאים לאקלים הישראלי. גדל מהר וזקוק לתמיכה לטיפוס. מומלץ לקצור בבוקר לטריות מרבית.' },
  { common_name_he: 'קישוא', common_name_en: 'Zucchini', latin_name: 'Cucurbita pepo', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [3,4,5], harvest_months_israel: [6,7,8,9], description_he: 'ירק פורה ומהיר גידול. עלעלים גדולים מספקים צל לאדמה. כדאי לקצור כשהפרי קטן לטעם מיטבי.' },
  { common_name_he: 'חציל', common_name_en: 'Eggplant', latin_name: 'Solanum melongena', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [3,4], harvest_months_israel: [7,8,9,10], description_he: 'ירק אהוב במטבח הים-תיכוני. אוהב חום ושמש. הפרחים הסגולים יפים גם לנוי.' },
  { common_name_he: 'גזר', common_name_en: 'Carrot', latin_name: 'Daucus carota', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11,2,3], harvest_months_israel: [1,2,3,4,5,6], description_he: 'ירק שורש עשיר בבטא קרוטן. אוהב אדמה רופפת ועמוקה ללא אבנים. קצור ביום שורש לתוצאות הטובות ביותר.' },
  { common_name_he: 'בצל', common_name_en: 'Onion', latin_name: 'Allium cepa', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11], harvest_months_israel: [4,5,6], description_he: 'ירק יסוד במטבח הישראלי. שתול בסתיו ונקצר באביב. הוא גם מרחיק מזיקים מגינת הירק.' },
  { common_name_he: 'שום', common_name_en: 'Garlic', latin_name: 'Allium sativum', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [10,11,12], harvest_months_israel: [5,6], description_he: 'תבלין ורפואה בבת אחת. שתול בחורף ונקצר בסוף האביב. ריחו מרחיק מזיקים רבים.' },
  { common_name_he: 'חסה', common_name_en: 'Lettuce', latin_name: 'Lactuca sativa', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11,2,3], harvest_months_israel: [11,12,1,2,3,4,5], description_he: 'ירק עלים מהיר גידול ומתאים לגינה קטנה. אוהב טמפרטורות מתונות ומוצל חלקי בקיץ. מתאים לגידול בעציצים.' },
  { common_name_he: 'תרד', common_name_en: 'Spinach', latin_name: 'Spinacia oleracea', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11,2,3], harvest_months_israel: [11,12,1,2,3,4], description_he: 'עשיר בברזל וויטמינים. גדל בחורף הישראלי. עלים רכים מתאימים לסלט ולבישול.' },
  { common_name_he: 'כרוב ירוק', common_name_en: 'Kale', latin_name: 'Brassica oleracea var. sabellica', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11], harvest_months_israel: [12,1,2,3,4], description_he: 'סופרפוד עתיר ויטמינים. עמיד בחורף ומתחזק אחרי קריאות. אחד הירקות הבריאים ביותר לגינה.' },
  { common_name_he: 'ברוקולי', common_name_en: 'Broccoli', latin_name: 'Brassica oleracea var. italica', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10], harvest_months_israel: [12,1,2,3], description_he: 'ירק חורפי עשיר בנוגדי חמצון. שתול בסתיו לקציר בחורף. אחרי קציר הראש המרכזי צומחות פנינות קטנות.' },
  { common_name_he: 'כרובית', common_name_en: 'Cauliflower', latin_name: 'Brassica oleracea var. botrytis', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10], harvest_months_israel: [12,1,2,3], description_he: 'ירק חורפי עדין. כסה את הראש הלבן בעלים להגנה מהשמש. דורש אדמה פורייה ועשירה.' },
  { common_name_he: 'כרוב לבן', common_name_en: 'Cabbage', latin_name: 'Brassica oleracea var. capitata', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10], harvest_months_israel: [12,1,2,3], description_he: 'ירק חורפי רב שימון. קוצרים כשהראש מוצק למגע. מתאים לכבישה ולבישול.' },
  { common_name_he: 'סלרי', common_name_en: 'Celery', latin_name: 'Apium graveolens', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11], harvest_months_israel: [1,2,3,4], description_he: 'ירק עלים תובעני הדורש השקיה סדירה. אוהב אדמה לחה ועשירה. גם העלים וגם הגבעולים שימוןיים.' },
  { common_name_he: 'כרישה', common_name_en: 'Leek', latin_name: 'Allium ampeloprasum', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11], harvest_months_israel: [1,2,3,4], description_he: 'בן משפחת הבצל עם טעם עדין יותר. גדל לאורך החורף. שתול עמוק לגבעול לבן ארוך.' },
  { common_name_he: 'סלק', common_name_en: 'Beetroot', latin_name: 'Beta vulgaris', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11,2,3], harvest_months_israel: [12,1,2,3,4,5,6], description_he: 'ירק שורש צבעוני עשיר בנוגדי חמצון. גם השורש וגם העלים אכילים. קצור ביום שורש.' },
  { common_name_he: 'צנונית', common_name_en: 'Radish', latin_name: 'Raphanus sativus', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11,2,3,4], harvest_months_israel: [11,12,1,2,3,4,5,6], description_he: 'ירק שורש מהיר ביותר — מוכן תוך 3-4 שבועות. מצוין כיבול ראשון למתחילים. זורעים בהדגמה.' },
  { common_name_he: 'לפת', common_name_en: 'Turnip', latin_name: 'Brassica rapa', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11], harvest_months_israel: [12,1,2,3], description_he: 'ירק שורש חורפי עם טעם מעט חריף. גם השורש וגם העלים אכילים. גדל מהר ועמיד לקור.' },
  { common_name_he: 'פסטרנק', common_name_en: 'Parsnip', latin_name: 'Pastinaca sativa', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [10,11], harvest_months_israel: [1,2,3], description_he: 'ירק שורש לבן עם טעם מתוק. מתאים לאקלים הרים. הטעם משתבח אחרי חשיפה לקור.' },
  { common_name_he: 'תפוח אדמה', common_name_en: 'Potato', latin_name: 'Solanum tuberosum', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [1,2,3,10,11], harvest_months_israel: [4,5,6,7], description_he: 'ירק שורש בסיסי. שתול בגבעות אדמה ורדד מדי פעם. קצור כשהעלים מתייבשים.' },
  { common_name_he: 'בטטה', common_name_en: 'Sweet Potato', latin_name: 'Ipomoea batatas', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [4,5], harvest_months_israel: [9,10,11], description_he: 'ירק שורש קיצי אהוב. גדל בחום. הצמח מכסה את הקרקע ומדכא עשבים.' },
  { common_name_he: 'תירס', common_name_en: 'Corn', latin_name: 'Zea mays', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [3,4,5], harvest_months_israel: [7,8,9], description_he: 'דגן קיצי הזקוק לשטח. שתול בגושים לאבקה טובה. קצור כשהמשי חום ויבש.' },
  { common_name_he: 'אפונה', common_name_en: 'Peas', latin_name: 'Pisum sativum', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [10,11,12,1,2], harvest_months_israel: [2,3,4,5], description_he: 'קטנייה חורפית מקבעת חנקן באדמה. גדל על גדר או תמיכה. קציר תכוף מעודד יצור.' },
  { common_name_he: 'שעועית', common_name_en: 'Beans', latin_name: 'Phaseolus vulgaris', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [3,4,5,6], harvest_months_israel: [6,7,8,9], description_he: 'קטנייה קיצית מועילה לאדמה. שתול ישירות לאדמה ואל תשתול תחת עגבניות.' },
  { common_name_he: 'פול', common_name_en: 'Broad Beans', latin_name: 'Vicia faba', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [10,11,12], harvest_months_israel: [3,4,5], description_he: 'קטנייה חורפית גדולה. אחת הצמחים הראשונים שנזרעים בסתיו. מקבע חנקן ומשפר את האדמה.' },
  { common_name_he: 'ארטישוק', common_name_en: 'Artichoke', latin_name: 'Cynara cardunculus', category: 'vegetables', day_type_affinity: ['flower'], sowing_months_israel: [9,10], harvest_months_israel: [3,4,5], description_he: 'ירק שנתי רב שנתי יפהפה. הפרחים הסגולים מפהפיים. קוצרים לפני פריחה לאכילה.' },
  { common_name_he: 'שומר', common_name_en: 'Fennel', latin_name: 'Foeniculum vulgare', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,3,4], harvest_months_israel: [12,1,2,3,4,5], description_he: 'ירק תיבולי ארומטי עם טעם אניס. גם הפקעת, העלים והזרעים שימוןיים. נשמר לאורך זמן.' },
  { common_name_he: 'כרוב ניצנים', common_name_en: 'Kohlrabi', latin_name: 'Brassica oleracea var. gongylodes', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11], harvest_months_israel: [12,1,2,3], description_he: 'ירק חורפי מיוחד עם מרקם פציח. קוצרים כשהגבעול בגודל תפוח. מתאים לאכילה חי וצלוי.' },
  { common_name_he: 'מנגולד', common_name_en: 'Swiss Chard', latin_name: 'Beta vulgaris subsp. cicla', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,3,4], harvest_months_israel: [11,12,1,2,3,4,5,6], description_he: 'ירק עלים עמיד ופורה. גבעולים צבעוניים מוסיפים נוי לגינה. קצור עלים חיצוניים לקציר מתמשך.' },
  { common_name_he: 'רוקט', common_name_en: 'Rocket', latin_name: 'Eruca vesicaria', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11,2,3,4], harvest_months_israel: [11,12,1,2,3,4,5], description_he: 'ירק עלים חריף ומריר. מהיר גידול ועמיד. קוצרים עלים צעירים לטעם מיטבי.' },
  { common_name_he: 'עולש', common_name_en: 'Endive', latin_name: 'Cichorium endivia', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11], harvest_months_israel: [12,1,2,3], description_he: 'ירק עלים חורפי עם טעם מריר עדין. מלבין חלק מהעלים להפחתת המרירות.' },
  { common_name_he: 'דלעת', common_name_en: 'Pumpkin', latin_name: 'Cucurbita maxima', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [4,5], harvest_months_israel: [9,10,11], description_he: 'ירק פרי גדול ומרשים. זקוק לשטח נרחב. מאוחסן חודשים ארוכים לאחר הקציר.' },
  { common_name_he: 'אבטיח', common_name_en: 'Watermelon', latin_name: 'Citrullus lanatus', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [4,5], harvest_months_israel: [7,8,9], description_he: 'פרי קיצי ישראלי קלאסי. זקוק לחום ושטח. בישול בגינה ביתית מפתיע בטעמו.' },
  { common_name_he: 'מלון', common_name_en: 'Melon', latin_name: 'Cucumis melo', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [4,5], harvest_months_israel: [7,8,9], description_he: 'פרי קיצי מתוק ומרענן. גדל היטב בחום הישראלי. ריח מתוק מסמן בשלות.' },
  { common_name_he: 'תות שדה', common_name_en: 'Strawberry', latin_name: 'Fragaria ananassa', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [9,10], harvest_months_israel: [2,3,4,5], description_he: 'פרי חורפי אהוב. שתול בחורף ונקצר באביב. מצוין לגידול בעציצים ובמרפסות.' },
  { common_name_he: 'במיה', common_name_en: 'Okra', latin_name: 'Abelmoschus esculentus', category: 'vegetables', day_type_affinity: ['fruit'], sowing_months_israel: [4,5,6], harvest_months_israel: [7,8,9,10], description_he: 'ירק טרופי אהוב במטבח הישראלי. גדל בחום קיצי. קוצרים כל יומיים לתרמילים רכים.' },
  { common_name_he: 'אספרגוס', common_name_en: 'Asparagus', latin_name: 'Asparagus officinalis', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [2,3], harvest_months_israel: [3,4,5], description_he: 'ירק רב שנתי המניב לאורך עשרות שנים. דורש סבלנות בשנות ההקמה. קציר האביב מרענן.' },
  { common_name_he: 'פאק צ\'וי', common_name_en: 'Bok Choy', latin_name: 'Brassica rapa subsp. chinensis', category: 'vegetables', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11,2,3], harvest_months_israel: [11,12,1,2,3,4,5], description_he: 'ירק עלים אסייתי מהיר גידול. גדל היטב בחורף הישראלי. כל הצמח אכיל.' },
  { common_name_he: 'בצל ירוק', common_name_en: 'Spring Onion', latin_name: 'Allium fistulosum', category: 'vegetables', day_type_affinity: ['root'], sowing_months_israel: [9,10,11,2,3,4], harvest_months_israel: [11,12,1,2,3,4,5,6], description_he: 'ירק קל גידול ומהיר. קוצרים כשהגבעול עדיין ירוק. מצוין לגינת ילדים.' },

  // ── HERBS ────────────────────────────────────────────────────────────────
  { common_name_he: 'ריחן', common_name_en: 'Basil', latin_name: 'Ocimum basilicum', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [3,4,5], harvest_months_israel: [5,6,7,8,9,10], description_he: 'עשב תיבול אהוב ריחני. אוהב חום ושמש מלאה. קצץ פרחים לעידוד גידול עלים.' },
  { common_name_he: 'פטרוזיליה', common_name_en: 'Parsley', latin_name: 'Petroselinum crispum', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [11,12,1,2,3,4,5,6], description_he: 'עשב תיבול יסוד במטבח הישראלי. גדל היטב בחורף. קצור עלים חיצוניים לגידול מתמשך.' },
  { common_name_he: 'כוסברה', common_name_en: 'Cilantro', latin_name: 'Coriandrum sativum', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [11,12,1,2,3,4,5], description_he: 'עשב תיבול אהוב במטבח המזרחי. גדל מהר וזורה זרעים. קצור לפני פריחה לטעם מיטבי.' },
  { common_name_he: 'נענע', common_name_en: 'Mint', latin_name: 'Mentha spicata', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [4,5,6,7,8,9,10,11], description_he: 'עשב תיבול פולש ונפוץ. עדיף לגדל בעציץ כדי לשלוט בהתפשטות. ריחני ומרענן.' },
  { common_name_he: 'מרווה', common_name_en: 'Sage', latin_name: 'Salvia officinalis', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [4,5,6,7,8,9,10], description_he: 'עשב תיבול רב שנתי עם עלים כסופים יפים. עמיד בצורת. הפרחים הסגולים מוןכים דבורים.' },
  { common_name_he: 'רוזמרין', common_name_en: 'Rosemary', latin_name: 'Salvia rosmarinus', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [1,2,3,4,5,6,7,8,9,10,11,12], description_he: 'עשב תיבול עמיד בצורת ורב שנתי. קנה יפה וגדל להיות שיח. ריחו חזק ומרחיק חרקים.' },
  { common_name_he: 'טימין', common_name_en: 'Thyme', latin_name: 'Thymus vulgaris', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [1,2,3,4,5,6,7,8,9,10,11,12], description_he: 'עשב תיבול ים-תיכוני קלאסי. עמיד מאוד לצורת ולחום. הפרחים הקטנים מוןכים דבורים.' },
  { common_name_he: 'אורגנו', common_name_en: 'Oregano', latin_name: 'Origanum vulgare', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [4,5,6,7,8,9,10], description_he: 'עשב תיבול פיצה קלאסי. גדל היטב בתנאי ים תיכון. כובש שטח ומצוין לגבול גינה.' },
  { common_name_he: 'לבנדר', common_name_en: 'Lavender', latin_name: 'Lavandula angustifolia', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [5,6,7], description_he: 'צמח תיבולי ונוי ריחני. אוהב אדמה מנוקזת וסלעית. הפרחים הסגולים מוןכים פרפרים ודבורים.' },
  { common_name_he: 'קמומיל', common_name_en: 'Chamomile', latin_name: 'Matricaria chamomilla', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [3,4,5,6], description_he: 'צמח מרפא עם פרחים לבנים קטנים. זורע עצמו ומתפשט בנחת. הפרחים משמשים לתה מרגיע.' },
  { common_name_he: 'לואיזה', common_name_en: 'Lemon Verbena', latin_name: 'Aloysia citrodora', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [3,4,5], harvest_months_israel: [5,6,7,8,9,10], description_he: 'שיח ריחני עם ריח לימון נפלא. מכין תה מרענן. גדל ומתפתח לשיח יפה לאורך שנים.' },
  { common_name_he: 'שמיר', common_name_en: 'Dill', latin_name: 'Anethum graveolens', category: 'herbs', day_type_affinity: ['flower'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [11,12,1,2,3,4,5], description_he: 'עשב תיבול לחמוצים וסלטים. גדל מהר וזורה זרעים. עלעלי הנוצה עדינים ויפים.' },
  { common_name_he: 'עירית', common_name_en: 'Chives', latin_name: 'Allium schoenoprasum', category: 'herbs', day_type_affinity: ['root'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [1,2,3,4,5,6,7,8,9,10,11,12], description_he: 'עשב תיבול קל גידול ורב שנתי. חוצצים מיניות. קציר תכוף מעודד גידול.' },
  { common_name_he: 'טרגון', common_name_en: 'Tarragon', latin_name: 'Artemisia dracunculus', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [3,4], harvest_months_israel: [5,6,7,8,9,10], description_he: 'עשב תיבול צרפתי עם טעם אניס עדין. משמש במטבח גורמה. גדל ממנחים לא מזרעים.' },
  { common_name_he: 'דפנה', common_name_en: 'Bay Leaf', latin_name: 'Laurus nobilis', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [3,4], harvest_months_israel: [1,2,3,4,5,6,7,8,9,10,11,12], description_he: 'עץ תיבול ים-תיכוני קלאסי. גדל לעץ יפה לאורך שנים. עלים טריים ויבשים שימוןיים בבישול.' },
  { common_name_he: 'ליים גראס', common_name_en: 'Lemongrass', latin_name: 'Cymbopogon citratus', category: 'herbs', day_type_affinity: ['leaf'], sowing_months_israel: [4,5], harvest_months_israel: [7,8,9,10], description_he: 'דשא ריחני טרופי עם ריח לימון. מרחיק יתושים. קוצרים את הבסיס הלבן לבישול.' },

  // ── FRUIT TREES ──────────────────────────────────────────────────────────
  { common_name_he: 'זית', common_name_en: 'Olive', latin_name: 'Olea europaea', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [11,12,1,2,3], harvest_months_israel: [10,11,12], description_he: 'עץ הסמל של ארץ ישראל. עמיד לצורת ולחום. מניב פרות אחרי מספר שנים ולאורך מאות שנים.' },
  { common_name_he: 'תאנה', common_name_en: 'Fig', latin_name: 'Ficus carica', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3,4], harvest_months_israel: [7,8,9,10], description_he: 'עץ פרי ישראלי קלאסי. נובל בחורף ופורח מחדש באביב. מניב פירות מתוקים ועסיסיים.' },
  { common_name_he: 'רימון', common_name_en: 'Pomegranate', latin_name: 'Punica granatum', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3,4], harvest_months_israel: [9,10,11], description_he: 'עץ פרי עתיק ומיוחד. פרחים כתומים יפים. הפרות עשירים בנוגדי חמצון.' },
  { common_name_he: 'לימון', common_name_en: 'Lemon', latin_name: 'Citrus limon', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [3,4], harvest_months_israel: [11,12,1,2,3,4], description_he: 'עץ הדר פורה ומועיל. מניב לאורך כל השנה. אוהב שמש מלאה ואדמה מנוקזת.' },
  { common_name_he: 'תפוז', common_name_en: 'Orange', latin_name: 'Citrus sinensis', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [3,4], harvest_months_israel: [12,1,2,3], description_he: 'עץ הדר ישראלי קלאסי. הפרחים הלבנים ריחניים. הפרות עסיסיים ומתוקים בחורף.' },
  { common_name_he: 'אשכולית', common_name_en: 'Grapefruit', latin_name: 'Citrus paradisi', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [3,4], harvest_months_israel: [11,12,1,2,3], description_he: 'עץ הדר גדול עם פרות כבדים. אוהב אקלים חמים. הפרות בשלים לאט ונשארים על העץ.' },
  { common_name_he: 'אבוקדו', common_name_en: 'Avocado', latin_name: 'Persea americana', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [3,4,5], harvest_months_israel: [10,11,12,1,2], description_he: 'עץ טרופי אהוב. גדל לעץ גדול. הפרות נשארים על העץ ובשלים לאחר הקטיף.' },
  { common_name_he: 'תפוח', common_name_en: 'Apple', latin_name: 'Malus domestica', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3], harvest_months_israel: [8,9,10], description_he: 'עץ פרי מסורתי. מתאים לאזורי הרים בישראל. דורש שעות קור לפריחה טובה.' },
  { common_name_he: 'אגס', common_name_en: 'Pear', latin_name: 'Pyrus communis', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3], harvest_months_israel: [8,9,10], description_he: 'עץ פרי עדין. מתאים לאזורי הרים. הפרות בשלים לאחר הקטיף בטמפרטורה רגילה.' },
  { common_name_he: 'אפרסק', common_name_en: 'Peach', latin_name: 'Prunus persica', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3], harvest_months_israel: [6,7,8], description_he: 'עץ פרי מתוק. פורח יפה בסתיו. דורש שעות קור ועבודת גיזום.' },
  { common_name_he: 'משמש', common_name_en: 'Apricot', latin_name: 'Prunus armeniaca', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3], harvest_months_israel: [5,6,7], description_he: 'עץ פרי מוקדם. פרחים לבנים יפים. הפרות כתומים ומתוקים בסוף האביב.' },
  { common_name_he: 'שזיף', common_name_en: 'Plum', latin_name: 'Prunus domestica', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3], harvest_months_israel: [6,7,8], description_he: 'עץ פרי יפה עם פרות סגולים. פורח מוקדם באביב. פרות שימוןיים לריבה ולאכילה טרייה.' },
  { common_name_he: 'גפן', common_name_en: 'Grape', latin_name: 'Vitis vinifera', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [2,3], harvest_months_israel: [8,9,10], description_he: 'גפן ארץ ישראלית קלאסית. מספקת צל בקיץ ומתקשטת בסתיו. מיפן לאכילה ולהכנת יין.' },
  { common_name_he: 'תמר', common_name_en: 'Date Palm', latin_name: 'Phoenix dactylifera', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [3,4,5], harvest_months_israel: [9,10,11], description_he: 'עץ ישראלי קדום ומיוחד. גדל לגובה רב. הפרות המתוקים מבשילים בסתיו החם.' },
  { common_name_he: 'בננה', common_name_en: 'Banana', latin_name: 'Musa acuminata', category: 'fruit_trees', day_type_affinity: ['fruit'], sowing_months_israel: [4,5], harvest_months_israel: [9,10,11,12], description_he: 'עץ טרופי גדול. גדל באזורים חמים של ישראל. עלים גדולים נותנים מראה טרופי לגינה.' },

  // ── FLOWERS ──────────────────────────────────────────────────────────────
  { common_name_he: 'חמנייה', common_name_en: 'Sunflower', latin_name: 'Helianthus annuus', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4,5], harvest_months_israel: [7,8,9], description_he: 'פרח שמח ומרשים. עוקב אחר השמש. מוןך ציפורים ודבורים לגינה.' },
  { common_name_he: 'טגטס', common_name_en: 'Marigold', latin_name: 'Tagetes erecta', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [5,6,7,8,9,10,11], description_he: 'פרח כתום בהיר מרחיק מזיקים. מצוין כצמח לוואי לעגבניות. פורח לאורך עונה ארוכה.' },
  { common_name_he: 'זיניה', common_name_en: 'Zinnia', latin_name: 'Zinnia elegans', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4,5], harvest_months_israel: [6,7,8,9,10], description_he: 'פרח קיצי צבעוני. גדל מהר מזריעה ישירה. מוןך פרפרים לגינה.' },
  { common_name_he: 'נסטורציום', common_name_en: 'Nasturtium', latin_name: 'Tropaeolum majus', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [11,12,1,2,3,4,5], description_he: 'פרח אכיל עם עלים וצורות עגולות. מוסיף צבע לסלטים. גדל ממש בקלות.' },
  { common_name_he: 'בוראג\'', common_name_en: 'Borage', latin_name: 'Borago officinalis', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [9,10,2,3], harvest_months_israel: [12,1,2,3,4,5], description_he: 'פרח כחול יפה הנמשך לדבורים. פרחים אכילים עם טעם מלפפון. מסייע לתרבית פלפלים.' },
  { common_name_he: 'קלנדולה', common_name_en: 'Calendula', latin_name: 'Calendula officinalis', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [9,10,11], harvest_months_israel: [12,1,2,3,4,5], description_he: 'פרח מרפא כתום ויפה. עמיד בקור. עלי הכותרת שימוןיים לסלטים ולמשחות.' },
  { common_name_he: 'קוסמוס', common_name_en: 'Cosmos', latin_name: 'Cosmos bipinnatus', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4,5], harvest_months_israel: [6,7,8,9,10], description_he: 'פרח קיצי עדין ומרשים. גדל גבוה ומתנדנד ברוח. מוןך חרקים מועילים.' },
  { common_name_he: 'דליה', common_name_en: 'Dahlia', latin_name: 'Dahlia pinnata', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4], harvest_months_israel: [7,8,9,10], description_he: 'פרח מפואר עם פרחים גדולים ועשירים. גדל מפקעות. מגוון עצום של צבעים וצורות.' },
  { common_name_he: 'ורד', common_name_en: 'Rose', latin_name: 'Rosa', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [11,12,1,2], harvest_months_israel: [3,4,5,6,7,8,9,10], description_he: 'מלכת הפרחים. פורח לאורך עונה ארוכה. דורש גיזום ידע אך מתגמל ביופיו.' },
  { common_name_he: 'גרניום', common_name_en: 'Geranium', latin_name: 'Pelargonium', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [3,4,5,6,7,8,9,10,11], description_he: 'פרח נוי ריחני עמיד לחום. מצוין לעציצים ולמרפסות. מרחיק יתושים בריחו.' },
  { common_name_he: 'פטוניה', common_name_en: 'Petunia', latin_name: 'Petunia hybrida', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10], harvest_months_israel: [4,5,6,7,8,9,10,11], description_he: 'פרח נוי צבעוני לעציצים ולמרפסות. פורח ללא הפסקה. מגיב לדישון סדיר.' },
  { common_name_he: 'לוע הארי', common_name_en: 'Snapdragon', latin_name: 'Antirrhinum majus', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [9,10,11], harvest_months_israel: [12,1,2,3,4,5], description_he: 'פרח חורפי מרשים. עמוד פרחים גבוה וצבעוני. מצוין לחיתוך ולעיטור.' },
  { common_name_he: 'אפונת ריח', common_name_en: 'Sweet Pea', latin_name: 'Lathyrus odoratus', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [10,11,12], harvest_months_israel: [2,3,4,5], description_he: 'פרח מטפס ריחני נפלא. נטפס על גדר או סייג. ריחו מקסים ומספק.' },
  { common_name_he: 'דגניות', common_name_en: 'Cornflower', latin_name: 'Centaurea cyanus', category: 'flowers', day_type_affinity: ['flower'], sowing_months_israel: [10,11,12], harvest_months_israel: [2,3,4,5], description_he: 'פרח שדה כחול קלאסי. גדל מזריעה ישירה. מוןך חרקים מועילים ומקשט את הגינה.' },
];

async function seedPlants() {
  console.log(`🌱 Seeding ${plants.length} plants...`);

  // Delete existing plants first to avoid conflicts
  const { error: deleteError } = await supabase
    .from('plants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteError) {
    console.error('Delete error:', deleteError.message);
  }

  // Insert in batches of 20
  const batchSize = 20;
  let inserted = 0;

  for (let i = 0; i < plants.length; i += batchSize) {
    const batch = plants.slice(i, i + batchSize);
    const { error } = await supabase.from('plants').insert(batch);

    if (error) {
      console.error(`Batch ${i}–${i + batchSize} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`✓ Inserted ${inserted}/${plants.length} plants`);
    }
  }

  console.log(`\n✅ Done! ${inserted} plants seeded.`);
  process.exit(0);
}

seedPlants().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
