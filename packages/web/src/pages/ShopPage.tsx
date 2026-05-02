import { useState } from 'react';
import { Link } from 'react-router-dom';

const EARTH  = '#142B16';
const HEADER = '#1B3A1F';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASST   = '"Assistant", "Heebo", sans-serif';

const PAGE_CSS = `
@keyframes shopFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toastIn {
  0%   { opacity: 0; transform: translateX(-50%) translateY(12px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.shop-product-card { transition: transform 0.2s, box-shadow 0.2s; }
.shop-product-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.35) !important; }
.shop-add-btn {
  width: 100%; padding: 11px;
  font-family: ${FRANK}; font-size: 14px; font-weight: 700;
  color: ${EARTH}; background: ${GOLD};
  border: none; border-radius: 10px; cursor: pointer;
  transition: filter 0.2s;
}
.shop-add-btn:hover { filter: brightness(1.1); }
`;

interface ProductCard {
  label: string;
  price: string;
  note: string;
  badge?: string;
}

const ANALYSIS_PRODUCTS: ProductCard[] = [
  { label: 'בודד',     price: '₪3.6', note: 'ניתוח אחד מלא' },
  { label: 'חבילת 5',  price: '₪12',  note: '₪2.4 לניתוח — חסכון 33%', badge: 'הכי משתלם' },
  { label: 'חבילת 10', price: '₪27',  note: '₪2.7 לניתוח — חסכון 25%' },
];

const TRACKER_PRODUCTS: ProductCard[] = [
  { label: 'בודד',     price: '₪3.6', note: 'מעקב אחד' },
  { label: 'חבילת 3',  price: '₪12',  note: '₪4 למעקב' },
  { label: 'חבילת 10', price: '₪27',  note: '₪2.7 למעקב — חסכון 25%', badge: 'הכי משתלם' },
];

const COMING_SOON = [
  { emoji: '📦', title: 'ערכת פרפרטים ביודינמיים', desc: 'מדריך מקיף לעבודה עם BD 500, BD 501 ו-CPP' },
  { emoji: '📅', title: 'מנוי לוח שנה שנתי',        desc: 'לוח ביודינמי מודפס לשנת 2027' },
  { emoji: '🌿', title: 'ייעוץ גינון אישי',           desc: 'שעת ייעוץ עם גנן ביודינמי מוסמך' },
];

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

