import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EN_HEADING } from '../../styles/fonts';

const EARTH = '#050d0a';
const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';

export type UpgradeLimitType =
  | 'plants' | 'trackers' | 'analysis' | 'chupchu' | 'gardens' | 'encyclopedia';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  limitType: UpgradeLimitType;
  currentTier?: string;
  current?: number;
  limit?: number;
  resetsAt?: string;
  /** 'daily' → show "resets tomorrow" copy; 'monthly' → show upgrade copy (default) */
  scope?: 'daily' | 'monthly';
}

export function UpgradeModal({ isOpen, onClose, limitType, scope }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('billing');
  const isHe = i18n.language === 'he';

  if (import.meta.env.PROD && import.meta.env.VITE_LAUNCH_FREE_MODE === 'true') {
    return null;
  }

  if (!isOpen) return null;

  const isDaily = limitType === 'analysis' && scope === 'daily';

  const title         = isDaily
    ? t('upgradeLimit.analysis.dailyTitle')
    : t(`upgradeLimit.${limitType}.title`);
  const body          = isDaily
    ? t('upgradeLimit.analysis.dailyBody')
    : t(`upgradeLimit.${limitType}.body`);
  const primaryLabel  = t(`upgradeLimit.${limitType}.primaryLabel`);
  const secondaryLabel = (limitType === 'analysis' && !isDaily)
    ? t('upgradeLimit.analysis.secondaryLabel')
    : null;
  const dismissLabel  = t('upgradeLimit.dismiss');

  function go(to: string) {
    onClose();
    navigate(to);
  }

  const headingFont = isHe ? FRANK : EN_HEADING;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir={isHe ? 'rtl' : 'ltr'}
        style={{
          backgroundColor: '#1a3a1c',
          border: '1px solid rgba(0,229,195,0.25)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#050d0a',
          borderBottom: '1px solid rgba(0,229,195,0.1)',
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '64px', height: '64px', flexShrink: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, #b0e8e0, #00e5c3, #00a08a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            <span style={{ position: 'absolute', fontSize: '28px' }}>🌕</span>
            <img
              src="/chupchu_happy.png"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h2 style={{ fontFamily: headingFont, fontSize: '19px', color: GOLD, margin: 0, flex: 1 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(176,207,191,0.4)', cursor: 'pointer', fontSize: '18px', padding: '4px', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p style={{
            fontFamily: EN_HEADING, fontSize: '15px', color: `${PARCH}CC`,
            margin: '0 0 24px', lineHeight: 1.7, whiteSpace: 'pre-line',
          }}>
            {body}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Primary CTA */}
            <button
              onClick={() => go('/pricing')}
              style={{
                width: '100%', padding: '13px',
                backgroundColor: GOLD, color: EARTH,
                border: 'none', borderRadius: '10px',
                fontFamily: headingFont, fontSize: '16px', fontWeight: 700,
                cursor: 'pointer', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {primaryLabel}
            </button>

            {/* Secondary CTA (analysis only) */}
            {secondaryLabel && (
              <button
                onClick={() => go('/shop')}
                style={{
                  width: '100%', padding: '12px',
                  backgroundColor: 'transparent',
                  color: GOLD,
                  border: `1px solid rgba(0,229,195,0.4)`,
                  borderRadius: '10px',
                  fontFamily: headingFont, fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer', transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.4)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {secondaryLabel}
              </button>
            )}

            {/* Dismiss */}
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '10px',
                backgroundColor: 'transparent',
                color: 'rgba(176,207,191,0.4)',
                border: 'none',
                fontFamily: EN_HEADING, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
