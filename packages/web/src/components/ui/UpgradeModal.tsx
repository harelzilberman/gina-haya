import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUpgradeModalStore } from '../../stores/upgradeModalStore';
import { useAuthStore } from '../../stores/authStore';
import { useTier } from '../../hooks/useTier';
import { api } from '../../api/client';
import { getLimits, TIER_PRICING, TIER_ORDER } from '@gina-haya/shared';
import type { SubscriptionTier } from '@gina-haya/shared';
import { savePurchaseIntent } from '../../utils/purchaseIntent';
import { EN_HEADING } from '../../styles/fonts';

const EARTH    = '#050d0a';
const SOIL     = '#111f18';
const GOLD     = '#00e5c3';
const SAGE     = '#4A9C68';
const PARCH    = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';

const MODAL_CSS = `
@keyframes upgrade-modal-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.upgrade-modal-card {
  animation: upgrade-modal-in 0.2s ease-out both;
}
.upgrade-modal-scroll::-webkit-scrollbar { width: 4px; }
.upgrade-modal-scroll::-webkit-scrollbar-track { background: transparent; }
.upgrade-modal-scroll::-webkit-scrollbar-thumb { background: rgba(0,229,195,0.2); border-radius: 2px; }
`;

// Limit constants — shared across both languages.
const _f = getLimits('free');
const _g = getLimits('gardener_pro');
const _a = getLimits('advanced');
const _p = getLimits('professional');

const TIER_NAMES_EN: Record<string, string> = {
  free:         'Free',
  gardener_pro: 'Grower',
  advanced:     'Gardener',
  professional: 'Professional',
};

