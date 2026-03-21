import { useRef, useState, useCallback, useEffect } from 'react';
import type { MapObject, PlantMarker, MapData, MapTool } from '../../stores/mapStore';
import { MAP_OBJECT_TYPES, MAP_OBJECT_MAP } from '../../data/mapObjects';
import { PLANT_MAP } from '../../data/companions';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transform { x: number; y: number; s: number }

interface DrawState {
  mode: 'polygon' | 'rect' | 'circle';
  // polygon
  polyPts?: [number, number][];
  // rect
  rectStart?: [number, number];
  rectEnd?: [number, number];
  // circle
  circCenter?: [number, number];
  circEnd?: [number, number];
}

interface PendingShape {
  shapeType: 'polygon' | 'rect' | 'circle';
  points: number[][];
  cx: number; cy: number; // container coords for popup
}

interface TypePickerState {
  pending: PendingShape;
  step: 'type' | 'label';
  pickedType?: string;
  labelValue?: string;
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
  onSelectObject: (id: string | null) => void;
  onSetNorthAngle: (angle: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function centroid(pts: [number, number][]): [number, number] {
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  return [sx / pts.length, sy / pts.length];
}

function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function polyToSvgPts(pts: [number, number][]) {
  return pts.map(p => p.join(',')).join(' ');
}

const GRID_SIZE   = 50;    // px per meter
const CANVAS_W    = 2000;
const CANVAS_H    = 1600;
const MIN_SCALE   = 0.25;
const MAX_SCALE   = 5;

// ── Component ─────────────────────────────────────────────────────────────────

export function GardenCanvas({
  mapData, northAngle, selectedTool, activePlant, selectedObjectId, showSunZones,
  onAddObject, onUpdateObject, onDeleteObject, onAddPlant, onRemovePlant,
  onSelectObject, onSetNorthAngle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);

  const [t, setT] = useState<Transform>({ x: 0, y: 0, s: 1 });
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });

  const [drawing, setDrawing] = useState<DrawState | null>(null);
  const [mouseCanv, setMouseCanv] = useState<[number, number]>([0, 0]);
  const [typePicker, setTypePicker] = useState<TypePickerState | null>(null);

  const [dragObj, setDragObj] = useState<{ id: string; origPts: number[][]; mx: number; my: number } | null>(null);
  const [vtxDrag, setVtxDrag] = useState<{ id: string; idx: number; origPts: number[][]; mx: number; my: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPlantId, setHoveredPlantId] = useState<string | null>(null);

  // Pan state (ref to avoid stale closures)
  const panRef = useRef<{ active: boolean; startX: number; startY: number; startTx: number; startTy: number }>({
    active: false, startX: 0, startY: 0, startTx: 0, startTy: 0,
  });

  // North arrow dragging
  const northRef = useRef<{ active: boolean; centerX: number; centerY: number }>({
    active: false, centerX: 0, centerY: 0,
  });

  // ── SVG size tracker ────────────────────────────────────────────────────────
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

  // ── Keyboard: Escape to cancel ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrawing(null); setTypePicker(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Coord helpers ────────────────────────────────────────────────────────
  const screenToCanvas = useCallback((sx: number, sy: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [(sx - r.left - t.x) / t.s, (sy - r.top - t.y) / t.s];
  }, [t]);

  const canvasToContainer = useCallback((cx: number, cy: number): [number, number] => {
    return [cx * t.s + t.x, cy * t.s + t.y];
  }, [t]);

