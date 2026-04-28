import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const plants = [
  // ── House Plants ──────────────────────────────────────────────
  {
    common_name_en: 'Aloe Vera', common_name_he: 'אלוורה',
    latin_name: 'Aloe barbadensis miller', category: 'medicinal', emoji: '🌵',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,5,9,10],
    companion_plants: ['Lavender', 'Rosemary'],
    description_en: 'A succulent widely used for its medicinal properties. The gel soothes burns, wounds, and skin irritations. Also used internally for digestive health and immune support.',
    description_he: 'צמח בשרני בעל סגולות רפואיות ידועות. הג\'ל בעליו מרגיע כוויות, פצעים וגירויי עור. משמש גם לשיפור עיכול ותמיכה במערכת החיסון.',
  },
  {
    common_name_en: 'Peace Lily', common_name_he: 'שושן שלום',
    latin_name: 'Spathiphyllum wallisii', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['flower'], sowing_months_israel: [4,5],
    companion_plants: ['Pothos', 'Snake Plant'],
    description_en: 'One of the best air-purifying indoor plants, removing toxins like benzene and formaldehyde. Thrives in low light and produces elegant white flowers.',
    description_he: 'אחד מצמחי הבית הטובים ביותר לטיהור אוויר. מסתדר היטב בתאורה נמוכה ומציצים פרחים לבנים אלגנטיים.',
  },
  {
    common_name_en: 'Snake Plant', common_name_he: 'סנסווירה',
    latin_name: 'Sansevieria trifasciata', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5,9,10],
    companion_plants: ['Pothos', 'ZZ Plant'],
    description_en: 'An extremely hardy houseplant that purifies air and releases oxygen at night. Tolerates low light, drought, and neglect. Used in feng shui for positive energy.',
    description_he: 'צמח בית קשיח במיוחד המטהר אוויר ומשחרר חמצן בלילה. עמיד בפני תאורה נמוכה, בצורת והזנחה.',
  },
  {
    common_name_en: 'Pothos', common_name_he: 'פוטוס',
    latin_name: 'Epipremnum aureum', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,5],
    companion_plants: ['Peace Lily', 'Snake Plant'],
    description_en: 'A trailing vine perfect for beginners with heart-shaped leaves. Excellent air purifier removing carbon monoxide and formaldehyde. Thrives in a wide range of lighting conditions.',
    description_he: 'צמח מטפס מצוין למתחילים עם עלים בצורת לב. מטהר אוויר מצוין המסלק פחמן חד-חמצני ופורמלדהיד.',
  },
  {
    common_name_en: 'Spider Plant', common_name_he: 'צמח עכביש',
    latin_name: 'Chlorophytum comosum', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,5,9],
    companion_plants: ['Pothos', 'Peace Lily'],
    description_en: 'A resilient houseplant producing long arching leaves and small plantlets. One of the most effective plants for removing indoor air pollutants. Safe for pets and children.',
    description_he: 'צמח בית חסון המייצר עלים ארוכים וצאצאים קטנים. אחד הצמחים היעילים ביותר להסרת מזהמי אוויר. בטוח לחיות מחמד וילדים.',
  },
  {
    common_name_en: 'ZZ Plant', common_name_he: 'צמח ZZ',
    latin_name: 'Zamioculcas zamiifolia', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5],
    companion_plants: ['Snake Plant', 'Pothos'],
    description_en: 'A nearly indestructible houseplant with glossy dark green leaves. Stores water in its rhizomes making it extremely drought tolerant. Thrives in low light.',
    description_he: 'צמח בית כמעט בלתי ניתן להשמדה עם עלים ירוקים כהים מבריקים. מאחסן מים בשורשיו ועמיד מאוד לבצורת.',
  },
  {
    common_name_en: 'Monstera', common_name_he: 'מונסטרה',
    latin_name: 'Monstera deliciosa', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5,6],
    companion_plants: ['Pothos', 'Peace Lily'],
    description_en: 'A dramatic tropical plant known for its large split leaves. Extremely popular as an indoor plant. Can produce edible fruit when grown outdoors in tropical climates.',
    description_he: 'צמח טרופי דרמטי הידוע בעליו הגדולים המפוצלים. פופולרי מאוד כצמח בית בזכות מראהו המרשים.',
  },
  {
    common_name_en: 'Rubber Plant', common_name_he: 'פיקוס גומי',
    latin_name: 'Ficus elastica', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5,9],
    companion_plants: ['Snake Plant', 'ZZ Plant'],
    description_en: 'A bold houseplant with large glossy leaves in deep green or burgundy. Very effective at purifying indoor air. More forgiving than Fiddle Leaf Fig.',
    description_he: 'צמח בית נועז עם עלים גדולים ומבריקים בירוק עמוק או בורדו. יעיל מאוד לטיהור אוויר פנימי.',
  },
  {
    common_name_en: 'Fiddle Leaf Fig', common_name_he: 'פיקוס כינור',
    latin_name: 'Ficus lyrata', category: 'house_plant', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5],
    companion_plants: ['Monstera', 'Pothos'],
    description_en: 'A popular statement houseplant with large violin-shaped leaves. Prefers bright indirect light and consistent watering. Rewarding when conditions are right.',
    description_he: 'צמח בית פופולרי עם עלים גדולים בצורת כינור. מעדיף אור עקיף בהיר והשקיה עקבית.',
  },
  // ── Succulents ────────────────────────────────────────────────
  {
    common_name_en: 'Echeveria', common_name_he: 'אכוורייה',
    latin_name: 'Echeveria elegans', category: 'succulent', emoji: '🪴',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Sedum', 'Haworthia'],
    description_en: 'A beautiful rosette-forming succulent with fleshy blue-green leaves. Very drought tolerant and perfect for sunny windowsills and rock gardens.',
    description_he: 'עסיסין יפה יוצר ורד עם עלים בשרניים ירוק-כחלחל. עמיד מאוד לבצורת ומושלם לאדני חלון שמשיים.',
  },
  {
    common_name_en: 'Jade Plant', common_name_he: 'עץ ג\'ייד',
    latin_name: 'Crassula ovata', category: 'succulent', emoji: '🪴',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Aloe Vera', 'Echeveria'],
    description_en: 'A long-lived succulent considered a symbol of good luck and prosperity. Has thick glossy oval leaves on woody stems. Can live for decades and grow into a small tree.',
    description_he: 'עסיסין ארוך חיים הנחשב לסמל מזל טוב ושגשוג. בעל עלים סגלגלים עבים ומבריקים על גבעולים עצייים.',
  },
  {
    common_name_en: 'Haworthia', common_name_he: 'הוורתיה',
    latin_name: 'Haworthia fasciata', category: 'succulent', emoji: '🪴',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Echeveria', 'Aloe Vera'],
    description_en: 'A small compact succulent with striking white striped leaves. One of the best succulents for low-light conditions. Perfect for desks and shelves indoors.',
    description_he: 'עסיסין קטן וקומפקטי עם עלים מפוספסים בלבן מרשימים. אחד העסיסינים הטובים ביותר לתנאי אור נמוך.',
  },
  {
    common_name_en: 'Sedum', common_name_he: 'סדום',
    latin_name: 'Sedum spectabile', category: 'succulent', emoji: '🪴',
    day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Echeveria', 'Lavender'],
    description_en: 'A hardy succulent that attracts butterflies and bees with its late-season blooms. Extremely drought tolerant and thrives in poor well-drained soil.',
    description_he: 'עסיסין קשיח המושך פרפרים ודבורים בפריחותיו המאוחרות. עמיד מאוד לבצורת ומשגשג בקרקע דלה.',
  },
  {
    common_name_en: 'String of Pearls', common_name_he: 'מחרוזת פנינים',
    latin_name: 'Senecio rowleyanus', category: 'succulent', emoji: '🪴',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9],
    companion_plants: ['Echeveria', 'Sedum'],
    description_en: 'A unique trailing succulent with spherical bead-like leaves. Perfect for hanging baskets. Stores water in its round leaves making it very drought tolerant.',
    description_he: 'עסיסין מטפס ייחודי עם עלים כדוריים הדומים לחרוזים. מושלם לסלי תלייה.',
  },
  {
    common_name_en: 'Agave', common_name_he: 'אגבה',
    latin_name: 'Agave americana', category: 'succulent', emoji: '🪴',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5,6],
    companion_plants: ['Aloe Vera', 'Prickly Pear'],
    description_en: 'A dramatic succulent with architectural form and many uses. Sap has traditionally been used for wound healing. Blue agave is the source of tequila and agave syrup.',
    description_he: 'עסיסין דרמטי הידוע בצורתו האדריכלית. המיץ שימש מסורתית לריפוי פצעים. האגבה הכחולה היא מקור הטקילה וסירופ האגבה.',
  },
  // ── Cacti ─────────────────────────────────────────────────────
  {
    common_name_en: 'Golden Barrel Cactus', common_name_he: 'צבר חבית זהב',
    latin_name: 'Echinocactus grusonii', category: 'cactus', emoji: '🌵',
    day_type_affinity: ['root'], sowing_months_israel: [4,5,6],
    companion_plants: ['Aloe Vera', 'Sedum'],
    description_en: 'A striking spherical cactus covered in golden spines. Slow growing but can reach impressive sizes over decades. Very low maintenance and drought tolerant.',
    description_he: 'צבר כדורי מרשים המכוסה בקוצים זהובים. גדל לאט אך יכול להגיע לגדלים מרשימים.',
  },
  {
    common_name_en: 'Prickly Pear', common_name_he: 'צבר',
    latin_name: 'Opuntia ficus-indica', category: 'cactus', emoji: '🌵',
    day_type_affinity: ['fruit'], sowing_months_israel: [4,5,6],
    companion_plants: ['Aloe Vera', 'Agave'],
    description_en: 'A well-known cactus producing edible pads and sweet antioxidant-rich fruits. Medicinal uses include blood sugar regulation and anti-inflammatory effects. A staple in Mediterranean landscapes.',
    description_he: 'צבר ידוע המניב ענפים ופירות מתוקים עשירים בנוגדי חמצון. שימושים רפואיים כוללים ויסות סוכר בדם והשפעות אנטי-דלקתיות.',
  },
  {
    common_name_en: 'Christmas Cactus', common_name_he: 'צבר חג המולד',
    latin_name: 'Schlumbergera bridgesii', category: 'cactus', emoji: '🌵',
    day_type_affinity: ['flower'], sowing_months_israel: [9,10,11],
    companion_plants: ['Peace Lily'],
    description_en: 'A tropical cactus producing stunning pink or red blooms in winter. Unlike desert cacti it prefers humid conditions and indirect light. Long-lived and can bloom for decades.',
    description_he: 'צבר טרופי המניב פרחים ורודים או אדומים מדהימים בחורף. מעדיף תנאים לחים ואור עקיף.',
  },
  {
    common_name_en: 'Bunny Ears Cactus', common_name_he: 'צבר אוזני ארנב',
    latin_name: 'Opuntia microdasys', category: 'cactus', emoji: '🌵',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5,6],
    companion_plants: ['Golden Barrel Cactus', 'Sedum'],
    description_en: 'A charming cactus with flat oval pads covered in soft-looking glochids. Very easy to care for and popular as a decorative indoor plant. Produces yellow flowers in spring.',
    description_he: 'צבר קסום עם פדים סגלגלים שטוחים. קל מאוד לטיפול ופופולרי כצמח קישוט.',
  },
  // ── Medicinal ─────────────────────────────────────────────────
  {
    common_name_en: 'Echinacea', common_name_he: 'אכינצאה',
    latin_name: 'Echinacea purpurea', category: 'medicinal', emoji: '🌸',
    day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Chamomile', 'Lavender', 'Calendula'],
    description_en: 'A powerful immune-boosting herb widely used to prevent and treat colds and flu. Research supports its ability to reduce duration of upper respiratory infections. Also has anti-inflammatory and antioxidant properties.',
    description_he: 'עשב חיזוק חיסוני חזק למניעה וטיפול בהצטננות ושפעת. מחקרים מאשרים יעילותו לקיצור זיהומי דרכי נשימה.',
  },
  {
    common_name_en: 'Valerian', common_name_he: 'ולריאן',
    latin_name: 'Valeriana officinalis', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['root'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Chamomile', 'Lavender'],
    description_en: 'A medicinal herb whose root has been used for centuries as a natural sedative. Widely used for insomnia, anxiety, and stress relief. Modern research confirms efficacy for improving sleep quality.',
    description_he: 'צמח מרפא ששורשו שימש מאות שנים כמרגיע טבעי. משמש לנדודי שינה, חרדה והקלה על מתח.',
  },
  {
    common_name_en: "St. John's Wort", common_name_he: 'היפריקום',
    latin_name: 'Hypericum perforatum', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Lavender', 'Chamomile'],
    description_en: 'A well-researched herb for mild to moderate depression, anxiety, and nerve pain. Its active compound hypericin has antidepressant and antiviral properties. Also used topically for wound healing.',
    description_he: 'צמח מרפא מחקרי לטיפול בדיכאון קל עד בינוני, חרדה וכאב עצבי. החומר הפעיל היפריצין בעל תכונות אנטי-דיכאוניות ואנטי-ויראליות.',
  },
  {
    common_name_en: 'Lemon Balm', common_name_he: 'מליסה',
    latin_name: 'Melissa officinalis', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Mint', 'Chamomile', 'Lavender'],
    description_en: 'A calming herb from the mint family with a gentle lemon scent. Used medicinally for anxiety, sleep disorders, and digestive issues. Effective against cold sores due to its antiviral properties.',
    description_he: 'עשב מרגיע ממשפחת הנענע עם ריח לימון עדין. משמש רפואית לחרדה, הפרעות שינה ובעיות עיכול.',
  },
  {
    common_name_en: 'Peppermint', common_name_he: 'נענע פלפל',
    latin_name: 'Mentha piperita', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,5,9,10],
    companion_plants: ['Chamomile', 'Tomato'],
    description_en: 'One of the most versatile medicinal herbs. Relieves IBS, nausea, and bloating. Peppermint oil relieves tension headaches and muscle pain. Also a natural insect repellent.',
    description_he: 'אחד מצמחי המרפא הרב-תכליתיים ביותר. מקל על IBS, בחילה ונפיחות. שמן נענע פלפל מקל על כאבי ראש וכאבי שרירים.',
  },
  {
    common_name_en: 'Turmeric', common_name_he: 'כורכום',
    latin_name: 'Curcuma longa', category: 'medicinal', emoji: '🟡',
    day_type_affinity: ['root'], sowing_months_israel: [4,5,6],
    companion_plants: ['Ginger', 'Lemongrass'],
    description_en: 'A powerful anti-inflammatory and antioxidant spice. Curcumin is extensively studied for benefits in arthritis, heart disease, and brain health. Used in traditional medicine for thousands of years.',
    description_he: 'תבלין נוגד דלקת ונוגד חמצון חזק. הכורכומין נחקר נרחב לטובת דלקת פרקים, מחלות לב ובריאות המוח.',
  },
  {
    common_name_en: 'Ginger', common_name_he: 'זנגביל',
    latin_name: 'Zingiber officinale', category: 'medicinal', emoji: '🫚',
    day_type_affinity: ['root'], sowing_months_israel: [4,5,6],
    companion_plants: ['Turmeric', 'Lemongrass', 'Chamomile'],
    description_en: 'A root with remarkable medicinal properties used for thousands of years. Highly effective for nausea, morning sickness, and motion sickness. Has anti-inflammatory, antioxidant, and immune-boosting properties.',
    description_he: 'שורש עם סגולות רפואיות מרשימות בשימוש אלפי שנים. יעיל מאוד לבחילה ומחלת נסיעה. בעל תכונות אנטי-דלקתיות ומחזקות חיסון.',
  },
  {
    common_name_en: 'Elderberry', common_name_he: 'סמבוק שחור',
    latin_name: 'Sambucus nigra', category: 'medicinal', emoji: '🫐',
    day_type_affinity: ['fruit'], sowing_months_israel: [3,4,10,11],
    companion_plants: ['Chamomile', 'Echinacea'],
    description_en: 'A medicinal shrub whose berries and flowers have powerful immune-boosting properties. Elderberry syrup reduces flu duration and severity. Rich in antioxidants, vitamins, and anti-inflammatory compounds.',
    description_he: 'שיח מרפא שפירותיו ופרחיו בעלי תכונות חיזוק חיסוני. סירופ סמבוק שחור מפחית משך ועוצמת שפעת.',
  },
  {
    common_name_en: 'Ashwagandha', common_name_he: 'אשווגנדה',
    latin_name: 'Withania somnifera', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['root'], sowing_months_israel: [4,5,6],
    companion_plants: ['Turmeric', 'Ginger'],
    description_en: 'A powerful adaptogenic herb from Ayurvedic medicine. Reduces stress by lowering cortisol levels. Research shows benefits for thyroid function, testosterone, fertility, and brain health.',
    description_he: 'עשב אדפטוגני חזק מהרפואה האיורוודית. מפחית מתח על ידי הורדת קורטיזול. יתרונות לתפקוד בלוטת התריס, טסטוסטרון ובריאות המוח.',
  },
  {
    common_name_en: 'Milk Thistle', common_name_he: 'גדילן מצוי',
    latin_name: 'Silybum marianum', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['flower'], sowing_months_israel: [9,10,11,3,4],
    companion_plants: ['Calendula', 'Chamomile'],
    description_en: 'A medicinal herb with remarkable liver-protecting properties. Silymarin helps regenerate liver cells and protect against toxins. Used for liver disease, hepatitis, and as a liver tonic.',
    description_he: 'צמח מרפא עם תכונות הגנה מרשימות על הכבד. סיליברין מסייע ביצירת תאי כבד חדשים ומגן מפני רעלים.',
  },
  {
    common_name_en: 'Passionflower', common_name_he: 'פסיפלורה',
    latin_name: 'Passiflora incarnata', category: 'medicinal', emoji: '🌸',
    day_type_affinity: ['flower'], sowing_months_israel: [3,4,5],
    companion_plants: ['Lavender', 'Valerian', 'Chamomile'],
    description_en: 'A beautiful climbing plant used medicinally for anxiety and insomnia. Clinical studies show efficacy comparable to some pharmaceutical anti-anxiety drugs. Also used for ADHD and menopausal symptoms.',
    description_he: 'צמח מטפס יפה המשמש לחרדה ונדודי שינה. מחקרים קליניים מראים יעילות דומה לתרופות נגד חרדה.',
  },
  {
    common_name_en: 'Dandelion', common_name_he: 'שן הארי',
    latin_name: 'Taraxacum officinale', category: 'medicinal', emoji: '🌼',
    day_type_affinity: ['leaf'], sowing_months_israel: [9,10,11,3,4],
    companion_plants: ['Chamomile', 'Calendula'],
    description_en: 'Often considered a weed but a powerful medicinal plant. Leaves are rich in vitamins A, C, K and minerals. Used as a diuretic, liver tonic, and digestive aid. Roots roasted as a coffee substitute.',
    description_he: 'נחשב לעשב שוטה אך למעשה צמח מרפא חזק. עלים עשירים בוויטמינים A, C, K. משמש כמשתן, טוניק לכבד וסיוע לעיכול.',
  },
  {
    common_name_en: 'Nettle', common_name_he: 'סרפד',
    latin_name: 'Urtica dioica', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Dandelion', 'Chamomile'],
    description_en: 'A nutrient-dense medicinal plant high in iron, vitamins, and minerals. Used for allergies, arthritis, and enlarged prostate. Young leaves are edible and nutritious when cooked.',
    description_he: 'צמח מרפא עתיר תזונה עשיר בברזל, ויטמינים ומינרלים. משמש לאלרגיות, דלקת פרקים וערמונית מוגדלת.',
  },
  {
    common_name_en: 'Holy Basil (Tulsi)', common_name_he: 'בזיליקום קדוש',
    latin_name: 'Ocimum tenuiflorum', category: 'medicinal', emoji: '🌿',
    day_type_affinity: ['leaf'], sowing_months_israel: [4,5,6],
    companion_plants: ['Ginger', 'Turmeric', 'Chamomile'],
    description_en: 'A sacred adaptogenic herb in Ayurvedic medicine. Reduces stress, balances cortisol, and supports immune function. Benefits for blood sugar, inflammation, anxiety, and respiratory health.',
    description_he: 'עשב אדפטוגני קדוש ברפואה האיורוודית. מפחית מתח, מאזן קורטיזול ותומך בתפקוד החיסוני.',
  },
  {
    common_name_en: 'Yarrow', common_name_he: 'אכילאה',
    latin_name: 'Achillea millefolium', category: 'medicinal', emoji: '🌸',
    day_type_affinity: ['flower'], sowing_months_israel: [3,4,9,10],
    companion_plants: ['Chamomile', 'Lavender', 'Calendula'],
    description_en: 'One of the oldest medicinal plants used since ancient times for wound healing. Has hemostatic, anti-inflammatory, and antimicrobial properties. Also used for fever and digestive issues.',
    description_he: 'אחד מצמחי המרפא הקדומים ביותר לריפוי פצעים. בעל תכונות עוצרות דימום, אנטי-דלקתיות ואנטי-מיקרוביאליות.',
  },
  {
    common_name_en: 'Rosehip', common_name_he: 'ורד הכלב',
    latin_name: 'Rosa canina', category: 'medicinal', emoji: '🌹',
    day_type_affinity: ['fruit'], sowing_months_israel: [3,4,10,11],
    companion_plants: ['Lavender', 'Chamomile'],
    description_en: 'The fruit of wild roses, extremely rich in Vitamin C — up to 20 times more than oranges. Used for immune support, arthritis, and skin health. Also contains vitamins A, E and essential fatty acids.',
    description_he: 'פרי הורד הבר, עשיר מאוד בוויטמין C — עד 20 פעמים יותר מתפוזים. משמש לתמיכה חיסונית, דלקת פרקים ובריאות העור.',
  },
];

async function main() {
  console.log(`Upserting ${plants.length} plants...`);

  const { data, error } = await supabase
    .from('plants')
    .upsert(plants, { onConflict: 'latin_name' })
    .select('latin_name');

  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`Done. ${data?.length ?? 0} rows upserted.`);
}

main().catch(console.error);
