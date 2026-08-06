import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLimits } from '@gina-haya/shared';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { useTier } from '../hooks/useTier';
import { api } from '../api/client';

const EARTH  = '#050d0a';
const GOLD   = '#00e5c3';
const SAGE   = '#4A9C68';
const CLAY   = '#9B7A48';
const PARCH  = '#b0cfbf';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const TIER_NAMES_EN: Record<string, string> = {
  free:         'Free',
  gardener_pro: 'Gardener Pro',
  advanced:     'Advanced',
  professional: 'Professional',
};

const TIER_FEATURES_HE: Record<string, string[]> = {
  free:         ['לוח ביודינמי יומי', 'אנציקלופדיית צמחים', 'גינה אחת', "שיחה עם צ'ופצ'ו (20/חודש)", 'פרסומות'],
  grower:       ['גישה מלאה לאפליקציה', '5 אבחנות צמחים / חודש', "שיחה עם צ'ופצ'ו (50/חודש)"],
  gardener_pro: ['ללא פרסומות', 'אבחנות ללא הגבלה', "שיחה עם צ'ופצ'ו ללא הגבלה", 'גינות מרובות'],
  professional: ['לוח לקוחות', 'white-label', 'תמיכה מועדפת'],
};

const TIER_FEATURES_EN: Record<string, string[]> = {
  free:         ['Daily biodynamic calendar', 'Plant encyclopedia', 'One garden', 'Chupchu chat (20/month)', 'Ads'],
  grower:       ['Full app access', '5 plant diagnoses/month', 'Chupchu chat (50/month)'],
  gardener_pro: ['No ads', 'Unlimited diagnoses', 'Unlimited Chupchu chat', 'Multiple gardens'],
  professional: ['Client dashboard', 'White-label', 'Priority support'],
};

const cardStyle = (highlight?: boolean): React.CSSProperties => ({
  background:    'rgba(9,20,16,0.7)',
  border:        highlight ? `2px solid ${GOLD}` : '1px solid rgba(0,229,195,0.15)',
  borderRadius:  '16px',
  padding:       '24px',
  backdropFilter:'blur(8px)',
});

