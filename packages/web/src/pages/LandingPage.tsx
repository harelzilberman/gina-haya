import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLimits, TIER_PRICING } from '@gina-haya/shared';
import { ChupChuChat } from '../components/chupchu/ChupChuChat';
import { PlayBadge } from '../components/ui/PlayBadge';
import { EN_HEADING } from '../styles/fonts';

// ── Design tokens ──────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_LIFT = '#0e1e17';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const BIO_AMBER  = '#ffb830';
const BIO_VIOLET = '#a78bfa';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const SYNE       = "'Syne', sans-serif";
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';


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

@media (max-width: 600px) {
  /* Safety net: clamp subhead to 1 line so it never blows the budget */
  .lp-sub {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }
}
@media (max-width: 768px) {
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
  font-family: ${EN_HEADING};
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

// Limits pulled from @gina-haya/shared — single source of truth for all pricing.
const _FL = getLimits('free');
const _GL = getLimits('gardener_pro');
const _AL = getLimits('advanced');
const _PL = getLimits('professional');

const PRICING_HE: PricingPlan[] = [
  {
    name: _FL.displayNameHe, price: null,
    features: ['לוח ביודינמי יומי', `${_FL.maxChupChuPerMonth} שיחות עם צ'ופצ'ו לחודש`, `${_FL.maxVisionLooksPerMonth} ניתוחי AI`, 'גינה אחת'],
    cta: 'התחל עכשיו', highlight: false, badge: '', accent: MUTED,
  },
  {
    name: _GL.displayNameHe, price: String(TIER_PRICING.gardener_pro.monthly),
    features: ['לוח ביודינמי מלא', `${_GL.maxGardens} גינות`, `עד ${_GL.maxTrackers} מעקבי גידול`, `${_GL.maxVisionLooksPerMonth} ניתוחי AI לחודש`, `${_GL.maxChupChuPerMonth} שיחות עם צ'ופצ'ו לחודש`, 'אנציקלופדיה מלאה'],
    cta: 'בחר תוכנית', highlight: true, badge: 'הכי פופולרי', accent: BIO_CYAN,
  },
  {
    name: _AL.displayNameHe, price: String(TIER_PRICING.advanced.monthly),
    features: [`הכל ב${_GL.displayNameHe}`, `${_AL.maxGardens} גינות`, 'מעקבי גידול ללא הגבלה', `${_AL.maxVisionLooksPerMonth} ניתוחי AI לחודש`, `${_AL.maxChupChuPerMonth} שיחות לחודש`, 'ייצוא PDF'],
    cta: 'בחר תוכנית', highlight: false, badge: '', accent: BIO_CYAN,
  },
  {
    name: _PL.displayNameHe, price: String(TIER_PRICING.professional.monthly),
    features: [`הכל ב${_AL.displayNameHe}`, `${_PL.maxGardens} גינות`, `${_PL.maxVisionLooksPerMonth} ניתוחי AI לחודש`, `${_PL.maxChupChuPerMonth} שיחות לחודש`, 'תמיכה מועדפת'],
    cta: 'בחר תוכנית', highlight: false, badge: '', accent: BIO_VIOLET,
  },
];

const PRICING_EN: PricingPlan[] = [
  {
    name: 'Free Forever', price: null,
    features: ['Daily biodynamic calendar', `${_FL.maxChupChuPerMonth} ChupChu chats/month`, `${_FL.maxVisionLooksPerMonth} AI analyses`, '1 garden'],
    cta: 'Start Now', highlight: false, badge: '', accent: MUTED,
  },
  {
    name: 'Gardener', price: String(TIER_PRICING.gardener_pro.monthly),
    features: ['Full biodynamic calendar', `${_GL.maxGardens} gardens`, `Up to ${_GL.maxTrackers} trackers`, `${_GL.maxVisionLooksPerMonth} AI analyses/month`, `${_GL.maxChupChuPerMonth} ChupChu chats/month`, 'Full encyclopedia'],
    cta: 'Choose Plan', highlight: true, badge: 'Most Popular', accent: BIO_CYAN,
  },
  {
    name: 'Advanced', price: String(TIER_PRICING.advanced.monthly),
    features: ['Everything in Gardener', `${_AL.maxGardens} gardens`, 'Unlimited trackers', `${_AL.maxVisionLooksPerMonth} AI analyses/month`, `${_AL.maxChupChuPerMonth} chats/month`, 'PDF export'],
    cta: 'Choose Plan', highlight: false, badge: '', accent: BIO_CYAN,
  },
  {
    name: 'Professional', price: String(TIER_PRICING.professional.monthly),
    features: ['Everything in Advanced', `${_PL.maxGardens} gardens`, `${_PL.maxVisionLooksPerMonth} AI analyses/month`, `${_PL.maxChupChuPerMonth} chats/month`, 'Priority support'],
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

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: EN_HEADING, fontSize: '10px', fontWeight: 700,
      letterSpacing: '0.22em', textTransform: 'uppercase' as const,
      color: BIO_CYAN, marginBottom: '14px',
    }}>
      {children}
    </p>
  );
}

