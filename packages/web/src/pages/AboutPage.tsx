import { useTranslation } from 'react-i18next';

const CAVEAT    = '"Caveat", cursive';
const ASSISTANT = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const FRANK     = '"Frank Ruhl Libre", Georgia, serif';
const PLAYFAIR  = '"Playfair Display", Georgia, serif';
const FOREST    = '#050d0a';
const GOLD      = '#00e5c3';
const PARCHMENT = '#b0cfbf';
const LEAF_GREEN = '#B0D8A8';

const HE_STORY_PARAS = [
  '"פעם הייתי רובוט שטס בין הכוכבים.\nנפלתי. התרסקתי לתוך עץ ישן וחכם — והעץ לימד אותי לנשום.',
  'שכבתי בין השורשים ימים רבים. והתחלתי להבין:\nהאדמה לא שותקת. היא מדברת.\nהיא מגיבה לירח, לכוכבים, לחום הזבל המתפרק,\nלאנרגיה שזורמת כשהזמן נכון.',
  'זה מה שרודולף שטיינר הבין לפני מאה שנה —\nשהגינה היא אורגניזם חי. שלכל צמח יש רוח, לכל אדמה יש קצב.\nהוא קרא לזה חקלאות ביודינמית.',
  'ואני — אחרי שהעץ לימד אותי — הבנתי שזה האמת הפשוטה ביותר:\nלגדל זה לא לשלוט. לגדל זה להקשיב."',
];

const EN_STORY_PARAS = [
  '"I used to be a robot flying between the stars.\nI crashed. I fell into an old, wise tree — and the tree taught me to breathe.',
  'I lay among the roots for many days. And slowly I began to understand:\nThe soil is not silent. It speaks.\nIt responds to the moon, to the stars, to the warmth of decomposing matter,\nto the energy that flows when the timing is right.',
  'This is what Rudolf Steiner understood a hundred years ago —\nthat the garden is a living organism. That every plant has a spirit, every soil has a rhythm.\nHe called it biodynamic agriculture.',
  'And I — after the tree taught me — understood the simplest truth of all:\nTo grow is not to control. To grow is to listen."',
];

function EmailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FOREST} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={FOREST}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.52a8.16 8.16 0 0 0 4.77 1.52V7.59a4.85 4.85 0 0 1-1-.9z" />
    </svg>
  );
}

