import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { useTier } from '../hooks/useTier';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const TIER_NAMES: Record<string, string> = {
  free:           'חינמי',
  grower:         'גדל',
  gardener_pro:   'גנן פרו',
  professional:   'מקצועי',
};

const TIER_FEATURES_HE: Record<string, string[]> = {
  free: ['לוח ביודינמי יומי', 'אנציקלופדיית צמחים', 'גינה אחת', 'שיחה עם מוש (20/חודש)', 'פרסומות'],
  grower: ['גישה מלאה לאפליקציה', '5 אבחנות צמחים / חודש', 'שיחה עם מוש (50/חודש)'],
  gardener_pro: ['ללא פרסומות', 'אבחנות ללא הגבלה', 'שיחה עם מוש ללא הגבלה', 'גינות מרובות'],
  professional: ['לוח לקוחות', 'white-label', 'תמיכה מועדפת'],
};

export function BillingPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const { session } = useAuthStore();
  const { tier, monthlyPrice, canUpgradeTo } = useTier();
  const { open: openUpgradeModal } = useUpgradeModalStore();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);

  // Clear the status param from URL after showing the message
  useEffect(() => {
    if (status) {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleCancel = async () => {
    if (!session?.access_token || cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCancelledAt(data.cancelAt);
        setShowCancelConfirm(false);
      }
    } catch {
      // silent
    } finally {
      setCancelling(false);
    }
  };

  const tierName  = TIER_NAMES[tier] ?? tier;
  const features  = TIER_FEATURES_HE[tier] ?? [];
  const nextTier  = canUpgradeTo;
  const nextName  = nextTier ? TIER_NAMES[nextTier] : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EC' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Status banners */}
        {status === 'success' && (
          <div
            className="rounded-2xl px-5 py-4 text-sm font-medium"
            style={{ backgroundColor: '#EAF4EE', color: '#4A7C59', border: '1px solid #4A7C59' }}
          >
            🎉 שדרוג הצליח! ברוך הבא לתוכנית {tierName}.
          </div>
        )}
        {status === 'cancelled' && (
          <div
            className="rounded-2xl px-5 py-4 text-sm font-medium"
            style={{ backgroundColor: '#FEF3E2', color: '#B7924A', border: '1px solid #B7924A' }}
          >
            אין בעיה — נשארת בתוכנית {tierName}. תוכל לשדרג מתי שתרצה.
          </div>
        )}
        {cancelledAt && (
          <div
            className="rounded-2xl px-5 py-4 text-sm font-medium"
            style={{ backgroundColor: '#FEF3E2', color: '#B7924A', border: '1px solid #B7924A' }}
          >
            המנוי יבוטל בתאריך {new Date(cancelledAt).toLocaleDateString('he-IL')}. ניתן להמשיך להשתמש עד אז.
          </div>
        )}

        {/* Current plan card */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm"
          style={{ border: '2px solid #4A7C59' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#6B7280' }}>התוכנית הנוכחית שלך</p>
              <h2 className="text-xl font-bold" style={{ color: '#1B2A4A' }}>{tierName}</h2>
            </div>
            <span
              className="text-lg font-bold"
              style={{ color: monthlyPrice ? '#4A7C59' : '#9CA3AF' }}
            >
              {monthlyPrice ? `₪${monthlyPrice}/חודש` : 'חינם'}
            </span>
          </div>

          <ul className="flex flex-col gap-1.5">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                <span style={{ color: '#4A7C59' }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade section */}
        {nextTier && (
          <div
            className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: '#1B2A4A' }}>
              שדרג ל{nextName}
            </h3>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
              קבל גישה לתכונות מתקדמות ותמיכה מלאה
            </p>
            <button
              onClick={() => openUpgradeModal('billing_page')}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: '#4A7C59' }}
            >
              ראה את כל התוכניות
            </button>
          </div>
        )}

        {/* Cancel section */}
        {tier !== 'free' && !cancelledAt && (
          <div
            className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <h3 className="text-base font-semibold mb-1" style={{ color: '#1B2A4A' }}>ביטול מנוי</h3>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
              ביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית.
            </p>

            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
              >
                בטל מנוי
              </button>
            ) : (
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
              >
                <p className="text-sm font-medium" style={{ color: '#1B2A4A' }}>
                  בטוח? המנוי יבוטל בסוף התקופה הנוכחית.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                  >
                    לא, השאר אותי
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
                    style={{ backgroundColor: '#DC2626', opacity: cancelling ? 0.7 : 1 }}
                  >
                    {cancelling ? '...' : 'כן, בטל'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
