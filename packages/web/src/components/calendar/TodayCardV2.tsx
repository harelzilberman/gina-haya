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

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string; emoji: string }> = {
  fruit:  { bg: 'rgba(192,98,42,0.18)',  color: '#E8956A', emoji: '🍅' },
  root:   { bg: 'rgba(180,140,40,0.18)', color: '#D4B04A', emoji: '🥕' },
  flower: { bg: 'rgba(160,80,160,0.18)', color: '#C884C8', emoji: '🌸' },
  leaf:   { bg: 'rgba(74,128,80,0.22)',  color: '#7DC084', emoji: '🌿' },
};

const RING_R             = 60;
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

const moonImg = new Image();
moonImg.src = '/moon.jpg';

// ─────────────────────────────────────────────
// MOON PHASE HELPERS
// ─────────────────────────────────────────────
function getMoonTilt(phaseAngle: number, lat: number): number {
  const latFactor = (lat / 90);
  const baseTilt = -90 * latFactor;
  const isWaxing = phaseAngle <= 180;
  const phaseTilt = isWaxing ? -10 : 10;
  return baseTilt + phaseTilt;
}

function drawMoon(canvas: HTMLCanvasElement, phasePct: number, phaseAngle: number, tiltDeg: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  ctx.clearRect(0, 0, size, size);

  const isWaning = phaseAngle > 180;
  const tRx = r * Math.abs(Math.cos(phaseAngle * Math.PI / 180));

  const render = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tiltDeg * Math.PI / 180);
    ctx.translate(-cx, -cy);

    // Clip to circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Dark base
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, size, size);

    if (phasePct < 2) {
      ctx.restore();
      return;
    }

    // Draw full moon texture
    ctx.drawImage(moonImg, 0, 0, size, size);

    if (phasePct < 98) {
      // Step 1: paint dark half on correct side
      ctx.beginPath();
      if (isWaning) {
        ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(cx, cy - r);
      } else {
        ctx.arc(cx, cy, r, Math.PI / 2, 3 * Math.PI / 2);
        ctx.lineTo(cx, cy - r);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(4, 8, 20, 0.95)';
      ctx.fill();

      // Step 2: restore lit area using terminator ellipse
      ctx.save();
      ctx.beginPath();
      if (isWaning) {
        ctx.ellipse(cx, cy, tRx, r, 0, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(cx, cy - r);
      } else {
        ctx.ellipse(cx, cy, tRx, r, 0, Math.PI / 2, 3 * Math.PI / 2);
        ctx.lineTo(cx, cy - r);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(moonImg, 0, 0, size, size);
      ctx.restore();
    }

    // Spherical shading
    const grad = ctx.createRadialGradient(cx * 0.65, cy * 0.65, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,245,200,0.08)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.restore();
  };

  if (moonImg.complete) {
    render();
  } else {
    moonImg.onload = render;
  }
}

// ─────────────────────────────────────────────
// MOON PHASE DISPLAY COMPONENT
// ─────────────────────────────────────────────
function MoonPhaseDisplay({ phaseAngle, phasePct, phaseHe, moonSignHe, ascending, lat = 31.5 }: {
  phaseAngle: number;
  phasePct: number;
  phaseHe: string;
  moonSignHe: string;
  ascending: boolean;
  lat?: number;
}) {
  const illumination = phasePct;
  const isFullMoon = phasePct > 95;

  const daysToFull = phaseAngle <= 180
    ? Math.round((180 - phaseAngle) / 13.2)
    : Math.round((540 - phaseAngle) / 13.2);
  const daysToNew = Math.round((360 - phaseAngle) / 13.2);

  const tiltDeg = getMoonTilt(phaseAngle, lat);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawMoon(canvasRef.current, phasePct, phaseAngle, tiltDeg);
  }, [phasePct, phaseAngle, tiltDeg]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '10px', padding: '20px 0 12px',
    }}>
      <canvas
        ref={canvasRef}
        width={165}
        height={165}
        style={{
          borderRadius: '50%',
          border: '2px solid rgba(245,200,64,0.40)',
          boxShadow: isFullMoon
            ? '0 0 32px rgba(245,200,64,0.35)'
            : '0 0 16px rgba(245,200,64,0.18)',
          display: 'block',
        }}
      />

      <div style={{ fontFamily: FRANK, fontSize: '18px', fontWeight: 700, color: GOLD }}>
        {phaseHe}
      </div>

      <div style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}60` }}>
        מזל הירח: {moonSignHe}
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(245,200,64,0.1)', border: '1px solid rgba(245,200,64,0.25)',
        borderRadius: '99px', padding: '4px 14px',
        fontFamily: ASSIST, fontSize: '12px', color: GOLD,
      }}>
        {ascending ? '↑ ירח עולה' : '↓ ירח יורד'}
      </div>

      <div style={{ width: '100%', maxWidth: '200px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '10px', color: `${PARCH}35`, fontFamily: ASSIST, marginBottom: '4px',
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

      <div style={{
        display: 'flex', gap: '16px',
        fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}50`,
      }}>
        <span>ירח מלא: {daysToFull === 0 ? 'היום!' : `${daysToFull} ימים`}</span>
        <span>·</span>
        <span>ירח חדש: {daysToNew === 0 ? 'היום!' : `${daysToNew} ימים`}</span>
      </div>

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
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
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

  const scoreColour  = SCORE_COLOURS[day.scoreColour];
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
      <div dir={dir} style={{
        background:     'linear-gradient(145deg, rgba(28,58,30,0.85) 0%, rgba(20,43,22,0.95) 100%)',
        border:         '1px solid rgba(245,200,64,0.12)',
        borderRadius:   '16px', padding: '24px 20px',
        marginBottom:   '12px', backdropFilter: 'blur(8px)',
      }}>
        <p style={{
          fontFamily: ASSIST, fontSize: '13px', fontWeight: 400,
          textAlign: 'center', color: `${PARCH}88`, marginBottom: '20px', lineHeight: 1.4,
        }}>
          <FormattedDate dateStr={day.date} locale={isHe ? 'he-IL' : 'en-US'} />
        </p>

        <MoonPhaseDisplay
          phasePct={day.moonPhasePct ?? 0}
          phaseAngle={day.moonPhaseAngle ?? (day.moonPhasePct ?? 0) / 100 * 360}
          phaseHe={day.moonPhaseNameHe ?? day.moonPhaseHe ?? 'ירח'}
          moonSignHe={day.moonSignHe ?? ''}
          ascending={day.ascendingDescending === 'ascending'}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <svg width="140" height="140" viewBox="0 0 140 140"
            aria-label={`${t('plantingScore.label')}: ${day.plantingScore}`}>
            <circle cx="70" cy="70" r={RING_R + 8} fill="none" stroke={scoreColour} strokeWidth="1" opacity="0.12" />
            <circle cx="70" cy="70" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle cx="70" cy="70" r={RING_R} fill="none" stroke={scoreColour} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${scoreColour}88)` }}
            />
            <text x="70" y="66" textAnchor="middle" dominantBaseline="central"
              fontSize="42" fontWeight="700" fill={scoreColour}
              fontFamily={FRANK.replace(/"/g, '')}
              style={{ filter: `drop-shadow(0 0 8px ${scoreColour}66)` }}>
              {day.plantingScore}
            </text>
            <text x="70" y="93" textAnchor="middle" dominantBaseline="central"
              fontSize="11" fontWeight="400" fill={`${PARCH}55`} fontFamily={ASSIST.replace(/"/g, '')}>
              / 10
            </text>
          </svg>
          <p style={{
            fontFamily: ASSIST, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: `${PARCH}44`, marginTop: '4px',
          }}>
            {t('plantingScore.label')}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <span style={{
            fontFamily: ASSIST, fontSize: '14px', fontWeight: 600,
            padding: '6px 20px', borderRadius: '50px',
            backgroundColor: dtStyle.bg, color: dtStyle.color,
            border: `1px solid ${dtStyle.color}44`, letterSpacing: '0.03em',
          }}>
            {dtStyle.emoji} {dayTypeLabel}
          </span>
        </div>

        {(day.prep500Recommended || day.prep501Recommended) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start', gap: '8px' }}>
            {day.prep500Recommended && (
              <span style={{
                fontFamily: ASSIST, fontSize: '12px', fontWeight: 500,
                padding: '5px 14px', borderRadius: '50px',
                border: `1px solid ${GOLD}55`, color: GOLD,
                backgroundColor: 'rgba(245,200,64,0.06)', letterSpacing: '0.02em',
              }}>
                {t('prep.500recommended')}
              </span>
            )}
            {day.prep501Recommended && (
              <span style={{
                fontFamily: ASSIST, fontSize: '12px', fontWeight: 500,
                padding: '5px 14px', borderRadius: '50px',
                border: `1px solid ${GOLD}55`, color: GOLD,
                backgroundColor: 'rgba(245,200,64,0.06)', letterSpacing: '0.02em',
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
