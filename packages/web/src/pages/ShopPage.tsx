import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckoutModal, type CartItem } from '../components/shop/CheckoutModal';
import { useCredits, type Credits } from '../hooks/useCredits';
import { useAuthStore } from '../stores/authStore';

export type ProductId =
  | 'analysis_single'
  | 'analysis_pack_5'
  | 'analysis_pack_10'
  | 'tracker_single'
  | 'tracker_pack_5'
  | 'tracker_pack_10'
  | 'garden_pack';

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
@keyframes drawerIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
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
.shop-remove-btn {
  width: 100%; padding: 11px;
  font-family: ${ASST}; font-size: 13px; font-weight: 600;
  color: rgba(237,224,196,0.5);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(245,200,64,0.2); border-radius: 10px; cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.shop-remove-btn:hover { color: #E06060; border-color: rgba(224,96,96,0.4); }
.shop-wood-btn {
  width: 100%; padding: 11px;
  font-family: ${FRANK}; font-size: 14px; font-weight: 700;
  color: ${GOLD}; background: transparent;
  border: 1.5px solid rgba(245,200,64,0.4); border-radius: 10px; cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.shop-wood-btn:hover { background: rgba(245,200,64,0.08); border-color: ${GOLD}; }
`;

interface ProductDef {
  id: ProductId;
  label: string;
  name: string;
  price: number;
  priceStr: string;
  note: string;
  badge?: string;
}

const ANALYSIS_PRODUCTS: ProductDef[] = [
  { id: 'analysis_single',  label: 'בודד',     name: 'ניתוח צמח בודד',    price: 3.6,  priceStr: '₪3.6', note: 'ניתוח אחד מלא' },
  { id: 'analysis_pack_5',  label: 'חבילת 5',  name: 'חבילת 5 ניתוחים',   price: 12,   priceStr: '₪12',  note: '₪2.4 לניתוח — חסכון 33%' },
  { id: 'analysis_pack_10', label: 'חבילת 10', name: 'חבילת 10 ניתוחים',  price: 21,   priceStr: '₪21',  note: '₪2.1 לניתוח — חסכון 42%', badge: 'הכי משתלם' },
];

const TRACKER_PRODUCTS: ProductDef[] = [
  { id: 'tracker_single',  label: 'בודד',     name: 'מעקב גידול בודד',   price: 3.6,  priceStr: '₪3.6', note: 'מעקב אחד' },
  { id: 'tracker_pack_5',  label: 'חבילת 5',  name: 'חבילת 5 מעקבים',    price: 12,   priceStr: '₪12',  note: '₪2.4 למעקב — חסכון 33%' },
  { id: 'tracker_pack_10', label: 'חבילת 10', name: 'חבילת 10 מעקבים',   price: 21,   priceStr: '₪21',  note: '₪2.1 למעקב — חסכון 42%', badge: 'הכי משתלם' },
];

const COMING_SOON = [
  { emoji: '📦', title: 'ערכת פרפרטים ביודינמיים', desc: 'מדריך מקיף לעבודה עם BD 500, BD 501 ו-CPP' },
  { emoji: '📅', title: 'מנוי לוח שנה שנתי',        desc: 'לוח ביודינמי מודפס לשנת 2027' },
  { emoji: '🌿', title: 'ייעוץ גינון אישי',           desc: 'שעת ייעוץ עם גנן ביודינמי מוסמך' },
];

const WOOD_PRODUCTS = [
  {
    id: 'birdhouse',
    icon: '🏠',
    nameHe: 'בית ציפורים',
    nameEn: 'Birdhouse',
    descHe: 'עץ ממוחזר מפלטות ושאריות סדנה. קוטר פתח מותאם לציפורים מקומיות — ירגזי, דרור או נחליאלי. כל אחד ייחודי.',
    descEn: 'Reclaimed pallet wood and workshop scraps. Hole diameter matched to local species. Each one unique.',
    price: '₪180',
    badge: null,
    articleLink: null,
  },
  {
    id: 'bat-house',
    icon: '🦇',
    nameHe: 'בית עטלפים',
    nameEn: 'Bat House',
    descHe: 'עיצוב דו-תא מעץ ממוחזר. עטלף אחד אוכל עד 3,000 חרקים בלילה. הדברה טבעית אפקטיבית.',
    descEn: 'Double-chamber, reclaimed wood. One bat eats up to 3,000 insects per night.',
    price: '₪220',
    badge: 'ממליץ צ\'ופצ\'ו',
    articleLink: null,
  },
  {
    id: 'insect-hotel',
    icon: '🐝',
    nameHe: 'מלון חרקים',
    nameEn: 'Insect Hotel',
    descHe: 'מסגרת מעץ ממוחזר עם קנים, בלוקי עץ קדוחים, אצטרובלים וקליפות. לדבורות בודדות ופרת-משה-רבנו.',
    descEn: 'Reclaimed wood frame filled with reeds, drilled blocks, pine cones, bark.',
    price: '₪260',
    badge: null,
    articleLink: null,
  },
  {
    id: 'raised-bed',
    icon: '🌱',
    nameHe: 'ערוגה מוגבהת',
    nameEn: 'Raised Bed Kit',
    descHe: 'לוחות פלטות ממוחזרות. מידות 60×120 או 80×160 ס"מ. חיבורים חזקים, ללא ברגים. נשלח מפורק.',
    descEn: 'Reclaimed pallet boards. 60×120 or 80×160 cm. Solid joinery, no screws.',
    price: '₪380–480',
    badge: 'פופולרי',
    articleLink: null,
  },
  {
    id: 'compost-frame',
    icon: '♻️',
    nameHe: 'מסגרת קומפוסט',
    nameEn: 'Compost Bin Frame',
    descHe: 'מסגרת תלת-קומות מפלטות ממוחזרות. לוחות קדמיים נשלפים לערבוב קל. 80×80×90 ס"מ.',
    descEn: 'Three-section slatted frame, reclaimed pallets. Removable front boards. 80×80×90 cm.',
    price: '₪320',
    badge: null,
    articleLink: null,
  },
  {
    id: 'garden-markers',
    icon: '🏷️',
    nameHe: 'תוויות גינה',
    nameEn: 'Garden Markers',
    descHe: 'סט 10 תוויות מעץ ממוחזר. שם הצמח שרוף בעברית ולטינית. עמיד מזג אוויר. הזמנה אישית אפשרית.',
    descEn: 'Set of 10 reclaimed wood markers, pyrographed in Hebrew and Latin. Weatherproof.',
    price: '₪120 לסט',
    badge: 'מתנה מושלמת',
    articleLink: null,
  },
  {
    id: 'seed-box',
    icon: '📦',
    nameHe: 'קופסת זרעים',
    nameEn: 'Seed Storage Box',
    descHe: '24 מחיצות מסומנות. מכסה חרוט. עץ ממוחזר. מושלם לשמירת זרעים ביודינמיים בין עונות.',
    descEn: '24 labeled dividers, engraved lid, reclaimed hardwood. For saving seeds between seasons.',
    price: '₪195',
    badge: 'חדש',
    articleLink: null,
  },
] as const;

type WoodProduct = typeof WOOD_PRODUCTS[number];

// ── Cart Drawer ────────────────────────────────────────────────────────────

function CartDrawer({
  cart,
  onRemove,
  onCheckout,
  onClose,
}: {
  cart: CartItem[];
  onRemove: (id: ProductId) => void;
  onCheckout: () => void;
  onClose: () => void;
}) {
  const total = cart.reduce((s, i) => s + i.price, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }}
      />
      {/* Drawer */}
      <div
        dir="rtl"
        style={{
          position: 'fixed', top: 0, bottom: 0, right: 0, zIndex: 301,
          width: 'min(340px, 90vw)',
          backgroundColor: '#1a3a1c',
          borderInlineStart: '1px solid rgba(245,200,64,0.15)',
          display: 'flex', flexDirection: 'column',
          animation: 'drawerIn 0.25s ease both',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(245,200,64,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
            🛒 הסל שלך
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: `${PARCH}50`, cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {cart.length === 0 ? (
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}50`, textAlign: 'center', marginTop: '40px' }}>
              הסל ריק
            </p>
          ) : (
            cart.map(item => (
              <div
                key={item.productId}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(245,200,64,0.07)',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: ASST, fontSize: '14px', color: PARCH, marginBottom: '2px' }}>
                    {item.name}
                  </div>
                  <div style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, fontWeight: 700 }}>
                    ₪{item.price % 1 === 0 ? item.price : item.price.toFixed(1)}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.productId)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: `${PARCH}40`, fontSize: '14px', padding: '4px',
                    transition: 'color 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E06060'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${PARCH}40`; }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(245,200,64,0.1)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '14px',
          }}>
            <span style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>סה"כ</span>
            <span style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700 }}>
              ₪{total % 1 === 0 ? total : total.toFixed(1)}
            </span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            style={{
              width: '100%', padding: '13px',
              backgroundColor: cart.length > 0 ? GOLD : 'rgba(245,200,64,0.3)',
              color: EARTH, border: 'none', borderRadius: '10px',
              fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => { if (cart.length > 0) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            לתשלום →
          </button>
        </div>
      </div>
    </>
  );
}

// ── Product card ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  inCart,
  onAdd,
  onRemove,
}: {
  product: ProductDef;
  inCart: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="shop-product-card"
      style={{
        position: 'relative',
        background: product.badge
          ? 'linear-gradient(145deg, rgba(30,62,32,0.95) 0%, rgba(20,43,22,0.98) 100%)'
          : 'rgba(20,50,22,0.6)',
        border: inCart
          ? `2px solid ${GOLD}`
          : product.badge
            ? `2px solid ${GOLD}`
            : '1px solid rgba(245,200,64,0.15)',
        borderRadius: '14px', padding: '22px 20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: product.badge ? `0 4px 24px rgba(245,200,64,0.12)` : '0 2px 12px rgba(0,0,0,0.15)',
      }}
    >
      {product.badge && !inCart && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: GOLD, color: EARTH,
          fontFamily: FRANK, fontSize: '10px', fontWeight: 700,
          padding: '3px 12px', borderRadius: '99px', whiteSpace: 'nowrap',
        }}>
          {product.badge}
        </div>
      )}
      {inCart && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: SAGE, color: EARTH,
          fontFamily: FRANK, fontSize: '10px', fontWeight: 700,
          padding: '3px 12px', borderRadius: '99px', whiteSpace: 'nowrap',
        }}>
          ✓ בסל
        </div>
      )}
      <div>
        <div style={{ fontFamily: FRANK, fontSize: '17px', color: PARCH, fontWeight: 700, marginBottom: '2px' }}>
          {product.label}
        </div>
        <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}60` }}>
          {product.note}
        </div>
      </div>
      <div style={{ fontFamily: FRANK, fontSize: '32px', color: GOLD, fontWeight: 700 }}>
        {product.priceStr}
      </div>
      {inCart ? (
        <button className="shop-remove-btn" onClick={onRemove}>
          הסר מהסל ✕
        </button>
      ) : (
        <button className="shop-add-btn" onClick={onAdd}>
          הוסף לסל 🛒
        </button>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function ShopPage() {
  const { user } = useAuthStore();
  const { credits, refresh: refreshCredits } = useCredits();
  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [checkoutOpen, setCheckoutOpen]   = useState(false);

  const cartCount = cart.length;

  function addToCart(product: ProductDef) {
    setCart(prev => {
      if (prev.find(i => i.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, price: product.price }];
    });
  }

  function removeFromCart(productId: ProductId) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  function handleCheckoutSuccess(newCredits: Credits) {
    refreshCredits();
    setCart([]);
    setDrawerOpen(false);
  }

  const hasAnyCredits = credits.analysis.available > 0 || credits.tracker.available > 0 || credits.garden.available > 0;

  const [woodOrderProduct, setWoodOrderProduct] = useState<WoodProduct | null>(null);
  const [woodOrderSent, setWoodOrderSent] = useState(false);
  const [woodForm, setWoodForm] = useState({ name: '', email: '', notes: '' });

  function handleWoodOrder(product: WoodProduct) {
    setWoodOrderProduct(product);
    setWoodOrderSent(false);
    setWoodForm({
      name: '',
      email: '',
      notes: `שלום, אני מעוניין/ת להזמין: ${product.nameHe} (${product.price})\n\n`,
    });
  }

  function handleWoodSend() {
    const subject = encodeURIComponent(`הזמנה מגינה חיה — ${woodOrderProduct?.nameHe}`);
    const body = encodeURIComponent(
      `שם: ${woodForm.name}\nאימייל: ${woodForm.email}\n\n${woodForm.notes}`
    );
    window.open(`mailto:gina.haya.contact@gmail.com?subject=${subject}&body=${body}`);
    setWoodOrderSent(true);
  }

  return (
    <>
      <style>{PAGE_CSS}</style>

      {drawerOpen && (
        <CartDrawer
          cart={cart}
          onRemove={removeFromCart}
          onCheckout={() => { setDrawerOpen(false); setCheckoutOpen(true); }}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {woodOrderProduct && (
        <>
          <div
            onClick={() => setWoodOrderProduct(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            }}
          />
          <div
            dir="rtl"
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 401,
              width: 'min(480px, 92vw)',
              backgroundColor: '#1a3a1c',
              border: '1px solid rgba(245,200,64,0.2)',
              borderRadius: '18px',
              padding: '28px 28px 24px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              animation: 'shopFadeIn 0.2s ease both',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, fontWeight: 700, margin: 0 }}>
                {woodOrderProduct.nameHe}
              </h2>
              <button
                onClick={() => setWoodOrderProduct(null)}
                style={{ background: 'none', border: 'none', color: `${PARCH}50`, cursor: 'pointer', fontSize: '18px', padding: '0 0 0 8px', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`, margin: '0 0 20px' }}>
              {woodOrderProduct.price} · זמן ייצור 1–3 שבועות
            </p>

            {!woodOrderSent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70`, display: 'block', marginBottom: '5px' }}>שם</label>
                  <input
                    type="text"
                    value={woodForm.name}
                    onChange={e => setWoodForm(f => ({ ...f, name: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(245,200,64,0.15)',
                      color: PARCH, fontFamily: ASST, fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70`, display: 'block', marginBottom: '5px' }}>אימייל</label>
                  <input
                    type="email"
                    value={woodForm.email}
                    onChange={e => setWoodForm(f => ({ ...f, email: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(245,200,64,0.15)',
                      color: PARCH, fontFamily: ASST, fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70`, display: 'block', marginBottom: '5px' }}>הערות / גודל / שאלות</label>
                  <textarea
                    value={woodForm.notes}
                    onChange={e => setWoodForm(f => ({ ...f, notes: e.target.value }))}
                    rows={4}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(245,200,64,0.15)',
                      color: PARCH, fontFamily: ASST, fontSize: '14px',
                      outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
                <button
                  onClick={handleWoodSend}
                  style={{
                    marginTop: '4px',
                    width: '100%', padding: '13px',
                    backgroundColor: GOLD, color: EARTH,
                    border: 'none', borderRadius: '10px',
                    fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer', transition: 'filter 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  שלחו הודעה
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌿</div>
                <p style={{ fontFamily: FRANK, fontSize: '18px', color: SAGE, fontWeight: 700, margin: '0 0 20px' }}>
                  תודה! נחזור אליך בהקדם.
                </p>
                <button
                  onClick={() => setWoodOrderProduct(null)}
                  style={{
                    padding: '10px 28px',
                    background: 'transparent',
                    border: `1.5px solid rgba(245,200,64,0.4)`,
                    borderRadius: '10px',
                    color: GOLD, fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  סגור
                </button>
              </div>
            )}
          </div>
        </>
      )}

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
          <p style={{ fontFamily: ASST, fontSize: '12px', color: `${SAGE}90`, margin: 0, letterSpacing: '0.02em' }}>
            ✦ כל הרכישות תקפות לצמיתות ואינן פגות
          </p>
        </div>

        {/* ── Credit balance (if any) ── */}
        {user && hasAnyCredits && (
          <div style={{
            maxWidth: '900px', margin: '0 auto 0',
            padding: '0 20px',
            animation: 'shopFadeIn 0.4s ease both',
          }}>
            <div style={{
              backgroundColor: 'rgba(125,192,132,0.08)',
              border: '1px solid rgba(125,192,132,0.2)',
              borderRadius: '12px',
              padding: '14px 20px',
              display: 'flex', flexWrap: 'wrap', gap: '16px',
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: SAGE, fontWeight: 600 }}>
                קרדיטים זמינים:
              </span>
              {credits.analysis.available > 0 && (
                <span style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD }}>
                  🔬 ניתוחים: {credits.analysis.available}
                </span>
              )}
              {credits.tracker.available > 0 && (
                <span style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD }}>
                  🌱 מעקבים: {credits.tracker.available}
                </span>
              )}
              {credits.garden.available > 0 && (
                <span style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD }}>
                  🏡 גינות: {credits.garden.available}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Products ── */}
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '32px 20px 0',
          animation: 'shopFadeIn 0.5s ease 0.1s both',
        }}>

          {/* Analysis */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: '0 0 8px' }}>
                🔬 ניתוח צמחים + דוח מלא
              </h2>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}70`, margin: 0, lineHeight: 1.6 }}>
                העלה תמונה של הצמח שלך וקבל ניתוח AI מפורט: דוח בריאות, זיהוי בעיות, משימות ותכנית טיפול.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {ANALYSIS_PRODUCTS.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  inCart={!!cart.find(i => i.productId === p.id)}
                  onAdd={() => addToCart(p)}
                  onRemove={() => removeFromCart(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Trackers */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: '0 0 8px' }}>
                📈 מעקבי גידול
              </h2>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}70`, margin: 0, lineHeight: 1.6 }}>
                עקוב אחר הצמחים שלך לאורך זמן עם תמונות, הערות וניתוח התקדמות. כל מעקב תקף לצמיתות.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {TRACKER_PRODUCTS.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  inCart={!!cart.find(i => i.productId === p.id)}
                  onAdd={() => addToCart(p)}
                  onRemove={() => removeFromCart(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Coming soon */}
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: `${PARCH}50`, fontWeight: 700, margin: '0 0 16px' }}>
              🔜 בקרוב בחנות
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
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
                  <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}70`, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Physical products: Wood & Garden ── */}
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '0 20px',
          animation: 'shopFadeIn 0.5s ease 0.15s both',
        }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(245,200,64,0.12)', margin: '0 0 40px' }} />

          {/* Section header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: 0 }}>
                עץ וגינה
              </h2>
              <span style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}60` }}>
                מוצרים בעבודת יד
              </span>
              <span style={{
                fontFamily: ASST, fontSize: '11px', fontWeight: 700,
                color: '#8B6914',
                background: 'rgba(245,200,64,0.15)',
                border: '1px solid rgba(245,200,64,0.25)',
                padding: '3px 10px', borderRadius: '99px',
              }}>
                מוצרים פיזיים — משלוח/איסוף עצמי
              </span>
            </div>

            {/* Chupchu quote */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'rgba(125,192,132,0.07)',
              border: '1px solid rgba(125,192,132,0.15)',
              borderRadius: '12px', padding: '12px 16px',
              marginTop: '14px',
            }}>
              <img
                src="https://gina-haya.vercel.app/chupchu_final.png"
                alt="צ'ופצ'ו"
                style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
              />
              <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}80`, margin: 0, lineHeight: 1.6 }}>
                כל פריט נעשה ביד מעץ ממוחזר — פלטות ושאריות סדנה שקיבלו חיים חדשים. זמן ייצור 1–3 שבועות.
              </p>
            </div>
          </div>

          {/* Products grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '48px',
          }}>
            {WOOD_PRODUCTS.map(product => (
              <div
                key={product.id}
                className="shop-product-card"
                style={{
                  position: 'relative',
                  background: product.badge
                    ? 'linear-gradient(145deg, rgba(30,62,32,0.95) 0%, rgba(20,43,22,0.98) 100%)'
                    : 'rgba(20,50,22,0.6)',
                  border: product.badge
                    ? '2px solid rgba(245,200,64,0.3)'
                    : '1px solid rgba(245,200,64,0.15)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: product.badge ? '0 4px 24px rgba(245,200,64,0.08)' : '0 2px 12px rgba(0,0,0,0.15)',
                }}
              >
                {/* Icon area */}
                <div style={{
                  position: 'relative',
                  background: 'rgba(245,200,64,0.06)',
                  padding: '24px 20px 18px',
                  textAlign: 'center',
                }}>
                  {product.badge && (
                    <div style={{
                      position: 'absolute', top: 10, insetInlineStart: 12,
                      background: 'rgba(245,200,64,0.18)',
                      color: '#8B6914',
                      fontFamily: ASST, fontSize: '10px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '99px',
                    }}>
                      {product.badge}
                    </div>
                  )}
                  <span style={{ fontSize: '44px', lineHeight: 1 }}>{product.icon}</span>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontFamily: FRANK, fontSize: '17px', color: PARCH, fontWeight: 700 }}>
                    {product.nameHe}
                  </div>
                  <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}50` }}>
                    {product.nameEn}
                  </div>
                  <p style={{
                    fontFamily: ASST, fontSize: '13px', color: `${PARCH}70`,
                    margin: '6px 0 8px', lineHeight: 1.6, flex: 1,
                  }}>
                    {product.descHe}
                  </p>
                  <div style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, fontWeight: 700 }}>
                    {product.price}
                  </div>
                </div>

                {/* Footer button */}
                <div style={{ padding: '0 20px 20px' }}>
                  <button className="shop-wood-btn" onClick={() => handleWoodOrder(product)}>
                    לפרטים / הזמנה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom banner ── */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 80px', animation: 'shopFadeIn 0.5s ease 0.2s both' }}>
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

      {/* ── Floating cart button ── */}
      {cartCount > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            position: 'fixed', bottom: '88px', left: '20px', zIndex: 200,
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: GOLD, color: EARTH,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 8px 24px rgba(245,200,64,0.4)',
            transition: 'filter 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          🛒
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: '20px', height: '20px', borderRadius: '50%',
            backgroundColor: '#E06060', color: '#fff',
            fontFamily: ASST, fontSize: '11px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {cartCount}
          </span>
        </button>
      )}
    </>
  );
}
