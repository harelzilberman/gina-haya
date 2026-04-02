import { useState, useEffect } from 'react';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const LS_KEY = 'map-tour-seen';

const STEPS = [
  {
    title: 'שלום! אני מון 🌕',
    body: 'בוא נצייר את הגינה שלך — שרטוט הנכס שלך יעזור לי לתכנן תכנית שתילה מוןלמת.',
    btn: 'בוא נתחיל!',
  },
  {
    title: 'כלי ציור',
    body: 'בחר כלי ציור מהסרגל — מצולע לצורות חופשיות, מלבן לצורות פשוטות, עיגול לעצים ועציצים.',
    btn: 'הבנתי',
  },
  {
    title: 'סוגי אובייקטים',
    body: 'אחרי ציור תגיד לי מה זה — ערוגה, גדר, קיר, עץ, שביל... כל אובייקט יקבל עיצוב מתאים.',
    btn: 'ממשיך',
  },
  {
    title: 'חץ הצפון 🧭',
    body: 'גרור את חץ הצפון (פינה עליונה ימנית) לכיוון צפון. זה יאפשר לי לחשב אזורי שמש ולהמליץ על מיקום מיטבי לצמחים.',
    btn: 'ממשיך',
  },
  {
    title: 'אשף התכנון 🌕',
    body: 'כשתסיים לשרטט, לחץ על "בקש ממון לתכנן" — אבנה לך תכנית שתילה ביודינמית מוןלמת בהתאם לגינה שלך.',
    btn: 'הבנתי, בואו נתחיל!',
  },
];

interface Props {
  onDone: () => void;
}

export function MapTour({ onDone }: Props) {
  const [step, setStep] = useState(0);

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem(LS_KEY, '1');
      onDone();
    }
  };

  const cur = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,24,12,0.75)', backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'linear-gradient(160deg,rgba(28,60,30,0.99),rgba(20,43,22,0.99))',
        border: '1px solid rgba(245,200,64,0.2)',
        borderRadius: '16px', padding: '32px 28px',
        maxWidth: '380px', width: '90%', textAlign: 'center',
        boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '20px' : '7px', height: '7px', borderRadius: '50px',
              background: i === step ? GOLD : 'rgba(245,200,64,0.2)',
              transition: 'all 0.25s',
            }} />
          ))}
        </div>

        <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '0 0 12px' }}>
          {cur.title}
        </h2>
        <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}CC`, lineHeight: 1.6, margin: '0 0 24px' }}>
          {cur.body}
        </p>

        <button
          onClick={advance}
          style={{
            fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
            padding: '11px 32px', borderRadius: '8px',
            border: 'none', backgroundColor: GOLD, color: '#142B16', cursor: 'pointer',
            width: '100%', transition: 'filter 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          {cur.btn}
        </button>

        {step < STEPS.length - 1 && (
          <button
            onClick={() => { localStorage.setItem(LS_KEY, '1'); onDone(); }}
            style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}33`, background: 'none', border: 'none', cursor: 'pointer', marginTop: '12px' }}
          >
            דלג על המדריך
          </button>
        )}
      </div>
    </div>
  );
}

export function shouldShowTour(): boolean {
  return !localStorage.getItem(LS_KEY);
}
