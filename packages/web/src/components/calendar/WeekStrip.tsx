import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import type { BiodynamicDay } from '@gina-haya/shared';
import { DayDetailModal } from './DayDetailModal';

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

const HE_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayName(dateStr: string, isHe: boolean): string {
  const idx = new Date(dateStr + 'T12:00:00').getDay();
  return isHe ? HE_DAYS[idx] : EN_DAYS[idx];
}

function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDate();
}

export function WeekStrip({ days, todayDate }: Props) {
  const { i18n } = useTranslation();
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';
  const [selectedDay, setSelectedDay] = useState<BiodynamicDay | null>(null);

  if (days.length === 0) return null;

  return (
    <>
      <style>{STRIP_CSS}</style>

      <div dir={dir} style={{
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
          {isHe ? 'השבוע' : 'This Week'}
        </p>

        {/* Scrollable pills row */}
        <div style={{
          display:         'flex',
          direction:       dir as 'rtl' | 'ltr',
          gap:             '8px',
          overflowX:       'auto',
          paddingBottom:   '4px',
          scrollbarWidth:  'none',
          msOverflowStyle: 'none',
        }}>
          {days.map((day, idx) => {
            const isToday      = day.date === todayDate;
            const isSelected   = selectedDay?.date === day.date;
            const scoreColour  = SCORE_COLOURS[day.scoreColour];

            const borderColour = isToday || isSelected
              ? `${GOLD}88`
              : 'rgba(245,200,64,0.1)';
            const bgColour = isToday
              ? 'rgba(245,200,64,0.1)'
              : isSelected
                ? 'rgba(245,200,64,0.07)'
                : 'rgba(255,255,255,0.03)';

            return (
              <button
                key={day.date}
                className="ws-pill"
                onClick={() => setSelectedDay(day)}
                style={{
                  animationDelay:  `${idx * 40}ms`,
                  display:         'flex',
                  flexDirection:   'column',
                  alignItems:      'center',
                  padding:         '8px 12px',
                  borderRadius:    '10px',
                  border:          `1.5px solid ${borderColour}`,
                  backgroundColor: bgColour,
                  minWidth:        '50px',
                  cursor:          'pointer',
                  transition:      'background-color 0.15s, border-color 0.15s, transform 0.1s',
                  outline:         'none',
                  transform:       isSelected ? 'scale(0.98)' : 'scale(1)',
                  flexShrink:      0,
                }}
                onMouseEnter={e => {
                  if (!isToday && !isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.06)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.35)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isToday && !isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.1)';
                  }
                }}
              >
                {/* Weekday */}
                <span style={{
                  fontFamily:   ASSIST,
                  fontSize:     '10px',
                  fontWeight:   500,
                  color:        isToday ? `${GOLD}99` : `${PARCH}44`,
                  lineHeight:   1,
                  marginBottom: '4px',
                }}>
                  {dayName(day.date, isHe)}
                </span>

                {/* Day number */}
                <span style={{
                  fontFamily:   ASSIST,
                  fontSize:     '18px',
                  fontWeight:   700,
                  color:        isToday ? GOLD : `${PARCH}CC`,
                  lineHeight:   1,
                  marginBottom: '5px',
                }}>
                  {dayNum(day.date)}
                </span>

                {/* Score dot */}
                <div
                  aria-label={`${isHe ? 'ציון' : 'Score'} ${day.plantingScore}`}
                  style={{
                    width:           '8px',
                    height:          '8px',
                    borderRadius:    '50%',
                    backgroundColor: scoreColour,
                    boxShadow:       `0 0 5px ${scoreColour}88`,
                  }}
                />

                {/* Day type emoji */}
                <span style={{ fontSize: '13px', lineHeight: 1, marginTop: '4px' }}>
                  {DAY_TYPE_EMOJIS[day.dayType] ?? '🌱'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hint text */}
        <p style={{
          fontFamily: ASSIST,
          fontSize:   '11px',
          color:      `${PARCH}40`,
          textAlign:  'center',
          margin:     '10px 0 0',
        }}>
          {isHe ? 'לחץ על יום לפרטים' : 'Tap a day for details'}
        </p>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
