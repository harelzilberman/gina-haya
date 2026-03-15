import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GOLD      = '#F5C840';
const SAGE_GRN  = '#7DC084';
const PARCHMENT = '#EDE0C4';
const NEAR_BLACK = '#080E08';
const FRANK     = '"Frank Ruhl Libre", Georgia, serif';
const ASSISTANT = '"Assistant", "Heebo", sans-serif';

export function Footer() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  function toggleLanguage() {
    const next = isHebrew ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('i18nextLng', next);
  }

  return (
    <footer
      style={{
        backgroundColor: NEAR_BLACK,
        borderTop: '1px solid rgba(139,94,60,0.2)',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '52px 32px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '40px',
        }}
      >
        {/* Col 1: Logo + tagline */}
        <div>
          <div style={{
            fontFamily: FRANK,
            fontWeight: 700,
            fontSize: '22px',
            color: GOLD,
            marginBottom: '8px',
            lineHeight: 1.2,
          }}>
            גינה חיה
          </div>
          <p style={{
            fontFamily: ASSISTANT,
            fontWeight: 300,
            fontSize: '13px',
            color: `${PARCHMENT}66`,
            lineHeight: 1.65,
            maxWidth: '180px',
          }}>
            לוח ביודינמי יומי לגינאים בישראל. גדל בהרמוניה עם הירח.
          </p>
        </div>

        {/* Col 2: Platform links */}
        <div>
          <p style={{
            fontFamily: ASSISTANT,
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: `${PARCHMENT}44`,
            marginBottom: '16px',
          }}>
            פלטפורמה
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'לוח שנה ביודינמי', to: '/calendar' },
              { label: 'אנציקלופדיה',      to: '/plants' },
              { label: 'מוש לבנה',          to: '/moosh' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  fontFamily: ASSISTANT,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: SAGE_GRN,
                  textDecoration: 'none',
                  transition: 'color 0.2s, opacity 0.2s',
                  opacity: 0.85,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = GOLD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.color = SAGE_GRN; }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Col 3: Company links */}
        <div>
          <p style={{
            fontFamily: ASSISTANT,
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: `${PARCHMENT}44`,
            marginBottom: '16px',
          }}>
            חברה
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'מדיניות פרטיות', to: '/privacy' },
              { label: 'צור קשר', href: 'mailto:hello@gina-haya.com' },
            ].map(item => (
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  style={{
                    fontFamily: ASSISTANT,
                    fontSize: '14px',
                    color: SAGE_GRN,
                    textDecoration: 'none',
                    opacity: 0.85,
                    transition: 'color 0.2s, opacity 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.color = SAGE_GRN; }}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    fontFamily: ASSISTANT,
                    fontSize: '14px',
                    color: SAGE_GRN,
                    textDecoration: 'none',
                    opacity: 0.85,
                    transition: 'color 0.2s, opacity 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = GOLD; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.color = SAGE_GRN; }}
                >
                  {item.label}
                </a>
              )
            ))}
          </div>
        </div>

        {/* Col 4: Copyright + lang toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{
            fontFamily: ASSISTANT,
            fontSize: '13px',
            color: `${PARCHMENT}55`,
            lineHeight: 1.6,
          }}>
            © 2026 גינה חיה
            <br />
            <span style={{ fontSize: '12px' }}>Gina Haya · Made in Israel</span>
          </p>

          <button
            onClick={toggleLanguage}
            style={{
              alignSelf: 'flex-start',
              fontFamily: ASSISTANT,
              fontSize: '12px',
              fontWeight: 600,
              padding: '5px 14px',
              borderRadius: '4px',
              border: '1px solid rgba(245,200,64,0.25)',
              color: 'rgba(237,224,196,0.5)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.borderColor = `${GOLD}88`;
              el.style.color = GOLD;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(245,200,64,0.25)';
              el.style.color = 'rgba(237,224,196,0.5)';
            }}
          >
            {isHebrew ? 'EN' : 'עב'}
          </button>
        </div>
      </div>

      {/* Bottom rule */}
      <div style={{ height: '1px', backgroundColor: 'rgba(245,200,64,0.06)', margin: '0 32px' }} />
      <div style={{ padding: '16px 32px', textAlign: 'center' }}>
        <p style={{ fontFamily: ASSISTANT, fontSize: '11px', color: `${PARCHMENT}25` }}>
          גידול בהרמוניה עם הטבע · Biodynamic Gardening Platform
        </p>
      </div>
    </footer>
  );
}
