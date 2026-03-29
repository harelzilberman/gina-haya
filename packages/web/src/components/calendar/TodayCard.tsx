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

function drawRealisticMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  phaseAngle: number  // 0=new moon, 180=full moon, 360=new moon
) {
  const isFullMoon = phaseAngle > 155 && phaseAngle < 205;
  const isNewMoon  = phaseAngle < 10  || phaseAngle > 350;

  // ── Full moon glow rings ──
  if (isFullMoon) {
    for (let i = 4; i >= 1; i--) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + i * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(245,220,120,${0.07 / i})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  // ── Base lit sphere ──
  const litGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
  if (isNewMoon) {
    litGrad.addColorStop(0, '#1c2a18');
    litGrad.addColorStop(1, '#080e06');
  } else if (isFullMoon) {
    litGrad.addColorStop(0, '#fff8d0');
    litGrad.addColorStop(0.4, '#f0d870');
    litGrad.addColorStop(0.75, '#c8a040');
    litGrad.addColorStop(1, '#7a5c18');
  } else {
    litGrad.addColorStop(0, '#f0e8b8');
    litGrad.addColorStop(0.45, '#d4b858');
    litGrad.addColorStop(0.8, '#9a7830');
    litGrad.addColorStop(1, '#4a3410');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = litGrad;
  ctx.fill();

  // ── Realistic maria (dark regions) ──
  if (!isNewMoon) {
    const maria = [
      { x: cx + r*0.05,  y: cy - r*0.25, rx: r*0.28, ry: r*0.18, a: -0.3 }, // Mare Imbrium
      { x: cx + r*0.30,  y: cy - r*0.05, rx: r*0.20, ry: r*0.14, a:  0.2 }, // Mare Serenitatis
      { x: cx + r*0.18,  y: cy + r*0.15, rx: r*0.22, ry: r*0.15, a: -0.1 }, // Mare Tranquillitatis
      { x: cx - r*0.12,  y: cy + 0,      rx: r*0.18, ry: r*0.12, a:  0.4 }, // Oceanus Procellarum
      { x: cx + r*0.10,  y: cy + r*0.38, rx: r*0.16, ry: r*0.10, a:  0.1 }, // Mare Nubium
      { x: cx - r*0.10,  y: cy - r*0.42, rx: r*0.12, ry: r*0.08, a: -0.2 }, // Mare Frigoris
      { x: cx + r*0.42,  y: cy + r*0.28, rx: r*0.12, ry: r*0.08, a:  0.5 }, // Mare Fecunditatis
    ];

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.clip();

    maria.forEach(m => {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.a);
      const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(m.rx, m.ry));
      mg.addColorStop(0, 'rgba(40,28,8,0.55)');
      mg.addColorStop(0.6, 'rgba(40,28,8,0.30)');
      mg.addColorStop(1, 'rgba(40,28,8,0.00)');
      ctx.beginPath();
      ctx.scale(1, m.ry / m.rx);
      ctx.arc(0, 0, m.rx, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    // ── Craters ──
    const craters = [
      { x: cx + r*0.55, y: cy - r*0.58, r: r*0.07 },
      { x: cx - r*0.30, y: cy + r*0.55, r: r*0.06 },
      { x: cx + r*0.60, y: cy + r*0.10, r: r*0.05 },
      { x: cx - r*0.50, y: cy - r*0.20, r: r*0.05 },
      { x: cx + r*0.20, y: cy - r*0.60, r: r*0.04 },
      { x: cx + r*0.70, y: cy - r*0.30, r: r*0.04 },
      { x: cx - r*0.15, y: cy + r*0.70, r: r*0.04 },
      { x: cx + r*0.45, y: cy + r*0.55, r: r*0.035 },
    ];

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.clip();
    craters.forEach(c => {
      const cg = ctx.createRadialGradient(c.x - c.r*0.3, c.y - c.r*0.3, 0, c.x, c.y, c.r);
      cg.addColorStop(0, 'rgba(255,240,180,0.15)');
      cg.addColorStop(0.5, 'rgba(30,20,5,0.45)');
      cg.addColorStop(0.85, 'rgba(30,20,5,0.25)');
      cg.addColorStop(1, 'rgba(30,20,5,0.00)');
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c.x - c.r*0.2, c.y - c.r*0.2, c.r * 0.9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,240,160,0.12)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
    ctx.restore();
  }

  // ── Phase shadow ──
  // phaseAngle: 0=new moon, 180=full moon, 360=new moon
  // Waxing (0–180): RIGHT side lit → shadow on LEFT
  // Waning (180–360): LEFT side lit → shadow on RIGHT
  if (!isFullMoon && !isNewMoon) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const normalizedAngle = phaseAngle <= 180 ? phaseAngle : 360 - phaseAngle;
    const ellipseWidth = r * Math.abs(Math.cos(Math.PI * normalizedAngle / 180));

    ctx.beginPath();
    if (phaseAngle < 180) {
      // Waxing: shadow covers LEFT half
      ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
      ctx.ellipse(cx, cy, ellipseWidth, r, 0, -Math.PI / 2, Math.PI / 2, phaseAngle < 90);
    } else {
      // Waning: shadow covers RIGHT half
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, ellipseWidth, r, 0, Math.PI / 2, -Math.PI / 2, phaseAngle > 270);
    }
    ctx.closePath();

    const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    shadowGrad.addColorStop(0, 'rgba(5,10,18,0.92)');
    shadowGrad.addColorStop(1, 'rgba(3,8,15,0.97)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();
  }

  // ── Atmospheric limb highlight ──
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,200,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

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

    const size = 140;
    const cx = size / 2, cy = size / 2, r = 62;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    drawRealisticMoon(ctx, cx, cy, r, phaseAngle);
  }, [phaseAngle]);

  const isFullMoon   = phaseAngle > 155 && phaseAngle < 205;
  const illumination = Math.round((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);
  const daysToFull   = phaseAngle <= 180
    ? Math.round((180 - phaseAngle) / 13.2)
    : Math.round((540 - phaseAngle) / 13.2);
  const daysToNew    = Math.round((360 - phaseAngle) / 13.2);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '10px', padding: '20px 0 12px',
    }}>
      <div style={{ position: 'relative', width: '140px', height: '140px' }}>
        {isFullMoon && (
          <div style={{
            position: 'absolute', inset: '-14px',
            borderRadius: '50%',
            background: 'conic-gradient(rgba(245,200,64,0.15), rgba(245,200,64,0.04), rgba(245,200,64,0.15))',
            animation: 'moonGlowSpin 8s linear infinite',
          }} />
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '140px', height: '140px', position: 'relative', zIndex: 1 }}
        />
      </div>

      <div style={{ fontFamily: FRANK, fontSize: '18px', fontWeight: 700, color: GOLD }}>
        {phaseHe}
      </div>

      <div style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}60` }}>
        מזל הירח: {moonSignHe}
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(245,200,64,0.1)',
        border: '1px solid rgba(245,200,64,0.25)',
        borderRadius: '99px', padding: '4px 14px',
        fontFamily: ASSIST, fontSize: '12px', color: GOLD,
      }}>
        {ascending ? '↑ ירח עולה' : '↓ ירח יורד'}
      </div>

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
      <div
        dir={dir}
        style={{
          background:     'linear-gradient(145deg, rgba(28,58,30,0.85) 0%, rgba(20,43,22,0.95) 100%)',
          border:         '1px solid rgba(245,200,64,0.12)',
          borderRadius:   '16px',
          padding:        '24px 20px',
          marginBottom:   '12px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p style={{
          fontFamily: ASSIST, fontSize: '13px', fontWeight: 400,
          textAlign: 'center', color: `${PARCH}88`,
          marginBottom: '20px', lineHeight: 1.4,
        }}>
          <FormattedDate dateStr={day.date} locale={isHe ? 'he-IL' : 'en-US'} />
        </p>

        <MoonPhaseDisplay
          phaseAngle={(day.moonPhasePct ?? 0) / 100 * 360}
          phaseHe={day.moonPhaseNameHe ?? day.moonPhaseHe ?? 'ירח'}
          moonSignHe={day.moonSignHe ?? ''}
          ascending={day.ascendingDescending === 'ascending'}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <svg width="140" height="140" viewBox="0 0 140 140"
            aria-label={`${t('plantingScore.label')}: ${day.plantingScore}`}>
            <circle cx="70" cy="70" r={RING_R + 8}
              fill="none" stroke={scoreColour} strokeWidth="1" opacity="0.12" />
            <circle cx="70" cy="70" r={RING_R}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle cx="70" cy="70" r={RING_R}
              fill="none" stroke={scoreColour} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset}
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
              fontSize="11" fontWeight="400" fill={`${PARCH}55`}
              fontFamily={ASSIST.replace(/"/g, '')}>
              / 10
            </text>
          </svg>
          <p style={{
            fontFamily: ASSIST, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: `${PARCH}44`, marginTop: '4px',
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
