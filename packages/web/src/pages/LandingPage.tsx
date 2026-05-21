import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChupChuChat } from '../components/chupchu/ChupChuChat';

// ── Design tokens ──────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_LIFT = '#0e1e17';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const BIO_AMBER  = '#ffb830';
const BIO_ROSE   = '#ff5c8a';
const BIO_VIOLET = '#a78bfa';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const SYNE       = "'Syne', sans-serif";
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';

// Leaf-vein SVG tile background (data URL)
const LEAF_VEIN_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cpath d='M80 0 Q85 40 80 80 Q75 120 80 160 M80 80 Q110 60 140 40 M80 80 Q50 60 20 40 M80 80 Q115 100 130 130 M80 80 Q45 100 30 130' stroke='%2300e5c3' stroke-width='0.5' fill='none' opacity='0.07'/%3E%3C/svg%3E")`;

// ── Global CSS ─────────────────────────────────────────────────────────────
const LP_CSS = `
@keyframes aurora-drift {
  0%   { transform: translateX(0) scaleY(1); }
  50%  { transform: translateX(6%) scaleY(1.08); }
  100% { transform: translateX(0) scaleY(1); }
}
@keyframes aurora-drift-r {
  0%   { transform: translateX(0) scaleY(1); }
  50%  { transform: translateX(-5%) scaleY(0.94); }
  100% { transform: translateX(0) scaleY(1); }
}
@keyframes fadeUp  { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
@keyframes lp-float {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-14px); }
}
@keyframes lp-glow-pulse {
  0%,100% { box-shadow: 0 0 16px rgba(0,229,195,0.25); }
  50%      { box-shadow: 0 0 36px rgba(0,229,195,0.55); }
}
@keyframes dot-travel {
  0%   { top: 0; }
  100% { top: 100%; }
}
@keyframes chupchu-float {
  0%,100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-10px) rotate(1deg); }
}
@keyframes score-ring {
  from { stroke-dashoffset: 226; }
  to   { stroke-dashoffset: var(--ring-offset, 60); }
}

.animate-ready { opacity:0; transform:translateY(28px); transition:opacity 0.7s ease, transform 0.7s ease; }
.animate-done  { opacity:1 !important; transform:translateY(0) !important; }

.lp-eyebrow    { opacity:0; animation: fadeIn  0.6s ease 0.1s forwards; }
.lp-hero-line1 { opacity:0; animation: fadeUp  0.8s ease 0.2s forwards; }
.lp-hero-line2 { opacity:0; animation: fadeUp  0.8s ease 0.4s forwards; }
.lp-sub        { opacity:0; animation: fadeUp  0.6s ease 0.6s forwards; }
.lp-ctas       { opacity:0; animation: fadeUp  0.6s ease 0.8s forwards; }
.lp-trust      { opacity:0; animation: fadeUp  0.5s ease 1.0s forwards; }
.lp-card       { opacity:0; animation: scaleIn 0.9s ease 0.5s forwards; }

.lp-feat-card {
  background: ${NIGHT_CARD};
  border: 1px solid rgba(0,229,195,0.12);
  border-radius: 16px;
  padding: 32px 26px;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  cursor: default;
}
.lp-feat-card:hover {
  transform: translateY(-6px);
  border-color: rgba(0,229,195,0.35);
  box-shadow: 0 20px 60px rgba(0,229,195,0.08);
}
.lp-price-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.lp-price-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 24px 64px rgba(0,229,195,0.12);
}
.lp-cta-primary {
  transition: filter 0.2s ease, box-shadow 0.2s ease;
}
.lp-cta-primary:hover {
  filter: brightness(1.08);
  box-shadow: 0 8px 36px rgba(0,229,195,0.45) !important;
}
.lp-cta-outline {
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}
.lp-cta-outline:hover {
  border-color: ${BIO_CYAN} !important;
  color: ${BIO_CYAN} !important;
  background-color: rgba(0,229,195,0.06) !important;
}

.lp-step-dot {
  width: 48px; height: 48px; border-radius: 50%;
  border: 2px solid ${BIO_CYAN};
  background: ${NIGHT_LIFT};
  display: flex; align-items: center; justify-content: center;
  font-family: ${SYNE}; font-weight: 700; font-size: 18px; color: ${BIO_CYAN};
  position: relative; z-index: 2;
  box-shadow: 0 0 16px rgba(0,229,195,0.2);
  flex-shrink: 0;
}

::-webkit-scrollbar       { width: 5px; }
::-webkit-scrollbar-track { background: ${NIGHT}; }
::-webkit-scrollbar-thumb { background: rgba(0,229,195,0.25); border-radius: 3px; }

@media (max-width: 900px) {
  .lp-hero-chupchu-col { display: none !important; }
}
@media (max-width: 768px) {
  .lp-hero-chupchu { display: none !important; }
  .lp-step-connector { display: none !important; }
  .lp-chupchu-demo-wrap { max-width: 100%; }
}

@keyframes chupchu-section-glow {
  0%,100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.8; transform: scale(1.05); }
}
.lp-chupchu-section {
  position: relative;
  overflow: hidden;
}
.lp-chupchu-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,229,195,0.06) 0%, transparent 70%);
  animation: chupchu-section-glow 6s ease-in-out infinite;
  pointer-events: none;
}
.lp-chupchu-demo-wrap {
  max-width: 680px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}
.lp-chupchu-demo-wrap::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(0,229,195,0.3), rgba(170,255,0,0.15), rgba(0,229,195,0.1));
  z-index: -1;
  filter: blur(1px);
}
.lp-chupchu-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(0,229,195,0.08);
  border: 1px solid rgba(0,229,195,0.25);
  border-radius: 100px;
  font-family: ${DM_SANS};
  font-size: 13px;
  color: ${BIO_CYAN};
  margin-bottom: 20px;
}
.lp-chupchu-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
`;

