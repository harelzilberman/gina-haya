import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { DayPlan } from '../../stores/planStore';

const GOLD      = '#F5C840';
const PARCH     = '#EDE0C4';
const SAGE      = '#7DC084';
const NODE_RED  = '#A33030';
const FRANK     = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST    = '"Assistant", "Heebo", sans-serif';

const SCORE_COLOURS: Record<string, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#333333',
};

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  fruit:  { bg: 'rgba(192,98,42,0.18)',  color: '#E8956A' },
  root:   { bg: 'rgba(180,140,40,0.18)', color: '#D4B04A' },
  flower: { bg: 'rgba(160,80,160,0.18)', color: '#C884C8' },
  leaf:   { bg: 'rgba(74,128,80,0.22)',  color: SAGE      },
};

const DAY_TYPE_EN: Record<string, string> = {
  fruit: 'Fruit', root: 'Root', flower: 'Flower', leaf: 'Leaf',
};

const SMALL_R = 22;
const SMALL_C = 2 * Math.PI * SMALL_R;

interface Props {
  day: DayPlan;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  forceExpanded?: boolean;
}

export function DayPlanCard({ day, isToday, isExpanded, onToggle, forceExpanded }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const scoreColour  = SCORE_COLOURS[day.scoreColour] ?? '#4A7C59';
  const dtStyle      = DAY_TYPE_STYLES[day.dayType] ?? { bg: 'rgba(100,100,100,0.18)', color: PARCH };
  const dashOffset   = mounted ? SMALL_C * (1 - day.plantingScore / 10) : SMALL_C;

  const borderColour = day.nodeActive
    ? 'rgba(163,48,48,0.4)'
    : isToday
      ? GOLD
      : 'rgba(245,200,64,0.12)';

  const cardBg = day.nodeActive
    ? 'linear-gradient(145deg, rgba(163,48,48,0.12) 0%, rgba(20,43,22,0.85) 100%)'
    : 'linear-gradient(145deg, rgba(28,58,30,0.7) 0%, rgba(20,43,22,0.82) 100%)';

  const dayNameEn = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const dateEn    = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  const dayTypeLabel = isHe ? day.dayTypeHe : (DAY_TYPE_EN[day.dayType] ?? day.dayType);

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="day-plan-card"
      style={{
        background:    cardBg,
        border:        `1px solid ${borderColour}`,
        borderRadius:  '14px',
        marginBottom:  '10px',
        backdropFilter: 'blur(6px)',
        overflow:      'hidden',
        transition:    'border-color 0.2s',
      }}
    >
      {/* ── Card header (always visible) ── */}
      <button
        onClick={onToggle}
        style={{
          width:           '100%',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '14px 16px',
          background:      'none',
          border:          'none',
          cursor:          'pointer',
          textAlign:       isHe ? 'right' : 'left',
          gap:             '12px',
        }}
      >
        {/* Day name + date */}
        <div style={{ flex: 1, textAlign: isHe ? 'right' : 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isHe ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
            {isToday && (
              <span style={{
                fontFamily:    ASSIST,
                fontSize:      '10px',
                fontWeight:    600,
                padding:       '2px 8px',
                borderRadius:  '50px',
                backgroundColor: `${GOLD}22`,
                color:         GOLD,
                border:        `1px solid ${GOLD}44`,
                letterSpacing: '0.05em',
              }}>
                {isHe ? 'היום' : 'Today'}
              </span>
            )}
            <span className="day-header" style={{ fontFamily: FRANK, fontSize: '17px', fontWeight: 700, color: isToday ? GOLD : PARCH }}>
              {isHe ? `יום ${day.dayOfWeek}` : dayNameEn}
            </span>
            <span style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}66` }}>
              {isHe ? day.dateHe : dateEn}
            </span>
          </div>

          {/* Day type badge */}
          <div style={{ display: 'flex', justifyContent: isHe ? 'flex-end' : 'flex-start', marginTop: '5px' }}>
            <span style={{
              fontFamily:      ASSIST,
              fontSize:        '12px',
              fontWeight:      500,
              padding:         '3px 12px',
              borderRadius:    '50px',
              backgroundColor: dtStyle.bg,
              color:           dtStyle.color,
              border:          `1px solid ${dtStyle.color}33`,
            }}>
              {day.dayTypeEmoji} {dayTypeLabel}
            </span>
          </div>
        </div>

        {/* Score ring + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <svg className="score-circle" width="52" height="52" viewBox="0 0 52 52" aria-label={`Score ${day.plantingScore}`}>
            <circle cx="26" cy="26" r={SMALL_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="26" cy="26" r={SMALL_R}
              fill="none"
              stroke={scoreColour}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={SMALL_C}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 26 26)"
              style={{
                transition: 'stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                filter: `drop-shadow(0 0 3px ${scoreColour}88)`,
              }}
            />
            <text
              x="26" y="26"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="14"
              fontWeight="700"
              fill={scoreColour}
              fontFamily="Frank Ruhl Libre, Georgia, serif"
            >
              {day.plantingScore}
            </text>
          </svg>

          <span style={{
            fontFamily: ASSIST,
            fontSize:   '16px',
            color:      `${PARCH}55`,
            transform:  isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            display:    'inline-block',
          }}>
            ˅
          </span>
        </div>
      </button>

      {/* ── Expandable body ── */}
      <div
        className="day-card-content"
        style={{
          maxHeight:  (isExpanded || forceExpanded) ? '700px' : '0',
          overflow:   'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{ padding: '0 16px 16px' }}>
          {/* Node blackout banner */}
          {day.nodeActive && (
            <div style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '8px',
              padding:         '10px 14px',
              borderRadius:    '8px',
              backgroundColor: `${NODE_RED}22`,
              border:          `1px solid ${NODE_RED}44`,
              marginBottom:    '14px',
            }}>
              <span style={{ fontSize: '16px' }}>⚫</span>
              <div>
                <p style={{ fontFamily: ASSIST, fontSize: '13px', fontWeight: 600, color: '#E07070', margin: 0 }}>
                  {isHe ? 'יום צומת — מנוחה לגינה' : 'Node Day — rest for the garden'}
                </p>
                <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${NODE_RED}CC`, margin: '2px 0 0' }}>
                  {isHe
                    ? 'הירח בצומת — לא מומלץ לשתול, לקצור או לזרוע'
                    : 'Moon at node — planting, harvesting and sowing not recommended'}
                </p>
              </div>
            </div>
          )}

          {/* Recommended actions */}
          {day.recommendedActions.length > 0 && (
            <Section title={isHe ? 'פעולות מומלצות' : 'Recommended actions'}>
              {day.recommendedActions.map((action, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: SAGE, fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}CC` }}>
                    {!isHe && action === 'יום מנוחה לגינה' ? 'Garden rest day' : action}
                  </span>
                </div>
              ))}
            </Section>
          )}

          {/* Recommended plants */}
          {day.recommendedPlants.length > 0 && (
            <Section title={isHe ? 'צמחים מומלצים להיום' : 'Recommended plants for today'}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {day.recommendedPlants.map((plant, i) => (
                  <span key={i} style={{
                    fontFamily:      ASSIST,
                    fontSize:        '12px',
                    padding:         '4px 12px',
                    borderRadius:    '50px',
                    border:          `1px solid ${GOLD}44`,
                    color:           `${GOLD}CC`,
                    backgroundColor: `${GOLD}08`,
                  }}>
                    {plant}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Avoid actions */}
          {day.avoidActions.length > 0 && (
            <div className="avoid-section">
              <Section title={isHe ? 'להימנע מ...' : 'Avoid...'}>
                {day.avoidActions.map((action, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(220,100,100,0.7)', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✗</span>
                    <span style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}88` }}>{action}</span>
                  </div>
                ))}
              </Section>
            </div>
          )}

          {/* BD prep pills */}
          {(day.prep500 || day.prep501) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {day.prep500 && (
                <span style={{
                  fontFamily:      ASSIST,
                  fontSize:        '12px',
                  padding:         '4px 12px',
                  borderRadius:    '50px',
                  border:          `1px solid ${GOLD}44`,
                  color:           GOLD,
                  backgroundColor: `${GOLD}06`,
                }}>
                  {isHe ? '🌱 פרפרט 500 — יישום מומלץ' : '🌱 Prep 500 — application recommended'}
                </span>
              )}
              {day.prep501 && (
                <span style={{
                  fontFamily:      ASSIST,
                  fontSize:        '12px',
                  padding:         '4px 12px',
                  borderRadius:    '50px',
                  border:          `1px solid ${GOLD}44`,
                  color:           GOLD,
                  backgroundColor: `${GOLD}06`,
                }}>
                  {isHe ? '☀️ פרפרט 501 — יישום מומלץ' : '☀️ Prep 501 — application recommended'}
                </span>
              )}
            </div>
          )}

          {/* Moon direction */}
          <div style={{
            display:         'flex',
            alignItems:      'center',
            gap:             '8px',
            padding:         '8px 12px',
            borderRadius:    '8px',
            backgroundColor: 'rgba(245,200,64,0.04)',
            border:          '1px solid rgba(245,200,64,0.08)',
            marginBottom:    '14px',
          }}>
            <span style={{ fontSize: '14px' }}>
              {day.moonDirection === 'ascending' ? '↑' : '↓'}
            </span>
            <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88` }}>
              {isHe
                ? `ירח ${day.moonDirectionHe} · ${day.moonDirection === 'ascending' ? 'הארץ נושמת החוצה — זמן לקציר' : 'הארץ נושמת פנימה — זמן לשתילה'}`
                : `Moon ${day.moonDirection} · ${day.moonDirection === 'ascending' ? 'Earth breathes out — time to harvest' : 'Earth breathes in — time to plant'}`}
            </span>
          </div>

          {/* ChupChu tip */}
          {day.chupChuTip && (
            <div className="chupchu-tip" style={{
              padding:            '12px 14px',
              borderRadius:       '8px',
              backgroundColor:    'rgba(245,200,64,0.04)',
              borderInlineStart:  `3px solid ${GOLD}66`,
              borderTop:          '1px solid rgba(245,200,64,0.08)',
              borderBottom:       '1px solid rgba(245,200,64,0.08)',
              borderInlineEnd:    '1px solid rgba(245,200,64,0.08)',
            }}>
              <p style={{
                fontFamily:  ASSIST,
                fontSize:    '13px',
                fontStyle:   'italic',
                color:       `${PARCH}AA`,
                margin:      0,
                lineHeight:  1.6,
              }}>
                🌙 {day.chupChuTip}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{
        fontFamily:   ASSIST,
        fontSize:     '11px',
        fontWeight:   600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         `${PARCH}44`,
        margin:        '0 0 8px',
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}
