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


let moonImgFailed = false;
let lastRender: (() => void) | null = null;

const moonImg = new Image();
moonImg.src = '/moon.jpg';
moonImg.onerror = () => {
  moonImgFailed = true;
  lastRender?.();
};

// ─────────────────────────────────────────────
// MOON PHASE HELPERS
// ─────────────────────────────────────────────
function drawMoonSurface(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2, cy = size / 2, r = size / 2;
  if (moonImgFailed) {
    const grad = ctx.createRadialGradient(size * 0.35, size * 0.35, 0, cx, cy, r);
    grad.addColorStop(0,   '#F5E6C8');
    grad.addColorStop(0.6, '#C4A87A');
    grad.addColorStop(1,   '#1B2A1C');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    ctx.drawImage(moonImg, 0, 0, size, size);
  }
}

export function getMoonTilt(phaseAngle: number, lat: number): number {
  const latFactor = (lat / 90);
  const baseTilt = -90 * latFactor;
  const isWaxing = phaseAngle <= 180;
  const phaseTilt = isWaxing ? -10 : 10;
  return baseTilt + phaseTilt;
}

export function drawMoon(canvas: HTMLCanvasElement, phasePct: number, phaseAngle: number, tiltDeg: number, lat = 31.7) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.offsetWidth || 165;
  const cx = size / 2, cy = size / 2, r = size / 2;

  const render = () => {
    ctx.save();
    ctx.clearRect(0, 0, size, size);

    ctx.translate(cx, cy);
    ctx.rotate(tiltDeg * Math.PI / 180);
    ctx.translate(-cx, -cy);

    // Clip entire rendering to the moon disc
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Draw full moon texture first so ~28% shows through the dark side (earthshine / ashen light)
    drawMoonSurface(ctx, size);
    ctx.fillStyle = 'rgba(4, 8, 20, 0.72)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    if (phasePct < 2) { ctx.restore(); return; }

    const f        = phasePct / 100;
    const isWaning = phaseAngle > 180;
    // tRx: x-radius of terminator ellipse — 0 at quarter, r at new/full
    const tRx      = r * Math.abs(1 - 2 * f);

    if (phasePct >= 98) {
      drawMoonSurface(ctx, size);
    } else if (!isWaning) {
      // ── WAXING: lit on RIGHT ──────────────────────────────
      // Base: draw moon texture in the right half
      ctx.save();
      ctx.beginPath(); ctx.rect(cx, 0, size, size); ctx.clip();
      drawMoonSurface(ctx, size);
      ctx.restore();

      if (f < 0.5) {
        // Waxing crescent: shadow eats into right side — earthshine overlay
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, tRx, r, 0, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(cx, cy - r);
        ctx.closePath();
        ctx.fillStyle = 'rgba(4, 8, 20, 0.72)';
        ctx.fill();
        ctx.restore();
      } else if (tRx > 1) {
        // Waxing gibbous: restore the left half-ellipse as lit (spills past center).
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, tRx, r, 0, Math.PI / 2, 3 * Math.PI / 2);
        ctx.lineTo(cx, cy - r);
        ctx.closePath();
        ctx.clip();
        drawMoonSurface(ctx, size);
        ctx.restore();
      }
    } else {
      // ── WANING: lit on LEFT ───────────────────────────────
      // Base: draw moon texture in the left half
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, cx, size); ctx.clip();
      drawMoonSurface(ctx, size);
      ctx.restore();

      if (f < 0.5) {
        // Waning crescent: shadow eats into left side — earthshine overlay
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, tRx, r, 0, Math.PI / 2, 3 * Math.PI / 2);
        ctx.lineTo(cx, cy - r);
        ctx.closePath();
        ctx.fillStyle = 'rgba(4, 8, 20, 0.72)';
        ctx.fill();
        ctx.restore();
      } else if (tRx > 1) {
        // Waning gibbous: restore the right half-ellipse as lit (spills past center).
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, tRx, r, 0, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(cx, cy - r);
        ctx.closePath();
        ctx.clip();
        drawMoonSurface(ctx, size);
        ctx.restore();
      }
    }

    // Warm glow on lit side
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glowGrad.addColorStop(0,   'rgba(255, 245, 200, 0.35)');
    glowGrad.addColorStop(0.5, 'rgba(255, 240, 180, 0.18)');
    glowGrad.addColorStop(0.7, 'rgba(255, 240, 180, 0.08)');
    glowGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Soft terminator line (skip near new/full moon)
    if (phasePct >= 2 && phasePct < 98 && tRx > 4) {
      const tX = isWaning ? cx + tRx : cx - tRx;
      const terminatorGrad = ctx.createLinearGradient(tX - 8, cy, tX + 8, cy);
      terminatorGrad.addColorStop(0,   'rgba(0,0,0,0)');
      terminatorGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
      terminatorGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(tX, cy, 8, r, 0, 0, Math.PI * 2);
      ctx.fillStyle = terminatorGrad;
      ctx.fill();
      ctx.restore();
    }

    // Spherical shading overlay — stronger edge darkening for 3D depth
    const grad = ctx.createRadialGradient(cx * 0.65, cy * 0.65, 0, cx, cy, r);
    grad.addColorStop(0,   'rgba(255,245,200,0.12)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1,   'rgba(0,0,0,0.65)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  };

  lastRender = render;
  if (moonImg.complete) { render(); } else { moonImg.onload = render; }
}

