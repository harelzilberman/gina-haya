const GOLD    = '#F5C840';
const PARCH   = '#EDE0C4';
const FOREST  = '#142B16';
const ASSIST  = '"Assistant", "Heebo", sans-serif';

export type MapMode = 'select' | 'draw' | 'plant' | 'delete';

interface Props {
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  widthM: number;
  heightM: number;
  onSizeChange: (w: number, h: number) => void;
}

const MODES: { id: MapMode; label: string; icon: string; titleHe: string }[] = [
  { id: 'select', icon: '↖',  label: 'בחירה',  titleHe: 'בחר/הזז ערוגה' },
  { id: 'draw',   icon: '▭',  label: 'ציור',   titleHe: 'צייר ערוגה חדשה' },
  { id: 'plant',  icon: '🌱', label: 'שתילה',  titleHe: 'הוסף צמח לערוגה' },
  { id: 'delete', icon: '✕',  label: 'מחיקה',  titleHe: 'מחק ערוגה' },
];

export function MapToolbar({
  mode, onModeChange, isSaving, isDirty, onSave,
  widthM, heightM, onSizeChange,
}: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap',
      gap: '10px', padding: '10px 16px',
      background: 'rgba(20,43,22,0.9)',
      borderBottom: '1px solid rgba(245,200,64,0.12)',
      backdropFilter: 'blur(6px)',
    }}>
      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            title={m.titleHe}
            onClick={() => onModeChange(m.id)}
            style={{
              fontFamily: ASSIST, fontSize: '12px', fontWeight: mode === m.id ? 700 : 400,
              padding: '6px 12px', borderRadius: '6px',
              border: `1px solid ${mode === m.id ? GOLD : 'rgba(245,200,64,0.2)'}`,
              color: mode === m.id ? FOREST : `${PARCH}99`,
              backgroundColor: mode === m.id ? GOLD : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(245,200,64,0.15)' }} />

      {/* Garden size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}66` }}>גודל:</span>
        <input
          type="number" min={2} max={50} value={widthM}
          onChange={e => onSizeChange(Number(e.target.value) || widthM, heightM)}
          style={inputStyle}
          title="רוחב בטרים"
        />
        <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}44` }}>×</span>
        <input
          type="number" min={2} max={50} value={heightM}
          onChange={e => onSizeChange(widthM, Number(e.target.value) || heightM)}
          style={inputStyle}
          title="עומק בטרים"
        />
        <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}55` }}>מ'</span>
      </div>

      {/* Save indicator */}
      <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isSaving ? (
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}55` }}>שומר...</span>
        ) : isDirty ? (
          <button
            onClick={onSave}
            style={{
              fontFamily: ASSIST, fontSize: '12px', fontWeight: 600,
              padding: '5px 14px', borderRadius: '6px',
              border: `1px solid ${GOLD}44`, color: GOLD,
              backgroundColor: `${GOLD}10`, cursor: 'pointer',
            }}
          >
            שמור
          </button>
        ) : (
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}33` }}>✓ שמור</span>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '48px', textAlign: 'center',
  fontFamily: ASSIST, fontSize: '12px', color: PARCH,
  background: 'rgba(245,200,64,0.06)',
  border: '1px solid rgba(245,200,64,0.2)',
  borderRadius: '4px', padding: '4px 6px',
  outline: 'none',
};
