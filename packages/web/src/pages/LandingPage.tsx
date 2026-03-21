import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD        = '#F5C840';
const SAGE_GRN    = '#7DC084';
const PARCHMENT   = '#EDE0C4';
const FOREST      = '#142B16';
const FOREST_DARK = '#0A160A';
const FOREST_MID  = '#1C3A1E';
const LEAF_GREEN  = '#B0D8A8';
const FRANK       = '"Frank Ruhl Libre", Georgia, serif';
const PLAYFAIR    = '"Playfair Display", Georgia, serif';
const ASSISTANT   = '"Assistant", "Heebo", sans-serif';

// Grain noise texture data URI
const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

// ── Global CSS ─────────────────────────────────────────────────────────────
const LP_CSS = `
@keyframes lp-float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-18px) scale(1.015); }
}
@keyframes lp-float-r {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(16px) scale(0.985); }
}
@keyframes lp-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes lp-pulse-moosh {
  0%, 100% { transform: scale(1);     box-shadow: 0 0 40px rgba(245,200,64,0.25); }
  50%       { transform: scale(1.025); box-shadow: 0 0 64px rgba(245,200,64,0.45); }
}
@keyframes fadeUp  { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
.animate-ready { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
.animate-done  { opacity: 1 !important; transform: translateY(0) !important; }
.lp-eyebrow    { opacity: 0; animation: fadeIn  0.6s ease 0.1s forwards; }
.lp-hero-line1 { opacity: 0; animation: fadeUp  0.8s ease 0.2s forwards; }
.lp-hero-line2 { opacity: 0; animation: fadeUp  0.8s ease 0.4s forwards; }
.lp-sub        { opacity: 0; animation: fadeUp  0.6s ease 0.6s forwards; }
.lp-ctas       { opacity: 0; animation: fadeUp  0.6s ease 0.8s forwards; }
.lp-card       { opacity: 0; animation: scaleIn 0.8s ease 0.5s forwards; }
.lp-orb-1      { opacity: 0; animation: fadeIn 2s ease 0.3s forwards, lp-float   8s ease-in-out 0s  infinite; }
.lp-orb-2      { opacity: 0; animation: fadeIn 2s ease 0.3s forwards, lp-float-r 9s ease-in-out -3s infinite; }
.lp-orb-3      { opacity: 0; animation: fadeIn 2s ease 0.3s forwards, lp-float  10s ease-in-out -5s infinite; }
.lp-wheel      { animation: lp-rotate  60s linear infinite; }
.lp-moosh      { animation: lp-pulse-moosh 3s ease-in-out infinite; }

.lp-feat-card {
  border: 1px solid rgba(125,192,132,0.2);
  transition: transform 0.3s ease-out, border-color 0.3s ease-out, box-shadow 0.3s ease-out;
}
.lp-feat-card:hover {
  transform: translateY(-5px);
  border-color: rgba(245,200,64,0.3);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}
.lp-price-card {
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
}
.lp-price-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}
.lp-cta-primary {
  transition: filter 0.2s ease-out, box-shadow 0.2s ease-out;
}
.lp-cta-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 8px 32px rgba(245,200,64,0.4) !important;
}
.lp-cta-outline {
  transition: border-color 0.2s, color 0.2s;
}
.lp-cta-outline:hover {
  border-color: ${GOLD} !important;
  color: ${GOLD} !important;
}
::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: ${FOREST}; }
::-webkit-scrollbar-thumb { background: #9B7A48; border-radius: 3px; }
`;

// ── Helpers ────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 8) return SAGE_GRN;
  if (score >= 6) return GOLD;
  if (score >= 4) return '#C4622A';
  return '#A33030';
}

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  style,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`animate-ready${visible ? ' animate-done' : ''}${className ? ` ${className}` : ''}`}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────
interface TodayPreview {
  score: number;
  dayType: string;
}

const DAY_TYPE_LABELS_HE: Record<string, string> = {
  fruit:  'יום פרי 🍅',
  flower: 'יום פרח 🌸',
  root:   'יום שורש 🥕',
  leaf:   'יום עלה 🥬',
};

