import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { ChupChuChat } from '../components/chupchu/ChupChuChat';
import { useChupChu } from '../hooks/useChupChu';
import { useAuthStore } from '../stores/authStore';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

export function ChupChuPage() {
  const { t, i18n } = useTranslation('chupchu');
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';
  const { loadHistory, usageThisMonth, monthlyLimit } = useChupChu();
  const { profile } = useAuthStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const tier        = profile?.subscription_tier ?? 'free';
  const isUnlimited = tier === 'gardener_pro' || tier === 'professional';
  const isAtLimit   = !isUnlimited && monthlyLimit !== null && usageThisMonth >= monthlyLimit;

  return (
    <>
      {/* Noise overlay */}
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

      <div style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div dir={dir} style={{ maxWidth: '700px', margin: '0 auto', padding: '28px 16px 40px' }}>

          {/* Page header */}
          <div style={{ marginBottom: '20px', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
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
            <p style={{
              fontFamily: ASSIST,
              fontSize:   '13px',
              fontWeight: 300,
              color:      `${PARCH}66`,
              margin:     0,
            }}>
              {t('subtitle')}
            </p>
          </div>

          {/* Usage counter */}
          {!isUnlimited && monthlyLimit !== null && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <span style={{
                fontFamily:      ASSIST,
                fontSize:        '12px',
                fontWeight:      300,
                padding:         '4px 14px',
                borderRadius:    '50px',
                backgroundColor: isAtLimit ? 'rgba(192,57,43,0.15)' : 'rgba(245,200,64,0.1)',
                border:          `1px solid ${isAtLimit ? 'rgba(192,57,43,0.3)' : 'rgba(245,200,64,0.25)'}`,
                color:           isAtLimit ? '#E07060' : GOLD,
              }}>
                {t('usageCounter', { used: usageThisMonth, limit: monthlyLimit })}
              </span>
            </div>
          )}

          {/* Chat panel */}
          <ChupChuChat />
        </div>
      </div>
    </>
  );
}
