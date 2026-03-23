import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { WizardStatus, PlantPreview, MapData } from '../../stores/mapStore';
import { PLANTS } from '../../data/companions';
import { getPlantByName, getPlantSpacing, PLANT_TABLE } from '../../data/plantTable';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

interface WishlistItem {
  nameHe: string;
  nameEn: string;
  emoji: string;
  quantity: number;
}

interface WizardPlan {
  summary: string;
  beds: Array<{
    name: string; location: string; sunExposure: string;
    plants: Array<{ nameHe: string; nameEn: string; spacing: number; quantity: number; plantingTime: string; notes: string }>;
    notes: string;
  }>;
  generalTips: string[];
  warnings: string[];
  companionNotes: string[];
  wateringAdvice: string;
  seasonalNotes: string;
}

interface Props {
  mapId: string;
  wizardStatus: WizardStatus | null;
  onClose: () => void;
  onRefreshStatus: () => void;
  onPlacePlants: (plants: PlantPreview[]) => void;
  mapData: MapData;
  northAngle: number;
}

// ── Position calculation ──────────────────────────────────────────────────────

function getPlantEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('tomato') || n.includes('עגבניה') || n.includes('עגבנייה')) return '🍅';
  if (n.includes('pepper') || n.includes('פלפל')) return '🫑';
  if (n.includes('cucumber') || n.includes('מלפפון')) return '🥒';
  if (n.includes('carrot') || n.includes('גזר')) return '🥕';
  if (n.includes('onion') || n.includes('בצל')) return '🧅';
  if (n.includes('garlic') || n.includes('שום')) return '🧄';
  if (n.includes('lettuce') || n.includes('חסה')) return '🥬';
  if (n.includes('strawberry') || n.includes('תות')) return '🍓';
  if (n.includes('eggplant') || n.includes('חציל')) return '🍆';
  if (n.includes('zucchini') || n.includes('קישוא')) return '🥗';
  if (n.includes('basil') || n.includes('בזיל')) return '🌿';
  if (n.includes('rose') || n.includes('ורד')) return '🌹';
  if (n.includes('sunflower') || n.includes('חמניה')) return '🌻';
  return '🌱';
}

