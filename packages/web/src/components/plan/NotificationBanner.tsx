import { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';

export function NotificationBanner() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already subscribed, denied, or dismissed
  if (isSubscribed || permission === 'denied' || dismissed) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.25)',
      borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
      direction: 'rtl',
    }}>
      <span style={{ fontSize: '24px', flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: ASSIST, fontSize: '14px', fontWeight: 600, color: GOLD, margin: '0 0 2px' }}>
          קבל תזכורות לגינה
        </p>
        <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}70`, margin: 0 }}>
          צ'ופצ'ו ישלח לך תזכורות יומיות על משימות הגינה
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => setDismissed(true)}
          style={{ fontFamily: ASSIST, fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: `${PARCH}50`, background: 'transparent', cursor: 'pointer' }}
        >
          לא עכשיו
        </button>
        <button
          onClick={subscribe}
          disabled={isLoading}
          style={{ fontFamily: ASSIST, fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '6px', border: 'none', background: GOLD, color: '#142B16', cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? '...' : 'הפעל'}
        </button>
      </div>
    </div>
  );
}
