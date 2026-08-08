import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Credits } from '../../hooks/useCredits';
import type { ProductId } from '../../pages/ShopPage';

const EARTH = '#050d0a';
const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const SAGE  = '#4A9C68';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

export interface CartItem {
  productId: ProductId;
  name: string;
  price: number;
}

interface Props {
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (credits: Credits) => void;  // kept for interface compatibility; not called in Grow path
}

type Step = 'summary' | 'details' | 'processing';

const ISRAELI_MOBILE_RE = /^05\d{8}$/;

function validateFullName(v: string): string | null {
  const words = v.trim().split(/\s+/);
  return words.length >= 2 && words.every(w => w.length >= 2)
    ? null
    : 'נדרש שם מלא — שם פרטי ושם משפחה (לפחות 2 תווים כל אחד)';
}

function validatePhone(v: string): string | null {
  return ISRAELI_MOBILE_RE.test(v) ? null : 'מספר טלפון נייד ישראלי לא תקין (לדוגמה: 0501234567)';
}

const PULSE_CSS = `
@keyframes chkPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.8; }
}
.chk-pulse { animation: chkPulse 1.4s ease-in-out infinite; }
`;

export function CheckoutModal({ cart, onClose }: Props) {
  const { session } = useAuthStore();
  const [step, setStep]           = useState<Step>('summary');
  const [fullName, setFullName]   = useState('');
  const [fullNameErr, setFullNameErr] = useState<string | null>(null);
  const [phone, setPhone]         = useState('');
  const [phoneErr, setPhoneErr]   = useState<string | null>(null);
  const [error, setError]         = useState('');

  const total          = cart.reduce((sum, item) => sum + item.price, 0);
  const isFullNameValid = validateFullName(fullName) === null;
  const isPhoneValid    = ISRAELI_MOBILE_RE.test(phone);
  const isFormValid     = isFullNameValid && isPhoneValid;

  async function handlePay() {
    if (!session?.access_token || !isFormValid) return;
    setStep('processing');
    setError('');

    try {
      const data = await api.post<{ paymentUrl?: string }>(
        '/api/shop/grow/create-payment',
        {
          fullName: fullName.trim(),
          phone,
          cart: cart.map(item => ({ productId: item.productId, quantity: 1 })),
        },
        session.access_token,
      );

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('לא התקבל קישור לתשלום');
      }
    } catch (err: any) {
      setError(err.message || 'משהו השתבש. נסה שוב.');
      setStep('details');
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
          if (step === 'summary' && e.target === e.currentTarget) onClose();
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
              {step === 'summary'    ? 'סיכום הזמנה'
               : step === 'details' ? 'פרטי תשלום'
               : 'מעבד...'}
            </h2>
            {step !== 'processing' && (
              <button
                onClick={() => {
                  if (step === 'details') { setStep('summary'); return; }
                  onClose();
                }}
                style={{ background: 'none', border: 'none', color: 'rgba(176,207,191,0.4)', cursor: 'pointer', fontSize: '18px' }}
              >
                {step === 'details' ? '←' : '✕'}
              </button>
            )}
          </div>

          <div style={{ padding: '24px' }}>

            {/* ── Processing ── */}
            {step === 'processing' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div className="chk-pulse" style={{ fontSize: '60px', marginBottom: '16px' }}>🌕</div>
                <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 6px' }}>
                  מתחבר לגרו...
                </p>
                <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`, margin: 0 }}>
                  רגע אחד
                </p>
              </div>
            )}

            {/* ── Details: name + phone ── */}
            {step === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}CC`, margin: 0 }}>
                  לצורך עיבוד התשלום נדרשים שם מלא ומספר טלפון נייד ישראלי.
                </p>

                {/* Full name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="shop-fullname"
                    style={{ fontFamily: ASST, fontSize: '13px', fontWeight: 600, color: PARCH }}
                  >
                    שם מלא
                  </label>
                  <input
                    id="shop-fullname"
                    type="text"
                    dir="rtl"
                    placeholder="ישראל ישראלי"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value);
                      if (e.target.value.length > 0) setFullNameErr(validateFullName(e.target.value));
                      else setFullNameErr(null);
                    }}
                    onBlur={() => {
                      if (fullName.length > 0) setFullNameErr(validateFullName(fullName));
                    }}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: '8px',
                      border: fullNameErr
                        ? '1px solid rgba(192,57,43,0.7)'
                        : isFullNameValid && fullName.length > 0
                        ? `1px solid ${SAGE}88`
                        : '1px solid rgba(0,229,195,0.2)',
                      backgroundColor: 'rgba(9,20,16,0.6)',
                      fontFamily: ASST, fontSize: '15px', color: PARCH,
                      outline: 'none',
                    }}
                  />
                  {fullNameErr && (
                    <p style={{ fontFamily: ASST, fontSize: '12px', color: '#C0372A', margin: 0 }}>
                      {fullNameErr}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="shop-phone"
                    style={{ fontFamily: ASST, fontSize: '13px', fontWeight: 600, color: PARCH }}
                  >
                    מספר טלפון נייד
                  </label>
                  <input
                    id="shop-phone"
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="0501234567"
                    value={phone}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(v);
                      if (v.length > 0) setPhoneErr(validatePhone(v));
                      else setPhoneErr(null);
                    }}
                    onBlur={() => {
                      if (phone.length > 0) setPhoneErr(validatePhone(phone));
                    }}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: '8px',
                      border: phoneErr
                        ? '1px solid rgba(192,57,43,0.7)'
                        : isPhoneValid
                        ? `1px solid ${SAGE}88`
                        : '1px solid rgba(0,229,195,0.2)',
                      backgroundColor: 'rgba(9,20,16,0.6)',
                      fontFamily: ASST, fontSize: '15px', color: PARCH,
                      outline: 'none', letterSpacing: '0.06em',
                    }}
                  />
                  {phoneErr && (
                    <p style={{ fontFamily: ASST, fontSize: '12px', color: '#C0372A', margin: 0 }}>
                      {phoneErr}
                    </p>
                  )}
                </div>

                {error && (
                  <p style={{ fontFamily: ASST, fontSize: '13px', color: '#E06060', margin: 0 }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handlePay}
                  disabled={!isFormValid}
                  style={{
                    width: '100%', padding: '13px',
                    backgroundColor: isFormValid ? GOLD : `${GOLD}44`,
                    color: EARTH,
                    border: 'none', borderRadius: '10px',
                    fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                    cursor: isFormValid ? 'pointer' : 'default',
                    transition: 'filter 0.2s',
                  }}
                  onMouseEnter={e => { if (isFormValid) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  לתשלום בגרו ←
                </button>

                <p style={{
                  fontFamily: ASST, fontSize: '11px',
                  color: `${PARCH}40`, textAlign: 'center', margin: 0,
                }}>
                  תועבר לעמוד התשלום של גרו לביצוע הרכישה
                </p>
              </div>
            )}

            {/* ── Summary ── */}
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
                        borderBottom: '1px solid rgba(0,229,195,0.08)',
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
                  padding: '12px 0 24px',
                  borderBottom: '1px solid rgba(0,229,195,0.15)',
                  marginBottom: '24px',
                }}>
                  <span style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>סה"כ</span>
                  <span style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, fontWeight: 700 }}>
                    ₪{total % 1 === 0 ? total : total.toFixed(1)}
                  </span>
                </div>

                <button
                  onClick={() => setStep('details')}
                  style={{
                    width: '100%', padding: '13px',
                    backgroundColor: GOLD, color: EARTH,
                    border: 'none', borderRadius: '10px',
                    fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer', transition: 'filter 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  לפרטי תשלום →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