  // ── Finish drawing → show type picker ────────────────────────────────────
  const finishShape = useCallback((shapeType: 'polygon' | 'rect' | 'circle', rawPts: number[][], center: [number, number]) => {
    const [pcx, pcy] = canvasToContainer(center[0], center[1]);
    setTypePicker({
      pending: { shapeType, points: rawPts, cx: pcx, cy: pcy },
      step: 'type',
    });
    setDrawing(null);
  }, [canvasToContainer]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newS = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.s * factor));
    const canvX = (mx - t.x) / t.s;
    const canvY = (my - t.y) / t.s;
    setT({ x: mx - canvX * newS, y: my - canvY * newS, s: newS });
  }, [t]);

  // ── Mouse down ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Middle mouse = pan
    if (e.button === 1) {
      e.preventDefault();
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startTx: t.x, startTy: t.y };
      return;
    }
    if (e.button !== 0) return;
    if (typePicker) return;

    const [cx, cy] = screenToCanvas(e.clientX, e.clientY);

    if (selectedTool === 'polygon') {
      const pts = drawing?.polyPts ?? [];
      // Close polygon if clicking near first point
      if (pts.length >= 3 && dist([cx, cy], pts[0] as [number, number]) < 12 / t.s) {
        finishShape('polygon', pts.map(p => [p[0], p[1]]), centroid(pts as [number, number][]));
        return;
      }
      setDrawing({ mode: 'polygon', polyPts: [...pts, [cx, cy]] });
      return;
    }

    if (selectedTool === 'rect') {
      setDrawing({ mode: 'rect', rectStart: [cx, cy], rectEnd: [cx, cy] });
      return;
    }

    if (selectedTool === 'circle') {
      setDrawing({ mode: 'circle', circCenter: [cx, cy], circEnd: [cx, cy] });
      return;
    }

    if (selectedTool === 'plant') {
      if (activePlant) {
        const [scx, scy] = screenToCanvas(e.clientX, e.clientY);
        onAddPlant({
          plantNameHe: activePlant.nameHe,
          plantNameEn: activePlant.nameEn,
          emoji:       activePlant.emoji,
          spacing:     activePlant.spacing,
          x: scx, y: scy,
        });
      }
      return;
    }
  }, [t, drawing, selectedTool, activePlant, typePicker, screenToCanvas, finishShape, onAddPlant]);

  // ── Double-click: close polygon ──────────────────────────────────────────
  const onDblClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (selectedTool !== 'polygon' || !drawing?.polyPts || drawing.polyPts.length < 3) return;
    finishShape('polygon', drawing.polyPts.map(p => [p[0], p[1]]), centroid(drawing.polyPts as [number, number][]));
  }, [selectedTool, drawing, finishShape]);

  // ── Mouse move ────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const [cx, cy] = screenToCanvas(e.clientX, e.clientY);
    setMouseCanv([cx, cy]);

    // Pan
    if (panRef.current.active) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setT({ x: panRef.current.startTx + dx, y: panRef.current.startTy + dy, s: t.s });
      return;
    }

    // North drag
    if (northRef.current.active) {
      const r = svgRef.current!.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const angle = Math.atan2(sx - northRef.current.centerX, -(sy - northRef.current.centerY));
      onSetNorthAngle(Math.round((angle * 180 / Math.PI + 360) % 360));
      return;
    }

    // Rect/circle preview
    if (drawing?.mode === 'rect') {
      setDrawing(d => d ? { ...d, rectEnd: [cx, cy] } : null);
    }
    if (drawing?.mode === 'circle') {
      setDrawing(d => d ? { ...d, circEnd: [cx, cy] } : null);
    }

    // Drag object
    if (dragObj) {
      const dx = cx - screenToCanvas(e.clientX, e.clientY)[0] + (cx - screenToCanvas(dragObj.mx, dragObj.my)[0]);
      // Recalculate properly:
      const [ocx] = screenToCanvas(dragObj.mx, dragObj.my);
      const [ocx2] = screenToCanvas(0, 0);
      void ocx2;
      const ddx = cx - ocx;
      const ddy = cy - (screenToCanvas(e.clientX, e.clientY)[1] - (screenToCanvas(dragObj.mx, dragObj.my)[1]));
      void ddx; void ddy;

      // Simple: recalculate delta from original mouse pos
      const origMx = dragObj.mx;
      const origMy = dragObj.my;
      const [origCx, origCy] = screenToCanvas(origMx, origMy);
      const deltX = cx - origCx;
      const deltY = cy - origCy;
      const newPts = movePts(dragObj.origPts, deltX, deltY);
      onUpdateObject(dragObj.id, { points: newPts });
    }

    // Drag polygon vertex
    if (vtxDrag) {
      const [origCx, origCy] = screenToCanvas(vtxDrag.mx, vtxDrag.my);
      const deltX = cx - origCx;
      const deltY = cy - origCy;
      const newPts = vtxDrag.origPts.map((p, i) =>
        i === vtxDrag.idx ? [p[0] + deltX, p[1] + deltY] : p
      );
      onUpdateObject(vtxDrag.id, { points: newPts });
    }
  }, [t, drawing, dragObj, vtxDrag, screenToCanvas, onUpdateObject, onSetNorthAngle]);

  // ── Mouse up ─────────────────────────────────────────────────────────────
  const onMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    panRef.current.active = false;
    northRef.current.active = false;
    setDragObj(null);
    setVtxDrag(null);

    const [cx, cy] = screenToCanvas(e.clientX, e.clientY);

    if (drawing?.mode === 'rect' && drawing.rectStart) {
      const [x1, y1] = drawing.rectStart;
      const w = Math.abs(cx - x1), h = Math.abs(cy - y1);
      if (w < 5 || h < 5) { setDrawing(null); return; }
      const rx = Math.min(x1, cx), ry = Math.min(y1, cy);
      finishShape('rect', [[rx, ry, w, h]], [rx + w / 2, ry + h / 2]);
      return;
    }

    if (drawing?.mode === 'circle' && drawing.circCenter) {
      const r = dist(drawing.circCenter, [cx, cy]);
      if (r < 5) { setDrawing(null); return; }
      finishShape('circle', [[drawing.circCenter[0], drawing.circCenter[1], r]], drawing.circCenter);
      return;
    }
  }, [drawing, screenToCanvas, finishShape]);

  // ── Object mouse events ──────────────────────────────────────────────────
  const onObjMouseDown = useCallback((e: React.MouseEvent, obj: MapObject) => {
    e.stopPropagation();
    if (selectedTool === 'delete') { onDeleteObject(obj.id); return; }
    if (selectedTool === 'select') {
      onSelectObject(obj.id);
      setDragObj({ id: obj.id, origPts: obj.points, mx: e.clientX, my: e.clientY });
    }
  }, [selectedTool, onDeleteObject, onSelectObject]);

  const onVtxMouseDown = useCallback((e: React.MouseEvent, obj: MapObject, idx: number) => {
    e.stopPropagation();
    setVtxDrag({ id: obj.id, idx, origPts: obj.points, mx: e.clientX, my: e.clientY });
  }, []);

  // ── Plant mouse events ───────────────────────────────────────────────────
  const onPlantClick = useCallback((e: React.MouseEvent, plant: PlantMarker) => {
    e.stopPropagation();
    if (selectedTool === 'delete') onRemovePlant(plant.id);
  }, [selectedTool, onRemovePlant]);

  // ── Commit type picker ───────────────────────────────────────────────────
  const commitTypePicker = useCallback((type: string) => {
    const tp = typePicker!;
    const needsLabel = ['bed', 'raised', 'pot', 'tree'].includes(type);
    if (needsLabel) {
      setTypePicker({ ...tp, step: 'label', pickedType: type, labelValue: '' });
    } else {
      const objType = MAP_OBJECT_MAP.get(type)!;
      onAddObject({
        type,
        shapeType: tp.pending.shapeType,
        points: tp.pending.points,
        label: objType.labelHe,
        isFruitTree: false,
        fruitTreeName: '',
      });
      setTypePicker(null);
    }
  }, [typePicker, onAddObject]);

  const commitLabel = useCallback(() => {
    const tp = typePicker!;
    if (!tp.pickedType) return;
    onAddObject({
      type: tp.pickedType,
      shapeType: tp.pending.shapeType,
      points: tp.pending.points,
      label: tp.labelValue || MAP_OBJECT_MAP.get(tp.pickedType)?.labelHe || '',
      isFruitTree: tp.pickedType === 'tree' && !!tp.labelValue,
      fruitTreeName: tp.pickedType === 'tree' ? (tp.labelValue || '') : '',
    });
    setTypePicker(null);
  }, [typePicker, onAddObject]);

  // ── Sun zones ─────────────────────────────────────────────────────────────
  const sunZones = showSunZones ? buildSunZones(northAngle, CANVAS_W, CANVAS_H) : null;

  // ── Cursor ────────────────────────────────────────────────────────────────
  const cursor = panRef.current.active ? 'grabbing'
    : selectedTool === 'polygon' || selectedTool === 'rect' || selectedTool === 'circle' ? 'crosshair'
    : selectedTool === 'delete' ? 'not-allowed'
    : selectedTool === 'plant' ? 'cell'
    : 'default';

  // ── Compass position (fixed, top-right) ───────────────────────────────────
  const compassX = svgSize.w - 55;
  const compassY = 55;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        style={{ display: 'block', width: '100%', height: '100%', background: '#1a2e1a', cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { panRef.current.active = false; northRef.current.active = false; setDragObj(null); setVtxDrag(null); }}
        onWheel={onWheel}
        onDoubleClick={onDblClick}
        onContextMenu={e => { e.preventDefault(); if (drawing) setDrawing(null); }}
      >
        {/* ── World transform group ── */}
        <g transform={`translate(${t.x},${t.y}) scale(${t.s})`}>

          {/* Grid */}
          {Array.from({ length: Math.ceil(CANVAS_W / GRID_SIZE) + 1 }, (_, i) => (
            <line key={`gv${i}`} x1={i * GRID_SIZE} y1={0} x2={i * GRID_SIZE} y2={CANVAS_H}
              stroke="rgba(125,192,132,0.08)" strokeWidth={1 / t.s} />
          ))}
          {Array.from({ length: Math.ceil(CANVAS_H / GRID_SIZE) + 1 }, (_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * GRID_SIZE} x2={CANVAS_W} y2={i * GRID_SIZE}
              stroke="rgba(125,192,132,0.08)" strokeWidth={1 / t.s} />
          ))}

          {/* Sun zones */}
          {sunZones && sunZones.map((z, i) => (
            <g key={i}>
              <polygon points={z.pts} fill={z.color} />
              <text x={z.lx} y={z.ly} textAnchor="middle" fill="rgba(255,255,255,0.5)"
                fontSize={14 / t.s} fontFamily="Arial,sans-serif">{z.label}</text>
            </g>
          ))}

          {/* ── Objects ── */}
          {mapData.objects.map(obj => <MapObjectEl key={obj.id} obj={obj} isSelected={obj.id === selectedObjectId}
            isHovered={obj.id === hoveredId} tool={selectedTool}
            onMouseDown={e => onObjMouseDown(e, obj)}
            onMouseEnter={() => setHoveredId(obj.id)}
            onMouseLeave={() => setHoveredId(null)} />)}

          {/* Selected polygon vertices */}
          {(() => {
            const selObj = mapData.objects.find(o => o.id === selectedObjectId);
            if (!selObj || selObj.shapeType !== 'polygon') return null;
            return selObj.points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={6 / t.s}
                fill={GOLD} stroke="#fff" strokeWidth={1.5 / t.s}
                style={{ cursor: 'move' }}
                onMouseDown={e => onVtxMouseDown(e, selObj, i)} />
            ));
          })()}

          {/* ── Plants ── */}
          {mapData.plants.map(plant => {
            const isHov = plant.id === hoveredPlantId;
            // Check companion relationships with selected plant
            const selPlantId = mapData.plants.find(p => p.id === hoveredPlantId)?.plantNameEn.toLowerCase();
            const otherPlantId = plant.plantNameEn.toLowerCase();
            let ring = 'none';
            if (selPlantId && selPlantId !== otherPlantId) {
              const good = PLANT_MAP.get(selPlantId)?.goodCompanions.includes(otherPlantId);
              const bad  = PLANT_MAP.get(selPlantId)?.badCompanions.includes(otherPlantId);
              if (good) ring = 'good';
              if (bad)  ring = 'bad';
            }
            return (
              <g key={plant.id} style={{ cursor: selectedTool === 'delete' ? 'not-allowed' : 'pointer' }}
                onMouseEnter={() => setHoveredPlantId(plant.id)}
                onMouseLeave={() => setHoveredPlantId(null)}
                onClick={e => onPlantClick(e, plant)}>
                {/* Spacing ring */}
                <circle cx={plant.x} cy={plant.y} r={plant.spacing / 2 * (GRID_SIZE / 100)}
                  fill="none" stroke={ring === 'good' ? 'rgba(125,192,132,0.4)' : ring === 'bad' ? 'rgba(220,100,100,0.4)' : 'rgba(125,192,132,0.12)'}
                  strokeWidth={1 / t.s} strokeDasharray={`${3/t.s} ${3/t.s}`} />
                {/* Plant circle */}
                <circle cx={plant.x} cy={plant.y} r={16 / t.s}
                  fill={selectedTool === 'delete' && isHov ? 'rgba(220,100,100,0.3)' : 'rgba(74,128,80,0.6)'}
                  stroke={isHov ? GOLD : '#7DC084'} strokeWidth={1.5 / t.s} />
                {/* Emoji */}
                <text x={plant.x} y={plant.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={14 / t.s} style={{ userSelect: 'none' }}>{plant.emoji}</text>
                {/* Delete X on hover */}
                {isHov && selectedTool !== 'delete' && (
                  <g onClick={e => { e.stopPropagation(); onRemovePlant(plant.id); }}>
                    <circle cx={plant.x + 12 / t.s} cy={plant.y - 12 / t.s} r={7 / t.s}
                      fill="rgba(163,48,48,0.9)" stroke="#fff" strokeWidth={1 / t.s} style={{ cursor: 'pointer' }} />
                    <text x={plant.x + 12 / t.s} y={plant.y - 12 / t.s} textAnchor="middle"
                      dominantBaseline="central" fontSize={9 / t.s} fill="#fff" style={{ userSelect: 'none', pointerEvents: 'none' }}>✕</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Tooltip for hovered plant */}
          {hoveredPlantId && (() => {
            const p = mapData.plants.find(pl => pl.id === hoveredPlantId);
            if (!p) return null;
            const label = `${p.plantNameHe} (${p.spacing} ס"מ)`;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={p.x - label.length * 3.5} y={p.y - 34 / t.s}
                  width={label.length * 7} height={16 / t.s} rx={3 / t.s}
                  fill="rgba(20,43,22,0.9)" />
                <text x={p.x} y={p.y - 26 / t.s} textAnchor="middle" dominantBaseline="middle"
                  fontSize={10 / t.s} fill={PARCH} fontFamily="Arial,sans-serif">{label}</text>
              </g>
            );
          })()}

          {/* ── Drawing previews ── */}
          {drawing?.mode === 'polygon' && drawing.polyPts && (
            <g>
              <polyline
                points={[...drawing.polyPts, mouseCanv].map(p => p.join(',')).join(' ')}
                fill="none" stroke={GOLD} strokeWidth={1.5 / t.s} strokeDasharray={`${4/t.s} ${4/t.s}`} />
              {drawing.polyPts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={5 / t.s}
                  fill={i === 0 ? GOLD : 'rgba(245,200,64,0.6)'} stroke={GOLD} strokeWidth={1 / t.s} />
              ))}
            </g>
          )}
          {drawing?.mode === 'rect' && drawing.rectStart && drawing.rectEnd && (() => {
            const [x1, y1] = drawing.rectStart;
            const [x2, y2] = drawing.rectEnd;
            return <rect x={Math.min(x1,x2)} y={Math.min(y1,y2)}
              width={Math.abs(x2-x1)} height={Math.abs(y2-y1)}
              fill={`${GOLD}18`} stroke={GOLD} strokeWidth={1.5 / t.s} strokeDasharray={`${4/t.s} ${4/t.s}`} />;
          })()}
          {drawing?.mode === 'circle' && drawing.circCenter && drawing.circEnd && (
            <circle cx={drawing.circCenter[0]} cy={drawing.circCenter[1]}
              r={dist(drawing.circCenter, drawing.circEnd)}
              fill={`${GOLD}18`} stroke={GOLD} strokeWidth={1.5 / t.s} strokeDasharray={`${4/t.s} ${4/t.s}`} />
          )}

          {/* Scale bar */}
          <g transform={`translate(16, ${CANVAS_H - 20})`} style={{ pointerEvents: 'none' }}>
            <line x1={0} y1={0} x2={GRID_SIZE} y2={0} stroke={PARCH + '66'} strokeWidth={1.5 / t.s} />
            <line x1={0} y1={-4 / t.s} x2={0} y2={4 / t.s} stroke={PARCH + '66'} strokeWidth={1.5 / t.s} />
            <line x1={GRID_SIZE} y1={-4 / t.s} x2={GRID_SIZE} y2={4 / t.s} stroke={PARCH + '66'} strokeWidth={1.5 / t.s} />
            <text x={GRID_SIZE / 2} y={-8 / t.s} textAnchor="middle" fontSize={11 / t.s}
              fill={PARCH + '88'} fontFamily="Arial,sans-serif">1 מ'</text>
          </g>
        </g>

        {/* ── Fixed UI: North arrow ── */}
        <g
          transform={`translate(${compassX},${compassY})`}
          style={{ cursor: 'pointer' }}
          onMouseDown={e => {
            e.stopPropagation();
            const r = svgRef.current!.getBoundingClientRect();
            northRef.current = { active: true, centerX: compassX + r.left, centerY: compassY + r.top };
          }}
        >
          <circle cx={0} cy={0} r={36} fill="rgba(20,43,22,0.85)" stroke="rgba(245,200,64,0.3)" strokeWidth={1} />
          {/* Cardinal letters */}
          {[['N',0,-28],['S',0,28],['E',28,0],['W',-28,0]].map(([l,x,y]) => (
            <text key={l as string} x={x as number} y={(y as number) + 4}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill="rgba(237,224,196,0.6)" fontFamily="Arial,sans-serif">{l}</text>
          ))}
          {/* North arrow */}
          <g transform={`rotate(${northAngle})`}>
            <polygon points="0,-22 5,-8 0,-12 -5,-8" fill={GOLD} opacity={0.9} />
            <polygon points="0,22 5,8 0,12 -5,8" fill="rgba(237,224,196,0.3)" />
          </g>
          <text x={0} y={48} textAnchor="middle" fontSize={9} fill="rgba(237,224,196,0.4)" fontFamily="Arial,sans-serif">גרור לצפון</text>
        </g>

        {/* ── Fixed UI: Zoom controls ── */}
        <g transform={`translate(${svgSize.w - 42}, ${svgSize.h - 80})`}>
          {[{ label: '+', dy: 0, factor: 1.3 }, { label: '−', dy: 36, factor: 1/1.3 }].map(btn => (
            <g key={btn.label} transform={`translate(0,${btn.dy})`}
              style={{ cursor: 'pointer' }}
              onClick={e => {
                e.stopPropagation();
                const newS = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.s * btn.factor));
                setT(tr => ({ x: tr.x + (svgSize.w / 2 - tr.x) * (1 - newS / tr.s), y: tr.y + (svgSize.h / 2 - tr.y) * (1 - newS / tr.s), s: newS }));
              }}>
              <rect x={0} y={0} width={28} height={28} rx={5} fill="rgba(20,43,22,0.85)" stroke="rgba(245,200,64,0.2)" strokeWidth={1} />
              <text x={14} y={14} textAnchor="middle" dominantBaseline="central" fontSize={16} fill={PARCH + 'AA'} fontFamily="Arial,sans-serif">{btn.label}</text>
            </g>
          ))}
        </g>

        {/* Empty state hint */}
        {mapData.objects.length === 0 && mapData.plants.length === 0 && !drawing && (
          <g transform={`translate(${svgSize.w / 2},${svgSize.h / 2})`} style={{ pointerEvents: 'none' }}>
            <rect x={-130} y={-60} width={260} height={120} rx={12} fill="rgba(20,43,22,0.9)" stroke="rgba(245,200,64,0.12)" strokeWidth={1} />
            <text x={0} y={-22} textAnchor="middle" fontSize={32}>🗺️</text>
            <text x={0} y={12} textAnchor="middle" fontSize={14} fill={GOLD} fontFamily="Arial,sans-serif">שרטט את הנכס שלך</text>
            <text x={0} y={32} textAnchor="middle" fontSize={11} fill="rgba(237,224,196,0.4)" fontFamily="Arial,sans-serif">בחר כלי ציור מהסרגל למעלה</text>
          </g>
        )}
      </svg>

      {/* ── Type picker popup ── */}
      {typePicker && (
        <div style={{
          position: 'absolute',
          left: Math.min(typePicker.pending.cx + 10, (containerRef.current?.clientWidth ?? 600) - 280),
          top: Math.min(typePicker.pending.cy + 10, (containerRef.current?.clientHeight ?? 500) - 320),
          zIndex: 20,
          background: 'linear-gradient(160deg,rgba(24,52,26,0.98),rgba(20,43,22,0.99))',
          border: '1px solid rgba(245,200,64,0.2)',
          borderRadius: '12px',
          padding: '14px',
          width: '260px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}>
          {typePicker.step === 'type' ? (
            <>
              <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88`, margin: '0 0 10px' }}>מה זה?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {MAP_OBJECT_TYPES.map(ot => (
                  <button key={ot.type} onClick={() => commitTypePicker(ot.type)}
                    style={{
                      fontFamily: ASSIST, fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                      border: `1px solid ${ot.border}55`, color: PARCH,
                      backgroundColor: ot.color, cursor: 'pointer',
                    }}>
                    {ot.emoji} {ot.labelHe}
                  </button>
                ))}
              </div>
              <button onClick={() => setTypePicker(null)}
                style={{ marginTop: '10px', fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44`, background: 'none', border: 'none', cursor: 'pointer' }}>
                ביטול
              </button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88`, margin: '0 0 8px' }}>
                {typePicker.pickedType === 'tree' ? 'שם העץ (אם פרי, ציין)' : 'שם הערוגה'}
              </p>
              <input
                autoFocus
                value={typePicker.labelValue ?? ''}
                onChange={e => setTypePicker(tp => tp ? { ...tp, labelValue: e.target.value } : null)}
                onKeyDown={e => e.key === 'Enter' && commitLabel()}
                placeholder={typePicker.pickedType === 'tree' ? 'למשל: תפוח, זית, פרי' : 'שם הערוגה'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: ASSIST, fontSize: '13px', color: PARCH,
                  background: 'rgba(245,200,64,0.06)', border: '1px solid rgba(245,200,64,0.2)',
                  borderRadius: '6px', padding: '7px 10px', outline: 'none', marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={commitLabel}
                  style={{ flex: 1, fontFamily: ASSIST, fontSize: '12px', fontWeight: 600, padding: '7px', borderRadius: '6px', border: 'none', backgroundColor: GOLD, color: '#142B16', cursor: 'pointer' }}>
                  אישור
                </button>
                <button onClick={() => setTypePicker(null)}
                  style={{ fontFamily: ASSIST, fontSize: '12px', padding: '7px 12px', borderRadius: '6px', border: '1px solid rgba(245,200,64,0.2)', color: `${PARCH}66`, background: 'none', cursor: 'pointer' }}>
                  ביטול
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── MapObjectEl ───────────────────────────────────────────────────────────────

function MapObjectEl({ obj, isSelected, isHovered, tool, onMouseDown, onMouseEnter, onMouseLeave }: {
  obj: MapObject; isSelected: boolean; isHovered: boolean; tool: MapTool;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const ot = MAP_OBJECT_MAP.get(obj.type) ?? MAP_OBJECT_TYPES[0];
  const fill   = isHovered && tool === 'delete' ? 'rgba(163,48,48,0.4)' : ot.color;
  const stroke = isSelected ? GOLD : isHovered ? ot.border + 'CC' : ot.border;
  const strokeW = isSelected ? ot.borderWidth + 1 : ot.borderWidth;
  const dash    = ot.borderDash.join(',') || undefined;

  const sharedProps = {
    fill, stroke, strokeWidth: strokeW, strokeDasharray: dash,
    style: { cursor: tool === 'select' ? 'move' : tool === 'delete' ? 'not-allowed' : 'default' },
    onMouseDown, onMouseEnter, onMouseLeave,
  };

  let shape: React.ReactNode = null;
  if (obj.shapeType === 'polygon') {
    shape = <polygon points={polyToSvgPts(obj.points as [number,number][])} {...sharedProps} />;
  } else if (obj.shapeType === 'rect' && obj.points[0]) {
    const [x, y, w, h] = obj.points[0];
    shape = <rect x={x} y={y} width={w} height={h} rx={3} {...sharedProps} />;
  } else if (obj.shapeType === 'circle' && obj.points[0]) {
    const [cx, cy, r] = obj.points[0];
    shape = <circle cx={cx} cy={cy} r={r} {...sharedProps} />;
  }

  // Label
  const labelPos = (() => {
    if (obj.shapeType === 'polygon') return centroid(obj.points as [number,number][]);
    if (obj.shapeType === 'rect' && obj.points[0]) {
      const [x, y, w, h] = obj.points[0];
      return [x + w / 2, y + h / 2] as [number, number];
    }
    if (obj.shapeType === 'circle' && obj.points[0]) return [obj.points[0][0], obj.points[0][1]] as [number, number];
    return [0, 0] as [number, number];
  })();

  return (
    <g>
      {shape}
      {obj.label && (
        <text x={labelPos[0]} y={labelPos[1]} textAnchor="middle" dominantBaseline="central"
          fontSize={12} fill="rgba(237,224,196,0.9)" fontFamily="Arial,sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {ot.emoji} {obj.label}
        </text>
      )}
    </g>
  );
}

// ── Sun zones ─────────────────────────────────────────────────────────────────

function buildSunZones(northAngle: number, W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const r  = Math.max(W, H) * 0.8;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const pt = (deg: number) => {
    const a = toRad(deg);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  };

  const zones = [
    { dir: 180, span: 90, color: 'rgba(255,200,0,0.12)',  label: 'שמש מלאה' },  // South
    { dir: 90,  span: 90, color: 'rgba(255,165,0,0.08)',  label: 'שמש בוקר' },  // East
    { dir: 270, span: 90, color: 'rgba(255,100,0,0.08)',  label: "שמש אחה\"צ" }, // West
    { dir: 0,   span: 90, color: 'rgba(50,50,100,0.1)',   label: 'צל' },          // North
  ];

  return zones.map(z => {
    const from = northAngle + z.dir - z.span / 2;
    const to   = northAngle + z.dir + z.span / 2;
    const pts  = `${cx},${cy} ${pt(from)} ${pt(from + 30)} ${pt(from + 60)} ${pt(to)}`;
    const midA = toRad(from + z.span / 2);
    const ld   = r * 0.5;
    return { pts, color: z.color, label: z.label, lx: cx + ld * Math.cos(midA), ly: cy + ld * Math.sin(midA) };
  });
}

// ── Move object points ────────────────────────────────────────────────────────

function movePts(pts: number[][], dx: number, dy: number): number[][] {
  return pts.map(p => {
    if (p.length === 2) return [p[0] + dx, p[1] + dy];
    if (p.length === 3) return [p[0] + dx, p[1] + dy, p[2]];
    if (p.length === 4) return [p[0] + dx, p[1] + dy, p[2], p[3]];
    return p;
  });
}
