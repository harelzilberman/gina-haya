import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { WizardStatus } from '../../stores/mapStore';
import { PLANTS } from '../../data/companions';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

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
}

export function WizardModal({ mapId, wizardStatus, onClose, onRefreshStatus }: Props) {
  const { session } = useAuthStore();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WizardPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !wishlist.includes(t)) setWishlist(w => [...w, t]);
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

  const runWizard = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<{ plan: WizardPlan; runsUsedThisMonth: number; limit: number | null }>(
        `/api/map/${mapId}/wizard`,
        { plantWishlist: wishlist },
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

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '32px' }}>
              {wishlist.map(tag => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontFamily: ASSIST, fontSize: '12px', padding: '4px 10px', borderRadius: '50px',
                  backgroundColor: `${GOLD}18`, border: `1px solid ${GOLD}44`, color: GOLD,
                }}>
                  {tag}
                  <button onClick={() => setWishlist(w => w.filter(t => t !== tag))}
                    style={{ background: 'none', border: 'none', color: `${GOLD}88`, cursor: 'pointer', fontSize: '12px', padding: '0 0 0 2px' }}>✕</button>
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
              <button onClick={onClose}
                style={{ flex: 1, fontFamily: ASSIST, fontSize: '13px', padding: '10px', borderRadius: '8px', border: `1px solid rgba(245,200,64,0.2)`, color: `${PARCH}88`, background: 'none', cursor: 'pointer' }}>
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
