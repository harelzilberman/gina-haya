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
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="toolbar"]',
    title: 'לוח הכלים שלך 🛠️',
    body: 'כאן תמצא את כל הכלים ליצירת הגינה. בחר כלי כדי להתחיל.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="plants-btn"]',
    title: 'הוספת צמחים 🌱',
    body: "לחץ על 'צמחים' כדי לפתוח את רשימת הצמחים. בחר צמח ולחץ על המפה כדי למקם אותו.",
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="buildings-btn"]',
    title: 'מבנים ואלמנטים 🏡',
    body: 'הוסף לגינה: בית, גדר, שביל, עציץ, פרגולה ועוד. גרור אותם למיקום הנכון.',
    chupchu: 'thinking',
  },
  {
    target: '[data-tour="canvas"]',
    title: 'המפה שלך 🗺️',
    body: 'לחץ בכל מקום על המפה כדי למקם צמחים ומבנים. גרור אלמנטים כדי לסדר אותם. צבוט כדי להתקרב.',
    chupchu: 'wise',
  },
  {
    target: '[data-tour="chupchu-bubble"]',
    title: "צ'ופצ'ו תמיד כאן! 🌿",
    body: "שאל את צ'ופצ'ו כל שאלה על הגינה שלך — מתי לשתול, מה מתאים לצמח שלך, ועוד.",
    chupchu: 'happy',
  },
];


interface SpotRect { top: number; left: number; width: number; height: number }

export interface Props {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const CARD_W  = 320;
const MARGIN  = 16;
const PAD     = 8;

export function MapTour({ isOpen, onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotRect | null>(null);

  useEffect(() => {
    if (isOpen) setStep(0);
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
        setRect(null);
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
    cardTop  = rect.top + rect.height + PAD + 12;
    cardLeft = (rect.left + rect.width) - CARD_W; // right-align with spotlight right edge

    if (cardTop + 400 > window.innerHeight) {
      cardTop = rect.top - PAD - 12 - 400;
    }

    cardLeft = Math.max(MARGIN, Math.min(cardLeft, window.innerWidth - CARD_W - MARGIN));
  }

  return (
    <>
      {/* Click-blocker — captures clicks behind the card */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />

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

      {/* Instruction card */}
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          top:  cardTop,
          left: cardLeft,
          width: CARD_W,
          zIndex: 10000,
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
