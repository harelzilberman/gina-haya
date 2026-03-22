import { useState, useEffect } from 'react';

const STORAGE_KEY = 'map-grid-info-seen';

const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const GOLD = '#F5C840';

export function GridInfoBox() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show each session until dismissed this session
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, pointerEvents: 'auto',
      background: 'rgba(20,43,22,0.92)',
      border: `1px solid rgba(245,200,64,0.30)`,
      borderRadius: '12px', padding: '10px 36px 10px 16px',
      display: 'flex', alignItems: 'center', gap: '8px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontFamily: FRANK, color: GOLD, fontSize: '13px' }}>
        הרשת מייצגת 1מטר × 1מטר
      </span>
      <button
        onClick={dismiss}
        style={{
          position: 'absolute', top: '50%', insetInlineStart: '8px',
          transform: 'translateY(-50%)',
          fontFamily: ASSIST, fontSize: '12px', color: `${GOLD}88`,
          background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
          padding: '2px 4px',
        }}
        title="סגור"
      >
        ✕
      </button>
    </div>
  );
}
