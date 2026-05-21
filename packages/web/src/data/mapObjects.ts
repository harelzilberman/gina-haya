export type ShapeType =
  | 'house' | 'fence' | 'wall' | 'pergola' | 'deadzone' | 'walkway'
  | 'fruit-tree' | 'tree'
  | 'pot-rect' | 'pot-round'
  | 'bed' | 'hydroponics' | 'aquaponics' | 'raised-bed' | 'vertical'
  // Contextual / template elements
  | 'lawn' | 'water-source' | 'compost' | 'tool-shed' | 'gate' | 'sun-indicator';

export type ShapeKind = 'polygon' | 'rect' | 'circle';
export type PatternType = 'net' | 'gravel' | 'concrete' | 'hydro' | 'aqua' | 'wood' | 'trellis';

export interface ShapeConfig {
  type: ShapeType;
  shapeKind: ShapeKind;
  labelHe: string;
  labelEn: string;
  emoji: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash?: number[];
  /** Fixed thin dimension in meters (fence=0.1, wall=0.2) */
  fixedWidth?: number;
  /** Default width in meters (rect only) */
  defaultWidth?: number;
  /** Default height/length in meters (rect only) */
  defaultHeight?: number;
  /** Default radius in meters (circle only) */
  defaultRadius?: number;
  /** Default structural wall height in meters */
  defaultWallHeightM?: number;
  pattern?: PatternType;
}

