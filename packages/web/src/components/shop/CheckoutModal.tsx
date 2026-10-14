import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Credits } from '../../hooks/useCredits';
import type { ProductId } from '../../pages/ShopPage';
import { EN_HEADING } from '../../styles/fonts';

const EARTH = '#050d0a';
const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';

export interface CartItem {
  productId: ProductId;
  name: string;
  price: number;
}

interface Props {
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (credits: Credits) => void;  // kept for interface compatibility
}

const PULSE_CSS = `
@keyframes chkPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.8; }
}
.chk-pulse { animation: chkPulse 1.4s ease-in-out infinite; }
`;

export function CheckoutModal({ cart, onClose }: Props) {
  const { session, isAuthReady } = useAuthStore();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState('');

  // Lemon Squeezy does not support multi-item carts — take the first item.
  const item = cart[0];
  const total = item?.price ?? 0;
  const hasMultiple = cart.length > 1;

  async function handleCheckout() {
    if (!item) return;

    if (!session?.access_token) {
      setError('כדי לשלם יש להתחבר לחשבון.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const data = await api.post<{ checkoutUrl?: string }>(
        '/api/shop/checkout',
        { productId: item.productId },
        session.access_token,
      );

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('לא התקבל קישור לתשלום');
      }
    } catch (err: any) {
      setError(err.message || 'משהו השתבש. נסה שוב.');
      setProcessing(false);
    }
  }

  return (
    <>
      <style>{PULSE_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          padding: '16px',
        }}
        onClick={e => {
          if (!processing && e.target === e.currentTarget) onClose();
        }}
      >
        <div
          dir="rtl"
          style={{
            backgroundColor: '#1a3a1c',
            border: '1px solid rgba(0,229,195,0.25)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div style={{
            backgroundColor: '#050d0a',
            borderBottom: '1px solid rgba(0,229,195,0.1)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
              {processing ? 'מעבד...' : 'סיכום הזמנה'}
            </h2>
            {!processing && (
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(176,207,191,0.4)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ padding: '24px' }}>
            {/* Processing */}
            {processing && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div className="chk-pulse" style={{ fontSize: '60px', marginBottom: '16px' }}>🌕</div>
                <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 6px' }}>
                  מתחבר לתשלום...
                </p>
                <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: `${PARCH}60`, margin: 0 }}>
                  רגע אחד
                </p>
              </div>
            )}

            {/* Summary */}
            {!processing && (
              <>
                {!isAuthReady ? (
                  <p style={{ fontFamily: EN_HEADING, fontSize: '14px', color: `${PARCH}88`, margin: 0, textAlign: 'center', padding: '24px 0' }}>
                    טוען...
                  </p>

                ) : !session ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <p style={{ fontFamily: EN_HEADING, fontSize: '15px', color: PARCH, margin: 0, lineHeight: 1.6 }}>
                      כדי להשלים רכישה צריך להתחבר לחשבון.
                    </p>
                    <button
                      onClick={() => navigate('/login?next=/shop')}
                      style={{
                        padding: '12px 32px',
                        backgroundColor: GOLD, color: EARTH,
                        border: 'none', borderRadius: '10px',
                        fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                        cursor: 'pointer', transition: 'filter 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                    >
                      התחברות
                    </button>
                  </div>

                ) : item ? (
                  <>
                    {/* One item */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(0,229,195,0.08)',
                      }}>
                        <span style={{ fontFamily: EN_HEADING, fontSize: '14px', color: PARCH }}>
                          {item.name}
                        </span>
                        <span style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, fontWeight: 700 }}>
                          ₪{total % 1 === 0 ? total : total.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Note when cart had multiple items */}
                    {hasMultiple && (
                      <p style={{
                        fontFamily: EN_HEADING, fontSize: '12px',
                        color: `${PARCH}77`, margin: '0 0 16px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(0,229,195,0.05)',
                        border: '1px solid rgba(0,229,195,0.1)',
                        lineHeight: 1.5,
                      }}>
                        מערכת התשלום מאפשרת רכישה אחת בכל פעם. לרכישות נוספות חזור לחנות.
                        {' / '}
                        One item per checkout. Return to the shop for additional purchases.
                      </p>
                    )}

                    {/* Total */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0 24px',
                      borderBottom: '1px solid rgba(0,229,195,0.15)',
                      marginBottom: '24px',
                    }}>
                      <span style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>סה"כ</span>
                      <span style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700 }}>
                        ₪{total % 1 === 0 ? total : total.toFixed(1)}
                      </span>
                    </div>

                    {error && (
                      <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: '#E06060', margin: '0 0 16px' }}>
                        {error}
                      </p>
                    )}

                    <button
                      onClick={handleCheckout}
                      style={{
                        width: '100%', padding: '13px',
                        backgroundColor: GOLD,
                        color: EARTH,
                        border: 'none', borderRadius: '10px',
                        fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'filter 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                    >
                      לתשלום ←
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
