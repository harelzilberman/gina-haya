import { useOnboardingStore } from '../../stores/onboardingStore';

const NIGHT    = '#050d0a';
const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const CSS = `
@keyframes chupchu-bounce-in {
  0%   { opacity: 0; transform: translateY(60px) scale(0.85); }
  70%  { transform: translateY(-8px) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes chupchu-glow {
  0%, 100% { box-shadow: 0 0 28px rgba(0,229,195,0.3), 0 0 8px rgba(0,229,195,0.15); }
  50%       { box-shadow: 0 0 56px rgba(0,229,195,0.55), 0 0 20px rgba(0,229,195,0.35); }
}
@keyframes particle-float {
  0%   { opacity: 0; transform: translateY(0) scale(0.8); }
  20%  { opacity: 1; }
  80%  { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-200px) scale(1.2); }
}
@keyframes welcome-fade-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const PARTICLES: { emoji: string; left: number; delay: number; size: number; duration: number }[] = [
  { emoji: '🌿', left: 8,  delay: 0,    size: 18, duration: 5.2 },
  { emoji: '✨', left: 20, delay: 0.7,  size: 14, duration: 4.5 },
  { emoji: '🌙', left: 35, delay: 1.4,  size: 16, duration: 5.8 },
  { emoji: '✨', left: 55, delay: 0.3,  size: 12, duration: 4.2 },
  { emoji: '🌱', left: 70, delay: 1.1,  size: 16, duration: 5.5 },
  { emoji: '🌿', left: 85, delay: 0.5,  size: 14, duration: 4.8 },
];

export function WelcomeScreen() {
  const { setShowWelcomeScreen } = useOnboardingStore();

  const handleStart = () => {
    localStorage.setItem('chupchu-welcomed', 'true');
    setShowWelcomeScreen(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div
        dir="rtl"
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: `linear-gradient(180deg, ${NIGHT} 0%, #091410 55%, ${NIGHT} 100%)`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px',
          overflow: 'hidden',
        }}
      >
        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '5%',
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animation: `particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {p.emoji}
          </div>
        ))}

        {/* Chupchu avatar */}
        <div style={{
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(0,229,195,0.4), rgba(0,180,150,0.15))',
          border: '2px solid rgba(0,229,195,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '100px',
          animation: 'chupchu-bounce-in 0.72s cubic-bezier(0.34,1.56,0.64,1) both, chupchu-glow 3s ease-in-out 0.72s infinite',
          marginBottom: '32px',
          flexShrink: 0,
        }}>
          🌱
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: FRANK, fontSize: '34px', fontWeight: 700,
          color: BIO_CYAN, textAlign: 'center',
          margin: '0 0 16px', lineHeight: 1.2,
          animation: 'welcome-fade-in 0.5s ease 0.5s both',
        }}>
          ברוך הבא לגינה חיה! 🌿
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: DM_SANS, fontSize: '16px',
          color: `${TEXT_MID}CC`,
          textAlign: 'center', lineHeight: 1.8,
          maxWidth: 440, margin: '0 0 44px',
          animation: 'welcome-fade-in 0.5s ease 0.65s both',
        }}>
          אני צ'ופצ'ו, הגנן הביודינמי שלך.
          <br />
          אני כאן כדי לעזור לך לגדל גינה בריאה ומשגשגת
          <br />
          בהתאם ללוח הירח והקלנדר הביודינמי.
        </p>

        {/* CTA */}
        <button
          onClick={handleStart}
          style={{
            fontFamily: FRANK, fontSize: '18px', fontWeight: 700,
            color: NIGHT, background: BIO_CYAN,
            border: 'none', borderRadius: '14px',
            padding: '16px 52px', cursor: 'pointer',
            transition: 'filter 0.2s, transform 0.15s',
            animation: 'welcome-fade-in 0.5s ease 0.8s both',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.filter = 'none';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          בוא נתחיל 🌱
        </button>
      </div>
    </>
  );
}
