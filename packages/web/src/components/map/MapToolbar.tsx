import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

interface DropItem { tool: MapTool; emoji: string; labelHe: string; labelEn: string }
interface Category { id: string; emoji: string; labelHe: string; labelEn: string; items: DropItem[] }

const CATEGORIES: Category[] = [
  {
    id: 'buildings', emoji: '🏠', labelHe: 'מבנים', labelEn: 'Structures',
    items: [
      { tool: 'house',    emoji: '🏠', labelHe: 'בית',      labelEn: 'House' },
      { tool: 'fence',    emoji: '🚧', labelHe: 'גדר',      labelEn: 'Fence' },
      { tool: 'wall',     emoji: '🧱', labelHe: 'קיר',      labelEn: 'Wall' },
      { tool: 'pergola',  emoji: '⛺', labelHe: 'פרגולה',   labelEn: 'Pergola' },
      { tool: 'deadzone', emoji: '❌', labelHe: 'אזור מת',  labelEn: 'Dead zone' },
      { tool: 'walkway',  emoji: '🛤️', labelHe: 'שביל',    labelEn: 'Walkway' },
    ],
  },
  {
    id: 'plants', emoji: '🌱', labelHe: 'צמחים', labelEn: 'Plants',
    items: [
      { tool: 'plant', emoji: '🌱', labelHe: 'הוסף צמח', labelEn: 'Add plant' },
    ],
  },
  {
    id: 'trees', emoji: '🌳', labelHe: 'עצים', labelEn: 'Trees',
    items: [
      { tool: 'fruit-tree', emoji: '🍊', labelHe: 'עץ פרי', labelEn: 'Fruit tree' },
      { tool: 'tree',       emoji: '🌳', labelHe: 'עץ נוי', labelEn: 'Ornamental tree' },
    ],
  },
  {
    id: 'growing', emoji: '🌿', labelHe: 'גידול', labelEn: 'Growing',
    items: [
      { tool: 'bed',         emoji: '🌱', labelHe: 'ערוגת גידול',   labelEn: 'Growing bed' },
      { tool: 'hydroponics', emoji: '💧', labelHe: 'הידרופוניקה',   labelEn: 'Hydroponics' },
      { tool: 'aquaponics',  emoji: '🐟', labelHe: 'אקווופוניקה',   labelEn: 'Aquaponics' },
      { tool: 'raised-bed',  emoji: '🧱', labelHe: 'ערוגה מוגבהת', labelEn: 'Raised bed' },
      { tool: 'vertical',    emoji: '🌿', labelHe: 'גידול אנכי',    labelEn: 'Vertical growing' },
    ],
  },
  {
    id: 'pots', emoji: '🪴', labelHe: 'עציצים', labelEn: 'Pots',
    items: [
      { tool: 'pot-rect',  emoji: '🪴', labelHe: 'עציץ מלבני', labelEn: 'Rectangular pot' },
      { tool: 'pot-round', emoji: '🪴', labelHe: 'עציץ עגול',  labelEn: 'Round pot' },
    ],
  },
];

