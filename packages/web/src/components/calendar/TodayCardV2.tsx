import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useAuthStore } from '../../stores/authStore';
import type { BiodynamicDay } from '@gina-haya/shared';
import './today-card.css';

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


// ─────────────────────────────────────────────
// MOON PHASE HELPERS
// ─────────────────────────────────────────────
export function getMoonTilt(phaseAngle: number, lat: number): number {
  const latFactor = (lat / 90);
  const baseTilt = -90 * latFactor;
  const isWaxing = phaseAngle <= 180;
  const phaseTilt = isWaxing ? -10 : 10;
  return baseTilt + phaseTilt;
}

// Canvas draws only the dark shadow overlay — the moon photo is an <img> underneath.
export function drawMoon(canvas: HTMLCanvasElement, phasePct: number, phaseAngle: number, tiltDeg: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width / (window.devicePixelRatio || 1);
  const cx = size / 2, cy = size / 2, r = size / 2;

  // Full moon or nearly full — canvas stays fully transparent, let img show through
  const isFullMoon = (phaseAngle >= 160 && phaseAngle <= 200) || (phasePct >= 95);
  if (isFullMoon) {
    ctx.clearRect(0, 0, size, size);
    return;
  }

  // New moon — fill entire disc dark
  const isNewMoon = phasePct <= 2;
  if (isNewMoon) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, size, size);

  ctx.translate(cx, cy);
  ctx.rotate(tiltDeg * Math.PI / 180);
  ctx.translate(-cx, -cy);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const SHADOW = 'rgba(0, 0, 0, 0.92)';
  const f      = phasePct / 100;
  const isWaning = phaseAngle > 180;
  const tRx    = r * Math.abs(1 - 2 * f);

  if (!isWaning) {
    if (f < 0.5) {
      // Waxing crescent: shadow fills left half + D-shape in right half
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, cx, size); ctx.clip();
      ctx.fillStyle = SHADOW; ctx.fillRect(0, 0, size, size);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.ellipse(cx, cy, tRx, r, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = SHADOW; ctx.fill();
    } else {
      // Waxing gibbous: shadow is left crescent between disc edge and terminator
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, true);
      ctx.ellipse(cx, cy, tRx, r, 0, -Math.PI / 2, Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = SHADOW; ctx.fill();
    }
  } else {
    if (f < 0.5) {
      // Waning crescent: shadow fills right half + D-shape in left half
      ctx.save();
      ctx.beginPath(); ctx.rect(cx, 0, size, size); ctx.clip();
      ctx.fillStyle = SHADOW; ctx.fillRect(0, 0, size, size);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.ellipse(cx, cy, tRx, r, 0, Math.PI / 2, -Math.PI / 2, false);
      ctx.closePath();
      ctx.fillStyle = SHADOW; ctx.fill();
    } else {
      // Waning gibbous: shadow is right crescent between disc edge and terminator
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, tRx, r, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = SHADOW; ctx.fill();
    }
  }

  // Spherical shading overlay — crescent/gibbous phases only
  const grad = ctx.createRadialGradient(cx * 0.65, cy * 0.65, 0, cx, cy, r);
  grad.addColorStop(0,   'rgba(255,245,200,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1,   'rgba(0,0,0,0.5)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

// ─────────────────────────────────────────────
// MOON PHASE DISPLAY COMPONENT
// ─────────────────────────────────────────────
export function MoonPhaseDisplay({ phaseAngle, phasePct, phaseHe, moonSignHe, ascending, lat = 31.5 }: {
  phaseAngle: number;
  phasePct: number;
  phaseHe: string;
  moonSignHe: string;
  ascending: boolean;
  lat?: number;
}) {
  const { i18n } = useTranslation('calendar');
  const isHe = i18n.language === 'he';
  const illumination = phasePct;

  const MOON_SIGN_EN: Record<string, string> = {
    'טלה': 'Aries', 'שור': 'Taurus', 'תאומים': 'Gemini',
    'סרטן': 'Cancer', 'אריה': 'Leo', 'בתולה': 'Virgo',
    'מאזניים': 'Libra', 'עקרב': 'Scorpio', 'קשת': 'Sagittarius',
    'גדי': 'Capricorn', 'דלי': 'Aquarius', 'דגים': 'Pisces',
  };
  const PHASE_NAME_EN: Record<string, string> = {
    'ירח חדש':    'New Moon',
    'סהר גדל':    'Waxing Crescent',
    'רבע ראשון':  'First Quarter',
    'גיבנת גדלה': 'Waxing Gibbous',
    'ירח מלא':    'Full Moon',
    'גיבנת קטנה': 'Waning Gibbous',
    'רבע אחרון':  'Last Quarter',
    'סהר קטן':    'Waning Crescent',
  };
  const moonSignLabel = isHe ? moonSignHe : (MOON_SIGN_EN[moonSignHe] ?? moonSignHe);
  const phaseNameLabel = isHe ? phaseHe : (PHASE_NAME_EN[phaseHe] ?? phaseHe);
  const isFullMoon = phasePct > 95;

  const daysToFull = phaseAngle <= 180
    ? Math.round((180 - phaseAngle) / 13.2)
    : Math.round((540 - phaseAngle) / 13.2);
  const daysToNew = Math.round((360 - phaseAngle) / 13.2);

  const tiltDeg = getMoonTilt(phaseAngle, lat);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 165 * dpr;
    canvas.height = 165 * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    drawMoon(canvas, phasePct, phaseAngle, tiltDeg);
  }, [phasePct, phaseAngle, tiltDeg, lat]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '10px', padding: '20px 0 12px',
    }}>
      <div style={{
        borderRadius: '50%',
        overflow: 'hidden',
        width: '165px',
        height: '165px',
        flexShrink: 0,
        position: 'relative',
        boxShadow: isFullMoon
          ? '0 0 0 2px rgba(245,200,64,0.40), 0 0 32px rgba(245,200,64,0.35)'
          : '0 0 0 2px rgba(245,200,64,0.40), 0 0 16px rgba(245,200,64,0.18)',
      }}>
        <img
          src="/moon.jpg"
          alt="moon"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            zIndex: 1,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            zIndex: 2,
          }}
        />
      </div>

      <div style={{ fontFamily: FRANK, fontSize: '18px', fontWeight: 700, color: GOLD }}>
        {phaseNameLabel}
      </div>

      <div style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}60` }}>
        {isHe ? 'מזל הירח:' : 'Moon sign:'} {moonSignLabel}
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(245,200,64,0.1)', border: '1px solid rgba(245,200,64,0.25)',
        borderRadius: '99px', padding: '4px 14px',
        fontFamily: ASSIST, fontSize: '12px', color: GOLD,
      }}>
        {ascending ? (isHe ? '↑ ירח עולה' : '↑ Ascending') : (isHe ? '↓ ירח יורד' : '↓ Descending')}
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
        <span>{isHe ? 'ירח מלא:' : 'Full moon:'} {daysToFull === 0 ? (isHe ? 'היום!' : 'Today!') : (isHe ? `${daysToFull} ימים` : `${daysToFull} days`)}</span>
        <span>·</span>
        <span>{isHe ? 'ירח חדש:' : 'New moon:'} {daysToNew === 0 ? (isHe ? 'היום!' : 'Today!') : (isHe ? `${daysToNew} ימים` : `${daysToNew} days`)}</span>
      </div>

      <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}40` }}>
        {isHe ? 'תאורה:' : 'Illumination:'} {illumination}%
      </div>
    </div>
  );
}

