import type { MapTool } from '../../stores/mapStore';
import type { WizardStatus } from '../../stores/mapStore';

const GOLD    = '#F5C840';
const PARCH   = '#EDE0C4';
const FOREST  = '#142B16';
const ASSIST  = '"Assistant", "Heebo", sans-serif';

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

const TOOLS: { id: MapTool; icon: string; label: string }[] = [
  { id: 'select',  icon: '↖',  label: 'בחר'  },
  { id: 'polygon', icon: '✏️', label: 'מצולע' },
  { id: 'rect',    icon: '▭',  label: 'מלבן'  },
  { id: 'circle',  icon: '⭕', label: 'עיגול' },
  { id: 'plant',   icon: '🌱', label: 'צמח'   },
  { id: 'delete',  icon: '🗑️', label: 'מחק'   },
];

export function MapToolbar({
  selectedTool, onToolChange, showSunZones, onToggleSunZones,
  northAngle, onNorthAngleChange, isSaving, isDirty, onSave, onUndo,
  onWizard, wizardStatus, hasSavedMap,
}: Props) {
  const canWizard = hasSavedMap && (wizardStatus?.canRun ?? true);
  const wizardLabel = wizardStatus
    ? `🌕 בקש ממוש לתכנן (${wizardStatus.runsUsedThisMonth}/${wizardStatus.limit ?? '∞'})`
    : '🌕 בקש ממוש לתכנן';

  return (
    <div style={{
      position: 'relative', zIndex: 10,
      height: '52px', display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto',
      background: FOREST, borderBottom: '1px solid rgba(245,200,64,0.15)',
      flexShrink: 0,
    }}>
      {/* Tool buttons */}
      {TOOLS.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(tool.id)}
          style={{
            fontFamily: ASSIST, fontSize: '12px', fontWeight: selectedTool === tool.id ? 700 : 400,
            padding: '5px 10px', borderRadius: '6px', flexShrink: 0,
            border: `1px solid ${selectedTool === tool.id ? GOLD : 'rgba(245,200,64,0.18)'}`,
            color: selectedTool === tool.id ? FOREST : `${PARCH}88`,
            backgroundColor: selectedTool === tool.id ? GOLD : 'transparent',
            cursor: 'pointer', transition: 'all 0.12s', minHeight: '32px',
          }}
        >
          {tool.icon} {tool.label}
        </button>
      ))}

      {/* Undo */}
      <button onClick={onUndo} title="בטל" style={ghostBtn}>↩️</button>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.12)', flexShrink: 0 }} />

      {/* Sun zones toggle */}
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

      {/* North angle input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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

      {/* Divider */}
      <div style={{ flex: 1 }} />

      {/* Save */}
      {isSaving ? (
        <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44`, flexShrink: 0 }}>שומר...</span>
      ) : isDirty ? (
        <button onClick={onSave} style={{ ...ghostBtn, color: GOLD, border: `1px solid ${GOLD}44`, padding: '5px 14px' }}>
          💾 שמור
        </button>
      ) : (
        <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}33`, flexShrink: 0 }}>נשמר ✓</span>
      )}

      {/* Wizard button */}
      <button
        onClick={canWizard ? onWizard : undefined}
        disabled={!canWizard}
        title={!hasSavedMap ? 'שמור את המפה תחילה' : !wizardStatus?.canRun ? 'הגעת למגבלת השימוש' : undefined}
        style={{
          fontFamily: ASSIST, fontSize: '12px', fontWeight: 700,
          padding: '6px 14px', borderRadius: '6px', flexShrink: 0,
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
  );
}

const ghostBtn: React.CSSProperties = {
  fontFamily: ASSIST, fontSize: '13px',
  padding: '5px 8px', borderRadius: '6px',
  border: '1px solid rgba(245,200,64,0.18)', color: `${PARCH}77`,
  backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0, minHeight: '32px',
};
