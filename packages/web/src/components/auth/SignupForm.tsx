import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useAuthStore } from '../../stores/authStore';
import { mapAuthError, MIN_PASSWORD_LENGTH } from '../../utils/authErrors';
import { supabase } from '../../lib/supabase';
import { EmailVerificationScreen } from './EmailVerificationScreen';

const NIGHT    = '#050d0a';
const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const FORM_CSS = `
.auth-signup-input::placeholder { color: rgba(176,207,191,0.3); }
.auth-signup-input:focus {
  border-color: rgba(0,229,195,0.5) !important;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0,229,195,0.07);
}
@keyframes authSpin { to { transform: rotate(360deg) } }
.auth-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: authSpin 0.7s linear infinite;
  display: inline-block;
  margin-inline-end: 8px;
  vertical-align: middle;
}
`;

export function SignupForm() {
  const { t, i18n } = useTranslation('auth');
  const lang: 'he' | 'en' = i18n.language === 'en' ? 'en' : 'he';
  const { dir } = useDirection();
  const { signUp, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [displayName,       setDisplayName]       = useState('');
  const [email,             setEmail]             = useState('');
  const [password,          setPassword]          = useState('');
  const [agreedToTerms,     setAgreedToTerms]     = useState(false);
  const [showVerification,  setShowVerification]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signUp(email, password, displayName);
    const { error: storeError, session, user } = useAuthStore.getState();
    if (!storeError && user && !session) {
      setShowVerification(true);
    }
  };

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    boxSizing:       'border-box',
    backgroundColor: 'rgba(9,20,16,0.85)',
    border:          '1px solid rgba(0,229,195,0.2)',
    borderRadius:    '8px',
    padding:         '12px 16px',
    fontFamily:      DM_SANS,
    fontSize:        '14px',
    color:           TEXT_MID,
    transition:      'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontFamily:   DM_SANS,
    fontWeight:   400,
    fontSize:     '13px',
    color:        `${TEXT_MID}70`,
    marginBottom: '6px',
  };

  if (showVerification) {
    return (
      <EmailVerificationScreen
        email={email}
        onResend={async () => { await supabase.auth.resend({ type: 'signup', email }); }}
      />
    );
  }

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
            fontFamily:      DM_SANS,
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

          <label style={{
            display: 'flex', gap: '8px', fontSize: '13px',
            alignItems: 'flex-start', cursor: 'pointer',
            color: `${TEXT_MID}90`, fontFamily: DM_SANS,
          }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <span>
              {t('agreeToTerms')}{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: BIO_CYAN }}>{t('privacyPolicy')}</a>
              {' '}{t('and')}{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: BIO_CYAN }}>{t('termsOfService')}</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading || !agreedToTerms}
            style={{
              width:           '100%',
              padding:         '13px',
              borderRadius:    '8px',
              border:          'none',
              backgroundColor: BIO_CYAN,
              fontFamily:      FRANK,
              fontWeight:      600,
              fontSize:        '15px',
              color:           NIGHT,
              cursor:          isLoading || !agreedToTerms ? 'default' : 'pointer',
              opacity:         isLoading || !agreedToTerms ? 0.7 : 1,
              transition:      'filter 0.2s',
              marginTop:       '4px',
            }}
            onMouseEnter={e => { if (!isLoading && agreedToTerms) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {isLoading ? (<><span className="auth-spinner" />{t('loading')}</>) : t('signup.submitButton')}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,229,195,0.15)' }} />
          <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}40` }}>או</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,229,195,0.15)' }} />
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
            border:          '1px solid rgba(0,229,195,0.2)',
            backgroundColor: 'rgba(9,20,16,0.7)',
            fontFamily:      DM_SANS,
            fontSize:        '14px',
            color:           TEXT_MID,
            cursor:          isLoading ? 'default' : 'pointer',
            opacity:         isLoading ? 0.6 : 1,
            transition:      'background-color 0.15s',
          }}
          onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.07)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(9,20,16,0.7)'; }}
        >
          <GoogleIcon />
          {t('signup.googleButton')}
        </button>

        <p style={{ marginTop: '12px', textAlign: 'center', fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}55` }}>
          {t('signup.hasAccount')}{' '}
          <Link to="/login" style={{ color: BIO_CYAN, fontWeight: 500, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
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
