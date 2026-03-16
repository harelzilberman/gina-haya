import { useState, useEffect } from 'react';
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
  day: BiodynamicDay;
}

// Dark-themed day type styles
const DAY_TYPE_STYLES: Record<string, { bg: string; color: string; emoji: string }> = {
  fruit:  { bg: 'rgba(192,98,42,0.18)',  color: '#E8956A', emoji: '🍅' },
  root:   { bg: 'rgba(180,140,40,0.18)', color: '#D4B04A', emoji: '🥕' },
  flower: { bg: 'rgba(160,80,160,0.18)', color: '#C884C8', emoji: '🌸' },
  leaf:   { bg: 'rgba(74,128,80,0.22)',  color: '#7DC084', emoji: '🌿' },
};

const RING_R            = 60;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

const GOLD     = '#F5C840';
const PARCH    = '#EDE0C4';
const FOREST_MID = '#1C3A1E';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST   = '"Assistant", "Heebo", sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const CARD_CSS = `
@keyframes tc-ring-in {
  from { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
}
`;

function HebrewDate({ dateStr }: { dateStr: string }) {
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const scoreColour = SCORE_COLOURS[day.scoreColour];
  const targetOffset = RING_CIRCUMFERENCE * (1 - day.plantingScore / 10);
  const dashOffset   = mounted ? targetOffset : RING_CIRCUMFERENCE;
  const dtStyle      = DAY_TYPE_STYLES[day.dayType] ?? { bg: 'rgba(100,100,100,0.18)', color: PARCH, emoji: '🌱' };
  const arrowSymbol  = day.ascendingDescending === 'ascending' ? '↑' : '↓';

  return (
    <>
      <style>{CARD_CSS}</style>

      <div
        style={{
          background:    'linear-gradient(145deg, rgba(28,58,30,0.85) 0%, rgba(20,43,22,0.95) 100%)',
          border:        '1px solid rgba(245,200,64,0.12)',
          borderRadius:  '16px',
          padding:       '24px 20px',
          marginBottom:  '12px',
          backdropFilter:'blur(8px)',
        }}
      >
        {/* Date header */}
        <p style={{
          fontFamily:    ASSIST,
          fontSize:      '13px',
          fontWeight:    400,
          textAlign:     'center',
          color:         `${PARCH}88`,
          marginBottom:  '20px',
          lineHeight:    1.4,
        }}>
          <HebrewDate dateStr={day.date} />
        </p>

        {/* Score ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <svg
            width="140" height="140"
            viewBox="0 0 140 140"
            aria-label={`ציון זריעה: ${day.plantingScore}`}
          >
            {/* Outer glow ring */}
            <circle cx="70" cy="70" r={RING_R + 8}
              fill="none"
              stroke={scoreColour}
              strokeWidth="1"
              opacity="0.12"
            />
            {/* Track */}
            <circle cx="70" cy="70" r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
            />
            {/* Score arc */}
            <circle
              cx="70" cy="70" r={RING_R}
              fill="none"
              stroke={scoreColour}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${scoreColour}88)` }}
            />
            {/* Score number */}
            <text
              x="70" y="66"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="42"
              fontWeight="700"
              fill={scoreColour}
              fontFamily={FRANK.replace(/"/g, '')}
              style={{ filter: `drop-shadow(0 0 8px ${scoreColour}66)` }}
            >
              {day.plantingScore}
            </text>
            {/* /10 label */}
            <text
              x="70" y="93"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="400"
              fill={`${PARCH}55`}
              fontFamily={ASSIST.replace(/"/g, '')}
            >
              / 10
            </text>
          </svg>

          <p style={{
            fontFamily:   ASSIST,
            fontSize:     '11px',
            fontWeight:   600,
            letterSpacing:'0.1em',
            textTransform:'uppercase',
            color:        `${PARCH}44`,
            marginTop:    '4px',
          }}>
            {t('plantingScore.label')}
          </p>
        </div>

        {/* Day type badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <span style={{
            fontFamily:    ASSIST,
            fontSize:      '14px',
            fontWeight:    600,
            padding:       '6px 20px',
            borderRadius:  '50px',
            backgroundColor: dtStyle.bg,
            color:         dtStyle.color,
            border:        `1px solid ${dtStyle.color}44`,
            letterSpacing: '0.03em',
          }}>
            {dtStyle.emoji} {day.dayTypeHe}
          </span>
        </div>

        {/* Moon direction row */}
        <div style={{
          display:         'flex',
          alignItems:      'flex-start',
          gap:             '12px',
          padding:         '12px 14px',
          borderRadius:    '10px',
          backgroundColor: 'rgba(245,200,64,0.05)',
          border:          '1px solid rgba(245,200,64,0.1)',
          marginBottom:    '10px',
        }}>
          {/* Arrow circle */}
          <div style={{
            flexShrink:      0,
            width:           '32px',
            height:          '32px',
            borderRadius:    '50%',
            border:          `1.5px solid ${GOLD}66`,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            color:           GOLD,
            fontSize:        '16px',
            marginTop:       '1px',
          }}>
            {arrowSymbol}
          </div>
          <div>
            <p style={{ fontFamily: ASSIST, fontSize: '13px', fontWeight: 600, color: PARCH, margin: 0 }}>
              {day.ascendingDescendingHe}
            </p>
            <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}60`, margin: '3px 0 0', lineHeight: 1.4 }}>
              {day.ascendingDescending === 'ascending'
                ? t('moonPhase.ascendingDesc')
                : t('moonPhase.descendingDesc')}
            </p>
          </div>
        </div>

        {/* Moon sign row */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          gap:             '8px',
          padding:         '10px 14px',
          borderRadius:    '10px',
          backgroundColor: 'rgba(245,200,64,0.04)',
          border:          '1px solid rgba(245,200,64,0.08)',
          marginBottom:    '14px',
          fontFamily:      ASSIST,
          fontSize:        '13px',
          color:           `${PARCH}88`,
        }}>
          <span style={{ fontSize: '15px' }}>🌙</span>
          <span>{t('moonSign')}:</span>
          <span style={{ fontWeight: 600, color: PARCH }}>{day.moonSignHe}</span>
        </div>

        {/* BD prep pills */}
        {(day.prep500Recommended || day.prep501Recommended) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {day.prep500Recommended && (
              <span style={{
                fontFamily:    ASSIST,
                fontSize:      '12px',
                fontWeight:    500,
                padding:       '5px 14px',
                borderRadius:  '50px',
                border:        `1px solid ${GOLD}55`,
                color:         GOLD,
                backgroundColor: 'rgba(245,200,64,0.06)',
                letterSpacing: '0.02em',
              }}>
                {t('prep.500recommended')}
              </span>
            )}
            {day.prep501Recommended && (
              <span style={{
                fontFamily:    ASSIST,
                fontSize:      '12px',
                fontWeight:    500,
                padding:       '5px 14px',
                borderRadius:  '50px',
                border:        `1px solid ${GOLD}55`,
                color:         GOLD,
                backgroundColor: 'rgba(245,200,64,0.06)',
                letterSpacing: '0.02em',
              }}>
                {t('prep.501recommended')}
              </span>
            )}
          </div>
        )}

        {/* Moosh quote */}
        {day.mooshDailySummary && (
          <div style={{
            marginTop:         '16px',
            paddingTop:        '14px',
            borderTop:         '1px solid rgba(245,200,64,0.08)',
            fontFamily:        PLAYFAIR,
            fontStyle:         'italic',
            fontSize:          '13px',
            lineHeight:        1.65,
            color:             `${PARCH}77`,
          }}>
            "{day.mooshDailySummary}"
          </div>
        )}
      </div>
    </>
  );
}
