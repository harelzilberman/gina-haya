import { useState, useRef, useEffect } from 'react';
import type { MapTool } from '../../stores/mapStore';
import type { WizardStatus } from '../../stores/mapStore';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FOREST = '#142B16';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';

interface Props {
  selectedTool: MapTool;
  onToolChange: (t: MapTool) => void;
  showSunZones: boolean;
  onToggleSunZones: () => void;
  northAngle: number;
  onNorthAngleChange: (v: number) => void;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onUndo: () => void;
  onWizard: () => void;
  wizardStatus: WizardStatus | null;
  hasSavedMap: boolean;
}

// ── Category definitions ──────────────────────────────────────────────────────

interface DropItem { tool: MapTool; emoji: string; label: string }
interface Category { id: string; label: string; items: DropItem[] }

const CATEGORIES: Category[] = [
  {
    id: 'buildings', label: 'מבנים',
    items: [
      { tool: 'house',    emoji: '🏠', label: 'בית' },
      { tool: 'fence',    emoji: '🚧', label: 'גדר' },
      { tool: 'wall',     emoji: '🧱', label: 'קיר' },
      { tool: 'pergola',  emoji: '⛺', label: 'פרגולה' },
      { tool: 'deadzone', emoji: '❌', label: 'אזור מת' },
      { tool: 'walkway',  emoji: '🛤️', label: 'שביל' },
    ],
  },
  {
    id: 'plants', label: 'צמחים',
    items: [
      { tool: 'plant', emoji: '🌱', label: 'הוסף צמח' },
    ],
  },
  {
    id: 'trees', label: 'עצים',
    items: [
      { tool: 'fruit-tree', emoji: '🍊', label: 'עץ פרי' },
      { tool: 'tree',       emoji: '🌳', label: 'עץ נוי' },
    ],
  },
  {
    id: 'pots', label: 'עציצים',
    items: [
      { tool: 'pot-rect',  emoji: '🪴', label: 'עציץ מלבני' },
      { tool: 'pot-round', emoji: '🪴', label: 'עציץ עגול' },
    ],
  },
];

// ── Dropdown button ───────────────────────────────────────────────────────────