export const SHAPE_CONFIGS: Record<ShapeType, ShapeConfig> = {
  'house': {
    type: 'house', shapeKind: 'polygon',
    labelHe: 'בית', labelEn: 'House', emoji: '🏠',
    fill: 'rgba(180,140,100,0.35)', stroke: '#8B6914', strokeWidth: 3,
    defaultWallHeightM: 3,
  },
  'fence': {
    type: 'fence', shapeKind: 'rect',
    labelHe: 'גדר', labelEn: 'Fence', emoji: '🚧',
    fill: 'rgba(155,122,72,0.4)', stroke: '#9B7A48', strokeWidth: 2,
    strokeDash: [8, 4],
    fixedWidth: 0.1, defaultHeight: 2,
    defaultWallHeightM: 1,
  },
  'wall': {
    type: 'wall', shapeKind: 'rect',
    labelHe: 'קיר', labelEn: 'Wall', emoji: '🧱',
    fill: 'rgba(120,100,80,0.6)', stroke: '#8B6914', strokeWidth: 4,
    fixedWidth: 0.2, defaultHeight: 2,
    defaultWallHeightM: 2,
  },
  'pergola': {
    type: 'pergola', shapeKind: 'rect',
    labelHe: 'פרגולה', labelEn: 'Pergola', emoji: '⛺',
    fill: 'transparent', stroke: '#9B7A48', strokeWidth: 2,
    strokeDash: [4, 4],
    defaultWidth: 3, defaultHeight: 3,
    pattern: 'net',
  },
  'deadzone': {
    type: 'deadzone', shapeKind: 'rect',
    labelHe: 'אזור מת', labelEn: 'Dead zone', emoji: '❌',
    fill: 'rgba(60,60,60,0.35)', stroke: '#555', strokeWidth: 1,
    strokeDash: [4, 4],
    defaultWidth: 2, defaultHeight: 2,
    pattern: 'gravel',
  },
  'walkway': {
    type: 'walkway', shapeKind: 'polygon',
    labelHe: 'שביל', labelEn: 'Walkway', emoji: '🛤️',
    fill: 'transparent', stroke: '#9B7A48', strokeWidth: 1,
    pattern: 'concrete',
  },
  'fruit-tree': {
    type: 'fruit-tree', shapeKind: 'circle',
    labelHe: 'עץ פרי', labelEn: 'Fruit tree', emoji: '🍊',
    fill: 'rgba(34,100,34,0.45)', stroke: '#2d6e3e', strokeWidth: 2,
    defaultRadius: 1.5,
  },
  'tree': {
    type: 'tree', shapeKind: 'circle',
    labelHe: 'עץ נוי', labelEn: 'Ornamental tree', emoji: '🌳',
    fill: 'rgba(20,80,20,0.4)', stroke: '#2d6e3e', strokeWidth: 2,
    defaultRadius: 1.5,
  },
  'pot-rect': {
    type: 'pot-rect', shapeKind: 'rect',
    labelHe: 'עציץ מלבני', labelEn: 'Rectangular pot', emoji: '🪴',
    fill: 'rgba(180,100,40,0.45)', stroke: '#C0622A', strokeWidth: 2,
    defaultWidth: 0.3, defaultHeight: 0.3,
  },
  'pot-round': {
    type: 'pot-round', shapeKind: 'circle',
    labelHe: 'עציץ עגול', labelEn: 'Round pot', emoji: '🪴',
    fill: 'rgba(180,100,40,0.45)', stroke: '#C0622A', strokeWidth: 2,
    defaultRadius: 0.1,
  },
  'bed': {
    type: 'bed', shapeKind: 'rect',
    labelHe: 'ערוגת גידול', labelEn: 'Growing bed', emoji: '🌱',
    fill: 'rgba(74,156,104,0.35)', stroke: '#4A9C68', strokeWidth: 2,
    defaultWidth: 2, defaultHeight: 1,
  },
  'hydroponics': {
    type: 'hydroponics', shapeKind: 'rect',
    labelHe: 'הידרופוניקה', labelEn: 'Hydroponics', emoji: '💧',
    fill: 'rgba(30,100,200,0.25)', stroke: '#4A90D9', strokeWidth: 2,
    strokeDash: [4, 2],
    defaultWidth: 1.5, defaultHeight: 0.5,
    pattern: 'hydro',
  },
  'aquaponics': {
    type: 'aquaponics', shapeKind: 'rect',
    labelHe: 'אקווופוניקה', labelEn: 'Aquaponics', emoji: '🐟',
    fill: 'rgba(20,120,180,0.30)', stroke: '#2E86AB', strokeWidth: 2,
    strokeDash: [6, 3],
    defaultWidth: 2, defaultHeight: 1,
    pattern: 'aqua',
  },
  'raised-bed': {
    type: 'raised-bed', shapeKind: 'rect',
    labelHe: 'ערוגה מוגבהת', labelEn: 'Raised bed', emoji: '🧱',
    fill: 'rgba(139,90,43,0.35)', stroke: '#8B5E2A', strokeWidth: 3,
    defaultWidth: 2, defaultHeight: 1,
    pattern: 'wood',
  },
  'vertical': {
    type: 'vertical', shapeKind: 'rect',
    labelHe: 'גידול אנכי', labelEn: 'Vertical growing', emoji: '🌿',
    fill: 'rgba(34,100,34,0.25)', stroke: '#4A9C68', strokeWidth: 2,
    strokeDash: [3, 3],
    defaultWidth: 0.3, defaultHeight: 2,
    pattern: 'trellis',
  },

  // ── Contextual / template elements ──────────────────────────────────────────
  'lawn': {
    type: 'lawn', shapeKind: 'rect',
    labelHe: 'דשא', labelEn: 'Lawn', emoji: '🌿',
    fill: 'rgba(134,196,88,0.25)', stroke: '#88C456', strokeWidth: 1,
    strokeDash: [6, 5],
    defaultWidth: 5, defaultHeight: 5,
  },
  'water-source': {
    type: 'water-source', shapeKind: 'circle',
    labelHe: 'ברז מים', labelEn: 'Water tap', emoji: '🚿',
    fill: 'rgba(30,110,210,0.55)', stroke: '#2A7EC8', strokeWidth: 2,
    defaultRadius: 0.4,
  },
  'compost': {
    type: 'compost', shapeKind: 'rect',
    labelHe: 'קומפוסט', labelEn: 'Compost', emoji: '♻️',
    fill: 'rgba(101,67,33,0.55)', stroke: '#6B4226', strokeWidth: 2,
    defaultWidth: 1.8, defaultHeight: 1.8,
  },
  'tool-shed': {
    type: 'tool-shed', shapeKind: 'rect',
    labelHe: 'מחסן', labelEn: 'Tool shed', emoji: '🏚',
    fill: 'rgba(105,78,50,0.5)', stroke: '#7A5A3A', strokeWidth: 2,
    defaultWidth: 2.5, defaultHeight: 2,
  },
  'gate': {
    type: 'gate', shapeKind: 'rect',
    labelHe: 'שער', labelEn: 'Gate', emoji: '🚪',
    fill: 'rgba(180,140,60,0.35)', stroke: '#C49A2A', strokeWidth: 2,
    strokeDash: [3, 3],
    defaultWidth: 2, defaultHeight: 0.2,
  },
  'sun-indicator': {
    type: 'sun-indicator', shapeKind: 'circle',
    labelHe: '☀️ דרום', labelEn: '☀️ South', emoji: '☀️',
    fill: 'rgba(0,229,195,0.08)', stroke: '#00e5c3', strokeWidth: 1.5,
    strokeDash: [4, 3],
    defaultRadius: 1.2,
  },
};