function CategoryDropdown({
  category, selectedTool, onSelect, isHe, isMobile,
}: { category: Category; selectedTool: MapTool; onSelect: (t: MapTool) => void; isHe: boolean; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = category.items.some(i => i.tool === selectedTool);
  const activeItem = category.items.find(i => i.tool === selectedTool);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleToggle() {
    setOpen(o => !o);
  }

  const catEmoji = activeItem ? activeItem.emoji : category.emoji;
  const catLabel = isHe
    ? (activeItem?.labelHe ?? category.labelHe)
    : (activeItem?.labelEn ?? category.labelEn);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={handleToggle}
        style={{
          fontFamily: ASSIST,
          fontSize: '13px',
          fontWeight: isActive ? 700 : 400,
          padding: '0 12px',
          borderRadius: '6px',
          border: `1px solid ${isActive ? GOLD : 'rgba(245,200,64,0.2)'}`,
          color: isActive ? GOLD : `${PARCH}99`,
          backgroundColor: isActive ? 'rgba(245,200,64,0.1)' : 'transparent',
          cursor: 'pointer',
          minHeight: '44px',
          minWidth: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '16px' }}>{catEmoji}</span>
        {!isMobile && (
          <>
            <span>{catLabel}</span>
            <span style={{ fontSize: '9px', opacity: 0.5, marginTop: '1px' }}>▾</span>
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            insetInlineEnd: 0,
            insetInlineStart: 'auto',
            backgroundColor: 'rgba(10,24,11,0.99)',
            border: '1px solid rgba(245,200,64,0.3)',
            borderRadius: '10px',
            padding: '6px',
            minWidth: '180px',
            maxHeight: '60vh',
            overflowY: 'auto',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {category.items.map(item => (
            <button
              key={item.tool}
              onClick={() => { onSelect(item.tool); setOpen(false); }}
              style={{
                fontFamily: ASSIST,
                fontSize: '14px',
                lineHeight: '1.4',
                padding: '10px 16px',
                borderRadius: '6px',
                textAlign: isHe ? 'right' : 'left',
                border: 'none',
                background: selectedTool === item.tool
                  ? 'rgba(245,200,64,0.15)'
                  : 'transparent',
                color: selectedTool === item.tool ? GOLD : PARCH,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                whiteSpace: 'nowrap',
                direction: isHe ? 'rtl' : 'ltr',
              }}
              onMouseEnter={e => {
                if (selectedTool !== item.tool)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(245,200,64,0.08)';
              }}
              onMouseLeave={e => {
                if (selectedTool !== item.tool)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.emoji}</span>
              <span>{isHe ? item.labelHe : item.labelEn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MapToolbar({
  selectedTool, onToolChange, showSunZones, onToggleSunZones,
  northAngle, onNorthAngleChange, isSaving, isDirty, onSave, onUndo,
  onWizard, wizardStatus, hasSavedMap,
}: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const canWizard = hasSavedMap && (wizardStatus?.canRun ?? true);
  const wizardLabel = wizardStatus
    ? (isHe
        ? `🌕 מצ'ופצ'ו (${wizardStatus.runsUsedThisMonth}/${wizardStatus.limit ?? '∞'})`
        : `🌕 Chupchu (${wizardStatus.runsUsedThisMonth}/${wizardStatus.limit ?? '∞'})`)
    : (isHe ? "🌕 מצ'ופצ'ו" : '🌕 Chupchu');

  return (
    <div className="gina-toolbar-scroll" dir={isHe ? 'rtl' : 'ltr'} style={{
      position: 'absolute',
      top: '12px',
      insetInlineStart: '12px',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      overflowX: 'auto',
      scrollbarWidth: 'none' as any,
      padding: '4px 8px',
      gap: '6px',
      background: 'rgba(20,43,22,0.94)',
      border: '1px solid rgba(245,200,64,0.2)',
      borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      maxWidth: isMobile ? '240px' : 'calc(100vw - 280px)',
    }}>

      {/* Category dropdowns */}
      {CATEGORIES.map(cat => (
        <CategoryDropdown
          key={cat.id}
          category={cat}
          selectedTool={selectedTool}
          onSelect={onToolChange}
          isHe={isHe}
          isMobile={isMobile}
        />
      ))}

      <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.15)', flexShrink: 0 }} />

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'nowrap' }}>

        {/* Select */}
        <button
          onClick={() => onToolChange('select')}
          style={{
            ...ghostBtn,
            color: selectedTool === 'select' ? FOREST : `${PARCH}88`,
            background: selectedTool === 'select' ? GOLD : 'transparent',
            border: `1px solid ${selectedTool === 'select' ? GOLD : 'rgba(245,200,64,0.2)'}`,
            fontWeight: selectedTool === 'select' ? 700 : 400,
          }}
          title={isHe ? 'בחר' : 'Select'}
        >
          🖱️{!isMobile && ` ${isHe ? 'בחר' : 'Select'}`}
        </button>

        {/* Undo */}
        <button onClick={onUndo} title="Ctrl+Z" style={ghostBtn}>↩️</button>

        {!isMobile && (
          <>
            <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.15)' }} />

            {/* Sun zones */}
            <button
              onClick={onToggleSunZones}
              title={isHe ? 'אזורי שמש' : 'Sun zones'}
              style={{
                ...ghostBtn,
                color: showSunZones ? GOLD : `${PARCH}66`,
                border: `1px solid ${showSunZones ? `${GOLD}66` : 'rgba(245,200,64,0.2)'}`,
                background: showSunZones ? 'rgba(245,200,64,0.1)' : 'transparent',
              }}
            >
              ☀️ {isHe ? 'שמש' : 'Sun'}
            </button>

            {/* North angle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}55` }}>🧭</span>
              <input
                type="number" min={0} max={359} value={northAngle}
                onChange={e => onNorthAngleChange(Number(e.target.value))}
                style={{
                  width: '54px',
                  fontFamily: ASSIST,
                  fontSize: '13px',
                  color: PARCH,
                  background: 'rgba(245,200,64,0.06)',
                  border: '1px solid rgba(245,200,64,0.2)',
                  borderRadius: '5px',
                  padding: '4px 6px',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44` }}>°</span>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(245,200,64,0.15)' }} />

            {/* Save status */}
            {isSaving ? (
              <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}55` }}>
                {isHe ? 'שומר...' : 'Saving...'}
              </span>
            ) : isDirty ? (
              <button onClick={onSave} style={{ ...ghostBtn, color: GOLD, border: `1px solid ${GOLD}55`, padding: '5px 14px' }}>
                💾 {isHe ? 'שמור' : 'Save'}
              </button>
            ) : (
              <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}44` }}>
                {isHe ? 'נשמר ✓' : 'Saved ✓'}
              </span>
            )}
          </>
        )}

        {/* Wizard */}
        <button
          onClick={canWizard ? onWizard : undefined}
          disabled={!canWizard}
          title={isHe ? "מצ'ופצ'ו" : 'Chupchu wizard'}
          style={{
            fontFamily: FRANK,
            fontSize: '13px',
            fontWeight: 700,
            padding: '0 12px',
            borderRadius: '6px',
            flexShrink: 0,
            border: 'none',
            color: canWizard ? FOREST : `${PARCH}44`,
            backgroundColor: canWizard ? GOLD : 'rgba(245,200,64,0.15)',
            cursor: canWizard ? 'pointer' : 'not-allowed',
            opacity: canWizard ? 1 : 0.5,
            whiteSpace: 'nowrap',
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {isMobile ? '🌕' : wizardLabel}
        </button>

      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  fontFamily: ASSIST,
  fontSize: '13px',
  padding: '0 10px',
  borderRadius: '6px',
  border: '1px solid rgba(245,200,64,0.2)',
  color: `${PARCH}88`,
  backgroundColor: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
  minHeight: '44px',
  minWidth: '44px',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
