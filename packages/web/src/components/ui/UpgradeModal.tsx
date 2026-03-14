import { useState } from 'react';
import { useUpgradeModalStore } from '../../stores/upgradeModalStore';
import { useAuthStore } from '../../stores/authStore';
import { useTier } from '../../hooks/useTier';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type TierKey = 'free' | 'grower' | 'gardener_pro' | 'professional';

const TIER_NAMES: Record<TierKey, string> = {
  free:           'חינמי',
  grower:         'גדל',
  gardener_pro:   'גנן פרו',
  professional:   'מקצועי',
};

const TIER_PRICES_DISPLAY: Record<TierKey, string> = {
  free:           'חינם',
  grower:         '₪9 / חודש',
  gardener_pro:   '₪14 / חודש',
  professional:   '₪49 / חודש',
};

const TIER_FEATURES_LIST: Record<TierKey, string[]> = {
  free: [
    'לוח ביודינמי יומי',
    'אנציקלופדיית צמחים',
    'גינה אחת',
    'שיחה עם מוש (20/חודש)',
    'פרסומות',
  ],
  grower: [
    'כל מה שבחינמי',
    'גישה מלאה לאפליקציה',
    '5 אבחנות צמחים / חודש',
    'שיחה עם מוש (50/חודש)',
    'פרסומות',
  ],
  gardener_pro: [
    'כל מה שבגדל',
    'ללא פרסומות',
    'אבחנות ללא הגבלה',
    'שיחה עם מוש ללא הגבלה',
    'גינות מרובות',
  ],
  professional: [
    'כל מה שבגנן פרו',
    'לוח לקוחות',
    'white-label',
    'תמיכה מועדפת',
  ],
};

const TIERS_ORDER: TierKey[] = ['free', 'grower', 'gardener_pro', 'professional'];

export function UpgradeModal() {
  const { close } = useUpgradeModalStore();
  const { session } = useAuthStore();
  const { tier: currentTier } = useTier();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (targetTier: TierKey) => {
    if (targetTier === 'free' || !session?.access_token) return;
    setLoading(targetTier);
    try {
      const res = await fetch(`${API_BASE}/api/billing/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier: targetTier }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1B2A4A' }}>שדרג את התוכנית שלך</h2>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>בחר את התוכנית המתאימה לך</p>
          </div>
          <button
            onClick={close}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          {TIERS_ORDER.map(tier => {
            const isCurrent    = tier === currentTier;
            const isPro        = tier === 'gardener_pro';
            const isDowngrade  = TIERS_ORDER.indexOf(tier) < TIERS_ORDER.indexOf(currentTier);

            const borderColour = isCurrent
              ? '#4A7C59'
              : isPro
              ? '#B7924A'
              : 'rgba(0,0,0,0.1)';

            return (
              <div
                key={tier}
                className="relative rounded-2xl p-5 flex flex-col gap-3"
                style={{
                  border: `2px solid ${borderColour}`,
                  backgroundColor: '#FFFFFF',
                }}
              >
                {/* Badges */}
                {isPro && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: '#B7924A' }}
                  >
                    הכי פופולרי
                  </span>
                )}
                {isCurrent && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#EAF4EE', color: '#4A7C59', border: '1px solid #4A7C59' }}
                  >
                    התוכנית הנוכחית שלך
                  </span>
                )}

                {/* Name & price */}
                <div>
                  <p className="text-base font-bold" style={{ color: '#1B2A4A' }}>
                    {TIER_NAMES[tier]}
                  </p>
                  <p
                    className="text-lg font-bold mt-0.5"
                    style={{ color: isPro ? '#B7924A' : '#4A7C59' }}
                  >
                    {TIER_PRICES_DISPLAY[tier]}
                  </p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-1.5 flex-1">
                  {TIER_FEATURES_LIST[tier].map(feature => (
                    <li key={feature} className="flex items-start gap-1.5 text-xs" style={{ color: '#374151' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#4A7C59' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier === 'free' || isCurrent ? (
                  <div
                    className="w-full py-2.5 rounded-lg text-center text-sm font-medium"
                    style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}
                  >
                    {isCurrent ? 'תוכנית נוכחית' : 'חינמי'}
                  </div>
                ) : isDowngrade ? (
                  <div
                    className="w-full py-2.5 rounded-lg text-center text-sm font-medium"
                    style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}
                  >
                    לא זמין
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={loading === tier}
                    className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity"
                    style={{
                      backgroundColor: '#4A7C59',
                      opacity: loading === tier ? 0.7 : 1,
                    }}
                  >
                    {loading === tier ? '...' : 'שדרג עכשיו'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
