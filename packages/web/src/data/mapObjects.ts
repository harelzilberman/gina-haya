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
  { type: 'bed',    labelHe: 'ערוגת גידול',     emoji: '🌱', color: 'rgba(74,128,80,0.4)',    border: '#7DC084', borderWidth: 2, borderDash: [] },
  { type: 'raised', labelHe: 'ערוגה מוגבהת',    emoji: '🪵', color: 'rgba(139,90,43,0.4)',    border: '#8B5E2A', borderWidth: 3, borderDash: [] },
  { type: 'pot',    labelHe: 'עציץ/מיכל',        emoji: '🪴', color: 'rgba(180,100,40,0.4)',   border: '#C0622A', borderWidth: 2, borderDash: [], isCircle: true },
  { type: 'wall',   labelHe: 'קיר בית',          emoji: '🏠', color: 'rgba(100,80,60,0.5)',    border: '#8B6914', borderWidth: 4, borderDash: [] },
  { type: 'fence',  labelHe: 'גדר',              emoji: '🚧', color: 'rgba(139,97,20,0.3)',    border: '#9B7A48', borderWidth: 2, borderDash: [8, 4] },
  { type: 'path',   labelHe: 'שביל',             emoji: '🛤️', color: 'rgba(180,160,120,0.4)',  border: '#9B7A48', borderWidth: 1, borderDash: [] },
  { type: 'water',  labelHe: 'ברז מים',          emoji: '🚿', color: 'rgba(30,100,200,0.3)',   border: '#4A90D9', borderWidth: 2, borderDash: [], isCircle: true, isPoint: true },
  { type: 'tree',   labelHe: 'עץ',               emoji: '🌳', color: 'rgba(34,100,34,0.5)',    border: '#2d6e3e', borderWidth: 2, borderDash: [], isCircle: true },
  { type: 'shade',  labelHe: 'גגון/פרגולה',      emoji: '⛺', color: 'rgba(120,80,40,0.2)',   border: '#9B7A48', borderWidth: 2, borderDash: [4, 4] },
  { type: 'unused', labelHe: 'שטח ללא שימוש',    emoji: '❌', color: 'rgba(80,80,80,0.3)',     border: '#555555', borderWidth: 1, borderDash: [4, 4] },
];

export const MAP_OBJECT_MAP = new Map<string, MapObjectType>(
  MAP_OBJECT_TYPES.map(t => [t.type, t])
);
