import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Credits } from '../../hooks/useCredits';
import type { ProductId } from './ShopPage';

const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

export interface CartItem {
  productId: ProductId;
  name: string;
  price: number;
}

interface Props {
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (credits: Credits) => void;
}

type Step = 'summary' | 'processing' | 'success';

const PULSE_CSS = `
@keyframes chkPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.8; }
}
.chk-pulse { animation: chkPulse 1.4s ease-in-out infinite; }
`;

export function CheckoutModal({ cart, onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [step, setStep]         = useState<Step>('summary');
  const [credits, setCredits]   = useState<Credits | null>(null);
  const [error, setError]       = useState('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  async function handleConfirm() {
    if (!session?.access_token) return;
    setStep('processing');
    setError('');

    try {
      // Process each item sequentially; last response has updated credits
      let lastCredits: Credits | null = null;
      for (const item of cart) {
        const res = await api.post<{ success: boolean; credits: Credits }>(
          '/api/shop/purchase',
          { productId: item.productId },
          session.access_token,
        );
        lastCredits = res.credits;
      }

      setCredits(lastCredits);
      setStep('success');
      if (lastCredits) onSuccess(lastCredits);
    } catch (err: any) {
      setError(err.message || 'משהו השתבש. נסה שוב.');
      setStep('summary');
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
        onClick={e => { if (step === 'summary' && e.target === e.currentTarget) onClose(); }}
      >
        <div
          dir="rtl"
          style={{
            backgroundColor: '#1a3a1c',
            border: '1px solid rgba(245,200,64,0.25)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div style={{
            backgroundColor: '#142B16',
            borderBottom: '1px solid rgba(245,200,64,0.1)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
              {step === 'success' ? '🎉 הרכישה הושלמה!' : 'סיכום הזמנה'}
            </h2>
            {step === 'summary' && (
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(237,224,196,0.4)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ padding: '24px' }}>

            {/* ── Step: processing ── */}
            {step === 'processing' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div className="chk-pulse" style={{ fontSize: '60px', marginBottom: '16px' }}>🌕</div>
                <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 6px' }}>מעבד הזמנה...</p>
                <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`, margin: 0 }}>רגע אחד</p>
              </div>
            )}

            {/* ── Step: success ── */}
            {step === 'success' && credits && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
                <p style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH, margin: '0 0 20px', lineHeight: 1.6 }}>
                  הרכישה הושלמה בהצלחה!
                </p>

                {/* Credit summary */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(245,200,64,0.15)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px',
                  textAlign: 'right',
                }}>
                  <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}80`, margin: '0 0 10px' }}>
                    קרדיטים זמינים:
                  </p>
                  {credits.analysis.available > 0 && (
                    <div style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: '0 0 6px' }}>
                      🔬 ניתוחים: {credits.analysis.available}
                    </div>
                  )}
                  {credits.tracker.available > 0 && (
                    <div style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: '0 0 6px' }}>
                      🌱 מעקבים: {credits.tracker.available}
                    </div>
                  )}
                  {credits.garden.available > 0 && (
                    <div style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD }}>
                      🏡 גינות: {credits.garden.available}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { onClose(); navigate('/'); }}
                  style={{
                    width: '100%', padding: '13px',
                    backgroundColor: GOLD, color: EARTH,
                    border: 'none', borderRadius: '10px',
                    fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', transition: 'filter 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  המשך לגינה 🌿
                </button>
              </div>
            )}

            {/* ── Step: summary ── */}
            {step === 'summary' && (
              <>
                {/* Items list */}
                <div style={{ marginBottom: '20px' }}>
                  {cart.map(item => (
                    <div
                      key={item.productId}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(245,200,64,0.08)',
                      }}
                    >
                      <span style={{ fontFamily: ASST, fontSize: '14px', color: PARCH }}>
                        {item.name}
                      </span>
                      <span style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, fontWeight: 700 }}>
                        ₪{item.price % 1 === 0 ? item.price : item.price.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0 20px',
                  borderBottom: '1px solid rgba(245,200,64,0.15)',
                  marginBottom: '20px',
                }}>
                  <span style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>סה"כ</span>
                  <span style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700 }}>
                    ₪{total % 1 === 0 ? total : total.toFixed(1)}
                  </span>
                </div>

                {/* Payment method placeholder */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(245,200,64,0.2)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '22px' }}>💳</span>
                  <span style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}70` }}>
                    אמצעי תשלום: בקרוב
                  </span>
                </div>

                {error && (
                  <p style={{ fontFamily: ASST, fontSize: '13px', color: '#E06060', marginBottom: '12px', textAlign: 'right' }}>
                    {error}
                  </p>
                )}

                {/* CTA */}
                <button
                  onClick={handleConfirm}
                  style={{
                    width: '100%', padding: '13px',
                    backgroundColor: GOLD, color: EARTH,
                    border: 'none', borderRadius: '10px',
                    fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer', transition: 'filter 0.2s',
                    marginBottom: '10px',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  אשר הזמנה (בדיקה)
                </button>

                <p style={{
                  fontFamily: ASST, fontSize: '11px',
                  color: `${PARCH}40`, textAlign: 'center', margin: 0,
                }}>
                  זהו סימולציה — לא יחויב כרטיס אשראי
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
