import { useState, useEffect } from 'react';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const LS_KEY = 'has-seen-map-tour';

interface TourStep {
  target: string;
  title: string;
  body: string;
  chupchu: 'thinking' | 'wise' | 'happy';
  showAnimation?: boolean;
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="toolbar"]',
    title: 'לוח הכלים שלך 🛠️',
    body: 'כאן תמצא את כל הכלים ליצירת הגינה שלך.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="select-btn"]',
    title: 'כלי הבחירה 👆',
    body: 'בחר אלמנטים על המפה כדי להזיז, לערוך או למחוק אותם.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="buildings-btn"]',
    title: 'מבנים ואלמנטים 🏡',
    body: 'הוסף בית, גדר, שביל, פרגולה, עציץ ועוד. גרור למיקום הנכון.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="plants-btn"]',
    title: 'הוספת צמחים 🌱',
    body: 'בחר צמח מהרשימה ולחץ על המפה למקם אותו.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="pots-btn"]',
    title: 'עציצים 🪴',
    body: 'הוסף עציצים וצמחי בית לגינה שלך.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="trees-btn"]',
    title: 'עצי פרי ונוי 🌳',
    body: 'הוסף עצי פרי, זית, לימון, תאנה ועוד לגינה שלך.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="canvas"]',
    title: 'המפה שלך 🗺️',
    body: 'לחץ על המפה כדי למקם אלמנטים. גרור להזזה. צבוט להתקרבות.',
    chupchu: 'wise',
    showAnimation: true,
  },
  {
    target: '[data-tour="chupchu-bubble"]',
    title: "צ'ופצ'ו תמיד כאן! 🌿",
    body: "שאל את צ'ופצ'ו כל שאלה על הגינה — מתי לשתול, מה מתאים לצמח, ועוד.",
    chupchu: 'happy',
  },
];

interface SpotRect { top: number; left: number; width: number; height: number }

function getFallbackRect(target: string): SpotRect | null {
  switch (target) {
    case '[data-tour="canvas"]':
      return {
        top: 100, left: 100,
        width: window.innerWidth - 200,
        height: window.innerHeight - 200,
      };
    case '[data-tour="chupchu-bubble"]':
      return {
        top: window.innerHeight - 100,
        left: 20, width: 60, height: 60,
      };
    default:
      return null;
  }
}

export interface Props {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const CARD_W = 320;
const MARGIN = 16;
const PAD    = 8;

// ── Canvas interaction animation ──────────────────────────────────────────────

const TOUR_CSS = `
@keyframes th-fadein { from { opacity:0 } to { opacity:1 } }
@keyframes th-click  { 0%,100% { transform:scale(1) } 45% { transform:scale(0.75) } }
@keyframes th-pulse  { 0% { transform:scale(0.3); opacity:0.8 } 100% { transform:scale(3.5); opacity:0 } }
@keyframes th-drag   { 0% { transform:translate(0,0) } 100% { transform:translate(72px,52px) } }
@keyframes th-pinch  { 0%,100% { transform:scale(1.2) } 50% { transform:scale(0.5) } }
`;

function AnimatedHand({ spotRect }: { spotRect: SpotRect }) {
  const [phase, setPhase] = useState<'click' | 'drag' | 'pinch' | 'out'>('click');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('drag'),  1700);
    const t2 = setTimeout(() => setPhase('pinch'), 3300);
    const t3 = setTimeout(() => setPhase('out'),   4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'out') return null;

  const cx = Math.round(spotRect.left + spotRect.width  * 0.42);
  const cy = Math.round(spotRect.top  + spotRect.height * 0.44);

