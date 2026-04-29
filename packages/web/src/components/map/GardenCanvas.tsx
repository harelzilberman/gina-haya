import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapObject, PlantMarker, MapData, MapTool, PlantPreview } from '../../stores/mapStore';
import { SHAPE_CONFIGS, type ShapeType } from '../../data/mapObjects';
import { GridInfoBox } from './GridInfoBox';
import { ShapePropertiesPanel } from './ShapePropertiesPanel';

// ── Constants ─────────────────────────────────────────────────────────────────

const PX = 50;            // px per meter
const CANVAS_W = 2000;    // virtual canvas px
const CANVAS_H = 1600;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

// Tool → shape kind mapping
const TOOL_KIND: Partial<Record<MapTool, 'polygon' | 'rect' | 'circle'>> = {
  house: 'polygon', walkway: 'polygon',
  fence: 'rect', wall: 'rect', pergola: 'rect', deadzone: 'rect', 'pot-rect': 'rect',
  bed: 'rect', hydroponics: 'rect', aquaponics: 'rect', 'raised-bed': 'rect', vertical: 'rect',
  'fruit-tree': 'circle', tree: 'circle', 'pot-round': 'circle',
};
const FIXED_WIDTH: Partial<Record<MapTool, number>> = { fence: 0.1, wall: 0.2 };

// ── Local types ───────────────────────────────────────────────────────────────

interface Transform { x: number; y: number; s: number }

type DrawState =
  | { kind: 'polygon'; tool: ShapeType; pts: [number, number][] }
  | { kind: 'rect';    tool: ShapeType; start: [number, number]; end: [number, number] }
  | { kind: 'circle';  tool: ShapeType; center: [number, number]; end: [number, number] };

interface PostPopup {
  obj: Omit<MapObject, 'id'>;
  sx: number; sy: number; // screen px
}

interface SelectionDrag {
  id: string;
  startMx: number; startMy: number;   // canvas meters at drag start
  origX?: number; origY?: number;
  origCx?: number; origCy?: number;
  origPts?: [number, number][];
}

interface ResizeDrag {
  id: string;
  handle: string; // 'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'|'r' (radius) | 'rot'
  startMx: number; startMy: number;
  origObj: MapObject;
}

interface Props {
  mapData: MapData;
  northAngle: number;
  selectedTool: MapTool;
  activePlant: { nameHe: string; nameEn: string; emoji: string; spacing: number } | null;
  selectedObjectId: string | null;
  showSunZones: boolean;
  onAddObject: (obj: Omit<MapObject, 'id'>) => string;
  onUpdateObject: (id: string, changes: Partial<MapObject>) => void;
  onDeleteObject: (id: string) => void;
  onAddPlant: (plant: Omit<PlantMarker, 'id'>) => void;
  onRemovePlant: (id: string) => void;
  onUpdatePlant: (id: string, changes: Partial<PlantMarker>) => void;
  onSelectObject: (id: string | null) => void;
  onSetNorthAngle: (angle: number) => void;
  onToggleLock: (id: string) => void;
  previewPlants?: PlantPreview[];
  onConfirmPreview?: () => void;
  onCancelPreview?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2);
}
function centroid(pts: [number, number][]): [number, number] {
  return [pts.reduce((s,p)=>s+p[0],0)/pts.length, pts.reduce((s,p)=>s+p[1],0)/pts.length];
}
function ptsToStr(pts: [number, number][]) {
  return pts.map(p => `${p[0]*PX},${p[1]*PX}`).join(' ');
}
function polyArea(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i+1) % pts.length;
    s += pts[i][0]*pts[j][1] - pts[j][0]*pts[i][1];
  }
  return Math.abs(s/2);
}
function deg(rad: number) { return rad * 180 / Math.PI; }
function rad(d: number) { return d * Math.PI / 180; }

// Build rect data from two screen points for fence/wall (fixed-width line) or free rect
function makeRectFromDrag(
  start: [number, number], end: [number, number], fixedW?: number
): Omit<MapObject, 'id' | 'type' | 'shapeKind' | 'label'> {
  if (fixedW != null) {
    // Line-style rect: thin along drag direction
    const length = Math.max(0.2, dist(start, end));
    const angle = deg(Math.atan2(end[0]-start[0], end[1]-start[1])); // from-north convention
    const cx = (start[0]+end[0])/2;
    const cy = (start[1]+end[1])/2;
    return {
      x: cx - fixedW/2, y: cy - length/2,
      width: fixedW, height: length,
      rotation: angle,
    };
  }
  // Free rect (axis-aligned)
  const x = Math.min(start[0], end[0]);
  const y = Math.min(start[1], end[1]);
  const width  = Math.max(0.2, Math.abs(end[0]-start[0]));
  const height = Math.max(0.2, Math.abs(end[1]-start[1]));
  return { x, y, width, height, rotation: 0 };
}

// ── SVG Defs (patterns) ───────────────────────────────────────────────────────

function SvgDefs() {
  return (
    <defs>
      <pattern id="pat-net" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0,10 L10,0 M-2,2 L2,-2 M8,12 L12,8"
          stroke="rgba(139,90,43,0.4)" strokeWidth="1" fill="none"/>
      </pattern>
      <pattern id="pat-gravel" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="rgba(60,60,60,0.35)"/>
        <circle cx="2" cy="2" r="1" fill="rgba(80,80,80,0.4)"/>
        <circle cx="6" cy="6" r="1" fill="rgba(60,60,60,0.4)"/>
        <circle cx="2" cy="6" r="0.5" fill="rgba(70,70,70,0.3)"/>
        <circle cx="6" cy="2" r="0.7" fill="rgba(80,80,80,0.3)"/>
      </pattern>
      <pattern id="pat-concrete" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="rgba(160,150,130,0.3)"/>
        <path d="M10,0 L10,20 M0,10 L20,10"
          stroke="rgba(120,110,90,0.4)" strokeWidth="0.5" fill="none"/>
      </pattern>
      <pattern id="pat-hydro" width="10" height="6" patternUnits="userSpaceOnUse">
        <line x1="0" y1="3" x2="10" y2="3" stroke="rgba(74,144,217,0.3)" strokeWidth="1"/>
      </pattern>
      <pattern id="pat-aqua" width="20" height="10" patternUnits="userSpaceOnUse">
        <path d="M0,5 Q5,0 10,5 Q15,10 20,5" stroke="rgba(46,134,171,0.35)" strokeWidth="1" fill="none"/>
      </pattern>
      <pattern id="pat-wood" width="30" height="8" patternUnits="userSpaceOnUse">
        <rect width="30" height="8" fill="rgba(139,90,43,0.2)"/>
        <line x1="0" y1="4" x2="30" y2="4" stroke="rgba(100,60,20,0.25)" strokeWidth="0.5"/>
        <line x1="0" y1="1" x2="30" y2="1" stroke="rgba(160,110,60,0.15)" strokeWidth="0.3"/>
      </pattern>
      <pattern id="pat-trellis" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M4,0 L4,8 M0,4 L8,4" stroke="rgba(74,124,89,0.3)" strokeWidth="0.5"/>
      </pattern>
      <filter id="shadow-sm">
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
      </filter>
    </defs>
  );
}

// ── Shape renderer ────────────────────────────────────────────────────────────

