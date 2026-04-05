import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useDirection } from '../../hooks/useDirection';

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD       = '#F5C840';
const PARCHMENT  = '#EDE0C4';
const LEAF_GREEN = '#B0D8A8';
const FOREST     = '#142B16';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const PLAYFAIR   = '"Playfair Display", Georgia, serif';
const ASSISTANT  = '"Assistant", "Heebo", sans-serif';

const NAVBAR_CSS = `
.gina-nav-link {
  position: relative;
  text-decoration: none;
  transition: color 0.2s ease-out;
}
.gina-nav-link::after {
  content: '';
  position: absolute;
  bottom: -3px;
  inset-inline-end: 0;
  width: 0;
  height: 1px;
  background-color: ${GOLD};
  transition: width 0.3s ease-out;
}
.gina-nav-link:hover {
  color: ${GOLD} !important;
}
.gina-nav-link:hover::after {
  width: 100%;
}
.gina-dropdown-item:hover {
  background-color: rgba(245,200,64,0.08) !important;
  color: ${GOLD} !important;
}
@media (max-width: 767px) {
  .gina-desktop-nav     { display: none !important; }
  .gina-desktop-actions { display: none !important; }
  .gina-hamburger       { display: flex !important; }
}
`;

export function Navbar() {
  const { t, i18n } = useTranslation('common');
  const { dir } = useDirection();
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHebrew = i18n.language === 'he';

  function toggleLanguage() {
    const next = isHebrew ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('gina-haya-lang', next);
    document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (() => {
    const name = profile?.display_name || user?.email || '';
    const parts = name.split(/[\s@]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  async function handleSignOut() {
    setDropdownOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate('/');
  }

  const langToggle = (
    <button
      onClick={toggleLanguage}
      style={{
        fontFamily: ASSISTANT,
        fontSize: '12px',
        fontWeight: 600,
        padding: '4px 11px',
        borderRadius: '4px',
        border: `1px solid rgba(245,200,64,0.35)`,
        color: 'rgba(237,224,196,0.7)',
        backgroundColor: 'rgba(245,200,64,0.06)',
        cursor: 'pointer',
        letterSpacing: '0.04em',
        transition: 'border-color 0.2s, color 0.2s, background-color 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.borderColor = GOLD;
        el.style.color = GOLD;
        el.style.backgroundColor = 'rgba(245,200,64,0.12)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.borderColor = 'rgba(245,200,64,0.35)';
        el.style.color = 'rgba(237,224,196,0.7)';
        el.style.backgroundColor = 'rgba(245,200,64,0.06)';
      }}
    >
      {isHebrew ? 'EN' : 'עב'}
    </button>
  );

  return (
    <>
      <style>{NAVBAR_CSS}</style>

      <nav
        dir={dir}
        style={{
          position: 'fixed',
          top: 0,
          insetInlineStart: 0,
          insetInlineEnd: 0,
          zIndex: 100,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          background: 'linear-gradient(to bottom, rgba(20,43,22,0.97), rgba(20,43,22,0.85))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(245,200,64,0.1)',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{ textDecoration: 'none', flexShrink: 0, lineHeight: 1 }}
        >
          <div style={{
            fontFamily: FRANK,
            fontWeight: 700,
            fontSize: '20px',
            color: GOLD,
            lineHeight: 1.1,
          }}>
            גינה חיה
          </div>
          <div style={{
            fontFamily: PLAYFAIR,
            fontStyle: 'italic',
            fontSize: '11px',
            color: LEAF_GREEN,
            lineHeight: 1,
            marginTop: '1px',
          }}>
            Gina Haya
          </div>
        </Link>

        {/* Center nav links — desktop, logged-in only */}
        {user && (
          <div
            className="gina-desktop-nav"
            style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px' }}
          >
            {[
              { label: t('nav.calendar'), to: '/calendar' },
              { label: t('nav.plan'),     to: '/plan'     },
              { label: t('nav.map'),      to: '/map'      },
              { label: t('nav.tracker'), to: '/tracker' },
              { label: t('nav.tasks'),   to: '/tasks'   },
              { label: t('nav.plants'), to: '/plants' },
              { label: t('nav.guides'), to: '/guides' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="gina-nav-link"
                onClick={() => setMobileOpen(false)}
                style={{ fontFamily: ASSISTANT, fontSize: '14px', fontWeight: 400, color: PARCHMENT }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/chupchu"
              className="gina-nav-link"
              onClick={() => setMobileOpen(false)}
              style={{
                fontFamily:  ASSISTANT,
                fontSize:    '14px',
                fontWeight:  600,
                color:       GOLD,
                display:     'flex',
                alignItems:  'center',
                gap:         '5px',
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>🌕</span>
              {t('nav.chupchu')}
            </Link>
          </div>
        )}

        {/* End side — desktop (right in LTR, left in RTL) */}
        <div
          className="gina-desktop-actions"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginInlineStart: user ? undefined : 'auto',
          }}
        >
          {langToggle}

          {!user ? (
            <>
              <Link
                to="/login"
                style={{
                  fontFamily: ASSISTANT,
                  fontSize: '13px',
                  fontWeight: 400,
                  color: PARCHMENT,
                  textDecoration: 'none',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = PARCHMENT; }}
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/signup"
                style={{
                  fontFamily: FRANK,
                  fontWeight: 600,
                  fontSize: '14px',
                  color: FOREST,
                  backgroundColor: GOLD,
                  padding: '6px 18px',
                  borderRadius: '3px',
                  textDecoration: 'none',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                {t('nav.signup')}
              </Link>
            </>
          ) : (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: GOLD,
                  color: FOREST,
                  fontFamily: FRANK,
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                {initials}
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '42px',
                    insetInlineEnd: 0,
                    width: '188px',
                    background: 'linear-gradient(180deg, #1a3a1c 0%, #142B16 100%)',
                    border: '1px solid rgba(245,200,64,0.15)',
                    borderRadius: '6px',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
                    padding: '6px 0',
                    zIndex: 101,
                  }}
                >
                  {[
                    { label: t('nav.garden'),    to: '/garden' },
                    { label: t('nav.calendar'), to: '/calendar' },
                    { label: t('nav.plan'),     to: '/plan'     },
                    { label: t('nav.map'),      to: '/map'      },
                    { label: t('nav.tracker'),  to: '/tracker' },
                    { label: t('nav.tasks'),    to: '/tasks'   },
                    { label: t('nav.guides'),   to: '/guides' },
                    { label: t('nav.chupchu'),    to: '/chupchu' },
                    { label: t('nav.settings'), to: '/settings' },
                  ].map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="gina-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'block',
                        padding: '9px 16px',
                        fontFamily: ASSISTANT,
                        fontSize: '14px',
                        fontWeight: 400,
                        color: PARCHMENT,
                        textDecoration: 'none',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ height: '1px', backgroundColor: 'rgba(245,200,64,0.1)', margin: '4px 0' }} />
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'start',
                      padding: '9px 16px',
                      fontFamily: ASSISTANT,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: 'rgba(220,100,100,0.85)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e06060'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(220,100,100,0.85)'; }}
                  >
                    {t('nav.signout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="gina-hamburger"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="תפריט"
          style={{
            display: 'none',
            marginInlineStart: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            fontSize: '20px',
            color: GOLD,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: '52px',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            zIndex: 99,
            background: 'linear-gradient(180deg, rgba(20,43,22,0.98) 0%, rgba(12,28,14,0.98) 100%)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(245,200,64,0.1)',
            padding: '16px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {user && (
            <>
              {[
                { label: t('nav.calendar'), to: '/calendar' },
                { label: t('nav.plan'),     to: '/plan'     },
                { label: t('nav.map'),      to: '/map'      },
                { label: t('nav.plants'),   to: '/plants' },
                { label: t('nav.garden'),   to: '/garden' },
                { label: t('nav.tracker'),  to: '/tracker' },
                { label: t('nav.tasks'),    to: '/tasks'   },
                { label: t('nav.guides'),   to: '/guides' },
                { label: t('nav.chupchu'),    to: '/chupchu' },
                { label: t('nav.settings'), to: '/settings' },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  style={{ fontFamily: ASSISTANT, fontSize: '16px', color: PARCHMENT, textDecoration: 'none', padding: '10px 0' }}
                >
                  {item.label}
                </Link>
              ))}
              <div style={{ height: '1px', backgroundColor: 'rgba(245,200,64,0.1)', margin: '8px 0' }} />
              <button
                onClick={handleSignOut}
                style={{ fontFamily: ASSISTANT, fontSize: '16px', color: 'rgba(220,100,100,0.85)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start', padding: '10px 0' }}
              >
                {t('nav.signout')}
              </button>
            </>
          )}
          {!user && (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} style={{ fontFamily: ASSISTANT, fontSize: '16px', color: PARCHMENT, textDecoration: 'none', padding: '10px 0' }}>{t('nav.login')}</Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)} style={{ fontFamily: FRANK, fontSize: '16px', fontWeight: 700, color: GOLD, textDecoration: 'none', padding: '10px 0' }}>{t('nav.signup')}</Link>
            </>
          )}
          <div style={{ paddingTop: '10px' }}>{langToggle}</div>
        </div>
      )}
    </>
  );
}
