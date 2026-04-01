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

// ─────────────────────────────────────────────
// MOON ORIENTATION — latitude-based rotation
// ─────────────────────────────────────────────
// In the northern hemisphere, the moon appears rotated relative to
// the "standard" equatorial view used in astronomy diagrams.
// For Israel (~32°N), a waxing gibbous moon near the southern sky
// shows the terminator at the bottom, not the left side.
//
// The parallactic angle q is the rotation of the moon's axis
// relative to the observer's horizon. We approximate it using
// the observer's latitude and the moon's typical position in the sky.
//
// Full formula: q = atan2(sin(H) * cos(lat),
//                         cos(dec)*sin(lat) - sin(dec)*cos(lat)*cos(H))
// where H = hour angle, dec = moon declination
//
// For a practical per-latitude approximation (moon on meridian):
//   rotation ≈ (90° - latitude) CCW for northern hemisphere
// This gives: Israel (32°N) → rotate ~58° CCW
//             Tel Aviv specific → ~58°
//
// We use the browser's Geolocation API to get actual latitude,
// falling back to Israel's default (32°N).

function getMoonRotationDeg(latitudeDeg: number, phaseAngle: number): number {
  // In northern hemisphere: moon appears rotated CCW relative to equatorial view.
  // The rotation is approximately (90 - latitude) degrees CCW.
  // In southern hemisphere: rotated ~180° from northern view.
  // At equator: no rotation needed.
  
  const isNorthern = latitudeDeg >= 0;
  
  if (isNorthern) {
    // Northern hemisphere: rotate CCW by (90 - lat)
    // At lat=0 (equator): 90° rotation
    // At lat=90 (pole): 0° rotation
    // Israel 32°N: ~58° CCW → in canvas terms, rotate by +58°
    return 90 - latitudeDeg;
  } else {
    // Southern hemisphere: moon appears flipped, add 180°
    return 90 - latitudeDeg + 180;
  }
}

// ─────────────────────────────────────────────
// NASA moon texture loader (cached)
// ─────────────────────────────────────────────
const MOON_TEXTURE_URL = '/moon.jpg';

let moonTextureCache: HTMLImageElement | null = null;
let moonTextureLoading = false;
const moonTextureCbs: Array<(img: HTMLImageElement | null) => void> = [];

function loadMoonTexture(cb: (img: HTMLImageElement | null) => void) {
  if (moonTextureCache) { cb(moonTextureCache); return; }
  moonTextureCbs.push(cb);
  if (moonTextureLoading) return;
  moonTextureLoading = true;
  const img = new Image();
  img.onload = () => {
    moonTextureCache = img;
    moonTextureCbs.forEach(fn => fn(img));
    moonTextureCbs.length = 0;
  };
  img.onerror = () => {
    moonTextureCbs.forEach(fn => fn(null));
    moonTextureCbs.length = 0;
  };
  img.src = MOON_TEXTURE_URL;
}

