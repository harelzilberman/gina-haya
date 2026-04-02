import { useTranslation } from 'react-i18next';
import { useToday } from '../../hooks/useCalendar';

const MOON_GOLD = '#B7924A';

const DAY_TYPE_HE: Record<string, string> = {
  fruit:  'יום פרי 🍅',
  root:   'יום שורש 🥕',
  flower: 'יום פרח 🌸',
  leaf:   'יום עלה 🌿',
};

export function MonGreeting() {
  const { t, i18n } = useTranslation('mon');
  const { day } = useToday();

  const calendarLine = day
    ? t('calendarContext', {
        dayType: i18n.language === 'he'
          ? (DAY_TYPE_HE[day.dayType] ?? day.dayTypeHe)
          : day.dayType,
      })
    : null;

  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2 max-w-[85%]">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm mb-0.5"
          style={{ backgroundColor: MOON_GOLD }}
          aria-hidden="true"
        >
          🌕
        </div>

        {/* Bubble */}
        <div
          className="rounded-2xl rounded-bl-none px-4 py-3 text-sm leading-relaxed"
          style={{
            backgroundColor: '#FFFFFF',
            border:          '1px solid rgba(74,124,89,0.3)',
            color:           '#1B2A4A',
          }}
        >
          <p>{t('greeting')}</p>
          {calendarLine && (
            <p className="mt-1 text-xs" style={{ color: '#6B7280' }}>
              {calendarLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