export function UpgradeModal() {
  const { close, billingPeriod, targetTier } = useUpgradeModalStore();
  const { session, profile, loadProfile } = useAuthStore();
  const { tier: currentTier }   = useTier();
  const { i18n, t }              = useTranslation('billing');
  const isHe                    = i18n.language === 'he';
  const navigate                 = useNavigate();
  const [loading, setLoading]    = useState<string | null>(null);

  if (import.meta.env.PROD && import.meta.env.VITE_LAUNCH_FREE_MODE === 'true') {
    return null;
  }

  // Returns display name for a tier in the current UI language.
  const tierDisplayName = (tier: string) =>
    isHe ? getLimits(tier as SubscriptionTier).displayNameHe : (TIER_NAMES_EN[tier] ?? tier);

  // Feature lists — generated here so t() runs at render time for correct language.
  const TIER_FEATURES: Record<string, string[]> = {
    free: [
      t('pricing.features.dailyCalendar'),
      t('pricing.features.oneGarden', { plants: _f.maxPlantsPerGarden }),
      t('pricing.features.chupchu', { chats: _f.maxChupChuPerMonth }),
      t('pricing.features.aiAnalyses', { analyses: _f.maxVisionLooksPerMonth }),
      t('pricing.features.trackerPreview'),
    ],
    gardener_pro: [
      t('pricing.features.allFree'),
      t('pricing.features.gardens', { gardens: _g.maxGardens, plants: _g.maxPlantsPerGarden }),
      t('pricing.features.upToTrackers', { trackers: _g.maxTrackers }),
      t('pricing.features.aiAnalyses', { analyses: _g.maxVisionLooksPerMonth }),
      t('pricing.features.chupchu', { chats: _g.maxChupChuPerMonth }),
      t('pricing.features.encyclopedia'),
    ],
    advanced: [
      t('pricing.features.allGardenerPro'),
      t('pricing.features.gardens', { gardens: _a.maxGardens, plants: _a.maxPlantsPerGarden }),
      t('pricing.features.unlimitedTrackers'),
      t('pricing.features.aiAnalyses', { analyses: _a.maxVisionLooksPerMonth }),
      t('pricing.features.chupchu', { chats: _a.maxChupChuPerMonth }),
      t('pricing.features.pdfExport'),
    ],
    professional: [
      t('pricing.features.allAdvanced'),
      t('pricing.features.gardens', { gardens: _p.maxGardens, plants: _p.maxPlantsPerGarden }),
      t('pricing.features.aiAnalyses', { analyses: _p.maxVisionLooksPerMonth }),
      t('pricing.features.chupchu', { chats: _p.maxChupChuPerMonth }),
      t('pricing.features.prioritySupport'),
    ],
  };

  const headingFont = isHe ? FRANK : EN_HEADING;

  // Called when a tier card's upgrade button is clicked.
  const handleUpgrade = (tier: SubscriptionTier) => {
    if (tier === 'free') return;

    if (!session?.access_token) {
      savePurchaseIntent({ tier, billingPeriod, returnTo: '/pricing' });
      close();
      navigate('/login?next=/pricing');
      return;
    }

    setLoading(tier);
    const interval = billingPeriod === 'annual' ? 'yearly' : 'monthly';
    api.post<{ checkoutUrl?: string; changed?: boolean; effective?: 'now' | 'period_end' }>(
      '/api/billing/checkout',
      { tier, interval },
      session.access_token,
    ).then(async data => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      // Existing subscriber — the plan was changed in place (no new checkout).
      if (data.changed) {
        await loadProfile();
        close();
        navigate(`/billing?status=${data.effective === 'now' ? 'upgraded' : 'downgradeScheduled'}`);
      }
    }).catch(() => {
      // silent
    }).finally(() => {
      setLoading(null);
    });
  };

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Backdrop */}
      <div
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          60,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '16px',
          backgroundColor: 'rgba(0,0,0,0.9)',
        }}
        onClick={e => { if (e.target === e.currentTarget) close(); }}
      >
        <div
          className="upgrade-modal-card upgrade-modal-scroll"
          style={{
            position:        'relative',
            width:           '100%',
            maxWidth:        targetTier ? '500px' : '860px',
            maxHeight:       '90vh',
            overflowY:       'auto',
            backgroundColor: SOIL,
            border:          '1px solid rgba(0,229,195,0.2)',
            borderRadius:    '16px',
            transition:      'max-width 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '24px 28px 20px',
            borderBottom:    '1px solid rgba(0,229,195,0.1)',
            position:        'sticky',
            top:             0,
            backgroundColor: SOIL,
            zIndex:          1,
          }}>
            <div>
              <h2 style={{
                fontFamily: headingFont,
                fontWeight: 700,
                fontSize:   '22px',
                color:      GOLD,
                margin:     '0 0 4px',
              }}>
                {targetTier ? t('modal.confirmTitle') : t('modal.selectTitle')}
              </h2>
              <p style={{
                fontFamily: EN_HEADING,
                fontSize:   '13px',
                color:      `${PARCH}55`,
                margin:     0,
              }}>
                {targetTier
                  ? t('modal.planTransition', { from: tierDisplayName(currentTier), to: tierDisplayName(targetTier) })
                  : t('modal.selectSubtitle')}
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={() => close()}
              aria-label="סגור"
              style={{
                width:           '34px',
                height:          '34px',
                borderRadius:    '50%',
                backgroundColor: 'rgba(0,229,195,0.1)',
                border:          '1px solid rgba(0,229,195,0.25)',
                color:           GOLD,
                fontSize:        '18px',
                cursor:          'pointer',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                transition:      'background-color 0.15s',
                flexShrink:      0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.1)'; }}
            >
              ×
            </button>
          </div>

          {/* ── Confirmation step (when targetTier is pre-set) ── */}
          {targetTier ? (
            <div dir={isHe ? 'rtl' : 'ltr'} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Current → New plan summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {profile && (
                  <div style={{
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    padding:         '12px 16px',
                    borderRadius:    '8px',
                    background:      'rgba(255,255,255,0.03)',
                    border:          '1px solid rgba(176,207,191,0.1)',
                  }}>
                    <span style={{ fontFamily: EN_HEADING, fontSize: '13px', color: `${PARCH}66` }}>
                      {t('modal.currentPlan')}
                    </span>
                    <span style={{ fontFamily: EN_HEADING, fontSize: '14px', color: `${PARCH}88`, fontWeight: 600 }}>
                      {tierDisplayName(currentTier)}
                    </span>
                  </div>
                )}

                {profile && (
                  <div style={{ textAlign: 'center', color: GOLD, fontSize: '18px', lineHeight: 1 }}>↓</div>
                )}

                <div style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'space-between',
                  padding:         '14px 16px',
                  borderRadius:    '10px',
                  background:      'rgba(0,229,195,0.07)',
                  border:          `1.5px solid ${GOLD}99`,
                }}>
                  <span style={{ fontFamily: EN_HEADING, fontSize: '13px', color: `${PARCH}CC` }}>
                    {t('modal.upgradingTo')}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span style={{ fontFamily: headingFont, fontSize: '16px', color: GOLD, fontWeight: 700 }}>
                      {tierDisplayName(targetTier)}
                    </span>
                    <span style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}99` }}>
                      {billingPeriod === 'annual'
                        ? `₪${TIER_PRICING[targetTier]?.annual} ${t('modal.perYear')}`
                        : `₪${TIER_PRICING[targetTier]?.monthly} ${t('modal.perMonth')}`}
                    </span>
                  </div>
                </div>
              </div>

              {billingPeriod === 'annual' && (
                <p style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}66`, margin: 0 }}>
                  {t('modal.annualOneTime')}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => close()}
                  style={{
                    flex:            1,
                    padding:         '11px',
                    borderRadius:    '8px',
                    border:          '1px solid rgba(0,229,195,0.15)',
                    backgroundColor: 'transparent',
                    fontFamily:      EN_HEADING,
                    fontSize:        '13px',
                    color:           `${PARCH}77`,
                    cursor:          'pointer',
                  }}
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={() => handleUpgrade(targetTier as SubscriptionTier)}
                  disabled={loading === targetTier}
                  style={{
                    flex:            2,
                    padding:         '11px',
                    borderRadius:    '8px',
                    border:          'none',
                    backgroundColor: loading !== targetTier ? GOLD : `${GOLD}44`,
                    fontFamily:      headingFont,
                    fontWeight:      600,
                    fontSize:        '15px',
                    color:           EARTH,
                    cursor:          loading !== targetTier ? 'pointer' : 'default',
                    transition:      'filter 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (loading !== targetTier)
                      (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  {loading === targetTier ? '...' : t('modal.continueToPayment')}
                </button>
              </div>
            </div>

          ) : (
            /* ── Tier cards grid (default view) ── */
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap:                 '14px',
              padding:             '24px 28px',
            }}>
              {TIER_ORDER.map(tier => {
                const isCurrent   = tier === currentTier;
                const isPro       = tier === 'gardener_pro';
                const isDowngrade = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentTier);

                return (
                  <div
                    key={tier}
                    style={{
                      position:      'relative',
                      borderRadius:  '12px',
                      padding:       '20px',
                      display:       'flex',
                      flexDirection: 'column',
                      gap:           '12px',
                      background:    'rgba(9,20,16,0.6)',
                      border:        isCurrent
                        ? `2px solid ${SAGE}88`
                        : isPro
                        ? `2px solid ${GOLD}`
                        : '1px solid rgba(0,229,195,0.15)',
                      transform:     isPro ? 'scale(1.02)' : 'none',
                    }}
                  >
                    {/* Badges */}
                    {isPro && (
                      <span style={{
                        position:        'absolute',
                        top:             '-12px',
                        left:            '50%',
                        transform:       'translateX(-50%)',
                        fontFamily:      headingFont,
                        fontWeight:      700,
                        fontSize:        '11px',
                        padding:         '3px 12px',
                        borderRadius:    '50px',
                        backgroundColor: GOLD,
                        color:           EARTH,
                        whiteSpace:      'nowrap',
                      }}>
                        {t('modal.mostPopular')}
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{
                        position:        'absolute',
                        top:             '-12px',
                        left:            '50%',
                        transform:       'translateX(-50%)',
                        fontFamily:      EN_HEADING,
                        fontWeight:      600,
                        fontSize:        '11px',
                        padding:         '3px 12px',
                        borderRadius:    '50px',
                        backgroundColor: 'rgba(74,156,104,0.3)',
                        border:          `1px solid ${SAGE}44`,
                        color:           SAGE,
                        whiteSpace:      'nowrap',
                      }}>
                        {t('modal.currentPlanBadge')}
                      </span>
                    )}

                    {/* Name & price */}
                    <div>
                      <p style={{
                        fontFamily: headingFont,
                        fontWeight: 700,
                        fontSize:   '16px',
                        color:      isPro ? GOLD : PARCH,
                        margin:     '0 0 4px',
                      }}>
                        {tierDisplayName(tier)}
                      </p>
                      <p style={{
                        fontFamily: EN_HEADING,
                        fontSize:   '15px',
                        color:      isPro ? GOLD : `${PARCH}BB`,
                        margin:     0,
                      }}>
                        {TIER_PRICING[tier]?.monthly != null
                          ? `₪${TIER_PRICING[tier].monthly} ${t('modal.perMonth')}`
                          : t('modal.free')}
                      </p>
                    </div>

                    {/* Features */}
                    <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', margin: 0, padding: 0, listStyle: 'none' }}>
                      {(TIER_FEATURES[tier] ?? []).map(feature => (
                        <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}AA` }}>
                          <span style={{ color: SAGE, flexShrink: 0, marginTop: '1px' }}>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {tier === 'free' || isCurrent ? (
                      <div style={{
                        padding:         '10px',
                        borderRadius:    '8px',
                        textAlign:       'center',
                        fontFamily:      EN_HEADING,
                        fontSize:        '13px',
                        color:           `${PARCH}44`,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border:          '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {isCurrent ? t('modal.currentPlanLabel') : t('modal.free')}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(tier)}
                        disabled={loading === tier}
                        style={{
                          width:           '100%',
                          padding:         '10px',
                          borderRadius:    '8px',
                          border:          isPro ? 'none' : `1px solid ${GOLD}55`,
                          backgroundColor: isPro ? GOLD : 'transparent',
                          fontFamily:      headingFont,
                          fontWeight:      600,
                          fontSize:        '13px',
                          color:           isPro ? EARTH : GOLD,
                          cursor:          loading === tier ? 'default' : 'pointer',
                          opacity:         loading === tier ? 0.7 : 1,
                          transition:      'filter 0.15s, background-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (loading !== tier) {
                            const el = e.currentTarget as HTMLElement;
                            if (isPro) el.style.filter = 'brightness(1.1)';
                            else el.style.backgroundColor = 'rgba(0,229,195,0.1)';
                          }
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.filter = 'none';
                          if (!isPro) el.style.backgroundColor = 'transparent';
                        }}
                      >
                        {loading === tier ? '...' : isDowngrade ? t('modal.switchTo') : t('modal.upgradeNow')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
