import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenSwitcherStore } from '../../stores/gardenSwitcherStore';
import { usePlanLimit } from '../../hooks/usePlanLimit';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

interface Props {
  onCreateGarden: () => void;
}

export function GardenSwitcher({ onCreateGarden }: Props) {
  const navigate = useNavigate();
  const { gardens, activeGardenId, switchGarden } = useGardenSwitcherStore();
  const { limits } = usePlanLimit();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activeGarden = gardens.find(g => g.id === activeGardenId) ?? gardens[0];
  const atLimit = limits.maxGardens !== null && gardens.length >= limits.maxGardens;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!activeGarden) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '6px',
          fontFamily: DM_SANS,
          fontSize:   '13px',
          fontWeight: 600,
          color:      TEXT_MID,
          background: 'rgba(0,229,195,0.06)',
          border:     '1px solid rgba(0,229,195,0.2)',
          borderRadius: '8px',
          padding:    '5px 10px',
          cursor:     'pointer',
          transition: 'border-color 0.2s, background 0.2s',
          maxWidth:   '160px',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.45)';
          (e.currentTarget as HTMLElement).style.background  = 'rgba(0,229,195,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.2)';
          (e.currentTarget as HTMLElement).style.background  = 'rgba(0,229,195,0.06)';
        }}
      >
        <span style={{ fontSize: '14px' }}>🏡</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {activeGarden.name}
        </span>
        <span style={{ fontSize: '9px', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:        'absolute',
          top:             'calc(100% + 8px)',
          insetInlineStart: 0,
          minWidth:        '220px',
          maxHeight:       '320px',
          overflowY:       'auto',
          background:      NIGHT_CARD,
          border:          '1px solid rgba(0,229,195,0.15)',
          borderRadius:    '10px',
          boxShadow:       '0 12px 48px rgba(0,0,0,0.5)',
          padding:         '6px 0',
          zIndex:          200,
        }}>
          {/* Header */}
          <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid rgba(0,229,195,0.08)', marginBottom: '4px' }}>
            <span style={{ fontFamily: FRANK, fontSize: '12px', color: `${TEXT_MID}60`, letterSpacing: '0.05em' }}>
              הגינות שלי
            </span>
          </div>

          {/* Garden list */}
          {gardens.map(garden => {
            const isActive = garden.id === activeGardenId;
            return (
              <button
                key={garden.id}
                disabled={switchingId !== null}
                onClick={async () => {
                  if (switchingId !== null || isActive) return;
                  setSwitchingId(garden.id);
                  try {
                    await switchGarden(garden.id);
                  } finally {
                    setSwitchingId(null);
                    setOpen(false);
                  }
                }}
                style={{
                  display:           'flex',
                  alignItems:        'center',
                  gap:               '10px',
                  width:             '100%',
                  padding:           '9px 14px',
                  background:        isActive ? 'rgba(0,229,195,0.08)' : 'transparent',
                  border:            'none',
                  cursor:            switchingId !== null ? 'wait' : isActive ? 'default' : 'pointer',
                  borderInlineStart: isActive ? `2px solid ${BIO_CYAN}` : '2px solid transparent',
                  transition:        'background 0.15s',
                  opacity:           switchingId !== null && switchingId !== garden.id ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,195,0.05)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>🏡</span>
                <div style={{ flex: 1, textAlign: 'start', overflow: 'hidden' }}>
                  <div style={{
                    fontFamily:   DM_SANS,
                    fontSize:     '13px',
                    fontWeight:   600,
                    color:        isActive ? BIO_CYAN : TEXT_MID,
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}>
                    {switchingId === garden.id ? 'טוען...' : garden.name}
                    {garden.is_default && (
                      <span style={{ fontFamily: DM_SANS, fontSize: '10px', color: `${TEXT_MID}50`, marginRight: '6px' }}> ★</span>
                    )}
                  </div>
                  {garden.location && (
                    <div style={{
                      fontFamily:   DM_SANS,
                      fontSize:     '11px',
                      color:        `${TEXT_MID}55`,
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                    }}>
                      {garden.location}
                    </div>
                  )}
                </div>
                {isActive && (
                  <span style={{ color: BIO_CYAN, fontSize: '14px', flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(0,229,195,0.08)', marginTop: '4px', padding: '6px 8px' }}>
            {!atLimit ? (
              <button
                onClick={() => { onCreateGarden(); setOpen(false); }}
                style={{
                  width:           '100%',
                  padding:         '8px 10px',
                  background:      'rgba(0,229,195,0.08)',
                  border:          '1px dashed rgba(0,229,195,0.3)',
                  borderRadius:    '6px',
                  cursor:          'pointer',
                  fontFamily:      DM_SANS,
                  fontSize:        '12px',
                  fontWeight:      600,
                  color:           BIO_CYAN,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             '6px',
                  transition:      'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background     = 'rgba(0,229,195,0.14)';
                  (e.currentTarget as HTMLElement).style.borderColor    = 'rgba(0,229,195,0.55)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background     = 'rgba(0,229,195,0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor    = 'rgba(0,229,195,0.3)';
                }}
              >
                + הוסף גינה
              </button>
            ) : (
              <button
                onClick={() => { navigate('/shop'); setOpen(false); }}
                style={{
                  width:           '100%',
                  padding:         '8px 10px',
                  background:      'transparent',
                  border:          '1px solid rgba(0,229,195,0.2)',
                  borderRadius:    '6px',
                  cursor:          'pointer',
                  fontFamily:      DM_SANS,
                  fontSize:        '11px',
                  color:           `${TEXT_MID}70`,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             '4px',
                }}
              >
                הוסף חבילת גינות ←
              </button>
            )}

            <button
              onClick={() => { navigate('/gardens'); setOpen(false); }}
              style={{
                width:           '100%',
                padding:         '7px 10px',
                marginTop:       '4px',
                background:      'transparent',
                border:          'none',
                cursor:          'pointer',
                fontFamily:      DM_SANS,
                fontSize:        '11px',
                color:           `${TEXT_MID}50`,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
              }}
            >
              ניהול גינות ⚙
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
