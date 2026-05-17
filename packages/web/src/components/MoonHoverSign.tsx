import { useEffect } from 'react';

interface MoonHoverSignProps {
  illumination: number; // 0–1 fraction, unused — caller decides when to render
}

const CSS = `
@keyframes mhs-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes mhs-drift {
  0%   { transform: translate(0px,   0px)   rotate(-1deg); }
  15%  { transform: translate(14px,  -8px)  rotate(0.5deg); }
  30%  { transform: translate(10px,  12px)  rotate(1deg); }
  45%  { transform: translate(-12px, 10px)  rotate(-0.5deg); }
  60%  { transform: translate(-16px, -6px)  rotate(-1.2deg); }
  75%  { transform: translate(-6px,  -14px) rotate(0deg); }
  90%  { transform: translate(8px,   -10px) rotate(0.8deg); }
  100% { transform: translate(0px,   0px)   rotate(-1deg); }
}
@keyframes mhs-glow {
  0%, 100% { opacity: 0.1; }
  50%       { opacity: 0.3; }
}
@keyframes mhs-thrust-left {
  0%   { transform: scaleX(1.2); opacity: 0.95; }
  40%  { transform: scaleX(0.2); opacity: 0.2; }
  70%  { transform: scaleX(0.2); opacity: 0.2; }
  85%  { transform: scaleX(1.2); opacity: 0.95; }
  100% { transform: scaleX(1.2); opacity: 0.95; }
}
@keyframes mhs-thrust-right {
  0%   { transform: scaleX(0.2); opacity: 0.2; }
  40%  { transform: scaleX(1.2); opacity: 0.95; }
  70%  { transform: scaleX(1.2); opacity: 0.95; }
  85%  { transform: scaleX(0.2); opacity: 0.2; }
  100% { transform: scaleX(0.2); opacity: 0.2; }
}
@keyframes mhs-thrust-top {
  0%   { transform: scaleY(0.7); opacity: 0.5; }
  25%  { transform: scaleY(1.2); opacity: 0.95; }
  45%  { transform: scaleY(1.2); opacity: 0.95; }
  65%  { transform: scaleY(0.2); opacity: 0.2; }
  85%  { transform: scaleY(0.2); opacity: 0.2; }
  100% { transform: scaleY(0.7); opacity: 0.5; }
}
@keyframes mhs-thrust-bottom {
  0%   { transform: scaleY(0.7); opacity: 0.5; }
  25%  { transform: scaleY(0.2); opacity: 0.2; }
  45%  { transform: scaleY(0.2); opacity: 0.2; }
  65%  { transform: scaleY(1.2); opacity: 0.95; }
  85%  { transform: scaleY(1.2); opacity: 0.95; }
  100% { transform: scaleY(0.7); opacity: 0.5; }
}
.mhs-wrap {
  animation: mhs-fadein 1.5s ease both;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.mhs-drift {
  animation: mhs-drift 10s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center center;
}
.mhs-glow { animation: mhs-glow 4s ease-in-out infinite; }
.mhs-flame-left {
  animation: mhs-thrust-left 10s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: right center;
}
.mhs-flame-right {
  animation: mhs-thrust-right 10s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: left center;
}
.mhs-flame-top {
  animation: mhs-thrust-top 10s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center bottom;
}
.mhs-flame-bottom {
  animation: mhs-thrust-bottom 10s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center top;
}
`;

// cx of sign centre in SVG coords
const CX = 82.5;
const CY = 82.5;
// sign outer frame: 130×56
const SW = 130, SH = 56;
const SX = CX - SW / 2;   // = 17.5
const SY = CY - SH / 2;   // = 54.5

