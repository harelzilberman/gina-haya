import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChupChuStore } from '../../stores/chupChuStore';
import { EN_HEADING } from '../../styles/fonts';
import { getLimits, TIER_PRICING } from '@gina-haya/shared';

const FREE_L   = getLimits('free');
const GP_L     = getLimits('gardener_pro');
const GP_PRICE = TIER_PRICING.gardener_pro.monthly;

const NIGHT    = '#050d0a';
const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';

interface Props {
  tier: string | null;
}

export function RateLimitBanner({ tier }: Props) {
  const { t, i18n } = useTranslation('chupchu');
  const navigate = useNavigate();
  const isHe = i18n.language === 'he';

  const { usageThisMonth, monthlyLimit, rateLimitType } = useChupChuStore(s => ({
    usageThisMonth: s.usageThisMonth,
    monthlyLimit:   s.monthlyLimit,
    rateLimitType:  s.rateLimitType,
  }));

  // Determine which variant to show:
  // • Paid-tier daily cap (gardener_pro / advanced / professional) — fair-use ceiling, no upsell
  // • Free-tier daily cap — come back tomorrow, soft upsell
  // • Free-tier monthly cap — full upsell
  const isPaidTier  = tier === 'gardener_pro' || tier === 'advanced' || tier === 'professional';
  // For free tier distinguish daily vs monthly: if rateLimitType is available use it directly,
  // otherwise fall back to comparing used count vs monthly cap.
  const isDaily = isPaidTier
    || rateLimitType === 'daily'
    || (tier === 'free' && monthlyLimit !== null && usageThisMonth < monthlyLimit);

  // ── Variant text ──────────────────────────────────────────────────────────
  let emoji = '🌙';
  let headline = '';
  let body = '';
  const showUpgrade = !isPaidTier;

  if (isPaidTier) {
    emoji    = '⚙️';
    headline = isHe ? 'וואו, דיברנו המון היום!' : 'Wow, we talked a lot today!';
    body     = isHe
      ? 'צ\'ופצ\'ו צריך לשמן ברגים — נמשיך מחר עם אנרגיה מחודשת.'
      : 'Chupchu needs to recharge — back tomorrow with fresh energy.';
  } else if (isDaily) {
    emoji    = '⚙️';
    headline = isHe ? 'לצ\'ופצ\'ו נגמר הקיטור להיום' : 'Chupchu is out of steam for today';
    body     = isHe
      ? `נתראה מחר עם ${FREE_L.maxChupChuPerDay} הודעות חדשות — או שדרגו ב-₪${GP_PRICE} לחודש ל-${GP_L.maxChupChuPerMonth} הודעות בחודש.`
      : `Back tomorrow with ${FREE_L.maxChupChuPerDay} fresh messages — or upgrade for ₪${GP_PRICE}/mo to get ${GP_L.maxChupChuPerMonth} messages a month.`;
  } else {
    emoji    = '🌙';
    headline = isHe ? 'צ\'ופצ\'ו עייף קצת...' : 'Chupchu needs a rest...';
    body     = isHe
      ? `ניצלת את כל השיחות החודשיות שלך. שדרג ב-₪${GP_PRICE} לחודש ל-${GP_L.maxChupChuPerMonth} שיחות בחודש.`
      : `You used all your monthly messages. Upgrade for ₪${GP_PRICE}/mo to get ${GP_L.maxChupChuPerMonth} messages a month.`;
  }

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        margin: '0 16px 12px',
        borderRadius: '12px',
        padding: '16px',
        backgroundColor: '#111f18',
        border: `1px solid rgba(0,229,195,0.3)`,
        textAlign: 'center',
      }}
      role="alert"
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{emoji}</div>
      <p style={{ fontFamily: FRANK, fontSize: '15px', color: BIO_CYAN, margin: '0 0 6px' }}>
        {headline}
      </p>
      <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: `${TEXT_MID}99`, margin: '0 0 14px', lineHeight: 1.5 }}>
        {body}
      </p>
      {showUpgrade && (
        <button
          onClick={() => navigate('/pricing')}
          style={{
            fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
            color: NIGHT, backgroundColor: BIO_CYAN,
            border: 'none', borderRadius: '8px',
            padding: '9px 22px', cursor: 'pointer',
            transition: 'filter 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
        >
          {isHe ? 'שדרג עכשיו 🌿' : 'Upgrade now 🌿'}
        </button>
      )}
      {/* suppress unused warning */}
      {void t}
    </div>
  );
}
