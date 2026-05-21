import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

const BIO_CYAN = '#00e5c3';
const DM_SANS  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const BANNER_CSS = `
@keyframes node-pulse {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
.node-dot { animation: node-pulse 1.8s ease-in-out infinite; }
`;

export function NodeBlackoutBanner({ day }: Props) {
  const { t, i18n } = useTranslation('calendar');

  if (!day.nodeActive) return null;

  let endTime: string | null = null;
  if (day.nodeBlackoutEnd) {
    try {
      endTime = new Date(day.nodeBlackoutEnd).toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
        hour:     '2-digit',
        minute:   '2-digit',
        timeZone: 'Asia/Jerusalem',
      });
    } catch {
      endTime = null;
    }
  }

  return (
    <>
      <style>{BANNER_CSS}</style>

      <div
        role="alert"
        style={{
          width:           '100%',
          padding:         '12px 20px',
          marginBottom:    '4px',
          backgroundColor: 'rgba(8,14,8,0.88)',
          borderBottom:    `1px solid ${BIO_CYAN}33`,
          borderTop:       `2px solid ${BIO_CYAN}55`,
          backdropFilter:  'blur(6px)',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          gap:             '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="node-dot" style={{ fontSize: '14px', lineHeight: 1 }}>⚫</span>
          <p style={{
            fontFamily:    DM_SANS,
            fontSize:      '13px',
            fontWeight:    700,
            color:         BIO_CYAN,
            margin:        0,
            letterSpacing: '0.04em',
          }}>
            {t('nodeBlackout.active')}
          </p>
          <span className="node-dot" style={{ fontSize: '14px', lineHeight: 1, animationDelay: '0.9s' }}>⚫</span>
        </div>

        {endTime && (
          <p style={{
            fontFamily: DM_SANS,
            fontSize:   '12px',
            color:      `${BIO_CYAN}77`,
            margin:     0,
          }}>
            {t('nodeBlackout.endsAt', { time: endTime })}
          </p>
        )}
      </div>
    </>
  );
}
