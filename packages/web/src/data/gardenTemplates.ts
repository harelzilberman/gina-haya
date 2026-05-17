import type { MapObject } from '../stores/mapStore';

export interface GardenTemplate {
  id: string;
  category: { he: string; en: string };
  icon: string;
  title: { he: string; en: string };
  description: { he: string; en: string };
  elements: Omit<MapObject, 'id'>[];
}

// ── Planting helpers ──────────────────────────────────────────────────────────

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
function walkPath(pts: [number, number][], label: string): Omit<MapObject, 'id'> {
  return { type: 'walkway', shapeKind: 'polygon', points: pts, label };
}

// ── Contextual helpers ────────────────────────────────────────────────────────

/** House footprint — filled polygon at back of garden */
function house(x: number, y: number, w: number, h: number, label = 'בית / House'): Omit<MapObject, 'id'> {
  return { type: 'house', shapeKind: 'polygon', points: [[x,y],[x+w,y],[x+w,y+h],[x,y+h]], label, z: 0 };
}
/** Lawn fill rectangle — drawn as background */
function lawn(x: number, y: number, w: number, h: number, label = 'דשא / Lawn'): Omit<MapObject, 'id'> {
  return { type: 'lawn', shapeKind: 'rect', x, y, width: w, height: h, label, z: 0 };
}
/** Paved patio / ground-level path — walkway polygon */
function patio(x: number, y: number, w: number, h: number, label = 'מרפסת / Patio'): Omit<MapObject, 'id'> {
  return { type: 'walkway', shapeKind: 'polygon', points: [[x,y],[x+w,y],[x+w,y+h],[x,y+h]], label, z: 1 };
}
/** Horizontal fence segment */
function fenceH(x: number, y: number, w: number, label = 'גדר / Fence'): Omit<MapObject, 'id'> {
  return { type: 'fence', shapeKind: 'rect', x, y: y - 0.08, width: w, height: 0.15, label, z: 2 };
}
/** Vertical fence segment */
function fenceV(x: number, y: number, h: number, label = 'גדר / Fence'): Omit<MapObject, 'id'> {
  return { type: 'fence', shapeKind: 'rect', x: x - 0.08, y, width: 0.15, height: h, label, z: 2 };
}
/** Gate element — thin golden rect indicating the opening */
function gate(x: number, y: number, w: number, label = 'שער / Gate'): Omit<MapObject, 'id'> {
  return { type: 'gate', shapeKind: 'rect', x, y: y - 0.1, width: w, height: 0.2, label, z: 3 };
}
/** Water tap / source circle */
function water(cx: number, cy: number, label = 'ברז מים / Water tap'): Omit<MapObject, 'id'> {
  return { type: 'water-source', shapeKind: 'circle', cx, cy, radius: 0.45, label, z: 3 };
}
/** Compost bin rectangle */
function compost(x: number, y: number, label = 'קומפוסט / Compost'): Omit<MapObject, 'id'> {
  return { type: 'compost', shapeKind: 'rect', x, y, width: 2, height: 2, label, z: 3 };
}
/** Tool shed rectangle */
function shed(x: number, y: number, w: number, h: number, label = 'מחסן / Shed'): Omit<MapObject, 'id'> {
  return { type: 'tool-shed', shapeKind: 'rect', x, y, width: w, height: h, label, z: 3 };
}
/** Sun / south direction indicator */
function sun(cx: number, cy: number, label = '☀️ דרום / South'): Omit<MapObject, 'id'> {
  return { type: 'sun-indicator', shapeKind: 'circle', cx, cy, radius: 1.2, label, z: 3 };
}

// ── Standard garden boundary: house + 3-side fence + gate ────────────────────

function gardenBoundary(
  gx: number, gy: number, gw: number, gh: number,
  hasHouse: boolean,
  gateX: number, gateW: number,
): Omit<MapObject, 'id'>[] {
  const out: Omit<MapObject, 'id'>[] = [];
  const right = gx + gw;
  const bottom = gy + gh;

  if (hasHouse) {
    out.push(house(gx, gy, gw, 2.5));
  } else {
    out.push(fenceH(gx, gy, gw));
  }
  // Side fences start below house or at top
  const fenceTop = hasHouse ? gy + 2.5 : gy;
  out.push(fenceV(gx,    fenceTop, gh - (hasHouse ? 2.5 : 0)));
  out.push(fenceV(right, fenceTop, gh - (hasHouse ? 2.5 : 0)));

  // Bottom fence: two halves with gate gap
  if (gateX > gx) out.push(fenceH(gx, bottom, gateX - gx));
  out.push(gate(gateX, bottom, gateW));
  if (gateX + gateW < right) out.push(fenceH(gateX + gateW, bottom, right - gateX - gateW));

  return out;
}

