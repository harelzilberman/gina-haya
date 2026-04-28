export interface PlantData {
  id: string;
  nameHe: string;
  nameEn: string;
  emoji: string;
  category: 'fruit' | 'root' | 'flower' | 'leaf' | 'house_plant' | 'succulent' | 'cactus' | 'medicinal';
  spacingCm: number;
  goodCompanions: string[];
  badCompanions: string[];
}

export const PLANTS: PlantData[] = [
  // ── Fruiting vegetables ──────────────────────────────────────────────────
  { id: 'tomato',    nameHe: 'עגבניה',      nameEn: 'Tomato',     emoji: '🍅', category: 'fruit', spacingCm: 50, goodCompanions: ['basil','carrot','parsley','marigold','garlic'], badCompanions: ['fennel','potato'] },
  { id: 'pepper',    nameHe: 'פלפל',         nameEn: 'Pepper',     emoji: '🌶️', category: 'fruit', spacingCm: 40, goodCompanions: ['basil','carrot','tomato','marigold'], badCompanions: ['fennel'] },
  { id: 'eggplant',  nameHe: 'חציל',         nameEn: 'Eggplant',   emoji: '🍆', category: 'fruit', spacingCm: 50, goodCompanions: ['basil','bean','thyme'], badCompanions: ['fennel'] },
  { id: 'cucumber',  nameHe: 'מלפפון',       nameEn: 'Cucumber',   emoji: '🥒', category: 'fruit', spacingCm: 40, goodCompanions: ['bean','dill','sunflower','pea'], badCompanions: ['sage','potato'] },
  { id: 'zucchini',  nameHe: 'קישוא',        nameEn: 'Zucchini',   emoji: '🥬', category: 'fruit', spacingCm: 80, goodCompanions: ['bean','nasturtium','marigold'], badCompanions: ['potato'] },
  { id: 'bean',      nameHe: 'שעועית',       nameEn: 'Bean',       emoji: '🌿', category: 'fruit', spacingCm: 20, goodCompanions: ['carrot','cucumber','beet','zucchini','corn'], badCompanions: ['onion','garlic','fennel'] },
  { id: 'pea',       nameHe: 'אפונה',        nameEn: 'Pea',        emoji: '🌱', category: 'fruit', spacingCm: 10, goodCompanions: ['carrot','radish','cucumber','turnip'], badCompanions: ['onion','garlic'] },
  { id: 'strawberry',nameHe: 'תות שדה',      nameEn: 'Strawberry', emoji: '🍓', category: 'fruit', spacingCm: 30, goodCompanions: ['lettuce','spinach','garlic','borage'], badCompanions: [] },
  { id: 'corn',      nameHe: 'תירס',         nameEn: 'Corn',       emoji: '🌽', category: 'fruit', spacingCm: 35, goodCompanions: ['bean','zucchini','pumpkin'], badCompanions: ['tomato'] },
  // ── Root vegetables ───────────────────────────────────────────────────────
  { id: 'carrot',    nameHe: 'גזר',          nameEn: 'Carrot',     emoji: '🥕', category: 'root',  spacingCm: 10, goodCompanions: ['tomato','lettuce','onion','rosemary','pea'], badCompanions: ['dill'] },
  { id: 'onion',     nameHe: 'בצל',          nameEn: 'Onion',      emoji: '🧅', category: 'root',  spacingCm: 15, goodCompanions: ['carrot','beet','lettuce','chamomile'], badCompanions: ['bean','pea','sage'] },
  { id: 'garlic',    nameHe: 'שום',          nameEn: 'Garlic',     emoji: '🧄', category: 'root',  spacingCm: 15, goodCompanions: ['tomato','strawberry','rose'], badCompanions: ['bean','pea'] },
  { id: 'potato',    nameHe: 'תפוח אדמה',   nameEn: 'Potato',     emoji: '🥔', category: 'root',  spacingCm: 30, goodCompanions: ['bean','corn','horseradish'], badCompanions: ['tomato','cucumber','zucchini'] },
  { id: 'beet',      nameHe: 'סלק',          nameEn: 'Beet',       emoji: '🌱', category: 'root',  spacingCm: 15, goodCompanions: ['onion','lettuce','cabbage'], badCompanions: ['bean'] },
  { id: 'radish',    nameHe: 'צנון',         nameEn: 'Radish',     emoji: '🌱', category: 'root',  spacingCm:  8, goodCompanions: ['lettuce','pea','cucumber'], badCompanions: [] },
  { id: 'turnip',    nameHe: 'לפת',          nameEn: 'Turnip',     emoji: '🌱', category: 'root',  spacingCm: 15, goodCompanions: ['pea','spinach'], badCompanions: [] },
  // ── Leafy vegetables ──────────────────────────────────────────────────────
  { id: 'lettuce',   nameHe: 'חסה',          nameEn: 'Lettuce',    emoji: '🥬', category: 'leaf',  spacingCm: 25, goodCompanions: ['carrot','radish','strawberry','chive','dill'], badCompanions: [] },
  { id: 'spinach',   nameHe: 'תרד',          nameEn: 'Spinach',    emoji: '🥬', category: 'leaf',  spacingCm: 20, goodCompanions: ['strawberry','bean','pea'], badCompanions: [] },
  { id: 'cabbage',   nameHe: 'כרוב',         nameEn: 'Cabbage',    emoji: '🥦', category: 'leaf',  spacingCm: 45, goodCompanions: ['dill','mint','rosemary','beet'], badCompanions: ['tomato','strawberry'] },
  // ── Herbs ─────────────────────────────────────────────────────────────────
  { id: 'basil',     nameHe: 'ריחן',         nameEn: 'Basil',      emoji: '🌿', category: 'leaf',  spacingCm: 20, goodCompanions: ['tomato','pepper','oregano','marigold'], badCompanions: ['sage','thyme'] },
  { id: 'parsley',   nameHe: 'פטרוזיליה',   nameEn: 'Parsley',    emoji: '🌿', category: 'leaf',  spacingCm: 15, goodCompanions: ['tomato','carrot','asparagus'], badCompanions: ['mint'] },
  { id: 'dill',      nameHe: 'שמיר',         nameEn: 'Dill',       emoji: '🌿', category: 'flower',spacingCm: 20, goodCompanions: ['cabbage','lettuce','onion'], badCompanions: ['carrot','tomato','fennel'] },
  { id: 'mint',      nameHe: 'נענע',         nameEn: 'Mint',       emoji: '🌿', category: 'leaf',  spacingCm: 30, goodCompanions: ['tomato','cabbage','pea'], badCompanions: ['parsley'] },
  { id: 'rosemary',  nameHe: 'רוזמרין',     nameEn: 'Rosemary',   emoji: '🌿', category: 'flower',spacingCm: 40, goodCompanions: ['carrot','bean','sage','cabbage'], badCompanions: [] },
  { id: 'sage',      nameHe: 'מרווה',        nameEn: 'Sage',       emoji: '🌿', category: 'flower',spacingCm: 40, goodCompanions: ['rosemary','cabbage','carrot'], badCompanions: ['cucumber','onion','basil'] },
  { id: 'thyme',     nameHe: 'תימין',        nameEn: 'Thyme',      emoji: '🌿', category: 'flower',spacingCm: 25, goodCompanions: ['tomato','eggplant','cabbage'], badCompanions: [] },
  { id: 'coriander', nameHe: 'כוסברה',      nameEn: 'Coriander',  emoji: '🌿', category: 'leaf',  spacingCm: 15, goodCompanions: ['bean','pea','spinach'], badCompanions: ['fennel'] },
  { id: 'oregano',   nameHe: 'אורגנו',       nameEn: 'Oregano',    emoji: '🌿', category: 'flower',spacingCm: 25, goodCompanions: ['tomato','pepper','basil'], badCompanions: [] },
  { id: 'chive',     nameHe: 'עירית',        nameEn: 'Chive',      emoji: '🌿', category: 'leaf',  spacingCm: 15, goodCompanions: ['carrot','lettuce','tomato'], badCompanions: [] },
  // ── Flowers ───────────────────────────────────────────────────────────────
  { id: 'marigold',    nameHe: 'ציפורן',     nameEn: 'Marigold',    emoji: '🌼', category: 'flower',spacingCm: 25, goodCompanions: ['tomato','pepper','eggplant','basil'], badCompanions: [] },
  { id: 'nasturtium',  nameHe: 'נסטורציה',   nameEn: 'Nasturtium',  emoji: '🌸', category: 'flower',spacingCm: 30, goodCompanions: ['zucchini','cucumber','bean'], badCompanions: [] },
  { id: 'chamomile',   nameHe: 'כמון',       nameEn: 'Chamomile',   emoji: '🌼', category: 'flower',spacingCm: 20, goodCompanions: ['onion','cabbage','cucumber'], badCompanions: [] },
  { id: 'lavender',    nameHe: 'לבנדר',      nameEn: 'Lavender',    emoji: '💜', category: 'flower',spacingCm: 40, goodCompanions: ['rosemary','thyme','sage'], badCompanions: [] },
  // ── House plants ──────────────────────────────────────────────────────────
  { id: 'aloe_vera',       nameHe: 'אלוורה',          nameEn: 'Aloe Vera',        emoji: '🌵', category: 'house_plant', spacingCm: 30,  goodCompanions: ['lavender','rosemary'], badCompanions: [] },
  { id: 'peace_lily',      nameHe: 'שושן שלום',       nameEn: 'Peace Lily',       emoji: '🌿', category: 'house_plant', spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  { id: 'snake_plant',     nameHe: 'סנסווירה',        nameEn: 'Snake Plant',      emoji: '🌿', category: 'house_plant', spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  { id: 'pothos',          nameHe: 'פוטוס',           nameEn: 'Pothos',           emoji: '🌿', category: 'house_plant', spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  { id: 'spider_plant',    nameHe: 'צמח עכביש',       nameEn: 'Spider Plant',     emoji: '🌿', category: 'house_plant', spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  { id: 'zz_plant',        nameHe: 'צמח ZZ',          nameEn: 'ZZ Plant',         emoji: '🌿', category: 'house_plant', spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  { id: 'monstera',        nameHe: 'מונסטרה',         nameEn: 'Monstera',         emoji: '🌿', category: 'house_plant', spacingCm: 80,  goodCompanions: [], badCompanions: [] },
  { id: 'rubber_plant',    nameHe: 'פיקוס גומי',      nameEn: 'Rubber Plant',     emoji: '🌿', category: 'house_plant', spacingCm: 60,  goodCompanions: [], badCompanions: [] },
  { id: 'fiddle_leaf_fig', nameHe: 'פיקוס כינור',     nameEn: 'Fiddle Leaf Fig',  emoji: '🌿', category: 'house_plant', spacingCm: 60,  goodCompanions: [], badCompanions: [] },
  // ── Succulents ────────────────────────────────────────────────────────────
  { id: 'echeveria',       nameHe: 'אכוורייה',        nameEn: 'Echeveria',        emoji: '🪴', category: 'succulent',   spacingCm: 15,  goodCompanions: [], badCompanions: [] },
  { id: 'jade_plant',      nameHe: "עץ ג'ייד",        nameEn: 'Jade Plant',       emoji: '🪴', category: 'succulent',   spacingCm: 30,  goodCompanions: [], badCompanions: [] },
  { id: 'haworthia',       nameHe: 'הוורתיה',         nameEn: 'Haworthia',        emoji: '🪴', category: 'succulent',   spacingCm: 15,  goodCompanions: [], badCompanions: [] },
  { id: 'sedum',           nameHe: 'סדום',            nameEn: 'Sedum',            emoji: '🪴', category: 'succulent',   spacingCm: 20,  goodCompanions: [], badCompanions: [] },
  { id: 'string_of_pearls',nameHe: 'מחרוזת פנינים',  nameEn: 'String of Pearls', emoji: '🪴', category: 'succulent',   spacingCm: 20,  goodCompanions: [], badCompanions: [] },
  { id: 'agave',           nameHe: 'אגבה',            nameEn: 'Agave',            emoji: '🪴', category: 'succulent',   spacingCm: 60,  goodCompanions: [], badCompanions: [] },
  // ── Cacti ─────────────────────────────────────────────────────────────────
  { id: 'golden_barrel',   nameHe: 'צבר חבית זהב',   nameEn: 'Golden Barrel Cactus', emoji: '🌵', category: 'cactus', spacingCm: 40, goodCompanions: [], badCompanions: [] },
  { id: 'prickly_pear',    nameHe: 'צבר',             nameEn: 'Prickly Pear',     emoji: '🌵', category: 'cactus',      spacingCm: 80,  goodCompanions: [], badCompanions: [] },
  { id: 'christmas_cactus',nameHe: "צבר חג המולד",   nameEn: 'Christmas Cactus', emoji: '🌵', category: 'cactus',      spacingCm: 30,  goodCompanions: [], badCompanions: [] },
  { id: 'bunny_ears',      nameHe: 'צבר אוזני ארנב', nameEn: 'Bunny Ears Cactus',emoji: '🌵', category: 'cactus',      spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  // ── Medicinal ─────────────────────────────────────────────────────────────
  { id: 'echinacea',       nameHe: 'אכינצאה',         nameEn: 'Echinacea',        emoji: '🌸', category: 'medicinal',   spacingCm: 40,  goodCompanions: ['chamomile','lavender'], badCompanions: [] },
  { id: 'valerian',        nameHe: 'ולריאן',          nameEn: 'Valerian',         emoji: '🌿', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['chamomile','lavender'], badCompanions: [] },
  { id: 'st_johns_wort',   nameHe: 'היפריקום',        nameEn: "St. John's Wort",  emoji: '🌿', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['lavender','chamomile'], badCompanions: [] },
  { id: 'lemon_balm',      nameHe: 'מליסה',           nameEn: 'Lemon Balm',       emoji: '🌿', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['mint','chamomile'], badCompanions: [] },
  { id: 'peppermint',      nameHe: 'נענע פלפל',       nameEn: 'Peppermint',       emoji: '🌿', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['chamomile'], badCompanions: [] },
  { id: 'turmeric',        nameHe: 'כורכום',          nameEn: 'Turmeric',         emoji: '🟡', category: 'medicinal',   spacingCm: 40,  goodCompanions: [], badCompanions: [] },
  { id: 'ginger',          nameHe: 'זנגביל',          nameEn: 'Ginger',           emoji: '🫚', category: 'medicinal',   spacingCm: 25,  goodCompanions: ['turmeric'], badCompanions: [] },
  { id: 'elderberry',      nameHe: 'סמבוק שחור',      nameEn: 'Elderberry',       emoji: '🫐', category: 'medicinal',   spacingCm: 200, goodCompanions: ['chamomile'], badCompanions: [] },
  { id: 'ashwagandha',     nameHe: 'אשווגנדה',        nameEn: 'Ashwagandha',      emoji: '🌿', category: 'medicinal',   spacingCm: 60,  goodCompanions: [], badCompanions: [] },
  { id: 'milk_thistle',    nameHe: 'גדילן מצוי',      nameEn: 'Milk Thistle',     emoji: '🌿', category: 'medicinal',   spacingCm: 40,  goodCompanions: ['calendula','chamomile'], badCompanions: [] },
  { id: 'passionflower',   nameHe: 'פסיפלורה',        nameEn: 'Passionflower',    emoji: '🌸', category: 'medicinal',   spacingCm: 100, goodCompanions: ['lavender','valerian'], badCompanions: [] },
  { id: 'dandelion',       nameHe: 'שן הארי',         nameEn: 'Dandelion',        emoji: '🌼', category: 'medicinal',   spacingCm: 15,  goodCompanions: ['chamomile'], badCompanions: [] },
  { id: 'nettle',          nameHe: 'סרפד',            nameEn: 'Nettle',           emoji: '🌿', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['dandelion','chamomile'], badCompanions: [] },
  { id: 'holy_basil',      nameHe: 'בזיליקום קדוש',  nameEn: 'Holy Basil (Tulsi)',emoji: '🌿', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['ginger','turmeric'], badCompanions: [] },
  { id: 'yarrow',          nameHe: 'אכילאה',          nameEn: 'Yarrow',           emoji: '🌸', category: 'medicinal',   spacingCm: 30,  goodCompanions: ['chamomile','lavender'], badCompanions: [] },
  { id: 'rosehip',         nameHe: 'ורד הכלב',        nameEn: 'Rosehip',          emoji: '🌹', category: 'medicinal',   spacingCm: 100, goodCompanions: ['lavender','chamomile'], badCompanions: [] },
];

export const PLANT_MAP = new Map<string, PlantData>(PLANTS.map(p => [p.id, p]));

// ── Spec-required exports ─────────────────────────────────────────────────────

export const GOOD_COMPANIONS: Record<string, string[]> = {
  tomato:    ['basil', 'carrot', 'parsley', 'marigold'],
  carrot:    ['tomato', 'lettuce', 'onion', 'rosemary'],
  onion:     ['carrot', 'lettuce', 'chamomile'],
  cucumber:  ['beans', 'sunflower', 'borage'],
  beans:     ['cucumber', 'carrot', 'strawberry'],
};

export const BAD_COMPANIONS: Record<string, string[]> = {
  tomato:    ['fennel', 'cabbage'],
  onion:     ['beans', 'peas'],
  fennel:    ['tomato', 'pepper', 'beans'],
};

export const PLANT_SPACING: Record<string, number> = Object.fromEntries(
  PLANTS.map(p => [p.nameEn.toLowerCase(), p.spacingCm])
);

/** Returns 'good' | 'bad' | 'neutral' for adding plantId to a bed with existingIds */
export function companionStatus(
  plantId: string,
  existingIds: string[]
): 'good' | 'bad' | 'neutral' {
  const plant = PLANT_MAP.get(plantId);
  if (!plant || existingIds.length === 0) return 'neutral';
  if (existingIds.some(id => plant.badCompanions.includes(id))) return 'bad';
  if (existingIds.some(id => plant.goodCompanions.includes(id))) return 'good';
  return 'neutral';
}
