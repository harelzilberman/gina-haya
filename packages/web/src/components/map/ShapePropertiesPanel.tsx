import type { MapObject } from '../../stores/mapStore';
import { SHAPE_CONFIGS } from '../../data/mapObjects';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

interface Props {
  object: MapObject;
  onUpdate: (changes: Partial<MapObject>) => void;
  onDelete: () => void;
  onToggleLock: () => void;
}

function NumInput({ label, value, onChange, readOnly, unit = 'מ׳', step = 0.1, min = 0.1 }: {
  label: string; value: number; onChange?: (v: number) => void;
  readOnly?: boolean; unit?: string; step?: number; min?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
      <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88` }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <input
          type="number" value={Math.round(value * 100) / 100}
          min={min} step={step}
          readOnly={readOnly}
          onChange={e => onChange?.(Math.max(min, parseFloat(e.target.value) || min))}
          style={{
            width: '60px', fontFamily: ASSIST, fontSize: '12px', color: readOnly ? `${PARCH}44` : PARCH,
            background: readOnly ? 'rgba(245,200,64,0.03)' : 'rgba(245,200,64,0.08)',
            border: `1px solid ${readOnly ? 'rgba(245,200,64,0.10)' : 'rgba(245,200,64,0.25)'}`,
            borderRadius: '5px', padding: '4px 6px', outline: 'none', textAlign: 'center',
            cursor: readOnly ? 'not-allowed' : 'text',
          }}
        />
        <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44` }}>{unit}</span>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88` }}>{label}</label>
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontFamily: ASSIST, fontSize: '12px', color: PARCH,
          background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.25)',
          borderRadius: '5px', padding: '5px 8px', outline: 'none',
        }}
      />
    </div>
  );
}

// ── Polygon area (shoelace) ──────────────────────────────────────────────────
function polyArea(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(s / 2);
}

// ── Component ────────────────────────────────────────────────────────────────

export function ShapePropertiesPanel({ object, onUpdate, onDelete, onToggleLock }: Props) {
  const cfg = SHAPE_CONFIGS[object.type];
  if (!cfg) return null;

  const isFixedWidth = cfg.fixedWidth != null;

  return (
    <div style={{
      position: 'absolute', bottom: '16px', insetInlineEnd: '16px',
      zIndex: 30, width: '220px',
      background: 'rgba(20,43,22,0.95)', border: '1px solid rgba(245,200,64,0.20)',
      borderRadius: '14px', padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      fontFamily: ASSIST, direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '16px' }}>{cfg.emoji}</span>
        <span style={{ fontFamily: FRANK, color: GOLD, fontSize: '14px', fontWeight: 700, flex: 1 }}>
          {cfg.labelHe}
        </span>
        <button
          onClick={onToggleLock}
          title={object.locked ? 'שחרר נעילה' : 'נעל במקום'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '16px', padding: '2px 0', lineHeight: 1,
            color: object.locked ? GOLD : `${PARCH}33`,
            transition: 'color 0.15s',
          }}
        >
          {object.locked ? '🔒' : '🔓'}
        </button>
      </div>

      {/* Label */}
      <TextInput
        label="שם"
        value={object.label}
        onChange={v => onUpdate({ label: v })}
      />

      {/* Rect fields */}
      {object.shapeKind === 'rect' && (
        <>
          {isFixedWidth ? (
            <NumInput label="עובי (קבוע)" value={cfg.fixedWidth!} readOnly unit="מ׳" />
          ) : (
            <NumInput
              label="רוחב"
              value={object.width ?? cfg.defaultWidth ?? 1}
              onChange={v => onUpdate({ width: v })}
            />
          )}
          <NumInput
            label="אורך"
            value={object.height ?? cfg.defaultHeight ?? 1}
            onChange={v => onUpdate({ height: v })}
          />
          <NumInput
            label="סיבוב"
            value={object.rotation ?? 0}
            onChange={v => onUpdate({ rotation: v })}
            unit="°" step={1} min={0}
          />
          {object.wallHeightM != null && (
            <NumInput
              label="גובה קיר"
              value={object.wallHeightM}
              onChange={v => onUpdate({ wallHeightM: v })}
            />
          )}
        </>
      )}

      {/* Circle fields */}
      {object.shapeKind === 'circle' && (
        <>
          <NumInput
            label="קוטר"
            value={(object.radius ?? cfg.defaultRadius ?? 1) * 2}
            onChange={v => onUpdate({ radius: Math.max(0.1, v / 2) })}
          />
          {(object.type === 'fruit-tree' || object.type === 'tree') && (
            <TextInput
              label="שם העץ"
              value={object.fruitTreeName ?? ''}
              onChange={v => onUpdate({ fruitTreeName: v })}
            />
          )}
          {object.type === 'fruit-tree' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={object.isFruitTree ?? true}
                onChange={e => onUpdate({ isFruitTree: e.target.checked })}
                style={{ accentColor: GOLD }}
              />
              <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88` }}>עץ פרי</span>
            </label>
          )}
        </>
      )}

      {/* Polygon fields */}
      {object.shapeKind === 'polygon' && object.points && (
        <div style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}66` }}>
          שטח: {polyArea(object.points).toFixed(1)} מ״ר
        </div>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          marginTop: '4px', padding: '7px 0', borderRadius: '7px',
          border: '1px solid rgba(200,50,50,0.5)', background: 'transparent',
          color: 'rgba(220,80,80,0.85)', fontFamily: ASSIST, fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        מחק צורה
      </button>
    </div>
  );
}
