import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

const BG    = '#050d0a';
const GOLD  = '#00e5c3';
const SAGE  = '#4A9C68';
const TEXT  = 'rgba(176,207,191,0.8)';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const HELP_CSS = `
@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,229,195,0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(0,229,195,0); }
}
@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.hp-callout {
  position: absolute;
  background: #00e5c3;
  color: #050d0a;
  border-radius: 20px;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 700;
  font-family: "Assistant", "Heebo", sans-serif;
  animation: popIn 0.4s ease both;
  z-index: 10;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.hp-pulse { animation: pulse 1.8s ease infinite; }
.hp-slide { animation: slideUp 0.35s ease both; }
@media (max-width: 640px) {
  .hp-mock { transform: scale(0.82); transform-origin: top center; margin-bottom: -10px !important; }
  .hp-navbtn { flex: 1 !important; }
}
`;

function Callout({ text, style }: { text: string; style: CSSProperties }) {
  return <div className="hp-callout" style={style}>{text}</div>;
}

// ── Mock screens ──────────────────────────────────────────────────────────────

function MockBiodynamic() {
  return (
    <div style={{ position: 'relative', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <div className="hp-pulse" style={{
          width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 38% 38%, #b0e8e0, #00e5c3, #00a08a)',
          boxShadow: '0 0 16px rgba(0,229,195,0.3)',
        }} />
        <div style={{
          flex: 1, borderRadius: '10px', padding: '9px 13px',
          background: 'rgba(0,229,195,0.1)',
          border: '1px solid rgba(0,229,195,0.25)',
        }}>
          <div style={{ fontFamily: ASST, fontSize: '10px', color: 'rgba(176,207,191,0.4)', marginBottom: '3px' }}>סוג היום</div>
          <div style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '16px', color: SAGE }}>🌿 עלים</div>
          <div style={{ fontFamily: ASST, fontSize: '11px', color: TEXT, marginTop: '2px' }}>יום מצוין לשתילת ירקות עלים</div>
        </div>
      </div>
      <div style={{
        borderRadius: '10px', padding: '10px 14px',
        background: 'rgba(0,229,195,0.05)',
        border: '1px solid rgba(0,229,195,0.12)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: ASST, fontSize: '13px', color: TEXT }}>ציון שתילה היום</span>
        <span style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '22px', color: GOLD }}>8/10</span>
      </div>
      <Callout text="לחץ לפרטים על שלב הירח" style={{ top: '-10px', right: '8px', animationDelay: '0s' }} />
      <Callout text="סוג היום קובע מה לעשות בגינה" style={{ top: '32px', left: '72px', animationDelay: '0.15s' }} />
    </div>
  );
}

function MockGardenMap() {
  return (
    <div style={{ position: 'relative', paddingBottom: '20px' }}>
      <div style={{
        display: 'flex', gap: '5px', marginBottom: '9px',
        background: 'rgba(9,20,16,0.7)', borderRadius: '8px', padding: '5px 8px',
        border: '1px solid rgba(0,229,195,0.08)',
      }}>
        {['🖊️ עט', '🌿 צמח', '🏠 מבנה', '🛣️ שביל'].map(t => (
          <div key={t} style={{
            fontFamily: ASST, fontSize: '11px', color: TEXT,
            background: 'rgba(0,229,195,0.07)', borderRadius: '5px',
            padding: '3px 7px', cursor: 'pointer',
          }}>{t}</div>
        ))}
      </div>
      <div style={{
        borderRadius: '10px', padding: '12px',
        background: 'rgba(0,229,195,0.06)',
        border: '1px solid rgba(0,229,195,0.12)',
        minHeight: '80px',
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignContent: 'flex-start',
      }}>
        {['🌹', '🍅', '🫑', '🥬', '🌻', '🍋'].map((em, i) => (
          <span key={i} style={{ fontSize: '22px', cursor: 'move' }}>{em}</span>
        ))}
      </div>
      <Callout text="בחר כלי מהסרגל" style={{ top: '-10px', right: '8px', animationDelay: '0s' }} />
      <Callout text="לחץ על המפה למקם צמח" style={{ top: '44px', left: '-5px', animationDelay: '0.12s' }} />
      <Callout text="גרור להזזה" style={{ bottom: '2px', right: '8px', animationDelay: '0.24s' }} />
    </div>
  );
}

