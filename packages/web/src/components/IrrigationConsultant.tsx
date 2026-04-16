/**
 * IrrigationConsultant.tsx
 * ------------------------
 * Adds a "💧 השקיה" button to the map toolbar that slides open a right-side
 * panel. Reads the logged-in user's gardens + plants from Supabase (RLS scopes
 * automatically), then calls Claude to generate a personalised irrigation plan.
 *
 * USAGE — in your map toolbar, next to the Matzupitzu button:
 *   import IrrigationConsultant from '@/components/IrrigationConsultant'
 *   <IrrigationConsultant supabase={supabase} />
 *
 * ALSO REQUIRED — create /app/api/irrigation-plan/route.ts
 * (snippet at the bottom of this file — keeps Anthropic key server-side)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Garden {
  id: string
  name: string
  location_region: string | null
  soil_type: string | null
  notes: string | null
}

interface IrrigationZone {
  name: string
  plants: string
  method: string
  frequency: string
  duration: string
  bestTime: string
  waterDepth: string
  components: string[]
  notes: string
}

interface IrrigationPlan {
  summary: string
  totalWaterPerWeek: string
  estimatedSavings: string
  installHours: string
  soilNote: string
  zones: IrrigationZone[]
  mainlineLayout: string
  controller: string
  phases: { phase: string; title: string; tasks: string[] }[]
  chupchus_tip: string
}

interface Prefs {
  water: string
  automation: string
  goal: string
  budget: string
}

interface Props {
  supabase: SupabaseClient
}

// ─── Design tokens — matches map page exactly ─────────────────────────────────

const T = {
  bg:          'rgb(20, 43, 22)',
  bgDeep:      'rgb(14, 30, 15)',
  bgCard:      'rgba(255,255,255,0.04)',
  gold:        'rgb(245, 200, 64)',
  goldFaint:   'rgba(245, 200, 64, 0.12)',
  goldBorder:  'rgba(245, 200, 64, 0.2)',
  goldBorder2: 'rgba(245, 200, 64, 0.4)',
  text:        'rgb(237, 224, 196)',
  textMuted:   'rgba(237, 224, 196, 0.6)',
  textDim:     'rgba(237, 224, 196, 0.35)',
  green:       'rgba(120, 200, 100, 0.85)',
  teal:        'rgba(80, 200, 160, 0.85)',
  fontUI:      '"Assistant", "Heebo", sans-serif',
  fontHe:      '"Frank Ruhl Libre", Georgia, serif',
  radius:      '8px',
  radiusSm:    '6px',
}

const SOIL_HE: Record<string, string> = {
  clay: 'חרסית (כבדה)', sandy: 'חולית', loam: 'לומית',
  silty: 'סילטית', chalky: 'גירנית', peat: 'כבול',
}

const ZONE_ACCENT = [T.green, T.teal, T.gold, 'rgba(200,150,255,0.8)', 'rgba(255,160,100,0.8)']

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: T.goldBorder, margin: '10px 0' }} />
}

function Tag({ children, color = T.goldFaint, textColor = T.gold }: {
  children: React.ReactNode; color?: string; textColor?: string
}) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: color, color: textColor,
      border: `1px solid ${textColor}40`, fontFamily: T.fontUI, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${T.goldBorder}`, borderTopColor: T.gold,
      borderRadius: '50%', animation: 'irr-spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

function MetricTile({ value, label, color = T.gold }: {
  value: string; label: string; color?: string
}) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.goldBorder}`,
      borderRadius: T.radiusSm, padding: '8px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: T.fontHe }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, fontFamily: T.fontUI }}>{label}</div>
    </div>
  )
}

// ─── Preferences form ─────────────────────────────────────────────────────────

function PrefsForm({ onSubmit, loading }: {
  onSubmit: (p: Prefs) => void; loading: boolean
}) {
  const [prefs, setPrefs] = useState<Prefs>({
    water: 'municipal', automation: 'timer', goal: 'water_saving', budget: 'moderate',
  })
  const set = (k: keyof Prefs) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setPrefs(p => ({ ...p, [k]: e.target.value }))

  const sel: React.CSSProperties = {
    width: '100%', background: T.bgCard, border: `1px solid ${T.goldBorder2}`,
    borderRadius: T.radiusSm, color: T.text, fontSize: 13, fontFamily: T.fontUI,
    padding: '7px 10px', outline: 'none', cursor: 'pointer', direction: 'rtl',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, color: T.textMuted, marginBottom: 4, fontFamily: T.fontUI,
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={lbl}>מקור מים</label>
          <select style={sel} value={prefs.water} onChange={set('water')}>
            <option value="municipal">ברז עירוני</option>
            <option value="well">באר / מעיין</option>
            <option value="rainwater">איסוף גשמים</option>
            <option value="recycled">מי אפור / ממוחזר</option>
          </select>
        </div>
        <div>
          <label style={lbl}>רמת אוטומציה</label>
          <select style={sel} value={prefs.automation} onChange={set('automation')}>
            <option value="manual">ידני</option>
            <option value="timer">טיימר פשוט</option>
            <option value="smart">בקר חכם</option>
          </select>
        </div>
        <div>
          <label style={lbl}>מטרה עיקרית</label>
          <select style={sel} value={prefs.goal} onChange={set('goal')}>
            <option value="water_saving">חיסכון במים</option>
            <option value="maximum_yield">מקסום יבול</option>
            <option value="low_maintenance">תחזוקה נמוכה</option>
            <option value="biodynamic">תזמון ביודינמי</option>
          </select>
        </div>
        <div>
          <label style={lbl}>תקציב</label>
          <select style={sel} value={prefs.budget} onChange={set('budget')}>
            <option value="minimal">מינימלי (DIY)</option>
            <option value="moderate">בינוני</option>
            <option value="premium">פרמיום</option>
          </select>
        </div>
      </div>
      <button
        onClick={() => !loading && onSubmit(prefs)}
        disabled={loading}
        style={{
          width: '100%', padding: '10px 0',
          background: loading ? 'transparent' : T.gold,
          color: loading ? T.textMuted : T.bg,
          border: `1px solid ${loading ? T.goldBorder : T.gold}`,
          borderRadius: T.radius, fontSize: 14, fontWeight: 700,
          fontFamily: T.fontHe, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        {loading ? <><Spinner size={16} /><span>בונה תוכנית...</span></> : '💧 צור תוכנית השקיה'}
      </button>
    </>
  )
}

// ─── Plan result view ─────────────────────────────────────────────────────────

function PlanView({ plan }: { plan: IrrigationPlan }) {
  return (
    <>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        <MetricTile value={plan.totalWaterPerWeek} label="מים / שבוע"  color={T.teal}  />
        <MetricTile value={plan.estimatedSavings}  label="חיסכון"      color={T.green} />
        <MetricTile value={plan.installHours}      label="שעות התקנה" color={T.gold}  />
      </div>

      {/* Summary */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.goldBorder}`,
        borderRadius: T.radius, padding: '10px 12px', marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontFamily: T.fontUI }}>
          {plan.summary}
        </p>
        {plan.soilNote && (
          <p style={{
            fontSize: 12, color: T.textMuted, marginTop: 8, padding: '6px 10px',
            background: 'rgba(255,255,255,0.03)', borderRadius: T.radiusSm,
            borderRight: `3px solid ${T.gold}`, fontFamily: T.fontUI,
          }}>
            {plan.soilNote}
          </p>
        )}
      </div>

      {/* Zones */}
      {plan.zones.map((z, i) => (
        <div key={i} style={{
          background: T.bgCard, border: `1px solid ${T.goldBorder}`,
          borderRadius: T.radius, padding: '10px 12px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Tag color={`${ZONE_ACCENT[i % 5]}18`} textColor={ZONE_ACCENT[i % 5]}>{z.method}</Tag>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.fontHe }}>
              {z.name}
            </span>
          </div>
          {z.plants && (
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, fontFamily: T.fontUI }}>
              {z.plants}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 8 }}>
            {[['תדירות', z.frequency], ['משך', z.duration], ['זמן מועדף', z.bestTime]].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontUI }}>{val}</div>
                <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontUI }}>{lbl}</div>
              </div>
            ))}
          </div>
          {z.waterDepth && (
            <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, fontFamily: T.fontUI }}>
              עומק חדירה: {z.waterDepth}
            </p>
          )}
          <Divider />
          <p style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontUI }}>
            {z.components.join(' · ')}
          </p>
          {z.notes && (
            <p style={{ fontSize: 11, color: T.textMuted, marginTop: 6, fontFamily: T.fontUI }}>{z.notes}</p>
          )}
        </div>
      ))}

      {/* Mainline + controller */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.goldBorder}`,
        borderRadius: T.radius, padding: '10px 12px', marginBottom: 10,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 4, fontFamily: T.fontHe }}>
          פריסת צינור ראשי
        </p>
        <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, fontFamily: T.fontUI }}>
          {plan.mainlineLayout}
        </p>
        <Divider />
        <p style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 4, fontFamily: T.fontHe }}>
          בקר / טיימר מומלץ
        </p>
        <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, fontFamily: T.fontUI }}>
          {plan.controller}
        </p>
      </div>

      {/* Installation phases */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.goldBorder}`,
        borderRadius: T.radius, padding: '10px 12px', marginBottom: 10,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 10, fontFamily: T.fontHe }}>
          שלבי התקנה
        </p>
        {plan.phases.map((ph, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: T.goldFaint, border: `1px solid ${T.gold}`,
              color: T.gold, fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1, fontFamily: T.fontUI,
            }}>
              {i + 1}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3, fontFamily: T.fontHe }}>
                {ph.phase} — {ph.title}
              </p>
              <ul style={{ paddingRight: 14, margin: 0 }}>
                {ph.tasks.map((t, j) => (
                  <li key={j} style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.7, fontFamily: T.fontUI }}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Chupchu tip */}
      {plan.chupchus_tip && (
        <div style={{
          background: T.goldFaint, border: `1px solid ${T.goldBorder2}`,
          borderRadius: T.radius, padding: '10px 12px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 4, fontFamily: T.fontHe }}>
            🌕 מצ׳ופצ׳ו אומר...
          </p>
          <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontFamily: T.fontUI }}>
            {plan.chupchus_tip}
          </p>
        </div>
      )}
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function IrrigationConsultant({ supabase }: Props) {
  const [open, setOpen]               = useState(false)
  const [gardens, setGardens]         = useState<Garden[]>([])
  const [plants, setPlants]           = useState<Record<string, string[]>>({})
  const [loadingData, setLoadingData] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [plan, setPlan]               = useState<IrrigationPlan | null>(null)
  const [planCache, setPlanCache]     = useState<Record<string, IrrigationPlan>>({})
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const initialized                   = useRef(false)

  // Load data once when panel first opens
  useEffect(() => {
    if (!open || initialized.current) return
    initialized.current = true
    loadData()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore cached plan when switching garden tabs
  useEffect(() => {
    const g = gardens[selectedIdx]
    if (g) { setPlan(planCache[g.id] ?? null); setError(null) }
  }, [selectedIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      // RLS automatically scopes to the logged-in user
      const { data: gData, error: gErr } = await supabase
        .from('gardens')
        .select('id, name, location_region, soil_type, notes')
        .order('created_at', { ascending: true })
        .limit(20)

      if (gErr) throw gErr
      if (!gData?.length) { setLoadingData(false); return }
      setGardens(gData)

      // Fetch all plants across all user gardens in one query
      const ids = gData.map((g: Garden) => g.id)
      const { data: pData } = await supabase
        .from('garden_plants')
        .select('garden_id, common_name_en, common_name_he')
        .in('garden_id', ids)

      const pm: Record<string, string[]> = {}
      pData?.forEach((p: { garden_id: string; common_name_en: string | null; common_name_he: string | null }) => {
        if (!pm[p.garden_id]) pm[p.garden_id] = []
        const n = p.common_name_he || p.common_name_en
        if (n) pm[p.garden_id].push(n)
      })
      setPlants(pm)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הנתונים')
    } finally {
      setLoadingData(false)
    }
  }, [supabase])

  const generatePlan = useCallback(async (prefs: Prefs) => {
    const garden = gardens[selectedIdx]
    if (!garden) return
    setGenerating(true)
    setError(null)
    setPlan(null)

    const gardenPlants = plants[garden.id] ?? []

    const prompt = `אתה מצ׳ופצ׳ו, יועץ השקיה ביודינמי של גינה חיה. ענה רק JSON תקני — ללא markdown, ללא backticks.

