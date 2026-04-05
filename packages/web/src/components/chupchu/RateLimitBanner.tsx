import { useTranslation } from 'react-i18next';

interface Props {
  tier: string | null;
}

export function RateLimitBanner({ tier }: Props) {
  const { t } = useTranslation('chupchu');

  const message =
    tier === 'grower'
      ? t('rateLimit.grower')
      : t('rateLimit.free');

  const showUpgrade = tier !== 'grower' && tier !== 'gardener_pro' && tier !== 'professional';

  return (
    <div
      className="mx-4 mb-3 rounded-xl px-4 py-3 text-sm"
      style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}
      role="alert"
    >
      <p className="font-medium" style={{ color: '#92400E' }}>
        {message}
      </p>
      {showUpgrade && (
        <button
          className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: '#B7924A' }}
          onClick={() => {/* navigate to upgrade page */}}
        >
          {t('upgrade')}
        </button>
      )}
    </div>
  );
}
