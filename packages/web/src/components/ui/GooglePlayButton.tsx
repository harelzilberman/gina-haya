import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { GOOGLE_PLAY_URL } from '@gina-haya/shared';
import { EN_HEADING } from '../../styles/fonts';

/**
 * "Get it in the app" call-to-action shown in place of every buy / upgrade /
 * subscribe button while web checkout is disabled (WEB_CHECKOUT_ENABLED=false).
 * Styled after the store badge (black pill, two-line label) without using the
 * badge artwork.
 */
export function GooglePlayButton({
  fullWidth = false,
  compact = false,
  style,
  onClick,
}: {
  fullWidth?: boolean;
  compact?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const { t } = useTranslation('common');
  return (
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('playCheckout.ariaLabel')}
      onClick={onClick}
      dir="ltr"
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '8px' : '10px',
        padding: compact ? '6px 14px' : '8px 18px',
        minHeight: compact ? '40px' : '48px',
        background: '#000',
        color: '#fff',
        border: '1px solid #a6a6a6',
        borderRadius: '10px',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'filter 0.2s',
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.35)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
    >
      <svg
        aria-hidden="true"
        width={compact ? 18 : 22}
        height={compact ? 18 : 22}
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        <path d="M5 3.5v17a.5.5 0 0 0 .76.43l14-8.5a.5.5 0 0 0 0-.86l-14-8.5A.5.5 0 0 0 5 3.5Z" fill="currentColor" />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
        <span style={{ fontFamily: EN_HEADING, fontSize: compact ? '10px' : '11px', fontWeight: 500, opacity: 0.9 }}>
          {t('playCheckout.ctaSmall')}
        </span>
        <span style={{ fontFamily: EN_HEADING, fontSize: compact ? '15px' : '18px', fontWeight: 600, letterSpacing: '0.01em' }}>
          {t('playCheckout.ctaStore')}
        </span>
      </span>
    </a>
  );
}

/** Notice shown at the top of /shop and /pricing while web checkout is disabled. */
export function PlayCheckoutNotice({ style }: { style?: CSSProperties }) {
  const { t, i18n } = useTranslation('common');
  const isHe = i18n.language === 'he';
  return (
    <div
      role="note"
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '16px 20px 0',
        ...style,
      }}
    >
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px 16px',
        background: 'rgba(0,229,195,0.07)',
        border: '1px solid rgba(0,229,195,0.25)',
        borderRadius: '12px',
        padding: '14px 18px',
      }}>
        <p style={{
          flex: '1 1 260px',
          margin: 0,
          fontFamily: EN_HEADING,
          fontSize: '14px',
          lineHeight: 1.6,
          color: '#b0cfbf',
          textAlign: 'start',
        }}>
          {t('playCheckout.notice')}
        </p>
        <GooglePlayButton compact />
      </div>
    </div>
  );
}
