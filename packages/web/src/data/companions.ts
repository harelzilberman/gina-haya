export interface PlantData {
  id: string;
  nameHe: string;
  nameEn: string;
  emoji: string;
  category: 'fruit' | 'root' | 'flower' | 'leaf';
  spacingCm: number;
  goodCompanions: string[];
  badCompanions: string[];
}

export const PLANTS: PlantData[] = [
  // ── Fruiting vegetables ──────────────────────────────────────────────────
  { id: 'tomato',    nameHe: 'עגבניה',       nameEn: 'Tomato',     emoji: '🍅', category: 'fruit', spacingCm: 50, goodCompanions: ['basil','carrot','parsley','marigold','garlic'], badCompanions: ['fennel','potato'] },
  { id: 'pepper',    nameHe: 'פלפל',          nameEn: 'Pepper',     emoji: '🌶️', category: 'fruit', spacingCm: 40, goodCompanions: ['basil','carrot','tomato','marigold'], badCompanions: ['fennel'] },
  { id: 'eggplant',  nameHe: 'חציל',          nameEn: 'Eggplant',   emoji: '🍆', category: 'fruit', spacingCm: 50, goodCompanions: ['basil','bean','thyme'], badCompanions: ['fennel'] },
  { id: 'cucumber',  nameHe: 'מלפפון',        nameEn: 'Cucumber',   emoji: '🥒', category: 'fruit', spacingCm: 40, goodCompanions: ['bean','dill','sunflower','pea'], badCompanions: ['sage','potato'] },
  { id: 'zucchini',  nameHe: 'קישוא',         nameEn: 'Zucchini',   emoji: '🥬', category: 'fruit', spacingCm: 80, goodCompanions: ['bean','nasturtium','marigold'], badCompanions: ['potato'] },
  { id: 'bean',      nameHe: 'שעועית',        nameEn: 'Bean',       emoji: '🫘', category: 'fruit', spacingCm: 20, goodCompanions: ['carrot','cucumber','beet','zucchini','corn'], badCompanions: ['onion','garlic','fennel'] },
  { id: 'pea',       nameHe: 'אפונה',         nameEn: 'Pea',        emoji: '🫛', category: 'fruit', spacingCm: 10, goodCompanions: ['carrot','radish','cucumber','turnip'], badCompanions: ['onion','garlic'] },
  { id: 'strawberry',nameHe: 'תות שדה',       nameEn: 'Strawberry', emoji: '🍓', category: 'fruit', spacingCm: 30, goodCompanions: ['lettuce','spinach','garlic','borage'], badCompanions: [] },
  { id: 'corn',      nameHe: 'תירס',          nameEn: 'Corn',       emoji: '🌽', category: 'fruit', spacingCm: 35, goodCompanions: ['bean','zucchini','pumpkin'], badCompanions: ['tomato'] },

  // ── Root vegetables ───────────────────────────────────────────────────────
  { id: 'carrot',    nameHe: 'גזר',           nameEn: 'Carrot',     emoji: '🥕', category: 'root',  spacingCm: 10, goodCompanions: ['tomato','lettuce','onion','rosemary','pea'], badCompanions: ['dill'] },
  { id: 'onion',     nameHe: 'בצל',           nameEn: 'Onion',      emoji: '🧅', category: 'root',  spacingCm: 15, goodCompanions: ['carrot','beet','lettuce','chamomile'], badCompanions: ['bean','pea','sage'] },
  { id: 'garlic',    nameHe: 'שום',           nameEn: 'Garlic',     emoji: '🧄', category: 'root',  spacingCm: 15, goodCompanions: ['tomato','strawberry','rose'], badCompanions: ['bean','pea'] },
  { id: 'potato',    nameHe: 'תפוח אדמה',    nameEn: 'Potato',     emoji: '🥔', category: 'root',  spacingCm: 30, goodCompanions: ['bean','corn','horseradish'], badCompanions: ['tomato','cucumber','zucchini'] },
  { id: 'beet',      nameHe: 'סלק',           nameEn: 'Beet',       emoji: '🫚', category: 'root',  spacingCm: 15, goodCompanions: ['onion','lettuce','cabbage'], badCompanions: ['bean'] },
  { id: 'radish',    nameHe: 'צנון',          nameEn: 'Radish',     emoji: '🌱', category: 'root',  spacingCm:  8, goodCompanions: ['lettuce','pea','cucumber'], badCompanions: [] },
  { id: 'turnip',    nameHe: 'לפת',           nameEn: 'Turnip',     emoji: '🫚', category: 'root',  spacingCm: 15, goodCompanions: ['pea','spinach'], badCompanions: [] },

  // ── Leafy vegetables ──────────────────────────────────────────────────────
  { id: 'lettuce',   nameHe: 'חסה',           nameEn: 'Lettuce',    emoji: '🥬', category: 'leaf',  spacingCm: 25, goodCompanions: ['carrot','radish','strawberry','chive','dill'], badCompanions: [] },
  { id: 'spinach',   nameHe: 'תרד',           nameEn: 'Spinach',    emoji: '🥬', category: 'leaf',  spacingCm: 20, goodCompanions: ['strawberry','bean','pea'], badCompanions: [] },
  { id: 'cabbage',   nameHe: 'כרוב',          nameEn: 'Cabbage',    emoji: '🥦', category: 'leaf',  spacingCm: 45, goodCompanions: ['dill','mint','rosemary','beet'], badCompanions: ['tomato','strawberry'] },

  // ── Herbs ─────────────────────────────────────────────────────────────────
  { id: 'basil',     nameHe: 'ריחן',          nameEn: 'Basil',      emoji: '🌿', category: 'leaf',  spacingCm: 20, goodCompanions: ['tomato','pepper','oregano','marigold'], badCompanions: ['sage','thyme'] },
  { id: 'parsley',   nameHe: 'פטרוזיליה',    nameEn: 'Parsley',    emoji: '🌿', category: 'leaf',  spacingCm: 15, goodCompanions: ['tomato','carrot','asparagus'], badCompanions: ['mint'] },
  { id: 'dill',      nameHe: 'שמיר',          nameEn: 'Dill',       emoji: '🌿', category: 'flower',spacingCm: 20, goodCompanions: ['cabbage','lettuce','onion'], badCompanions: ['carrot','tomato','fennel'] },
  { id: 'mint',      nameHe: 'נענע',          nameEn: 'Mint',       emoji: '🌿', category: 'leaf',  spacingCm: 30, goodCompanions: ['tomato','cabbage','pea'], badCompanions: ['parsley'] },
  { id: 'rosemary',  nameHe: 'רוזמרין',      nameEn: 'Rosemary',   emoji: '🌿', category: 'flower',spacingCm: 40, goodCompanions: ['carrot','bean','sage','cabbage'], badCompanions: [] },
  { id: 'sage',      nameHe: 'מרווה',         nameEn: 'Sage',       emoji: '🌿', category: 'flower',spacingCm: 40, goodCompanions: ['rosemary','cabbage','carrot'], badCompanions: ['cucumber','onion','basil'] },
  { id: 'thyme',     nameHe: 'תימין',         nameEn: 'Thyme',      emoji: '🌿', category: 'flower',spacingCm: 25, goodCompanions: ['tomato','eggplant','cabbage'], badCompanions: [] },
  { id: 'coriander', nameHe: 'כוסברה',       nameEn: 'Coriander',  emoji: '🌿', category: 'leaf',  spacingCm: 15, goodCompanions: ['bean','pea','spinach'], badCompanions: ['fennel'] },
  { id: 'oregano',   nameHe: 'אורגנו',        nameEn: 'Oregano',    emoji: '🌿', category: 'flower',spacingCm: 25, goodCompanions: ['tomato','pepper','basil'], badCompanions: [] },
  { id: 'chive',     nameHe: 'עירית',         nameEn: 'Chive',      emoji: '🌿', category: 'leaf',  spacingCm: 15, goodCompanions: ['carrot','lettuce','tomato'], badCompanions: [] },

  // ── Flowers ───────────────────────────────────────────────────────────────
  { id: 'marigold',     nameHe: 'ציפורן',      nameEn: 'Marigold',     emoji: '🌼', category: 'flower',spacingCm: 25, goodCompanions: ['tomato','pepper','eggplant','basil'], badCompanions: [] },
  { id: 'nasturtium',   nameHe: 'נסטורציה',    nameEn: 'Nasturtium',   emoji: '🌸', category: 'flower',spacingCm: 30, goodCompanions: ['zucchini','cucumber','bean'], badCompanions: [] },
  { id: 'chamomile',    nameHe: 'כמון',        nameEn: 'Chamomile',    emoji: '🌼', category: 'flower',spacingCm: 20, goodCompanions: ['onion','cabbage','cucumber'], badCompanions: [] },
  { id: 'lavender',     nameHe: 'לבנדר',       nameEn: 'Lavender',     emoji: '💜', category: 'flower',spacingCm: 40, goodCompanions: ['rosemary','thyme','sage'], badCompanions: [] },
];

export const PLANT_MAP = new Map<string, PlantData>(PLANTS.map(p => [p.id, p]));

/** Returns 'good' | 'bad' | 'neutral' for adding plantId to a bed that already has existingIds */
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