// ── Particle canvas ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    resize();
    window.addEventListener('resize', resize);

    // Fireflies
    const flies = Array.from({ length: 42 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.55, vy: (Math.random() - 0.5) * 0.55,
      r: Math.random() * 1.8 + 0.8,
      baseA: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      trail: [] as [number, number][],
    }));

    // Leaf particles
    const leafColors = [BIO_LIME, BIO_CYAN, '#55ff88'];
    const leaves = Array.from({ length: 20 }, () => ({
      x: Math.random() * W, y: H + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.7, vy: -(Math.random() * 0.45 + 0.25),
      angle: Math.random() * Math.PI * 2, av: (Math.random() - 0.5) * 0.018,
      size: Math.random() * 7 + 5,
      a: Math.random() * 0.3 + 0.08,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
    }));

    let raf: number;
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      t++;

      // Fireflies
      for (const f of flies) {
        f.trail.push([f.x, f.y]);
        if (f.trail.length > 14) f.trail.shift();

        f.vx += (Math.random() - 0.5) * 0.04;
        f.vy += (Math.random() - 0.5) * 0.04;
        f.vx = Math.max(-0.9, Math.min(0.9, f.vx));
        f.vy = Math.max(-0.9, Math.min(0.9, f.vy));
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
        if (f.y < 0) f.y = H; if (f.y > H) f.y = 0;

        const pulse = 0.45 + 0.55 * Math.sin(t * 0.038 + f.phase);
        const alpha = f.baseA * pulse;

        // Trail
        for (let i = 0; i < f.trail.length; i++) {
          const ta = (i / f.trail.length) * alpha * 0.25;
          ctx.beginPath();
          ctx.arc(f.trail[i][0], f.trail[i][1], f.r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,229,195,${ta})`;
          ctx.fill();
        }

        // Core glow
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 4);
        grad.addColorStop(0, `rgba(0,229,195,${alpha})`);
        grad.addColorStop(0.4, `rgba(0,229,195,${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(0,229,195,0)`);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,255,245,${alpha})`;
        ctx.fill();
      }

      // Leaves
      for (const l of leaves) {
        l.x += l.vx + Math.sin(t * 0.008 + l.angle) * 0.25;
        l.y += l.vy;
        l.angle += l.av;
        if (l.y < -70) { l.x = Math.random() * W; l.y = H + 60; }

        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size * 0.38, l.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = `${l.color}22`;
        ctx.fill();
        ctx.strokeStyle = `${l.color}${Math.round(l.a * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        // vein
        ctx.beginPath();
        ctx.moveTo(0, -l.size); ctx.lineTo(0, l.size);
        ctx.strokeStyle = `${l.color}${Math.round(l.a * 0.6 * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        opacity: 0.7,
      }}
    />
  );
}

// ── Aurora bands ───────────────────────────────────────────────────────────
function AuroraBands() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '-10%', left: '-20%', width: '80%', height: '45%',
        background: `radial-gradient(ellipse, rgba(0,229,195,0.07) 0%, transparent 70%)`,
        filter: 'blur(60px)',
        animation: 'aurora-drift 18s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '-15%', width: '60%', height: '40%',
        background: `radial-gradient(ellipse, rgba(170,255,0,0.04) 0%, transparent 70%)`,
        filter: 'blur(80px)',
        animation: 'aurora-drift-r 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-5%', left: '10%', width: '70%', height: '35%',
        background: `radial-gradient(ellipse, rgba(0,229,195,0.05) 0%, transparent 70%)`,
        filter: 'blur(70px)',
        animation: 'aurora-drift 26s ease-in-out 4s infinite',
      }} />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 8) return BIO_CYAN;
  if (score >= 6) return BIO_LIME;
  if (score >= 4) return BIO_AMBER;
  return BIO_ROSE;
}

