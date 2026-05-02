import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GOLD = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

interface Props {
  tier: string | null;
}

export function RateLimitBanner({ tier }: Props) {
  const { t, i18n } = useTranslation('chupchu');
  const navigate = useNavigate();
  const isHe = i18n.language === 'he';

  const isGrowerTier = tier === 'grower';

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        margin: '0 16px 12px',
        borderRadius: '12px',
        padding: '16px',
        backgroundColor: 'rgba(20,43,22,0.95)',
        border: `1px solid rgba(245,200,64,0.3)`,
        textAlign: 'center',
      }}
      role="alert"
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌙</div>
      <p style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: '0 0 6px' }}>
        {isGrowerTier
          ? (isHe ? 'הגעת ל-50 שיחות החודשיות' : 'You reached 50 monthly messages')
          : (isHe ? 'צ\'ופצ\'ו עייף קצת...' : 'Chupchu needs a rest...')}
      </p>
      <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}99`, margin: '0 0 14px', lineHeight: 1.5 }}>
        {isGrowerTier
          ? (isHe ? 'שדרג למקצועי לשיחות ללא הגבלה עם צ\'ופצ\'ו.' : 'Upgrade to Pro for unlimited Chupchu messages.')
          : (isHe ? 'ניצלת את 20 השיחות החינמיות. שדרג לגנן ב-₪18 לחודש.' : 'Used all 20 free messages. Upgrade for ₪18/mo.')}
      </p>
      <button
        onClick={() => navigate('/pricing')}
        style={{
          fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
          color: '#142B16', backgroundColor: GOLD,
          border: 'none', borderRadius: '8px',
          padding: '9px 22px', cursor: 'pointer',
          transition: 'filter 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
      >
        {isHe ? 'שדרג עכשיו 🌿' : 'Upgrade now 🌿'}
      </button>
    </div>
  );
}
