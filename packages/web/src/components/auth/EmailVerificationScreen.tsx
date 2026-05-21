import { useState } from 'react';

const NIGHT    = '#050d0a';
const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

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
      {/* Avatar */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(0,229,195,0.35), rgba(0,180,150,0.15))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '44px', margin: '0 auto 16px',
        boxShadow: '0 0 24px rgba(0,229,195,0.2)',
        border: '1px solid rgba(0,229,195,0.25)',
      }}>
        🌱
      </div>

      <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: BIO_CYAN, margin: '0 0 12px' }}>
        כמעט סיימנו! 🌱
      </h2>

      <p style={{
        fontFamily: DM_SANS, fontSize: '14px', color: `${TEXT_MID}CC`,
        lineHeight: 1.7, margin: '0 0 24px',
      }}>
        שלחנו לך מייל לכתובת{' '}
        <strong style={{ color: TEXT_MID }}>{email}</strong>.
        <br />
        לחץ על הקישור במייל כדי לאמת את החשבון שלך.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <a
          href={`mailto:${email}`}
          style={{
            display: 'block', boxSizing: 'border-box',
            padding: '12px', borderRadius: '8px',
            backgroundColor: BIO_CYAN,
            fontFamily: FRANK, fontSize: '15px', fontWeight: 600,
            color: NIGHT, textDecoration: 'none', textAlign: 'center',
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
            border: '1px solid rgba(0,229,195,0.3)',
            backgroundColor: 'transparent',
            fontFamily: DM_SANS, fontSize: '14px',
            color: resent ? BIO_CYAN : `${TEXT_MID}70`,
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
