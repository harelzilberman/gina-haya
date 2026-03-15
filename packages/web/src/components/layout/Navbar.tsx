import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

const NAVY = '#1B2A4A';
const SAGE = '#4A7C59';
const MOON_GOLD = '#B7924A';
const CREAM = '#FDF6EC';

export function Navbar() {
  const { i18n } = useTranslation();
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHebrew = i18n.language === 'he';

  function toggleLanguage() {
    const next = isHebrew ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('i18nextLng', next);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Initials from display name or email
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

  const navLinks = user ? (
    <>
      <Link
        to="/calendar"
        className="text-sm font-medium transition-colors duration-200 hover:opacity-70"
        style={{ color: NAVY }}
        onClick={() => setMobileOpen(false)}
      >
        לוח שנה
      </Link>
      <Link
        to="/plants"
        className="text-sm font-medium transition-colors duration-200 hover:opacity-70"
        style={{ color: NAVY }}
        onClick={() => setMobileOpen(false)}
      >
        אנציקלופדיה
      </Link>
    </>
  ) : null;

  const langButton = (
    <button
      onClick={toggleLanguage}
      className="text-sm font-medium px-3 py-1 rounded-md border transition-all duration-200 hover:opacity-70"
      style={{ borderColor: SAGE, color: SAGE }}
    >
      {isHebrew ? 'EN' : 'עב'}
    </button>
  );

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-4 md:px-8 shadow-sm"
      style={{ backgroundColor: '#ffffff', borderBottom: `1px solid ${SAGE}` }}
    >
      {/* Logo — right side in RTL */}
      <Link
        to="/"
        className="text-xl font-bold shrink-0 transition-opacity duration-200 hover:opacity-80"
        style={{ color: NAVY, fontFamily: 'Heebo, sans-serif' }}
      >
        🌱 גינה חיה
      </Link>

      {/* Center nav links — desktop only */}
      {user && (
        <div className="hidden md:flex items-center gap-6 mx-auto">
          {navLinks}
        </div>
      )}

      {/* Left side (in RTL = end) — desktop */}
      <div className="hidden md:flex items-center gap-3 ms-auto">
        {langButton}

        {!user ? (
          <>
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg border transition-all duration-200 hover:opacity-70"
              style={{ borderColor: NAVY, color: NAVY }}
            >
              כניסה
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: SAGE }}
            >
              הרשמה
            </Link>
          </>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all duration-200 hover:opacity-80 focus:outline-none"
              style={{ backgroundColor: MOON_GOLD }}
            >
              {initials}
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-11 end-0 w-48 rounded-xl shadow-lg py-1 z-50"
                style={{ backgroundColor: '#ffffff', border: `1px solid #e5e7eb` }}
              >
                {[
                  { label: 'הגינה שלי', to: '/garden' },
                  { label: 'לוח שנה', to: '/calendar' },
                  { label: 'מוש', to: '/moosh' },
                  { label: 'הגדרות', to: '/settings' },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-4 py-2 text-sm transition-colors duration-200 hover:bg-gray-50"
                    style={{ color: NAVY }}
                    onClick={() => setDropdownOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-start block px-4 py-2 text-sm transition-colors duration-200 hover:bg-gray-50"
                  style={{ color: '#A33030' }}
                >
                  התנתקות
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: hamburger */}
      <button
        className="md:hidden ms-auto p-2 text-xl"
        style={{ color: NAVY }}
        onClick={() => setMobileOpen(v => !v)}
        aria-label="תפריט"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden absolute top-16 inset-x-0 px-4 py-4 flex flex-col gap-3 shadow-md z-40"
          style={{ backgroundColor: '#ffffff', borderTop: `1px solid ${SAGE}` }}
        >
          {user && (
            <>
              <Link to="/calendar" className="text-sm font-medium py-2" style={{ color: NAVY }} onClick={() => setMobileOpen(false)}>לוח שנה</Link>
              <Link to="/plants" className="text-sm font-medium py-2" style={{ color: NAVY }} onClick={() => setMobileOpen(false)}>אנציקלופדיה</Link>
              <Link to="/garden" className="text-sm font-medium py-2" style={{ color: NAVY }} onClick={() => setMobileOpen(false)}>הגינה שלי</Link>
              <Link to="/moosh" className="text-sm font-medium py-2" style={{ color: NAVY }} onClick={() => setMobileOpen(false)}>מוש</Link>
              <Link to="/settings" className="text-sm font-medium py-2" style={{ color: NAVY }} onClick={() => setMobileOpen(false)}>הגדרות</Link>
              <hr className="border-gray-100" />
              <button onClick={handleSignOut} className="text-sm font-medium py-2 text-start" style={{ color: '#A33030' }}>התנתקות</button>
            </>
          )}
          {!user && (
            <>
              <Link to="/login" className="text-sm font-medium py-2" style={{ color: NAVY }} onClick={() => setMobileOpen(false)}>כניסה</Link>
              <Link to="/signup" className="text-sm font-medium py-2" style={{ color: SAGE }} onClick={() => setMobileOpen(false)}>הרשמה</Link>
            </>
          )}
          <div className="pt-1">{langButton}</div>
        </div>
      )}
    </nav>
  );
}
