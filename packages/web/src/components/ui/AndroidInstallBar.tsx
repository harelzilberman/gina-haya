import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PlayBadge } from './PlayBadge';

function isCheckoutRoute(pathname: string): boolean {
  return pathname === '/shop' || pathname.startsWith('/shop/');
}

const STORAGE_KEY = 'android-install-bar-dismissed';
const DISMISS_DAYS = 14;

const BIO_CYAN   = '#00e5c3';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

// Bar height including PlayBadge clear-space: badge ~44px + 24px padding top/bottom
const BAR_HEIGHT = 80;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const expiry = Number(raw);
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

function dismiss(): void {
  try {
    const expiry = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(expiry));
  } catch { /* ignore */ }
}

export function AndroidInstallBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile  = window.matchMedia('(max-width: 767px)').matches;
    if (isAndroid && isMobile && !isDismissed()) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${BAR_HEIGHT}px`;
    return () => { document.body.style.paddingBottom = prev; };
  }, [visible]);

  // Also hide on shop/checkout routes to prevent occluding the checkout modal
  if (isCheckoutRoute(location.pathname)) return null;

  if (!visible) return null;

  function handleDismiss() {
    dismiss();
    setVisible(false);
  }

  return (
    <div
      role="banner"
      style={{
        position:   'fixed',
        bottom:     0,
        left:       0,
        right:      0,
        zIndex:     9990,
        height:     `${BAR_HEIGHT}px`,
        background: `linear-gradient(to top, rgba(5,13,10,0.98), rgba(14,30,23,0.97))`,
        borderTop:  '1px solid rgba(0,229,195,0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display:    'flex',
        alignItems: 'center',
        padding:    '0 16px',
        gap:        '12px',
        direction:  'rtl',
      }}
    >
      {/* App icon */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
        background: `linear-gradient(135deg, ${BIO_CYAN}, #aaff00)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px',
      }}>
        🌱
      </div>

      {/* Text */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p style={{
          fontFamily: DM_SANS, fontSize: '13px', fontWeight: 700,
          color: TEXT, margin: 0, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {/* הורידו את גינה חיה */}
          {'\u05d4\u05d5\u05e8\u05d9\u05d3\u05d5 \u05d0\u05ea \u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4'}
        </p>
        <p style={{
          fontFamily: DM_SANS, fontSize: '11px',
          color: TEXT_MID, margin: 0, lineHeight: 1.3,
        }}>
          {/* חינם ב-Google Play */}
          {'\u05d7\u05d9\u05e0\u05dd \u05d1\u002d'}<bdi>Google Play</bdi>
        </p>
      </div>

      {/* Badge — wrapped in <a> inside PlayBadge, clear space provided by its own margin */}
      <div style={{ flexShrink: 0 }}>
        <PlayBadge source="smart_banner" loading="lazy" />
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label={'\u05e1\u05d2\u05d5\u05e8'}
        style={{
          flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          color: TEXT_MID, fontSize: '18px', lineHeight: 1,
          padding: '4px', borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = TEXT; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT_MID; }}
      >
        ✕
      </button>
    </div>
  );
}