const DAY_TYPE_LABELS_EN: Record<string, string> = {
  fruit:  'Fruit Day 🍅',
  flower: 'Flower Day 🌸',
  root:   'Root Day 🥕',
  leaf:   'Leaf Day 🥬',
};

interface Feature { icon: string; title: string; body: string; }

const FEATURES_HE: Feature[] = [
  {
    icon: '🌕',
    title: 'לוח ביודינמי יומי',
    body: 'לוח שנה מדויק המשלב את שיטות פודולינסקי ותון. ציון זריעה יומי, סוג יום, כיוון הירח.',
  },
  {
    icon: '🤖',
    title: 'מוש לבנה — המומחה שלך',
    body: 'בינה מלאכותית ביודינמית שמכירה את הגינה שלך. שאל, קבל עצה, גדל טוב יותר.',
  },
  {
    icon: '🌿',
    title: 'אנציקלופדיה של צמחים',
    body: '100+ צמחים עם עצות ביודינמיות, ימים מומלצים, ולוח זריעה לישראל.',
  },
];

const FEATURES_EN: Feature[] = [
  {
    icon: '🌕',
    title: 'Daily Biodynamic Calendar',
    body: 'Precise calendar combining Podolinsky and Thun methods. Daily sowing score, day type, moon direction.',
  },
  {
    icon: '🤖',
    title: 'Moosh Levana — Your Expert',
    body: 'Biodynamic AI that knows your garden. Ask, get advice, grow better.',
  },
  {
    icon: '🌿',
    title: 'Plant Encyclopedia',
    body: '100+ plants with biodynamic tips, recommended days, and an Israel sowing calendar.',
  },
];

interface PricingPlan {
  name: string;
  price: string | null;
  features: string[];
  cta: string;
  highlight: boolean;
  badge: string;
}

const PRICING_HE: PricingPlan[] = [
  {
    name: 'חינם לתמיד',
    price: null,
    features: ['לוח ביודינמי בסיסי', '5 שאלות למוש בחודש', 'אנציקלופדיה בסיסית'],
    cta: 'התחל עכשיו',
    highlight: false,
    badge: '',
  },
  {
    name: 'Grower',
    price: '9',
    features: ['לוח ביודינמי מלא', '30 שאלות למוש', 'גינה אישית', 'התראות יומיות'],
    cta: 'בחר תוכנית',
    highlight: false,
    badge: '',
  },
  {
    name: 'Gardener Pro',
    price: '14',
    features: ['הכל ב-Grower', 'שאלות ללא הגבלה', 'דוחות חודשיים', 'תמיכה מועדפת'],
    cta: 'בחר תוכנית',
    highlight: true,
    badge: 'הכי פופולרי',
  },
  {
    name: 'Professional',
    price: '49',
    features: ['הכל ב-Pro', 'API גישה', 'לוגו מותאם אישית', 'תמיכה ייעודית'],
    cta: 'בחר תוכנית',
    highlight: false,
    badge: '',
  },
];

const PRICING_EN: PricingPlan[] = [
  {
    name: 'Free Forever',
    price: null,
    features: ['Basic biodynamic calendar', '5 Moosh questions/month', 'Basic encyclopedia'],
    cta: 'Start Now',
    highlight: false,
    badge: '',
  },
  {
    name: 'Grower',
    price: '9',
    features: ['Full biodynamic calendar', '30 Moosh questions', 'Personal garden', 'Daily alerts'],
    cta: 'Choose Plan',
    highlight: false,
    badge: '',
  },
  {
    name: 'Gardener Pro',
    price: '14',
    features: ['Everything in Grower', 'Unlimited questions', 'Monthly reports', 'Priority support'],
    cta: 'Choose Plan',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Professional',
    price: '49',
    features: ['Everything in Pro', 'API access', 'Custom logo', 'Dedicated support'],
    cta: 'Choose Plan',
    highlight: false,
    badge: '',
  },
];