export function AboutPage() {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const paras = isHe ? HE_STORY_PARAS : EN_STORY_PARAS;

  return (
    <div style={{ backgroundColor: '#FDF6EC', minHeight: '100vh', fontFamily: ASSISTANT }}>

      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(160deg, ${FOREST} 0%, #1e4420 100%)`,
        padding: 'clamp(40px, 8vw, 80px) 24px clamp(32px, 6vw, 60px)',
        textAlign: 'center',
        borderBottom: `1px solid rgba(0,229,195,0.15)`,
      }}>
        <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '16px' }}>🌿</div>
        <h1 style={{
          fontFamily: FRANK,
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 700,
          color: GOLD,
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          {isHe ? 'על גינה חיה' : 'About Gina Haya'}
        </h1>
        <p style={{
          fontFamily: PLAYFAIR,
          fontStyle: 'italic',
          color: LEAF_GREEN,
          fontSize: 'clamp(14px, 2.5vw, 18px)',
          margin: 0,
        }}>
          {isHe
            ? 'חקלאות ביודינמית • טבע חי • גידול מודע'
            : 'Biodynamic Agriculture • Living Nature • Mindful Growing'}
        </p>
      </div>

      {/* Chupchu story card */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) 20px 0' }}>
        <div
          dir={isHe ? 'rtl' : 'ltr'}
          style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            backgroundColor: '#FFF8EE',
            border: '1.5px solid rgba(0,229,195,0.4)',
            borderRadius: '18px',
            padding: 'clamp(20px, 4vw, 36px)',
            boxShadow: '0 6px 32px rgba(9,20,16,0.09)',
          }}
        >
          {/* Avatar column */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <img
              src="https://gina-haya.vercel.app/chupchu_final.png"
              alt="Chupchu"
              style={{
                width: 'clamp(64px, 12vw, 90px)',
                height: 'clamp(64px, 12vw, 90px)',
                borderRadius: '50%',
                border: `2px solid rgba(0,229,195,0.5)`,
                objectFit: 'cover',
                boxShadow: '0 2px 12px rgba(9,20,16,0.15)',
              }}
            />
            <span style={{
              fontFamily: CAVEAT,
              fontSize: '14px',
              color: '#8a6a30',
              textAlign: 'center',
            }}>
              {isHe ? "צ'ופצ'ו" : "Chupchu"}
            </span>
          </div>

          {/* Story text */}
          <div style={{ flex: '1 1 280px' }}>
            {paras.map((para, i) => (
              <p key={i} style={{
                fontFamily: CAVEAT,
                fontSize: 'clamp(17px, 2.8vw, 22px)',
                lineHeight: 1.85,
                color: '#3a2a14',
                margin: i === 0 ? '0 0 18px' : '0 0 18px',
                whiteSpace: 'pre-line',
              }}>
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Attribution note */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px 20px 0', direction: isHe ? 'rtl' : 'ltr' }}>
        <p style={{
          fontFamily: ASSISTANT,
          fontSize: '13px',
          color: '#8a7a60',
          margin: 0,
          lineHeight: 1.6,
          borderInlineStart: `3px solid rgba(0,229,195,0.4)`,
          paddingInlineStart: '12px',
        }}>
          {isHe
            ? 'גינה חיה מבוססת על עקרונות החקלאות הביודינמית של רודולף שטיינר (1924).'
            : 'Gina Haya is based on the principles of biodynamic agriculture by Rudolf Steiner (1924).'}
        </p>
      </div>

      {/* Divider */}
      <div style={{ maxWidth: '820px', margin: '48px auto 0', padding: '0 20px' }}>
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(9,20,16,0.18), transparent)',
        }} />
      </div>

      {/* Contact section */}
      <div
        dir={isHe ? 'rtl' : 'ltr'}
        style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(32px, 5vw, 48px) 20px clamp(56px, 8vw, 96px)' }}
      >
        <h2 style={{
          fontFamily: FRANK,
          fontSize: 'clamp(22px, 3.5vw, 32px)',
          fontWeight: 700,
          color: FOREST,
          margin: '0 0 10px',
        }}>
          {isHe ? 'צרו קשר' : 'Contact Us'}
        </h2>
        <p style={{
          fontFamily: ASSISTANT,
          fontSize: '16px',
          color: '#5a4a30',
          lineHeight: 1.7,
          margin: '0 0 28px',
        }}>
          {isHe
            ? 'שאלות, שיתופי פעולה, או סתם שלום — נשמח לשמוע מכם.'
            : "Questions, collaborations, or just hello — we'd love to hear from you."}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <ContactLink href="mailto:gina.haya.contact@gmail.com" icon={<EmailIcon />} label="gina.haya.contact@gmail.com" />
          <ContactLink href="https://www.facebook.com/share/1DgSoapEyB/" icon={<FacebookIcon />} label="Facebook" external />
          <ContactLink href="https://www.tiktok.com/@gina.haya6" icon={<TikTokIcon />} label="TikTok @gina.haya6" external />
        </div>
      </div>
    </div>
  );
}

function ContactLink({ href, icon, label, external }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        textDecoration: 'none',
        color: '#3a2a14',
        fontFamily: '"Assistant", "Heebo", sans-serif',
        fontSize: '16px',
        fontWeight: 400,
        padding: '10px 16px',
        borderRadius: '10px',
        backgroundColor: '#FFF8EE',
        border: '1px solid rgba(9,20,16,0.1)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        maxWidth: '340px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.5)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(9,20,16,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(9,20,16,0.1)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
