import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuthStore } from '../stores/authStore';

const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PAGE_CSS = `
@keyframes auth-wheel-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.auth-wheel { animation: auth-wheel-spin 60s linear infinite; }
`;

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      const destination = next && next.startsWith('/') ? next : '/';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location.search]);

  return (
    <>
      <style>{PAGE_CSS}</style>

      {/* Decorative rotating wheel */}
      <div
        aria-hidden="true"
        className="auth-wheel"
        style={{
          position:   'fixed',
          top:        '-120px',
          insetInlineEnd: '-120px',
          width:      '380px',
          height:     '380px',
          zIndex:     0,
          pointerEvents: 'none',
          opacity:    0.06,
        }}
      >
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="90" stroke={BIO_CYAN} strokeWidth="1.5" strokeDasharray="8 6" />
          <circle cx="100" cy="100" r="65" stroke={BIO_CYAN} strokeWidth="1"   strokeDasharray="5 8" />
          <circle cx="100" cy="100" r="40" stroke={BIO_CYAN} strokeWidth="0.8" />
          <circle cx="100" cy="100" r="6"  fill={BIO_CYAN} />
        </svg>
      </div>

      <div style={{
        backgroundColor: NIGHT,
        minHeight:       '100vh',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '48px 16px',
        position:        'relative',
        zIndex:          1,
      }}>
        <div style={{ width: '100%', maxWidth: '368px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display:         'inline-flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           '60px',
              height:          '60px',
              borderRadius:    '50%',
              backgroundColor: 'rgba(0,229,195,0.1)',
              border:          '1px solid rgba(0,229,195,0.25)',
              fontSize:        '28px',
              marginBottom:    '12px',
            }}>
              🌱
            </div>
            <h1 style={{
              fontFamily: FRANK,
              fontWeight: 700,
              fontSize:   '26px',
              color:      BIO_CYAN,
              margin:     '0 0 4px',
              lineHeight: 1.1,
            }}>
              גינה חיה
            </h1>
            <p style={{
              fontFamily: DM_SANS,
              fontStyle:  'italic',
              fontSize:   '13px',
              color:      TEXT_MID,
              margin:     0,
            }}>
              Gina Haya
            </p>
          </div>

          {/* Card */}
          <div style={{
            backgroundColor: NIGHT_CARD,
            border:          '1px solid rgba(0,229,195,0.15)',
            borderRadius:    '16px',
            padding:         '32px',
          }}>
            <h2 style={{
              fontFamily:  FRANK,
              fontWeight:  600,
              fontSize:    '18px',
              color:       TEXT_MID,
              textAlign:   'center',
              margin:      '0 0 24px',
            }}>
              {t('login.title')}
            </h2>

            <LoginForm />
          </div>

        </div>
      </div>
    </>
  );
}
