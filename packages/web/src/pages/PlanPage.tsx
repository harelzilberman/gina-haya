import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../stores/planStore';
import { useGardenStore } from '../stores/gardenStore';
import { WeeklyPlanHeader } from '../components/plan/WeeklyPlanHeader';
import { DayPlanCard } from '../components/plan/DayPlanCard';
import { WeeklyTaskList } from '../components/plan/WeeklyTaskList';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const PLAN_CSS = `
@keyframes plan-moon-pulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.08); }
}
@keyframes plan-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media print {
  nav, footer, button, .no-print { display: none !important; }
  .print-only { display: block !important; }

  body, * { background: white !important; color: #1a1a1a !important; }
  * { box-shadow: none !important; }

  .day-card-content {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .day-plan-card {
    page-break-inside: avoid;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    margin-bottom: 8px !important;
    padding: 8px 12px !important;
  }

  .score-circle { display: none !important; }
  .moosh-tip    { display: none !important; }

  .day-header { font-size: 13px !important; font-weight: bold !important; }

  p, li, span { font-size: 11px !important; line-height: 1.4 !important; }

  @page { margin: 1cm; }
}
`;

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

function LoadingState() {
  return (
    <div dir="rtl" style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      'calc(100vh - 80px)',
      padding:        '40px 16px',
      textAlign:      'center',
    }}>
      <span style={{ fontSize: '56px', animation: 'plan-moon-pulse 2.5s ease-in-out infinite' }}>
        🌕
      </span>
      <p style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '20px 0 8px' }}>
        מוש מכין את תכנית השבוע שלך...
      </p>
      <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}66`, margin: 0 }}>
        זה לוקח כ-20 שניות
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div dir="rtl" style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      'calc(100vh - 80px)',
      padding:        '40px 16px',
      textAlign:      'center',
    }}>
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</span>
      <p style={{ fontFamily: FRANK, fontSize: '18px', color: `${PARCH}CC`, margin: '0 0 8px' }}>
        לא הצלחנו להכין את התכנית
      </p>
      <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}55`, margin: '0 0 24px', maxWidth: '300px' }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        style={{
          fontFamily:    ASSIST,
          fontSize:      '14px',
          fontWeight:    600,
          padding:       '10px 24px',
          borderRadius:  '8px',
          border:        `1px solid ${GOLD}55`,
          color:         GOLD,
          backgroundColor: 'transparent',
          cursor:        'pointer',
        }}
      >
        נסה שוב
      </button>
    </div>
  );
}

