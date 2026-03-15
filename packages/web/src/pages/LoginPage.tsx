import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuthStore } from '../stores/authStore';

const EARTH    = '#142B16';
const GOLD     = '#F5C840';
const SAGE     = '#7DC084';
const PARCH    = '#EDE0C4';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

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

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <>
      <style>{PAGE_CSS}</style>

      {/* Noise */}
      <div
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          0,
          pointerEvents:   'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat:'repeat',
          opacity:         0.28,
        }}
      />

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
          opacity:    0.04,
        }}
      >
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="90" stroke={GOLD} strokeWidth="1.5" strokeDasharray="8 6" />
          <circle cx="100" cy="100" r="65" stroke={GOLD} strokeWidth="1"   strokeDasharray="5 8" />
          <circle cx="100" cy="100" r="40" stroke={GOLD} strokeWidth="0.8" />
          <circle cx="100" cy="100" r="6"  fill={GOLD} />
        </svg>
      </div>

      <div style={{
        backgroundColor: EARTH,
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
              backgroundColor: 'rgba(245,200,64,0.1)',
              border:          '1px solid rgba(245,200,64,0.25)',
              fontSize:        '28px',
              marginBottom:    '12px',
            }}>
              🌱
            </div>
            <h1 style={{
              fontFamily: FRANK,
              fontWeight: 700,
              fontSize:   '26px',
              color:      GOLD,
              margin:     '0 0 4px',
              lineHeight: 1.1,
            }}>
              גינה חיה
            </h1>
            <p style={{
              fontFamily: PLAYFAIR,
              fontStyle:  'italic',
              fontSize:   '13px',
              color:      SAGE,
              margin:     0,
            }}>
              Gina Haya
            </p>
          </div>

          {/* Card */}
          <div style={{
            backgroundColor: 'rgba(28,58,30,0.85)',
            border:          '1px solid rgba(245,200,64,0.15)',
            borderRadius:    '16px',
            padding:         '32px',
            backdropFilter:  'blur(10px)',
          }}>
            <h2 style={{
              fontFamily:  FRANK,
              fontWeight:  600,
              fontSize:    '18px',
              color:       PARCH,
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
