import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const EARTH  = '#142B16';
const HEADER = '#1B3A1F';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASST   = '"Assistant", "Heebo", sans-serif';

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
.pricing-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.35) !important; }
.pricing-feature-row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; font-family: ${ASST}; font-size: 13px; line-height: 1.45; }
.pricing-toggle-pill { padding: 7px 20px; border-radius: 99px; border: none; cursor: pointer; font-family: ${ASST}; font-size: 13px; font-weight: 600; transition: background 0.2s, color 0.2s; }
.faq-item { border-bottom: 1px solid rgba(245,200,64,0.1); }
.faq-answer { font-family: ${ASST}; font-size: 14px; color: rgba(237,224,196,0.75); line-height: 1.7; padding: 0 0 16px; }
`;

type Tier = 'free' | 'grower' | 'pro';

interface Feature { icon: string; text: string; dim?: boolean }

const FREE_FEATURES: Feature[] = [
  { icon: '✓', text: 'לוח ביודינמי יומי' },
  { icon: '✓', text: 'שלב ירח + ציון שתילה' },
  { icon: '✓', text: 'גינה אחת (עד 10 צמחים)' },
  { icon: '✓', text: 'לוח משימות בסיסי' },
  { icon: '✓', text: 'כל המאמרים והמדריכים' },
  { icon: '✓', text: "צ'ופצ'ו — 20 שיחות לחודש" },
  { icon: '✦', text: 'מעקב גידול אחד — טעימה' },
  { icon: '✦', text: 'ניתוח AI אחד לחודש' },
  { icon: '✗', text: 'מעקבים נוספים', dim: true },
  { icon: '✗', text: 'תכנית שנתית', dim: true },
  { icon: '✗', text: 'אנציקלופדיה מלאה', dim: true },
];

const GROWER_FEATURES: Feature[] = [
  { icon: '✓', text: 'הכל בחינמי' },
  { icon: '✓', text: 'גינה אחת — ללא הגבלת צמחים' },
  { icon: '✓', text: 'מעקבי גידול ללא הגבלה' },
  { icon: '✓', text: 'ניתוח AI ללא הגבלה' },
  { icon: '✓', text: 'משימות מוצעות עם אישור ידני' },
  { icon: '✓', text: "צ'ופצ'ו — 50 שיחות לחודש" },
  { icon: '✓', text: 'תכנית שנתית' },
  { icon: '✓', text: 'אנציקלופדיה מלאה' },
  { icon: '✗', text: 'גינות מרובות', dim: true },
  { icon: '✗', text: 'ייצוא PDF', dim: true },
];

const PRO_FEATURES: Feature[] = [
  { icon: '✓', text: 'הכל בגנן' },
  { icon: '✓', text: '13 גינות כלולות' },
  { icon: '✓', text: 'מעבר מהיר בין גינות' },
  { icon: '✓', text: 'לוח משימות לכל גינה' },
  { icon: '✓', text: "צ'ופצ'ו ללא הגבלה" },
  { icon: '✓', text: 'ייצוא PDF לכל גינה' },
  { icon: '✓', text: 'גישה מוקדמת לתכונות' },
  { icon: '✓', text: 'תמיכה מועדפת' },
  { icon: '✓', text: 'סטטיסטיקות מתקדמות' },
  { icon: '➕', text: 'חבילת 10 גינות נוספות — ₪19/חודש' },
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
    a: 'כן — תשלום שנתי חוסך 20% לעומת תשלום חודשי.',
  },
];

function FeatureRow({ icon, text, dim }: Feature) {
  const color =
    icon === '✓' ? SAGE :
    icon === '✦' ? GOLD :
    icon === '➕' ? GOLD :
    'rgba(237,224,196,0.3)';
  return (
    <div className="pricing-feature-row">
      <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: '14px', lineHeight: '1.3', marginTop: '1px' }}>{icon}</span>
      <span style={{ color: dim ? 'rgba(237,224,196,0.3)' : `${PARCH}CC` }}>{text}</span>
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
      background: EARTH,
      border: `1px solid ${GOLD}55`,
      borderRadius: '12px',
      padding: '12px 24px',
      fontFamily: ASST, fontSize: '14px', fontWeight: 600,
      color: GOLD,
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
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const currentTier = (profile?.subscription_tier ?? 'free') as Tier;

  function showToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  function TierBadge({ tier }: { tier: Tier }) {
    if (currentTier !== tier || !profile) return null;
    return (
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        background: SAGE, color: EARTH,
        fontFamily: FRANK, fontSize: '11px', fontWeight: 700,
        padding: '3px 12px', borderRadius: '99px',
        whiteSpace: 'nowrap',
      }}>
        התכנית הנוכחית שלך
      </div>
    );
  }

  const growerMonthly = isAnnual ? 14 : 18;
  const proMonthly    = isAnnual ? 43 : 54;

  return (
    <>
      <style>{PAGE_CSS}</style>
      <ComingSoonToast visible={toastVisible} />

      <div dir="rtl" style={{ minHeight: '100vh', background: EARTH, fontFamily: ASST }}>

        {/* ── Launch free mode banner ── */}
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          padding: '24px 20px 0',
          animation: 'pricingFadeIn 0.5s ease both',
        }}>
          <div style={{
            background: 'rgba(99,153,34,0.15)',
            border: '1px solid rgba(99,153,34,0.3)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '15px',
            color: '#639922',
            fontWeight: 600,
          }}>
            🌿 גינה חיה בחינם לחלוטין בתקופת ההשקה!
            כל התכונות פתוחות לכולם עד להודעה חדשה.
          </div>
        </div>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(180deg, ${HEADER} 0%, ${EARTH} 100%)`,
          padding: '60px 24px 48px',
          textAlign: 'center',
          animation: 'pricingFadeIn 0.5s ease both',
        }}>
          <h1 style={{
            fontFamily: FRANK, fontSize: 'clamp(28px, 5vw, 44px)',
            color: GOLD, margin: '0 0 12px', fontWeight: 700, lineHeight: 1.2,
          }}>
            בחר את התכנית שלך
          </h1>
          <p style={{
            fontFamily: ASST, fontSize: '16px',
            color: 'rgba(237,224,196,0.65)', margin: '0 0 28px',
          }}>
            גדל גינה בריאה עם הכלים הנכונים
          </p>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(0,0,0,0.25)', borderRadius: '99px',
            padding: '4px', gap: '2px',
          }}>
            <button
              className="pricing-toggle-pill"
              onClick={() => setIsAnnual(false)}
              style={{
                background: !isAnnual ? GOLD : 'transparent',
                color: !isAnnual ? EARTH : `${PARCH}80`,
              }}
            >
              חודשי
            </button>
            <button
              className="pricing-toggle-pill"
              onClick={() => setIsAnnual(true)}
              style={{
                background: isAnnual ? GOLD : 'transparent',
                color: isAnnual ? EARTH : `${PARCH}80`,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              שנתי
              <span style={{
                background: '#4A7C59', color: 'white',
                fontSize: '10px', fontWeight: 700,
                padding: '2px 7px', borderRadius: '99px',
              }}>
                חסוך 20%
              </span>
            </button>
          </div>
        </div>

        {/* ── Tier cards ── */}
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          padding: '0 20px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '20px',
          animation: 'pricingFadeIn 0.5s ease 0.1s both',
        }}>

          {/* Free */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: 'rgba(20,50,22,0.6)',
              border: currentTier === 'free' && profile ? `2px solid ${SAGE}` : '1px solid rgba(245,200,64,0.15)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
          >
            <TierBadge tier="free" />
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: PARCH, fontWeight: 700, marginBottom: '4px' }}>
              חינמי
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`, marginBottom: '20px' }}>
              Free
            </div>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: GOLD, fontWeight: 700 }}>₪0</span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}55`, marginRight: '6px' }}>/ לתמיד</span>
            </div>
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {FREE_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            <Link
              to="/signup"
              style={{
                display: 'block', textAlign: 'center',
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                color: EARTH, background: `${GOLD}CC`,
                padding: '13px', borderRadius: '10px',
                textDecoration: 'none', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              התחל בחינם
            </Link>
          </div>

          {/* Grower — featured */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, rgba(30,62,32,0.95) 0%, rgba(20,43,22,0.98) 100%)',
              border: currentTier === 'grower' && profile ? `2px solid ${SAGE}` : `2px solid ${GOLD}`,
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: `0 8px 36px rgba(245,200,64,0.18)`,
            }}
          >
            <TierBadge tier="grower" />
            {/* "Most popular" badge */}
            {(!profile || currentTier !== 'grower') && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: GOLD, color: EARTH,
                fontFamily: FRANK, fontSize: '11px', fontWeight: 700,
                padding: '3px 14px', borderRadius: '99px',
                whiteSpace: 'nowrap',
              }}>
                הכי פופולרי ⭐
              </div>
            )}
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, marginBottom: '4px' }}>
              גנן
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`, marginBottom: '20px' }}>
              Grower
            </div>
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: GOLD, fontWeight: 700 }}>₪{growerMonthly}</span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}55`, marginRight: '6px' }}>/ חודש</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}55`, marginBottom: '16px' }}>
                ₪{growerMonthly * 12} לשנה — חיסכון של ₪{(18 - growerMonthly) * 12}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {GROWER_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            <button
              onClick={showToast}
              style={{
                display: 'block', width: '100%',
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                color: EARTH, background: GOLD,
                padding: '13px', borderRadius: '10px',
                border: 'none', cursor: 'pointer', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              שדרג לגנן
            </button>
          </div>

          {/* Pro */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: 'rgba(20,50,22,0.6)',
              border: currentTier === 'pro' && profile ? `2px solid ${SAGE}` : '1px solid rgba(245,200,64,0.15)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
          >
            <TierBadge tier="pro" />
            <div style={{ fontFamily: FRANK, fontSize: '22px', color: PARCH, fontWeight: 700, marginBottom: '4px' }}>
              מקצועי
            </div>
            <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`, marginBottom: '20px' }}>
              Pro
            </div>
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '38px', color: GOLD, fontWeight: 700 }}>₪{proMonthly}</span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}55`, marginRight: '6px' }}>/ חודש</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}55`, marginBottom: '16px' }}>
                ₪{proMonthly * 12} לשנה — חיסכון של ₪{(54 - proMonthly) * 12}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {PRO_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            <button
              onClick={showToast}
              style={{
                display: 'block', width: '100%',
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                color: EARTH, background: `${GOLD}CC`,
                padding: '13px', borderRadius: '10px',
                border: 'none', cursor: 'pointer', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              שדרג למקצועי
            </button>
          </div>
        </div>

        {/* ── Garden pack addon ── */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 16px', animation: 'pricingFadeIn 0.5s ease 0.2s both' }}>
          <div style={{
            border: `1px dashed ${GOLD}55`,
            borderRadius: '14px', padding: '20px 24px',
            display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, fontWeight: 700, marginBottom: '4px' }}>
                ➕ חבילת גינות נוספת — למקצועי בלבד
              </div>
              <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}70` }}>
                10 גינות נוספות ב-₪19 לחודש. ניתן לרכוש מספר חבילות.
              </div>
              <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}50`, marginTop: '4px' }}>
                דוגמה: 33 גינות = ₪54 + ₪19 + ₪19 = ₪92/חודש
              </div>
            </div>
            <button
              onClick={showToast}
              style={{
                fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                color: EARTH, background: `${GOLD}80`,
                padding: '9px 20px', borderRadius: '8px',
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
            style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}50`, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${PARCH}50`; }}
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
            fontFamily: FRANK, fontSize: '24px', color: GOLD,
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
                <span style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH, fontWeight: 600, textAlign: 'right', flex: 1 }}>
                  {item.q}
                </span>
                <span style={{
                  color: GOLD, fontSize: '18px', flexShrink: 0,
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