export function BillingPage() {
  const { t, i18n } = useTranslation('billing');
  const isHe = i18n.language === 'he';
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const { session, loadProfile } = useAuthStore();
  const { tier, monthlyPrice, canUpgradeTo } = useTier();
  const { open: openUpgradeModal } = useUpgradeModalStore();
  const navigate = useNavigate();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling,        setCancelling]        = useState(false);
  const [cancelledAt,       setCancelledAt]       = useState<string | null>(null);

  // Polling state for post-payment tier refresh
  const [polling,      setPolling]      = useState(status === 'success');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    function clearParam() {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }

    if (status !== 'success') {
      if (status) clearParam();
      return;
    }

    // Poll loadProfile() every 2 s, up to 6 tries, until tier is non-free
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      await loadProfile();

      const currentTier = useAuthStore.getState().profile?.subscription_tier ?? 'free';
      if (currentTier !== 'free') {
        clearInterval(pollRef.current!);
        setPolling(false);
        clearParam();
        return;
      }

      if (pollCount.current >= 6) {
        clearInterval(pollRef.current!);
        setPolling(false);
        setPollTimedOut(true);
        clearParam();
      }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!session?.access_token || cancelling) return;
    setCancelling(true);
    try {
      const data = await api.post<{ success: boolean; cancelAt: string }>('/api/billing/cancel', {}, session.access_token);
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

  const tierFeatures = isHe ? TIER_FEATURES_HE : TIER_FEATURES_EN;
  const tierName  = isHe ? getLimits(tier).displayNameHe : (TIER_NAMES_EN[tier] ?? tier);
  const features  = tierFeatures[tier] ?? [];
  const nextTier  = canUpgradeTo;
  const nextName  = nextTier
    ? (isHe ? getLimits(nextTier).displayNameHe : (TIER_NAMES_EN[nextTier] ?? nextTier))
    : null;

  return (
    <>
      {/* Noise */}
      <div
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          9998,
          pointerEvents:   'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat:'repeat',
          opacity:         0.28,
        }}
      />

      <div dir={isHe ? 'rtl' : 'ltr'} style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Page title */}
          <h1 style={{
            fontFamily: FRANK,
            fontWeight: 700,
            fontSize:   '2rem',
            color:      GOLD,
            margin:     '0 0 4px',
            lineHeight: 1.1,
          }}>
            {t('title')}
          </h1>

          {/* Status banners */}
          {polling && (
            <div style={{
              ...cardStyle(),
              border:          '1px solid rgba(0,229,195,0.25)',
              backgroundColor: 'rgba(0,229,195,0.07)',
              fontFamily:      ASSIST,
              fontSize:        '14px',
              color:           GOLD,
              display:         'flex',
              alignItems:      'center',
              gap:             '10px',
            }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              {isHe ? 'מעדכן את המנוי שלך...' : 'Updating your subscription…'}
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          {!polling && pollTimedOut && (
            <div style={{
              ...cardStyle(),
              border:          `1px solid ${CLAY}55`,
              backgroundColor: 'rgba(155,122,72,0.15)',
              fontFamily:      ASSIST,
              fontSize:        '14px',
              color:           `${PARCH}CC`,
            }}>
              {isHe
                ? 'התשלום התקבל — העדכון עשוי לקחת עוד רגע. רענן את הדף בעוד כמה שניות.'
                : 'Payment received — the update may take a moment. Refresh the page in a few seconds.'}
            </div>
          )}
          {!polling && !pollTimedOut && tier !== 'free' && status === 'success' && (
            <div style={{
              ...cardStyle(),
              border:          '1px solid rgba(0,229,195,0.4)',
              backgroundColor: 'rgba(74,156,104,0.15)',
              fontFamily:      ASSIST,
              fontSize:        '14px',
              color:           SAGE,
            }}>
              {t('status.success', { name: tierName })}
            </div>
          )}
          {status === 'cancelled' && (
            <div style={{
              ...cardStyle(),
              border:          `1px solid ${CLAY}55`,
              backgroundColor: 'rgba(155,122,72,0.15)',
              fontFamily:      ASSIST,
              fontSize:        '14px',
              color:           `${PARCH}CC`,
            }}>
              {t('status.cancelled', { name: tierName })}
            </div>
          )}
          {cancelledAt && (
            <div style={{
              ...cardStyle(),
              border:          `1px solid ${CLAY}55`,
              backgroundColor: 'rgba(155,122,72,0.15)',
              fontFamily:      ASSIST,
              fontSize:        '14px',
              color:           `${PARCH}CC`,
            }}>
              {t('status.cancelledAt', {
                date: new Date(cancelledAt).toLocaleDateString(isHe ? 'he-IL' : 'en-US'),
              })}
            </div>
          )}

          {/* Current plan */}
          <div style={cardStyle(true)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontFamily: ASSIST, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${PARCH}44`, margin: '0 0 4px' }}>
                  {t('currentPlan')}
                </p>
                <h2 style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '26px', color: GOLD, margin: 0 }}>
                  {tierName}
                </h2>
              </div>
              <span style={{
                fontFamily: PLAYFAIR,
                fontStyle:  'italic',
                fontSize:   '18px',
                color:      monthlyPrice ? PARCH : `${PARCH}44`,
              }}>
                {monthlyPrice ? `₪${monthlyPrice}${t('perMonth')}` : t('free')}
              </span>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }}>
              {features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}CC` }}>
                  <span style={{ color: SAGE, flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade */}
          {nextTier && (
            <div style={cardStyle()}>
              <h3 style={{ fontFamily: FRANK, fontWeight: 600, fontSize: '18px', color: PARCH, margin: '0 0 6px' }}>
                {t('upgradeTitle', { name: nextName })}
              </h3>
              <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}66`, margin: '0 0 16px' }}>
                {t('upgradeDesc')}
              </p>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  width:           '100%',
                  padding:         '13px',
                  borderRadius:    '8px',
                  border:          'none',
                  backgroundColor: GOLD,
                  fontFamily:      FRANK,
                  fontWeight:      600,
                  fontSize:        '15px',
                  color:           EARTH,
                  cursor:          'pointer',
                  transition:      'filter 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                {t('upgradeCta')}
              </button>
            </div>
          )}

          {/* Cancel */}
          {tier !== 'free' && !cancelledAt && (
            <div style={cardStyle()}>
              <h3 style={{ fontFamily: FRANK, fontWeight: 600, fontSize: '16px', color: PARCH, margin: '0 0 6px' }}>
                {t('cancel.title')}
              </h3>
              <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}66`, margin: '0 0 14px' }}>
                {t('cancel.desc')}
              </p>

              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  style={{
                    fontFamily:      ASSIST,
                    fontSize:        '13px',
                    fontWeight:      500,
                    padding:         '7px 18px',
                    borderRadius:    '8px',
                    border:          `1px solid ${CLAY}55`,
                    backgroundColor: 'transparent',
                    color:           CLAY,
                    cursor:          'pointer',
                    transition:      'background-color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(155,122,72,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {t('cancel.button')}
                </button>
              ) : (
                <div style={{
                  padding:         '16px',
                  borderRadius:    '10px',
                  backgroundColor: 'rgba(192,57,43,0.1)',
                  border:          '1px solid rgba(192,57,43,0.25)',
                  display:         'flex',
                  flexDirection:   'column',
                  gap:             '12px',
                }}>
                  <p style={{ fontFamily: ASSIST, fontSize: '13px', color: PARCH, margin: 0 }}>
                    {t('cancel.confirm')}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      style={{
                        flex:            1,
                        padding:         '9px',
                        borderRadius:    '8px',
                        border:          '1px solid rgba(0,229,195,0.2)',
                        backgroundColor: 'transparent',
                        fontFamily:      ASSIST,
                        fontSize:        '13px',
                        color:           `${PARCH}77`,
                        cursor:          'pointer',
                      }}
                    >
                      {t('cancel.no')}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      style={{
                        flex:            1,
                        padding:         '9px',
                        borderRadius:    '8px',
                        border:          'none',
                        backgroundColor: '#C0372A',
                        fontFamily:      FRANK,
                        fontWeight:      600,
                        fontSize:        '13px',
                        color:           '#fff',
                        cursor:          cancelling ? 'default' : 'pointer',
                        opacity:         cancelling ? 0.7 : 1,
                      }}
                    >
                      {cancelling ? '...' : t('cancel.yes')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
