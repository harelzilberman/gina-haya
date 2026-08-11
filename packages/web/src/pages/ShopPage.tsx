import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckoutModal, type CartItem } from '../components/shop/CheckoutModal';
import { useCredits, type Credits } from '../hooks/useCredits';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import BIODYNAMIC_RAW from '../../../shared/data/biodynamic-products.json';

export type ProductId =
  | 'analysis_single'
  | 'analysis_pack_5'
  | 'analysis_pack_10'
  | 'tracker_single'
  | 'tracker_pack_5'
  | 'tracker_pack_10'
  | 'garden_pack';

const EARTH  = '#0A2A12';
const HEADER = '#0F3319';
const GOLD   = '#C8A951';
const PARCH  = '#F5F0E8';
const SAGE   = '#8FBF7F';
const MUTED  = '#B8C4B0';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASST   = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

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
  color: rgba(245,240,232,0.5);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(200,169,81,0.2); border-radius: 10px; cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.shop-remove-btn:hover { color: #E06060; border-color: rgba(224,96,96,0.4); }
.shop-wood-btn {
  width: 100%; padding: 11px;
  font-family: ${FRANK}; font-size: 14px; font-weight: 700;
  color: ${GOLD}; background: transparent;
  border: 1.5px solid rgba(200,169,81,0.4); border-radius: 10px; cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.shop-wood-btn:hover { background: rgba(200,169,81,0.08); border-color: ${GOLD}; }
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

interface BiodynamicProduct {
  id: string;
  nameHe: string;
  nameEn: string;
  priceIls: number;
  originalPriceIls?: number;
  category: string;
  descriptionHe: string;
  descriptionEn: string;
  note?: string | null;
}
const BIODYNAMIC_PRODUCTS = BIODYNAMIC_RAW as BiodynamicProduct[];

// Unified product descriptor passed to the waitlist modal
interface WaitlistProduct {
  id: string;
  nameHe: string;
  priceStr: string;
  category: string;
}

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
  const showNudge = total >= 18;

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
          backgroundColor: '#1B3D22',
          borderInlineStart: `1px solid rgba(200,169,81,0.15)`,
          display: 'flex', flexDirection: 'column',
          animation: 'drawerIn 0.25s ease both',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid rgba(200,169,81,0.1)`,
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
                  borderBottom: `1px solid rgba(200,169,81,0.07)`,
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
          borderTop: `1px solid rgba(200,169,81,0.1)`,
          flexShrink: 0,
        }}>
          {/* Cart nudge: shown when total >= 18 */}
          {showNudge && (
            <div style={{
              marginBottom: '12px',
              padding: '10px 12px',
              border: `1px dashed rgba(200,169,81,0.35)`,
              borderRadius: '8px',
              fontFamily: ASST, fontSize: '12px', color: MUTED,
              lineHeight: 1.55,
            }}>
              בעגלה: ₪{total % 1 === 0 ? total : total.toFixed(1)} · בסכום הזה, חודש{' '}
              <span style={{ color: GOLD }}>גנן ביתי</span> כבר כולל הכל —{' '}
              <Link
                to="/pricing"
                onClick={onClose}
                style={{ color: GOLD, textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                להחליף למנוי? →
              </Link>
            </div>
          )}

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
              backgroundColor: cart.length > 0 ? GOLD : `rgba(200,169,81,0.3)`,
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
  const isBadge = !!product.badge;
  return (
    <div
      className="shop-product-card"
      style={{
        position: 'relative',
        background: isBadge
          ? 'linear-gradient(145deg, rgba(10,42,18,0.98) 0%, rgba(15,51,25,0.95) 100%)'
          : 'rgba(10,42,18,0.6)',
        border: inCart
          ? `2px solid ${GOLD}`
          : isBadge
            ? `2px solid ${GOLD}`
            : `1px solid rgba(200,169,81,0.15)`,
        borderRadius: '14px',
        padding: isBadge ? '26px 20px' : '22px 20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: isBadge
          ? `0 8px 32px rgba(200,169,81,0.18)`
          : '0 2px 12px rgba(0,0,0,0.15)',
        transform: isBadge && !inCart ? 'scale(1.03)' : undefined,
        transformOrigin: 'center top',
      }}
    >
      {isBadge && !inCart && (
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
        <div style={{ fontFamily: FRANK, fontSize: isBadge ? '18px' : '17px', color: PARCH, fontWeight: 700, marginBottom: '2px' }}>
          {product.label}
        </div>
        <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED }}>
          {product.note}
        </div>
      </div>
      <div style={{ fontFamily: FRANK, fontSize: isBadge ? '36px' : '32px', color: GOLD, fontWeight: 700 }}>
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

const CART_STORAGE_KEY = 'gina-haya-shop-cart';

export function ShopPage() {
  const { user } = useAuthStore();
  const { credits, refresh: refreshCredits } = useCredits();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  // ── Cart — persisted to localStorage so it survives the redirect to Grow ──
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // ── Post-payment banner (shown when user returns from Grow via successUrl) ──
  const [paymentBanner, setPaymentBanner] = useState<'pending' | 'done' | null>(
    status === 'success' ? 'pending' : null
  );
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearStatusParam() {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }

    if (status !== 'success') {
      if (status) clearStatusParam();
      return;
    }

    clearStatusParam();

    // Clear cart — payment was confirmed
    localStorage.removeItem(CART_STORAGE_KEY);
    setCart([]);

    // After a brief delay (webhook fires ~1–2 s after payment),
    // refresh credits and show success.
    bannerTimerRef.current = setTimeout(async () => {
      await refreshCredits();
      setPaymentBanner('done');
    }, 3000);

    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function handleCheckoutSuccess(_newCredits: Credits) {
    // Called only by the mock /purchase path (dev mode).
    // In the Grow path the user is redirected away; success is handled via ?status=success above.
    refreshCredits();
    setCart([]);
    setDrawerOpen(false);
  }

  const hasAnyCredits = credits.analysis.available > 0 || credits.tracker.available > 0 || credits.garden.available > 0;

  // ── Waitlist modal (wood + biodynamic products) ──────────────────────────
  const [waitlistProduct, setWaitlistProduct] = useState<WaitlistProduct | null>(null);
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistForm, setWaitlistForm] = useState({ email: '', notes: '' });

  function openWaitlistModal(product: WaitlistProduct) {
    setWaitlistProduct(product);
    setWaitlistSent(false);
    setWaitlistSubmitting(false);
    setWaitlistError(null);
    setWaitlistForm({
      email: '',
      notes: `שלום, אני מעוניין/ת להזמין: ${product.nameHe} (${product.priceStr})\n\n`,
    });
  }

  async function handleWaitlistSubmit() {
    if (!waitlistForm.email.trim() || !waitlistProduct) return;
    setWaitlistSubmitting(true);
    setWaitlistError(null);
    try {
      await api.post<{ ok: boolean }>('/api/waitlist', {
        email:        waitlistForm.email.trim(),
        source:       'shop_waitlist',
        locale:       'he',
        product_id:   waitlistProduct.id,
        product_name: waitlistProduct.nameHe,
        notes:        waitlistForm.notes,
        category:     waitlistProduct.category,
      });
      setWaitlistSent(true);
    } catch {
      setWaitlistError('משהו השתבש, נסו שוב.');
    } finally {
      setWaitlistSubmitting(false);
    }
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

      {/* Waitlist modal (shared by wood + biodynamic products) */}
      {waitlistProduct && (
        <>
          {/* Backdrop doubles as the flex centering container so the modal
              always has breathing room above and below, even on short viewports.
              padding: 24px 0 keeps the modal away from the top/bottom edges. */}
          <div
            onClick={() => setWaitlistProduct(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px 16px',
            }}
          >
          <div
            dir="rtl"
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(480px, 92vw)',
              /* 80dvh is the true available height on mobile where vh overestimates.
                 min() with 80vh is the fallback for browsers without dvh support. */
              maxHeight: 'min(80vh, 80dvh)',
              backgroundColor: '#1B3D22',
              border: `1px solid rgba(200,169,81,0.25)`,
              borderRadius: '18px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              animation: 'shopFadeIn 0.2s ease both',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Non-scrolling header */}
            <div style={{ padding: '24px 28px 16px', flexShrink: 0, borderBottom: `1px solid rgba(200,169,81,0.1)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                  {waitlistProduct.nameHe}
                </h2>
                <button
                  onClick={() => setWaitlistProduct(null)}
                  style={{ background: 'none', border: 'none', color: `${PARCH}50`, cursor: 'pointer', fontSize: '18px', padding: '0 0 0 8px', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, margin: 0 }}>
                {waitlistProduct.priceStr} · נודיע כשהמוצר זמין
              </p>
            </div>

            {!waitlistSent ? (
              <>
                {/* Scrollable form body — minHeight:0 is required so flex+overflow
                    actually constrains height rather than expanding to content */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70`, display: 'block', marginBottom: '5px' }}>
                        אימייל *
                      </label>
                      <input
                        type="email"
                        value={waitlistForm.email}
                        onChange={e => setWaitlistForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="your@email.com"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '10px 12px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid rgba(200,169,81,0.15)`,
                          color: PARCH, fontFamily: ASST, fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70`, display: 'block', marginBottom: '5px' }}>
                        הערות / שאלות
                      </label>
                      <textarea
                        value={waitlistForm.notes}
                        onChange={e => setWaitlistForm(f => ({ ...f, notes: e.target.value }))}
                        rows={4}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '10px 12px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid rgba(200,169,81,0.15)`,
                          color: PARCH, fontFamily: ASST, fontSize: '14px',
                          outline: 'none', resize: 'vertical',
                        }}
                      />
                    </div>
                    {waitlistError && (
                      <p style={{ fontFamily: ASST, fontSize: '13px', color: '#E06060', margin: 0 }}>
                        {waitlistError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sticky footer with submit button — always visible */}
                <div style={{ padding: '16px 28px 24px', flexShrink: 0 }}>
                  <button
                    onClick={handleWaitlistSubmit}
                    disabled={waitlistSubmitting || !waitlistForm.email.trim()}
                    style={{
                      width: '100%', padding: '13px',
                      backgroundColor: waitlistSubmitting || !waitlistForm.email.trim()
                        ? `rgba(200,169,81,0.35)`
                        : GOLD,
                      color: EARTH,
                      border: 'none', borderRadius: '10px',
                      fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                      cursor: waitlistSubmitting || !waitlistForm.email.trim() ? 'not-allowed' : 'pointer',
                      transition: 'filter 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!waitlistSubmitting && waitlistForm.email.trim())
                        (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                  >
                    {waitlistSubmitting ? 'שולח...' : 'הצטרפו לרשימת ההמתנה'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 28px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌿</div>
                <p style={{ fontFamily: FRANK, fontSize: '18px', color: SAGE, fontWeight: 700, margin: '0 0 8px' }}>
                  נרשמתם בהצלחה!
                </p>
                <p style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, margin: '0 0 24px' }}>
                  נעדכן אתכם ברגע שהמוצר זמין.
                </p>
                <button
                  onClick={() => setWaitlistProduct(null)}
                  style={{
                    padding: '10px 28px',
                    background: 'transparent',
                    border: `1.5px solid rgba(200,169,81,0.4)`,
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
          </div>
        </>
      )}

      <div dir="rtl" style={{ minHeight: '100vh', background: EARTH, fontFamily: ASST }}>

        {/* ── Post-payment banners ── */}
        {paymentBanner === 'pending' && (
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 0' }}>
            <div style={{
              backgroundColor: 'rgba(0,229,195,0.07)',
              border: '1px solid rgba(0,229,195,0.25)',
              borderRadius: '10px',
              padding: '14px 20px',
              fontFamily: ASST, fontSize: '14px', color: GOLD,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              מעדכן את הקרדיטים שלך...
              <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
            </div>
          </div>
        )}
        {paymentBanner === 'done' && (
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 0' }}>
            <div style={{
              backgroundColor: 'rgba(143,191,127,0.1)',
              border: '1px solid rgba(143,191,127,0.3)',
              borderRadius: '10px',
              padding: '14px 20px',
              fontFamily: FRANK, fontSize: '15px', color: '#8FBF7F',
            }}>
              🎉 הרכישה הושלמה! הקרדיטים שלך עודכנו.
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        <div style={{
          background: `linear-gradient(180deg, ${HEADER} 0%, ${EARTH} 100%)`,
          padding: '72px 24px 56px',
          textAlign: 'center',
          animation: 'shopFadeIn 0.5s ease both',
        }}>
          {/* Workshop label */}
          <div style={{
            display: 'inline-block',
            fontFamily: ASST, fontSize: '12px', fontWeight: 700,
            color: SAGE, letterSpacing: '0.08em',
            background: 'rgba(143,191,127,0.1)',
            border: '1px solid rgba(143,191,127,0.25)',
            padding: '4px 14px', borderRadius: '99px',
            marginBottom: '20px',
          }}>
            בית המלאכה של צ'ופצ'ו
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: FRANK, fontSize: 'clamp(28px, 5.5vw, 48px)',
            color: PARCH, margin: '0 0 16px', fontWeight: 700, lineHeight: 1.25,
          }}>
            הצמח נראה רע?<br />צ'ופצ'ו יגיד לך למה.
          </h1>

          {/* Subheadline */}
          <p style={{
            fontFamily: ASST, fontSize: 'clamp(15px, 2.5vw, 17px)',
            color: MUTED, margin: '0 auto 28px',
            maxWidth: '480px', lineHeight: 1.6,
          }}>
            מעלים תמונה, מקבלים דוח בריאות מלא עם תכנית טיפול.
          </p>

          {/* CTA */}
          <a
            href="#analysis-section"
            style={{
              display: 'inline-block',
              fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
              color: EARTH, background: GOLD,
              padding: '13px 28px', borderRadius: '12px',
              textDecoration: 'none', marginBottom: '18px',
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            בדוק את הצמח שלי
          </a>

          {/* Permanence badge */}
          <div style={{
            fontFamily: ASST, fontSize: '12px',
            color: `${SAGE}90`, letterSpacing: '0.02em',
          }}>
            ∞ כל רכישה תקפה לצמיתות — בלי מנוי, בלי תוקף
          </div>
        </div>

        {/* ── Credit balance (if any) ── */}
        {user && hasAnyCredits && (
          <div style={{
            maxWidth: '900px', margin: '0 auto 0',
            padding: '0 20px',
            animation: 'shopFadeIn 0.4s ease both',
          }}>
            <div style={{
              backgroundColor: `rgba(200,169,81,0.08)`,
              border: `1px solid rgba(200,169,81,0.2)`,
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
          <div id="analysis-section" style={{ marginBottom: '48px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: 0 }}>
                  🔬 ניתוח צמחים + דוח מלא
                </h2>
                <span style={{
                  fontFamily: ASST, fontSize: '11px', color: SAGE,
                  background: 'rgba(143,191,127,0.1)',
                  border: '1px solid rgba(143,191,127,0.25)',
                  padding: '2px 10px', borderRadius: '99px',
                }}>
                  תקף לצמיתות
                </span>
              </div>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: MUTED, margin: 0, lineHeight: 1.6 }}>
                העלה תמונה של הצמח שלך וקבל ניתוח AI מפורט: דוח בריאות, זיהוי בעיות, משימות ותכנית טיפול.
              </p>
            </div>

            {/* Sample report card */}
            <div style={{
              background: 'rgba(10,42,18,0.8)',
              border: `1px solid rgba(200,169,81,0.2)`,
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '24px',
            }}>
              <div style={{ fontFamily: FRANK, fontSize: '13px', color: MUTED, fontWeight: 700, marginBottom: '14px', letterSpacing: '0.03em' }}>
                כך נראה הדוח שתקבלו
              </div>
              {/* Plant header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '24px' }}>🍅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH, fontWeight: 700, marginBottom: '2px' }}>עגבנייה · מרפסת</div>
                  <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED }}>ניתוח 14.7.2026</div>
                </div>
                <div style={{
                  background: `rgba(200,169,81,0.15)`,
                  border: `1px solid rgba(200,169,81,0.3)`,
                  borderRadius: '10px', padding: '6px 14px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, lineHeight: 1 }}>72</div>
                  <div style={{ fontFamily: ASST, fontSize: '10px', color: MUTED }}>מתוך 100</div>
                </div>
              </div>
              {/* Findings */}
              <div style={{ borderTop: `1px solid rgba(200,169,81,0.1)`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                  <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, lineHeight: 1.5 }}>מחסור באשלגן — עלים צהובים בשולי הצמח. מומלץ דישון אשלגן פוספט.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>💧</span>
                  <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, lineHeight: 1.5 }}>השקיה: מומלץ להפחית תדירות — אדמה לחה מדי בין השקיות.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px', color: SAGE }}>✓</span>
                  <span style={{ fontFamily: ASST, fontSize: '13px', color: SAGE, lineHeight: 1.5 }}>3 משימות טיפול נוספו ללוח השנה שלך.</span>
                </div>
              </div>
            </div>

            {/* Pricing grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'start' }}>
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

          {/* Subscription comparison band */}
          <div style={{
            border: `2px solid ${GOLD}`,
            borderRadius: '16px',
            padding: '24px 28px',
            marginBottom: '48px',
            background: `linear-gradient(135deg, rgba(15,51,25,0.9) 0%, rgba(10,42,18,0.95) 100%)`,
            boxShadow: `0 4px 24px rgba(200,169,81,0.12)`,
          }}>
            <div style={{
              fontFamily: FRANK, fontSize: 'clamp(15px, 2.5vw, 18px)',
              color: PARCH, fontWeight: 700, marginBottom: '20px', lineHeight: 1.45,
            }}>
              10 בדיקות עולות ₪21.{' '}
              <span style={{ color: GOLD }}>חודש שלם של הכל — ₪18.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '24px' }}>
              {/* Pay-as-you-go column */}
              <div>
                <div style={{ fontFamily: FRANK, fontSize: '15px', color: PARCH, fontWeight: 700, marginBottom: '10px' }}>
                  קונים לפי צורך
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {['בלי התחייבות', 'תקף לצמיתות', 'משלמים רק על מה שצריך'].map(item => (
                    <li key={item} style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ color: SAGE, fontSize: '12px' }}>·</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Subscription column */}
              <div>
                <div style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, fontWeight: 700, marginBottom: '10px' }}>
                  מפתח לבית המלאכה — גנן ביתי
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                  {["צ'ופצ'ו בלי הגבלה", 'כל הבדיקות כלולות', 'מעקבים ללא הגבלה'].map(item => (
                    <li key={item} style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ color: GOLD, fontSize: '12px' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pricing"
                  style={{
                    display: 'inline-block',
                    fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                    color: EARTH, background: GOLD,
                    padding: '10px 22px', borderRadius: '10px',
                    textDecoration: 'none', marginBottom: '7px',
                    transition: 'filter 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  ₪18 לחודש
                </Link>
                <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED }}>
                  או ₪180 לשנה — חודשיים מתנה
                </div>
              </div>
            </div>
          </div>

          {/* Trackers */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: '0 0 8px' }}>
                📈 מעקבי גידול
              </h2>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: MUTED, margin: 0, lineHeight: 1.6 }}>
                עקוב אחר הצמחים שלך לאורך זמן עם תמונות, הערות וניתוח התקדמות. כל מעקב תקף לצמיתות.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'start' }}>
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
            <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: MUTED, fontWeight: 700, margin: '0 0 16px' }}>
              🔜 בקרוב בחנות
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {COMING_SOON.map((item, i) => (
                <div key={i} style={{
                  position: 'relative',
                  background: 'rgba(10,42,18,0.3)',
                  border: `1px solid rgba(200,169,81,0.07)`,
                  borderRadius: '14px', padding: '22px 20px',
                  opacity: 0.5,
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{
                    position: 'absolute', top: -10, insetInlineEnd: 16,
                    background: `rgba(200,169,81,0.15)`, color: `${GOLD}AA`,
                    fontFamily: ASST, fontSize: '10px', fontWeight: 700,
                    padding: '2px 10px', borderRadius: '99px', letterSpacing: '0.05em',
                  }}>
                    בקרוב
                  </div>
                  <div style={{ fontSize: '28px' }}>{item.emoji}</div>
                  <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Physical products: הנגרייה ── */}
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '0 20px',
          animation: 'shopFadeIn 0.5s ease 0.15s both',
        }}>
          <hr style={{ border: 'none', borderTop: `1px solid rgba(200,169,81,0.12)`, margin: '0 0 40px' }} />

          {/* Section header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: '0 0 8px' }}>
              הנגרייה — בקרוב על שולחן העבודה
            </h2>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: MUTED, margin: '0 0 14px', lineHeight: 1.6 }}>
              עץ ממוחזר, עבודת יד, כל פריט יחיד במינו.
            </p>

            {/* Chupchu quote */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: `rgba(200,169,81,0.07)`,
              border: `1px solid rgba(200,169,81,0.15)`,
              borderRadius: '12px', padding: '12px 16px',
            }}>
              <img
                src="https://gina-haya.com/chupchu_final.png"
                alt="צ'ופצ'ו"
                style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
              />
              <p style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, margin: 0, lineHeight: 1.6 }}>
                כל פריט נעשה ביד מעץ ממוחזר — פלטות ושאריות סדנה שקיבלו חיים חדשים. זמן ייצור 1–3 שבועות.
              </p>
            </div>
          </div>

          {/* Products grid — now functional */}
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
                    ? 'linear-gradient(145deg, rgba(10,42,18,0.95) 0%, rgba(15,51,25,0.98) 100%)'
                    : 'rgba(10,42,18,0.6)',
                  border: product.badge
                    ? `2px solid rgba(200,169,81,0.3)`
                    : `1px solid rgba(200,169,81,0.15)`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: product.badge ? `0 4px 24px rgba(200,169,81,0.08)` : '0 2px 12px rgba(0,0,0,0.15)',
                }}
              >
                {/* Icon area */}
                <div style={{
                  position: 'relative',
                  background: `rgba(200,169,81,0.06)`,
                  padding: '24px 20px 18px',
                  textAlign: 'center',
                }}>
                  {product.badge && (
                    <div style={{
                      position: 'absolute', top: 10, insetInlineStart: 12,
                      background: `rgba(200,169,81,0.18)`,
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
                  <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED }}>
                    {product.nameEn}
                  </div>
                  <p style={{
                    fontFamily: ASST, fontSize: '13px', color: MUTED,
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
                  <button
                    className="shop-wood-btn"
                    onClick={() => openWaitlistModal({
                      id: product.id,
                      nameHe: product.nameHe,
                      priceStr: product.price,
                      category: 'wood',
                    })}
                  >
                    ספרו לי כשמוכן
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Biodynamic products ── */}
        <div
          style={{
            maxWidth: '900px', margin: '0 auto',
            padding: '0 20px',
            animation: 'shopFadeIn 0.5s ease 0.2s both',
          }}
        >
          <hr style={{ border: 'none', borderTop: `1px solid rgba(200,169,81,0.12)`, margin: '0 0 40px' }} />

          {/* Section header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700, margin: '0 0 8px' }}>
              🌿 תוספים ביודינמיים — טרם זמינים
            </h2>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: MUTED, margin: '0 0 6px', lineHeight: 1.6 }}>
              מוצרים מ-Vitalis Biodynamic Israel (ניצן שפילמן). אנחנו בתהליך גיבוש שיתוף הפעולה עם הספק —
              השאירו אימייל ונעדכן אתכם ברגע שמוכן.
            </p>
            <p style={{ fontFamily: ASST, fontSize: '12px', color: `${MUTED}90`, margin: 0, lineHeight: 1.5 }}>
              * המחירים המוצגים הם מחירי הספק ועשויים להשתנות. אין כאן הצעת מכר בשלב זה.
            </p>
          </div>

          {/* Products grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '48px',
          }}>
            {BIODYNAMIC_PRODUCTS.map(product => (
              <div
                key={product.id}
                className="shop-product-card"
                style={{
                  position: 'relative',
                  background: 'rgba(10,42,18,0.6)',
                  border: `1px solid rgba(200,169,81,0.15)`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                }}
              >
                {/* Note badge (e.g. out of stock at supplier) */}
                {product.note && (
                  <div style={{
                    position: 'absolute', top: 10, insetInlineEnd: 12,
                    background: `rgba(200,169,81,0.15)`,
                    color: `${GOLD}CC`,
                    fontFamily: ASST, fontSize: '10px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '99px',
                    maxWidth: '120px', lineHeight: 1.3,
                  }}>
                    {product.note}
                  </div>
                )}

                {/* Body */}
                <div style={{ padding: '20px 20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontFamily: FRANK, fontSize: '15px', color: PARCH, fontWeight: 700, lineHeight: 1.35 }}>
                    {product.nameHe}
                  </div>
                  <div style={{ fontFamily: ASST, fontSize: '11px', color: `${MUTED}80`, marginBottom: '8px' }}>
                    {product.category}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto' }}>
                    <span style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, fontWeight: 700 }}>
                      ₪{product.priceIls}
                    </span>
                    {product.originalPriceIls && (
                      <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, textDecoration: 'line-through' }}>
                        ₪{product.originalPriceIls}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer button */}
                <div style={{ padding: '0 20px 20px' }}>
                  <button
                    className="shop-wood-btn"
                    onClick={() => openWaitlistModal({
                      id: product.id,
                      nameHe: product.nameHe,
                      priceStr: `₪${product.priceIls}`,
                      category: 'biodynamic',
                    })}
                  >
                    ספרו לי כשמוכן
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom banner ── */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 80px', animation: 'shopFadeIn 0.5s ease 0.2s both' }}>
          <div style={{
            background: `linear-gradient(135deg, rgba(10,42,18,0.7) 0%, rgba(15,51,25,0.8) 100%)`,
            border: `1px solid rgba(200,169,81,0.18)`,
            borderRadius: '16px', padding: '24px 28px',
            display: 'flex', flexWrap: 'wrap', gap: '12px',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: FRANK, fontSize: '18px', color: PARCH, fontWeight: 700, marginBottom: '4px' }}>
                גנן רציני? המנוי שלנו כולל הכל ועוד.
              </div>
              <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED }}>
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
            boxShadow: `0 8px 24px rgba(200,169,81,0.4)`,
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
