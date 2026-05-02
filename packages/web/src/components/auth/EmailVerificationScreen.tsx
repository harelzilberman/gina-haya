import { useState } from 'react';

const EARTH = '#142B16';
const GOLD  = '#F5C840';
const SAGE  = '#7DC084';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

interface Props {
  email: string;
  onResend: () => Promise<void>;
}

export function EmailVerificationScreen({ email, onResend }: Props) {
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);

  const handleResend = async () => {
    setResending(true);
    await onResend();
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <div dir="rtl" style={{ textAlign: 'center', padding: '8px 0', width: '100%' }}>
      {/* Chupchu thinking avatar */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #F5E080, #C89010)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '44px', margin: '0 auto 16px',
        boxShadow: '0 0 24px rgba(245,200,64,0.28)',
      }}>
        🌕
      </div>

      <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, margin: '0 0 12px' }}>
        כמעט סיימנו! 🌱
      </h2>

      <p style={{
        fontFamily: ASST, fontSize: '14px', color: `${PARCH}CC`,
        lineHeight: 1.7, margin: '0 0 24px',
      }}>
        שלחנו לך מייל לכתובת{' '}
        <strong style={{ color: PARCH }}>{email}</strong>.
        <br />
        לחץ על הקישור במייל כדי לאמת את החשבון שלך.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <a
          href={`mailto:${email}`}
          style={{
            display: 'block', boxSizing: 'border-box',
            padding: '12px', borderRadius: '8px',
            backgroundColor: GOLD,
            fontFamily: FRANK, fontSize: '15px', fontWeight: 600,
            color: EARTH, textDecoration: 'none', textAlign: 'center',
          }}
        >
          פתח את תיבת הדואר
        </a>

        <button
          onClick={handleResend}
          disabled={resending}
          style={{
            width: '100%', padding: '11px',
            borderRadius: '8px',
            border: '1px solid rgba(125,192,132,0.3)',
            backgroundColor: 'transparent',
            fontFamily: ASST, fontSize: '14px',
            color: resent ? SAGE : `${PARCH}70`,
            cursor: resending ? 'default' : 'pointer',
            transition: 'color 0.2s',
          }}
        >
          {resent ? '✓ נשלח מחדש!' : resending ? '...' : 'שלח שוב'}
        </button>
      </div>
    </div>
  );
}