function renderShapeFill(obj: MapObject) {
  const cfg = SHAPE_CONFIGS[obj.type];
  if (!cfg) return null;

  const strokeDash = cfg.strokeDash?.map(n => n).join(',') ?? undefined;
  const patId = cfg.pattern ? `url(#pat-${cfg.pattern})` : cfg.fill;

  if (obj.shapeKind === 'polygon' && obj.points) {
    const pts = ptsToStr(obj.points);
    return (
      <g>
        {cfg.pattern && (
          <polygon points={pts} fill={cfg.fill} />
        )}
        <polygon
          points={pts}
          fill={patId}
          stroke={cfg.stroke} strokeWidth={cfg.strokeWidth}
          strokeDasharray={strokeDash}
        />
      </g>
    );
  }

  if (obj.shapeKind === 'rect' && obj.x != null && obj.y != null && obj.width != null && obj.height != null) {
    const rx = obj.x * PX;
    const ry = obj.y * PX;
    const rw = obj.width * PX;
    const rh = obj.height * PX;
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const rotation = obj.rotation ?? 0;
    return (
      <g transform={`rotate(${rotation},${cx},${cy})`}>
        {cfg.pattern && (
          <rect x={rx} y={ry} width={rw} height={rh} fill={cfg.fill} />
        )}
        <rect
          x={rx} y={ry} width={rw} height={rh}
          fill={patId}
          stroke={cfg.stroke} strokeWidth={cfg.strokeWidth}
          strokeDasharray={strokeDash}
        />
      </g>
    );
  }

  if (obj.shapeKind === 'circle' && obj.cx != null && obj.cy != null && obj.radius != null) {
    const cx = obj.cx * PX;
    const cy = obj.cy * PX;
    const r  = obj.radius * PX;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={cfg.strokeWidth} />
        {/* Trunk circle */}
        <circle cx={cx} cy={cy} r={Math.max(4, 0.2*PX)} fill="rgba(139,90,43,0.8)" />
        {/* Emoji label */}
        <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize={18} style={{ userSelect: 'none' }}>
          {cfg.emoji}
        </text>
      </g>
    );
  }

  return null;
}

function renderShapeLabel(obj: MapObject) {
  if (!obj.label) return null;
  let lx = 0, ly = 0;

  if (obj.shapeKind === 'polygon' && obj.points) {
    const [cx, cy] = centroid(obj.points);
    lx = cx * PX; ly = cy * PX;
  } else if (obj.shapeKind === 'rect' && obj.x != null) {
    const cx = (obj.x + (obj.width??0)/2) * PX;
    const cy = (obj.y! + (obj.height??0)/2) * PX;
    lx = cx; ly = cy;
  } else if (obj.shapeKind === 'circle' && obj.cx != null) {
    lx = obj.cx * PX; ly = obj.cy! * PX;
  }

  const name = obj.fruitTreeName
    ? `${SHAPE_CONFIGS[obj.type]?.emoji ?? ''} ${obj.fruitTreeName}`
    : obj.label;

  return (
    <text
      x={lx} y={ly + 4}
      textAnchor="middle"
      fontSize={12} fill={PARCH}
      fontFamily={FRANK}
      style={{ userSelect: 'none', pointerEvents: 'none' }}
      stroke="rgba(0,0,0,0.5)" strokeWidth={2} paintOrder="stroke"
    >
      {name}
    </text>
  );
}

// ── Selection overlay ─────────────────────────────────────────────────────────

function SelectionOverlay({
  obj, isLocked, onStartResize,
}: {
  obj: MapObject;
  isLocked: boolean;
  onStartResize: (handle: string, e: React.MouseEvent) => void;
}) {
  const handleStyle = (cursor: string): React.CSSProperties => ({
    fill: GOLD, stroke: '#142B16', strokeWidth: 1.5,
    cursor, filter: 'url(#shadow-sm)',
  });

  if (obj.shapeKind === 'polygon' && obj.points) {
    const [cx, cy] = centroid(obj.points);
    return (
      <g>
        <polygon
          points={ptsToStr(obj.points)}
          fill="none" stroke={GOLD} strokeWidth={1.5} strokeDasharray="6,3"
        />
        {!isLocked && obj.points.map(([px, py], i) => (
          <circle key={i} cx={px*PX} cy={py*PX} r={5}
            style={handleStyle('move')}
            onMouseDown={e => { e.stopPropagation(); onStartResize(`v${i}`, e); }}
          />
        ))}
        {!isLocked && <RotationHandle cx={cx*PX} cy={cy*PX} onStart={e => onStartResize('rot', e)} />}
      </g>
    );
  }

  if (obj.shapeKind === 'rect' && obj.x != null && obj.width != null && obj.height != null) {
    const rx = obj.x * PX, ry = obj.y! * PX;
    const rw = obj.width * PX, rh = obj.height * PX;
    const cx = rx + rw/2, cy = ry + rh/2;
    const rot = obj.rotation ?? 0;
    const H = 5;
    const handles: [string, number, number, string][] = [
      ['nw', rx,      ry,      'nw-resize'],
      ['n',  cx,      ry,      'n-resize'],
      ['ne', rx+rw,   ry,      'ne-resize'],
      ['e',  rx+rw,   cy,      'e-resize'],
      ['se', rx+rw,   ry+rh,   'se-resize'],
      ['s',  cx,      ry+rh,   's-resize'],
      ['sw', rx,      ry+rh,   'sw-resize'],
      ['w',  rx,      cy,      'w-resize'],
    ];
    return (
      <g transform={`rotate(${rot},${cx},${cy})`}>
        <rect x={rx} y={ry} width={rw} height={rh}
          fill="none" stroke={GOLD} strokeWidth={1.5} strokeDasharray="6,3" />
        {!isLocked && handles.map(([id, hx, hy, cur]) => (
          <rect key={id} x={hx-H} y={hy-H} width={H*2} height={H*2}
            rx={2}
            style={handleStyle(cur)}
            onMouseDown={e => { e.stopPropagation(); onStartResize(id, e); }}
          />
        ))}
        {!isLocked && obj.type !== 'pot-rect' && (
          <RotationHandle cx={cx} cy={ry - 20} onStart={e => onStartResize('rot', e)} />
        )}
      </g>
    );
  }

  if (obj.shapeKind === 'circle' && obj.cx != null && obj.radius != null) {
    const cx = obj.cx * PX, cy = obj.cy! * PX;
    const r  = obj.radius * PX;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r}
          fill="none" stroke={GOLD} strokeWidth={1.5} strokeDasharray="6,3" />
        {!isLocked && (
          <circle cx={cx+r} cy={cy} r={5}
            style={handleStyle('ew-resize')}
            onMouseDown={e => { e.stopPropagation(); onStartResize('r', e); }}
          />
        )}
        {!isLocked && obj.type !== 'pot-round' && (
          <RotationHandle cx={cx} cy={cy - r - 20} onStart={e => onStartResize('rot', e)} />
        )}
      </g>
    );
  }

  return null;
}

function RotationHandle({ cx, cy, onStart }: { cx: number; cy: number; onStart: (e: React.MouseEvent) => void }) {
  return (
    <g style={{ cursor: 'grab' }} onMouseDown={e => { e.stopPropagation(); onStart(e); }}>
      <line x1={cx} y1={cy+10} x2={cx} y2={cy} stroke={GOLD} strokeWidth={1} strokeDasharray="3,2" />
      <circle cx={cx} cy={cy} r={6} fill={GOLD} stroke="#142B16" strokeWidth={1.5} />
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={8} fill="#142B16" style={{ userSelect: 'none', pointerEvents: 'none' }}>
        ↻
      </text>
    </g>
  );
}

// ── Drawing preview ───────────────────────────────────────────────────────────

