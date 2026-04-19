-- Migration 005: add emoji column and populate with Unicode ≤13 safe values
-- All emojis here are Unicode 13.0 or earlier, supported on all major platforms.

ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS emoji TEXT;

-- ── Fruiting vegetables ───────────────────────────────────────────────────────
UPDATE public.plants SET emoji = '🍅' WHERE common_name_he ILIKE '%עגבני%';
UPDATE public.plants SET emoji = '🌶️' WHERE common_name_en ILIKE 'pepper%';
UPDATE public.plants SET emoji = '🍆' WHERE common_name_he = 'חציל';
UPDATE public.plants SET emoji = '🥒' WHERE common_name_he = 'מלפפון';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he = 'קישוא';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'שעועית';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'פול';
UPDATE public.plants SET emoji = '🌱' WHERE common_name_he = 'אפונה';
UPDATE public.plants SET emoji = '🍓' WHERE common_name_he = 'תות שדה';
UPDATE public.plants SET emoji = '🌽' WHERE common_name_he = 'תירס';
UPDATE public.plants SET emoji = '🎃' WHERE common_name_he ILIKE '%דלעת%';
UPDATE public.plants SET emoji = '🍉' WHERE common_name_he = 'אבטיח';
UPDATE public.plants SET emoji = '🍈' WHERE common_name_he = 'מלון';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'במיה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'אספרגוס';

-- ── Root vegetables ───────────────────────────────────────────────────────────
UPDATE public.plants SET emoji = '🥕' WHERE common_name_he = 'גזר';
UPDATE public.plants SET emoji = '🧅' WHERE common_name_he = 'בצל';
UPDATE public.plants SET emoji = '🧄' WHERE common_name_he = 'שום';
UPDATE public.plants SET emoji = '🥔' WHERE common_name_he = 'תפוח אדמה';
UPDATE public.plants SET emoji = '🍠' WHERE common_name_he = 'בטטה';
UPDATE public.plants SET emoji = '🌱' WHERE common_name_he = 'סלק';
UPDATE public.plants SET emoji = '🌱' WHERE common_name_he = 'צנונית';
UPDATE public.plants SET emoji = '🌱' WHERE common_name_he = 'לפת';
UPDATE public.plants SET emoji = '🌱' WHERE common_name_he = 'פסטרנק';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'כרישה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'בצל ירוק';

-- ── Leafy vegetables ──────────────────────────────────────────────────────────
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he = 'חסה';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he = 'תרד';
UPDATE public.plants SET emoji = '🥦' WHERE common_name_he ILIKE 'כרוב ירוק%';
UPDATE public.plants SET emoji = '🥦' WHERE common_name_he = 'ברוקולי';
UPDATE public.plants SET emoji = '🥦' WHERE common_name_he = 'כרובית';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he ILIKE 'כרוב לבן%';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he = 'כרוב';
UPDATE public.plants SET emoji = '🥦' WHERE common_name_he = 'כרוב ניצנים';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'סלרי';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'מנגולד';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he = 'רוקט';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he = 'עולש';
UPDATE public.plants SET emoji = '🥬' WHERE common_name_he ILIKE 'פאק%';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'ארטישוק';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'שומר';

-- ── Herbs ─────────────────────────────────────────────────────────────────────
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'ריחן';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'פטרוזיליה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'כוסברה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'נענע';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'מרווה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'רוזמרין';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'טימין';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'אורגנו';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'לבנדר';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'קמומיל';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'לואיזה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'שמיר';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'עירית';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'טרגון';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'דפנה';
UPDATE public.plants SET emoji = '🌿' WHERE common_name_he = 'ליים גראס';

-- ── Fruit trees ───────────────────────────────────────────────────────────────
UPDATE public.plants SET emoji = '🫒' WHERE common_name_he = 'זית';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'תאנה';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'רימון';
UPDATE public.plants SET emoji = '🍋' WHERE common_name_he = 'לימון';
UPDATE public.plants SET emoji = '🍊' WHERE common_name_he = 'תפוז';
UPDATE public.plants SET emoji = '🍊' WHERE common_name_he = 'אשכולית';
UPDATE public.plants SET emoji = '🥑' WHERE common_name_he = 'אבוקדו';
UPDATE public.plants SET emoji = '🍎' WHERE common_name_he = 'תפוח';
UPDATE public.plants SET emoji = '🍐' WHERE common_name_he = 'אגס';
UPDATE public.plants SET emoji = '🍑' WHERE common_name_he = 'אפרסק';
UPDATE public.plants SET emoji = '🍑' WHERE common_name_he = 'משמש';
UPDATE public.plants SET emoji = '🍑' WHERE common_name_he = 'שזיף';
UPDATE public.plants SET emoji = '🍇' WHERE common_name_he = 'גפן';
UPDATE public.plants SET emoji = '🌴' WHERE common_name_he = 'תמר';
UPDATE public.plants SET emoji = '🍌' WHERE common_name_he = 'בננה';

-- ── Flowers ───────────────────────────────────────────────────────────────────
UPDATE public.plants SET emoji = '🌻' WHERE common_name_he ILIKE '%חמני%';
UPDATE public.plants SET emoji = '🌼' WHERE common_name_he = 'טגטס';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'זיניה';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'נסטורציום';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he ILIKE 'בוראג%';
UPDATE public.plants SET emoji = '🌼' WHERE common_name_he = 'קלנדולה';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'קוסמוס';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'דליה';
UPDATE public.plants SET emoji = '🌹' WHERE common_name_he = 'ורד';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'גרניום';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'פטוניה';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'לוע הארי';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'אפונת ריח';
UPDATE public.plants SET emoji = '🌸' WHERE common_name_he = 'דגניות';

-- Fallback: any remaining plants without emoji get a generic seedling
UPDATE public.plants SET emoji = '🌱' WHERE emoji IS NULL;