function MockChat() {
  return (
    <div style={{ position: 'relative', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '72%' }}>
          <div style={{
            fontFamily: ASST, fontSize: '13px', color: '#050d0a',
            background: GOLD, borderRadius: '14px 14px 4px 14px',
            padding: '7px 11px',
          }}>מתי כדאי לשתול עגבניות? 🍅</div>
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '78%', display: 'flex', gap: '7px', alignItems: 'flex-end' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'radial-gradient(circle, #b0e8e0, #00e5c3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', overflow: 'hidden',
          }}>
            <img src="/chupchu_final.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div style={{
            fontFamily: ASST, fontSize: '13px', color: TEXT, lineHeight: 1.5,
            background: 'rgba(9,20,16,0.9)', border: '1px solid rgba(0,229,195,0.12)',
            borderRadius: '4px 14px 14px 14px', padding: '7px 11px',
          }}>
            בגינה שלך, השבוע יום עלים — עדיף לחכות ליום פרי ב-ד׳. ציון שתילה יהיה 9/10 🌟
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', gap: '6px',
        background: 'rgba(9,20,16,0.7)', borderRadius: '8px', padding: '7px 10px',
        border: '1px solid rgba(0,229,195,0.08)',
      }}>
        <div style={{ flex: 1, fontFamily: ASST, fontSize: '13px', color: 'rgba(176,207,191,0.3)' }}>שאל שאלה...</div>
        <div style={{ fontFamily: ASST, fontSize: '12px', color: GOLD, fontWeight: 700 }}>שלח ↩</div>
      </div>
      <Callout text="שאל כל שאלה על הגינה" style={{ bottom: '5px', right: '8px', animationDelay: '0s' }} />
      <Callout text="עונה לפי הגינה שלך" style={{ top: '30px', left: '36px', animationDelay: '0.15s' }} />
    </div>
  );
}