function DrawPreview({ drawing, cursor }: { drawing: DrawState; cursor: [number, number] }) {
  const cfg = SHAPE_CONFIGS[drawing.tool];
  const stroke = cfg?.stroke ?? GOLD;
  const strokeDash = cfg?.strokeDash?.join(',') ?? undefined;

  if (drawing.kind === 'polygon') {
    const pts = drawing.pts;
    if (pts.length === 0) return null;
    const preview = [...pts, cursor];
    return (
      <g>
        <polyline
          points={preview.map(p => `${p[0]*PX},${p[1]*PX}`).join(' ')}
          fill="none" stroke={stroke} strokeWidth={2} strokeDasharray={strokeDash ?? '6,3'}
          opacity={0.7}
        />
        {pts.map(([x,y], i) => (
          <circle key={i} cx={x*PX} cy={y*PX} r={5} fill={GOLD} stroke="#142B16" strokeWidth={1.5} />
        ))}
        {/* Close hint circle */}
        {pts.length >= 3 && (
          <circle cx={pts[0][0]*PX} cy={pts[0][1]*PX} r={10}
            fill="none" stroke={GOLD} strokeWidth={1} opacity={0.5}
            strokeDasharray="3,2"
          />
        )}
      </g>
    );
  }

  if (drawing.kind === 'rect') {
    const fixedW = FIXED_WIDTH[drawing.tool];
    const d = makeRectFromDrag(drawing.start, drawing.end, fixedW);
    if (!d.width || !d.height) return null;
    const rx = d.x! * PX, ry = d.y! * PX;
    const rw = d.width * PX, rh = d.height * PX;
    const cx = rx + rw/2, cy = ry + rh/2;
    const rot = d.rotation ?? 0;
    return (
      <g transform={`rotate(${rot},${cx},${cy})`}>
        <rect x={rx} y={ry} width={rw} height={rh}
          fill={cfg?.fill ?? 'rgba(245,200,64,0.1)'}
          stroke={stroke} strokeWidth={cfg?.strokeWidth ?? 2}
          strokeDasharray={strokeDash}
          opacity={0.75}
        />
      </g>
    );
  }

  if (drawing.kind === 'circle') {
    const r = Math.max(0.1, dist(drawing.center, drawing.end));
    const cx = drawing.center[0]*PX, cy = drawing.center[1]*PX;
    return (
      <circle cx={cx} cy={cy} r={r*PX}
        fill={cfg?.fill ?? 'rgba(245,200,64,0.1)'}
        stroke={stroke} strokeWidth={cfg?.strokeWidth ?? 2}
        opacity={0.75}
      />
    );
  }

  return null;
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function Grid() {
  const lines: JSX.Element[] = [];
  const major = 5; // every 5m = thick line

  for (let x = 0; x <= CANVAS_W; x += PX) {
    const isMajor = (x / PX) % major === 0;
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={CANVAS_H}
        stroke={isMajor ? 'rgba(125,192,132,0.45)' : 'rgba(125,192,132,0.25)'}
        strokeWidth={isMajor ? 1.5 : 0.75}
      />
    );
  }
  for (let y = 0; y <= CANVAS_H; y += PX) {
    const isMajor = (y / PX) % major === 0;
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={CANVAS_W} y2={y}
        stroke={isMajor ? 'rgba(125,192,132,0.45)' : 'rgba(125,192,132,0.25)'}
        strokeWidth={isMajor ? 1.5 : 0.75}
      />
    );
  }
  return <g>{lines}</g>;
}

// ── North arrow ───────────────────────────────────────────────────────────────

function NorthArrow({ angle, svgW, onDragStart, isHe }: {
  angle: number; svgW: number; isHe: boolean;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const size = 44;
  const x = svgW - size - 16;
  const y = 16;
  const cx = x + size/2, cy = y + size/2;

  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: 'grab' }} onMouseDown={onDragStart}>
      {/* Background circle */}
      <circle cx={size/2} cy={size/2} r={size/2}
        fill="rgba(20,43,22,0.85)" stroke="rgba(245,200,64,0.25)" strokeWidth={1} />
      {/* Arrow rotated to northAngle */}
      <g transform={`rotate(${angle},${size/2},${size/2})`}>
        {/* North (gold) */}
        <polygon
          points={`${size/2},4 ${size/2-6},${size/2} ${size/2+6},${size/2}`}
          fill={GOLD} />
        {/* South */}
        <polygon
          points={`${size/2},${size-4} ${size/2-6},${size/2} ${size/2+6},${size/2}`}
          fill="rgba(200,200,200,0.4)" />
        {/* Center dot */}
        <circle cx={size/2} cy={size/2} r={3} fill={GOLD} />
      </g>
      {/* N label */}
      <text x={size/2} y={size + 12} textAnchor="middle"
        fontFamily={FRANK} fontSize={10} fill={GOLD}>
        {isHe ? 'צ' : 'N'} {angle}°
      </text>
    </g>
  );
}

// ── Scale bar ─────────────────────────────────────────────────────────────────

function ScaleBar({ svgH, isHe }: { svgH: number; isHe: boolean }) {
  const x = 16, y = svgH - 30;
  const barW = PX; // 50px = 1m
  return (
    <g>
      <line x1={x} y1={y} x2={x+barW} y2={y} stroke="white" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))' }} />
      <line x1={x} y1={y-4} x2={x} y2={y+4} stroke="white" strokeWidth={1.5} />
      <line x1={x+barW} y1={y-4} x2={x+barW} y2={y+4} stroke="white" strokeWidth={1.5} />
      <text x={x+barW/2} y={y+14} textAnchor="middle"
        fontFamily={ASSIST} fontSize={10} fill="white"
        style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}>
        {isHe ? "1מ׳" : '1m'}
      </text>
    </g>
  );
}

// ── Sun zones ─────────────────────────────────────────────────────────────────