// ── App live download section ──────────────────────────────────────────────
const APP_BENEFITS_HE = [
  '\u05d0\u05d1\u05d7\u05d5\u05df \u05e6\u05de\u05d7\u05d9\u05dd \u05d1\u05e6\u05d9\u05dc\u05d5\u05dd \u05e2\u05dd \u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5',
  '\u05dc\u05d5\u05d7 \u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9 \u05dc\u05e4\u05d9 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d0\u05e1\u05d8\u05e8\u05d5\u05e0\u05d5\u05de\u05d9\u05d9\u05dd \u05d0\u05de\u05d9\u05ea\u05d9\u05d9\u05dd',
  '\u05de\u05e2\u05e7\u05d1 \u05d0\u05d7\u05e8\u05d9 \u05db\u05dc \u05e6\u05de\u05d7 \u05d1\u05d2\u05d9\u05e0\u05d4',
  '\u05ea\u05d6\u05db\u05d5\u05e8\u05d5\u05ea \u05d4\u05e9\u05e7\u05d9\u05d4 \u05d5\u05de\u05e9\u05d9\u05de\u05d5\u05ea',
];
const APP_BENEFITS_EN = [
  'Plant diagnosis by photo with Chupchu',
  'Biodynamic calendar with real astronomical data',
  'Full tracker for every plant in your garden',
  'Watering reminders and task notifications',
];

