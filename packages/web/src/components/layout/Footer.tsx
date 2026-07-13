import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NIGHT    = '#050d0a';
const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';
const MUTED    = '#6b9080';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

export function Footer() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  function toggleLanguage() {
    const next = isHebrew ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('i18nextLng', next);
  }

  const linkStyle: React.CSSProperties = {
    fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID,
    textDecoration: 'none', transition: 'color 0.18s', opacity: 0.8,
  };

  function hoverIn(e: React.MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.color = BIO_CYAN; el.style.opacity = '1';
  }
  function hoverOut(e: React.MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.color = TEXT_MID; el.style.opacity = '0.8';
  }

  return (
    <footer style={{ backgroundColor: NIGHT, borderTop: '1px solid rgba(0,229,195,0.1)' }}>
      <div style={{
        maxWidth: '1100px', margin: '0 auto', padding: '52px 32px 40px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px',
      }}>

        {/* Brand */}
        <div>
          <div style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '22px', color: BIO_CYAN,
            marginBottom: '8px', textShadow: '0 0 20px rgba(0,229,195,.28)' }}>
            גינה חיה
          </div>
          <p style={{ fontFamily: DM_SANS, fontWeight: 300, fontSize: '13px', color: MUTED, lineHeight: 1.65, maxWidth: '180px' }}>
            {isHebrew ? 'גדל בהרמוניה עם קצבי הטבע' : 'Grow in harmony with nature\'s rhythms'}
          </p>
        </div>

        {/* Product */}
        <div>
          <p style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: '10px', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: BIO_CYAN, marginBottom: '16px' }}>
            {isHebrew ? 'מוצר' : 'Product'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: isHebrew ? 'לוח ביודינמי' : 'Calendar',    to: '/calendar' },
              { label: isHebrew ? 'אנציקלופדיה'  : 'Encyclopedia', to: '/plants'   },
              { label: isHebrew ? "צ'ופצ'ו"      : 'ChupChu',      to: '/chupchu'  },
              { label: isHebrew ? 'תמחור'        : 'Pricing',      to: '/pricing'  },
            ].map(item => (
              <Link key={item.to} to={item.to} style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Learn */}
        <div>
          <p style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: '10px', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: BIO_CYAN, marginBottom: '16px' }}>
            {isHebrew ? 'למד' : 'Learn'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: isHebrew ? 'מאמרים'  : 'Articles', to: '/articles' },
              { label: isHebrew ? 'מדריכים' : 'Guides',   to: '/guides'   },
              { label: isHebrew ? 'עזרה'    : 'Help',      to: '/help'     },
              { label: isHebrew ? 'אודות'   : 'About',     to: '/about'    },
            ].map(item => (
              <Link key={item.to} to={item.to} style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Legal + lang toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: '10px', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: BIO_CYAN, marginBottom: '6px' }}>
            {isHebrew ? 'משפטי' : 'Legal'}
          </p>
          <Link to="/privacy" style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
            {isHebrew ? 'מדיניות פרטיות' : 'Privacy Policy'}
          </Link>
          <a href="mailto:gina.haya.contact@gmail.com" style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
            {isHebrew ? 'צור קשר' : 'Contact'}
          </a>
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={toggleLanguage}
              style={{ fontFamily: DM_SANS, fontSize: '11px', fontWeight: 600, padding: '5px 14px',
                borderRadius: '100px', border: '1px solid rgba(0,229,195,0.2)', color: MUTED,
                backgroundColor: 'transparent', cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'border-color 0.18s, color 0.18s' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = BIO_CYAN; el.style.color = BIO_CYAN; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(0,229,195,0.2)'; el.style.color = MUTED; }}
            >
              {isHebrew ? 'EN' : 'עב'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'rgba(0,229,195,0.07)', margin: '0 32px' }} />
      <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED, opacity: 0.55 }}>
          © 2026 גינה חיה · Gina Haya · Made in Israel
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
          borderRadius: '100px', border: '1px solid rgba(0,229,195,0.12)', fontSize: '11px', color: BIO_CYAN, fontFamily: DM_SANS }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: BIO_CYAN,
            boxShadow: `0 0 5px ${BIO_CYAN}`, display: 'inline-block' }} />
          {isHebrew ? 'ביודינמי · Biodynamic' : 'Biodynamic · ביודינמי'}
        </div>
      </div>
    </footer>
  );
}
