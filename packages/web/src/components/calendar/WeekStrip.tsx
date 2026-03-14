import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';
import { SCORE_COLOURS } from '@gina-haya/shared';

interface Props {
  days: BiodynamicDay[];
  todayDate: string; // YYYY-MM-DD
}

const MOON_GOLD = '#B7924A';

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
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {days.map(day => {
          const isToday = day.date === todayDate;
          const isOpen  = openDate === day.date;
          const scoreColour = SCORE_COLOURS[day.scoreColour];

          return (
            <div key={day.date} className="relative flex-shrink-0">
              <button
                onClick={() => setOpenDate(isOpen ? null : day.date)}
                aria-expanded={isOpen}
                className="flex flex-col items-center px-3 py-2 rounded-xl"
                style={{
                  border:           `2px solid ${isToday ? MOON_GOLD : 'transparent'}`,
                  backgroundColor:  isToday ? '#FEF9F0' : '#F9F5F0',
                  minWidth:         '52px',
                  transition:       'background-color 0.15s',
                }}
              >
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                  {weekdayLabel(day.date, i18n.language)}
                </span>
                <span className="text-base font-bold my-0.5" style={{ color: '#1B2A4A' }}>
                  {dayNum(day.date)}
                </span>
                {/* Score dot */}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: scoreColour }}
                  aria-label={`ציון ${day.plantingScore}`}
                />
              </button>

              {/* Popover */}
              {isOpen && (
                <div
                  className="absolute z-20 top-full mt-2 rounded-xl shadow-lg p-3 text-xs"
                  style={{
                    backgroundColor: 'white',
                    border:          '1px solid #E5E7EB',
                    minWidth:        '130px',
                    right:           '50%',
                    transform:       'translateX(50%)',
                  }}
                >
                  <p className="font-bold mb-1" style={{ color: '#1B2A4A' }}>
                    {DAY_TYPE_EMOJIS[day.dayType]} {day.dayTypeHe}
                  </p>
                  <p style={{ color: '#6B7280' }}>
                    ציון:{' '}
                    <span style={{ color: scoreColour, fontWeight: 'bold' }}>
                      {day.plantingScore}
                    </span>
                    {' '}/ 10
                  </p>
                  {day.nodeActive && (
                    <p className="mt-1" style={{ color: '#EF4444' }}>⚫ יום צומת</p>
                  )}
                  {day.perigeeActive && (
                    <p className="mt-1" style={{ color: '#D97706' }}>⚠️ פריגיאה</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