גינה: "${garden.name}" | אזור: "${garden.location_region ?? 'ישראל'}" | קרקע: "${garden.soil_type ?? 'לא ידוע'}" | הערות: "${garden.notes ?? 'אין'}"
צמחים: ${gardenPlants.length ? gardenPlants.slice(0, 30).join(', ') : 'טרם נרשמו'}
העדפות: מים=${prefs.water}, אוטומציה=${prefs.automation}, מטרה=${prefs.goal}, תקציב=${prefs.budget}

החזר בדיוק:
{
  "summary": "2-3 משפטים על התוכנית המותאמת לגינה זו",
  "totalWaterPerWeek": "X ליטר",
  "estimatedSavings": "X%",
  "installHours": "X-Y שעות",
  "soilNote": "משפט אחד על השפעת סוג הקרקע על ההשקיה",
  "zones": [
    {
      "name": "שם האזור לפי הצמחים/מיקום",
      "plants": "אילו צמחים שייכים לאזור זה",
      "method": "טפטוף/ממטר/צינור מחלחל/מיקרו-ריסוס/ידני",
      "frequency": "כל X ימים",
      "duration": "X דקות",
      "bestTime": "בוקר / ערב",
      "waterDepth": "X ס״מ",
      "components": ["רשימת רכיבי חומרה"],
      "notes": "הערת טיפול מיוחדת"
    }
  ],
  "mainlineLayout": "תיאור פריסת הצינור הראשי",
  "controller": "בקר / טיימר מומלץ",
  "phases": [
    { "phase": "שלב 1", "title": "כותרת קצרה", "tasks": ["משימה"] },
    { "phase": "שלב 2", "title": "כותרת קצרה", "tasks": ["משימה"] },
    { "phase": "שלב 3", "title": "כותרת קצרה", "tasks": ["משימה"] }
  ],
  "chupchus_tip": "טיפ חכם ממצ׳ופצ׳ו בהתאם לאופי הגינה וסוג הקרקע"
}`

    try {
      const res = await fetch('/api/irrigation-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`)
      const data = await res.json()
      const raw = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''
      const parsed: IrrigationPlan = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setPlan(parsed)
      setPlanCache(prev => ({ ...prev, [garden.id]: parsed }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת התוכנית')
    } finally {
      setGenerating(false)
    }
  }, [gardens, selectedIdx, plants])

  const garden = gardens[selectedIdx]

  return (
    <>
      <style>{`
        @keyframes irr-spin     { to { transform: rotate(360deg) } }
        @keyframes irr-slide-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .irr-gtab:hover { background: rgba(245,200,64,0.1) !important; color: rgb(245,200,64) !important; }
      `}</style>

      {/* ── Toolbar trigger button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="יועץ השקיה"
        style={{
          fontFamily: T.fontUI, fontSize: 13, fontWeight: open ? 700 : 400,
          padding: '6px 12px', borderRadius: 6, height: 36,
          border: `1px solid ${open ? T.gold : T.goldBorder}`,
          color: open ? T.bg : T.textMuted,
          backgroundColor: open ? T.gold : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
        }}
      >
        💧 השקיה
      </button>

      {/* ── Sliding panel ── */}
      {open && (
        <>
          {/* Backdrop — closes panel on click */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: '116px 0 0 0',
              zIndex: 299, background: 'rgba(0,0,0,0.35)',
            }}
          />

          {/* Panel — slides in from right, starts below both nav bars */}
          <div
            dir="rtl"
            style={{
              position: 'fixed', top: 116, right: 0, bottom: 0, width: 380,
              zIndex: 300, background: T.bgDeep,
              borderLeft: `1px solid ${T.goldBorder}`,
              display: 'flex', flexDirection: 'column',
              animation: 'irr-slide-in 0.22s ease-out',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: `1px solid ${T.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, color: T.gold,
                  fontFamily: T.fontHe, margin: 0,
                }}>
                  💧 יועץ השקיה
                </h2>
                <p style={{ fontSize: 11, color: T.textMuted, fontFamily: T.fontUI, marginTop: 2 }}>
                  ניתוח מותאם אישית לגינות שלך
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent', border: 'none',
                  color: T.textMuted, fontSize: 20,
                  cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

              {/* Loading */}
              {loadingData && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '3rem 0', gap: 12,
                }}>
                  <Spinner size={32} />
                  <p style={{ fontSize: 13, color: T.textMuted, fontFamily: T.fontUI }}>
                    טוען גינות...
                  </p>
                </div>
              )}

              {/* Empty / error state */}
              {!loadingData && gardens.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  {error
                    ? <p style={{ fontSize: 13, color: 'rgba(255,100,100,0.8)', fontFamily: T.fontUI }}>{error}</p>
                    : <>
                        <p style={{ fontSize: 14, color: T.textMuted, fontFamily: T.fontHe }}>לא נמצאו גינות</p>
                        <p style={{ fontSize: 12, color: T.textDim, fontFamily: T.fontUI, marginTop: 6 }}>
                          שרטט גינה במפה תחילה
                        </p>
                      </>
                  }
                  <button
                    onClick={() => { initialized.current = false; loadData() }}
                    style={{
                      marginTop: 12, padding: '6px 16px',
                      background: T.goldFaint, border: `1px solid ${T.goldBorder}`,
                      borderRadius: T.radiusSm, color: T.gold,
                      fontSize: 13, fontFamily: T.fontUI, cursor: 'pointer',
                    }}
                  >
                    נסה שוב
                  </button>
                </div>
              )}

              {/* Main content */}
              {!loadingData && gardens.length > 0 && (
                <>
                  {/* Garden tabs — only shown when user has multiple gardens */}
                  {gardens.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {gardens.map((g, i) => (
                        <button
                          key={g.id}
                          className="irr-gtab"
                          onClick={() => setSelectedIdx(i)}
                          style={{
                            padding: '5px 12px', fontSize: 13, fontFamily: T.fontUI,
                            background: i === selectedIdx ? T.goldFaint : 'transparent',
                            border: `1px solid ${i === selectedIdx ? T.gold : T.goldBorder}`,
                            borderRadius: 20,
                            color: i === selectedIdx ? T.gold : T.textMuted,
                            fontWeight: i === selectedIdx ? 700 : 400,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Garden info card */}
                  {garden && (
                    <div style={{
                      background: T.bgCard, border: `1px solid ${T.goldBorder}`,
                      borderRadius: T.radius, padding: '10px 12px', marginBottom: 14,
                    }}>
                      <div style={{
                        display: 'flex', gap: 6, flexWrap: 'wrap',
                        marginBottom: 6, alignItems: 'center',
                      }}>
                        <span style={{
                          fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontHe,
                        }}>
                          {garden.name}
                        </span>
                        {garden.location_region && <Tag>{garden.location_region}</Tag>}
                        {garden.soil_type && (
                          <Tag color='rgba(200,150,80,0.15)' textColor='rgba(245,190,100,0.9)'>
                            {SOIL_HE[garden.soil_type] ?? garden.soil_type}
                          </Tag>
                        )}
                      </div>
                      {garden.notes && (
                        <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, fontFamily: T.fontUI }}>
                          {garden.notes}
                        </p>
                      )}
                      {(plants[garden.id]?.length ?? 0) > 0 && (
                        <>
                          <p style={{ fontSize: 11, color: T.textDim, marginBottom: 5, fontFamily: T.fontUI }}>
                            צמחים בגינה
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(plants[garden.id] ?? []).slice(0, 18).map(p => (
                              <span key={p} style={{
                                fontSize: 11, padding: '2px 7px',
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${T.goldBorder}`,
                                borderRadius: 12, color: T.textMuted, fontFamily: T.fontUI,
                              }}>
                                {p}
                              </span>
                            ))}
                            {(plants[garden.id]?.length ?? 0) > 18 && (
                              <span style={{
                                fontSize: 11, color: T.textDim,
                                fontFamily: T.fontUI, alignSelf: 'center',
                              }}>
                                +{(plants[garden.id]?.length ?? 0) - 18} עוד
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Plan or prefs form */}
                  {plan ? (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 12,
                      }}>
                        <span style={{
                          fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: T.fontHe,
                        }}>
                          תוכנית השקיה
                        </span>
                        <button
                          onClick={() => { setPlan(null); setError(null) }}
                          style={{
                            fontSize: 11, color: T.textDim, background: 'transparent',
                            border: 'none', cursor: 'pointer', fontFamily: T.fontUI,
                          }}
                        >
                          ← שנה העדפות
                        </button>
                      </div>
                      <PlanView plan={plan} />
                    </>
                  ) : (
                    <PrefsForm onSubmit={generatePlan} loading={generating} />
                  )}

                  {/* Inline error */}
                  {error && !generating && (
                    <p style={{
                      fontSize: 12, color: 'rgba(255,100,100,0.8)',
                      textAlign: 'center', padding: '8px 0', fontFamily: T.fontUI,
                    }}>
                      {error}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