function SunZones({ northAngle, svgW, svgH, isHe }: { northAngle: number; svgW: number; svgH: number; isHe: boolean }) {
  const n = rad(northAngle);
  const cx = svgW / 2, cy = svgH / 2;
  const R = Math.max(svgW, svgH);
  const zones = [
    { dir: n + rad(180), color: 'rgba(255,200,50,0.10)',  label: isHe ? '☀️ שמש מלאה' : '☀️ Full sun',       size: 0.45 },
    { dir: n + rad(90),  color: 'rgba(255,165,0,0.07)',   label: isHe ? '🌅 שמש בוקר' : '🌅 Morning sun',   size: 0.25 },
    { dir: n - rad(90),  color: 'rgba(255,120,0,0.07)',   label: isHe ? '🌇 שמש אחה״צ' : '🌇 Afternoon sun', size: 0.25 },
    { dir: n,            color: 'rgba(100,100,150,0.08)', label: isHe ? '🌑 צל' : '🌑 Shade',               size: 0.20 },
  ];

  return (
    <g style={{ pointerEvents: 'none' }}>
      {zones.map((z, i) => {
        const span = z.size * 2 * Math.PI;
        const a1 = z.dir - span/2;
        const a2 = z.dir + span/2;
        const x1 = cx + R * Math.sin(a1), y1 = cy - R * Math.cos(a1);
        const x2 = cx + R * Math.sin(a2), y2 = cy - R * Math.cos(a2);
        const lx = cx + (R*0.45) * Math.sin(z.dir);
        const ly = cy - (R*0.45) * Math.cos(z.dir);
        return (
          <g key={i}>
            <path d={`M${cx},${cy} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`}
              fill={z.color} />
            <text x={lx} y={ly} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.6)"
              fontFamily={ASSIST} style={{ userSelect: 'none' }}>
              {z.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ── Post-draw popup ───────────────────────────────────────────────────────────

function PostDrawPopup({
  popup, onConfirm, onCancel, isHe,
}: {
  popup: PostPopup;
  onConfirm: (obj: Omit<MapObject, 'id'>) => void;
  onCancel: () => void;
  isHe: boolean;
}) {
  const cfg = SHAPE_CONFIGS[popup.obj.type];
  const [label, setLabel] = useState(isHe ? (cfg?.labelHe ?? '') : (cfg?.labelEn ?? ''));
  const [treeName, setTreeName] = useState('');
  const [isFruit, setIsFruit] = useState(popup.obj.type === 'fruit-tree');

  function confirm() {
    const extra: Partial<MapObject> = {};
    if (popup.obj.type === 'fruit-tree' || popup.obj.type === 'tree') {
      extra.fruitTreeName = treeName;
      extra.isFruitTree   = isFruit;
    }
    onConfirm({ ...popup.obj, label, ...extra });
  }

  const isTree = popup.obj.type === 'fruit-tree' || popup.obj.type === 'tree';

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 200,
        background: 'rgba(14,30,15,0.98)',
        border: `1px solid rgba(245,200,64,0.30)`,
        borderRadius: '12px', padding: '14px',
        width: '220px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        fontFamily: ASSIST, direction: isHe ? 'rtl' : 'ltr',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{ fontFamily: FRANK, color: GOLD, fontSize: '14px' }}>
        {cfg?.emoji} {isHe ? cfg?.labelHe : cfg?.labelEn}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', color: `${PARCH}66` }}>{isHe ? 'שם' : 'Name'}</label>
        <input
          autoFocus
          value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onCancel(); }}
          style={{
            fontFamily: ASSIST, fontSize: '13px', color: PARCH,
            background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.25)',
            borderRadius: '6px', padding: '6px 8px', outline: 'none',
          }}
        />
      </div>

      {isTree && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: `${PARCH}66` }}>{isHe ? 'שם העץ' : 'Tree name'}</label>
            <input
              value={treeName} onChange={e => setTreeName(e.target.value)}
              placeholder={isHe ? 'למשל: לימון, זית...' : 'e.g. lemon, olive...'}
              style={{
                fontFamily: ASSIST, fontSize: '13px', color: PARCH,
                background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.25)',
                borderRadius: '6px', padding: '6px 8px', outline: 'none',
              }}
            />
          </div>
          {popup.obj.type === 'fruit-tree' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={isFruit}
                onChange={e => setIsFruit(e.target.checked)}
                style={{ accentColor: GOLD }} />
              <span style={{ fontSize: '12px', color: `${PARCH}88` }}>{isHe ? 'עץ פרי' : 'Fruit tree'}</span>
            </label>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={confirm} style={{
          flex: 1, padding: '7px', borderRadius: '7px', border: 'none',
          background: GOLD, color: '#142B16', fontFamily: ASSIST, fontSize: '12px',
          fontWeight: 700, cursor: 'pointer',
        }}>{isHe ? 'אישור' : 'OK'}</button>
        <button onClick={onCancel} style={{
          flex: 1, padding: '7px', borderRadius: '7px',
          border: '1px solid rgba(245,200,64,0.25)', background: 'transparent',
          color: `${PARCH}77`, fontFamily: ASSIST, fontSize: '12px', cursor: 'pointer',
        }}>{isHe ? 'ביטול' : 'Cancel'}</button>
      </div>
    </div>
  );
}

// ── Plant popup ───────────────────────────────────────────────────────────────

function PlantPopup({
  plant, onUpdate, onDelete, onClose, isHe,
}: {
  plant: PlantMarker;
  onUpdate: (id: string, changes: Partial<PlantMarker>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isHe: boolean;
}) {
  const [notes, setNotes] = useState(plant.notes ?? '');

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 290 }}
        onMouseDown={() => onClose()}
      />
      <div
        style={{
          position: 'fixed', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 300,
          background: 'rgba(14,30,15,0.98)',
          border: '1px solid rgba(245,200,64,0.30)',
          borderRadius: '12px', padding: '16px',
          width: '240px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          fontFamily: ASSIST, direction: isHe ? 'rtl' : 'ltr',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', insetInlineStart: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: `${PARCH}55`, fontSize: '14px', lineHeight: 1, padding: '2px 4px',
          }}
        >✕</button>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
          <span style={{ fontSize: '32px' }}>{plant.emoji}</span>
          <span style={{ fontFamily: FRANK, color: GOLD, fontSize: '16px', fontWeight: 700 }}>
            {plant.plantNameHe}
          </span>
          <span style={{ fontSize: '11px', color: `${PARCH}60` }}>{plant.plantNameEn}</span>
        </div>

        {/* Spacing info */}
        <div style={{ fontSize: '12px', color: `${PARCH}66`, textAlign: 'center' }}>
          {isHe ? 'ריווח:' : 'Spacing:'} {plant.spacing < 2 ? Math.round(plant.spacing * 100) : Math.round(plant.spacing)}cm
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: `${PARCH}66` }}>{isHe ? 'הערות' : 'Notes'}</label>
          <textarea
            value={notes}
            rows={3}
            placeholder={isHe ? 'למשל: שתלתי ב-15/3, צריך השקיה יומית...' : 'e.g. planted 15/3, needs daily watering...'}
            onChange={e => setNotes(e.target.value)}
            style={{
              fontFamily: ASSIST, fontSize: '12px', color: PARCH, resize: 'none',
              background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.25)',
              borderRadius: '6px', padding: '6px 8px', outline: 'none',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { onUpdate(plant.id, { notes }); onClose(); }}
            style={{
              flex: 1, padding: '7px', borderRadius: '7px', border: 'none',
              background: GOLD, color: '#142B16', fontFamily: ASSIST,
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}
          >{isHe ? 'שמור' : 'Save'}</button>
          <button
            onClick={() => { onDelete(plant.id); onClose(); }}
            style={{
              flex: 1, padding: '7px', borderRadius: '7px',
              border: '1px solid rgba(200,50,50,0.5)', background: 'transparent',
              color: 'rgba(220,80,80,0.85)', fontFamily: ASSIST,
              fontSize: '12px', cursor: 'pointer',
            }}
          >{isHe ? 'מחק צמח' : 'Remove plant'}</button>
        </div>
      </div>
    </>
  );
}

// ── Empty state hint ──────────────────────────────────────────────────────────

