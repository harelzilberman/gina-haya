import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useDirection } from '../../hooks/useDirection';
import { usePlanLimit, TIER_DISPLAY } from '../../hooks/usePlanLimit';
import { useCredits } from '../../hooks/useCredits';
import { useGardenSwitcherStore } from '../../stores/gardenSwitcherStore';
import { GardenSwitcher } from '../garden/GardenSwitcher';
import { CreateGardenModal } from '../garden/CreateGardenModal';

// ── v3 tokens ──────────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_AMBER  = '#ffb830';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

// Shared dropdown chrome — module-level so NavDropdown can reference them
const dropdownBg     = `linear-gradient(180deg, ${NIGHT_LIFT} 0%, ${NIGHT} 100%)`;
const dropdownBorder = '1px solid rgba(0,229,195,0.14)';
const dropdownShadow = '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,195,0.06)';

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
  background-color: ${BIO_CYAN};
  transition: width 0.3s ease-out;
}
.gina-nav-link:hover { color: ${BIO_CYAN} !important; }
.gina-nav-link:hover::after { width: 100%; }
.gina-dropdown-item:hover {
  background-color: rgba(0,229,195,0.07) !important;
  color: ${BIO_CYAN} !important;
}
@media (max-width: 767px) {
  .gina-desktop-nav     { display: none !important; }
  .gina-desktop-actions { display: none !important; }
  .gina-hamburger       { display: flex !important; }
}
`;

// ── Shared dropdown renderer ───────────────────────────────────────────────
function NavDropdown({
  label, isOpen, setOpen, nodeRef, items,
}: {
  label:   string;
  isOpen:  boolean;
  setOpen: (v: boolean) => void;
  nodeRef: React.RefObject<HTMLDivElement>;
  items:   { label: string; to: string }[];
}) {
  return (
    <div ref={nodeRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!isOpen)}
        className="gina-nav-link"
        style={{
          fontFamily: DM_SANS, fontSize: '14px', fontWeight: 500,
          color: isOpen ? BIO_CYAN : TEXT_MID,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 0',
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)',
          insetInlineStart: 0,
          minWidth: '180px',
          background: dropdownBg,
          border: dropdownBorder,
          borderRadius: '12px',
          boxShadow: dropdownShadow,
          padding: '6px 0',
          zIndex: 200,
        }}>
          {items.map(item => (
            <Link key={item.to} to={item.to}
              className="gina-dropdown-item"
              onClick={() => setOpen(false)}
              style={{
                display: 'block', padding: '9px 16px',
                fontFamily: DM_SANS, fontSize: '14px',
                color: TEXT_MID, textDecoration: 'none',
                transition: 'background-color 0.15s, color 0.15s',
              }}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main navbar ────────────────────────────────────────────────────────────
export function Navbar() {
  const { t, i18n } = useTranslation('common');
  const { dir } = useDirection();
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);   // user avatar menu
  const [mobileOpen,   setMobileOpen]   = useState(false);   // mobile drawer
  const [gardenOpen,   setGardenOpen]   = useState(false);   // Garden dropdown
  const [tasksOpen,    setTasksOpen]    = useState(false);   // Tasks dropdown
  const [readOpen,     setReadOpen]     = useState(false);   // Read/Watch dropdown
  const [moreOpen,     setMoreOpen]     = useState(false);   // More dropdown

  const dropdownRef = useRef<HTMLDivElement>(null);
  const gardenRef   = useRef<HTMLDivElement>(null);
  const tasksRef    = useRef<HTMLDivElement>(null);
  const readRef     = useRef<HTMLDivElement>(null);
  const moreRef     = useRef<HTMLDivElement>(null);

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (gardenRef.current  && !gardenRef.current.contains(e.target as Node))   setGardenOpen(false);
      if (tasksRef.current   && !tasksRef.current.contains(e.target as Node))    setTasksOpen(false);
      if (readRef.current    && !readRef.current.contains(e.target as Node))     setReadOpen(false);
      if (moreRef.current    && !moreRef.current.contains(e.target as Node))     setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { tier } = usePlanLimit();
  const tierDisplay = TIER_DISPLAY[tier] ?? TIER_DISPLAY.free;
  const { credits } = useCredits();
  const { gardens } = useGardenSwitcherStore();
  const [createGardenOpen, setCreateGardenOpen] = useState(false);
  const isProUser = tier === 'gardener_pro' || tier === 'professional';

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
        fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600, padding: '4px 11px',
        borderRadius: '100px', border: '1px solid rgba(0,229,195,0.25)',
        color: MUTED, backgroundColor: 'rgba(0,229,195,0.05)', cursor: 'pointer',
        letterSpacing: '0.04em', transition: 'border-color 0.2s, color 0.2s, background-color 0.2s',
      }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = BIO_CYAN; el.style.color = BIO_CYAN; el.style.backgroundColor = 'rgba(0,229,195,0.1)'; }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(0,229,195,0.25)'; el.style.color = MUTED; el.style.backgroundColor = 'rgba(0,229,195,0.05)'; }}
    >
      {isHebrew ? 'EN' : 'עב'}
    </button>
  );

  // ── Mobile styles ────────────────────────────────────────────────────────
  const mobileLink: React.CSSProperties = {
    fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID,
    textDecoration: 'none', padding: '10px 0',
    borderBottom: '1px solid rgba(0,229,195,0.05)',
    transition: 'color 0.15s',
  };
  const mobileSub: React.CSSProperties = {
    ...mobileLink,
    fontSize: '14px',
    paddingInlineStart: '16px',
    color: MUTED,
  };
  const mobileSection: React.CSSProperties = {
    fontFamily: DM_SANS, fontSize: '11px', fontWeight: 700,
    color: BIO_CYAN, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '14px 0 4px',
  };

  const navLinkStyle = (_isHe: boolean): React.CSSProperties => ({
    fontFamily: DM_SANS, fontSize: '14px', fontWeight: 500,
    color: TEXT_MID, textDecoration: 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <style>{NAVBAR_CSS}</style>

      <nav
        dir={dir}
        style={{
          position: 'fixed', top: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 100,
          height: '64px', display: 'flex', alignItems: 'center', padding: '0 28px',
          background: `linear-gradient(to bottom, rgba(5,13,10,0.92), rgba(5,13,10,0.78))`,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,229,195,0.1)',
          boxShadow: '0 2px 40px rgba(0,0,0,0.4)',
          direction: isHebrew ? 'rtl' : 'ltr',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${BIO_CYAN}, #aaff00)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(0,229,195,0.35)',
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={NIGHT} strokeWidth="2.2">
              <path d="M12 2a10 10 0 010 20M12 2C9.5 7 9.5 17 12 22M2 12h20"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '18px', color: TEXT, lineHeight: 1.1 }}>גינה חיה</div>
            <div style={{ fontFamily: DM_SANS, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: MUTED, lineHeight: 1 }}>Gina Haya</div>
          </div>
        </Link>

        {/* Desktop nav — visible when logged in */}
        {user && (
          <div className="gina-desktop-nav" style={{
            display: 'flex', alignItems: 'center', gap: '24px', marginInlineStart: '32px',
          }}>

            {/* 1. Home */}
            <Link to="/" className="gina-nav-link" style={navLinkStyle(isHebrew)}>
              {isHebrew ? 'בית' : 'Home'}
            </Link>

            {/* 2. Garden dropdown */}
            <NavDropdown
              label={isHebrew ? 'גינה' : 'Garden'}
              isOpen={gardenOpen}
              setOpen={setGardenOpen}
              nodeRef={gardenRef}
              items={[
                { label: isHebrew ? 'יומן גינה'   : 'Garden Journal', to: '/journal'  },
                { label: isHebrew ? 'עוקב צמחים'  : 'Plant Tracker',  to: '/tracker'  },
                { label: isHebrew ? 'מפת גינה'    : 'Garden Map',     to: '/map'      },
                { label: isHebrew ? 'הגינות שלי'  : 'My Gardens',     to: '/gardens'  },
              ]}
            />

            {/* 3. Biodynamic Calendar — plain link */}
            <Link to="/calendar" className="gina-nav-link" style={navLinkStyle(isHebrew)}>
              {isHebrew ? 'לוח ביודינמי' : 'Biodynamic Calendar'}
            </Link>

            {/* 4. Tasks dropdown */}
            <NavDropdown
              label={isHebrew ? 'משימות' : 'Tasks'}
              isOpen={tasksOpen}
              setOpen={setTasksOpen}
              nodeRef={tasksRef}
              items={[
                { label: isHebrew ? 'משימות'      : 'Tasks',       to: '/tasks' },
                { label: isHebrew ? 'תכנון שבועי' : 'Weekly Plan', to: '/plan'  },
              ]}
            />

            {/* 5. Chupchu — plain link */}
            <Link to="/chupchu" className="gina-nav-link" style={navLinkStyle(isHebrew)}>
              {isHebrew ? "צ'ופצ'ו" : 'Chupchu'}
            </Link>

            {/* 6. Read / Watch dropdown */}
            <NavDropdown
              label={isHebrew ? 'קרא/צפה' : 'Read/Watch'}
              isOpen={readOpen}
              setOpen={setReadOpen}
              nodeRef={readRef}
              items={[
                { label: isHebrew ? 'אנציקלופדיה' : 'Encyclopedia', to: '/plants'   },
                { label: isHebrew ? 'מאמרים'      : 'Articles',     to: '/articles' },
                { label: isHebrew ? 'סרטונים'     : 'Videos',       to: '/guides'   },
              ]}
            />

            {/* 7. More dropdown */}
            <NavDropdown
              label={isHebrew ? 'עוד' : 'More'}
              isOpen={moreOpen}
              setOpen={setMoreOpen}
              nodeRef={moreRef}
              items={[
                { label: isHebrew ? 'חנות'  : 'Store',   to: '/shop'    },
                { label: isHebrew ? 'תמחור' : 'Pricing', to: '/pricing' },
                { label: isHebrew ? 'אודות' : 'About',   to: '/about'   },
              ]}
            />

            {/* 8. Help — plain link */}
            <Link to="/help" className="gina-nav-link" style={navLinkStyle(isHebrew)}>
              {isHebrew ? 'עזרה' : 'Help'}
            </Link>

          </div>
        )}

        {/* Right side actions */}
        <div className="gina-desktop-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', marginInlineStart: 'auto' }}>
          {langToggle}

          {!user ? (
            <>
              {[
                { label: isHebrew ? 'אודות' : 'About',   to: '/about'   },
                { label: isHebrew ? 'תמחור' : 'Pricing', to: '/pricing' },
                { label: isHebrew ? 'חנות'  : 'Shop',    to: '/shop'    },
              ].map(item => (
                <Link key={item.to} to={item.to}
                  style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, textDecoration: 'none', padding: '5px 8px', transition: 'color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT_MID; }}>
                  {item.label}
                </Link>
              ))}
              <Link to="/login"
                style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, textDecoration: 'none', padding: '5px 12px', borderRadius: '8px', transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT_MID; }}>
                {t('nav.login')}
              </Link>
              <Link to="/signup"
                style={{ fontFamily: FRANK, fontWeight: 600, fontSize: '14px', color: NIGHT, backgroundColor: BIO_CYAN,
                  padding: '7px 18px', borderRadius: '100px', textDecoration: 'none',
                  transition: 'filter 0.2s, box-shadow 0.2s', boxShadow: '0 0 14px rgba(0,229,195,0.3)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.filter = 'brightness(1.1)'; el.style.boxShadow = '0 0 24px rgba(0,229,195,0.5)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.filter = 'none'; el.style.boxShadow = '0 0 14px rgba(0,229,195,0.3)'; }}>
                {t('nav.signup')}
              </Link>
            </>
          ) : (
            <>
              {/* Credit pills */}
              {credits.analysis.available > 0 && (
                <button title="קרדיטים זמינים" onClick={() => navigate('/shop')}
                  style={{ fontFamily: DM_SANS, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '12px',
                    backgroundColor: 'rgba(255,184,48,0.12)', border: '1px solid rgba(255,184,48,0.3)',
                    color: BIO_AMBER, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  🔬 {credits.analysis.available}
                </button>
              )}
              {credits.tracker.available > 0 && (
                <button title="קרדיטים זמינים" onClick={() => navigate('/shop')}
                  style={{ fontFamily: DM_SANS, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '12px',
                    backgroundColor: 'rgba(0,229,195,0.1)', border: '1px solid rgba(0,229,195,0.25)',
                    color: BIO_CYAN, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  🌱 {credits.tracker.available}
                </button>
              )}

              {/* Avatar + dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(v => !v)}
                  style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: BIO_CYAN, color: NIGHT,
                    fontFamily: FRANK, fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 14px rgba(0,229,195,0.35)', transition: 'filter 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.filter = 'brightness(1.1)'; el.style.boxShadow = '0 0 22px rgba(0,229,195,0.5)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.filter = 'none'; el.style.boxShadow = '0 0 14px rgba(0,229,195,0.35)'; }}>
                  {initials}
                </button>

                {dropdownOpen && (
                  <div style={{ position: 'absolute', top: '42px', insetInlineEnd: 0, width: '200px',
                    background: dropdownBg, border: dropdownBorder, borderRadius: '12px',
                    boxShadow: dropdownShadow, padding: '6px 0', zIndex: 101 }}>
                    {/* Tier badge */}
                    <div style={{ padding: '8px 16px 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: DM_SANS, fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '10px', backgroundColor: `${tierDisplay.color}22`,
                        color: tierDisplay.color, border: `1px solid ${tierDisplay.color}44`,
                        letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                        {isHebrew ? tierDisplay.he : tierDisplay.en}
                      </span>
                      {tier === 'free' && (
                        <Link to="/pricing" onClick={() => setDropdownOpen(false)}
                          style={{ fontFamily: DM_SANS, fontSize: '11px', color: BIO_CYAN, textDecoration: 'none' }}>
                          {isHebrew ? 'שדרג ↗' : 'Upgrade ↗'}
                        </Link>
                      )}
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'rgba(0,229,195,0.1)', marginBottom: '4px' }} />

                    {isProUser && gardens.length > 0 && (
                      <>
                        <div style={{ padding: '4px 8px 4px' }}>
                          <GardenSwitcher onCreateGarden={() => { setDropdownOpen(false); setCreateGardenOpen(true); }} />
                        </div>
                        <div style={{ height: '1px', backgroundColor: 'rgba(0,229,195,0.1)', margin: '4px 0' }} />
                      </>
                    )}

                    {/* Settings */}
                    <Link to="/settings" className="gina-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                      style={{ display: 'block', padding: '9px 16px', fontFamily: DM_SANS, fontSize: '14px',
                        color: TEXT_MID, textDecoration: 'none', transition: 'background-color 0.15s, color 0.15s' }}>
                      {isHebrew ? 'הגדרות' : 'Settings'}
                    </Link>

                    <div style={{ height: '1px', backgroundColor: 'rgba(0,229,195,0.1)', margin: '4px 0' }} />
                    <button onClick={handleSignOut}
                      style={{ display: 'block', width: '100%', textAlign: 'start', padding: '9px 16px',
                        fontFamily: DM_SANS, fontSize: '14px', color: 'rgba(255,100,100,0.8)',
                        backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e06060'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,100,100,0.8)'; }}>
                      {t('nav.signout')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="gina-hamburger" onClick={() => setMobileOpen(v => !v)} aria-label="תפריט"
          style={{ display: 'none', marginInlineStart: 'auto', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', fontSize: '20px', color: BIO_CYAN, background: 'none', border: 'none', cursor: 'pointer' }}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', top: '64px', insetInlineStart: 0, insetInlineEnd: 0, zIndex: 99,
          background: `linear-gradient(180deg, rgba(5,13,10,0.97) 0%, rgba(5,13,10,0.99) 100%)`,
          backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,229,195,0.1)',
          padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

          {user && (
            <>
              <Link to="/"         onClick={() => setMobileOpen(false)} style={mobileLink}>{isHebrew ? 'בית'           : 'Home'}</Link>
              <div style={mobileSection}>{isHebrew ? 'גינה' : 'Garden'}</div>
              <Link to="/journal"  onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'יומן גינה'    : 'Garden Journal'}</Link>
              <Link to="/tracker"  onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'עוקב צמחים'  : 'Plant Tracker'}</Link>
              <Link to="/map"      onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'מפת גינה'    : 'Garden Map'}</Link>
              <Link to="/gardens"  onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'הגינות שלי'  : 'My Gardens'}</Link>
              <Link to="/calendar" onClick={() => setMobileOpen(false)} style={mobileLink}>{isHebrew ? 'לוח ביודינמי' : 'Biodynamic Calendar'}</Link>
              <div style={mobileSection}>{isHebrew ? 'משימות' : 'Tasks'}</div>
              <Link to="/tasks"    onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'משימות'       : 'Tasks'}</Link>
              <Link to="/plan"     onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'תכנון שבועי'  : 'Weekly Plan'}</Link>
              <Link to="/chupchu"  onClick={() => setMobileOpen(false)} style={mobileLink}>{isHebrew ? "צ'ופצ'ו"      : 'Chupchu'}</Link>
              <div style={mobileSection}>{isHebrew ? 'קרא/צפה' : 'Read/Watch'}</div>
              <Link to="/plants"   onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'אנציקלופדיה'  : 'Encyclopedia'}</Link>
              <Link to="/articles" onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'מאמרים'       : 'Articles'}</Link>
              <Link to="/guides"   onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'סרטונים'      : 'Videos'}</Link>
              <div style={mobileSection}>{isHebrew ? 'עוד' : 'More'}</div>
              <Link to="/shop"     onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'חנות'          : 'Store'}</Link>
              <Link to="/pricing"  onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'תמחור'         : 'Pricing'}</Link>
              <Link to="/about"    onClick={() => setMobileOpen(false)} style={mobileSub}>{isHebrew ? 'אודות'          : 'About'}</Link>
              <Link to="/help"     onClick={() => setMobileOpen(false)} style={mobileLink}>{isHebrew ? 'עזרה'          : 'Help'}</Link>
              <div style={{ height: '1px', backgroundColor: 'rgba(0,229,195,0.1)', margin: '8px 0' }} />
              <button onClick={handleSignOut}
                style={{ fontFamily: DM_SANS, fontSize: '16px', color: 'rgba(255,100,100,0.8)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start', padding: '10px 0' }}>
                {t('nav.signout')}
              </button>
            </>
          )}

          {!user && (
            <>
              <Link to="/login"   onClick={() => setMobileOpen(false)} style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID, textDecoration: 'none', padding: '10px 0' }}>{t('nav.login')}</Link>
              <Link to="/signup"  onClick={() => setMobileOpen(false)} style={{ fontFamily: FRANK, fontSize: '16px', fontWeight: 700, color: BIO_CYAN, textDecoration: 'none', padding: '10px 0' }}>{t('nav.signup')}</Link>
              <Link to="/pricing" onClick={() => setMobileOpen(false)} style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID, textDecoration: 'none', padding: '10px 0' }}>{isHebrew ? 'תמחור' : 'Pricing'}</Link>
              <Link to="/shop"    onClick={() => setMobileOpen(false)} style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID, textDecoration: 'none', padding: '10px 0' }}>{isHebrew ? 'חנות' : 'Shop'}</Link>
              <Link to="/help"    onClick={() => setMobileOpen(false)} style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID, textDecoration: 'none', padding: '10px 0' }}>{isHebrew ? 'עזרה' : 'Help'}</Link>
              <Link to="/about"   onClick={() => setMobileOpen(false)} style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID, textDecoration: 'none', padding: '10px 0' }}>{isHebrew ? 'אודות' : 'About'}</Link>
            </>
          )}

          <div style={{ paddingTop: '12px' }}>{langToggle}</div>
        </div>
      )}

      <CreateGardenModal isOpen={createGardenOpen} onClose={() => setCreateGardenOpen(false)} />
    </>
  );
}