// ── Legacy types (kept for any backward compat) ──────────────────────────────

export interface MapObjectType {
  type: string;
  labelHe: string;
  emoji: string;
  color: string;
  border: string;
  borderWidth: number;
  borderDash: number[];
  isCircle?: boolean;
  isPoint?: boolean;
}

export const MAP_OBJECT_TYPES: MapObjectType[] = [
  { type: 'bed',    labelHe: 'ערוגת גידול',  emoji: '🌱', color: 'rgba(74,156,104,0.4)',  border: '#4A9C68', borderWidth: 2, borderDash: [] },
  { type: 'raised', labelHe: 'ערוגה מוגבהת', emoji: '🪵', color: 'rgba(139,90,43,0.4)',   border: '#8B5E2A', borderWidth: 3, borderDash: [] },
  { type: 'pot',    labelHe: 'עציץ/מיכל',    emoji: '🪴', color: 'rgba(180,100,40,0.4)',  border: '#C0622A', borderWidth: 2, borderDash: [], isCircle: true },
  { type: 'wall',   labelHe: 'קיר בית',      emoji: '🏠', color: 'rgba(100,80,60,0.5)',   border: '#8B6914', borderWidth: 4, borderDash: [] },
  { type: 'fence',  labelHe: 'גדר',           emoji: '🚧', color: 'rgba(139,97,20,0.3)',   border: '#9B7A48', borderWidth: 2, borderDash: [8,4] },
  { type: 'path',   labelHe: 'שביל',          emoji: '🛤️', color: 'rgba(180,160,120,0.4)', border: '#9B7A48', borderWidth: 1, borderDash: [] },
  { type: 'water',  labelHe: 'ברז מים',       emoji: '🚿', color: 'rgba(30,100,200,0.3)',  border: '#4A90D9', borderWidth: 2, borderDash: [], isCircle: true, isPoint: true },
  { type: 'tree',   labelHe: 'עץ',            emoji: '🌳', color: 'rgba(34,100,34,0.5)',   border: '#2d6e3e', borderWidth: 2, borderDash: [], isCircle: true },
  { type: 'shade',  labelHe: 'גגון/פרגולה',   emoji: '⛺', color: 'rgba(120,80,40,0.2)',  border: '#9B7A48', borderWidth: 2, borderDash: [4,4] },
  { type: 'unused', labelHe: 'שטח ללא שימון', emoji: '❌', color: 'rgba(80,80,80,0.3)',    border: '#555555', borderWidth: 1, borderDash: [4,4] },
];

export const MAP_OBJECT_MAP = new Map<string, MapObjectType>(
  MAP_OBJECT_TYPES.map(t => [t.type, t])
);