  return (
    <>
      <style>{TOUR_CSS}</style>

      {phase === 'click' && (
        <>
          <div style={{
            position: 'fixed', left: cx, top: cy, zIndex: 10001,
            pointerEvents: 'none', fontSize: '28px', lineHeight: 1,
            animation: 'th-fadein 0.4s ease, th-click 0.6s ease 0.6s 1',
          }}>👆</div>
          <div style={{
            position: 'fixed', left: cx + 2, top: cy + 2, zIndex: 10001,
            pointerEvents: 'none',
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'rgba(245,200,64,0.7)',
            animation: 'th-pulse 0.6s ease 0.85s 2',
          }} />
        </>
      )}

      {phase === 'drag' && (
        <>
          <div style={{
            position: 'fixed', left: cx, top: cy - 26, zIndex: 10001,
            pointerEvents: 'none', fontSize: '22px', lineHeight: 1,
            animation: 'th-drag 1.4s ease forwards',
          }}>🌱</div>
          <div style={{
            position: 'fixed', left: cx, top: cy, zIndex: 10001,
            pointerEvents: 'none', fontSize: '26px', lineHeight: 1,
            animation: 'th-drag 1.4s ease forwards',
          }}>✊</div>
        </>
      )}

      {phase === 'pinch' && (
        <div style={{
          position: 'fixed', left: cx - 13, top: cy - 13, zIndex: 10001,
          pointerEvents: 'none', fontSize: '28px', lineHeight: 1,
          animation: 'th-pinch 0.9s ease 3',
        }}>🤏</div>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MapTour({ isOpen, onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotRect | null>(null);

  useEffect(() => {
    if (isOpen) setStep(0);
    return () => setStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const selector = STEPS[step]?.target;
    if (!selector) return;

    function measure() {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(getFallbackRect(selector));
      }
    }

    measure();
    const t = setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [step, isOpen]);

  if (!isOpen) return null;

  const cur    = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const advance = () => {
    if (!isLast) setStep(s => s + 1);
    else onComplete();
  };

  // Card position: prefer below spotlight, fall back to above, clamp horizontally
  let cardTop  = Math.max(MARGIN, (window.innerHeight - 400) / 2);
  let cardLeft = Math.max(MARGIN, (window.innerWidth  - CARD_W) / 2);

  if (rect) {
    cardTop = rect.top + rect.height + PAD + 12;
    if (cardTop + 400 > window.innerHeight) {
      cardTop = rect.top - PAD - 12 - 400;
    }
    cardLeft = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - CARD_W - MARGIN));
  }

  return (
    <>
      {/* Dark overlay — visual only, never blocks clicks */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }} />

      {/* Spotlight — box-shadow creates the dark overlay */}
      {rect ? (
        <div style={{
          position: 'fixed',
          top:    rect.top  - PAD,
          left:   rect.left - PAD,
          width:  rect.width  + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease',
        }} />
      ) : (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.78)', pointerEvents: 'none',
        }} />
      )}

      {/* Canvas interaction animation */}
      {cur.showAnimation && rect && <AnimatedHand key={step} spotRect={rect} />}

      {/* Instruction card */}
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          top:  cardTop,
          left: cardLeft,
          width: CARD_W,
          maxWidth: 'calc(100vw - 32px)',
          overflow: 'hidden',
          zIndex: 10000,
          pointerEvents: 'auto',
          background: 'rgba(20,43,22,0.97)',
          border: '1px solid rgba(245,200,64,0.3)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: ASSIST,
        }}
      >
        {/* Chupchu avatar + step counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <img
            src="/chupchu_final.png"
            alt="צ'ופצ'ו"
            style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
          />
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}55` }}>
            שלב {step + 1} מתוך {STEPS.length}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
          color: GOLD, margin: '0 0 8px',
        }}>
          {cur.title}
        </h3>

        {/* Body */}
        <p style={{
          fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}CC`,
          lineHeight: 1.6, margin: '0 0 16px',
        }}>
          {cur.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '16px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '18px' : '6px',
              height: '6px',
              borderRadius: '50px',
              background: i === step ? GOLD : 'rgba(245,200,64,0.2)',
              transition: 'all 0.25s',
            }} />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={advance}
          style={{
            width: '100%', fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
            padding: '10px 20px', borderRadius: '8px',
            border: 'none', backgroundColor: GOLD, color: '#142B16',
            cursor: 'pointer', transition: 'filter 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
        >
          {isLast ? 'בואו נתחיל! 🌱' : 'הבא ←'}
        </button>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={onSkip}
            style={{
              width: '100%', marginTop: '8px', padding: '8px',
              background: 'none', border: 'none',
              color: `${PARCH}40`, fontFamily: ASSIST, fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            דלג על הסיור
          </button>
        )}
      </div>
    </>
  );
}

export function shouldShowTour(): boolean {
  return !localStorage.getItem(LS_KEY);
}