function AppLiveSection({ isHe }: { isHe: boolean }) {
  const benefits = isHe ? APP_BENEFITS_HE : APP_BENEFITS_EN;

  return (
    <section
      style={{
        position: 'relative', zIndex: 1,
        backgroundColor: NIGHT,
        borderTop: '1px solid rgba(0,229,195,0.07)',
        padding: '96px 0',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,184,48,0.04) 0%, transparent 70%)',
      }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 28px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',           // image always on visual left
          alignItems: 'center',
          gap: '56px',
          flexWrap: 'wrap',
        }}>
          {/* Phone mockup — visual left */}
          <Reveal style={{ flex: '0 1 260px', maxWidth: '300px', width: '100%' }}>
            <div style={{
              position: 'relative',
              borderRadius: '32px',
              background: '#0a1a0d',
              border: '2px solid rgba(0,229,195,0.22)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 6px rgba(0,229,195,0.05)',
              overflow: 'hidden',
              aspectRatio: '9/19',
            }}>
              <img
                src="/images/app/screenshot-home.png"
                alt={isHe
                  ? '\u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4 — \u05de\u05e1\u05da \u05d4\u05d1\u05d9\u05ea'
                  : 'Gina Haya — home screen'}
                loading="eager"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </Reveal>

          {/* Text content */}
          <Reveal delay={150} style={{ flex: '1 1 360px', maxWidth: '520px', direction: isHe ? 'rtl' : 'ltr' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,184,48,0.08)',
              border: '1px solid rgba(255,184,48,0.3)',
              borderRadius: '100px', padding: '6px 16px', marginBottom: '22px',
              fontFamily: EN_HEADING, fontSize: '12px', fontWeight: 600, color: BIO_AMBER,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: BIO_AMBER, boxShadow: `0 0 6px ${BIO_AMBER}`, display: 'inline-block' }} />
              {/* זמינה עכשיו ב-Google Play */}
              {isHe
                ? '\u05d6\u05de\u05d9\u05e0\u05d4 \u05e2\u05db\u05e9\u05d9\u05d5 \u05d1\u002d\u05d2\u05d5\u05d2\u05dc \u05e4\u05dc\u05d9\u05d9'
                : 'Now live on Google Play'}
            </div>

            <h2 style={{
              fontFamily: FRANK, fontWeight: 700,
              fontSize: 'clamp(28px, 3.5vw, 46px)', color: TEXT,
              lineHeight: 1.2, marginBottom: '16px',
            }}>
              {/* הגינה שלך, בכיס שלך */}
              {isHe
                ? '\u05d4\u05d2\u05d9\u05e0\u05d4 \u05e9\u05dc\u05da\u002c \u05d1\u05db\u05d9\u05e1 \u05e9\u05dc\u05da'
                : 'Your garden, in your pocket'}
            </h2>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {benefits.map(b => (
                <li key={b} style={{
                  fontFamily: EN_HEADING, fontSize: '15px', color: TEXT_MID,
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}>
                  <span style={{ color: BIO_AMBER, flexShrink: 0, marginTop: '2px', fontSize: '13px' }}>✦</span>
                  {b}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <PlayBadge source="hero" loading="eager" />
              <Link
                to="/app"
                style={{
                  fontFamily: EN_HEADING, fontSize: '13px', color: MUTED,
                  textDecoration: 'none', padding: '4px 8px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED; }}
              >
                {/* פרטים נוספים ← */}
                {isHe ? '\u05e4\u05e8\u05d8\u05d9\u05dd \u05e0\u05d5\u05e1\u05e4\u05d9\u05dd \u2190' : 'Learn more →'}
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
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

  return (
    <div style={{ backgroundColor: NIGHT, minHeight: '100vh' }}>
      <style>{LP_CSS}</style>
      <ParticleCanvas />
      <AuroraBands />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      {/*
        Navbar is 64px; App.tsx adds 8px gap → paddingTop: 72px on <main>.
        Using calc(100vh - 72px) so the section fills exactly the visible
        viewport below the navbar on all screen sizes.
      */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'stretch',
          backgroundColor: NIGHT,
          backgroundImage: [
            'linear-gradient(to bottom, rgba(5,13,10,0.72) 0%, rgba(5,13,10,0.55) 50%, rgba(5,13,10,0.82) 100%)',
            'url("https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1920&q=80")',
          ].join(', '),
          backgroundSize: 'auto, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
          overflow: 'hidden',
        }}
      >
        {/* Two-column inner — direction:ltr keeps phone always on visual left.
            On mobile (flex-wrap triggers) columns stack: text first, phone below. */}
        <div style={{
          direction: 'ltr',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: 'clamp(20px, 5vw, 120px) clamp(20px, 5vw, 60px) clamp(32px, 6vw, 80px)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 'clamp(32px, 5vw, 64px)',
          flexWrap: 'wrap',
          boxSizing: 'border-box' as const,
        }}>

          {/* ── LEFT column: phone mockup (~45%) ──────────────────────────── */}
          {/*   On mobile: flex-wrap pushes this below the text column.
                order:2 ensures it always renders after the text regardless of DOM order. */}
          <div
            className="lp-hero-phone-col"
            style={{
              flex: '0 1 380px',
              maxWidth: '380px',
              order: 2,
              width: '100%',
            }}
          >
            {/* maxWidth clamps frame to ~190px on mobile (180-200px target) */}
            <div
              className="lp-card"
              style={{
                borderRadius: '28px',
                background: '#08150f',
                border: '1.5px solid rgba(0,229,195,0.22)',
                padding: '8px',
                maxWidth: 'clamp(150px, 50vw, 300px)',
                margin: '0 auto',
              }}
            >
              <div style={{ borderRadius: '20px', overflow: 'hidden', aspectRatio: '9/19.5' }}>
                <img
                  src="/images/app/screenshot-home.png"
                  alt={isHe
                    ? '\u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4 \u2014 \u05de\u05e1\u05da \u05d4\u05d1\u05d9\u05ea'
                    : 'Gina Haya \u2014 home screen'}
                  width={390} height={844}
                  loading="eager"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT column: text content (~55%) ─────────────────────────── */}
          {/* order:1 keeps text above phone when flex-wrap stacks on mobile */}
          <div style={{
            flex: '1 1 300px',
            maxWidth: '600px',
            direction: isHe ? 'rtl' : 'ltr',
            order: 1,
          }}>

            {/* Amber eyebrow pill */}
            <div className="lp-eyebrow" style={{ marginBottom: 'clamp(14px, 3vw, 28px)' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,184,48,0.08)',
                border: '1px solid rgba(255,184,48,0.28)',
                borderRadius: '100px', padding: '6px 18px',
                fontFamily: EN_HEADING, fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.08em', color: BIO_AMBER,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: BIO_AMBER, boxShadow: `0 0 6px ${BIO_AMBER}`, display: 'inline-block' }} />
                {isHe
                  ? '\u05d6\u05de\u05d9\u05e0\u05d4 \u05e2\u05db\u05e9\u05d9\u05d5 \u05d1\u002d\u05d2\u05d5\u05d2\u05dc \u05e4\u05dc\u05d9\u05d9'
                  : 'Now live on Google Play'}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ margin: '0 0 clamp(12px, 2vw, 24px)', lineHeight: 1.12 }}>
              <span
                className="lp-hero-line1"
                style={{
                  display: 'block',
                  fontFamily: FRANK,
                  fontWeight: 700,
                  fontSize: 'clamp(30px, 6.5vw, 96px)',
                  color: TEXT,
                  textShadow: '0 0 60px rgba(0,229,195,0.15)',
                }}
              >
                {isHe ? '\u05d4\u05d2\u05d9\u05e0\u05d4 \u05e9\u05dc\u05da' : 'Your Garden'}
              </span>
              <span
                className="lp-hero-line2"
                style={{
                  display: 'block',
                  fontFamily: FRANK,
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 7vw, 100px)',
                  background: `linear-gradient(135deg, ${BIO_CYAN} 0%, ${BIO_LIME} 60%, ${BIO_CYAN} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(0,229,195,0.3))',
                }}
              >
                {isHe ? '\u05d7\u05d9\u05d4 \u05d5\u05e0\u05d5\u05e9\u05de\u05ea' : 'Alive & Breathing'}
              </span>
            </h1>

            {/* Subhead — shortened to single line on mobile (≤600px CSS clips via -webkit-line-clamp) */}
            <p
              className="lp-sub"
              style={{
                fontFamily: EN_HEADING, fontWeight: 300, fontSize: 'clamp(15px, 2vw, 19px)',
                lineHeight: 1.75, color: TEXT_MID, maxWidth: '540px',
                marginBottom: 'clamp(20px, 4vw, 40px)',
              }}
            >
              {isHe
                ? '\u05dc\u05d5\u05d7 \u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9, \u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05d5\u05de\u05e2\u05e7\u05d1 \u05d2\u05d9\u05e0\u05d4.'
                : 'Calendar, ChupChu & garden tracker.'}
            </p>

            {/* Play badge — only button-weight CTA */}
            <div className="lp-ctas" style={{ marginBottom: 'clamp(8px, 1.5vw, 16px)' }}>
              <PlayBadge source="hero" loading="eager" />
            </div>

            {/* Low-emphasis signup link */}
            <Link
              to="/signup"
              style={{
                fontFamily: EN_HEADING, fontSize: '13px', color: MUTED,
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED; }}
            >
              {isHe
                ? '\u05d0\u05d5 \u05d4\u05ea\u05d7\u05d9\u05dc\u05d5 \u05d1\u05d3\u05e4\u05d3\u05e4\u05df \u2190'
                : 'Or start in the browser \u2192'}
            </Link>

          </div>
        </div>

      </section>

      {/* ══ CHUPCHU DEMO ═════════════════════════════════════════════════ */}
      <section
        className="lp-chupchu-section"
        style={{
          padding:         '100px 24px',
          backgroundColor: NIGHT_MID,
          borderTop:       '1px solid rgba(0,229,195,0.08)',
          borderBottom:    '1px solid rgba(0,229,195,0.08)',
          textAlign:       'center',
          direction:       isHe ? 'rtl' : 'ltr',
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
          {isHe
            ? '\u05e0\u05e1\u05d5 \u05d1\u05d7\u05d9\u05e0\u05dd \u2014 \u05dc\u05dc\u05d0 \u05d4\u05e8\u05e9\u05de\u05d4'
            : 'Try free \u2014 no signup needed'}
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
          {isHe
            ? <>{'\u05e9\u05d0\u05dc\u05d5 \u05d0\u05ea \u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5'}<span style={{ color: BIO_CYAN }}>{' \u05e2\u05db\u05e9\u05d9\u05d5'}</span></>
            : <>{'Ask ChupChu'}<span style={{ color: BIO_CYAN }}>{' now'}</span></>
          }
        </h2>

        <p style={{
          fontFamily: EN_HEADING,
          fontSize:   '16px',
          color:      TEXT_MID,
          margin:     '0 auto 48px',
          maxWidth:   '480px',
          lineHeight: 1.65,
        }}>
          {isHe
            ? '\u05d4\u05de\u05d3\u05e8\u05d9\u05da \u05d4\u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9 \u05e9\u05dc\u05db\u05dd \u2014 \u05e9\u05d5\u05d0\u05dc, \u05de\u05e0\u05d7\u05d4, \u05d5\u05de\u05db\u05d9\u05e8 \u05d0\u05ea \u05d4\u05d2\u05d9\u05e0\u05d4 \u05e9\u05dc\u05db\u05dd.'
            : 'Your biodynamic guide \u2014 ask, get advice, and grow better.'}
          <br />
          <span style={{ color: MUTED, fontSize: '13px' }}>
            {isHe
              ? '3 \u05e9\u05d0\u05dc\u05d5\u05ea \u05d7\u05d9\u05e0\u05dd, \u05dc\u05dc\u05d0 \u05e6\u05d5\u05e8\u05da \u05d1\u05d4\u05e8\u05e9\u05de\u05d4'
              : '3 free questions, no registration required'}
          </span>
        </p>

        {/* Suggested question chips */}
        {isHe && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '10px',
            justifyContent: 'center', marginBottom: '32px',
            position: 'relative', zIndex: 1,
          }}>
            {[
              '\u05de\u05ea\u05d9 \u05d4\u05d6\u05de\u05df \u05d4\u05e0\u05db\u05d5\u05df \u05dc\u05e9\u05ea\u05d5\u05dc \u05e2\u05d2\u05d1\u05e0\u05d9\u05d5\u05ea?',
              '\u05d0\u05d9\u05da \u05de\u05db\u05d9\u05e0\u05d9\u05dd \u05ea\u05d4 \u05e7\u05d5\u05de\u05e4\u05d5\u05e1\u05d8?',
              '\u05de\u05d4 \u05d6\u05d4 \u05d9\u05d5\u05dd \u05e9\u05d5\u05e8\u05e9 \u05d1\u05dc\u05d5\u05d7 \u05d4\u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9?',
              '\u05d0\u05d9\u05da \u05dc\u05d4\u05d3\u05d1\u05d9\u05e8 \u05db\u05e0\u05d9\u05de\u05d5\u05ea \u05d1\u05e6\u05d5\u05e8\u05d4 \u05d8\u05d1\u05e2\u05d9\u05ea?',
            ].map(q => (
              <button
                key={q}
                onClick={() => {
                  const el = document.querySelector('.chupchu-textarea') as HTMLTextAreaElement | null;
                  if (el) {
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
                  fontFamily: EN_HEADING, fontSize: '13px',
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
        )}

        {/* Embedded chat widget */}
        <div className="lp-chupchu-demo-wrap">
          <ChupChuChat compact />
        </div>
      </section>

      {/* ══ APP DOWNLOAD ═════════════════════════════════════════════════ */}
      <AppLiveSection isHe={isHe} />

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
                    fontFamily: EN_HEADING, fontWeight: 300, fontSize: '15px',
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
                      fontFamily: EN_HEADING, fontWeight: 300, fontSize: '16px',
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
              <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: MUTED }}>
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
                fontFamily: EN_HEADING, fontWeight: 300, fontSize: '17px',
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
                        <span style={{ fontFamily: EN_HEADING, fontSize: '18px', fontWeight: 300, color: plan.accent, opacity: 0.7, lineHeight: 1 }}>₪</span>
                        <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '48px', lineHeight: 1, color: plan.accent }}>
                          {plan.price}
                        </span>
                        <span style={{ fontFamily: EN_HEADING, fontSize: '13px', color: MUTED, marginInlineStart: '4px' }}>
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
                        fontFamily: EN_HEADING, fontSize: '14px', color: TEXT_MID, lineHeight: 2,
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
            <p style={{ fontFamily: EN_HEADING, fontWeight: 300, fontSize: '18px', color: MUTED, marginBottom: '52px' }}>
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