function MockTracker() {
  return (
    <div style={{ position: 'relative', paddingBottom: '20px' }}>
      <div style={{
        borderRadius: '10px', padding: '14px',
        background: 'rgba(9,20,16,0.5)',
        border: '2px dashed rgba(0,229,195,0.2)',
        textAlign: 'center', marginBottom: '10px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '4px' }}>📸</div>
        <div style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(176,207,191,0.4)' }}>לחץ לצילום צמח</div>
      </div>
      <div style={{ display: 'flex', gap: '7px' }}>
        {[
          { label: 'בריאות', val: '85%',  color: SAGE },
          { label: 'לחות',   val: 'נמוכה', color: GOLD },
          { label: 'משימה',  val: 'השקה',  color: '#EF745A' },
        ].map(c => (
          <div key={c.label} style={{
            flex: 1, borderRadius: '8px', padding: '8px 6px',
            background: 'rgba(9,20,16,0.8)',
            border: `1px solid ${c.color}33`, textAlign: 'center',
          }}>
            <div style={{ fontFamily: ASST, fontSize: '10px', color: 'rgba(176,207,191,0.4)', marginBottom: '2px' }}>{c.label}</div>
            <div style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '13px', color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>
      <Callout text="צלם את הצמח שלך" style={{ top: '-10px', right: '8px', animationDelay: '0s' }} />
      <Callout text="AI מנתח ומציע משימות" style={{ bottom: '2px', left: '-5px', animationDelay: '0.15s' }} />
    </div>
  );
}

function MockTasks() {
  const tasks = [
    { text: 'להשקות עגבניות',   badge: 'ביודינמי', color: SAGE,      done: true  },
    { text: 'לדשן שושנים',       badge: "צ'ופצ'ו",  color: GOLD,      done: false },
    { text: 'לבדוק עלי כורכום', badge: 'מעקב',     color: '#EF745A', done: false },
    { text: 'לגזום פטל',        badge: 'ביודינמי', color: SAGE,      done: false },
  ];
  return (
    <div style={{ position: 'relative', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {tasks.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            background: 'rgba(9,20,16,0.8)',
            border: '1px solid rgba(0,229,195,0.07)',
            borderRadius: '8px', padding: '7px 11px',
          }}>
            <div style={{
              width: 15, height: 15, borderRadius: '3px', flexShrink: 0,
              border: `1.5px solid ${t.color}`,
              background: t.done ? `${t.color}33` : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {t.done && <span style={{ fontSize: '9px', color: t.color }}>✓</span>}
            </div>
            <span style={{
              fontFamily: ASST, fontSize: '13px', flex: 1,
              color: t.done ? 'rgba(176,207,191,0.35)' : TEXT,
              textDecoration: t.done ? 'line-through' : 'none',
            }}>{t.text}</span>
            <span style={{
              fontFamily: ASST, fontSize: '10px', fontWeight: 700,
              padding: '2px 7px', borderRadius: '10px',
              background: `${t.color}1A`, color: t.color,
              border: `1px solid ${t.color}44`,
            }}>{t.badge}</span>
          </div>
        ))}
      </div>
      <Callout text="משימות מצ'ופצ'ו ומהמעקב" style={{ top: '-10px', right: '8px', animationDelay: '0s' }} />
      <Callout text="צבעים לפי מקור המשימה" style={{ bottom: '2px', left: '-5px', animationDelay: '0.15s' }} />
    </div>
  );
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'לוח ביודינמי',
    emoji: '🌕',
    text: 'כל יום מתחיל בלוח הביודינמי — שלב הירח, סוג היום (עלים/פרח/פרי/שורש), וציון שתילה מ-1 עד 10. צ׳ופצ׳ו ממליץ על פעולות בהתאם.',
    Mock: MockBiodynamic,
  },
  {
    title: 'מפת גינה',
    emoji: '🗺️',
    text: 'שרטט את הגינה שלך — הוסף צמחים, עצים, מבנים ושבילים. גרור ומקם הכל בדיוק. הגינה נשמרת אוטומטית.',
    Mock: MockGardenMap,
  },
  {
    title: "צ'ופצ'ו",
    emoji: '🌿',
    text: "צ'ופצ'ו מכיר את הגינה שלך, את הלוח הביודינמי ואת מזג האוויר. שאל אותו כל שאלה וקבל עצה מותאמת אישית.",
    Mock: MockChat,
  },
  {
    title: 'מעקב גידול',
    emoji: '📸',
    text: 'צלם את הצמחים שלך ו-AI ינתח אותם — בריאות הצמח, זיהוי בעיות, ומשימות טיפול מותאמות אישית.',
    Mock: MockTracker,
  },
  {
    title: 'לוח משימות',
    emoji: '✅',
    text: "כל המשימות במקום אחד — ביודינמיות, מצ'ופצ'ו, ממעקב הגידול. סמן כבוצע ועקוב אחר ההתקדמות.",
    Mock: MockTasks,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function HelpPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const { title, emoji, text, Mock } = STEPS[step];

  return (
    <div dir="rtl" style={{ backgroundColor: BG, minHeight: '100vh', color: TEXT, fontFamily: ASST }}>
      <style>{HELP_CSS}</style>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '36px 20px 72px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%', margin: '0 auto 14px',
            background: 'radial-gradient(circle at 40% 40%, #b0e8e0, #00e5c3, #C8960A)',
            overflow: 'hidden', boxShadow: '0 0 24px rgba(0,229,195,0.3)',
          }}>
            <img
              src="/chupchu_final.png"
              alt="צ'ופצ'ו"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h1 style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '26px', color: GOLD, margin: '0 0 6px' }}>
            מרכז העזרה
          </h1>
          <p style={{ fontFamily: ASST, fontSize: '14px', color: 'rgba(176,207,191,0.5)', margin: 0 }}>
            למד לגדל עם גינה חיה תוך כמה דקות
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                height: '8px',
                width: i === step ? '28px' : '8px',
                borderRadius: '4px',
                background: i === step ? GOLD : 'rgba(0,229,195,0.22)',
                cursor: 'pointer',
                transition: 'width 0.3s ease, background 0.3s ease',
                flexShrink: 0,
              }}
              title={s.title}
            />
          ))}
        </div>

        {/* Step content — key forces re-mount for slideUp animation */}
        <div key={step} className="hp-slide">

          {/* Step label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '19px', color: GOLD }}>
              {emoji} {title}
            </span>
            <span style={{
              fontFamily: ASST, fontSize: '11px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '10px',
              background: 'rgba(0,229,195,0.1)', color: 'rgba(0,229,195,0.7)',
              border: '1px solid rgba(0,229,195,0.18)',
              marginInlineStart: 'auto',
            }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Mock screen */}
          <div
            className="hp-mock"
            style={{
              background: 'rgba(9,20,16,0.45)',
              border: '1px solid rgba(0,229,195,0.1)',
              borderRadius: '14px',
              padding: '18px 16px 6px',
              marginBottom: '14px',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <Mock />
          </div>

          {/* Chupchu explanation card */}
          <div style={{
            background: 'rgba(9,20,16,0.65)',
            border: '1px solid rgba(0,229,195,0.1)',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 40% 40%, #b0e8e0, #00e5c3, #C8960A)',
              overflow: 'hidden',
            }}>
              <img
                src="/chupchu_final.png"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <div style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '13px', color: GOLD, marginBottom: '5px' }}>
                צ'ופצ'ו מסביר:
              </div>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: TEXT, lineHeight: 1.7, margin: 0 }}>
                {text}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
          {step > 0 && (
            <button
              className="hp-navbtn"
              onClick={() => setStep(s => s - 1)}
              style={{
                fontFamily: FRANK, fontWeight: 600, fontSize: '15px',
                padding: '12px 22px', borderRadius: '8px',
                border: '1px solid rgba(0,229,195,0.28)',
                background: 'transparent', color: GOLD,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,195,0.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              ← הקודם
            </button>
          )}
          <button
            className="hp-navbtn"
            onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : navigate('/')}
            style={{
              fontFamily: FRANK, fontWeight: 700, fontSize: '15px',
              padding: '12px 22px', borderRadius: '8px',
              border: 'none', background: GOLD, color: '#050d0a',
              cursor: 'pointer',
              flex: step === 0 ? undefined : 1,
              marginInlineStart: step === 0 ? 'auto' : undefined,
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {step < STEPS.length - 1 ? 'הבא ←' : 'התחל לגדל 🌱'}
          </button>
        </div>

      </div>
    </div>
  );
}
