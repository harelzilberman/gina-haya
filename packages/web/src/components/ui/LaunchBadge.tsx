import { useState, useEffect } from 'react';

const STORAGE_KEY = 'launch_badge_dismissed';

export function LaunchBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 50,
        maxWidth: '180px',
        backgroundColor: '#1D9E75',
        color: '#E1F5EE',
        border: '1.5px solid #0F6E56',
        borderRadius: '12px',
        padding: '12px 16px',
      }}
    >
      <button
        onClick={dismiss}
        aria-label="סגור"
        style={{
          position: 'absolute',
          top: '6px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: '#E1F5EE',
          cursor: 'pointer',
          fontSize: '13px',
          lineHeight: 1,
          padding: 0,
          opacity: 0.8,
        }}
      >
        ✕
      </button>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', paddingRight: '16px' }}>
        🎁 מתנת השקה
      </div>
      <div style={{ fontSize: '12px' }}>הכל פתוח וחינמי</div>
      <div style={{ fontSize: '12px' }}>Everything is free</div>
    </div>
  );
}