function useScrollReveal(threshold = 0.12) {
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
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────
interface TodayPreview { score: number; dayType: string; }

const DAY_TYPE_LABELS_HE: Record<string, string> = {
  fruit: 'יום פרי', flower: 'יום פרח', root: 'יום שורש', leaf: 'יום עלה',
};
const DAY_TYPE_LABELS_EN: Record<string, string> = {
  fruit: 'Fruit Day', flower: 'Flower Day', root: 'Root Day', leaf: 'Leaf Day',
};
const DAY_TYPE_COLORS: Record<string, string> = {
  fruit: BIO_AMBER, flower: BIO_ROSE, root: '#c8a96e', leaf: BIO_LIME,
};

interface Feature { icon: string; title: string; body: string; accent: string; }

const FEATURES_HE: Feature[] = [
  { icon: '🌕', title: 'לוח ביודינמי יומי', body: 'לוח שנה מדויק המשלב את שיטות פודולינסקי ותון. ציון זריעה יומי, סוג יום, כיוון הירח.', accent: BIO_CYAN },
  { icon: '🤖', title: "צ'ופצ'ו — המומחה שלך", body: 'בינה מלאכותית ביודינמית שמכירה את הגינה שלך. שאל, קבל עצה, גדל טוב יותר.', accent: BIO_VIOLET },
  { icon: '🌿', title: 'אנציקלופדיה של צמחים', body: '100+ צמחים עם עצות ביודינמיות, ימים מומלצים, ולוח זריעה לישראל.', accent: BIO_LIME },
];

const FEATURES_EN: Feature[] = [
  { icon: '🌕', title: 'Daily Biodynamic Calendar', body: 'Precise calendar combining Podolinsky and Thun methods. Daily sowing score, day type, moon direction.', accent: BIO_CYAN },
  { icon: '🤖', title: 'ChupChu — Your Expert', body: 'Biodynamic AI that knows your garden. Ask, get advice, grow better.', accent: BIO_VIOLET },
  { icon: '🌿', title: 'Plant Encyclopedia', body: '100+ plants with biodynamic tips, recommended days, and an Israel sowing calendar.', accent: BIO_LIME },
];

interface PricingPlan {
  name: string; price: string | null; features: string[];
  cta: string; highlight: boolean; badge: string; accent: string;
}

const PRICING_HE: PricingPlan[] = [
  {
    name: 'חינם לתמיד', price: null,
    features: ['לוח ביודינמי בסיסי', "5 שאלות לצ'ופצ'ו בחודש", 'אנציקלופדיה בסיסית'],
    cta: 'התחל עכשיו', highlight: false, badge: '', accent: MUTED,
  },
  {
    name: 'Grower', price: '9',
    features: ['לוח ביודינמי מלא', "30 שאלות לצ'ופצ'ו", 'גינה אישית', 'התראות יומיות'],
    cta: 'בחר תוכנית', highlight: false, badge: '', accent: BIO_CYAN,
  },
  {
    name: 'Gardener Pro', price: '14',
    features: ['הכל ב-Grower', 'שאלות ללא הגבלה', 'דוחות חודשיים', 'תמיכה מועדפת'],
    cta: 'בחר תוכנית', highlight: true, badge: 'הכי פופולרי', accent: BIO_CYAN,
  },
  {
    name: 'Professional', price: '49',
    features: ['הכל ב-Pro', 'API גישה', 'לוגו מותאם אישית', 'תמיכה ייעודית'],
    cta: 'בחר תוכנית', highlight: false, badge: '', accent: BIO_VIOLET,
  },
];

const PRICING_EN: PricingPlan[] = [
  {
    name: 'Free Forever', price: null,
    features: ['Basic biodynamic calendar', '5 ChupChu questions/month', 'Basic encyclopedia'],
    cta: 'Start Now', highlight: false, badge: '', accent: MUTED,
  },
  {
    name: 'Grower', price: '9',
    features: ['Full biodynamic calendar', '30 ChupChu questions', 'Personal garden', 'Daily alerts'],
    cta: 'Choose Plan', highlight: false, badge: '', accent: BIO_CYAN,
  },
  {
    name: 'Gardener Pro', price: '14',
    features: ['Everything in Grower', 'Unlimited questions', 'Monthly reports', 'Priority support'],
    cta: 'Choose Plan', highlight: true, badge: 'Most Popular', accent: BIO_CYAN,
  },
  {
    name: 'Professional', price: '49',
    features: ['Everything in Pro', 'API access', 'Custom logo', 'Dedicated support'],
    cta: 'Choose Plan', highlight: false, badge: '', accent: BIO_VIOLET,
  },
];

const STEPS_HE = [
  { n: '1', title: 'פתח את הלוח', body: 'ראה את ציון הזריעה של היום, סוג היום הביודינמי, ושלב הירח — הכל במקום אחד.' },
  { n: '2', title: "שאל את צ'ופצ'ו", body: 'שאל שאלות על הגינה שלך, קבל עצות מותאמות אישית לפי הגינה והעונה.' },
  { n: '3', title: 'גדל בהרמוניה', body: 'תכנן זריעה, השקיה וטיפול לפי קצבי הטבע. הגינה שלך תפרח.' },
];

const STEPS_EN = [
  { n: '1', title: 'Open the Calendar', body: 'See today\'s sowing score, biodynamic day type, and moon phase — all in one place.' },
  { n: '2', title: 'Ask ChupChu', body: 'Ask questions about your garden, get personalized advice for your space and season.' },
  { n: '3', title: 'Grow in Harmony', body: 'Plan sowing, watering, and care by nature\'s rhythms. Your garden will flourish.' },
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
  const dayColor  = DAY_TYPE_COLORS[preview.dayType] ?? BIO_AMBER;
  const sc        = scoreColor(preview.score);

  const dateFormatted = new Date().toLocaleDateString(
    isHe ? 'he-IL' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jerusalem' },
  );

  return (
    <div
      className="lp-card"
      style={{
        background: `linear-gradient(135deg, ${NIGHT_CARD} 0%, ${NIGHT_LIFT} 100%)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid rgba(0,229,195,0.18)`,
        borderRadius: '20px',
        padding: '28px 24px',
        maxWidth: '290px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,195,0.08)',
        animation: 'lp-glow-pulse 4s ease-in-out infinite',
      }}
    >
      <p style={{
        fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase' as const,
        color: BIO_CYAN, marginBottom: '16px',
      }}>
        {isHe ? 'היום בגינה שלך' : 'Today in Your Garden'}
      </p>

      <p style={{ fontFamily: FRANK, fontSize: '12px', color: TEXT_MID, marginBottom: '20px', opacity: 0.7 }}>
        {dateFormatted}
      </p>

      {/* Moon */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', marginBottom: '16px',
      }}>
        <span style={{ fontSize: '20px' }}>🌕</span>
        <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID }}>
          {isHe ? 'ירח מלא' : 'Full Moon'}
        </span>
      </div>

      {/* Day type chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        backgroundColor: `${dayColor}18`,
        border: `1px solid ${dayColor}44`,
        borderRadius: '100px', padding: '5px 16px', marginBottom: '18px',
      }}>
        <span style={{ fontFamily: DM_SANS, fontSize: '13px', fontWeight: 600, color: dayColor }}>
          {dayLabels[preview.dayType] ?? preview.dayType}
        </span>
      </div>

      {/* Score */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke={`${sc}22`} strokeWidth="6" />
          <circle
            cx="40" cy="40" r="32" fill="none" stroke={sc} strokeWidth="6"
            strokeLinecap="round" strokeDasharray="201"
            strokeDashoffset={201 - (201 * preview.score / 10)}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <span style={{ fontFamily: SYNE, fontWeight: 700, fontSize: '24px', color: sc }}>
            {preview.score}
          </span>
          <span style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED, display: 'block' }}>
            /10
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700,
      letterSpacing: '0.22em', textTransform: 'uppercase' as const,
      color: BIO_CYAN, marginBottom: '14px',
    }}>
      {children}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function LandingPage() {
  const { i18n } = useTranslation();
  const isHe  = i18n.language === 'he';
  const features = isHe ? FEATURES_HE : FEATURES_EN;
  const pricing  = isHe ? PRICING_HE  : PRICING_EN;
  const steps    = isHe ? STEPS_HE    : STEPS_EN;

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = NIGHT;
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  function scrollToFeatures(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div style={{ backgroundColor: NIGHT, minHeight: '100vh' }}>
      <style>{LP_CSS}</style>
      <ParticleCanvas />
      <AuroraBands />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'start',
          gap: '60px',
          flexWrap: 'wrap',
          padding: '120px 60px 80px',
          backgroundColor: NIGHT,
          backgroundImage: [
            'linear-gradient(to bottom, rgba(5,13,10,0.72) 0%, rgba(5,13,10,0.55) 50%, rgba(5,13,10,0.82) 100%)',
            'url("https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1920&q=80")',
          ].join(', '),
          backgroundSize: 'auto, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
      >
        {/* ── Left: text content ─────────────────────────────────────────── */}
        <div style={{ flex: '1 1 440px', maxWidth: '580px', direction: isHe ? 'rtl' : 'ltr' }}>

          {/* Eyebrow pill */}
          <div className="lp-eyebrow" style={{ marginBottom: '28px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(0,229,195,0.08)',
              border: '1px solid rgba(0,229,195,0.2)',
              borderRadius: '100px', padding: '6px 18px',
              fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.12em', color: BIO_CYAN,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: BIO_CYAN, boxShadow: `0 0 6px ${BIO_CYAN}`, display: 'inline-block' }} />
              {isHe ? 'לוח ביודינמי · מרץ 2026' : 'Biodynamic Calendar · March 2026'}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ margin: '0 0 24px', lineHeight: 1.12 }}>
            <span
              className="lp-hero-line1"
              style={{
                display: 'block',
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize: 'clamp(42px, 6.5vw, 96px)',
                color: TEXT,
                textShadow: '0 0 60px rgba(0,229,195,0.15)',
              }}
            >
              {isHe ? 'הגינה שלך' : 'Your Garden'}
            </span>
            <span
              className="lp-hero-line2"
              style={{
                display: 'block',
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize: 'clamp(44px, 7vw, 100px)',
                background: `linear-gradient(135deg, ${BIO_CYAN} 0%, ${BIO_LIME} 60%, ${BIO_CYAN} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(0,229,195,0.3))',
              }}
            >
              {isHe ? 'חיה ונושמת' : 'Alive & Breathing'}
            </span>
          </h1>

          {/* Sub */}
          <p
            className="lp-sub"
            style={{
              fontFamily: DM_SANS, fontWeight: 300, fontSize: 'clamp(15px, 2vw, 19px)',
              lineHeight: 1.75, color: TEXT_MID, maxWidth: '540px', marginBottom: '40px',
            }}
          >
            {isHe
              ? 'הביאו את חוכמת החקלאות הביודינמית לגינה הביתית שלכם. לוחות ירח, תכנון חכם, וניתוח מבוסס בינה מלאכותית — לכל גנן, בכל רמה.'
              : 'Bring the wisdom of biodynamic agriculture to your home garden. Moon calendars, smart planning, and AI-powered analysis — for every gardener, at every level.'}
          </p>

          {/* CTAs */}
          <div
            className="lp-ctas"
            style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: '48px' }}
          >
            <Link
              to="/signup"
              className="lp-cta-primary"
              style={{
                display: 'inline-block', fontFamily: SYNE, fontWeight: 700,
                fontSize: '15px', backgroundColor: BIO_CYAN, color: NIGHT,
                padding: '13px 36px', borderRadius: '100px', textDecoration: 'none',
                boxShadow: `0 4px 24px rgba(0,229,195,0.3)`, letterSpacing: '0.02em',
              }}
            >
              {isHe ? 'התחל בחינם' : 'Start for Free'}
            </Link>

            <a
              href="#features"
              onClick={scrollToFeatures}
              className="lp-cta-outline"
              style={{
                display: 'inline-block', fontFamily: DM_SANS, fontWeight: 500,
                fontSize: '15px', color: TEXT_MID, padding: '12px 30px',
                borderRadius: '100px', border: `1px solid rgba(0,229,195,0.25)`,
                textDecoration: 'none', backgroundColor: 'transparent',
              }}
            >
              {isHe ? 'ראה איך זה עובד' : 'See How It Works'}
            </a>
          </div>

          {/* Trust row */}
          <div className="lp-trust" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex' }}>
              {['#4a7c59', '#7dc084', '#00e5c3'].map((c, i) => (
                <div key={i} style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: c, border: `2px solid ${NIGHT}`,
                  marginInlineStart: i > 0 ? '-8px' : '0',
                }} />
              ))}
            </div>
            <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: MUTED }}>
              {isHe ? '+2,000 גינאים כבר גדלים בחוכמה' : '+2,000 gardeners already growing wisely'}
            </span>
          </div>

        </div>

        {/* ── Right: ChupChu widget ──────────────────────────────────────── */}
        <div
          className="lp-hero-chupchu-col"
          style={{
            flex: '1 1 360px',
            maxWidth: '420px',
            width: '100%',
            animation: 'lp-float 6s ease-in-out infinite',
            position: 'relative',
          }}
        >
          {/* Glowing border ring */}
          <div style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(0,229,195,0.4), rgba(170,255,0,0.2), rgba(0,229,195,0.1))',
            zIndex: 0,
            filter: 'blur(1px)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <ChupChuChat compact />
          </div>
        </div>

      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════ */}
      <section
        id="features"
        style={{
          position: 'relative', zIndex: 1,
          backgroundColor: NIGHT_MID,
          borderTop: '1px solid rgba(0,229,195,0.07)',
          padding: '96px 0',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 28px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <SectionLabel>{isHe ? 'מה מחכה לך' : 'What Awaits You'}</SectionLabel>
              <h2 style={{
                fontFamily: FRANK, fontWeight: 700,
                fontSize: 'clamp(26px, 3.5vw, 44px)', color: TEXT, lineHeight: 1.25,
              }}>
                {isHe ? (
                  <>כל מה שגינה{' '}<span style={{ color: BIO_CYAN }}>ביודינמית</span>{' '}צריכה</>
                ) : (
                  <>Everything a{' '}<span style={{ color: BIO_CYAN }}>Biodynamic</span>{' '}Garden Needs</>
                )}
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', flexWrap: 'wrap' }}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 100} style={{ flex: '1 1 260px' }}>
                <div className="lp-feat-card">
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: `${f.accent}15`,
                    border: `1px solid ${f.accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', marginBottom: '20px',
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{
                    fontFamily: SYNE, fontWeight: 700, fontSize: '18px',
                    color: TEXT, marginBottom: '10px',
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontFamily: DM_SANS, fontWeight: 300, fontSize: '15px',
                    color: TEXT_MID, lineHeight: 1.8,
                  }}>
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative', zIndex: 1,
          backgroundColor: NIGHT,
          borderTop: '1px solid rgba(0,229,195,0.07)',
          padding: '96px 0',
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 28px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <SectionLabel>{isHe ? 'איך זה עובד' : 'How It Works'}</SectionLabel>
              <h2 style={{
                fontFamily: FRANK, fontWeight: 700,
                fontSize: 'clamp(26px, 3.5vw, 44px)', color: TEXT, lineHeight: 1.25,
              }}>
                {isHe ? 'שלושה צעדים לגינה חיה' : 'Three Steps to a Living Garden'}
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 150}>
                <div style={{
                  display: 'flex',
                  flexDirection: isHe ? 'row-reverse' : 'row',
                  gap: '28px',
                  alignItems: 'flex-start',
                  marginBottom: i < steps.length - 1 ? '0' : '0',
                }}>
                  {/* Step dot + connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div className="lp-step-dot">{s.n}</div>
                    {i < steps.length - 1 && (
                      <div
                        className="lp-step-connector"
                        style={{
                          width: '1px', height: '64px',
                          background: `linear-gradient(to bottom, ${BIO_CYAN}66, ${BIO_CYAN}11)`,
                          margin: '4px 0',
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ paddingTop: '10px', paddingBottom: i < steps.length - 1 ? '48px' : '0' }}>
                    <h3 style={{
                      fontFamily: SYNE, fontWeight: 700, fontSize: '20px',
                      color: TEXT, marginBottom: '8px',
                    }}>
                      {s.title}
                    </h3>
                    <p style={{
                      fontFamily: DM_SANS, fontWeight: 300, fontSize: '16px',
                      color: TEXT_MID, lineHeight: 1.75, maxWidth: '520px',
                    }}>
                      {s.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CHUPCHU ═══════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative', zIndex: 1,
          background: `linear-gradient(135deg, ${NIGHT_MID} 0%, ${NIGHT_LIFT} 50%, ${NIGHT_MID} 100%)`,
          borderTop: '1px solid rgba(0,229,195,0.07)',
          padding: '96px 0',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 28px' }}>
          <div style={{
            display: 'flex',
            flexDirection: isHe ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: '56px',
            flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            <Reveal style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: '140px', height: '140px', borderRadius: '50%',
                  background: `conic-gradient(from 0deg, ${BIO_CYAN}, ${BIO_LIME}, ${BIO_VIOLET}, ${BIO_CYAN})`,
                  padding: '3px', marginBottom: '16px',
                  animation: 'lp-float 4s ease-in-out infinite',
                  boxShadow: `0 0 40px rgba(0,229,195,0.2)`,
                }}
              >
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: NIGHT_LIFT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '60px',
                }}>
                  🌕
                </div>
              </div>
              <p style={{ fontFamily: FRANK, fontStyle: 'italic', fontSize: '22px', color: BIO_CYAN, marginBottom: '4px' }}>
                {isHe ? "צ'ופצ'ו" : 'ChupChu'}
              </p>
              <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: MUTED }}>
                {isHe ? 'סבא הירח שלך' : 'Your Moon Elder'}
              </p>
            </Reveal>

            {/* Description */}
            <Reveal delay={200} style={{ flex: '1 1 300px' }}>
              <h2 style={{
                fontFamily: FRANK, fontStyle: 'italic',
                fontSize: 'clamp(24px, 3vw, 36px)',
                color: TEXT, marginBottom: '18px', lineHeight: 1.3, fontWeight: 400,
              }}>
                {isHe ? "שלום! אני צ'ופצ'ו" : 'Hello! I am ChupChu'}
              </h2>
              <p style={{
                fontFamily: DM_SANS, fontWeight: 300, fontSize: '17px',
                lineHeight: 1.9, color: TEXT_MID, marginBottom: '28px',
              }}>
                {isHe
                  ? 'גדלתי בגליל וחקרתי חקלאות ביודינמית למעלה מ-20 שנה. עבדתי בחוות ביודינמיות בארץ ובפרובנס, ולמדתי מהאדמה, מהירח, ומהצמחים עצמם. עכשיו אני כאן כדי לעזור לגינה שלך לפרוח.'
                  : 'I grew up in the Galilee and studied biodynamic farming for over 20 years. I worked on biodynamic farms in Israel and Provence, learning from the soil, the moon, and the plants themselves. Now I\'m here to help your garden flourish.'}
              </p>

              <div style={{
                background: `${NIGHT_CARD}`,
                border: `1px solid rgba(0,229,195,0.12)`,
                borderInlineStart: `3px solid ${BIO_CYAN}`,
                borderRadius: '12px',
                padding: '18px 22px',
              }}>
                <p style={{
                  fontFamily: FRANK, fontStyle: 'italic', fontSize: '15px',
                  lineHeight: 1.75, color: TEXT_MID,
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

      {/* ══ CHUPCHU DEMO — removed; ChupChu is now in the hero ═══════════ */}
      {false && <section
        className="lp-chupchu-section"
        style={{
          padding:         '100px 24px',
          backgroundColor: NIGHT_MID,
          borderTop:       '1px solid rgba(0,229,195,0.08)',
          borderBottom:    '1px solid rgba(0,229,195,0.08)',
          textAlign:       'center',
          direction:       'rtl',
        }}
      >
        {/* Ambient orbs */}
        <div className="lp-chupchu-orb" style={{
          width: '400px', height: '400px',
          background: 'rgba(0,229,195,0.07)',
          top: '-100px', left: '10%',
        }} />
        <div className="lp-chupchu-orb" style={{
          width: '300px', height: '300px',
          background: 'rgba(170,255,0,0.05)',
          bottom: '-80px', right: '15%',
        }} />

        {/* Eyebrow */}
        <div className="lp-chupchu-badge">
          <img src="/chupchu_final.png" alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
          נסו בחינם — ללא הרשמה
        </div>

        {/* Heading */}
        <h2 style={{
          fontFamily: FRANK,
          fontSize:   'clamp(28px, 4vw, 44px)',
          fontWeight: 700,
          color:      TEXT,
          margin:     '0 0 12px',
          lineHeight: 1.2,
        }}>
          שאלו את צ'ופצ'ו
          <span style={{ color: BIO_CYAN }}> עכשיו</span>
        </h2>

        <p style={{
          fontFamily: DM_SANS,
          fontSize:   '16px',
          color:      TEXT_MID,
          margin:     '0 auto 48px',
          maxWidth:   '480px',
          lineHeight: 1.65,
        }}>
          המדריך הביודינמי שלכם — שואל, מנחה, ומכיר את הגינה שלכם.
          <br />
          <span style={{ color: MUTED, fontSize: '13px' }}>3 שאלות חינם, ללא צורך בהרשמה</span>
        </p>

        {/* Suggested question chips */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '10px',
          justifyContent: 'center', marginBottom: '32px',
          position: 'relative', zIndex: 1,
        }}>
          {[
            'מתי הזמן הנכון לשתול עגבניות?',
            'איך מכינים תה קומפוסט?',
            'מה זה יום שורש בלוח הביודינמי?',
            'איך להדביר כנימות בצורה טבעית?',
          ].map(q => (
            <button
              key={q}
              onClick={() => {
                const el = document.querySelector('.chupchu-textarea') as HTMLTextAreaElement | null;
                if (el) {
                  // React-controlled input: set nativeInputValueSetter then fire input event
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, 'value'
                  )?.set;
                  nativeInputValueSetter?.call(el, q);
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.focus();
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(0,229,195,0.06)',
                border: '1px solid rgba(0,229,195,0.2)',
                borderRadius: '100px',
                fontFamily: DM_SANS, fontSize: '13px',
                color: TEXT_MID, cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s, background-color 0.2s',
                direction: 'rtl',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = BIO_CYAN;
                el.style.color = BIO_CYAN;
                el.style.backgroundColor = 'rgba(0,229,195,0.1)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(0,229,195,0.2)';
                el.style.color = TEXT_MID;
                el.style.backgroundColor = 'rgba(0,229,195,0.06)';
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Embedded chat widget */}
        <div className="lp-chupchu-demo-wrap">
          <ChupChuChat compact />
        </div>
      </section>}

      {/* ══ PRICING ═══════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative', zIndex: 1,
          backgroundColor: NIGHT_MID,
          borderTop: '1px solid rgba(0,229,195,0.07)',
          padding: '96px 0',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 28px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <SectionLabel>{isHe ? 'תמחור' : 'Pricing'}</SectionLabel>
              <h2 style={{
                fontFamily: FRANK, fontWeight: 700,
                fontSize: 'clamp(26px, 3.5vw, 44px)', color: TEXT,
              }}>
                {isHe ? 'בחר את התוכנית שלך' : 'Choose Your Plan'}
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: 'flex', flexDirection: 'row', gap: '20px',
            overflowX: 'auto', paddingBottom: '8px', alignItems: 'flex-start',
          }}>
            {pricing.map((plan, i) => (
              <Reveal
                key={plan.name}
                delay={i * 80}
                style={{ flex: '1 1 200px', minWidth: '200px' }}
              >
                <div
                  className="lp-price-card"
                  style={{
                    position: 'relative',
                    background: plan.highlight
                      ? `linear-gradient(135deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`
                      : NIGHT_CARD,
                    borderRadius: '16px',
                    border: plan.highlight
                      ? `1px solid ${BIO_CYAN}`
                      : '1px solid rgba(0,229,195,0.1)',
                    boxShadow: plan.highlight
                      ? `0 8px 48px rgba(0,229,195,0.12), 0 0 0 1px rgba(0,229,195,0.08)`
                      : 'none',
                    padding: plan.highlight ? '44px 24px 28px' : '32px 24px 28px',
                    display: 'flex', flexDirection: 'column',
                    height: '100%', boxSizing: 'border-box' as const,
                  }}
                >
                  {plan.highlight && plan.badge && (
                    <div style={{
                      position: 'absolute', top: '-14px', left: '50%',
                      transform: 'translateX(-50%)',
                      background: `linear-gradient(90deg, ${BIO_CYAN}, ${BIO_LIME})`,
                      color: NIGHT, fontFamily: SYNE, fontWeight: 700,
                      fontSize: '11px', padding: '4px 18px',
                      borderRadius: '100px', whiteSpace: 'nowrap' as const,
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: SYNE, fontWeight: 700, fontSize: '17px',
                    color: TEXT, marginBottom: '12px',
                  }}>
                    {plan.name}
                  </h3>

                  <div style={{ marginBottom: '24px' }}>
                    {plan.price ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                        <span style={{ fontFamily: DM_SANS, fontSize: '18px', fontWeight: 300, color: plan.accent, opacity: 0.7, lineHeight: 1 }}>₪</span>
                        <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '48px', lineHeight: 1, color: plan.accent }}>
                          {plan.price}
                        </span>
                        <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: MUTED, marginInlineStart: '4px' }}>
                          {isHe ? '/חודש' : '/mo'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '36px', color: MUTED }}>
                        {isHe ? 'חינם' : 'Free'}
                      </span>
                    )}
                  </div>

                  <ul style={{ flex: 1, marginBottom: '24px', listStyle: 'none', padding: 0 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                        fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID, lineHeight: 2,
                      }}>
                        <span style={{ color: BIO_CYAN, flexShrink: 0, fontWeight: 700 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    style={{
                      display: 'block', textAlign: 'center',
                      fontFamily: SYNE, fontWeight: 700, fontSize: '14px',
                      backgroundColor: plan.highlight ? BIO_CYAN : 'transparent',
                      color: plan.highlight ? NIGHT : BIO_CYAN,
                      border: `1px solid ${plan.highlight ? BIO_CYAN : 'rgba(0,229,195,0.3)'}`,
                      padding: '12px', borderRadius: '100px', textDecoration: 'none',
                      transition: 'filter 0.2s, background-color 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      if (plan.highlight) { el.style.filter = 'brightness(1.1)'; }
                      else { el.style.backgroundColor = 'rgba(0,229,195,0.08)'; el.style.borderColor = BIO_CYAN; }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.filter = 'none';
                      if (!plan.highlight) { el.style.backgroundColor = 'transparent'; el.style.borderColor = 'rgba(0,229,195,0.3)'; }
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
          position: 'relative', zIndex: 1,
          overflow: 'hidden',
          background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${NIGHT_LIFT} 0%, ${NIGHT} 70%)`,
          borderTop: '1px solid rgba(0,229,195,0.07)',
          padding: '120px 0',
          textAlign: 'center',
        }}
      >
        {/* Decorative cyan circle */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          border: '1px solid rgba(0,229,195,0.06)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,195,0.04) 0%, transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '0 28px' }}>
          <Reveal>
            <p style={{
              fontFamily: FRANK, fontStyle: 'italic',
              fontSize: 'clamp(22px, 3.5vw, 42px)',
              color: BIO_CYAN, lineHeight: 1.5, marginBottom: '16px',
            }}>
              {isHe ? (
                <>"הגינה מחכה לך.<br />היא תמיד שם."</>
              ) : (
                <>"The garden is waiting for you.<br />It is always there."</>
              )}
            </p>
            <p style={{ fontFamily: DM_SANS, fontWeight: 300, fontSize: '18px', color: MUTED, marginBottom: '52px' }}>
              — {isHe ? "צ'ופצ'ו" : 'ChupChu'}
            </p>
            <Link
              to="/signup"
              className="lp-cta-primary"
              style={{
                display: 'inline-block', fontFamily: SYNE, fontWeight: 700, fontSize: '18px',
                background: `linear-gradient(135deg, ${BIO_CYAN}, ${BIO_LIME})`,
                color: NIGHT, padding: '18px 60px', borderRadius: '100px',
                textDecoration: 'none',
                boxShadow: `0 4px 40px rgba(0,229,195,0.3)`,
                letterSpacing: '0.02em',
              }}
            >
              {isHe ? 'התחל עכשיו — בחינם' : 'Start Now — Free'}
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