function NoGardenPrompt({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div dir="rtl" style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      'calc(100vh - 80px)',
      padding:        '40px 24px',
      textAlign:      'center',
    }}>
      <span style={{ fontSize: '56px', marginBottom: '16px' }}>🌿</span>
      <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, margin: '0 0 10px' }}>
        צור גינה תחילה
      </h2>
      <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}88`, margin: '0 0 28px', maxWidth: '300px', lineHeight: 1.6 }}>
        כדי שמוש יוכל להכין תכנית שבועית מותאמת אישית, עליך קודם להגדיר את הגינה שלך
      </p>
      <button
        onClick={onNavigate}
        style={{
          fontFamily:    FRANK,
          fontSize:      '15px',
          fontWeight:    700,
          padding:       '12px 28px',
          borderRadius:  '8px',
          border:        'none',
          backgroundColor: GOLD,
          color:         '#142B16',
          cursor:        'pointer',
        }}
      >
        צור את הגינה שלי
      </button>
    </div>
  );
}

export function PlanPage() {
  const navigate     = useNavigate();
  const planStore    = usePlanStore();
  const gardenStore  = useGardenStore();
  const today        = todayISO();

  // Track that garden loading has been initiated
  const [gardenCheckStarted, setGardenCheckStarted] = useState(false);

  useEffect(() => {
    setGardenCheckStarted(true);
    if (gardenStore.gardens.length === 0) {
      gardenStore.loadGardens();
    }
  }, []);

  // Load plan once we know there's a garden
  useEffect(() => {
    if (
      gardenCheckStarted &&
      !gardenStore.isLoading &&
      gardenStore.gardens.length > 0 &&
      !planStore.weeklyPlan &&
      !planStore.isLoading
    ) {
      planStore.loadWeeklyPlan();
    }
  }, [gardenCheckStarted, gardenStore.isLoading, gardenStore.gardens.length]);

  // Expanded day state — today is open by default
  const [expandedDay, setExpandedDay] = useState<string | null>(today);
  const [allExpanded, setAllExpanded] = useState(false);

  function handlePrint() {
    setAllExpanded(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setAllExpanded(false), 1000);
    }, 300);
  }

  const isGardenLoading = !gardenCheckStarted || gardenStore.isLoading;

  if (isGardenLoading) return (
    <div style={{ background: '#142B16', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <LoadingState />
    </div>
  );

  if (gardenStore.gardens.length === 0) return (
    <div style={{ background: '#142B16', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <NoGardenPrompt onNavigate={() => navigate('/garden')} />
    </div>
  );

  if (planStore.isLoading || (!planStore.weeklyPlan && !planStore.error)) return (
    <div style={{ background: '#142B16', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <LoadingState />
    </div>
  );

  if (planStore.error && !planStore.weeklyPlan) return (
    <div style={{ background: '#142B16', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <ErrorState error={planStore.error} onRetry={() => planStore.loadWeeklyPlan()} />
    </div>
  );

  const plan = planStore.weeklyPlan!;

  return (
    <div dir="rtl" style={{ background: '#142B16', minHeight: '100vh', paddingTop: '80px', paddingBottom: '64px' }}>
      <style>{PLAN_CSS}</style>

      {/* Noise overlay */}
      <div style={{
        position:            'fixed',
        inset:               0,
        backgroundImage:     "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        opacity:             0.025,
        pointerEvents:       'none',
        zIndex:              0,
      }} />

      <div style={{
        position:  'relative',
        zIndex:    1,
        maxWidth:  '680px',
        margin:    '0 auto',
        padding:   '0 16px',
        animation: 'plan-fade-in 0.4s ease-out both',
      }}>
        {/* Print-only header (hidden on screen) */}
        <div className="print-only" style={{ display: 'none' }}>
          <h1 style={{ fontSize: '18px', marginBottom: '4px' }}>תכנית שבועית — גינה חיה</h1>
          <p style={{ fontSize: '12px', color: '#666' }}>
            שבוע {plan.weekStart} — {plan.weekEnd} | הודפס: {new Date().toLocaleDateString('he-IL')}
          </p>
          <hr style={{ margin: '8px 0' }} />
        </div>

        {/* Header */}
        <WeeklyPlanHeader plan={plan} />

        {/* General tasks */}
        <WeeklyTaskList tasks={plan.gardenTasks} weekStart={plan.weekStart} />

        {/* Day cards */}
        {plan.days.map(day => (
          <DayPlanCard
            key={day.date}
            day={day}
            isToday={day.date === today}
            isExpanded={expandedDay === day.date}
            forceExpanded={allExpanded}
            onToggle={() => setExpandedDay(prev => prev === day.date ? null : day.date)}
          />
        ))}

        {/* PDF / Print button */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={handlePrint}
            title="מדפיס בפורמט קומפקטי — שומר על הטבע 🌱"
            style={{
              fontFamily:    ASSIST,
              fontSize:      '14px',
              fontWeight:    500,
              padding:       '11px 28px',
              borderRadius:  '8px',
              border:        `1px solid rgba(245,200,64,0.25)`,
              color:         `${PARCH}88`,
              backgroundColor: 'transparent',
              cursor:        'pointer',
              transition:    'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = PARCH;
              (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = `${PARCH}88`;
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.25)';
            }}
          >
            הורד תכנית PDF 📄
          </button>
        </div>
      </div>
    </div>
  );
}