export function MoonHoverSign({ illumination }: MoonHoverSignProps) {
  useEffect(() => {
    console.log('[MoonHoverSign] mounted, illumination:', illumination);
  }, []);

  return (
    <div className="mhs-wrap">
      <style>{CSS}</style>
      <svg
        width="165"
        height="165"
        viewBox="0 0 165 165"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Outer glow ring */}
        <circle className="mhs-glow" cx={CX} cy={CY} r="80"
          fill="none" stroke="rgba(80,80,180,0.7)" strokeWidth="3" />

        {/* Drifting assembly */}
        <g className="mhs-drift">

          {/* TOP THRUSTER */}
          <g transform={`translate(${CX},${SY - 8})`}>
            <rect x="-14" y="-6" width="28" height="12" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
            <rect x="-11" y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
            <rect x="-2"  y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
            <rect x="7"   y="-3.5" width="5" height="7" rx="1" fill="#44445e"/>
            <g className="mhs-flame-top">
              <polygon points="-9,-6 9,-6 5,-21 -5,-21"     fill="#AA5500" opacity="0.9"/>
              <polygon points="-6,-6 6,-6 3.5,-17 -3.5,-17" fill="#FF7700" opacity="0.65"/>
              <polygon points="-3.5,-6 3.5,-6 2,-14 -2,-14" fill="#FFBB33" opacity="0.4"/>
            </g>
          </g>

          {/* BOTTOM THRUSTER */}
          <g transform={`translate(${CX},${SY + SH + 8})`}>
            <rect x="-14" y="-6" width="28" height="12" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
            <rect x="-11" y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
            <rect x="-2"  y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
            <rect x="7"   y="-3.5" width="5" height="7" rx="1" fill="#44445e"/>
            <g className="mhs-flame-bottom">
              <polygon points="-9,6 9,6 5,21 -5,21"     fill="#AA5500" opacity="0.9"/>
              <polygon points="-6,6 6,6 3.5,17 -3.5,17" fill="#FF7700" opacity="0.65"/>
              <polygon points="-3.5,6 3.5,6 2,14 -2,14" fill="#FFBB33" opacity="0.4"/>
            </g>
          </g>

          {/* LEFT THRUSTER */}
          <g transform={`translate(${SX - 8},${CY})`}>
            <rect x="-6" y="-8" width="12" height="16" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
            <rect x="-3.5" y="-5.5" width="7" height="5" rx="1" fill="#3a3a58"/>
            <rect x="-3.5" y="0.5"  width="7" height="5" rx="1" fill="#3a3a58"/>
            <g className="mhs-flame-left">
              <polygon points="-6,-7 -6,7 -21,4.5 -21,-4.5" fill="#AA5500" opacity="0.9"/>
              <polygon points="-6,-5 -6,5 -17,3 -17,-3"     fill="#FF7700" opacity="0.65"/>
              <polygon points="-6,-3 -6,3 -14,1.5 -14,-1.5" fill="#FFBB33" opacity="0.4"/>
            </g>
          </g>

          {/* RIGHT THRUSTER */}
          <g transform={`translate(${SX + SW + 8},${CY})`}>
            <rect x="-6" y="-8" width="12" height="16" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
            <rect x="-3.5" y="-5.5" width="7" height="5" rx="1" fill="#3a3a58"/>
            <rect x="-3.5" y="0.5"  width="7" height="5" rx="1" fill="#3a3a58"/>
            <g className="mhs-flame-right">
              <polygon points="6,-7 6,7 21,4.5 21,-4.5" fill="#AA5500" opacity="0.9"/>
              <polygon points="6,-5 6,5 17,3 17,-3"     fill="#FF7700" opacity="0.65"/>
              <polygon points="6,-3 6,3 14,1.5 14,-1.5" fill="#FFBB33" opacity="0.4"/>
            </g>
          </g>

          {/* SIGN BOARD — 130×56 centered at (82.5, 82.5) */}
          {/* Outer frame */}
          <rect x={SX} y={SY} width={SW} height={SH} rx="5" fill="#4A3008"/>
          {/* Inner board */}
          <rect x={SX + 3} y={SY + 3} width={SW - 6} height={SH - 6} rx="4" fill="#7A5520"/>
          {/* Wood grain */}
          {[30, 43, 56, 69, 82, 95, 108, 121, 134].map(x => (
            <line key={x} x1={x} y1={SY + 3} x2={x} y2={SY + SH - 3}
              stroke="#5A4010" strokeWidth="0.6" opacity="0.3"/>
          ))}
          {/* Left plank border */}
          <rect x={SX} y={SY} width="10" height={SH} rx="2" fill="#4A3008"/>
          {/* Right plank border */}
          <rect x={SX + SW - 10} y={SY} width="10" height={SH} rx="2" fill="#4A3008"/>
          {/* Corner nails */}
          <circle cx={SX + 6}      cy={SY + 7}      r="2" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
          <circle cx={SX + 6}      cy={SY + SH - 7} r="2" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
          <circle cx={SX + SW - 6} cy={SY + 7}      r="2" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
          <circle cx={SX + SW - 6} cy={SY + SH - 7} r="2" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>

          {/* Carved text */}
          <text x={CX} y={SY + 14} textAnchor="middle"
            fontFamily="Georgia, serif" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="#1A0E02">
            האור חוזר בקרוב
          </text>
          <text x={CX} y={SY + 25} textAnchor="middle"
            fontFamily="Georgia, serif" fontSize="10" fontWeight="600" letterSpacing="1" fill="#2A1A04">
            נתראה!
          </text>
          <text x={CX} y={SY + 37} textAnchor="middle"
            fontFamily="Georgia, serif" fontSize="6.5" fontWeight="500" letterSpacing="0.8" fill="#1A0E02">
            LIGHT WILL COME BACK SOON
          </text>
          <text x={CX} y={SY + 48} textAnchor="middle"
            fontFamily="Georgia, serif" fontSize="7" letterSpacing="1" fill="#3A2408" opacity="0.75">
            SEE YA!
          </text>
        </g>
      </svg>
    </div>
  );
}
