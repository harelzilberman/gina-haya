import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { getLimits, TIER_PRICING } from '@gina-haya/shared';

const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const ASST       = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PAGE_CSS = `
@keyframes pricingFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toastIn {
  0%   { opacity: 0; transform: translateX(-50%) translateY(12px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.pricing-card { transition: transform 0.2s, box-shadow 0.2s; }
.pricing-card:hover { transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,229,195,0.1) !important; }
.pricing-feature-row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; font-family: ${ASST}; font-size: 13px; line-height: 1.45; }
.pricing-toggle-pill { padding: 7px 20px; border-radius: 99px; border: none; cursor: pointer; font-family: ${ASST}; font-size: 13px; font-weight: 600; transition: background 0.2s, color 0.2s; }
.faq-item { border-bottom: 1px solid rgba(0,229,195,0.08); }
.faq-answer { font-family: ${ASST}; font-size: 14px; color: #b0cfbf; line-height: 1.7; padding: 0 0 16px; }
`;

type ActiveTier = 'free' | 'gardener_pro' | 'advanced' | 'professional';

interface Feature { icon: string; text: string; dim?: boolean }

// ── Feature lists: marketing copy for the text, real limits for every number ──

const FREE_L   = getLimits('free');
const GP_L     = getLimits('gardener_pro');
const ADV_L    = getLimits('advanced');
const PRO_L    = getLimits('professional');

const FREE_FEATURES: Feature[] = [
  { icon: '✓', text: 'לוח ביודינמי יומי' },
  { icon: '✓', text: 'שלב ירח + ציון שתילה' },
  { icon: '✓', text: `גינה אחת — עד ${FREE_L.maxPlantsPerGarden} צמחים` },
  { icon: '✓', text: 'לוח משימות בסיסי' },
  { icon: '✓', text: 'כל המאמרים והמדריכים' },
  { icon: '✓', text: `צ'ופצ'ו — ${FREE_L.maxChupChuPerMonth} שיחות לחודש` },
  { icon: '✦', text: 'מעקב גידול אחד — טעימה' },
  { icon: '✦', text: `${FREE_L.maxVisionLooksPerMonth} ניתוחי AI לחודש` },
  { icon: '✗', text: 'מעקבים נוספים', dim: true },
  { icon: '✗', text: 'תכנית שנתית', dim: true },
  { icon: '✗', text: 'אנציקלופדיה מלאה', dim: true },
];

const GP_FEATURES: Feature[] = [
  { icon: '✓', text: 'הכל בחינמי' },
  { icon: '✓', text: `${GP_L.maxGardens} גינות — עד ${GP_L.maxPlantsPerGarden} צמחים כל אחת` },
  { icon: '✓', text: `עד ${GP_L.maxTrackers} מעקבי גידול` },
  { icon: '✓', text: `${GP_L.maxVisionLooksPerMonth} ניתוחי AI לחודש` },
  { icon: '✓', text: `צ'ופצ'ו — ${GP_L.maxChupChuPerMonth} שיחות לחודש` },
  { icon: '✓', text: 'תכנית שנתית' },
  { icon: '✓', text: 'אנציקלופדיה מלאה' },
  { icon: '✗', text: 'ייצוא PDF', dim: true },
];

const ADV_FEATURES: Feature[] = [
  { icon: '✓', text: 'הכל בגנן ביתי' },
  { icon: '✓', text: `${ADV_L.maxGardens} גינות — עד ${ADV_L.maxPlantsPerGarden} צמחים כל אחת` },
  { icon: '✓', text: 'מעקבי גידול ללא הגבלה' },
  { icon: '✓', text: `${ADV_L.maxVisionLooksPerMonth} ניתוחי AI לחודש` },
  { icon: '✓', text: `צ'ופצ'ו — ${ADV_L.maxChupChuPerMonth} שיחות לחודש` },
  { icon: '✓', text: 'ייצוא PDF לכל גינה' },
  { icon: '✓', text: 'גישה מוקדמת לתכונות' },
];

