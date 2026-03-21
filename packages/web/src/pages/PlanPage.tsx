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

const PRINT_SCORE_COLOURS: Record<string, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#555555',
};

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)}/${parseInt(m)}`;
}

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
  @page {
    size: A4 portrait;
    margin: 1.2cm 1cm;
  }

  html, body {
    height: auto !important;
    overflow: visible !important;
  }

  * {
    page-break-before: avoid !important;
    page-break-after: avoid !important;
  }

  #weekly-plan-print table {
    page-break-inside: auto;
  }

  #weekly-plan-print tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  body > *:not(#weekly-plan-print) {
    display: none !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* Hide screen UI, show print div */
  body > * { display: none !important; }
  #weekly-plan-print { 
    display: block !important;
    position: static !important;
    width: 100% !important;
  }
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
      <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}88`, margin: '0 0 28px', maxWidth: '300px', lineHeight: 1.4 }}>
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

  function handlePrint() {
    const printDiv = document.getElementById('weekly-plan-print');
    if (printDiv) {
      printDiv.style.display = 'block';
      printDiv.style.position = 'fixed';
      printDiv.style.top = '0';
      printDiv.style.left = '0';
      printDiv.style.width = '100%';
      printDiv.style.zIndex = '99999';
      printDiv.style.background = 'white';
    }
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        if (printDiv) {
          printDiv.style.display = 'none';
          printDiv.style.position = '';
          printDiv.style.top = '';
          printDiv.style.left = '';
          printDiv.style.zIndex = '';
          printDiv.style.background = '';
        }
      }, 500);
    }, 100);
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
            onToggle={() => setExpandedDay(prev => prev === day.date ? null : day.date)}
          />
        ))}

        {/* PDF / Print button */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
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

      {/* ── Hidden print table — replaces screen UI when printing ── */}
      <div id="weekly-plan-print" style={{ display: 'none', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>

        {/* Print header */}
        <div style={{ fontSize: '11px', marginBottom: '8px', borderBottom: '2px solid #1C3A1E', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#999', fontSize: '9px' }}>{new Date().toLocaleDateString('he-IL')}</span>
          <strong style={{ fontSize: '12px' }}>
            גינה חיה | תכנית שבועית | {plan.weekStart} — {plan.weekEnd}
          </strong>
        </div>

        {/* 7-column plan table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', tableLayout: 'fixed' }}>
          <thead>
            {/* Row 1: Day names */}
            <tr style={{ background: '#1C3A1E', color: '#F5C840' }}>
              {plan.days.map(day => (
                <th key={day.date} style={{
                  padding:     '5px 6px',
                  textAlign:   'right',
                  width:       'calc(100% / 7)',
                  fontWeight:  day.date === today ? 'bold' : 'normal',
                  borderLeft:  '1px solid #2d4f2f',
                  fontSize:    day.date === today ? '9px' : '8px',
                }}>
                  {day.dayOfWeek}{day.date === today ? ' ★' : ''}
                </th>
              ))}
            </tr>

            {/* Row 2: Date + type */}
            <tr style={{ fontSize: '9px' }}>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  padding:    '3px 4px',
                  textAlign:  'right',
                  borderLeft: '1px solid #e0e0e0',
                  background: day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : '#f5f5f5',
                }}>
                  {shortDate(day.date)} · {day.dayTypeHe} {day.dayTypeEmoji}
                </td>
              ))}
            </tr>

            {/* Row 3: Planting score */}
            <tr>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  textAlign:  'center',
                  fontSize:   '18px',
                  fontWeight: 'bold',
                  color:      PRINT_SCORE_COLOURS[day.scoreColour] ?? '#4A7C59',
                  padding:    '3px 4px',
                  borderLeft: '1px solid #e0e0e0',
                  background: day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : 'white',
                }}>
                  {day.nodeActive ? '⚫' : day.plantingScore}
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Row 4: Moon direction */}
            <tr>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  padding:    '3px 4px',
                  fontSize:   '9px',
                  borderLeft: '1px solid #e0e0e0',
                  background: day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : '#fafafa',
                }}>
                  {day.moonDirection === 'ascending' ? '↑' : '↓'} {day.moonDirectionHe}
                </td>
              ))}
            </tr>

            {/* Row 5: Recommended actions */}
            <tr>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  verticalAlign: 'top',
                  padding:       '3px 4px',
                  borderLeft:    '1px solid #e0e0e0',
                  background:    day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : 'white',
                }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '9px', lineHeight: 1.4 }}>
                    {day.recommendedActions.map((action, i) => (
                      <li key={i}>✓ {action}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Row 6: Recommended plants */}
            <tr>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  verticalAlign: 'top',
                  padding:       '3px 4px',
                  fontSize:      '9px',
                  borderLeft:    '1px solid #e0e0e0',
                  background:    day.nodeActive ? '#fff0f0' : day.date === today ? '#fffdf0' : '#fafafa',
                }}>
                  {day.recommendedPlants.length > 0
                    ? `צמחים: ${day.recommendedPlants.join(', ')}`
                    : ''}
                </td>
              ))}
            </tr>

            {/* Row 7: BD preparations */}
            <tr>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  fontSize:   '9px',
                  color:      '#4A7C59',
                  padding:    '3px 4px',
                  borderLeft: '1px solid #e0e0e0',
                  background: (day.prep500 || day.prep501)
                    ? '#f0fff0'
                    : day.nodeActive ? '#fff0f0'
                    : day.date === today ? '#fffdf0' : 'white',
                }}>
                  {day.prep500 && 'BD 500 ✓ '}
                  {day.prep501 && 'BD 501 ✓'}
                </td>
              ))}
            </tr>

            {/* Row 8: Moosh tip */}
            <tr>
              {plan.days.map(day => (
                <td key={day.date} style={{
                  fontSize:      '9px',
                  fontStyle:     'italic',
                  color:         '#666',
                  verticalAlign: 'top',
                  padding:       '3px 4px',
                  borderLeft:    '1px solid #e0e0e0',
                  background:    day.nodeActive ? '#fff0f0' : '#fffdf0',
                }}>
                  {day.mooshTip ? `מוש: ${day.mooshTip}` : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* Weekly tasks */}
        {plan.gardenTasks.length > 0 && (
          <div style={{ marginTop: '12px', fontSize: '9px' }}>
            <strong>משימות שבועיות: </strong>
            {plan.gardenTasks.join(' • ')}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '8px', fontSize: '8px', color: '#999', textAlign: 'center' }}>
          גינה חיה ונושמת — gina-haya.com | הדפס בתבונה 🌱
        </div>
      </div>
    </div>
  );
}
