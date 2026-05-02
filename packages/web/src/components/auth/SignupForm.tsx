import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useAuthStore } from '../../stores/authStore';
import { mapAuthError, MIN_PASSWORD_LENGTH } from '../../utils/authErrors';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const SAGE   = '#7DC084';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const FORM_CSS = `
.auth-signup-input::placeholder { color: rgba(237,224,196,0.3); }
.auth-signup-input:focus {
  border-color: rgba(245,200,64,0.5) !important;
  outline: none;
  box-shadow: 0 0 0 3px rgba(245,200,64,0.06);
}
`;

export function SignupForm() {
  const { t, i18n } = useTranslation('auth');
  const lang: 'he' | 'en' = i18n.language === 'en' ? 'en' : 'he';
  const { dir } = useDirection();
  const { signUp, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signUp(email, password, displayName);
  };

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    boxSizing:       'border-box',
    backgroundColor: 'rgba(20,43,22,0.8)',
    border:          '1px solid rgba(125,192,132,0.2)',
    borderRadius:    '8px',
    padding:         '12px 16px',
    fontFamily:      ASSIST,
    fontSize:        '14px',
    color:           PARCH,
    transition:      'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontFamily:   ASSIST,
    fontWeight:   400,
    fontSize:     '13px',
    color:        `${PARCH}70`,
    marginBottom: '6px',
  };

  return (
    <>
      <style>{FORM_CSS}</style>

      <div dir={dir} style={{ width: '100%' }}>
        {error && (
          <div style={{
            marginBottom:    '16px',
            borderRadius:    '8px',
            padding:         '12px 14px',
            backgroundColor: 'rgba(192,57,43,0.15)',
            border:          '1px solid rgba(192,57,43,0.35)',
            fontFamily:      ASSIST,
            fontSize:        '13px',
            color:           '#E07070',
          }}>
            {mapAuthError(error, lang)}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>{t('signup.nameLabel')}</label>
            <input
              className="auth-signup-input"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('signup.namePlaceholder')}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t('signup.emailLabel')}</label>
            <input
              className="auth-signup-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t('signup.passwordLabel')}</label>
            <input
              className="auth-signup-input"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width:           '100%',
              padding:         '13px',
              borderRadius:    '8px',
              border:          'none',
              backgroundColor: GOLD,
              fontFamily:      FRANK,
              fontWeight:      600,
              fontSize:        '15px',
              color:           EARTH,
              cursor:          isLoading ? 'default' : 'pointer',
              opacity:         isLoading ? 0.7 : 1,
              transition:      'filter 0.2s',
              marginTop:       '4px',
            }}
            onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {isLoading ? '...' : t('signup.submitButton')}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(125,192,132,0.15)' }} />
          <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}40` }}>או</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(125,192,132,0.15)' }} />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isLoading}
          style={{
            width:           '100%',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '10px',
            padding:         '11px',
            borderRadius:    '8px',
            border:          '1px solid rgba(125,192,132,0.2)',
            backgroundColor: 'rgba(28,58,30,0.6)',
            fontFamily:      ASSIST,
            fontSize:        '14px',
            color:           PARCH,
            cursor:          isLoading ? 'default' : 'pointer',
            opacity:         isLoading ? 0.6 : 1,
            transition:      'background-color 0.15s',
          }}
          onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(28,58,30,0.9)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(28,58,30,0.6)'; }}
        >
          <GoogleIcon />
          {t('signup.googleButton')}
        </button>

        <p style={{ marginTop: '14px', textAlign: 'center', fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}35` }}>
          {t('signup.terms')}
        </p>

        <p style={{ marginTop: '12px', textAlign: 'center', fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}55` }}>
          {t('signup.hasAccount')}{' '}
          <Link to="/login" style={{ color: SAGE, fontWeight: 500, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = SAGE; }}
          >
            {t('signup.loginLink')}
          </Link>
        </p>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
