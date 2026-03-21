import { useRef, useState, useCallback } from 'react';
import type { Bed } from '../../stores/mapStore';
import type { MapMode } from './MapToolbar';

const GOLD    = '#F5C840';
const PARCH   = '#EDE0C4';
const FOREST  = '#0e2210';
const ASSIST  = '"Assistant", "Heebo", sans-serif';

// ── Coordinate helpers ───────────────────────────────────────────────────────

/** Convert SVG client-space event to viewBox units */
function toSVGPoint(e: React.MouseEvent<SVGSVGElement>, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const vb   = svg.viewBox.baseVal;
  return {
    x: ((e.clientX - rect.left) / rect.width)  * vb.width,
    y: ((e.clientY - rect.top)  / rect.height) * vb.height,
  };
}

function snapTo(v: number, grid = 5) {
  return Math.round(v / grid) * grid;
}

interface DrawState {
  x0: number; y0: number;
  x: number;  y: number;
}

interface DragState {
  bedId: string;
  ox: number; oy: number; // original bed x,y
  mx: number; my: number; // mouse start
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  widthM:  number;
  heightM: number;
  beds:    Bed[];
  selectedBedId: string | null;
  mode:    MapMode;
  onSelectBed:  (id: string | null) => void;
  onAddBed:     (bed: Omit<Bed, 'id' | 'plants'>) => void;
  onUpdateBed:  (id: string, updates: Partial<Omit<Bed, 'id' | 'plants'>>) => void;
  onDeleteBed:  (id: string) => void;
  onPlantClick: (bedId: string) => void;
}

// 1 garden-unit = 10 cm → 10 units = 1 m
const UNIT = 10; // SVG units per meter

const BED_COLORS = [
  '#3d6b4a', '#5878A0', '#8B6088', '#A05040',
  '#7a8b3a', '#608878', '#9a7040', '#4a6878',
];

