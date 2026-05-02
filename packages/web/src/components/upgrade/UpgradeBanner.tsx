import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GOLD = '#F5C840';
const ASST = '"Assistant", "Heebo", sans-serif';

const RESOURCE_LABELS: Record<string, { he: string; en: string }> = {
  plants:   { he: 'צמחים בגינה', en: 'plants in garden' },
  trackers: { he: 'מעקבי גידול',  en: 'growth trackers' },
  analysis: { he: 'ניתוחי AI החודש', en: 'AI analyses this month' },
  chupchu:  { he: 'שיחות צ\'ופצ\'ו', en: 'Chupchu messages' },
};

interface Props {
  type: 'plants' | 'trackers' | 'analysis' | 'chupchu';
  current: number;
  limit: number;
  tier: string;
}

export function UpgradeBanner({ type, current, limit, tier }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const [dismissed, setDismissed] = useState(false);

  // Show at 80% capacity
  if (dismissed || current < limit * 0.8) return null;
  // Don't show for unlimited tiers
  if (tier === 'professional') return null;

  const resource = RESOURCE_LABELS[type];
  const label = isHe ? resource.he : resource.en;
  const upgradeText = isHe ? 'שדרג →' : 'Upgrade →';

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 16px',
        height: '40px',
        backgroundColor: 'rgba(201,168,76,0.1)',
        borderInlineStart: `3px solid ${GOLD}`,
        fontFamily: ASST,
        fontSize: '13px',
        color: `${GOLD}CC`,
      }}
    >
      <span style={{ flex: 1 }}>
        {current}/{limit} {label}
        {current >= limit
          ? (isHe ? ' — הגעת למגבלה. ' : ' — limit reached. ')
          : (isHe ? ` — ${Math.round((current / limit) * 100)}% מנוצל. ` : ` — ${Math.round((current / limit) * 100)}% used. `)}
        <Link
          to="/pricing"
          style={{ color: GOLD, textDecoration: 'none', fontWeight: 700 }}
        >
          {upgradeText}
        </Link>
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(237,224,196,0.35)', cursor: 'pointer',
          fontSize: '14px', padding: '2px 4px', lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="dismiss"
      >
        ✕
      </button>
    </div>
  );
}