// ── Live biodynamic card ───────────────────────────────────────────────────
function TodayPreviewCard({ isHe }: { isHe: boolean }) {
  const [data, setData] = useState<TodayPreview | null>(null);

  useEffect(() => {
    fetch('/api/calendar/today')
      .then(r => r.json())
      .then(d => setData({ score: d.score ?? 7, dayType: d.dayType ?? 'fruit' }))
      .catch(() => setData({ score: 7, dayType: 'fruit' }));
  }, []);

  const preview = data ?? { score: 7, dayType: 'fruit' };

  const dayLabels = isHe ? DAY_TYPE_LABELS_HE : DAY_TYPE_LABELS_EN;

  const dateFormatted = new Date().toLocaleDateString(
    isHe ? 'he-IL' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jerusalem' },
  );

  return (
    <div
      className="lp-card"
      style={{
        background: 'rgba(20,43,22,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid rgba(245,200,64,0.2)`,
        borderRadius: '12px',
        padding: '24px 22px',
        maxWidth: '280px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      {/* Label */}
      <p style={{
        fontFamily: ASSISTANT,
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: GOLD,
        marginBottom: '14px',
      }}>
        {isHe ? 'היום בגינה שלך' : 'Today in Your Garden'}
      </p>

      {/* Date */}
      <p style={{
        fontFamily: FRANK,
        fontSize: '13px',
        color: `${PARCHMENT}99`,
        marginBottom: '16px',
      }}>
        {dateFormatted}
      </p>

      {/* Moon phase */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '14px',
      }}>
        <span style={{ fontSize: '22px' }}>🌕</span>
        <span style={{ fontFamily: ASSISTANT, fontSize: '13px', color: LEAF_GREEN }}>
          {isHe ? 'ירח מלא' : 'Full Moon'}
        </span>
      </div>

      {/* Day type */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'rgba(125,192,132,0.12)',
        border: '1px solid rgba(125,192,132,0.25)',
        borderRadius: '6px',
        padding: '6px 14px',
        marginBottom: '16px',
      }}>
        <span style={{ fontFamily: ASSISTANT, fontSize: '13px', color: SAGE_GRN }}>
          {dayLabels[preview.dayType] ?? preview.dayType}
        </span>
      </div>

      {/* Score badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: `${scoreColor(preview.score)}22`,
        border: `1px solid ${scoreColor(preview.score)}55`,
        borderRadius: '100px',
        padding: '5px 16px',
      }}>
        <span style={{
          fontFamily: FRANK,
          fontWeight: 700,
          fontSize: '20px',
          color: scoreColor(preview.score),
        }}>
          {preview.score}
        </span>
        <span style={{ fontFamily: ASSISTANT, fontSize: '12px', color: `${PARCHMENT}77` }}>
          / 10
        </span>
      </div>
    </div>
  );
}

// ── Lunar wheel SVG decoration ─────────────────────────────────────────────
function LunarWheel() {
  return (
    <svg
      className="lp-wheel"
      width="500"
      height="500"
      viewBox="0 0 500 500"
      style={{
        position: 'absolute',
        top: '-120px',
        insetInlineEnd: '-120px',
        opacity: 0.14,
        pointerEvents: 'none',
      }}
    >
      <circle cx="250" cy="250" r="220" fill="none" stroke={GOLD} strokeWidth="1" strokeDasharray="12 8" />
      <circle cx="250" cy="250" r="190" fill="none" stroke={GOLD} strokeWidth="0.5" strokeDasharray="4 14" opacity="0.5" />
      <circle cx="250" cy="250" r="155" fill="none" stroke={GOLD} strokeWidth="0.75" strokeDasharray="2 10" opacity="0.3" />
      <circle cx="250" cy="250" r="8" fill={GOLD} opacity="0.6" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function LandingPage() {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const features = isHe ? FEATURES_HE : FEATURES_EN;
  const pricing  = isHe ? PRICING_HE  : PRICING_EN;

  // Set body background while on landing page
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = FOREST;
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  function scrollToFeatures(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <style>{LP_CSS}</style>

      {/* Full-screen noise overlay — covers entire page, pointer-events none */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat: 'repeat',
          opacity: 0.4,
        }}
      />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundImage: [
            'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(74,128,80,0.25) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 60% at 20% 80%, rgba(155,122,72,0.2) 0%, transparent 60%)',
            'linear-gradient(160deg, rgba(20,43,22,0.52) 0%, rgba(10,22,10,0.42) 50%, rgba(8,20,10,0.56) 100%)',
            'url("https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1920&q=80")',
          ].join(', '),
          backgroundSize: 'auto, auto, auto, cover',
          backgroundPosition: 'center, center, center, center',
        }}
      >
        {/* Floating orbs */}
        <div className="lp-orb-1" style={{
          position: 'absolute', top: '8%', insetInlineEnd: '5%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,128,80,0.18) 0%, transparent 70%)',
          filter: 'blur(48px)', pointerEvents: 'none',
        }} />
        <div className="lp-orb-2" style={{
          position: 'absolute', bottom: '10%', insetInlineStart: '3%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,200,64,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div className="lp-orb-3" style={{
          position: 'absolute', top: '40%', insetInlineEnd: '20%',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(176,216,168,0.1) 0%, transparent 70%)',
          filter: 'blur(32px)', pointerEvents: 'none',
        }} />

        {/* Rotating lunar wheel */}
        <LunarWheel />

        {/* Hero content */}
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          width: '100%',
          padding: '96px 28px 80px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '56px',
          flexWrap: 'wrap',
        }}>
          {/* Text column */}
          <div style={{ flex: '1 1 340px', maxWidth: '560px' }}>
            {/* Eyebrow */}
            <p
              className="lp-eyebrow"
              style={{
                fontFamily: ASSISTANT,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.2em',
                textTransform: 'uppercase' as const,
                color: GOLD,
                marginBottom: '20px',
              }}
            >
              {isHe ? 'לוח ביודינמי · מרץ 2026' : 'Biodynamic Calendar · March 2026'}
            </p>

            {/* Headline */}
            <h1 style={{
              marginBottom: '20px',
              border: '1px solid rgba(245,200,64,0.4)',
              borderRadius: '4px',
              padding: '16px 20px',
            }}>
              <span
                className="lp-hero-line1"
                style={{
                  display: 'block',
                  fontFamily: FRANK,
                  fontWeight: 700,
                  fontSize: 'clamp(36px, 5.5vw, 88px)',
                  lineHeight: 1.15,
                  color: PARCHMENT,
                  textShadow: '0 2px 40px rgba(0,0,0,0.5)',
                }}
              >
                {isHe ? 'הגינה שלך' : 'Your Garden'}
              </span>
              <em
                className="lp-hero-line2"
                style={{
                  display: 'block',
                  fontFamily: PLAYFAIR,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(38px, 6vw, 96px)',
                  lineHeight: 1.15,
                  color: GOLD,
                  textShadow: '0 2px 40px rgba(0,0,0,0.5)',
                }}
              >
                {isHe ? 'חיה ונושמת' : 'Alive and Breathing'}
              </em>
            </h1>

            {/* Sub */}
            <p
              className="lp-sub"
              style={{
                fontFamily: ASSISTANT,
                fontWeight: 300,
                fontSize: '1.1rem',
                lineHeight: 1.75,
                color: `${PARCHMENT}B3`,
                maxWidth: '480px',
                marginBottom: '36px',
              }}
            >
              {isHe
                ? 'הביאו את חוכמת החקלאות הביודינמית לגינה הביתית שלכם. לוחות ירח, תכנון חכם, וניתוח מבוסס בינה מלאכותית — לכל גנן, בכל רמה.'
                : 'Bring the wisdom of biodynamic agriculture to your home garden. Moon calendars, smart planning, and AI-powered analysis — for every gardener, at every level.'}
            </p>

            {/* CTAs */}
            <div
              className="lp-ctas"
              style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
            >
              <Link
                to="/signup"
                className="lp-cta-primary"
                style={{
                  display: 'inline-block',
                  fontFamily: FRANK,
                  fontWeight: 600,
                  fontSize: '15px',
                  backgroundColor: GOLD,
                  color: FOREST,
                  padding: '12px 32px',
                  borderRadius: '3px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(245,200,64,0.25)',
                  letterSpacing: '0.02em',
                }}
              >
                {isHe ? 'התחל בחינם' : 'Start for Free'}
              </Link>

              <a
                href="#features"
                onClick={scrollToFeatures}
                className="lp-cta-outline"
                style={{
                  display: 'inline-block',
                  fontFamily: ASSISTANT,
                  fontWeight: 400,
                  fontSize: '15px',
                  backgroundColor: 'transparent',
                  color: PARCHMENT,
                  padding: '11px 28px',
                  borderRadius: '3px',
                  border: `1px solid rgba(245,200,64,0.4)`,
                  textDecoration: 'none',
                }}
              >
                {isHe ? 'ראה איך זה עובד' : 'See How It Works'}
              </a>
            </div>
          </div>

          {/* Live card */}
          <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <TodayPreviewCard isHe={isHe} />
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════ */}
      <section
        id="features"
        style={{ backgroundColor: FOREST_MID, padding: '80px 0' }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 28px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <p style={{
                fontFamily: ASSISTANT,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase' as const,
                color: GOLD,
                marginBottom: '14px',
              }}>
                {isHe ? 'מה מחכה לך' : 'What Awaits You'}
              </p>
              <h2 style={{
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize: 'clamp(26px, 3.5vw, 40px)',
                color: PARCHMENT,
                lineHeight: 1.3,
              }}>
                {isHe ? (
                  <>
                    כל מה שגינה{' '}
                    <em style={{ fontStyle: 'normal', color: GOLD }}>ביודינמית</em>{' '}
                    צריכה
                  </>
                ) : (
                  <>
                    Everything a{' '}
                    <em style={{ fontStyle: 'normal', color: GOLD }}>Biodynamic</em>{' '}
                    Garden Needs
                  </>
                )}
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', flexWrap: 'wrap' }}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 120} style={{ flex: '1 1 260px' }}>
                <div
                  className="lp-feat-card"
                  style={{
                    background: 'rgba(20,43,22,0.6)',
                    borderRadius: '10px',
                    padding: '36px 28px',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    backgroundColor: 'rgba(125,192,132,0.15)',
                    border: '1px solid rgba(125,192,132,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', marginBottom: '20px',
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{
                    fontFamily: FRANK,
                    fontWeight: 600,
                    fontSize: '19px',
                    color: PARCHMENT,
                    marginBottom: '12px',
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontFamily: ASSISTANT,
                    fontWeight: 300,
                    fontSize: '15px',
                    color: SAGE_GRN,
                    lineHeight: 1.8,
                  }}>
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MOOSH INTRODUCTION ════════════════════════════════════════════ */}
      <section style={{ backgroundColor: FOREST, padding: '80px 0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 28px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '56px',
            flexWrap: 'wrap',
          }}>
            {/* Avatar column */}
            <Reveal style={{
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
                <div
                  className="lp-moosh"
                  style={{
                    width: '140px', height: '140px', borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, #F0D060, ${GOLD})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '64px',
                    boxShadow: '0 0 40px rgba(245,200,64,0.25)',
                    marginBottom: '16px',
                  }}
                >
                  🌕
                </div>
                <p style={{
                  fontFamily: FRANK,
                  fontStyle: 'italic',
                  fontSize: '22px',
                  color: GOLD,
                  marginBottom: '4px',
                }}>
                  {isHe ? 'מוש לבנה' : 'Moosh Levana'}
                </p>
                <p style={{ fontFamily: ASSISTANT, fontSize: '13px', color: LEAF_GREEN }}>
                  {isHe ? 'סבא הירח שלך' : 'Your Moon Elder'}
                </p>
              </Reveal>

              {/* Description */}
              <Reveal delay={200} style={{ flex: '1 1 300px' }}>
                <h2 style={{
                  fontFamily: FRANK,
                  fontStyle: 'italic',
                  fontSize: 'clamp(24px, 3vw, 36px)',
                  color: PARCHMENT,
                  marginBottom: '18px',
                  lineHeight: 1.3,
                  fontWeight: 400,
                }}>
                  {isHe ? 'שלום! אני מוש לבנה' : 'Hello! I am Moosh Levana'}
                </h2>
                <p style={{
                  fontFamily: ASSISTANT,
                  fontWeight: 300,
                  fontSize: '17px',
                  lineHeight: 1.9,
                  color: `${PARCHMENT}CC`,
                  marginBottom: '28px',
                }}>
                  {isHe
                    ? 'גדלתי בגליל וחקרתי חקלאות ביודינמית למעלה מ-20 שנה. עבדתי בחוות ביודינמיות בארץ ובפרובנס, ולמדתי מהאדמה, מהירח, ומהצמחים עצמם. עכשיו אני כאן כדי לעזור לגינה שלך לפרוח.'
                    : 'I grew up in the Galilee and studied biodynamic farming for over 20 years. I worked on biodynamic farms in Israel and Provence, learning from the soil, the moon, and the plants themselves. Now I\'m here to help your garden flourish.'}
                </p>

                {/* Chat bubble */}
                <div style={{
                  background: 'rgba(28,58,30,0.8)',
                  border: `1px solid rgba(245,200,64,0.15)`,
                  borderInlineStart: `3px solid ${GOLD}`,
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}>
                  <p style={{
                    fontFamily: PLAYFAIR,
                    fontStyle: 'italic',
                    fontSize: '15px',
                    lineHeight: 1.75,
                    color: `${PARCHMENT}DD`,
                  }}>
                    {isHe
                      ? 'היום הוא יום פרי 🍅 — הזמן המושלם לשתול עגבניות ופלפלים. הירח יורד, הארץ נושמת פנימה.'
                      : 'Today is a Fruit Day 🍅 — the perfect time to plant tomatoes and peppers. The moon is descending, the earth breathes inward.'}
                  </p>
                </div>
              </Reveal>
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: FOREST_MID, padding: '80px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 28px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '52px' }}>
              <p style={{
                fontFamily: ASSISTANT,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase' as const,
                color: GOLD,
                marginBottom: '14px',
              }}>
                {isHe ? 'תמחור' : 'Pricing'}
              </p>
              <h2 style={{
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize: 'clamp(26px, 3.5vw, 40px)',
                color: PARCHMENT,
              }}>
                {isHe ? 'בחר את התוכנית שלך' : 'Choose Your Plan'}
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '20px',
            overflowX: 'auto',
            paddingBottom: '8px',
            alignItems: 'flex-start',
          }}>
            {pricing.map((plan, i) => (
              <Reveal
                key={plan.name}
                delay={i * 80}
                style={{
                  flex: '1 1 200px',
                  minWidth: '200px',
                  transform: plan.highlight ? 'scale(1.02)' : undefined,
                }}
              >
                <div
                  className="lp-price-card"
                  style={{
                    position: 'relative',
                    background: plan.highlight
                      ? 'rgba(28,58,30,0.95)'
                      : 'rgba(20,43,22,0.6)',
                    borderRadius: '10px',
                    border: plan.highlight
                      ? `1px solid ${GOLD}`
                      : '1px solid rgba(125,192,132,0.18)',
                    boxShadow: plan.highlight
                      ? `0 8px 48px rgba(245,200,64,0.15)`
                      : 'none',
                    padding: plan.highlight ? '44px 24px 28px' : '32px 24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {plan.highlight && plan.badge && (
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: GOLD,
                      color: FOREST,
                      fontFamily: FRANK,
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '4px 18px',
                      borderRadius: '100px',
                      whiteSpace: 'nowrap',
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: FRANK,
                    fontWeight: 700,
                    fontSize: '18px',
                    color: PARCHMENT,
                    marginBottom: '12px',
                  }}>
                    {plan.name}
                  </h3>

                  <div style={{ marginBottom: '24px' }}>
                    {plan.price ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                        <span style={{
                          fontFamily: ASSISTANT,
                          fontSize: '18px',
                          fontWeight: 300,
                          color: GOLD,
                          opacity: 0.7,
                          lineHeight: 1,
                        }}>
                          ₪
                        </span>
                        <span style={{
                          fontFamily: FRANK,
                          fontWeight: 700,
                          fontSize: '48px',
                          lineHeight: 1,
                          color: GOLD,
                        }}>
                          {plan.price}
                        </span>
                        <span style={{
                          fontFamily: ASSISTANT,
                          fontSize: '13px',
                          color: `${PARCHMENT}66`,
                          marginInlineStart: '4px',
                        }}>
                          {isHe ? '/חודש' : '/mo'}
                        </span>
                      </div>
                    ) : (
                      <span style={{
                        fontFamily: FRANK,
                        fontWeight: 700,
                        fontSize: '36px',
                        color: SAGE_GRN,
                      }}>
                        {isHe ? 'חינם' : 'Free'}
                      </span>
                    )}
                  </div>

                  <ul style={{ flex: 1, marginBottom: '24px', listStyle: 'none', padding: 0 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontFamily: ASSISTANT,
                        fontSize: '14px',
                        color: SAGE_GRN,
                        lineHeight: 2,
                      }}>
                        <span style={{ color: SAGE_GRN, flexShrink: 0, fontWeight: 700 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      fontFamily: FRANK,
                      fontWeight: 600,
                      fontSize: '15px',
                      backgroundColor: plan.highlight ? GOLD : 'transparent',
                      color: plan.highlight ? FOREST : GOLD,
                      border: `1px solid ${plan.highlight ? GOLD : 'rgba(245,200,64,0.4)'}`,
                      padding: '12px',
                      borderRadius: '3px',
                      textDecoration: 'none',
                      transition: 'filter 0.2s, background-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      if (plan.highlight) {
                        el.style.filter = 'brightness(1.1)';
                      } else {
                        el.style.backgroundColor = 'rgba(245,200,64,0.1)';
                        el.style.borderColor = GOLD;
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.filter = 'none';
                      if (!plan.highlight) {
                        el.style.backgroundColor = 'transparent';
                        el.style.borderColor = 'rgba(245,200,64,0.4)';
                      }
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${FOREST_MID} 0%, ${FOREST_DARK} 70%)`,
          padding: '100px 0',
          textAlign: 'center',
        }}
      >
        {/* Large moon decoration */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,200,64,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px', height: '300px',
          borderRadius: '50%',
          border: '1px solid rgba(245,200,64,0.08)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '0 28px' }}>
          <Reveal>
            <p style={{
              fontFamily: PLAYFAIR,
              fontStyle: 'italic',
              fontSize: 'clamp(22px, 3.5vw, 40px)',
              color: GOLD,
              lineHeight: 1.5,
              marginBottom: '16px',
            }}>
              {isHe ? (
                <>
                  "הגינה מחכה לך.
                  <br />
                  היא תמיד שם."
                </>
              ) : (
                <>
                  "The garden is waiting for you.
                  <br />
                  It is always there."
                </>
              )}
            </p>
            <p style={{
              fontFamily: ASSISTANT,
              fontWeight: 300,
              fontSize: '18px',
              color: `${PARCHMENT}66`,
              marginBottom: '48px',
            }}>
              — {isHe ? 'מוש לבנה' : 'Moosh Levana'}
            </p>
            <Link
              to="/signup"
              className="lp-cta-primary"
              style={{
                display: 'inline-block',
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize: '18px',
                backgroundColor: GOLD,
                color: FOREST,
                padding: '16px 52px',
                borderRadius: '3px',
                textDecoration: 'none',
                boxShadow: '0 4px 32px rgba(245,200,64,0.25)',
                letterSpacing: '0.02em',
              }}
            >
              {isHe ? 'התחל עכשיו — בחינם' : 'Start Now — Free'}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
