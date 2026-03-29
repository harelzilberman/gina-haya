import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
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

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';


const CARD_CSS = `
@keyframes tc-ring-in {
  from { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
}
@keyframes moonGlowSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

function MoonPhaseDisplay({ phaseAngle, phaseHe, moonSignHe, ascending }: {
  phaseAngle: number;
  phaseHe: string;
  moonSignHe: string;
  ascending: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 120;
    const cx = size / 2, cy = size / 2, r = 52;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    const isFullMoon = phaseAngle > 155 && phaseAngle < 205;
    const isNewMoon  = phaseAngle < 15  || phaseAngle > 345;

    // Outer glow rings for full moon
    if (isFullMoon) {
      for (let i = 3; i >= 1; i--) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + i * 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245,200,64,${0.06 / i})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // Moon base sphere
    const sphereGrad = ctx.createRadialGradient(cx - 15, cy - 15, 5, cx, cy, r);
    if (isNewMoon) {
      sphereGrad.addColorStop(0, '#1a2a1a');
      sphereGrad.addColorStop(1, '#0a1208');
    } else if (isFullMoon) {
      sphereGrad.addColorStop(0, '#fffde8');
      sphereGrad.addColorStop(0.6, '#f5e8a0');
      sphereGrad.addColorStop(1, '#a08040');
    } else {
      sphereGrad.addColorStop(0, '#e8dfc0');
      sphereGrad.addColorStop(0.6, '#c8b878');
      sphereGrad.addColorStop(1, '#6b5a30');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    // Craters
    if (!isNewMoon) {
      const craters = [
        { x: 45, y: 38, r: 5 }, { x: 70, y: 50, r: 7 },
        { x: 52, y: 68, r: 4 }, { x: 38, y: 58, r: 3 },
        { x: 65, y: 35, r: 3.5 }, { x: 75, y: 68, r: 5 },
        { x: 42, y: 75, r: 4 },
      ];
      craters.forEach(c => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,65,30,0.18)';
        ctx.fill();
        ctx.restore();
      });
    }

// Phase shadow
if (!isFullMoon && !isNewMoon) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const normalizedAngle = phaseAngle <= 180 ? phaseAngle : 360 - phaseAngle;
  const shadowX = r * Math.cos((normalizedAngle / 180) * Math.PI);

  ctx.beginPath();
  if (phaseAngle < 90) {
    // Waxing crescent: right side lit, left side dark
    ctx.ellipse(cx, cy, Math.abs(shadowX), r, 0, -Math.PI / 2, Math.PI / 2, false);
    ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
  } else if (phaseAngle < 180) {
    // Waxing gibbous: mostly lit, small shadow on left
    ctx.ellipse(cx, cy, Math.abs(shadowX), r, 0, Math.PI / 2, -Math.PI / 2, false);
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
  } else if (phaseAngle < 270) {
    // Waning gibbous: mostly lit, small shadow on right
    ctx.ellipse(cx, cy, Math.abs(shadowX), r, 0, -Math.PI / 2, Math.PI / 2, true);
    ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, true);
  } else {
    // Waning crescent: left side lit, right side dark
    ctx.ellipse(cx, cy, Math.abs(shadowX), r, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
  }
  ctx.closePath();
  const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  shadowGrad.addColorStop(0, 'rgba(8,18,10,0.88)');
  shadowGrad.addColorStop(1, 'rgba(8,18,10,0.95)');
  ctx.fillStyle = shadowGrad;
  ctx.fill();
  ctx.restore();
}

    // Atmospheric edge ring
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,220,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [phaseAngle]);

  const isFullMoon   = phaseAngle > 155 && phaseAngle < 205;
  const illumination = Math.round((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);
  const daysToFull = phaseAngle <= 180
    ? Math.round((180 - phaseAngle) / 13.2)
    : Math.round((540 - phaseAngle) / 13.2);
  const daysToNew = phaseAngle <= 360
    ? Math.round((360 - phaseAngle) / 13.2)
    : Math.round((720 - phaseAngle) / 13.2);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '10px', padding: '20px 0 12px',
    }}>
      {/* Moon canvas with optional rotating glow */}
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        {isFullMoon && (
          <div style={{
            position: 'absolute', inset: '-12px',
            borderRadius: '50%',
            background: 'conic-gradient(rgba(245,200,64,0.15), rgba(245,200,64,0.05), rgba(245,200,64,0.15))',
            animation: 'moonGlowSpin 8s linear infinite',
          }} />
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '120px', height: '120px', position: 'relative', zIndex: 1 }}
        />
      </div>

      {/* Phase name */}
      <div style={{ fontFamily: FRANK, fontSize: '18px', fontWeight: 700, color: GOLD }}>
        {phaseHe}
      </div>

      {/* Moon sign */}
      <div style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}60` }}>
        מזל הירח: {moonSignHe}
      </div>

      {/* Direction badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(245,200,64,0.1)',
        border: '1px solid rgba(245,200,64,0.25)',
        borderRadius: '99px', padding: '4px 14px',
        fontFamily: ASSIST, fontSize: '12px', color: GOLD,
      }}>
        {ascending ? '↑ ירח עולה' : '↓ ירח יורד'}
      </div>

      {/* Phase progress bar */}
      <div style={{ width: '100%', maxWidth: '200px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '10px', color: `${PARCH}35`,
          fontFamily: ASSIST, marginBottom: '4px',
        }}>
          <span>🌑</span><span>🌓</span><span>🌕</span><span>🌗</span>
        </div>
        <div style={{
          height: '3px', background: 'rgba(255,255,255,0.08)',
          borderRadius: '99px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            background: 'linear-gradient(90deg, #2d4a2f, #F5C840)',
            width: `${phaseAngle / 360 * 100}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Days to next phases */}
      <div style={{
        display: 'flex', gap: '16px',
        fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}50`,
      }}>
        <span>ירח מלא: {daysToFull === 0 ? 'היום!' : `${daysToFull} ימים`}</span>
        <span>·</span>
        <span>ירח חדש: {daysToNew === 0 ? 'היום!' : `${daysToNew} ימים`}</span>
      </div>

      {/* Illumination */}
      <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}40` }}>
        תאורה: {illumination}%
      </div>
    </div>
  );
}

function FormattedDate({ dateStr, locale }: { dateStr: string; locale: string }) {
  const date = new Date(dateStr + 'T12:00:00');
  return (
    <>
      {date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
    </>
  );
}

export function TodayCard({ day }: Props) {
  const { t, i18n } = useTranslation('calendar');
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const scoreColour = SCORE_COLOURS[day.scoreColour];
  const targetOffset = RING_CIRCUMFERENCE * (1 - day.plantingScore / 10);
  const dashOffset   = mounted ? targetOffset : RING_CIRCUMFERENCE;
  const dtStyle      = DAY_TYPE_STYLES[day.dayType] ?? { bg: 'rgba(100,100,100,0.18)', color: PARCH, emoji: '🌱' };

  const DAY_TYPE_EN: Record<string, string> = {
    fruit: 'Fruit', root: 'Root', flower: 'Flower', leaf: 'Leaf',
  };
  const dayTypeLabel = isHe ? day.dayTypeHe : (DAY_TYPE_EN[day.dayType] ?? day.dayType);

  return (
    <>
      <style>{CARD_CSS}</style>

      <div
        dir={dir}
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
          <FormattedDate dateStr={day.date} locale={isHe ? 'he-IL' : 'en-US'} />
        </p>

        {/* Moon phase widget */}
        <MoonPhaseDisplay
          phaseAngle={(day.moonPhasePct ?? 0) / 100 * 360}
          phaseHe={day.moonPhaseNameHe ?? day.moonPhaseHe ?? 'ירח'}
          moonSignHe={day.moonSignHe ?? ''}
          ascending={day.ascendingDescending === 'ascending'}
        />

        {/* Score ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <svg
            width="140" height="140"
            viewBox="0 0 140 140"
            aria-label={`${t('plantingScore.label')}: ${day.plantingScore}`}
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
            {dtStyle.emoji} {dayTypeLabel}
          </span>
        </div>

        {/* BD prep pills */}
        {(day.prep500Recommended || day.prep501Recommended) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start', gap: '8px' }}>
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

      </div>
    </>
  );
}
