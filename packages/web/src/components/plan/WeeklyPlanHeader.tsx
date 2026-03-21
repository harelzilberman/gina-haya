import { usePlanStore, type WeeklyPlan } from '../../stores/planStore';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start    = new Date(weekStart + 'T12:00:00');
  const end      = new Date(weekEnd   + 'T12:00:00');
  const startDay = start.getDate();
  const endDay   = end.getDate();
  const monthHe  = end.toLocaleDateString('he-IL', { month: 'long' });
  const year     = end.getFullYear();
  return `${startDay}–${endDay} ב${monthHe} ${year}`;
}

function formatBestDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `יום ${HE_DAYS[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatGeneratedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem',
  });
}

interface Props {
  plan: WeeklyPlan;
}

export function WeeklyPlanHeader({ plan }: Props) {
  const { isRegenerating, regeneratePlan } = usePlanStore();

  return (
    <div dir="rtl" style={{ marginBottom: '20px' }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px', gap: '12px' }}>
        <h1 style={{
          fontFamily:  FRANK,
          fontSize:    '28px',
          fontWeight:  700,
          color:       GOLD,
          margin:      0,
          lineHeight:  1.2,
          textAlign:   'right',
        }}>
          תכנית השבוע שלך
        </h1>

        {/* Regenerate button */}
        <button
          onClick={regeneratePlan}
          disabled={isRegenerating}
          style={{
            flexShrink:      0,
            fontFamily:      ASSIST,
            fontSize:        '12px',
            fontWeight:      500,
            padding:         '6px 14px',
            borderRadius:    '6px',
            border:          `1px solid ${GOLD}55`,
            color:           isRegenerating ? `${GOLD}66` : GOLD,
            backgroundColor: 'transparent',
            cursor:          isRegenerating ? 'not-allowed' : 'pointer',
            transition:      'border-color 0.2s, color 0.2s',
            display:         'flex',
            alignItems:      'center',
            gap:             '6px',
            marginTop:       '4px',
          }}
          onMouseEnter={e => {
            if (!isRegenerating) {
              (e.currentTarget as HTMLElement).style.borderColor = GOLD;
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.06)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`;
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          {isRegenerating ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              מרענן...
            </>
          ) : (
            <>⟳ רענן תכנית</>
          )}
        </button>
      </div>

      {/* Date range + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}88` }}>
          {formatWeekRange(plan.weekStart, plan.weekEnd)}
        </span>
        {plan.generatedAt && (
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44` }}>
            · תכנית מהיום ב-{formatGeneratedTime(plan.generatedAt)}
          </span>
        )}
      </div>

      {/* Week summary */}
      <div style={{
        background:    'linear-gradient(145deg, rgba(28,58,30,0.7) 0%, rgba(20,43,22,0.8) 100%)',
        border:        '1px solid rgba(245,200,64,0.12)',
        borderRadius:  '12px',
        padding:       '16px 18px',
        marginBottom:  '14px',
        backdropFilter: 'blur(6px)',
      }}>
        <p style={{
          fontFamily: ASSIST,
          fontSize:   '14px',
          lineHeight: 1.65,
          color:      `${PARCH}CC`,
          margin:     0,
          textAlign:  'right',
        }}>
          {plan.weekSummary}
        </p>
        {plan.weatherSummary && (
          <p style={{
            fontFamily: ASSIST,
            fontSize:   '12px',
            color:      `${PARCH}66`,
            margin:     '10px 0 0',
            textAlign:  'right',
            borderTop:  '1px solid rgba(245,200,64,0.08)',
            paddingTop: '10px',
          }}>
            🌤 {plan.weatherSummary}
          </p>
        )}
      </div>

      {/* Best-day cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <BestDayCard
          label="היום הטוב ביותר לשתילה"
          emoji="🌱"
          date={plan.bestDayForPlanting}
          formatter={formatBestDay}
        />
        <BestDayCard
          label="היום הטוב ביותר לקציר"
          emoji="🌾"
          date={plan.bestDayForHarvest}
          formatter={formatBestDay}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function BestDayCard({
  label, emoji, date, formatter,
}: {
  label: string; emoji: string; date: string; formatter: (d: string) => string;
}) {
  return (
    <div style={{
      background:    'linear-gradient(145deg, rgba(28,58,30,0.6) 0%, rgba(20,43,22,0.75) 100%)',
      border:        '1px solid rgba(245,200,64,0.1)',
      borderRadius:  '10px',
      padding:       '14px 14px 12px',
      textAlign:     'right',
    }}>
      <p style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}55`, margin: '0 0 6px', lineHeight: 1.3 }}>
        {emoji} {label}
      </p>
      <p style={{ fontFamily: FRANK, fontSize: '16px', fontWeight: 700, color: GOLD, margin: 0 }}>
        {formatter(date)}
      </p>
    </div>
  );
}
