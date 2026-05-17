import { useEffect, useState } from 'react';

interface MoonHoverSignProps {
  illumination: number; // 0–1 fraction
}

const CSS = `
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

export function MoonHoverSign({ illumination }: MoonHoverSignProps) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (illumination < 0.03) {
      setFadeOut(false);
      setVisible(true);
    } else if (visible) {
      setFadeOut(true);
      const t = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(t);
    }
  }, [illumination, visible]);

  useEffect(() => {
    if (!visible) { setOpacity(0); return; }
    if (fadeOut) {
      setOpacity(0);
    } else {
      const id = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(id);
    }
  }, [visible, fadeOut]);

  if (!visible) return null;

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        opacity,
        transition: fadeOut ? 'opacity 1s ease' : 'opacity 1.5s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}>
        <svg
          width="165"
          height="165"
          viewBox="0 0 165 165"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Subtle outer glow ring */}
          <circle
            className="mhs-glow"
            cx="82.5"
            cy="82.5"
            r="80"
            fill="none"
            stroke="rgba(80,80,180,0.7)"
            strokeWidth="3"
          />

          {/* Drifting assembly — sign + all 4 thrusters move together */}
          <g className="mhs-drift">

            {/* ── TOP THRUSTER — nozzle points up, flame pushes sign down ── */}
            <g transform="translate(82.5,53)">
              <rect x="-14" y="-6" width="28" height="12" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
              <rect x="-11" y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
              <rect x="-2" y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
              <rect x="7" y="-3.5" width="5" height="7" rx="1" fill="#44445e"/>
              <g className="mhs-flame-top">
                <polygon points="-9,-6 9,-6 5,-21 -5,-21" fill="#AA5500" opacity="0.9"/>
                <polygon points="-6,-6 6,-6 3.5,-17 -3.5,-17" fill="#FF7700" opacity="0.65"/>
                <polygon points="-3.5,-6 3.5,-6 2,-14 -2,-14" fill="#FFBB33" opacity="0.4"/>
              </g>
            </g>

            {/* ── BOTTOM THRUSTER — nozzle points down, flame pushes sign up ── */}
            <g transform="translate(82.5,112)">
              <rect x="-14" y="-6" width="28" height="12" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
              <rect x="-11" y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
              <rect x="-2" y="-3.5" width="7" height="7" rx="1" fill="#3a3a58"/>
              <rect x="7" y="-3.5" width="5" height="7" rx="1" fill="#44445e"/>
              <g className="mhs-flame-bottom">
                <polygon points="-9,6 9,6 5,21 -5,21" fill="#AA5500" opacity="0.9"/>
                <polygon points="-6,6 6,6 3.5,17 -3.5,17" fill="#FF7700" opacity="0.65"/>
                <polygon points="-3.5,6 3.5,6 2,14 -2,14" fill="#FFBB33" opacity="0.4"/>
              </g>
            </g>

            {/* ── LEFT THRUSTER — nozzle points left, flame pushes sign right ── */}
            <g transform="translate(23,82.5)">
              <rect x="-6" y="-8" width="12" height="16" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
              <rect x="-3.5" y="-5.5" width="7" height="5" rx="1" fill="#3a3a58"/>
              <rect x="-3.5" y="0.5" width="7" height="5" rx="1" fill="#3a3a58"/>
              <g className="mhs-flame-left">
                <polygon points="-6,-7 -6,7 -21,4.5 -21,-4.5" fill="#AA5500" opacity="0.9"/>
                <polygon points="-6,-5 -6,5 -17,3 -17,-3" fill="#FF7700" opacity="0.65"/>
                <polygon points="-6,-3 -6,3 -14,1.5 -14,-1.5" fill="#FFBB33" opacity="0.4"/>
              </g>
            </g>

            {/* ── RIGHT THRUSTER — nozzle points right, flame pushes sign left ── */}
            <g transform="translate(142,82.5)">
              <rect x="-6" y="-8" width="12" height="16" rx="3" fill="#2e2e48" stroke="#4a4a70" strokeWidth="0.8"/>
              <rect x="-3.5" y="-5.5" width="7" height="5" rx="1" fill="#3a3a58"/>
              <rect x="-3.5" y="0.5" width="7" height="5" rx="1" fill="#3a3a58"/>
              <g className="mhs-flame-right">
                <polygon points="6,-7 6,7 21,4.5 21,-4.5" fill="#AA5500" opacity="0.9"/>
                <polygon points="6,-5 6,5 17,3 17,-3" fill="#FF7700" opacity="0.65"/>
                <polygon points="6,-3 6,3 14,1.5 14,-1.5" fill="#FFBB33" opacity="0.4"/>
              </g>
            </g>

            {/* ── SIGN BOARD — centered at (82.5, 82.5), 105×44 ── */}
            {/* Outer frame */}
            <rect x="30" y="60.5" width="105" height="44" rx="5" fill="#4A3008"/>
            {/* Inner board */}
            <rect x="33" y="63.5" width="99" height="38" rx="4" fill="#7A5520"/>
            {/* Wood grain lines */}
            {[45, 58, 71, 84, 97, 110, 123].map(x => (
              <line key={x} x1={x} y1="63.5" x2={x} y2="101.5" stroke="#5A4010" strokeWidth="0.6" opacity="0.3"/>
            ))}
            {/* Left plank border */}
            <rect x="30" y="60.5" width="10" height="44" rx="2" fill="#4A3008"/>
            {/* Right plank border */}
            <rect x="125" y="60.5" width="10" height="44" rx="2" fill="#4A3008"/>
            {/* Corner nails */}
            <circle cx="37" cy="67" r="2.5" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
            <circle cx="37" cy="94" r="2.5" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
            <circle cx="128" cy="67" r="2.5" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
            <circle cx="128" cy="94" r="2.5" fill="#2A1A04" stroke="#1A0A00" strokeWidth="0.5"/>
            {/* Carved text — engraved look */}
            <text x="82.5" y="77" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fontWeight="700" letterSpacing="2.5" fill="#1A0E02">חוזר בקרוב</text>
            <text x="82.5" y="88" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fontWeight="600" letterSpacing="1.8" fill="#1A0E02">COMING BACK SOON</text>
            <text x="82.5" y="97" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" letterSpacing="1.2" fill="#3A2408" opacity="0.7">~ ירח חדש ~</text>
          </g>
        </svg>
      </div>
    </>
  );
}
