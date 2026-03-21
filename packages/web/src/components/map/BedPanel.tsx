import type { Bed } from '../../stores/mapStore';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const BED_COLORS = [
  '#3d6b4a', '#5878A0', '#8B6088', '#A05040',
  '#7a8b3a', '#608878', '#9a7040', '#4a6878',
];

interface Props {
  bed: Bed;
  onUpdate: (updates: Partial<Omit<Bed, 'id' | 'plants'>>) => void;
  onDelete: () => void;
  onRemovePlant: (instanceId: string) => void;
  onClose: () => void;
}

export function BedPanel({ bed, onUpdate, onDelete, onRemovePlant, onClose }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(160deg, rgba(28,58,30,0.95) 0%, rgba(20,43,22,0.98) 100%)',
      border: '1px solid rgba(245,200,64,0.15)',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '220px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: 0 }}>
          {bed.name}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: `${PARCH}55`, cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
        >
          ✕
        </button>
      </div>

      {/* Name */}
      <label style={labelStyle}>שם הערוגה</label>
      <input
        value={bed.name}
        onChange={e => onUpdate({ name: e.target.value })}
        style={inputStyle}
        maxLength={30}
      />

      {/* Bed size display */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>רוחב (מ')</label>
          <input
            type="number" min={0.3} max={20} step={0.1}
            value={(bed.w / 10).toFixed(1)}
            onChange={e => onUpdate({ w: Math.round(Number(e.target.value) * 10) })}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>עומק (מ')</label>
          <input
            type="number" min={0.3} max={20} step={0.1}
            value={(bed.h / 10).toFixed(1)}
            onChange={e => onUpdate({ h: Math.round(Number(e.target.value) * 10) })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Color picker */}
      <label style={labelStyle}>צבע</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {BED_COLORS.map(c => (
          <button
            key={c}
            onClick={() => onUpdate({ color: c })}
            style={{
              width: '24px', height: '24px', borderRadius: '50%',
              backgroundColor: c, border: bed.color === c ? `2px solid ${GOLD}` : '2px solid transparent',
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>

      {/* Plants */}
      <label style={labelStyle}>צמחים ({bed.plants.length})</label>
      {bed.plants.length === 0 ? (
        <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}44`, margin: '0 0 14px' }}>
          עבור למצב שתילה והקלק על הערוגה
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
          {bed.plants.map(p => (
            <span
              key={p.instanceId}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: ASSIST, fontSize: '11px',
                padding: '3px 8px', borderRadius: '50px',
                border: `1px solid ${SAGE}33`, color: `${PARCH}CC`,
                backgroundColor: `${SAGE}12`,
              }}
            >
              {p.emoji} {p.nameHe}
              <button
                onClick={() => onRemovePlant(p.instanceId)}
                style={{ background: 'none', border: 'none', color: `${PARCH}55`, cursor: 'pointer', padding: '0 0 0 2px', fontSize: '10px', lineHeight: 1 }}
              >✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Delete bed */}
      <button
        onClick={onDelete}
        style={{
          width: '100%', fontFamily: ASSIST, fontSize: '12px', fontWeight: 600,
          padding: '8px', borderRadius: '6px',
          border: '1px solid rgba(220,100,100,0.3)',
          color: 'rgba(220,100,100,0.8)', backgroundColor: 'rgba(220,100,100,0.06)',
          cursor: 'pointer',
        }}
      >
        מחק ערוגה
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: ASSIST, fontSize: '10px', fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  color: `${PARCH}44`, marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', fontFamily: ASSIST, fontSize: '13px', color: PARCH,
  background: 'rgba(245,200,64,0.06)', border: '1px solid rgba(245,200,64,0.15)',
  borderRadius: '6px', padding: '7px 10px', outline: 'none',
  marginBottom: '12px', boxSizing: 'border-box',
};
