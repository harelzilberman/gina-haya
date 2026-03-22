import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { WizardStatus, PlantPreview, MapData } from '../../stores/mapStore';
import { PLANTS } from '../../data/companions';

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
  const results: PlantPreview[] = [];
  const CANVAS_W = 40; // meters
  const CANVAS_H = 32; // meters
  const MARGIN = 1;    // 1 meter margin from edges

  // For each bed in the plan
  for (const bed of (plan.beds ?? [])) {
    // Find matching shape on map by name similarity
    const matchingShape = mapData.objects.find(obj =>
      obj.label?.toLowerCase().includes(bed.suggestedName?.toLowerCase()) ||
      bed.suggestedName?.toLowerCase().includes(obj.label?.toLowerCase()) ||
      ['bed', 'raised-bed', 'hydroponics', 'aquaponics', 'vertical']
        .includes(obj.type)
    );

    for (const plant of (bed.plants ?? [])) {
      const spacingM = (plant.spacingCm ?? plant.spacing ?? 30) / 100; // convert cm to meters
      const quantity = plant.quantity ?? 1;

      let startX = MARGIN;
      let startY = MARGIN + results.length * 2; // offset each bed

      // If we found a matching shape, place inside it
      if (matchingShape) {
        if (matchingShape.shapeKind === 'rect' &&
            matchingShape.x != null &&
            matchingShape.y != null) {
          startX = matchingShape.x + spacingM / 2;
          startY = matchingShape.y + spacingM / 2;
        } else if (matchingShape.shapeKind === 'circle' &&
                   matchingShape.cx != null) {
          startX = matchingShape.cx - spacingM;
          startY = matchingShape.cy! - spacingM;
        }
      }

      // Place plants in a grid with correct spacing
      let placed = 0;
      let row = 0;
      while (placed < quantity) {
        const col = placed % Math.max(1, Math.floor(
          (matchingShape?.width ?? 4) / spacingM
        ));
        if (col === 0 && placed > 0) row++;

        const x = startX + col * spacingM;
        const y = startY + row * spacingM;

        // Make sure position is within canvas bounds
        const finalX = Math.min(Math.max(x, MARGIN), CANVAS_W - MARGIN);
        const finalY = Math.min(Math.max(y, MARGIN), CANVAS_H - MARGIN);

        // Check no overlap with existing plants
        const tooClose = results.some(existing => {
          const dx = existing.x - finalX;
          const dy = existing.y - finalY;
          return Math.sqrt(dx*dx + dy*dy) < spacingM * 0.8;
        });

        if (!tooClose) {
          results.push({
            plantNameHe: plant.nameHe ?? plant.name ?? 'צמח',
            plantNameEn: plant.nameEn ?? plant.name ?? 'plant',
            emoji: getPlantEmoji(plant.nameEn ?? plant.nameHe ?? ''),
            spacing: spacingM,
            x: finalX,
            y: finalY,
            bedName: bed.suggestedName ?? bed.name ?? 'ערוגה',
          });
        }
        placed++;
      }
    }
  }

  // Handle pot suggestions
  for (const pot of (plan.potAdvice ?? [])) {
    const potShape = mapData.objects.find(obj =>
      obj.type === 'pot-rect' || obj.type === 'pot-round'
    );
    for (const plantName of (pot.suggestedPlants ?? []).slice(0, 2)) {
      const spacingM = 0.2;
      results.push({
        plantNameHe: plantName,
        plantNameEn: plantName,
        emoji: getPlantEmoji(plantName),
        spacing: spacingM,
        x: potShape?.cx ?? potShape?.x ?? (MARGIN + results.length),
        y: potShape?.cy ?? potShape?.y ?? MARGIN,
        bedName: pot.potDescription ?? 'עציץ',
      });
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