const DAY_TYPE_LEGEND = [
  { emoji: '🌿', name: 'יום עלים',   desc: 'השקיה, דישון עלים, קטיף עלים' },
  { emoji: '🍎', name: 'יום פירות', desc: 'קטיף פירות, זריעת פירות וזרעים' },
  { emoji: '🌸', name: 'יום פרחים', desc: 'קטיף פרחים, ייבוש צמחים' },
  { emoji: '🥕', name: 'יום שורשים', desc: 'עיבוד קרקע, שתילת שורשים, קטיף שורשים' },
];

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
  const [localLat, setLocalLat] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showDayTypeLegend, setShowDayTypeLegend] = useState(false);
  const { profile, user } = useAuthStore();
  const userLat: number = profile?.latitude ?? (user?.user_metadata?.latitude as number | undefined) ?? 31.7;
  const displayLat = localLat ?? userLat;
  const isDefaultLat = !localLat && userLat === 31.7;

  const handleRequestLocation = () => {
    if (!navigator.geolocation) { setLocationError('הדפדפן אינו תומך במיקום'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setLocalLat(pos.coords.latitude); setLocationError(null); },
      () => setLocationError('לא ניתן לקבל מיקום'),
    );
  };

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
          phaseAngle={day.moonPhaseAngle !== undefined
            ? day.moonPhaseAngle
            : Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (day.moonPhasePct ?? 0) / 100))) * (180 / Math.PI)}
          phaseHe={day.moonPhaseNameHe ?? day.moonPhaseHe ?? 'ירח'}
          moonSignHe={day.moonSignHe ?? ''}
          ascending={day.ascendingDescending === 'ascending'}
          lat={displayLat}
        />

        {isDefaultLat && (
          <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '8px' }}>
            <button
              onClick={handleRequestLocation}
              style={{
                background: 'none', border: `1px solid rgba(245,200,64,0.25)`,
                borderRadius: '99px', padding: '4px 14px',
                fontFamily: ASSIST, fontSize: '12px', color: `${GOLD}aa`, cursor: 'pointer',
              }}
            >
              📍 עדכן מיקום לתצוגה מדויקת
            </button>
            {locationError && (
              <div style={{ fontFamily: ASSIST, fontSize: '11px', color: '#E24B4A', marginTop: '4px' }}>
                {locationError}
              </div>
            )}
          </div>
        )}

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

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: showDayTypeLegend ? '8px' : '16px' }}>
          <span style={{
            fontFamily: ASSIST, fontSize: '14px', fontWeight: 600,
            padding: '6px 20px', borderRadius: '50px',
            backgroundColor: dtStyle.bg, color: dtStyle.color,
            border: `1px solid ${dtStyle.color}44`, letterSpacing: '0.03em',
          }}>
            {dtStyle.emoji} {dayTypeLabel}
          </span>
          <button
            onClick={() => setShowDayTypeLegend(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '16px', opacity: 0.5, lineHeight: 1 }}
            title="מה זה?"
          >
            ℹ️
          </button>
        </div>

        {showDayTypeLegend && (
          <div style={{
            marginBottom: '16px', padding: '12px 16px',
            background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
            border: '1px solid rgba(245,200,64,0.12)',
          }}>
            {DAY_TYPE_LEGEND.map(({ emoji, name, desc }) => (
              <div key={name} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontFamily: ASSIST, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>{emoji}</span>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: PARCH }}>{name}</span>
                  <span style={{ fontSize: '11px', color: `${PARCH}60` }}> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}

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
  );
}