function ProductSection({
  title, icon, description, products, onAdd,
}: {
  title: string;
  icon: string;
  description: string;
  products: ProductCard[];
  onAdd: () => void;
}) {
  return (
    <div style={{ marginBottom: '48px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: '0 0 8px' }}>
          {icon} {title}
        </h2>
        <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}70`, margin: 0, lineHeight: 1.6, maxWidth: '560px' }}>
          {description}
        </p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {products.map((p, i) => (
          <div
            key={i}
            className="shop-product-card"
            style={{
              position: 'relative',
              background: p.badge
                ? 'linear-gradient(145deg, rgba(30,62,32,0.95) 0%, rgba(20,43,22,0.98) 100%)'
                : 'rgba(20,50,22,0.6)',
              border: p.badge ? `2px solid ${GOLD}` : '1px solid rgba(245,200,64,0.15)',
              borderRadius: '14px', padding: '22px 20px',
              display: 'flex', flexDirection: 'column', gap: '14px',
              boxShadow: p.badge ? `0 4px 24px rgba(245,200,64,0.12)` : '0 2px 12px rgba(0,0,0,0.15)',
            }}
          >
            {p.badge && (
              <div style={{
                position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                background: GOLD, color: EARTH,
                fontFamily: FRANK, fontSize: '10px', fontWeight: 700,
                padding: '3px 12px', borderRadius: '99px', whiteSpace: 'nowrap',
              }}>
                {p.badge}
              </div>
            )}
            <div>
              <div style={{ fontFamily: FRANK, fontSize: '17px', color: PARCH, fontWeight: 700, marginBottom: '2px' }}>
                {p.label}
              </div>
              <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}60` }}>
                {p.note}
              </div>
            </div>
            <div style={{ fontFamily: FRANK, fontSize: '32px', color: GOLD, fontWeight: 700 }}>
              {p.price}
            </div>
            <button className="shop-add-btn" onClick={onAdd}>
              הוסף לסל 🛒
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShopPage() {
  const [toastVisible, setToastVisible] = useState(false);

  function showToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  return (
    <>
      <style>{PAGE_CSS}</style>
      <ComingSoonToast visible={toastVisible} />

      <div dir="rtl" style={{ minHeight: '100vh', background: EARTH, fontFamily: ASST }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(180deg, ${HEADER} 0%, ${EARTH} 100%)`,
          padding: '60px 24px 48px',
          textAlign: 'center',
          animation: 'shopFadeIn 0.5s ease both',
        }}>
          <h1 style={{
            fontFamily: FRANK, fontSize: 'clamp(26px, 5vw, 42px)',
            color: GOLD, margin: '0 0 12px', fontWeight: 700, lineHeight: 1.2,
          }}>
            חנות גינה חיה
          </h1>
          <p style={{ fontFamily: ASST, fontSize: '16px', color: 'rgba(237,224,196,0.65)', margin: '0 0 8px' }}>
            רכוש כלים בודדים — ללא מנוי
          </p>
          <p style={{
            fontFamily: ASST, fontSize: '12px',
            color: `${SAGE}90`,
            margin: 0, letterSpacing: '0.02em',
          }}>
            ✦ כל הרכישות תקפות לצמיתות ואינן פגות
          </p>
        </div>

        {/* ── Products ── */}
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '8px 20px 0',
          animation: 'shopFadeIn 0.5s ease 0.1s both',
        }}>

          <ProductSection
            title="ניתוח צמחים + דוח מלא"
            icon="🔬"
            description="העלה תמונה של הצמח שלך וקבל ניתוח AI מפורט עם: דוח בריאות, זיהוי בעיות, משימות מוצעות ותכנית טיפול."
            products={ANALYSIS_PRODUCTS}
            onAdd={showToast}
          />

          <ProductSection
            title="מעקבי גידול"
            icon="📈"
            description="עקוב אחר הצמחים שלך לאורך זמן עם תמונות, הערות וניתוח התקדמות. כל מעקב תקף לצמיתות."
            products={TRACKER_PRODUCTS}
            onAdd={showToast}
          />

          {/* ── Coming soon ── */}
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{
              fontFamily: FRANK, fontSize: '20px',
              color: `${PARCH}50`, fontWeight: 700, margin: '0 0 16px',
            }}>
              🔜 בקרוב בחנות
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}>
              {COMING_SOON.map((item, i) => (
                <div key={i} style={{
                  position: 'relative',
                  background: 'rgba(20,50,22,0.3)',
                  border: '1px solid rgba(245,200,64,0.07)',
                  borderRadius: '14px', padding: '22px 20px',
                  opacity: 0.5,
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{
                    position: 'absolute', top: -10, insetInlineEnd: 16,
                    background: 'rgba(245,200,64,0.15)', color: `${GOLD}AA`,
                    fontFamily: ASST, fontSize: '10px', fontWeight: 700,
                    padding: '2px 10px', borderRadius: '99px', letterSpacing: '0.05em',
                  }}>
                    בקרוב
                  </div>
                  <div style={{ fontSize: '28px' }}>{item.emoji}</div>
                  <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH, fontWeight: 700 }}>
                    {item.title}
                  </div>
                  <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}70`, lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom pricing banner ── */}
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '0 20px 80px',
          animation: 'shopFadeIn 0.5s ease 0.2s both',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,62,32,0.7) 0%, rgba(20,43,22,0.8) 100%)',
            border: '1px solid rgba(245,200,64,0.18)',
            borderRadius: '16px', padding: '24px 28px',
            display: 'flex', flexWrap: 'wrap', gap: '12px',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: FRANK, fontSize: '18px', color: PARCH, fontWeight: 700, marginBottom: '4px' }}>
                גנן רציני? המנוי שלנו כולל הכל ועוד.
              </div>
              <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60` }}>
                חסוך על כלים בודדים עם מנוי שנתי.
              </div>
            </div>
            <Link
              to="/pricing"
              style={{
                fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                color: EARTH, background: GOLD,
                padding: '11px 22px', borderRadius: '10px',
                textDecoration: 'none', flexShrink: 0,
                transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              ראה את תכניות המנוי ←
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
