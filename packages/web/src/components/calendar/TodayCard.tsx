import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';
import { SCORE_COLOURS } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

const DAY_TYPE_STYLES: Record<string, { bg: string; emoji: string }> = {
  fruit:  { bg: '#FED7AA', emoji: '🍅' },
  root:   { bg: '#FDE68A', emoji: '🥕' },
  flower: { bg: '#FBCFE8', emoji: '🌸' },
  leaf:   { bg: '#BBF7D0', emoji: '🌿' },
};

const RING_R = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function HebrewDate({ dateStr }: { dateStr: string }) {
  // Parse as local noon to avoid timezone drift
  const date = new Date(dateStr + 'T12:00:00');
  return (
    <>
      {date.toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
    </>
  );
}

export function TodayCard({ day }: Props) {
  const { t } = useTranslation('calendar');
  const scoreColour = SCORE_COLOURS[day.scoreColour];
  const dashOffset = RING_CIRCUMFERENCE * (1 - day.plantingScore / 10);
  const dtStyle = DAY_TYPE_STYLES[day.dayType] ?? { bg: '#E5E7EB', emoji: '🌱' };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
      {/* Date header */}
      <h2 className="text-center font-bold text-base mb-5" style={{ color: '#1B2A4A' }}>
        <HebrewDate dateStr={day.date} />
      </h2>

      {/* Score ring */}
      <div className="flex flex-col items-center mb-5">
        <svg width="120" height="120" viewBox="0 0 120 120" aria-label={`ציון זריעה: ${day.plantingScore}`}>
          {/* Track */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
          />
          {/* Score arc */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none"
            stroke={scoreColour}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          {/* Score number */}
          <text
            x="60" y="60"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="30"
            fontWeight="bold"
            fill={scoreColour}
            fontFamily="Heebo, sans-serif"
          >
            {day.plantingScore}
          </text>
        </svg>
        <span className="text-sm mt-1 font-medium" style={{ color: '#6B7280' }}>
          {t('plantingScore.label')}
        </span>
      </div>

      {/* Day type badge */}
      <div className="flex justify-center mb-4">
        <span
          className="px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: dtStyle.bg, color: '#1B2A4A' }}
        >
          {dtStyle.emoji} {day.dayTypeHe}
        </span>
      </div>

      {/* Moon direction row */}
      <div
        className="flex items-start gap-3 mb-3 py-3 px-4 rounded-xl"
        style={{ backgroundColor: '#F9F5F0' }}
      >
        <span className="text-xl leading-none mt-0.5">
          {day.ascendingDescending === 'ascending' ? '↑' : '↓'}
        </span>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#1B2A4A' }}>
            {day.ascendingDescendingHe}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {day.ascendingDescending === 'ascending'
              ? t('moonPhase.ascendingDesc')
              : t('moonPhase.descendingDesc')}
          </p>
        </div>
      </div>

      {/* Moon sign row */}
      <div
        className="mb-4 py-2.5 px-4 rounded-xl text-sm"
        style={{ backgroundColor: '#F9F5F0', color: '#1B2A4A' }}
      >
        🌙 {t('moonSign')}: <span className="font-medium">{day.moonSignHe}</span>
      </div>

      {/* BD prep pills */}
      {(day.prep500Recommended || day.prep501Recommended) && (
        <div className="flex flex-wrap gap-2">
          {day.prep500Recommended && (
            <span
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
            >
              {t('prep.500recommended')}
            </span>
          )}
          {day.prep501Recommended && (
            <span
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
            >
              {t('prep.501recommended')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
