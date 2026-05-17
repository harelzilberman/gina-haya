import type { MapObject } from '../stores/mapStore';

export interface GardenTemplate {
  id: string;
  category: { he: string; en: string };
  icon: string;
  title: { he: string; en: string };
  description: { he: string; en: string };
  elements: Omit<MapObject, 'id'>[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rb(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'raised-bed', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function bed(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'bed', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function hydro(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'hydroponics', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function vert(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'vertical', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function potRect(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'pot-rect', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function potRound(cx: number, cy: number, r: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'pot-round', shapeKind: 'circle', cx, cy, radius: r, label };
}
function ftree(cx: number, cy: number, r: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'fruit-tree', shapeKind: 'circle', cx, cy, radius: r, label, isFruitTree: true };
}
function tree(cx: number, cy: number, r: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'tree', shapeKind: 'circle', cx, cy, radius: r, label };
}
function dz(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'deadzone', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function aqua(x: number, y: number, w: number, h: number, label: string): Omit<MapObject, 'id'> {
  return { type: 'aquaponics', shapeKind: 'rect', x, y, width: w, height: h, label };
}
function path(pts: [number, number][], label: string): Omit<MapObject, 'id'> {
  return { type: 'walkway', shapeKind: 'polygon', points: pts, label };
}

// 8 positions on a circle (N, NE, E, SE, S, SW, W, NW)
function circlePos(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg - 90) * Math.PI / 180; // 0° = north
  return [Math.round((cx + r * Math.cos(a)) * 100) / 100, Math.round((cy + r * Math.sin(a)) * 100) / 100];
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const GARDEN_TEMPLATES: GardenTemplate[] = [

  // ── CATEGORY 1: ערוגות / Growing Beds ──────────────────────────────────────

  {
    id: 'classic-vegetable-bed',
    category: { he: 'ערוגות', en: 'Growing Beds' },
    icon: '🥕',
    title: { he: 'ערוגת ירקות קלאסית', en: 'Classic vegetable bed' },
    description: { he: '4 ערוגות מוגבהות, שביל מרכזי, אזורי שתילה משולבת', en: '4 raised beds, central path, companion planting zones' },
    elements: [
      rb(3, 4, 8, 4, 'עגבנייה'),
      rb(14, 4, 8, 4, 'מלפפון'),
      rb(3, 11, 8, 4, 'חסה'),
      rb(14, 11, 8, 4, 'גזר'),
      path([[11, 3],[13, 3],[13, 16],[11, 16]], 'שביל אמצע'),
      path([[2, 8],[24, 8],[24, 10],[2, 10]], 'שביל רוחבי'),
    ],
  },

  {
    id: 'herb-spiral',
    category: { he: 'ערוגות', en: 'Growing Beds' },
    icon: '🌿',
    title: { he: 'ערוגת עשבי תיבול', en: 'Herb spiral bed' },
    description: { he: 'פריסה עגולה, אזורי שמש/צל, 8 מקומות לעשבי תיבול', en: 'Circular layout, sun/shade zones, 8 herb slots' },
    elements: (() => {
      const cx = 13, cy = 10, r = 4.2;
      const herbs = ['נענע', 'רוזמרין', 'בזיליקום', 'אורגנו', 'טימין', 'מרווה', 'פטרוזיליה', 'כוסברה'];
      const out: Omit<MapObject, 'id'>[] = [
        bed(cx - 1.2, cy - 1.2, 2.4, 2.4, 'מרכז'),
      ];
      herbs.forEach((herb, i) => {
        const [px, py] = circlePos(cx, cy, r, i * 45);
        out.push(potRound(px, py, 0.9, herb));
      });
      return out;
    })(),
  },

  // ── CATEGORY 2: הידרופוניקה / Hydroponics ──────────────────────────────────

  {
    id: 'nft-basic',
    category: { he: 'הידרופוניקה', en: 'Hydroponics' },
    icon: '🥬',
    title: { he: 'מערכת NFT בסיסית', en: 'Basic NFT system' },
    description: { he: '3 ערוצים, ירקות עלים, מיכל', en: '3 channels, leafy greens, reservoir' },
    elements: [
      hydro(3, 4,   16, 2,   'ערוץ 1 — חסה'),
      hydro(3, 7.5, 16, 2,   'ערוץ 2 — רוקט'),
      hydro(3, 11,  16, 2,   'ערוץ 3 — תרד'),
      bed(20, 4, 4, 9, 'מיכל / Reservoir'),
    ],
  },

  {
    id: 'vertical-hydro',
    category: { he: 'הידרופוניקה', en: 'Hydroponics' },
    icon: '🍅',
    title: { he: 'הידרופוניקה אנכית', en: 'Vertical tower system' },
    description: { he: '4 מגדלים, עגבניות ומלפפונים, השקיה בטפטוף', en: '4 towers, tomatoes & cucumbers, drip feed' },
    elements: [
      vert(3,  4, 3, 12, 'מגדל 1 — עגבניות'),
      vert(8,  4, 3, 12, 'מגדל 2 — מלפפונים'),
      vert(13, 4, 3, 12, 'מגדל 3 — תות שדה'),
      vert(18, 4, 3, 12, 'מגדל 4 — פלפל'),
    ],
  },

  // ── CATEGORY 3: עציצים / Pots & Containers ─────────────────────────────────

  {
    id: 'balcony-pots',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🌺',
    title: { he: 'גינת מרפסת', en: 'Balcony pot garden' },
    description: { he: '8 עציצים, עשבי תיבול ופרחים מעורבים, מדפי מעקה', en: '8 pots, mixed herbs & flowers, railing planters' },
    elements: [
      potRect(3, 3.5, 7, 1.5, 'מדף מעקה 1'),
      potRect(13, 3.5, 7, 1.5, 'מדף מעקה 2'),
      potRound(4,  7.5, 0.7, 'נענע'),
      potRound(6.5,7.5, 0.7, 'רוזמרין'),
      potRound(9,  7.5, 0.7, 'בזיליקום'),
      potRound(11.5,7.5,0.7, 'פטרוזיליה'),
      potRound(14, 7.5, 0.7, 'לבנדר'),
      potRound(16.5,7.5,0.7, 'אורגנו'),
      potRound(19, 7.5, 0.7, 'גרניום'),
      potRound(21.5,7.5,0.7, 'פלפל'),
    ],
  },

  {
    id: 'windowsill',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🫙',
    title: { he: 'גינת חלון', en: 'Windowsill garden' },
    description: { he: '6 עציצים קטנים, עשבי תיבול, פניה דרומית', en: '6 small pots, indoor herbs, south-facing' },
    elements: [
      potRect(3, 8.5, 14, 2, 'אדן חלון'),
      potRound(4.5,  8, 0.65, 'שמיר'),
      potRound(6.8,  8, 0.65, 'נענע'),
      potRound(9.1,  8, 0.65, 'בזיליקום'),
      potRound(11.4, 8, 0.65, 'פטרוזיליה'),
      potRound(13.7, 8, 0.65, 'אורגנו'),
      potRound(16,   8, 0.65, 'כוסברה'),
    ],
  },

  {
    id: 'berry-balcony',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🍓',
    title: { he: 'מרפסת פירות קטנה', en: 'Berry balcony' },
    description: { he: 'תות שדה, עגבניות שרי ופלפלים במעקה', en: 'Strawberries, cherry tomatoes & peppers in rail planters' },
    elements: [
      potRect(3,  3.5, 9, 1.5, 'ארגז מעקה — תות שדה'),
      potRect(14, 3.5, 9, 1.5, 'ארגז מעקה — עגבניות שרי'),
      potRound(4,   7.5, 0.8, 'תות שדה'),
      potRound(7,   7.5, 0.8, 'עגבניות שרי'),
      potRound(10,  7.5, 0.8, 'פלפל'),
      potRound(13,  7.5, 0.8, 'תות שדה'),
      potRound(16,  7.5, 0.8, 'עגבנייה'),
      potRound(19,  7.5, 0.8, 'פלפל צ׳ילי'),
    ],
  },

  {
    id: 'flowers-herbs-balcony',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🌸',
    title: { he: 'מרפסת פרחים ועשבי תיבול', en: 'Flowers & herbs balcony' },
    description: { he: 'פרחים אכילים עם עשבי תיבול, 3 רמות', en: 'Edible flowers mixed with culinary herbs, 3 tiers' },
    elements: [
      // Tier 3 - top shelf
      potRound(6,  4, 0.65, 'לבנדר'),
      potRound(10, 4, 0.65, 'רוז׳מרין'),
      potRound(14, 4, 0.65, 'מרווה'),
      // Tier 2 - middle shelf
      potRound(4.5, 8,  0.75, 'נענע'),
      potRound(9,   8,  0.75, 'בזיליקום'),
      potRound(13.5,8,  0.75, 'טימין'),
      potRound(18,  8,  0.75, 'אורגנו'),
      // Tier 1 - bottom / floor level
      potRound(3,  13,  0.85, 'נסטורציה'),
      potRound(7.5,13,  0.85, 'ציפורן'),
      potRound(12, 13,  0.85, 'ורד'),
      potRound(16.5,13, 0.85, 'גרניום'),
    ],
  },

  {
    id: 'salad-balcony',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🥗',
    title: { he: 'מרפסת סלטים', en: 'Salad balcony' },
    description: { he: 'חסה, רוקט, צנוניות — פריסת חיתוך-וחזרה', en: 'Lettuce, arugula, radishes — cut-and-come-again layout' },
    elements: [
      potRect(3,  4, 9, 3, 'ארגז 1 — חסה + רוקט'),
      potRect(3,  9, 9, 3, 'ארגז 2 — גזר + צנוניות'),
      potRect(14, 4, 9, 3, 'ארגז 3 — בצל ירוק + שמיר'),
      potRect(14, 9, 9, 3, 'ארגז 4 — ספינאק + מנגולד'),
    ],
  },

  // ── CATEGORY 4: גינה ביתית קטנה / Small Home Garden ──────────────────────

  {
    id: 'small-backyard',
    category: { he: 'גינה ביתית קטנה', en: 'Small Home Garden' },
    icon: '🥦',
    title: { he: 'גינת חצר קטנה', en: 'Small backyard' },
    description: { he: '2 ערוגות מוגבהות + פינת קומפוסט + אזור כלים, ~20מ״ר', en: '2 raised beds + compost corner + tool area, ~20m²' },
    elements: [
      rb(3, 4, 9, 5, 'ערוגה 1'),
      rb(15, 4, 9, 5, 'ערוגה 2'),
      dz(3,  12, 4, 4, 'קומפוסט'),
      dz(20, 12, 4, 4, 'כלים'),
      path([[12,3],[15,3],[15,18],[12,18]], 'שביל'),
    ],
  },

  {
    id: 'family-garden',
    category: { he: 'גינה ביתית קטנה', en: 'Small Home Garden' },
    icon: '👨‍👩‍👧',
    title: { he: 'גינה משפחתית', en: 'Family garden' },
    description: { he: 'פריסה ידידותית לילדים, ירקות קלים, שביל עשבי תיבול חושני', en: 'Kid-friendly layout, easy vegetables, sensory herb path' },
    elements: [
      path([[12,3],[15,3],[15,22],[12,22]], 'שביל מרכזי'),
      rb(3,  4, 8, 6, 'ירקות קלים'),
      rb(16, 4, 8, 6, 'ירקות קלים'),
      bed(3, 12, 8, 3, 'עשבי תיבול'),
      bed(16,12, 8, 3, 'עשבי תיבול'),
      dz(3, 17, 5, 4, 'פינת משחק'),
      rb(16,17, 8, 4, 'פרחים'),
    ],
  },

  {
    id: 'mandala-garden',
    category: { he: 'גינה ביתית קטנה', en: 'Small Home Garden' },
    icon: '🌀',
    title: { he: 'גינת מנדלה', en: 'Mandala garden' },
    description: { he: 'ערוגות עגולות, שתילה משולבת, נקודת מוקד מרכזית', en: 'Circular beds, companion planting, central focal point' },
    elements: (() => {
      const cx = 13, cy = 11;
      const out: Omit<MapObject, 'id'>[] = [
        potRound(cx, cy, 1.2, 'מוקד'),
      ];
      // Inner ring – 4 beds
      const innerR = 3.5;
      [0, 90, 180, 270].forEach(deg => {
        const [px, py] = circlePos(cx, cy, innerR, deg);
        out.push(bed(px - 1.2, py - 1.2, 2.4, 2.4, 'שתילה'));
      });
      // Outer ring – 8 beds
      const outerR = 7;
      ['עגבנייה', 'מלפפון', 'חסה', 'גזר', 'תרד', 'בצל', 'שעועית', 'אפונה'].forEach((label, i) => {
        const [px, py] = circlePos(cx, cy, outerR, i * 45);
        out.push(rb(px - 1.2, py - 1.2, 2.4, 2.4, label));
      });
      // 4 radial path segments
      [0, 90, 180, 270].forEach(deg => {
        const [ix, iy] = circlePos(cx, cy, 2, deg);
        const [ox, oy] = circlePos(cx, cy, 6, deg);
        const perp = 0.4;
        const a = (deg - 90) * Math.PI / 180;
        const dx = Math.cos(a), dy = Math.sin(a);
        const nx = -dy * perp, ny = dx * perp;
        out.push(path([
          [ix + nx, iy + ny],
          [ix - nx, iy - ny],
          [ox - nx, oy - ny],
          [ox + nx, oy + ny],
        ], 'שביל'));
      });
      return out;
    })(),
  },

  // ── CATEGORY 5: גינת פרי / Orchard ────────────────────────────────────────

  {
    id: 'small-orchard',
    category: { he: 'גינת פרי', en: 'Orchard' },
    icon: '🍊',
    title: { he: 'פרדס קטן', en: 'Small orchard' },
    description: { he: '6 עצי פרי, כיסוי קרקע, אזורי השקיה בטפטוף', en: '6 fruit trees, ground cover, drip irrigation zones' },
    elements: [
      ftree(5,  5, 1.8, 'עץ פרי 1'),
      ftree(13, 5, 1.8, 'עץ פרי 2'),
      ftree(21, 5, 1.8, 'עץ פרי 3'),
      ftree(5,  13, 1.8, 'עץ פרי 4'),
      ftree(13, 13, 1.8, 'עץ פרי 5'),
      ftree(21, 13, 1.8, 'עץ פרי 6'),
      bed(3, 18, 21, 2, 'כיסוי קרקע'),
    ],
  },

  {
    id: 'mixed-garden',
    category: { he: 'גינת פרי', en: 'Orchard' },
    icon: '🌻',
    title: { he: 'גינה משולבת', en: 'Mixed garden' },
    description: { he: 'עצי פרי + ערוגות ירקות + גבולות פרחים', en: 'Fruit trees + vegetable beds + flower borders' },
    elements: [
      tree(5,  4.5, 2, 'עץ נוי'),
      ftree(13, 4.5, 2, 'עץ פרי'),
      tree(21, 4.5, 2, 'עץ נוי'),
      rb(3,  10, 9, 5, 'ירקות'),
      rb(15, 10, 9, 5, 'ירקות'),
      bed(3, 17, 21, 2.5, 'גבול פרחים'),
    ],
  },

  // ── CATEGORY 6: גינה עירונית / Urban ──────────────────────────────────────

  {
    id: 'rooftop',
    category: { he: 'גינה עירונית', en: 'Urban' },
    icon: '🪟',
    title: { he: 'גג עירוני', en: 'Rooftop garden' },
    description: { he: 'עציצים + ערוגות קטנות, אזורים מוגנים מרוח', en: 'Containers + small beds, wind-protected zones' },
    elements: [
      // Windbreak walls
      { type: 'wall', shapeKind: 'rect', x: 3, y: 3, width: 0.2, height: 16, label: 'קיר הגנה מרוח' },
      { type: 'wall', shapeKind: 'rect', x: 3, y: 3, width: 24, height: 0.2, label: 'קיר הגנה מרוח' },
      // Central beds
      rb(7, 8, 8, 4, 'ערוגה מרכזית'),
      rb(17, 8, 7, 4, 'ירקות ועשבים'),
      // Perimeter pots
      potRound(5,  6,  0.7, 'עציץ'),
      potRound(8,  6,  0.7, 'עציץ'),
      potRound(12, 6,  0.7, 'עציץ'),
      potRound(16, 6,  0.7, 'עציץ'),
      potRound(20, 6,  0.7, 'עציץ'),
      potRound(5,  15, 0.7, 'עציץ'),
      potRound(12, 15, 0.7, 'עציץ'),
      potRound(20, 15, 0.7, 'עציץ'),
    ],
  },

  {
    id: 'crate-garden',
    category: { he: 'גינה עירונית', en: 'Urban' },
    icon: '📦',
    title: { he: 'גינת קופסאות', en: 'Crate garden' },
    description: { he: 'ארגזים ממוחזרים, פריסה קומפקטית, 3×3מ׳', en: 'Recycled crates, compact layout, 3×3m space' },
    elements: (() => {
      const labels = [
        'עגבנייה', 'מלפפון', 'חסה',
        'גזר', 'תרד', 'בצל',
        'פלפל', 'קישוא', 'שמיר',
      ];
      const out: Omit<MapObject, 'id'>[] = [];
      labels.forEach((label, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        out.push(potRect(3 + col * 5, 4 + row * 5, 4, 4, label));
      });
      return out;
    })(),
  },

  // ── CATEGORY 7: ביודינמי / Biodynamic Special ─────────────────────────────

  {
    id: 'full-bd-garden',
    category: { he: 'ביודינמי', en: 'Biodynamic Special' },
    icon: '🌙',
    title: { he: 'גינה ביודינמית מלאה', en: 'Full BD garden' },
    description: { he: 'שתילה משולבת, אזורי פרפרטים BD, ערוגות מיושרות לירח', en: 'Companion planting, BD prep zones, moon-aligned beds' },
    elements: [
      // 4 beds at compass points
      rb(10, 3,  7, 4, 'צפון — שורשים'),
      rb(18, 9,  7, 4, 'מזרח — פרחים'),
      rb(10, 16, 7, 4, 'דרום — פירות'),
      rb(2,  9,  7, 4, 'מערב — עלים'),
      // Center BD prep zone
      bed(10, 9, 7, 5, 'אזור BD — פרפרטים'),
      // Moon indicator corner
      potRound(24, 4, 0.7, 'ירח'),
      // Companion labels
      tree(24, 10, 1.2, 'עץ לוויין'),
      tree(24, 15, 1.2, 'עץ לוויין'),
    ],
  },

  {
    id: 'permaculture',
    category: { he: 'ביודינמי', en: 'Biodynamic Special' },
    icon: '♻️',
    title: { he: 'גינת פרמקלצ׳ר', en: 'Permaculture patch' },
    description: { he: 'גילדות, אזור קומפוסט, אזור קציר מים', en: 'Guilds, compost zone, water harvesting area' },
    elements: [
      // Guild 1 — tree + understory + ground cover
      ftree(6, 6, 2, 'עץ גילדה 1'),
      bed(3,  10, 7, 3, 'תת-יער'),
      bed(3,  14, 7, 3, 'כיסוי קרקע'),
      // Guild 2
      ftree(18, 6, 2, 'עץ גילדה 2'),
      bed(15, 10, 7, 3, 'תת-יער'),
      bed(15, 14, 7, 3, 'כיסוי קרקע'),
      // Compost
      dz(3, 19, 5, 4, 'קומפוסט'),
      // Water harvesting
      aqua(10, 19, 12, 4, 'קציר מים / Swale'),
      // Swale line
      path([[2,18],[26,18],[26,18.4],[2,18.4]], 'שוויל מים'),
    ],
  },

  // ── CATEGORY 8: עשבי תיבול / Herb Gardens ─────────────────────────────────

  {
    id: 'tea-herbs',
    category: { he: 'עשבי תיבול', en: 'Herb Gardens' },
    icon: '🫖',
    title: { he: 'גינת תה צמחים', en: 'Tea herb garden' },
    description: { he: 'נענע, לואיזה, קמומיל, מרווה — מקובצים לפי סוג תה', en: 'Mint, lemon verbena, chamomile, sage — grouped by brew type' },
    elements: [
      bed(3,  4,  9, 5, 'תה מרגיע — נענע, לואיזה'),
      bed(14, 4,  9, 5, 'תה מחזק — מרווה, טימין'),
      bed(3,  11, 9, 5, 'תה פרחוני — קמומיל, לבנדר'),
      bed(14, 11, 9, 5, 'תה עיכול — זנגביל, לימון'),
      path([[12,3],[13.5,3],[13.5,17],[12,17]], 'שביל'),
      path([[2,9.5],[24,9.5],[24,10.5],[2,10.5]], 'שביל'),
    ],
  },

  {
    id: 'kitchen-herbs',
    category: { he: 'עשבי תיבול', en: 'Herb Gardens' },
    icon: '🍕',
    title: { he: 'עשבי תיבול למטבח', en: 'Kitchen herbs' },
    description: { he: 'פריסה ים-תיכונית — בזיליקום, אורגנו, טימין, רוזמרין, פטרוזיליה', en: 'Mediterranean layout — basil, oregano, thyme, rosemary, parsley' },
    elements: [
      rb(3,  4, 7, 4, 'בזיליקום'),
      rb(12, 4, 7, 4, 'אורגנו'),
      rb(21, 4, 7, 4, 'טימין'),
      rb(3,  11, 7, 4, 'רוזמרין'),
      rb(12, 11, 7, 4, 'פטרוזיליה'),
      rb(21, 11, 7, 4, 'כוסברה'),
    ],
  },

  {
    id: 'medicinal-herbs',
    category: { he: 'עשבי תיבול', en: 'Herb Gardens' },
    icon: '💊',
    title: { he: 'גינת רפואה טבעית', en: 'Medicinal herb garden' },
    description: { he: 'אלוורה, קלנדולה, לבנדר, היפריקום, אכינצאה', en: 'Aloe, calendula, lavender, St. John\'s wort, echinacea' },
    elements: (() => {
      const herbs = ['אלוורה', 'קלנדולה', 'לבנדר', 'היפריקום', 'אכינצאה'];
      // Gentle arc: 5 beds arranged in a shallow arc
      const cx = 14, cy = 16, arcR = 10;
      return herbs.map((herb, i) => {
        const angle = -50 + i * 25; // -50° to +50° arc
        const [px, py] = circlePos(cx, cy, arcR, angle);
        return bed(px - 2, py - 1.5, 4, 3, herb);
      });
    })(),
  },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

export const TEMPLATE_CATEGORIES = Array.from(
  new Map(GARDEN_TEMPLATES.map(t => [t.category.he, t.category])).values()
);

export function getTemplatesByCategory(categoryHe: string): GardenTemplate[] {
  return GARDEN_TEMPLATES.filter(t => t.category.he === categoryHe);
}