function CategoryDropdown({
  category, selectedTool, onSelect,
}: { category: Category; selectedTool: MapTool; onSelect: (t: MapTool) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = category.items.some(i => i.tool === selectedTool);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeItem = category.items.find(i => i.tool === selectedTool);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: ASSIST, fontSize: '12px', fontWeight: isActive ? 700 : 400,
          padding: '5px 10px', borderRadius: '6px',
          border: `1px solid ${isActive ? GOLD : 'rgba(245,200,64,0.18)'}`,
          color: isActive ? GOLD : `${PARCH}88`,
          backgroundColor: 'transparent',
          cursor: 'pointer', minHeight: '32px',
          borderBottom: isActive ? `2px solid ${GOLD}` : undefined,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        {activeItem ? `${activeItem.emoji} ${activeItem.label}` : category.label}
        <span style={{ fontSize: '10px', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          background: 'rgba(14,30,15,0.98)',
          border: '1px solid rgba(245,200,64,0.20)',
          borderRadius: '8px', padding: '4px',
          minWidth: '140px', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '2px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {category.items.map(item => (
            <button
              key={item.tool}
              onClick={() => { onSelect(item.tool); setOpen(false); }}
              style={{
                fontFamily: ASSIST, fontSize: '12px',
                padding: '7px 10px', borderRadius: '5px', textAlign: 'right',
                border: 'none', background: selectedTool === item.tool ? 'rgba(245,200,64,0.12)' : 'transparent',
                color: selectedTool === item.tool ? GOLD : `${PARCH}88`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Toolbar ──────────────────────────────────────────────────────────────

export function MapToolbar({
  selectedTool, onToolChange, showSunZones, onToggleSunZones,
  northAngle, onNorthAngleChange, isSaving, isDirty, onSave, onUndo,
  onWizard, wizardStatus, hasSavedMap,
}: Props) {
  const canWizard = hasSavedMap && (wizardStatus?.canRun ?? true);
  const wizardLabel = wizardStatus
    ? `🌕 ממוש (${wizardStatus.runsUsedThisMonth}/${wizardStatus.limit ?? '∞'})`
    : '🌕 ממוש';

  return (
    <div dir="rtl" style={{
      position: 'relative', zIndex: 10, flexShrink: 0,
      height: '52px', display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: '6px', overflowX: 'auto',
      background: FOREST, borderBottom: '1px solid rgba(245,200,64,0.15)',
    }}>

      {/* ── LEFT (RTL = visually right) — dropdown categories ── */}
      {CATEGORIES.map(cat => (
        <CategoryDropdown
          key={cat.id}
          category={cat}
          selectedTool={selectedTool}
          onSelect={onToolChange}
        />
      ))}

      <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.12)', flexShrink: 0 }} />

      {/* ── RIGHT section ── */}
      <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

        {/* Select */}
        <button
          onClick={() => onToolChange('select')}
          style={{
            ...ghostBtn,
            color: selectedTool === 'select' ? FOREST : `${PARCH}77`,
            background: selectedTool === 'select' ? GOLD : 'transparent',
            border: `1px solid ${selectedTool === 'select' ? GOLD : 'rgba(245,200,64,0.18)'}`,
            fontWeight: selectedTool === 'select' ? 700 : 400,
          }}
        >
          🖱️ בחר
        </button>

        {/* Undo */}
        <button onClick={onUndo} title="בטל (Ctrl+Z)" style={ghostBtn}>↩️</button>

        <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.12)' }} />

        {/* Sun zones */}
        <button
          onClick={onToggleSunZones}
          title="אזורי שמש"
          style={{
            ...ghostBtn,
            color: showSunZones ? GOLD : `${PARCH}66`,
            border: `1px solid ${showSunZones ? `${GOLD}55` : 'rgba(245,200,64,0.18)'}`,
            padding: '5px 10px',
          }}
        >
          ☀️ שמש
        </button>

        {/* North angle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44` }}>🧭</span>
          <input
            type="number" min={0} max={359} value={northAngle}
            onChange={e => onNorthAngleChange(Number(e.target.value))}
            style={{
              width: '52px', fontFamily: ASSIST, fontSize: '12px', color: PARCH,
              background: 'rgba(245,200,64,0.06)', border: '1px solid rgba(245,200,64,0.18)',
              borderRadius: '5px', padding: '4px 6px', outline: 'none', textAlign: 'center',
            }}
          />
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}33` }}>°</span>
        </div>

        <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.12)' }} />

        {/* Save status */}
        {isSaving ? (
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44` }}>שומר...</span>
        ) : isDirty ? (
          <button onClick={onSave} style={{ ...ghostBtn, color: GOLD, border: `1px solid ${GOLD}44`, padding: '5px 14px' }}>
            💾 שמור
          </button>
        ) : (
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}33` }}>נשמר ✓</span>
        )}

        {/* Wizard */}
        <button
          onClick={canWizard ? onWizard : undefined}
          disabled={!canWizard}
          title={!hasSavedMap ? 'שמור את המפה תחילה' : !wizardStatus?.canRun ? 'הגעת למגבלת השימוש' : undefined}
          style={{
            fontFamily: FRANK, fontSize: '12px', fontWeight: 700,
            padding: '6px 12px', borderRadius: '6px', flexShrink: 0,
            border: 'none',
            color: canWizard ? FOREST : `${PARCH}44`,
            backgroundColor: canWizard ? GOLD : 'rgba(245,200,64,0.15)',
            cursor: canWizard ? 'pointer' : 'not-allowed',
            opacity: canWizard ? 1 : 0.5,
          }}
        >
          {wizardLabel}
        </button>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  fontFamily: ASSIST, fontSize: '12px',
  padding: '5px 8px', borderRadius: '6px',
  border: '1px solid rgba(245,200,64,0.18)', color: `${PARCH}77`,
  backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0, minHeight: '32px',
};
