import { useState } from 'react';
import { useUpgradeModalStore } from '../../stores/upgradeModalStore';
import { useAuthStore } from '../../stores/authStore';
import { useTier } from '../../hooks/useTier';
import { api } from '../../api/client';
import { getLimits, TIER_PRICING, TIER_ORDER } from '@gina-haya/shared';
import type { SubscriptionTier } from '@gina-haya/shared';

const EARTH    = '#050d0a';
const SOIL     = '#111f18';
const GOLD     = '#00e5c3';
const SAGE     = '#4A9C68';
const CLAY     = '#9B7A48';
const PARCH    = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST   = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const PLAYFAIR = '"Playfair Display", Georgia, serif';

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

// Feature lists: marketing copy with numbers interpolated from getLimits() so they
// stay in sync with @gina-haya/shared whenever limits change.
const _f = getLimits('free');
const _g = getLimits('gardener_pro');
const _a = getLimits('advanced');
const _p = getLimits('professional');

const TIER_FEATURES_LIST: Record<string, string[]> = {
  free: [
    'לוח ביודינמי יומי',
    `גינה אחת (עד ${_f.maxPlantsPerGarden} צמחים)`,
    `צ'ופצ'ו — ${_f.maxChupChuPerMonth} שיחות לחודש`,
    `${_f.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    'מעקב גידול אחד — טעימה',
  ],
  gardener_pro: [
    'הכל בחינמי',
    `${_g.maxGardens} גינות — עד ${_g.maxPlantsPerGarden} צמחים כל אחת`,
    `עד ${_g.maxTrackers} מעקבי גידול`,
    `${_g.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    `צ'ופצ'ו — ${_g.maxChupChuPerMonth} שיחות לחודש`,
    'אנציקלופדיה מלאה',
  ],
  advanced: [
    'הכל בגנן ביתי',
    `${_a.maxGardens} גינות — עד ${_a.maxPlantsPerGarden} צמחים כל אחת`,
    'מעקבי גידול ללא הגבלה',
    `${_a.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    `צ'ופצ'ו — ${_a.maxChupChuPerMonth} שיחות לחודש`,
    'ייצוא PDF',
  ],
  professional: [
    'הכל בגנן מתקדם',
    `${_p.maxGardens} גינות — עד ${_p.maxPlantsPerGarden} צמחים כל אחת`,
    `${_p.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    `צ'ופצ'ו — ${_p.maxChupChuPerMonth} שיחות לחודש`,
    'תמיכה מועדפת',
  ],
};

export function UpgradeModal() {
  if (import.meta.env.PROD && import.meta.env.VITE_LAUNCH_FREE_MODE === 'true') {
    return null;
  }

  const { close }           = useUpgradeModalStore();
  const { session }         = useAuthStore();
  const { tier: currentTier } = useTier();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (targetTier: SubscriptionTier) => {
    if (targetTier === 'free' || !session?.access_token) return;
    setLoading(targetTier);
    try {
      const data = await api.post<{ checkoutUrl?: string }>('/api/billing/create-checkout', { tier: targetTier }, session.access_token);
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
            maxWidth:        '860px',
            maxHeight:       '90vh',
            overflowY:       'auto',
            backgroundColor: SOIL,
            border:          '1px solid rgba(0,229,195,0.2)',
            borderRadius:    '16px',
          }}
        >
          {/* Header */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent:'space-between',
            padding:      '24px 28px 20px',
            borderBottom: '1px solid rgba(0,229,195,0.1)',
            position:     'sticky',
            top:          0,
            backgroundColor: SOIL,
            zIndex:       1,
          }}>
            <div>
              <h2 style={{
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize:   '22px',
                color:      GOLD,
                margin:     '0 0 4px',
              }}>
                שדרג את התוכנית שלך
              </h2>
              <p style={{
                fontFamily: ASSIST,
                fontSize:   '13px',
                color:      `${PARCH}55`,
                margin:     0,
              }}>
                בחר את התוכנית המתאימה לך
              </p>
            </div>
            {/* Close — top-LEFT (RTL) */}
            <button
              onClick={close}
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

          {/* Tier cards grid */}
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
                    position:        'relative',
                    borderRadius:    '12px',
                    padding:         '20px',
                    display:         'flex',
                    flexDirection:   'column',
                    gap:             '12px',
                    background:      'rgba(9,20,16,0.6)',
                    border:          isCurrent
                      ? `2px solid ${SAGE}88`
                      : isPro
                      ? `2px solid ${GOLD}`
                      : '1px solid rgba(0,229,195,0.15)',
                    transform:       isPro ? 'scale(1.02)' : 'none',
                  }}
                >
                  {/* Badges */}
                  {isPro && (
                    <span style={{
                      position:        'absolute',
                      top:             '-12px',
                      left:            '50%',
                      transform:       'translateX(-50%)',
                      fontFamily:      FRANK,
                      fontWeight:      700,
                      fontSize:        '11px',
                      padding:         '3px 12px',
                      borderRadius:    '50px',
                      backgroundColor: GOLD,
                      color:           EARTH,
                      whiteSpace:      'nowrap',
                    }}>
                      הכי פופולרי
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{
                      position:        'absolute',
                      top:             '-12px',
                      left:            '50%',
                      transform:       'translateX(-50%)',
                      fontFamily:      ASSIST,
                      fontWeight:      600,
                      fontSize:        '11px',
                      padding:         '3px 12px',
                      borderRadius:    '50px',
                      backgroundColor: 'rgba(74,156,104,0.3)',
                      border:          `1px solid ${SAGE}44`,
                      color:           SAGE,
                      whiteSpace:      'nowrap',
                    }}>
                      התוכנית הנוכחית שלך
                    </span>
                  )}

                  {/* Name & price */}
                  <div>
                    <p style={{
                      fontFamily: FRANK,
                      fontWeight: 700,
                      fontSize:   '16px',
                      color:      isPro ? GOLD : PARCH,
                      margin:     '0 0 4px',
                    }}>
                      {getLimits(tier).displayNameHe}
                    </p>
                    <p style={{
                      fontFamily: PLAYFAIR,
                      fontStyle:  'italic',
                      fontSize:   '15px',
                      color:      isPro ? GOLD : `${PARCH}BB`,
                      margin:     0,
                    }}>
                      {TIER_PRICING[tier]?.monthly != null ? `₪${TIER_PRICING[tier].monthly} / חודש` : 'חינם'}
                    </p>
                  </div>

                  {/* Features */}
                  <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', margin: 0, padding: 0, listStyle: 'none' }}>
                    {TIER_FEATURES_LIST[tier].map(feature => (
                      <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}AA` }}>
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
                      fontFamily:      ASSIST,
                      fontSize:        '13px',
                      color:           `${PARCH}44`,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border:          '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {isCurrent ? 'תוכנית נוכחית' : 'חינמי'}
                    </div>
                  ) : isDowngrade ? (
                    <div style={{
                      padding:         '10px',
                      borderRadius:    '8px',
                      textAlign:       'center',
                      fontFamily:      ASSIST,
                      fontSize:        '13px',
                      color:           `${PARCH}33`,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                    }}>
                      לא זמין
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
                        fontFamily:      FRANK,
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
                      {loading === tier ? '...' : 'שדרג עכשיו'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}