function calculatePlantPositions(
  plan: any,
  mapData: MapData,
  northAngle: number
): PlantPreview[] {
  console.log('[WIZARD DEBUG] mapData objects:',
    JSON.stringify(mapData.objects.map(o => ({
      type: o.type, label: o.label, shapeKind: o.shapeKind,
      x: o.x, y: o.y, w: o.width, h: o.height,
      cx: o.cx, cy: o.cy, r: o.radius
    }))));
  console.log('[WIZARD DEBUG] plan beds:',
    JSON.stringify((plan.beds ?? []).map((b: any) => ({
      name: b.name, plants: b.plants?.length
    }))));
  console.log('[WIZARD] mapData objects:', mapData.objects.length, 'plants:', mapData.plants.length, 'plan beds:', plan.beds?.length);
  const results: PlantPreview[] = [];
  const MARGIN = 0.3;
  const CANVAS_W = 38;
  const CANVAS_H = 30;

  const placed: Array<{ x: number; y: number; r: number }> = [];

  function overlaps(x: number, y: number, r: number): boolean {
    return placed.some(p => {
      const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return d < (p.r + r) * 0.85;
    });
  }

  function findFreeNear(cx: number, cy: number, r: number, step?: number): [number, number] {
    const s = step ?? r;
    if (!overlaps(cx, cy, r)) return [cx, cy];
    for (let dist = s; dist < 10; dist += s) {
      for (let angle = 0; angle < 360; angle += 15) {
        const nx = cx + dist * Math.cos((angle * Math.PI) / 180);
        const ny = cy + dist * Math.sin((angle * Math.PI) / 180);
        if (nx >= MARGIN && nx <= CANVAS_W - MARGIN &&
            ny >= MARGIN && ny <= CANVAS_H - MARGIN &&
            !overlaps(nx, ny, r)) return [nx, ny];
      }
    }
    return [cx + r * 2, cy]; // move right as absolute last resort
  }

  function getShapeInfo(shape: any) {
    if (!shape) return null;
    if (shape.shapeKind === 'rect' && shape.x != null) {
      const bx = shape.x + 0.15, by = (shape.y ?? 0) + 0.15;
      const bw = Math.max(0.3, (shape.width ?? 2) - 0.3);
      const bh = Math.max(0.3, (shape.height ?? 2) - 0.3);
      return { cx: bx + bw / 2, cy: by + bh / 2, bx, by, bw, bh };
    }
    if (shape.shapeKind === 'circle' && shape.cx != null) {
      const r = (shape.radius ?? 1) * 0.8;
      return { cx: shape.cx, cy: shape.cy ?? 0, bx: shape.cx - r, by: (shape.cy ?? 0) - r, bw: r * 2, bh: r * 2 };
    }
    if (shape.shapeKind === 'polygon' && shape.points?.length) {
      const xs = shape.points.map((p: any) => p[0]);
      const ys = shape.points.map((p: any) => p[1]);
      const minX = Math.min(...xs), minY = Math.min(...ys);
      const maxX = Math.max(...xs), maxY = Math.max(...ys);
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, bx: minX + 0.1, by: minY + 0.1, bw: maxX - minX - 0.2, bh: maxY - minY - 0.2 };
    }
    return null;
  }

  const growingTypes = ['bed', 'raised-bed', 'hydroponics', 'aquaponics', 'vertical'];
  const growingShapes = mapData.objects.filter(o => growingTypes.includes(o.type));
  let fallbackShapeIdx = 0;

  for (const bed of (plan.beds ?? [])) {
    const bedName = (bed.name ?? bed.suggestedName ?? '').toLowerCase();
    const matchShape = mapData.objects.find(obj => {
      const lbl = (obj.label ?? '').toLowerCase();
      return lbl && bedName && (lbl.includes(bedName) || bedName.includes(lbl));
    }) ?? growingShapes[fallbackShapeIdx % Math.max(1, growingShapes.length)];
    fallbackShapeIdx++;
    const si = getShapeInfo(matchShape);
    console.log('[WIZARD PLACEMENT]', {
      bedName,
      matchShape: matchShape ? { type: matchShape.type, label: matchShape.label, shapeKind: matchShape.shapeKind, x: matchShape.x, y: matchShape.y, width: matchShape.width, height: matchShape.height } : null,
      si,
      growingShapesCount: growingShapes.length,
      allObjects: mapData.objects.map(o => ({ type: o.type, label: o.label, shapeKind: o.shapeKind })),
    });

    for (const plant of (bed.plants ?? [])) {
      // Get correct spacings from plant table
      const tableEntry = getPlantByName(plant.nameHe ?? '');

      // Column spacing (between plants in same row)
      let colSpacingM = 0.30;
      if (plant.spacingCm && plant.spacingCm > 1) {
        colSpacingM = plant.spacingCm / 100;
      } else if (tableEntry?.placementSpacingCm) {
        colSpacingM = tableEntry.placementSpacingCm / 100;
      }
      colSpacingM = Math.max(0.08, Math.min(2.5, colSpacingM));

      // Row spacing (between rows)
      let rowSpacingM = colSpacingM; // default: same as column spacing
      if (plant.rowSpacingCm && plant.rowSpacingCm > 1) {
        rowSpacingM = plant.rowSpacingCm / 100;
      } else if (tableEntry?.rowSpacingCm) {
        rowSpacingM = tableEntry.rowSpacingCm / 100;
      }
      rowSpacingM = Math.max(0.08, Math.min(3.0, rowSpacingM));

      // For overlap detection, use the smaller of the two
      const r = Math.min(colSpacingM, rowSpacingM) / 2;
      const qty = Math.max(1, plant.quantity ?? 1);
      const emoji = getPlantEmoji(plant.nameEn ?? plant.nameHe ?? '');
      const nameHe = plant.nameHe ?? plant.name ?? 'צמח';
      const nameEn = plant.nameEn ?? plant.name ?? 'plant';

      for (let i = 0; i < qty; i++) {
        let baseX: number, baseY: number;

        if (si) {
          // Place inside the matching shape in a grid
          const maxCols = Math.max(1, Math.floor(si.bw / colSpacingM));
          const col = i % maxCols;
          const row = Math.floor(i / maxCols);
          baseX = si.bx + col * colSpacingM + colSpacingM * 0.5;
          baseY = si.by + row * rowSpacingM + rowSpacingM * 0.5;
          if (si.bh < rowSpacingM * 2) {
            baseY = si.by + si.bh / 2;
          }
        } else {
          // NO SHAPE FOUND — spread plants across canvas in a grid
          // Use bed index and plant index to spread them out
          const globalIndex = results.length;
          const col = globalIndex % 10;
          const row = Math.floor(globalIndex / 10);
          baseX = MARGIN + col * Math.max(colSpacingM, 0.5);
          baseY = MARGIN + row * Math.max(rowSpacingM, 0.5);
        }

        // Hard clamp
        baseX = Math.max(MARGIN, Math.min(CANVAS_W - MARGIN, baseX));
        baseY = Math.max(MARGIN, Math.min(CANVAS_H - MARGIN, baseY));

        // Find free spot
        const [fx, fy] = findFreeNear(baseX, baseY, r, Math.max(colSpacingM, rowSpacingM) * 0.5);

        console.log('[WIZARD DEBUG] placing', nameHe, 'at', baseX.toFixed(2), baseY.toFixed(2),
          'shape:', matchShape?.label, 'si:', si ? `${si.bx.toFixed(1)},${si.by.toFixed(1)} ${si.bw.toFixed(1)}x${si.bh.toFixed(1)}` : 'null');
        console.log('[PLANT POS]', { nameHe, i, baseX, baseY, fx, fy, colSpacingM, rowSpacingM, si: !!si });
        placed.push({ x: fx, y: fy, r });
        results.push({
          plantNameHe: nameHe,
          plantNameEn: nameEn,
          emoji,
          spacing: colSpacingM,
          x: fx,
          y: fy,
          bedName: bed.name ?? bed.suggestedName ?? 'ערוגה',
        });
      }
    }
  }

  for (const pot of (plan.potAdvice ?? [])) {
    const potShape = mapData.objects.find(o => o.type === 'pot-rect' || o.type === 'pot-round');
    const si = getShapeInfo(potShape);
    let col = 0;
    for (const plantName of (pot.suggestedPlants ?? []).slice(0, 3)) {
      const spacingM = 0.12, r = spacingM / 2;
      const baseX = (si ? si.bx : MARGIN) + col * spacingM + r;
      const baseY = (si ? si.by : MARGIN) + r;
      const [fx, fy] = findFreeNear(baseX, baseY, r);
      placed.push({ x: fx, y: fy, r });
      results.push({
        plantNameHe: plantName, plantNameEn: plantName,
        emoji: getPlantEmoji(plantName), spacing: spacingM,
        x: fx, y: fy, bedName: pot.potDescription ?? 'עציץ',
      });
      col++;
    }
  }

  return results;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WizardModal({ mapId, wizardStatus, onClose, onRefreshStatus, onPlacePlants, mapData, northAngle }: Props) {
  const { session } = useAuthStore();

  // Pre-populate from existing map plants
  const initialWishlist: WishlistItem[] = mapData.plants.map(p => {
    const plantData = PLANTS.find(d => d.nameHe === p.plantNameHe);
    return {
      nameHe: p.plantNameHe,
      nameEn: p.plantNameEn,
      emoji: p.emoji,
      quantity: 1,
    };
  }).filter((item, idx, arr) => arr.findIndex(x => x.nameHe === item.nameHe) === idx); // dedupe

  const [wishlist, setWishlist] = useState<WishlistItem[]>(initialWishlist);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WizardPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || wishlist.some(w => w.nameHe === t)) return;
    const plantData = PLANTS.find(p => p.nameHe === t || p.nameEn.toLowerCase() === t.toLowerCase());
    setWishlist(w => [...w, {
      nameHe: plantData?.nameHe ?? t,
      nameEn: plantData?.nameEn ?? t,
      emoji: plantData?.emoji ?? '🌱',
      quantity: 1,
    }]);
    setInput('');
    setSuggestions([]);
  };

  const onInputChange = (v: string) => {
    setInput(v);
    if (v.length >= 2) {
      const matches = PLANTS
        .filter(p => p.nameHe.includes(v) || p.nameEn.toLowerCase().includes(v.toLowerCase()))
        .slice(0, 5)
        .map(p => p.nameHe);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const updateQty = (nameHe: string, delta: number) => {
    setWishlist(w => w.map(x =>
      x.nameHe === nameHe
        ? { ...x, quantity: Math.min(50, Math.max(1, x.quantity + delta)) }
        : x
    ));
  };

  const runWizard = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<{ plan: WizardPlan; runsUsedThisMonth: number; limit: number | null }>(
        `/api/map/${mapId}/wizard`,
        { plantWishlist: wishlist.map(w => ({ nameHe: w.nameHe, nameEn: w.nameEn, quantity: w.quantity })) },
        session.access_token
      );
      setPlan(result.plan);
      onRefreshStatus();
    } catch (err: any) {
      if (err.message?.includes('wizard_limit_exceeded') || err.message?.includes('429')) {
        setLimitExceeded(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,24,12,0.8)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'linear-gradient(160deg,rgba(24,52,26,0.99),rgba(20,43,22,0.99))',
        border: '1px solid rgba(245,200,64,0.15)',
        borderRadius: '16px', padding: '28px',
        width: '100%', maxWidth: '580px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', gap: '16px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0 }}>
            🌕 אשף תכנון הגינה
          </h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: `${PARCH}55`, cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {/* Limit exceeded */}
        {limitExceeded && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(163,48,48,0.15)', border: '1px solid rgba(163,48,48,0.3)', textAlign: 'center' }}>
            <p style={{ fontFamily: FRANK, fontSize: '16px', color: '#E07070', margin: '0 0 8px' }}>
              הגעת למגבלת האשפים החודשית
            </p>
            <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}66`, margin: '0 0 14px' }}>
              {wizardStatus?.limit} שימושים לחודש בחבילה הנוכחית שלך
            </p>
            <a href="/billing" style={{ fontFamily: ASSIST, fontSize: '13px', color: GOLD, fontWeight: 600 }}>
              שדרג לחבילה גבוהה יותר ←
            </a>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '48px', animation: 'spin 3s linear infinite', display: 'inline-block' }}>🌕</div>
            <p style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: '16px 0 6px' }}>
              מוש בודק את הגינה שלך...
            </p>
            <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}44` }}>
              זה לוקח כ-30 שניות
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Input step */}
        {!loading && !plan && !limitExceeded && (
          <>
            <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}88`, margin: 0 }}>
              אילו צמחים תרצה לגדל בגינה? (אופציונלי)
            </p>

            {/* Tags with quantity */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '32px' }}>
              {wishlist.map(item => (
                <span key={item.nameHe} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  fontFamily: ASSIST, fontSize: '12px', padding: '3px 6px 3px 8px',
                  borderRadius: '50px',
                  backgroundColor: `${GOLD}18`, border: `1px solid ${GOLD}44`, color: GOLD,
                }}>
                  {item.emoji} {item.nameHe}
                  {item.quantity > 1 && (
                    <span style={{ opacity: 0.8 }}>×{item.quantity}</span>
                  )}
                  <button onClick={() => updateQty(item.nameHe, -1)} style={qtyBtn}>−</button>
                  <span style={{ minWidth: '14px', textAlign: 'center', fontSize: '11px' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.nameHe, +1)} style={qtyBtn}>+</button>
                  <button onClick={() => setWishlist(w => w.filter(x => x.nameHe !== item.nameHe))}
                    style={{ background: 'none', border: 'none', color: `${GOLD}88`, cursor: 'pointer', fontSize: '12px', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>

            {/* Input */}
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                placeholder="הוסף צמח... (Enter לאישור)"
                value={input}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input && addTag(input)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: ASSIST, fontSize: '13px', color: PARCH,
                  background: 'rgba(245,200,64,0.06)', border: '1px solid rgba(245,200,64,0.2)',
                  borderRadius: '8px', padding: '10px 14px', outline: 'none',
                }}
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', insetInlineStart: 0, zIndex: 10,
                  width: '100%', background: 'rgba(20,43,22,0.98)', border: '1px solid rgba(245,200,64,0.2)',
                  borderRadius: '8px', overflow: 'hidden', marginTop: '2px',
                }}>
                  {suggestions.map(s => (
                    <button key={s} onClick={() => addTag(s)}
                      style={{ display: 'block', width: '100%', textAlign: 'right', padding: '9px 14px', fontFamily: ASSIST, fontSize: '13px', color: PARCH, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p style={{ fontFamily: ASSIST, fontSize: '12px', color: '#E07070', margin: 0 }}>⚠️ {error}</p>}

            <button onClick={runWizard}
              style={{
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700, padding: '12px',
                borderRadius: '8px', border: 'none', backgroundColor: GOLD, color: '#142B16',
                cursor: 'pointer', width: '100%',
              }}>
              🌕 בקש ממוש לתכנן
            </button>
          </>
        )}

        {/* Plan results */}
        {plan && !loading && (
          <>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(74,128,80,0.12)', border: '1px solid rgba(125,192,132,0.2)' }}>
              <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}CC`, lineHeight: 1.6, margin: 0 }}>
                {plan.summary}
              </p>
            </div>

            {/* Beds */}
            {plan.beds?.map((bed, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(245,200,64,0.12)', background: 'rgba(20,43,22,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <h4 style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: 0 }}>{bed.name}</h4>
                  <span style={{ fontFamily: ASSIST, fontSize: '11px', padding: '2px 8px', borderRadius: '50px', background: 'rgba(125,192,132,0.15)', color: SAGE }}>{bed.sunExposure}</span>
                </div>
                <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}66`, margin: '0 0 8px' }}>📍 {bed.location}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                  {bed.plants?.map((p, j) => (
                    <span key={j} style={{
                      fontFamily: ASSIST, fontSize: '11px', padding: '3px 10px', borderRadius: '50px',
                      background: 'rgba(74,128,80,0.18)', border: '1px solid rgba(125,192,132,0.25)', color: `${PARCH}CC`,
                    }}>
                      {p.nameHe} ×{p.quantity} ({p.spacing}ס"מ)
                    </span>
                  ))}
                </div>
                {bed.notes && <p style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}55`, margin: 0, fontStyle: 'italic' }}>{bed.notes}</p>}
              </div>
            ))}

            {/* Tips + Warnings */}
            {plan.warnings?.length > 0 && (
              <Section title="⚠️ אזהרות" color="#E0C070">
                {plan.warnings.map((w, i) => <p key={i} style={tipStyle}>{w}</p>)}
              </Section>
            )}
            {plan.companionNotes?.length > 0 && (
              <Section title="🌿 שיתופי פעולה" color={SAGE}>
                {plan.companionNotes.map((n, i) => <p key={i} style={tipStyle}>{n}</p>)}
              </Section>
            )}
            {plan.generalTips?.length > 0 && (
              <Section title="💡 טיפים כלליים" color={`${PARCH}88`}>
                {plan.generalTips.map((tip, i) => <p key={i} style={tipStyle}>· {tip}</p>)}
              </Section>
            )}
            {plan.wateringAdvice && (
              <Section title="💧 השקיה" color="#4A90D9">
                <p style={tipStyle}>{plan.wateringAdvice}</p>
              </Section>
            )}
            {plan.seasonalNotes && (
              <Section title="📅 הערות עונתיות" color={`${PARCH}66`}>
                <p style={tipStyle}>{plan.seasonalNotes}</p>
              </Section>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const positions = calculatePlantPositions(plan, mapData, northAngle);
                  onPlacePlants(positions);
                  onClose();
                }}
                style={{
                  flex: 2, fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                  padding: '11px', borderRadius: '8px', border: 'none',
                  backgroundColor: GOLD, color: '#142B16', cursor: 'pointer',
                }}
              >
                🌱 הנח צמחים במפה
              </button>
              <button onClick={onClose}
                style={{ flex: 1, fontFamily: ASSIST, fontSize: '13px', padding: '11px', borderRadius: '8px', border: `1px solid rgba(245,200,64,0.2)`, color: `${PARCH}88`, background: 'none', cursor: 'pointer' }}>
                סגור
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245,200,64,0.08)', background: 'rgba(20,43,22,0.4)' }}>
      <p style={{ fontFamily: ASSIST, fontSize: '11px', fontWeight: 600, color, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>{title}</p>
      {children}
    </div>
  );
}

const tipStyle: React.CSSProperties = {
  fontFamily: ASSIST, fontSize: '12px', color: 'rgba(237,224,196,0.7)', lineHeight: 1.5, margin: '2px 0',
};

const qtyBtn: React.CSSProperties = {
  background: 'rgba(245,200,64,0.15)', border: '1px solid rgba(245,200,64,0.3)',
  color: GOLD, cursor: 'pointer', fontSize: '11px', padding: '0 5px', lineHeight: '16px',
  borderRadius: '3px', fontFamily: ASSIST,
};