const PRO_FEATURES: Feature[] = [
  { icon: '✓', text: 'הכל בגנן מתקדם' },
  { icon: '✓', text: `${PRO_L.maxGardens} גינות — עד ${PRO_L.maxPlantsPerGarden} צמחים כל אחת` },
  { icon: '✓', text: 'מעקבי גידול ללא הגבלה' },
  { icon: '✓', text: `${PRO_L.maxVisionLooksPerMonth} ניתוחי AI לחודש` },
  { icon: '✓', text: `צ'ופצ'ו — ${PRO_L.maxChupChuPerMonth} שיחות לחודש` },
  { icon: '✓', text: 'ייצוא PDF לכל גינה' },
  { icon: '✓', text: 'גישה מוקדמת לתכונות' },
  { icon: '✓', text: 'תמיכה מועדפת' },
  { icon: '✓', text: 'סטטיסטיקות מתקדמות' },
];

const FAQ_ITEMS = [
  {
    q: 'האם אוכל לשדרג או לשנמך את התכנית שלי?',
    a: 'כן, בכל עת. השינוי ייכנס לתוקף בתחילת החודש הבא.',
  },
  {
    q: 'האם יש התחייבות חוזית?',
    a: 'לא. ניתן לבטל בכל עת ללא קנסות.',
  },
  {
    q: 'מה ההבדל בין ניתוח AI למעקב גידול?',
    a: 'מעקב גידול הוא היסטוריית צמח עם תמונות לאורך זמן. ניתוח AI הוא בדיקה חד פעמית של תמונה עם דוח מפורט ומשימות מוצעות.',
  },
  {
    q: 'מה זה חבילת גינות?',
    a: 'למשתמשי מקצועי, כל חבילה מוסיפה 10 גינות נוספות לחשבון. אין הגבלה על מספר החבילות.',
  },
  {
    q: 'האם המנוי השנתי כולל הנחה?',
    a: 'כן — תשלום שנתי חוסך כחודשיים לעומת תשלום חודשי.',
  },
];

function FeatureRow({ icon, text, dim }: Feature) {
  const color =
    icon === '✓' ? BIO_CYAN :
    icon === '✦' ? BIO_LIME :
    icon === '➕' ? BIO_LIME :
    'rgba(176,207,191,0.25)';
  return (
    <div className="pricing-feature-row">
      <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: '14px', lineHeight: '1.3', marginTop: '1px' }}>{icon}</span>
      <span style={{ color: dim ? 'rgba(176,207,191,0.3)' : TEXT_MID }}>{text}</span>
    </div>
  );
}

function ComingSoonToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '36px', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: NIGHT_LIFT,
      border: `1px solid rgba(0,229,195,0.3)`,
      borderRadius: '12px',
      padding: '12px 24px',
      fontFamily: ASST, fontSize: '14px', fontWeight: 600,
      color: BIO_CYAN,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'toastIn 0.25s ease both',
      whiteSpace: 'nowrap',
    }}>
      🌿 תשלומים בקרוב — נודיע לך!
    </div>
  );
}