// ─────────────────────────────────────────────
// MOON HOVER SIGN — shown on new moon (phasePct < 3)
// viewBox 150×90, rendered at 150×90 inside the 165px moon circle
// ─────────────────────────────────────────────
export function MoonSignSVG() {
  const { i18n } = useTranslation('calendar');
  const isHe = i18n.language === 'he';

  // viewBox 170×90 — sign outer frame x=5..165, y=8..82, center (85,45)
  // thrusters sit flush against each edge, flames extend via overflow:visible
  return (
    <svg
      width="160" height="90"
      viewBox="0 0 170 90"
      className="moonSign-wrap"
      style={{ overflow: 'visible', filter: 'drop-shadow(0px 2px 10px rgba(0,0,0,0.85))' }}
    >
      <style>{`
        @keyframes moonSignFadeIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes moonSignDrift {
          0%   { transform: translate(0px,   0px)   rotate(-0.5deg); }
          8%   { transform: translate(3px,  -2px)   rotate(-0.3deg); }
          18%  { transform: translate(10px, -6px)   rotate(0.4deg);  }
          28%  { transform: translate(13px,  2px)   rotate(0.9deg);  }
          38%  { transform: translate(9px,   10px)  rotate(0.6deg);  }
          48%  { transform: translate(0px,   12px)  rotate(0deg);    }
          55%  { transform: translate(-8px,  8px)   rotate(-0.5deg); }
          63%  { transform: translate(-13px, 1px)   rotate(-1deg);   }
          70%  { transform: translate(-11px, -7px)  rotate(-0.8deg); }
          80%  { transform: translate(-4px,  -11px) rotate(-0.3deg); }
          90%  { transform: translate(3px,   -7px)  rotate(0.2deg);  }
          100% { transform: translate(0px,   0px)   rotate(-0.5deg); }
        }
        @keyframes moonSignThrustLeft {
          0%   { transform: scaleX(0.4);  opacity: 0.3;  }
          8%   { transform: scaleX(0.8);  opacity: 0.6;  }
          18%  { transform: scaleX(1.4);  opacity: 1;    }
          28%  { transform: scaleX(1.2);  opacity: 0.9;  }
          38%  { transform: scaleX(0.5);  opacity: 0.35; }
          55%  { transform: scaleX(0.15); opacity: 0.1;  }
          70%  { transform: scaleX(0.1);  opacity: 0.08; }
          88%  { transform: scaleX(0.3);  opacity: 0.2;  }
          100% { transform: scaleX(0.4);  opacity: 0.3;  }
        }
        @keyframes moonSignThrustRight {
          0%   { transform: scaleX(0.15); opacity: 0.1;  }
          18%  { transform: scaleX(0.1);  opacity: 0.08; }
          38%  { transform: scaleX(0.3);  opacity: 0.2;  }
          55%  { transform: scaleX(1.1);  opacity: 0.85; }
          63%  { transform: scaleX(1.4);  opacity: 1;    }
          70%  { transform: scaleX(1.2);  opacity: 0.9;  }
          88%  { transform: scaleX(0.4);  opacity: 0.3;  }
          100% { transform: scaleX(0.15); opacity: 0.1;  }
        }
        @keyframes moonSignThrustTop {
          0%   { transform: scaleY(0.2);  opacity: 0.15; }
          18%  { transform: scaleY(0.8);  opacity: 0.6;  }
          28%  { transform: scaleY(1.4);  opacity: 1;    }
          38%  { transform: scaleY(1.2);  opacity: 0.9;  }
          48%  { transform: scaleY(0.5);  opacity: 0.35; }
          63%  { transform: scaleY(0.15); opacity: 0.1;  }
          83%  { transform: scaleY(0.1);  opacity: 0.08; }
          100% { transform: scaleY(0.2);  opacity: 0.15; }
        }
        @keyframes moonSignThrustBottom {
          0%   { transform: scaleY(0.3);  opacity: 0.2;  }
          28%  { transform: scaleY(0.15); opacity: 0.1;  }
          48%  { transform: scaleY(0.2);  opacity: 0.15; }
          63%  { transform: scaleY(0.4);  opacity: 0.3;  }
          75%  { transform: scaleY(1.3);  opacity: 0.95; }
          83%  { transform: scaleY(1.5);  opacity: 1;    }
          92%  { transform: scaleY(1.1);  opacity: 0.8;  }
          100% { transform: scaleY(0.3);  opacity: 0.2;  }
        }
        @keyframes moonSignFlicker {
          0%,100% { opacity: 1;    }
          25%     { opacity: 0.85; }
          50%     { opacity: 0.95; }
          75%     { opacity: 0.8;  }
        }
        .moonSign-wrap {
          animation: moonSignFadeIn 2s ease forwards;
        }
        .moonSign-drift {
          animation: moonSignDrift 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-box: fill-box;
          transform-origin: center center;
        }
        .moonSign-flame-left {
          animation: moonSignThrustLeft 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-box: fill-box;
          transform-origin: right center;
        }
        .moonSign-flame-right {
          animation: moonSignThrustRight 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-box: fill-box;
          transform-origin: left center;
        }
        .moonSign-flame-top {
          animation: moonSignThrustTop 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-box: fill-box;
          transform-origin: center bottom;
        }
        .moonSign-flame-bottom {
          animation: moonSignThrustBottom 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-box: fill-box;
          transform-origin: center top;
        }
        .moonSign-flicker {
          animation: moonSignFlicker 0.3s ease-in-out infinite;
        }
      `}</style>
      <defs>
        <clipPath id="moon-sign-clip">
          <rect x="8" y="11" width="154" height="68" rx="4"/>
        </clipPath>
      </defs>
      <g className="moonSign-drift">

        {/* TOP THRUSTER — box sits above sign (flush at y=8), nozzle faces up */}
        <g transform="translate(85,8)">
          <rect x="-16" y="-13" width="32" height="12" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
          <rect x="-12" y="-11" width="7"  height="7"  rx="1" fill="#3a3a58"/>
          <rect x="-3"  y="-11" width="7"  height="7"  rx="1" fill="#3a3a58"/>
          <rect x="6"   y="-11" width="5"  height="7"  rx="1" fill="#44445e"/>
          <g className="moonSign-flame-top">
            <polygon points="-12,-13 12,-13 8,-30 -8,-30"   fill="#AA5500" opacity="0.9"/>
            <polygon points="-8,-13 8,-13 5.5,-25 -5.5,-25" fill="#FF7700" opacity="0.65"/>
            <polygon className="moonSign-flicker" points="-4,-13 4,-13 3,-20 -3,-20" fill="#FFBB33" opacity="0.4"/>
          </g>
        </g>

        {/* BOTTOM THRUSTER — box sits below sign (flush at y=82), nozzle faces down */}
        <g transform="translate(85,82)">
          <rect x="-16" y="1"  width="32" height="12" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
          <rect x="-12" y="3.5" width="7" height="7"  rx="1" fill="#3a3a58"/>
          <rect x="-3"  y="3.5" width="7" height="7"  rx="1" fill="#3a3a58"/>
          <rect x="6"   y="3.5" width="5" height="7"  rx="1" fill="#44445e"/>
          <g className="moonSign-flame-bottom">
            <polygon points="-12,13 12,13 8,30 -8,30"       fill="#AA5500" opacity="0.9"/>
            <polygon points="-8,13 8,13 5.5,25 -5.5,25"     fill="#FF7700" opacity="0.65"/>
            <polygon className="moonSign-flicker" points="-4,13 4,13 3,20 -3,20" fill="#FFBB33" opacity="0.4"/>
          </g>
        </g>

        {/* LEFT THRUSTER — box sits left of sign (flush at x=5), nozzle faces left */}
        <g transform="translate(5,45)">
          <rect x="-14" y="-8" width="12" height="16" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
          <rect x="-12" y="-5.5" width="7" height="5" rx="1" fill="#3a3a58"/>
          <rect x="-12" y="0.5"  width="7" height="5" rx="1" fill="#3a3a58"/>
          <g className="moonSign-flame-left">
            <polygon points="-14,-7 -14,7 -30,5 -30,-5"     fill="#AA5500" opacity="0.9"/>
            <polygon points="-14,-5 -14,5 -26,3.5 -26,-3.5" fill="#FF7700" opacity="0.65"/>
            <polygon className="moonSign-flicker" points="-14,-3 -14,3 -22,2 -22,-2" fill="#FFBB33" opacity="0.4"/>
          </g>
        </g>

        {/* RIGHT THRUSTER — box sits right of sign (flush at x=165), nozzle faces right */}
        <g transform="translate(165,45)">
          <rect x="2"  y="-8" width="12" height="16" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
          <rect x="5"  y="-5.5" width="7" height="5" rx="1" fill="#3a3a58"/>
          <rect x="5"  y="0.5"  width="7" height="5" rx="1" fill="#3a3a58"/>
          <g className="moonSign-flame-right">
            <polygon points="14,-7 14,7 30,5 30,-5"          fill="#AA5500" opacity="0.9"/>
            <polygon points="14,-5 14,5 26,3.5 26,-3.5"      fill="#FF7700" opacity="0.65"/>
            <polygon className="moonSign-flicker" points="14,-3 14,3 22,2 22,-2" fill="#FFBB33" opacity="0.4"/>
          </g>
        </g>

        {/* SIGN BOARD — same as before, on top of thrusters */}
        <rect x="5"  y="8"  width="160" height="74" rx="5" fill="#8B5E1A"/>
        <rect x="8"  y="11" width="154" height="68" rx="4" fill="#C4862A"/>
        <rect x="5"  y="8"  width="14"  height="74" rx="3" fill="#8B5E1A"/>
        <rect x="151" y="8" width="14"  height="74" rx="3" fill="#8B5E1A"/>
        <circle cx="14"  cy="17" r="3.5" fill="#4A2800"/>
        <circle cx="156" cy="17" r="3.5" fill="#4A2800"/>
        <circle cx="14"  cy="73" r="3.5" fill="#4A2800"/>
        <circle cx="156" cy="73" r="3.5" fill="#4A2800"/>
        <g clipPath="url(#moon-sign-clip)">
          {isHe ? (
            <>
              <text x="85" y="44" textAnchor="middle" fontFamily="Georgia,serif"
                fontSize="13" fontWeight="700" fill="#1A0E02" letterSpacing="2">
                האור חוזר בקרוב
              </text>
              <text x="85" y="62" textAnchor="middle" fontFamily="Georgia,serif"
                fontSize="11" fill="#1A0E02" letterSpacing="1.5">
                נתראה! 🌙
              </text>
            </>
          ) : (
            <>
              <text x="85" y="37" textAnchor="middle" fontFamily="Georgia,serif"
                fontSize="10" fontWeight="700" fill="#1A0E02" letterSpacing="1">
                LIGHT COMES
              </text>
              <text x="85" y="51" textAnchor="middle" fontFamily="Georgia,serif"
                fontSize="10" fontWeight="700" fill="#1A0E02" letterSpacing="1">
                BACK SOON
              </text>
              <text x="85" y="65" textAnchor="middle" fontFamily="Georgia,serif"
                fontSize="10" fill="#1A0E02" letterSpacing="1">
                SEE YA! 🌙
              </text>
            </>
          )}
        </g>
      </g>
    </svg>
  );
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
    canvas.style.width = '165px';
    canvas.style.height = '165px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    drawMoon(canvas, phasePct, phaseAngle, tiltDeg, lat);
  }, [phasePct, phaseAngle, tiltDeg, lat]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '10px', padding: '20px 0 12px',
    }}>
      <div style={{
        position: 'relative',
        width: '165px',
        height: '165px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '165px',
          height: '165px',
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: isFullMoon
            ? '0 0 0 2px rgba(245,200,64,0.40), 0 0 40px rgba(245,200,64,0.55), 0 0 12px rgba(245,200,64,0.3)'
            : '0 0 0 2px rgba(245,200,64,0.40), 0 0 22px rgba(245,200,64,0.32), 0 0 6px rgba(245,200,64,0.15)',
        }}>
          <canvas
            ref={canvasRef}
            width={165}
            height={165}
            style={{ display: 'block', width: '165px', height: '165px' }}
          />
        </div>
        {phasePct < 3 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <MoonSignSVG />
          </div>
        )}
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