function EmptyHint({ isHe }: { isHe: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      gap: '10px', direction: isHe ? 'rtl' : 'ltr',
    }}>
      <span style={{ fontSize: '60px' }}>🗺️</span>
      <span style={{ fontFamily: FRANK, color: GOLD, fontSize: '20px', fontWeight: 700 }}>
        {isHe ? 'התחל לשרטט את הנכס שלך' : 'Start drawing your property'}
      </span>
      <span style={{ fontFamily: ASSIST, color: `${PARCH}60`, fontSize: '14px' }}>
        {isHe ? 'בחר כלי מהסרגל למעלה' : 'Choose a tool from the toolbar above'}
      </span>
      <span style={{ fontSize: '24px', animation: 'pulse 1.5s ease-in-out infinite' }}>↑</span>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4;transform:translateY(0)} 50%{opacity:1;transform:translateY(-6px)} }`}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GardenCanvas({
  mapData, northAngle, selectedTool, activePlant, selectedObjectId, showSunZones,
  onAddObject, onUpdateObject, onDeleteObject, onAddPlant, onRemovePlant, onUpdatePlant,
  onSelectObject, onSetNorthAngle, onToggleLock,
  previewPlants = [], onConfirmPreview, onCancelPreview,
}: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [t, setT]           = useState<Transform>({ x: 0, y: 0, s: 0.6 });
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });
  const [drawing, setDrawing] = useState<DrawState | null>(null);
  const [cursor, setCursor]   = useState<[number, number]>([0, 0]);
  const [popup, setPopup]     = useState<PostPopup | null>(null);
  const [selDrag, setSelDrag] = useState<SelectionDrag | null>(null);
  const [resDrag, setResDrag] = useState<ResizeDrag | null>(null);
  const [plantDrag, setPlantDrag] = useState<{
    id: string; startMx: number; startMy: number; origX: number; origY: number;
  } | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [rotTip, setRotTip]   = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ sx: number; sy: number; objId: string } | null>(null);

  const panRef       = useRef({ active: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const northRef     = useRef({ active: false, scx: 0, scy: 0 });
  const touchRef     = useRef({ lastDist: 0, lastX: 0, lastY: 0 });
  const isPanningRef = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // ── Diagnostic: log plant coords whenever mapData changes ─────────────────
  useEffect(() => {
    if (mapData.plants.length === 0) return;
    console.log('[GardenCanvas] rendering', mapData.plants.length, 'plants (PX=50):');
    mapData.plants.forEach(p => console.log(`  ${p.plantNameHe} id=${p.id?.slice(0,6)} x=${p.x} y=${p.y} → svgX=${p.x*50} svgY=${p.y*50}`));
  }, [mapData.plants]);

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (svgRef.current) {
        const r = svgRef.current.getBoundingClientRect();
        setSvgSize({ w: r.width, h: r.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (svgRef.current) ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrawing(null); setPopup(null); setSelectedPlantId(null); setContextMenu(null); }
      if (e.key === 'Delete' && selectedObjectId && !popup) {
        onDeleteObject(selectedObjectId);
        onSelectObject(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedObjectId, popup, onDeleteObject, onSelectObject]);

  // ── Coord helpers ──────────────────────────────────────────────────────────
  const toCanvas = useCallback((sx: number, sy: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [(sx - r.left - t.x) / t.s / PX, (sy - r.top - t.y) / t.s / PX];
  }, [t]);

  const toScreen = useCallback((cx: number, cy: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [cx * PX * t.s + t.x + r.left, cy * PX * t.s + t.y + r.top];
  }, [t]);

  // ── Finish drawing ─────────────────────────────────────────────────────────
  const finishDrawing = useCallback((ds: DrawState) => {
    const cfg = SHAPE_CONFIGS[ds.tool];
    if (!cfg) return;

    let obj: Omit<MapObject, 'id'> | null = null;

    if (ds.kind === 'polygon' && ds.pts.length >= 3) {
      obj = {
        type: cfg.type, shapeKind: 'polygon',
        points: ds.pts,
        label: cfg.labelHe,
        wallHeightM: cfg.defaultWallHeightM,
      };
    } else if (ds.kind === 'rect') {
      const fixedW = FIXED_WIDTH[ds.tool];
      const d = makeRectFromDrag(ds.start, ds.end, fixedW);
      obj = {
        type: cfg.type, shapeKind: 'rect',
        ...d,
        label: cfg.labelHe,
        wallHeightM: cfg.defaultWallHeightM,
      };
    } else if (ds.kind === 'circle') {
      const r = Math.max(0.1, dist(ds.center, ds.end));
      obj = {
        type: cfg.type, shapeKind: 'circle',
        cx: ds.center[0], cy: ds.center[1], radius: r,
        label: cfg.labelHe,
        isFruitTree: ds.tool === 'fruit-tree',
      };
    }

    if (!obj) return;
    setDrawing(null);

    // Show popup for name/label
    let [sx, sy] = [0, 0];
    if (ds.kind === 'polygon') {
      const [pcx, pcy] = centroid(ds.pts);
      [sx, sy] = toScreen(pcx, pcy);
    } else if (ds.kind === 'rect') {
      const mx = (ds.start[0]+ds.end[0])/2, my = (ds.start[1]+ds.end[1])/2;
      [sx, sy] = toScreen(mx, my);
    } else if (ds.kind === 'circle') {
      [sx, sy] = toScreen(ds.center[0], ds.center[1]);
    }

    setPopup({ obj, sx: sx - 110, sy: sy - 60 });
  }, [toScreen]);

  // ── Mouse down ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanningRef.current) return;
    if (e.button === 1) {
      panRef.current = { active: true, sx: e.clientX, sy: e.clientY, tx: t.x, ty: t.y };
      return;
    }
    if (e.button !== 0 || popup || selectedPlantId) return;
    if (contextMenu) { setContextMenu(null); return; }

    const [mx, my] = toCanvas(e.clientX, e.clientY);
    const kind = TOOL_KIND[selectedTool];

    if (selectedTool === 'select') {
      // Check plants first (smaller targets, rendered on top)
      const hitPlant = [...mapData.plants].reverse().find(p => {
        const dx = mx - p.x, dy = my - p.y;
        return Math.sqrt(dx*dx + dy*dy) <= 18 / PX;
      });
      if (hitPlant) {
        setSelectedPlantId(hitPlant.id);
        setPlantDrag({ id: hitPlant.id, startMx: mx, startMy: my, origX: hitPlant.x, origY: hitPlant.y });
        return;
      }
      setSelectedPlantId(null);

      // Hit test objects (back-to-front)
      const hit = [...mapData.objects].reverse().find(o => hitTest(o, mx, my));
      if (hit) {
        onSelectObject(hit.id);
        if (!hit.locked) {
          if (hit.shapeKind === 'rect') {
            setSelDrag({ id: hit.id, startMx: mx, startMy: my, origX: hit.x, origY: hit.y });
          } else if (hit.shapeKind === 'circle') {
            setSelDrag({ id: hit.id, startMx: mx, startMy: my, origCx: hit.cx, origCy: hit.cy });
          } else {
            setSelDrag({ id: hit.id, startMx: mx, startMy: my,
              origPts: hit.points?.map(p => [...p] as [number, number]) });
          }
        }
      } else {
        onSelectObject(null);
      }
      return;
    }

    if (selectedTool === 'plant' && activePlant) {
      onAddPlant({ plantNameHe: activePlant.nameHe, plantNameEn: activePlant.nameEn,
                   emoji: activePlant.emoji, spacing: activePlant.spacing, x: mx, y: my });
      return;
    }

    const shapeType = selectedTool as ShapeType;

    if (kind === 'polygon') {
      if (!drawing || drawing.kind !== 'polygon') {
        setDrawing({ kind: 'polygon', tool: shapeType, pts: [[mx, my]] });
      } else {
        const pts = drawing.pts;
        // Close if near first point
        if (pts.length >= 3 && dist([mx, my], pts[0]) < 12 / t.s / PX) {
          finishDrawing(drawing);
        } else {
          setDrawing({ ...drawing, pts: [...pts, [mx, my]] });
        }
      }
      return;
    }

    if (kind === 'rect') {
      setDrawing({ kind: 'rect', tool: shapeType, start: [mx, my], end: [mx, my] });
      return;
    }

    if (kind === 'circle') {
      setDrawing({ kind: 'circle', tool: shapeType, center: [mx, my], end: [mx, my] });
      return;
    }
  }, [t, drawing, selectedTool, activePlant, popup, selectedPlantId, mapData.objects, mapData.plants, toCanvas, onSelectObject, onAddPlant, finishDrawing]);

  // ── Double-click close polygon ─────────────────────────────────────────────
  const onDblClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (drawing?.kind === 'polygon' && drawing.pts.length >= 3) {
      finishDrawing(drawing);
    }
  }, [drawing, finishDrawing]);

  // ── Mouse move ─────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const [mx, my] = toCanvas(e.clientX, e.clientY);
    setCursor([mx, my]);

    if (panRef.current.active) {
      setT(prev => ({
        ...prev,
        x: panRef.current.tx + (e.clientX - panRef.current.sx),
        y: panRef.current.ty + (e.clientY - panRef.current.sy),
      }));
      return;
    }

    if (northRef.current.active) {
      const r = svgRef.current!.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      const angle = Math.atan2(sx - northRef.current.scx, -(sy - northRef.current.scy));
      onSetNorthAngle(Math.round((deg(angle) + 360) % 360));
      return;
    }

    // Update rect/circle preview
    if (drawing?.kind === 'rect')   setDrawing(d => d ? { ...(d as any), end: [mx, my] } : null);
    if (drawing?.kind === 'circle') setDrawing(d => d ? { ...(d as any), end: [mx, my] } : null);

    // Move selected object
    if (selDrag) {
      const dx = mx - selDrag.startMx, dy = my - selDrag.startMy;
      const obj = mapData.objects.find(o => o.id === selDrag.id);
      if (!obj) return;
      if (obj.shapeKind === 'polygon' && selDrag.origPts) {
        const pts = selDrag.origPts.map(([px, py]) => [px+dx, py+dy] as [number, number]);
        onUpdateObject(selDrag.id, { points: pts });
      } else if (obj.shapeKind === 'rect' && selDrag.origX != null) {
        onUpdateObject(selDrag.id, { x: selDrag.origX + dx, y: selDrag.origY! + dy });
      } else if (obj.shapeKind === 'circle' && selDrag.origCx != null) {
        onUpdateObject(selDrag.id, { cx: selDrag.origCx + dx, cy: selDrag.origCy! + dy });
      }
      return;
    }

    // Move plant
    if (plantDrag) {
      const dx = mx - plantDrag.startMx, dy = my - plantDrag.startMy;
      onUpdatePlant(plantDrag.id, { x: plantDrag.origX + dx, y: plantDrag.origY + dy });
      return;
    }

    // Resize / rotate
    if (resDrag) {
      const dx = mx - resDrag.startMx, dy = my - resDrag.startMy;
      const o = resDrag.origObj;

      if (resDrag.handle === 'rot') {
        // Compute angle relative to object center
        let lx = 0, ly = 0;
        if (o.shapeKind === 'rect') { lx = o.x!+o.width!/2; ly = o.y!+o.height!/2; }
        else if (o.shapeKind === 'circle') { lx = o.cx!; ly = o.cy!; }
        else if (o.shapeKind === 'polygon' && o.points) { [lx, ly] = centroid(o.points); }
        const a = deg(Math.atan2(mx - lx, -(my - ly)));
        const newRot = ((Math.round(a) % 360) + 360) % 360;
        onUpdateObject(resDrag.id, { rotation: newRot });
        setRotTip(`${newRot}°`);
        return;
      }

      if (o.shapeKind === 'circle' && resDrag.handle === 'r') {
        const newR = Math.max(0.1, (o.radius ?? 1) + dx);
        onUpdateObject(resDrag.id, { radius: newR });
        return;
      }

      if (o.shapeKind === 'rect') {
        let { x, y, width, height } = { x: o.x!, y: o.y!, width: o.width!, height: o.height! };
        const h = resDrag.handle;
        if (h.includes('e')) { width  = Math.max(0.2, width  + dx); }
        if (h.includes('s')) { height = Math.max(0.2, height + dy); }
        if (h.includes('w')) { x = o.x! + dx; width  = Math.max(0.2, o.width! - dx); }
        if (h.includes('n')) { y = o.y! + dy; height = Math.max(0.2, o.height! - dy); }
        // Enforce fixed width if applicable
        const fixedW = SHAPE_CONFIGS[o.type]?.fixedWidth;
        if (fixedW != null) {
          if (h.includes('e') || h.includes('w')) { /* don't resize fixed dim */ }
          else { /* length change ok */ }
        }
        onUpdateObject(resDrag.id, { x, y, width, height });
        return;
      }

      if (o.shapeKind === 'polygon' && o.points && resDrag.handle.startsWith('v')) {
        const vi = parseInt(resDrag.handle.slice(1));
        const pts = o.points.map((p, i) =>
          i === vi ? [p[0]+dx, p[1]+dy] as [number, number] : p
        );
        onUpdateObject(resDrag.id, { points: pts });
      }
    }
  }, [t, drawing, selDrag, resDrag, plantDrag, mapData.objects, toCanvas, onUpdateObject, onUpdatePlant, onSetNorthAngle]);

  // ── Mouse up ───────────────────────────────────────────────────────────────
  const onMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    panRef.current.active = false;
    northRef.current.active = false;

    if (plantDrag) { setPlantDrag(null); return; }
    if (selDrag) { setSelDrag(null); return; }
    if (resDrag) { setResDrag(null); setRotTip(null); return; }

    const [mx, my] = toCanvas(e.clientX, e.clientY);

    if (drawing?.kind === 'rect') {
      const len = dist(drawing.start, drawing.end);
      if (len * PX > 5) finishDrawing(drawing);
      else setDrawing(null);
      return;
    }
    if (drawing?.kind === 'circle') {
      const r = dist(drawing.center, drawing.end);
      if (r * PX > 5) finishDrawing(drawing);
      else setDrawing(null);
      return;
    }
  }, [drawing, selDrag, resDrag, plantDrag, toCanvas, finishDrawing]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    const newS = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.s * factor));
    const cx = (mx - t.x) / t.s, cy = (my - t.y) / t.s;
    setT({ x: mx - cx*newS, y: my - cy*newS, s: newS });
  }, [t]);

  // ── Touch pan / pinch-zoom ─────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    // Prevent synthetic mouse events (mousedown/mousemove) that would fire before
    // isPanningRef is set, causing accidental object selection/drag during panning.
    e.preventDefault();
    if (e.touches.length === 2) {
      isPanningRef.current = true;
      touchRef.current.lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchRef.current.lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      touchRef.current.lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchRef.current.lastX = e.touches[0].clientX;
      touchRef.current.lastY = e.touches[0].clientY;
      panRef.current = { active: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, tx: t.x, ty: t.y };
    }
  }, [t]);

  const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      isPanningRef.current = true;
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const scaleFactor = d / (touchRef.current.lastDist || d);
      const dX = midX - touchRef.current.lastX;
      const dY = midY - touchRef.current.lastY;
      touchRef.current.lastDist = d;
      touchRef.current.lastX = midX;
      touchRef.current.lastY = midY;
      setT(prev => {
        const newS = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.s * scaleFactor));
        if (!svgRef.current) return prev;
        const r = svgRef.current.getBoundingClientRect();
        const mx = midX - r.left, my = midY - r.top;
        const cx = (mx - prev.x) / prev.s, cy = (my - prev.y) / prev.s;
        return { x: mx - cx * newS + dX, y: my - cy * newS + dY, s: newS };
      });
    } else if (e.touches.length === 1 && panRef.current.active) {
      const dx = e.touches[0].clientX - panRef.current.sx;
      const dy = e.touches[0].clientY - panRef.current.sy;
      if (!isPanningRef.current && Math.hypot(dx, dy) > 8) {
        isPanningRef.current = true;
      }
      setT(prev => ({ ...prev, x: panRef.current.tx + dx, y: panRef.current.ty + dy }));
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    panRef.current.active = false;

    // Handle tap: single finger lifted with no significant movement (isPanning not triggered)
    if (!isPanningRef.current && e.changedTouches.length === 1 && !popup && !selectedPlantId) {
      const [mx, my] = toCanvas(touchStartPos.current.x, touchStartPos.current.y);

      if (contextMenu) {
        setContextMenu(null);
      } else if (selectedTool === 'select') {
        const hitPlant = [...mapData.plants].reverse().find(p => {
          const dx = mx - p.x, dy = my - p.y;
          return Math.sqrt(dx * dx + dy * dy) <= 18 / PX;
        });
        if (hitPlant) {
          setSelectedPlantId(hitPlant.id);
        } else {
          setSelectedPlantId(null);
          const hit = [...mapData.objects].reverse().find(o => hitTest(o, mx, my));
          onSelectObject(hit ? hit.id : null);
        }
      } else if (selectedTool === 'plant' && activePlant) {
        onAddPlant({
          plantNameHe: activePlant.nameHe, plantNameEn: activePlant.nameEn,
          emoji: activePlant.emoji, spacing: activePlant.spacing, x: mx, y: my,
        });
      } else {
        const kind = TOOL_KIND[selectedTool];
        const shapeType = selectedTool as ShapeType;
        if (kind === 'polygon') {
          if (!drawing || drawing.kind !== 'polygon') {
            setDrawing({ kind: 'polygon', tool: shapeType, pts: [[mx, my]] });
          } else {
            const pts = drawing.pts;
            if (pts.length >= 3 && dist([mx, my], pts[0]) < 12 / t.s / PX) {
              finishDrawing(drawing);
            } else {
              setDrawing({ ...drawing, pts: [...pts, [mx, my]] });
            }
          }
        } else if (kind === 'rect') {
          setDrawing({ kind: 'rect', tool: shapeType, start: [mx, my], end: [mx, my] });
        } else if (kind === 'circle') {
          setDrawing({ kind: 'circle', tool: shapeType, center: [mx, my], end: [mx, my] });
        }
      }
    }

    isPanningRef.current = false;
  }, [toCanvas, mapData.plants, mapData.objects, selectedTool, activePlant, popup, selectedPlantId,
      contextMenu, drawing, t, onSelectObject, onAddPlant, finishDrawing]);

  // ── Resize handle drag start ───────────────────────────────────────────────
  const startResize = useCallback((id: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const obj = mapData.objects.find(o => o.id === id);
    if (!obj || obj.locked) return;
    const [mx, my] = toCanvas(e.clientX, e.clientY);
    setResDrag({ id, handle, startMx: mx, startMy: my, origObj: { ...obj } });
  }, [mapData.objects, toCanvas]);

  // ── North arrow drag start ─────────────────────────────────────────────────
  const startNorthDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const r = svgRef.current!.getBoundingClientRect();
    const arrowSize = 44;
    const arrowX = svgSize.w - arrowSize - 16 + arrowSize/2;
    const arrowY = 16 + arrowSize/2;
    northRef.current = { active: true, scx: arrowX, scy: arrowY };
  }, [svgSize]);

  // ── Right-click context menu ───────────────────────────────────────────────
  const onContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    const [mx, my] = toCanvas(e.clientX, e.clientY);
    const hit = [...mapData.objects].reverse().find(o => hitTest(o, mx, my));
    if (hit) setContextMenu({ sx: e.clientX, sy: e.clientY, objId: hit.id });
  }, [mapData.objects, toCanvas]);

  // ── Cursor style ───────────────────────────────────────────────────────────
  function getCursor() {
    if (TOOL_KIND[selectedTool]) return 'crosshair';
    if (selectedTool === 'select') return 'default';
    return 'default';
  }

  const selectedObj = mapData.objects.find(o => o.id === selectedObjectId) ?? null;
  const isEmpty = mapData.objects.length === 0 && mapData.plants.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0e1e0f' }}>
      <button
        onClick={() => setT({ x: 0, y: 0, s: 0.6 })}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          padding: '4px 10px', borderRadius: 8, fontSize: 12,
          background: 'rgba(0,0,0,0.5)', color: '#F5C840', border: 'none', cursor: 'pointer',
        }}
      >
        ↺ {isHe ? 'איפוס' : 'Reset'}
      </button>
      <svg
        ref={svgRef}
        width="100%" height="100%"
        style={{ display: 'block', cursor: getCursor(), touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={onDblClick}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={onContextMenu}
      >
        <SvgDefs />

        {/* Transform group */}
        <g transform={`translate(${t.x},${t.y}) scale(${t.s})`}>

          {/* Grid */}
          <Grid />

          {/* Sun zones */}
          {showSunZones && <SunZones northAngle={northAngle} svgW={svgSize.w/t.s} svgH={svgSize.h/t.s} isHe={isHe} />}

          {/* Shapes */}
          {mapData.objects.map(obj => (
            <g
              key={obj.id}
              style={{
                cursor: selectedTool === 'select' ? (obj.locked ? 'default' : 'move') : undefined,
                opacity: selDrag?.id === obj.id ? 0.7 : 1,
              }}
              onClick={e => { if (selectedTool === 'select') { e.stopPropagation(); onSelectObject(obj.id); } }}
            >
              {renderShapeFill(obj)}
              {renderShapeLabel(obj)}
            </g>
          ))}

          {/* Lock icons */}
          {mapData.objects.filter(o => o.locked).map(obj => {
            if (obj.shapeKind === 'rect' && obj.x != null) {
              const rx = obj.x * PX, ry = obj.y! * PX;
              const rw = obj.width! * PX;
              const cx = rx + rw / 2, cy = ry;
              return (
                <g key={`lock-${obj.id}`} transform={`rotate(${obj.rotation ?? 0},${cx + rw/2 - rw/2},${cy + (obj.height! * PX)/2})`}>
                  <text x={rx + rw - 4} y={ry + 14} fontSize={12}
                    textAnchor="end" style={{ userSelect: 'none', pointerEvents: 'none' }} opacity={0.75}>🔒</text>
                </g>
              );
            }
            if (obj.shapeKind === 'circle' && obj.cx != null) {
              const r = (obj.radius ?? 0) * PX;
              return (
                <text key={`lock-${obj.id}`}
                  x={obj.cx * PX + r * 0.65} y={obj.cy! * PX - r * 0.65 + 6}
                  fontSize={12} style={{ userSelect: 'none', pointerEvents: 'none' }} opacity={0.75}>🔒</text>
              );
            }
            if (obj.shapeKind === 'polygon' && obj.points) {
              const maxX = Math.max(...obj.points.map(p => p[0])) * PX;
              const minY = Math.min(...obj.points.map(p => p[1])) * PX;
              return (
                <text key={`lock-${obj.id}`}
                  x={maxX - 2} y={minY + 14}
                  fontSize={12} textAnchor="end" style={{ userSelect: 'none', pointerEvents: 'none' }} opacity={0.75}>🔒</text>
              );
            }
            return null;
          })}

          {/* Plant markers */}
          {mapData.plants.map(p => {
            const cx = p.x * PX;
            const cy = p.y * PX;
            if (!isFinite(cx) || !isFinite(cy)) {
              console.warn('[GardenCanvas] plant has invalid coords — id:', p.id, 'x:', p.x, 'y:', p.y, 'name:', p.plantNameHe);
            }
            const safeCx = isFinite(cx) ? cx : 0;
            const safeCy = isFinite(cy) ? cy : 0;
            return (
              <g key={p.id}
                style={{ cursor: selectedTool === 'select' ? 'move' : 'pointer', opacity: plantDrag?.id === p.id ? 0.7 : 1 }}
                onClick={e => { if (selectedTool === 'select') { e.stopPropagation(); } }}>
                <circle cx={safeCx} cy={safeCy} r={18}
                  fill="rgba(20,43,22,0.85)" stroke={!isFinite(cx) ? 'red' : 'rgba(125,192,132,0.5)'}
                  strokeWidth={!isFinite(cx) ? 3 : 1.5} />
                <text x={safeCx} y={safeCy + 7} textAnchor="middle" fontSize={20}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>{p.emoji}</text>
              </g>
            );
          })}

          {/* Preview plant markers */}
          {previewPlants.map((p, i) => (
            <g key={`preview-${i}`} style={{ pointerEvents: 'none' }}>
              {/* Small spacing ring — dashed, semi-transparent */}
              <circle
                cx={p.x * PX}
                cy={p.y * PX}
                r={Math.max(2, (p.spacing * PX) / 2)}
                fill="rgba(245,200,64,0.06)"
                stroke="rgba(245,200,64,0.3)"
                strokeWidth={1}
                strokeDasharray="4,3"
              />
              {/* Plant circle — small, gold tinted */}
              <circle
                cx={p.x * PX}
                cy={p.y * PX}
                r={16}
                fill="rgba(245,200,64,0.2)"
                stroke="rgba(245,200,64,0.6)"
                strokeWidth={1.5}
                strokeDasharray="3,2"
              />
              {/* Plant emoji */}
              <text
                x={p.x * PX}
                y={p.y * PX + 6}
                textAnchor="middle"
                fontSize={16}
                style={{ userSelect: 'none' }}
              >
                {p.emoji}
              </text>
            </g>
          ))}

          {/* Selection overlay */}
          {selectedObj && (
            <SelectionOverlay
              obj={selectedObj}
              isLocked={selectedObj.locked === true}
              onStartResize={(handle, e) => startResize(selectedObj.id, handle, e)}
            />
          )}

          {/* Drawing preview */}
          {drawing && <DrawPreview drawing={drawing} cursor={cursor} />}

          {/* Scale bar (rendered in canvas space, unscaled) */}
          <ScaleBar svgH={svgSize.h / t.s} isHe={isHe} />
        </g>

        {/* North arrow (in SVG space, unaffected by pan/zoom) */}
        <NorthArrow angle={northAngle} svgW={svgSize.w} onDragStart={startNorthDrag} isHe={isHe} />

        {/* Rotation tooltip */}
        {rotTip && (
          <text x={svgSize.w/2} y={svgSize.h - 10} textAnchor="middle"
            fontFamily={ASSIST} fontSize={12} fill={GOLD}>
            {rotTip}
          </text>
        )}
      </svg>

      {/* Grid info overlay */}
      <GridInfoBox />

      {/* Empty state */}
      {isEmpty && !drawing && <EmptyHint isHe={isHe} />}

      {/* Post-draw popup */}
      {popup && (
        <PostDrawPopup
          popup={popup}
          onConfirm={obj => { onAddObject(obj); setPopup(null); }}
          onCancel={() => setPopup(null)}
          isHe={isHe}
        />
      )}

      {/* Properties panel */}
      {selectedObj && !popup && (
        <ShapePropertiesPanel
          object={selectedObj}
          onUpdate={changes => onUpdateObject(selectedObj.id, changes)}
          onDelete={() => { onDeleteObject(selectedObj.id); onSelectObject(null); }}
          onToggleLock={() => onToggleLock(selectedObj.id)}
        />
      )}

      {/* Right-click context menu */}
      {contextMenu && (() => {
        const cmObj = mapData.objects.find(o => o.id === contextMenu.objId);
        if (!cmObj) return null;
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onMouseDown={() => setContextMenu(null)} />
            <div
              style={{
                position: 'fixed', left: contextMenu.sx, top: contextMenu.sy, zIndex: 400,
                background: 'rgba(14,30,15,0.97)', border: '1px solid rgba(245,200,64,0.25)',
                borderRadius: '8px', padding: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                fontFamily: ASSIST, direction: isHe ? 'rtl' : 'ltr',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              <button
                onClick={() => { onToggleLock(cmObj.id); setContextMenu(null); }}
                style={{
                  display: 'block', width: '100%', padding: '8px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: cmObj.locked ? GOLD : PARCH,
                  fontSize: '13px', textAlign: isHe ? 'right' : 'left', borderRadius: '5px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,200,64,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {cmObj.locked ? (isHe ? '🔓 שחרר נעילה' : '🔓 Unlock') : (isHe ? '🔒 נעל במקום' : '🔒 Lock')}
              </button>
            </div>
          </>
        );
      })()}

      {/* Plant popup */}
      {selectedPlantId && (() => {
        const plant = mapData.plants.find(p => p.id === selectedPlantId);
        if (!plant) return null;
        return (
          <PlantPopup
            plant={plant}
            onUpdate={(id, changes) => onUpdatePlant(id, changes)}
            onDelete={(id) => { onRemovePlant(id); }}
            onClose={() => setSelectedPlantId(null)}
            isHe={isHe}
          />
        );
      })()}

      {/* Plant preview confirmation panel */}
      {previewPlants.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          background: 'rgba(20,43,22,0.97)',
          borderTop: '1px solid rgba(245,200,64,0.25)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          direction: isHe ? 'rtl' : 'ltr',
          fontFamily: '"Assistant","Heebo",sans-serif',
        }}>
          <div>
            <span style={{ color: '#F5C840', fontSize: '14px', fontWeight: 600 }}>
              {isHe
                ? `🌕 צ'ופצ'ו ממליץ למקם ${previewPlants.length} צמחים`
                : `🌕 Chupchu recommends placing ${previewPlants.length} plants`}
            </span>
            <span style={{ color: 'rgba(237,224,196,0.6)', fontSize: '12px', marginRight: '8px' }}>
              {isHe ? '— מאשר?' : '— confirm?'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onCancelPreview}
              style={{
                padding: '7px 16px', borderRadius: '7px',
                border: '1px solid rgba(245,200,64,0.25)',
                background: 'transparent',
                color: 'rgba(237,224,196,0.7)',
                fontFamily: '"Assistant","Heebo",sans-serif',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              {isHe ? 'בטל' : 'Cancel'}
            </button>
            <button
              onClick={onConfirmPreview}
              style={{
                padding: '7px 20px', borderRadius: '7px',
                border: 'none', background: '#F5C840',
                color: '#142B16', fontFamily: '"Frank Ruhl Libre",Georgia,serif',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {isHe ? 'אשר והנח 🌱' : 'Confirm & place 🌱'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hit testing ───────────────────────────────────────────────────────────────

function hitTest(obj: MapObject, mx: number, my: number): boolean {
  if (obj.shapeKind === 'circle' && obj.cx != null && obj.cy != null && obj.radius != null) {
    return dist([mx, my], [obj.cx, obj.cy]) <= obj.radius + 0.2;
  }
  if (obj.shapeKind === 'rect' && obj.x != null && obj.width != null) {
    // Simple AABB for now (ignores rotation)
    const cx = obj.x + obj.width/2, cy = obj.y! + obj.height!/2;
    const r = obj.rotation ?? 0;
    // Rotate point into local space
    const rr = rad(-r);
    const lx = (mx - cx) * Math.cos(rr) - (my - cy) * Math.sin(rr) + cx;
    const ly = (mx - cx) * Math.sin(rr) + (my - cy) * Math.cos(rr) + cy;
    return lx >= obj.x - 0.1 && lx <= obj.x + obj.width + 0.1
        && ly >= obj.y! - 0.1 && ly <= obj.y! + obj.height! + 0.1;
  }
  if (obj.shapeKind === 'polygon' && obj.points) {
    return pointInPolygon([mx, my], obj.points);
  }
  return false;
}

function pointInPolygon(p: [number, number], vs: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i], [xj, yj] = vs[j];
    if (((yi > p[1]) !== (yj > p[1])) &&
        (p[0] < (xj-xi)*(p[1]-yi)/(yj-yi)+xi)) {
      inside = !inside;
    }
  }
  return inside;
}