export function PricingPage() {
  const { profile } = useAuthStore();
  const { open: openUpgradeModal } = useUpgradeModalStore();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const currentTier = (profile?.subscription_tier ?? 'free') as ActiveTier;

  function showToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  function TierBadge({ tier }: { tier: ActiveTier }) {
    if (currentTier !== tier || !profile) return null;
    return (
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        background: BIO_CYAN, color: NIGHT,
        fontFamily: FRANK, fontSize: '11px', fontWeight: 700,
        padding: '3px 12px', borderRadius: '99px',
        whiteSpace: 'nowrap',
      }}>
        התכנית הנוכחית שלך
      </div>
    );
  }

  // Derive per-month display price and annual details from TIER_PRICING
  function annualMonthly(tier: string): number {
    return Math.round((TIER_PRICING[tier]?.annual ?? 0) / 12);
  }
  function annualSavings(tier: string): number {
    const p = TIER_PRICING[tier];
    if (!p?.monthly || !p?.annual) return 0;
    return p.monthly * 12 - p.annual;
  }

  const upgradeBtn = (label: string) => (
    <button
      onClick={() => openUpgradeModal('pricing_page')}
      style={{
        display: 'block', width: '100%',
        fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
        color: NIGHT, background: BIO_CYAN,
        padding: '13px', borderRadius: '100px',
        border: 'none', cursor: 'pointer', transition: 'filter 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
    >
      {label}
    </button>
  );

  return (
    <>
      <style>{PAGE_CSS}</style>
      <ComingSoonToast visible={toastVisible} />

      <div dir="rtl" style={{ minHeight: '100vh', background: NIGHT, fontFamily: ASST }}>

        {/* ── Launch free mode banner ── */}
        <div style={{
          maxWidth: '1160px', margin: '0 auto',
          padding: '24px 20px 0',
          animation: 'pricingFadeIn 0.5s ease both',
        }}>
          <div style={{
            background: 'rgba(0,229,195,0.07)',
            border: '1px solid rgba(0,229,195,0.2)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '15px',
            color: BIO_CYAN,
            fontWeight: 600,
          }}>
            🌿 גינה חיה בחינם לחלוטין בתקופת ההשקה!
            כל התכונות פתוחות לכולם עד להודעה חדשה.
          </div>
        </div>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(180deg, ${NIGHT_MID} 0%, ${NIGHT} 100%)`,
          padding: '60px 24px 48px',
          textAlign: 'center',
          animation: 'pricingFadeIn 0.5s ease both',
        }}>
          <h1 style={{
            fontFamily: FRANK, fontSize: 'clamp(28px, 5vw, 44px)',
            color: BIO_CYAN, margin: '0 0 12px', fontWeight: 700, lineHeight: 1.2,
          }}>
            בחר את התכנית שלך
          </h1>
          <p style={{
            fontFamily: ASST, fontSize: '16px',
            color: TEXT_MID, margin: '0 0 28px',
          }}>
            גדל גינה בריאה עם הכלים הנכונים
          </p>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: NIGHT_CARD, borderRadius: '99px',
            padding: '4px', gap: '2px',
            border: '1px solid rgba(0,229,195,0.12)',
          }}>
            <button
              className="pricing-toggle-pill"
              onClick={() => setIsAnnual(false)}
              style={{
                background: !isAnnual ? BIO_CYAN : 'transparent',
                color: !isAnnual ? NIGHT : MUTED,
              }}
            >
              חודשי
            </button>
            <button
              className="pricing-toggle-pill"
              onClick={() => setIsAnnual(true)}
              style={{
                background: isAnnual ? BIO_CYAN : 'transparent',
                color: isAnnual ? NIGHT : MUTED,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              שנתי
              <span style={{
                background: BIO_LIME, color: NIGHT,
                fontSize: '10px', fontWeight: 700,
                padding: '2px 7px', borderRadius: '99px',
              }}>
                חסוך ~17%
              </span>
            </button>
          </div>
        </div>

        {/* ── Tier cards ── */}
        <div style={{
          maxWidth: '1160px', margin: '0 auto',
          padding: '0 20px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          animation: 'pricingFadeIn 0.5s ease 0.1s both',
        }}>

          {/* ── Free ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: NIGHT_CARD,
              border: currentTier === 'free' && profile ? `2px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.1)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <TierBadge tier="free" />
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: TEXT, fontWeight: 700, marginBottom: '4px' }}>
              {FREE_L.displayNameHe}
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
              Free
            </div>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>₪0</span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>/ לתמיד</span>
            </div>
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {FREE_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            <Link
              to="/signup"
              style={{
                display: 'block', textAlign: 'center',
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                color: NIGHT, background: BIO_CYAN,
                padding: '13px', borderRadius: '100px',
                textDecoration: 'none', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              התחל בחינם
            </Link>
          </div>

          {/* ── Gardener Pro — featured ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: `linear-gradient(145deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`,
              border: `2px solid ${BIO_CYAN}`,
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: `0 8px 40px rgba(0,229,195,0.15)`,
            }}
          >
            <TierBadge tier="gardener_pro" />
            {currentTier !== 'gardener_pro' && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: `linear-gradient(90deg, ${BIO_CYAN}, ${BIO_LIME})`,
                color: NIGHT,
                fontFamily: FRANK, fontSize: '11px', fontWeight: 700,
                padding: '3px 14px', borderRadius: '99px',
                whiteSpace: 'nowrap',
              }}>
                הכי פופולרי
              </div>
            )}
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: BIO_CYAN, fontWeight: 700, marginBottom: '4px' }}>
              {GP_L.displayNameHe}
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
              Gardener
            </div>
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>
                ₪{isAnnual ? annualMonthly('gardener_pro') : TIER_PRICING.gardener_pro.monthly}
              </span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>/ חודש</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginBottom: '16px' }}>
                ₪{TIER_PRICING.gardener_pro.annual} לשנה — חיסכון של ₪{annualSavings('gardener_pro')}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {GP_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            {upgradeBtn(`שדרג ל${GP_L.displayNameHe}`)}
          </div>

          {/* ── Advanced ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: NIGHT_CARD,
              border: currentTier === 'advanced' && profile ? `2px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.15)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <TierBadge tier="advanced" />
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: TEXT, fontWeight: 700, marginBottom: '4px' }}>
              {ADV_L.displayNameHe}
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
              Advanced
            </div>
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>
                ₪{isAnnual ? annualMonthly('advanced') : TIER_PRICING.advanced.monthly}
              </span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>/ חודש</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginBottom: '16px' }}>
                ₪{TIER_PRICING.advanced.annual} לשנה — חיסכון של ₪{annualSavings('advanced')}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {ADV_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            {upgradeBtn(`שדרג ל${ADV_L.displayNameHe}`)}
          </div>

          {/* ── Professional ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: NIGHT_CARD,
              border: currentTier === 'professional' && profile ? `2px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.1)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <TierBadge tier="professional" />
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: TEXT, fontWeight: 700, marginBottom: '4px' }}>
              {PRO_L.displayNameHe}
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
              Professional
            </div>
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>
                ₪{isAnnual ? annualMonthly('professional') : TIER_PRICING.professional.monthly}
              </span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>/ חודש</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginBottom: '16px' }}>
                ₪{TIER_PRICING.professional.annual} לשנה — חיסכון של ₪{annualSavings('professional')}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {PRO_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            {upgradeBtn(`שדרג ל${PRO_L.displayNameHe}`)}
          </div>
        </div>

        {/* ── Garden pack addon ── */}
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px 16px', animation: 'pricingFadeIn 0.5s ease 0.2s both' }}>
          <div style={{
            border: `1px dashed rgba(0,229,195,0.2)`,
            borderRadius: '14px', padding: '20px 24px',
            background: NIGHT_CARD,
            display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: FRANK, fontSize: '16px', color: BIO_CYAN, fontWeight: 700, marginBottom: '4px' }}>
                ➕ חבילת גינות נוספת — למקצועי בלבד
              </div>
              <div style={{ fontFamily: ASST, fontSize: '13px', color: TEXT_MID }}>
                10 גינות נוספות ב-₪19 לחודש. ניתן לרכוש מספר חבילות.
              </div>
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginTop: '4px' }}>
                דוגמה: {PRO_L.maxGardens! + 20} גינות = ₪{TIER_PRICING.professional.monthly!} + ₪19 + ₪19 = ₪{TIER_PRICING.professional.monthly! + 38}/חודש
              </div>
            </div>
            <button
              onClick={showToast}
              style={{
                fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                color: NIGHT, background: BIO_CYAN,
                padding: '9px 20px', borderRadius: '100px',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              הוסף חבילה
            </button>
          </div>
        </div>

        {/* ── Shop link ── */}
        <div style={{ textAlign: 'center', padding: '8px 24px 32px', animation: 'pricingFadeIn 0.5s ease 0.25s both' }}>
          <Link
            to="/shop"
            style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED; }}
          >
            מעדיף לקנות בלי מנוי? ← כנס לחנות
          </Link>
        </div>

        {/* ── FAQ ── */}
        <div style={{
          maxWidth: '700px', margin: '0 auto',
          padding: '0 20px 80px',
          animation: 'pricingFadeIn 0.5s ease 0.3s both',
        }}>
          <h2 style={{
            fontFamily: FRANK, fontSize: '24px', color: BIO_CYAN,
            textAlign: 'center', marginBottom: '28px', fontWeight: 700,
          }}>
            שאלות נפוצות
          </h2>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="faq-item">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'right', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '16px 0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontFamily: FRANK, fontSize: '16px', color: TEXT, fontWeight: 600, textAlign: 'right', flex: 1 }}>
                  {item.q}
                </span>
                <span style={{
                  color: BIO_CYAN, fontSize: '18px', flexShrink: 0,
                  transform: openFaq === i ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>▾</span>
              </button>
              {openFaq === i && (
                <div className="faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