let _colorIdx = 0;
function nextColor() {
  const c = BED_COLORS[_colorIdx % BED_COLORS.length];
  _colorIdx++;
  return c;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GardenCanvas({
  widthM, heightM, beds, selectedBedId, mode,
  onSelectBed, onAddBed, onUpdateBed, onDeleteBed, onPlantClick,
}: Props) {
  const svgRef  = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<DrawState | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);

  const VW = widthM  * UNIT;
  const VH = heightM * UNIT;

  // ── Mouse handlers on SVG background ─────────────────────────────────────

  const onBgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current && !(e.target as SVGElement).classList.contains('grid-line')) return;
    if (mode !== 'draw') {
      onSelectBed(null);
      return;
    }
    const p = toSVGPoint(e, svgRef.current!);
    setDrawing({ x0: snapTo(p.x), y0: snapTo(p.y), x: snapTo(p.x), y: snapTo(p.y) });
  }, [mode, onSelectBed]);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const p = toSVGPoint(e, svgRef.current);

    if (drawing) {
      setDrawing(d => d ? { ...d, x: snapTo(p.x), y: snapTo(p.y) } : null);
      return;
    }
    if (dragging) {
      const dx = snapTo(p.x) - snapTo(dragging.mx);
      const dy = snapTo(p.y) - snapTo(dragging.my);
      const nx = Math.max(0, Math.min(VW - 5, dragging.ox + dx));
      const ny = Math.max(0, Math.min(VH - 5, dragging.oy + dy));
      onUpdateBed(dragging.bedId, { x: nx, y: ny });
    }
  }, [drawing, dragging, VW, VH, onUpdateBed]);

  const onMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging) { setDragging(null); return; }
    if (!drawing) return;
    const { x0, y0, x, y } = drawing;
    setDrawing(null);
    const minX = Math.min(x0, x), minY = Math.min(y0, y);
    const w    = Math.abs(x - x0), h = Math.abs(y - y0);
    if (w < 3 || h < 3) return; // too small — ignore
    onAddBed({
      name:  `ערוגה ${beds.length + 1}`,
      x: Math.max(0, minX), y: Math.max(0, minY),
      w: Math.min(w, VW - minX), h: Math.min(h, VH - minY),
      color: nextColor(),
    });
  }, [drawing, dragging, beds.length, VW, VH, onAddBed]);

  // ── Bed click ─────────────────────────────────────────────────────────────

  const onBedMouseDown = useCallback((e: React.MouseEvent, bed: Bed) => {
    e.stopPropagation();
    if (mode === 'delete') { onDeleteBed(bed.id); return; }
    if (mode === 'plant')  { onSelectBed(bed.id); onPlantClick(bed.id); return; }
    if (mode === 'select') {
      onSelectBed(bed.id);
      const p = toSVGPoint(e as React.MouseEvent<SVGSVGElement>, svgRef.current!);
      setDragging({ bedId: bed.id, ox: bed.x, oy: bed.y, mx: snapTo(p.x), my: snapTo(p.y) });
    }
  }, [mode, onDeleteBed, onSelectBed, onPlantClick]);

  // ── Drawing rect ──────────────────────────────────────────────────────────

  const drawingRect = drawing ? (() => {
    const minX = Math.min(drawing.x0, drawing.x);
    const minY = Math.min(drawing.y0, drawing.y);
    const w    = Math.abs(drawing.x - drawing.x0);
    const h    = Math.abs(drawing.y - drawing.y0);
    return { x: minX, y: minY, w, h };
  })() : null;

  // ── Cursor style ──────────────────────────────────────────────────────────

  const cursor = mode === 'draw' ? 'crosshair'
    : mode === 'delete' ? 'not-allowed'
    : mode === 'plant'  ? 'cell'
    : 'default';

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(245,200,64,0.1)' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: 'block', width: '100%', height: 'auto', background: FOREST, cursor }}
        onMouseDown={onBgMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { setDrawing(null); setDragging(null); }}
      >
        {/* ── Grid ── */}
        {Array.from({ length: widthM + 1 }, (_, i) => i * UNIT).map(x => (
          <line key={`v${x}`} className="grid-line" x1={x} y1={0} x2={x} y2={VH}
            stroke="rgba(245,200,64,0.06)" strokeWidth={x % (UNIT * 5) === 0 ? 0.6 : 0.3} />
        ))}
        {Array.from({ length: heightM + 1 }, (_, i) => i * UNIT).map(y => (
          <line key={`h${y}`} className="grid-line" x1={0} y1={y} x2={VW} y2={y}
            stroke="rgba(245,200,64,0.06)" strokeWidth={y % (UNIT * 5) === 0 ? 0.6 : 0.3} />
        ))}

        {/* ── Meter labels ── */}
        {Array.from({ length: widthM + 1 }, (_, i) => (
          <text key={`xl${i}`} x={i * UNIT} y={VH - 0.5}
            fontSize={2.2} fill="rgba(237,224,196,0.2)"
            textAnchor="middle" fontFamily="Arial,sans-serif">{i}מ'</text>
        ))}

        {/* ── Beds ── */}
        {beds.map(bed => {
          const isSelected = bed.id === selectedBedId;
          const topEmojis = bed.plants.slice(0, 6).map(p => p.emoji).join('');
          return (
            <g key={bed.id} onMouseDown={e => onBedMouseDown(e, bed)} style={{ cursor: mode === 'select' ? 'grab' : cursor }}>
              {/* Bed fill */}
              <rect
                x={bed.x} y={bed.y} width={bed.w} height={bed.h}
                rx={1.5} ry={1.5}
                fill={bed.color + '88'}
                stroke={isSelected ? GOLD : bed.color}
                strokeWidth={isSelected ? 1.2 : 0.6}
              />
              {/* Soil texture lines */}
              {Array.from({ length: Math.floor(bed.h / 3) }, (_, i) => (
                <line key={i}
                  x1={bed.x + 1} y1={bed.y + 2 + i * 3}
                  x2={bed.x + bed.w - 1} y2={bed.y + 2 + i * 3}
                  stroke={bed.color + '44'} strokeWidth={0.4} />
              ))}
              {/* Bed name */}
              <text
                x={bed.x + bed.w / 2} y={bed.y + 3}
                textAnchor="middle" dominantBaseline="hanging"
                fontSize={Math.min(3.5, bed.w / bed.name.length * 2.5)}
                fontWeight="600"
                fill={PARCH + 'CC'}
                fontFamily="Arial,sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {bed.name}
              </text>
              {/* Plant emojis */}
              {topEmojis && (
                <text
                  x={bed.x + bed.w / 2} y={bed.y + bed.h / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(5, bed.w * 0.4, bed.h * 0.4)}
                  style={{ pointerEvents: 'none' }}
                >
                  {topEmojis}
                </text>
              )}
              {/* Plant count badge */}
              {bed.plants.length > 0 && (
                <text
                  x={bed.x + bed.w - 1.5} y={bed.y + bed.h - 1}
                  textAnchor="end" dominantBaseline="auto"
                  fontSize={2.5} fill={PARCH + '99'}
                  fontFamily="Arial,sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  ×{bed.plants.length}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Drawing rect preview ── */}
        {drawingRect && drawingRect.w > 1 && drawingRect.h > 1 && (
          <rect
            x={drawingRect.x} y={drawingRect.y}
            width={drawingRect.w} height={drawingRect.h}
            rx={1.5} ry={1.5}
            fill={`${GOLD}18`}
            stroke={GOLD}
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
        )}

        {/* ── North arrow ── */}
        <g transform={`translate(${VW - 6}, 5)`}>
          <circle cx={0} cy={0} r={4.5} fill="rgba(20,43,22,0.7)" stroke="rgba(245,200,64,0.25)" strokeWidth={0.5} />
          <text x={0} y={1.5} textAnchor="middle" dominantBaseline="middle"
            fontSize={3.5} fill={PARCH + '99'} fontFamily="Arial,sans-serif">N</text>
          <polygon points="0,-3.5 1,-1 -1,-1" fill={GOLD + '99'} />
        </g>

        {/* ── Scale bar ── */}
        <g transform={`translate(2, ${VH - 4})`}>
          <line x1={0} y1={0} x2={UNIT} y2={0} stroke={PARCH + '44'} strokeWidth={0.8} />
          <line x1={0} y1={-1} x2={0}     y2={1} stroke={PARCH + '44'} strokeWidth={0.6} />
          <line x1={UNIT} y1={-1} x2={UNIT} y2={1} stroke={PARCH + '44'} strokeWidth={0.6} />
          <text x={UNIT / 2} y={-1.5} textAnchor="middle" fontSize={2} fill={PARCH + '55'} fontFamily="Arial,sans-serif">
            1 מ'
          </text>
        </g>
      </svg>

      {/* ── Mode hint overlay ── */}
      <div style={{
        position: 'absolute', bottom: '6px', right: '8px',
        fontFamily: ASSIST, fontSize: '10px', color: `${PARCH}44`,
        pointerEvents: 'none',
      }}>
        {mode === 'draw'   && 'גרור ליצור ערוגה'}
        {mode === 'select' && 'לחץ לבחור · גרור להזיז'}
        {mode === 'plant'  && 'לחץ על ערוגה לשתילה'}
        {mode === 'delete' && 'לחץ על ערוגה למחיקה'}
      </div>
    </div>
  );
}