// ─────────────────────────────────────────────
// MOON RENDERER
// ─────────────────────────────────────────────
function renderMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  phaseAngle: number,     // 0=new moon, 180=full moon, 360=new moon
  rotationDeg: number,    // latitude-based rotation in degrees
  texture: HTMLImageElement | null
) {
  const isFullMoon = phaseAngle > 155 && phaseAngle < 205;
  const isNewMoon  = phaseAngle < 10  || phaseAngle > 350;
  const size = r * 2;

  // Fill canvas with card background so no dark corners bleed through
  ctx.clearRect(cx - r - 4, cy - r - 4, size + 8, size + 8);

  // ── Full moon outer glow ──
  if (isFullMoon) {
    for (let i = 4; i >= 1; i--) {
      const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + i * 8);
      g.addColorStop(0, `rgba(255,230,100,${0.12 / i})`);
      g.addColorStop(1, 'rgba(255,230,100,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r + i * 8, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  // ── Clip to moon circle ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // ── Draw base texture or fallback ──
  if (isNewMoon) {
    const g = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, 0, cx, cy, r);
    g.addColorStop(0, '#1a2218');
    g.addColorStop(1, '#060a05');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, size, size);
  } else if (texture) {
    // NASA LRO texture — moon disk fills the image perfectly edge to edge
    const tw = texture.naturalWidth;
    const th = texture.naturalHeight;
    // Use the full image — moon fills it completely
    ctx.drawImage(texture, 0, 0, tw, th, cx - r, cy - r, size, size);
    // Spherical shading overlay
    const shade = ctx.createRadialGradient(cx - r*0.25, cy - r*0.25, r*0.1, cx, cy, r);
    shade.addColorStop(0,   'rgba(255,245,200,0.15)');
    shade.addColorStop(0.5, 'rgba(0,0,0,0.0)');
    shade.addColorStop(1,   'rgba(0,0,0,0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx - r, cy - r, size, size);
  } else {
    // Texture failed — draw grey moon
    const g = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
    g.addColorStop(0, '#d0d0d0');
    g.addColorStop(0.6, '#888888');
    g.addColorStop(1, '#333333');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, size, size);
  }

  // ── Phase shadow with latitude rotation ──
  // We rotate the entire shadow drawing by rotationDeg so the
  // terminator appears at the correct position for the observer's latitude.
  if (!isFullMoon && !isNewMoon) {
    ctx.save();
    // Rotate around moon center by latitude compensation
    ctx.translate(cx, cy);
    ctx.rotate(rotationDeg * Math.PI / 180);
    ctx.translate(-cx, -cy);

    const normalizedAngle = phaseAngle <= 180 ? phaseAngle : 360 - phaseAngle;
    const ellipseWidth = r * Math.abs(Math.cos(Math.PI * normalizedAngle / 180));

    ctx.beginPath();
    if (phaseAngle < 180) {
      // Waxing: shadow on LEFT (before rotation)
      ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
      ctx.ellipse(cx, cy, ellipseWidth, r, 0, -Math.PI / 2, Math.PI / 2, phaseAngle < 90);
    } else {
      // Waning: shadow on RIGHT (before rotation)
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, ellipseWidth, r, 0, Math.PI / 2, -Math.PI / 2, phaseAngle > 270);
    }
    ctx.closePath();

    const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    shadowGrad.addColorStop(0, 'rgba(4,8,20,0.94)');
    shadowGrad.addColorStop(1, 'rgba(2,4,12,0.98)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();
  }

  // ── Atmospheric limb glow ──
  const limb = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 1);
  limb.addColorStop(0, 'rgba(255,255,200,0.00)');
  limb.addColorStop(0.6, 'rgba(255,255,200,0.10)');
  limb.addColorStop(1, 'rgba(255,255,200,0.00)');
  ctx.fillStyle = limb;
  ctx.fillRect(cx - r, cy - r, size, size);

  ctx.restore();

  // ── Thin edge highlight only ──
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = isFullMoon ? 'rgba(255,240,150,0.20)' : 'rgba(255,255,200,0.06)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ─────────────────────────────────────────────
// MOON PHASE DISPLAY COMPONENT
// ─────────────────────────────────────────────
function MoonPhaseDisplay({ phaseAngle, phaseHe, moonSignHe, ascending }: {
  phaseAngle: number;
  phaseHe: string;
  moonSignHe: string;
  ascending: boolean;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const textureRef = useRef<HTMLImageElement | null>(null);
  const [latitudeDeg, setLatitudeDeg] = useState<number>(31.7); // Israel default

  // Try to get real user latitude
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLatitudeDeg(pos.coords.latitude),
      ()  => setLatitudeDeg(31.7) // fallback to Israel
    );
  }, []);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const SIZE = 165;
    const cx = SIZE / 2, cy = SIZE / 2, r = 82;
    canvas.width = SIZE;
    canvas.height = SIZE;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const rotDeg = getMoonRotationDeg(latitudeDeg, phaseAngle);
    renderMoon(ctx, cx, cy, r, phaseAngle, rotDeg, textureRef.current);
  };

  // Load texture first, then draw
  useEffect(() => {
    loadMoonTexture(img => {
      textureRef.current = img;
      redraw();
    });
  }, []);

  useEffect(() => { redraw(); }, [phaseAngle, latitudeDeg]);

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
      <div style={{
        position: 'relative', width: '165px', height: '165px',
        borderRadius: '50%',
        border: '2px solid rgba(245,200,64,0.40)',
        boxShadow: '0 0 16px rgba(245,200,64,0.18)',
        overflow: 'hidden',
      }}>
        {isFullMoon && (
          <div style={{
            position: 'absolute', inset: '-20px', borderRadius: '50%',
            background: 'conic-gradient(rgba(245,200,64,0.18), rgba(245,200,64,0.04), rgba(245,200,64,0.18))',
            animation: 'moonGlowSpin 8s linear infinite',
            zIndex: 0,
          }} />
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '165px', height: '165px', position: 'relative', zIndex: 1, display: 'block' }}
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
          phaseAngle={(day.moonPhasePct ?? 0) / 100 * 360}
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
            letterSpacing: '0.1em', textTransform: 'uppercase', color: `${PARCH}44`, marginTop: '4px',
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