// ── Balcony boundary: apartment wall + railing ────────────────────────────────

function balconyBoundary(
  gx: number, gy: number, gw: number, railingY: number,
  doorX: number, doorW: number,
): Omit<MapObject, 'id'>[] {
  const wallH = 2.5;
  const right = gx + gw;
  return [
    // Apartment wall (back)
    house(gx, gy, gw, wallH, 'קיר דירה / Apartment wall'),
    // Sliding door gap label
    gate(doorX, gy + wallH, doorW, 'דלת הזזה / Sliding door'),
    // Railing at front edge
    fenceH(gx, railingY, right - gx, 'מעקה / Railing'),
    // Side walls (short)
    fenceV(gx,    gy + wallH, railingY - gy - wallH),
    fenceV(right, gy + wallH, railingY - gy - wallH),
  ];
}

// 8 positions on a circle
function circlePos(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg - 90) * Math.PI / 180;
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
    description: { he: '4 ערוגות מוגבהות, שביל מרכזי, בית + גדר', en: '4 raised beds, central path, house & fence' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 24.5, 21, true, 10, 5),
      water(2, 3),
      compost(22, 0.5),
      sun(24, 8),
      // ── Planting ──
      rb(3, 4, 8, 4, 'עגבנייה'),
      rb(14, 4, 8, 4, 'מלפפון'),
      rb(3, 11, 8, 4, 'חסה'),
      rb(14, 11, 8, 4, 'גזר'),
      walkPath([[11,3],[13,3],[13,17],[11,17]], 'שביל אמצע'),
      walkPath([[2,8],[24,8],[24,10],[2,10]], 'שביל רוחבי'),
    ],
  },

  {
    id: 'herb-spiral',
    category: { he: 'ערוגות', en: 'Growing Beds' },
    icon: '🌿',
    title: { he: 'ערוגת עשבי תיבול', en: 'Herb spiral bed' },
    description: { he: 'פריסה עגולה, 8 עשבי תיבול, גדר + מחסן', en: 'Circular layout, 8 herb slots, fence & shed' },
    elements: (() => {
      const cx = 13, cy = 11, r = 4.2;
      const herbs = ['נענע', 'רוזמרין', 'בזיליקום', 'אורגנו', 'טימין', 'מרווה', 'פטרוזיליה', 'כוסברה'];
      const out: Omit<MapObject, 'id'>[] = [
        // ── Context ──
        lawn(1, 1, 25, 21, 'דשא / Lawn'),
        ...gardenBoundary(1, 1, 25, 21, false, 11.5, 5),
        shed(1.5, 1.5, 3, 2.5),
        water(24.5, 2),
        sun(24.5, 19),
        // ── Planting ──
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
    description: { he: '3 ערוצים, חממה, מקור מים', en: '3 channels, greenhouse, water source' },
    elements: [
      // ── Context: greenhouse boundary using pergola ──
      { type: 'pergola', shapeKind: 'rect', x: 0.5, y: 0.5, width: 25, height: 16, label: 'חממה / Greenhouse', z: 0 },
      water(1.5, 14),
      { type: 'deadzone', shapeKind: 'rect', x: 1, y: 1, width: 1.2, height: 0.8, label: 'חשמל / Power', z: 3 },
      walkPath([[1, 16],[25, 16],[25, 16.5],[1, 16.5]], 'ניקוז / Drainage'),
      sun(25, 3),
      // ── Planting ──
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
    description: { he: '4 מגדלים, חממה, השקיה בטפטוף', en: '4 towers, greenhouse, drip feed' },
    elements: [
      // ── Context: greenhouse ──
      { type: 'pergola', shapeKind: 'rect', x: 0.5, y: 0.5, width: 24, height: 18, label: 'חממה / Greenhouse', z: 0 },
      water(0.5, 16.5),
      { type: 'deadzone', shapeKind: 'rect', x: 22, y: 1, width: 1.5, height: 1, label: 'חשמל / Power', z: 3 },
      walkPath([[1, 17],[23, 17],[23, 17.5],[1, 17.5]], 'ניקוז / Drainage'),
      sun(23, 3),
      // ── Planting ──
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
    description: { he: '8 עציצים, קיר דירה + מעקה, פינת ישיבה', en: '8 pots, apartment wall & railing, seating corner' },
    elements: [
      // ── Context ──
      ...balconyBoundary(0.5, 0, 24, 14, 10, 4),
      dz(21, 10, 3, 3.5, 'פינת ישיבה / Seating'),
      sun(2, 10),
      // ── Planting ──
      potRect(3, 3.5, 7, 1.5, 'מדף מעקה 1'),
      potRect(13, 3.5, 7, 1.5, 'מדף מעקה 2'),
      potRound(4,   7.5, 0.7, 'נענע'),
      potRound(6.5, 7.5, 0.7, 'רוזמרין'),
      potRound(9,   7.5, 0.7, 'בזיליקום'),
      potRound(11.5,7.5, 0.7, 'פטרוזיליה'),
      potRound(14,  7.5, 0.7, 'לבנדר'),
      potRound(16.5,7.5, 0.7, 'אורגנו'),
      potRound(19,  7.5, 0.7, 'גרניום'),
      potRound(21.5,7.5, 0.7, 'פלפל'),
    ],
  },

  {
    id: 'windowsill',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🫙',
    title: { he: 'גינת חלון', en: 'Windowsill garden' },
    description: { he: '6 עציצים, מסגרת חלון, אור שמש מהדרום', en: '6 small pots, window frame, south-facing light' },
    elements: [
      // ── Context: window frame ──
      { type: 'wall', shapeKind: 'rect', x: 1, y: 5.5, width: 18, height: 0.3, label: 'אדן חלון / Sill', z: 2 },
      { type: 'wall', shapeKind: 'rect', x: 1, y: 5.5, width: 0.3, height: 6, label: 'מסגרת / Frame', z: 2 },
      { type: 'wall', shapeKind: 'rect', x: 18.7, y: 5.5, width: 0.3, height: 6, label: 'מסגרת / Frame', z: 2 },
      { type: 'wall', shapeKind: 'rect', x: 1, y: 11.5, width: 18, height: 0.3, label: 'מסגרת / Frame', z: 2 },
      sun(19.5, 8, '☀️ אור שמש / Sunlight'),
      // ── Planting ──
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
    description: { he: 'תות שדה ועגבניות שרי, קיר דירה + מעקה', en: 'Strawberries & cherry tomatoes, wall & railing' },
    elements: [
      // ── Context ──
      ...balconyBoundary(0.5, 0, 24, 13, 10, 4),
      dz(20, 9.5, 3.5, 3, 'פינת ישיבה / Seating'),
      sun(2, 9.5),
      // ── Planting ──
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
    description: { he: 'פרחים אכילים, 3 רמות, קיר + מעקה', en: 'Edible flowers, 3 tiers, wall & railing' },
    elements: [
      // ── Context ──
      ...balconyBoundary(0.5, 0, 21, 16, 8, 4),
      dz(17.5, 12, 3.5, 3.5, 'פינת ישיבה / Seating'),
      sun(2, 12),
      // ── Planting (3 tiers) ──
      potRound(6,  4,  0.65, 'לבנדר'),
      potRound(10, 4,  0.65, 'רוז׳מרין'),
      potRound(14, 4,  0.65, 'מרווה'),
      potRound(4.5,8,  0.75, 'נענע'),
      potRound(9,  8,  0.75, 'בזיליקום'),
      potRound(13.5,8, 0.75, 'טימין'),
      potRound(18, 8,  0.75, 'אורגנו'),
      potRound(3,  13, 0.85, 'נסטורציה'),
      potRound(7.5,13, 0.85, 'ציפורן'),
      potRound(12, 13, 0.85, 'ורד'),
      potRound(16.5,13,0.85, 'גרניום'),
    ],
  },

  {
    id: 'salad-balcony',
    category: { he: 'עציצים', en: 'Pots & Containers' },
    icon: '🥗',
    title: { he: 'מרפסת סלטים', en: 'Salad balcony' },
    description: { he: 'חסה ורוקט, 4 ארגזים, קיר + מעקה', en: 'Lettuce & arugula, 4 boxes, wall & railing' },
    elements: [
      // ── Context ──
      ...balconyBoundary(0.5, 0, 24, 15, 10, 4),
      dz(21, 12, 3, 2.5, 'פינת ישיבה / Seating'),
      sun(2, 12),
      // ── Planting ──
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
    description: { he: '2 ערוגות + קומפוסט, בית, גדר וחצר', en: '2 beds + compost, house, fence & yard' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 25.5, 22, true, 11, 5),
      patio(0.5, 2.5, 25.5, 1.5),
      lawn(0.5, 4, 25.5, 1),
      water(2, 3),
      sun(25, 11),
      // ── Planting ──
      rb(3, 5, 9, 5, 'ערוגה 1'),
      rb(15, 5, 9, 5, 'ערוגה 2'),
      compost(3, 13),
      shed(20, 13, 3.5, 3),
      walkPath([[12,4],[15,4],[15,19],[12,19]], 'שביל'),
    ],
  },

  {
    id: 'family-garden',
    category: { he: 'גינה ביתית קטנה', en: 'Small Home Garden' },
    icon: '👨‍👩‍👧',
    title: { he: 'גינה משפחתית', en: 'Family garden' },
    description: { he: 'ירקות, עשבים, פינת ילדים, עץ צל', en: 'Vegetables, herbs, kids corner, shade tree' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 26, 26, true, 11.5, 4),
      patio(0.5, 2.5, 26, 2),
      lawn(0.5, 4.5, 10.5, 3),
      lawn(16, 4.5, 10.5, 3),
      water(2, 3.5),
      tree(2, 24, 2, 'עץ צל / Shade tree'),
      sun(25, 3.5),
      // ── Planting ──
      walkPath([[12,3],[15,3],[15,24],[12,24]], 'שביל מרכזי'),
      rb(3,  5, 8, 6, 'ירקות קלים'),
      rb(16, 5, 8, 6, 'ירקות קלים'),
      bed(3, 13, 8, 3, 'עשבי תיבול'),
      bed(16,13, 8, 3, 'עשבי תיבול'),
      dz(3, 18, 5, 4, 'פינת משחק / Play zone'),
      rb(16,18, 8, 4, 'פרחים'),
    ],
  },

  {
    id: 'mandala-garden',
    category: { he: 'גינה ביתית קטנה', en: 'Small Home Garden' },
    icon: '🌀',
    title: { he: 'גינת מנדלה', en: 'Mandala garden' },
    description: { he: 'ערוגות עגולות, גדר + עצי פינה, מוקד מרכזי', en: 'Circular beds, fence & corner trees, central focal point' },
    elements: (() => {
      const cx = 13, cy = 12;
      const out: Omit<MapObject, 'id'>[] = [
        // ── Context ──
        lawn(1, 1, 25, 24, 'דשא / Lawn'),
        ...gardenBoundary(1, 1, 25, 24, false, 11.5, 4),
        tree(2, 2.5, 1.5, 'עץ פינה'),
        tree(25, 2.5, 1.5, 'עץ פינה'),
        tree(2, 23.5, 1.5, 'עץ פינה'),
        tree(25, 23.5, 1.5, 'עץ פינה'),
        water(1.5, 13),
        sun(25.5, 3),
        // ── Planting ──
        potRound(cx, cy, 1.2, 'מוקד'),
      ];
      [0, 90, 180, 270].forEach(deg => {
        const [px, py] = circlePos(cx, cy, 3.5, deg);
        out.push(bed(px - 1.2, py - 1.2, 2.4, 2.4, 'שתילה'));
      });
      ['עגבנייה', 'מלפפון', 'חסה', 'גזר', 'תרד', 'בצל', 'שעועית', 'אפונה'].forEach((label, i) => {
        const [px, py] = circlePos(cx, cy, 7, i * 45);
        out.push(rb(px - 1.2, py - 1.2, 2.4, 2.4, label));
      });
      [0, 90, 180, 270].forEach(deg => {
        const [ix, iy] = circlePos(cx, cy, 2, deg);
        const [ox, oy] = circlePos(cx, cy, 6, deg);
        const p = 0.4, a = (deg - 90) * Math.PI / 180;
        const nx = -Math.sin(a) * p, ny = Math.cos(a) * p;
        out.push(walkPath([[ix+nx,iy+ny],[ix-nx,iy-ny],[ox-nx,oy-ny],[ox+nx,oy+ny]], 'שביל'));
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
    description: { he: '6 עצי פרי, בית + גדר, קומפוסט ומחסן', en: '6 fruit trees, house & fence, compost & shed' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 26, 23, true, 11, 5),
      shed(22.5, 3, 3.5, 3),
      water(2, 3.5),
      compost(1, 18),
      sun(25, 3.5),
      // ── Planting ──
      ftree(5,  6, 1.8, 'עץ פרי 1'),
      ftree(13, 6, 1.8, 'עץ פרי 2'),
      ftree(21, 6, 1.8, 'עץ פרי 3'),
      ftree(5,  14, 1.8, 'עץ פרי 4'),
      ftree(13, 14, 1.8, 'עץ פרי 5'),
      ftree(21, 14, 1.8, 'עץ פרי 6'),
      bed(3, 19, 21, 2, 'כיסוי קרקע'),
    ],
  },

  {
    id: 'mixed-garden',
    category: { he: 'גינת פרי', en: 'Orchard' },
    icon: '🌻',
    title: { he: 'גינה משולבת', en: 'Mixed garden' },
    description: { he: 'עצים + ירקות + פרחים, בית + גדר', en: 'Trees + vegetables + flowers, house & fence' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 26, 24, true, 11, 5),
      patio(0.5, 2.5, 26, 2),
      lawn(0.5, 4.5, 26, 2.5),
      water(2, 3.5),
      sun(25, 20),
      // ── Planting ──
      tree(5,  5.5, 2, 'עץ נוי'),
      ftree(13, 5.5, 2, 'עץ פרי'),
      tree(21, 5.5, 2, 'עץ נוי'),
      rb(3,  11, 9, 5, 'ירקות'),
      rb(15, 11, 9, 5, 'ירקות'),
      bed(3, 18, 21, 2.5, 'גבול פרחים'),
    ],
  },

  // ── CATEGORY 6: גינה עירונית / Urban ──────────────────────────────────────

  {
    id: 'rooftop',
    category: { he: 'גינה עירונית', en: 'Urban' },
    icon: '🪟',
    title: { he: 'גג עירוני', en: 'Rooftop garden' },
    description: { he: 'עציצים + ערוגות, גבול גג, הגנה מרוח', en: 'Containers + beds, roof boundary, windbreak' },
    elements: [
      // ── Context: roof perimeter ──
      { type: 'wall', shapeKind: 'rect', x: 0.5, y: 0.5, width: 26, height: 0.3, label: 'שפת גג / Roof edge', z: 2 },
      { type: 'wall', shapeKind: 'rect', x: 0.5, y: 20.2, width: 26, height: 0.3, label: 'שפת גג / Roof edge', z: 2 },
      { type: 'wall', shapeKind: 'rect', x: 0.5, y: 0.5, width: 0.3, height: 20, label: 'שפת גג / Roof edge', z: 2 },
      { type: 'wall', shapeKind: 'rect', x: 26.2, y: 0.5, width: 0.3, height: 20, label: 'שפת גג / Roof edge', z: 2 },
      // Windbreak along exposed top edge
      { type: 'wall', shapeKind: 'rect', x: 1, y: 1, width: 25, height: 0.3, label: 'הגנה מרוח / Windbreak', z: 2 },
      // Side windbreak
      { type: 'wall', shapeKind: 'rect', x: 1, y: 1, width: 0.3, height: 18, label: 'הגנה מרוח / Windbreak', z: 2 },
      shed(23, 17, 3.5, 3),
      water(2, 3),
      dz(2, 17, 3, 3, 'אחסון / Storage'),
      sun(25.5, 3),
      // ── Planting ──
      rb(7, 8, 8, 4, 'ערוגה מרכזית'),
      rb(17, 8, 7, 4, 'ירקות ועשבים'),
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
    description: { he: 'ארגזים ממוחזרים, קיר אחורי, ריצוף', en: 'Recycled crates, back wall, paved ground' },
    elements: (() => {
      const out: Omit<MapObject, 'id'>[] = [
        // ── Context ──
        house(0, 0, 18, 2.5, 'קיר אחורי / Back wall'),
        patio(0, 2.5, 18, 19),
        water(17, 3),
        sun(17, 17),
      ];
      const labels = ['עגבנייה','מלפפון','חסה','גזר','תרד','בצל','פלפל','קישוא','שמיר'];
      labels.forEach((label, i) => {
        const col = i % 3, row = Math.floor(i / 3);
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
    description: { he: 'ערוגות מיושרות, BD, ירח ושמש, בית + גדר', en: 'Aligned beds, BD zones, moon & sun, house & fence' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 27, 26, true, 12, 5),
      lawn(0.5, 2.5, 27, 2),
      shed(23, 0.5, 3, 2.5, 'מחסן BD / BD Storage'),
      compost(1, 0.5),
      water(2, 3.5),
      sun(26.5, 5, '☀️ דרום / South (BD)'),
      potRound(26, 23, 1, '🌙 ירח / Moon'),
      // ── Planting ──
      rb(10, 3,  7, 4, 'צפון — שורשים'),
      rb(18, 9,  7, 4, 'מזרח — פרחים'),
      rb(10, 16, 7, 4, 'דרום — פירות'),
      rb(2,  9,  7, 4, 'מערב — עלים'),
      bed(10, 9, 7, 5, 'אזור BD — פרפרטים'),
      tree(24, 10, 1.2, 'עץ לוויין'),
      tree(24, 15, 1.2, 'עץ לוויין'),
    ],
  },

  {
    id: 'permaculture',
    category: { he: 'ביודינמי', en: 'Biodynamic Special' },
    icon: '♻️',
    title: { he: 'גינת פרמקלצ׳ר', en: 'Permaculture patch' },
    description: { he: 'גילדות, גדר חיה, קציר מים, קומפוסט', en: 'Guilds, living hedge, water harvest, compost' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 27, 26, true, 12, 5),
      // Override side/bottom fences with living hedge label
      fenceV(0.5, 2.5, 23.5, 'גדר חיה / Living hedge'),
      fenceV(28, 2.5, 23.5, 'גדר חיה / Living hedge'),
      fenceH(0.5, 26, 12, 'גדר חיה / Living hedge'),
      fenceH(17, 26, 12, 'גדר חיה / Living hedge'),
      water(2, 3.5, 'מיכל גשם / Rain tank'),
      sun(26.5, 4),
      // ── Planting ──
      ftree(6, 7, 2, 'עץ גילדה 1'),
      bed(3,  11, 7, 3, 'תת-יער'),
      bed(3,  15, 7, 3, 'כיסוי קרקע'),
      ftree(18, 7, 2, 'עץ גילדה 2'),
      bed(15, 11, 7, 3, 'תת-יער'),
      bed(15, 15, 7, 3, 'כיסוי קרקע'),
      compost(3, 20),
      aqua(10, 20, 12, 4, 'קציר מים / Swale'),
      walkPath([[2,19],[26,19],[26,19.5],[2,19.5]], 'שוויל מים'),
    ],
  },

  // ── CATEGORY 8: עשבי תיבול / Herb Gardens ─────────────────────────────────

  {
    id: 'tea-herbs',
    category: { he: 'עשבי תיבול', en: 'Herb Gardens' },
    icon: '🫖',
    title: { he: 'גינת תה צמחים', en: 'Tea herb garden' },
    description: { he: 'נענע, לואיזה, קמומיל, גדר אבן + ספסל', en: 'Mint, verbena, chamomile, stone wall & bench' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 25, 20, false, 11, 4),
      shed(1, 16.5, 3, 2.5, 'ספסל / Bench'),
      water(24, 1.5),
      sun(24, 17),
      // ── Planting ──
      bed(3,  4,  9, 5, 'תה מרגיע — נענע, לואיזה'),
      bed(14, 4,  9, 5, 'תה מחזק — מרווה, טימין'),
      bed(3,  11, 9, 5, 'תה פרחוני — קמומיל, לבנדר'),
      bed(14, 11, 9, 5, 'תה עיכול — זנגביל, לימון'),
      walkPath([[12,3],[13.5,3],[13.5,17],[12,17]], 'שביל'),
      walkPath([[2,9.5],[24,9.5],[24,10.5],[2,10.5]], 'שביל'),
    ],
  },

  {
    id: 'kitchen-herbs',
    category: { he: 'עשבי תיבול', en: 'Herb Gardens' },
    icon: '🍕',
    title: { he: 'עשבי תיבול למטבח', en: 'Kitchen herbs' },
    description: { he: 'פריסה ים-תיכונית, גדר + כניסה, ספסל', en: 'Mediterranean layout, fence & arch entry, bench' },
    elements: [
      // ── Context ──
      ...gardenBoundary(0.5, 0, 29, 20, false, 13, 4),
      shed(1, 16.5, 3, 2.5, 'ספסל / Bench'),
      water(28, 1.5),
      sun(28, 17),
      walkPath([[10.5,3],[11,3],[11,18],[10.5,18]], 'שביל'),
      walkPath([[19.5,3],[20,3],[20,18],[19.5,18]], 'שביל'),
      // ── Planting ──
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
    description: { he: 'פריסת קשת, גדר + ספסל, מקור מים', en: 'Arc layout, fence & bench, water source' },
    elements: (() => {
      const herbs = ['אלוורה', 'קלנדולה', 'לבנדר', 'היפריקום', 'אכינצאה'];
      const cx = 14, cy = 17, arcR = 10;
      const beds = herbs.map((herb, i) => {
        const angle = -50 + i * 25;
        const [px, py] = circlePos(cx, cy, arcR, angle);
        return bed(px - 2, py - 1.5, 4, 3, herb);
      });
      return [
        // ── Context ──
        ...gardenBoundary(0.5, 0, 28, 20, false, 13, 4),
        shed(1, 16.5, 3, 2.5, 'ספסל / Bench'),
        water(27, 2),
        sun(27, 17),
        // ── Planting ──
        ...beds,
        // Arc path connecting beds
        walkPath([[5,12],[8.5,9],[14,7.5],[19.5,9],[23,12],[22.5,12.5],[19.5,9.5],[14,8],[8.5,9.5],[5.5,12.5]], 'שביל'),
      ];
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

// ── Override type (mirrors the garden_template_overrides DB table) ─────────────

export interface TemplateOverride {
  id: string;
  title_he: string | null;
  title_en: string | null;
  description_he: string | null;
  description_en: string | null;
  is_hidden: boolean;
  sort_order: number;
  icon: string | null;
  category_he: string | null;
  category_en: string | null;
  is_custom: boolean;
  elements: Omit<MapObject, 'id'>[] | null;
}

/** Merge DB overrides onto the static template list.
 *  - Hidden templates are excluded.
 *  - DB elements take precedence over static ones when present.
 *  - Custom DB-only templates are appended.
 *  - Result is sorted by sort_order within each category.
 */
export function mergeWithOverrides(overrides: TemplateOverride[]): GardenTemplate[] {
  const ovMap = new Map(overrides.map(o => [o.id, o]));
  const baseIds = new Set(GARDEN_TEMPLATES.map(t => t.id));

  type Sortable = GardenTemplate & { _order: number };
  const merged: Sortable[] = [];

  GARDEN_TEMPLATES.forEach((tpl, idx) => {
    const ov = ovMap.get(tpl.id);
    if (ov?.is_hidden) return;
    merged.push({
      ...tpl,
      icon: ov?.icon ?? tpl.icon,
      title: { he: ov?.title_he ?? tpl.title.he, en: ov?.title_en ?? tpl.title.en },
      description: { he: ov?.description_he ?? tpl.description.he, en: ov?.description_en ?? tpl.description.en },
      elements: (ov?.elements as Omit<MapObject, 'id'>[] | null | undefined) ?? tpl.elements,
      _order: ov?.sort_order ?? idx,
    });
  });

  // Custom DB-only templates
  overrides.forEach(ov => {
    if (!ov.is_custom || baseIds.has(ov.id) || ov.is_hidden) return;
    merged.push({
      id: ov.id,
      category: { he: ov.category_he ?? 'מותאם אישית', en: ov.category_en ?? 'Custom' },
      icon: ov.icon ?? '🌿',
      title: { he: ov.title_he ?? '', en: ov.title_en ?? '' },
      description: { he: ov.description_he ?? '', en: ov.description_en ?? '' },
      elements: (ov.elements as Omit<MapObject, 'id'>[] | null | undefined) ?? [],
      _order: ov.sort_order,
    });
  });

  merged.sort((a, b) => a._order - b._order);
  return merged.map(({ _order: _o, ...t }) => t as GardenTemplate);
}
