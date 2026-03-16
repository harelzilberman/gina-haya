import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';

const SCORE_COLOURS: Record<string, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#333333',
};

interface Props {
  days:      BiodynamicDay[];
  todayDate: string; // YYYY-MM-DD
}

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const STRIP_CSS = `
@keyframes ws-pill-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0);   }
}
.ws-pill { animation: ws-pill-in 0.35s ease-out both; }
.ws-pill::-webkit-scrollbar { display: none; }
`;

const DAY_TYPE_EMOJIS: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

const WEEKDAY_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function weekdayLabel(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (lang === 'he') return WEEKDAY_HE[d.getDay()];
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDate();
}

export function WeekStrip({ days, todayDate }: Props) {
  const { i18n } = useTranslation('calendar');
  const [openDate, setOpenDate] = useState<string | null>(null);

  if (days.length === 0) return null;

  return (
    <>
      <style>{STRIP_CSS}</style>

      <div style={{
        background:   'linear-gradient(145deg, rgba(28,58,30,0.8) 0%, rgba(20,43,22,0.9) 100%)',
        border:       '1px solid rgba(245,200,64,0.1)',
        borderRadius: '14px',
        padding:      '16px 14px',
        marginBottom: '12px',
        backdropFilter:'blur(8px)',
      }}>
        {/* Section label */}
        <p style={{
          fontFamily:   ASSIST,
          fontSize:     '11px',
          fontWeight:   600,
          letterSpacing:'0.1em',
          textTransform:'uppercase',
          color:        `${PARCH}44`,
          margin:       '0 0 12px',
          paddingInlineStart: '2px',
        }}>
          השבוע
        </p>

        {/* Scrollable pills row */}
        <div style={{
          display:         'flex',
          gap:             '8px',
          overflowX:       'auto',
          paddingBottom:   '4px',
          scrollbarWidth:  'none',
          msOverflowStyle: 'none',
        }}>
          {days.map((day, idx) => {
            const isToday     = day.date === todayDate;
            const isOpen      = openDate === day.date;
            const scoreColour = SCORE_COLOURS[day.scoreColour];

            return (
              <div key={day.date} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  className="ws-pill"
                  onClick={() => setOpenDate(isOpen ? null : day.date)}
                  aria-expanded={isOpen}
                  style={{
                    animationDelay:  `${idx * 40}ms`,
                    display:         'flex',
                    flexDirection:   'column',
                    alignItems:      'center',
                    padding:         '8px 12px',
                    borderRadius:    '10px',
                    border:          isToday
                      ? `1.5px solid ${GOLD}88`
                      : '1.5px solid rgba(245,200,64,0.1)',
                    backgroundColor: isToday
                      ? 'rgba(245,200,64,0.1)'
                      : 'rgba(255,255,255,0.03)',
                    minWidth:        '50px',
                    cursor:          'pointer',
                    transition:      'background-color 0.15s, border-color 0.15s',
                    outline:         'none',
                  }}
                  onMouseEnter={e => {
                    if (!isToday) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.06)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.25)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isToday) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.1)';
                    }
                  }}
                >
                  {/* Weekday */}
                  <span style={{
                    fontFamily: ASSIST,
                    fontSize:   '10px',
                    fontWeight: 500,
                    color:      isToday ? `${GOLD}99` : `${PARCH}44`,
                    lineHeight: 1,
                    marginBottom:'4px',
                  }}>
                    {weekdayLabel(day.date, i18n.language)}
                  </span>

                  {/* Day number */}
                  <span style={{
                    fontFamily: ASSIST,
                    fontSize:   '18px',
                    fontWeight: 700,
                    color:      isToday ? GOLD : `${PARCH}CC`,
                    lineHeight: 1,
                    marginBottom:'5px',
                  }}>
                    {dayNum(day.date)}
                  </span>

                  {/* Score dot */}
                  <div
                    aria-label={`ציון ${day.plantingScore}`}
                    style={{
                      width:        '8px',
                      height:       '8px',
                      borderRadius: '50%',
                      backgroundColor: scoreColour,
                      boxShadow:    `0 0 5px ${scoreColour}88`,
                    }}
                  />

                  {/* Day type emoji */}
                  <span style={{ fontSize: '13px', lineHeight: 1, marginTop: '4px' }}>
                    {DAY_TYPE_EMOJIS[day.dayType] ?? '🌱'}
                  </span>
                </button>

                {/* Dark popover — appears above pill */}
                {isOpen && (
                  <div
                    style={{
                      position:        'absolute',
                      bottom:          'calc(100% + 8px)',
                      left:            '50%',
                      transform:       'translateX(-50%)',
                      zIndex:          30,
                      width:           '148px',
                      background:      'linear-gradient(180deg, #1a3a1c 0%, #0e2410 100%)',
                      border:          `1px solid ${GOLD}33`,
                      borderRadius:    '10px',
                      boxShadow:       '0 8px 32px rgba(0,0,0,0.6)',
                      padding:         '10px 12px',
                    }}
                  >
                    {/* Caret */}
                    <div style={{
                      position:    'absolute',
                      bottom:      '-5px',
                      left:        '50%',
                      transform:   'translateX(-50%)',
                      width:       '8px',
                      height:      '8px',
                      background:  '#0e2410',
                      border:      `1px solid ${GOLD}33`,
                      borderTop:   'none',
                      borderInlineStart: 'none',
                      rotate:      '45deg',
                    }} />

                    <p style={{
                      fontFamily: ASSIST,
                      fontSize:   '13px',
                      fontWeight: 600,
                      color:      PARCH,
                      margin:     '0 0 6px',
                    }}>
                      {DAY_TYPE_EMOJIS[day.dayType]} {day.dayTypeHe}
                    </p>
                    <p style={{
                      fontFamily: ASSIST,
                      fontSize:   '12px',
                      color:      `${PARCH}77`,
                      margin:     '0 0 4px',
                    }}>
                      ציון:{' '}
                      <span style={{ color: scoreColour, fontWeight: 700 }}>
                        {day.plantingScore}
                      </span>
                      {' '}/ 10
                    </p>
                    {day.nodeActive && (
                      <p style={{ fontFamily: ASSIST, fontSize: '12px', color: '#E06060', margin: '4px 0 0' }}>
                        ⚫ יום צומת
                      </p>
                    )}
                    {day.perigeeActive && (
                      <p style={{ fontFamily: ASSIST, fontSize: '12px', color: '#D4A040', margin: '4px 0 0' }}>
                        ⚠️ פריגיאה
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
