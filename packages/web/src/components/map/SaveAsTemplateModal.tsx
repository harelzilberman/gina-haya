import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TEMPLATE_CATEGORIES } from '../../data/gardenTemplates';
import type { TemplateMeta } from '../../stores/mapStore';
import type { MapObject } from '../../stores/mapStore';
import { api } from '../../api/client';

const GOLD   = '#F5C840';
const FOREST = '#142B16';
const PARCH  = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  mapObjects: MapObject[];
  activeTemplate: TemplateMeta | null;
  token: string | undefined;
}

export function SaveAsTemplateModal({ isOpen, onClose, onSuccess, mapObjects, activeTemplate, token }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  const [saveMode, setSaveMode] = useState<'update' | 'new'>('update');
  const [icon, setIcon]         = useState('🌿');
  const [titleHe, setTitleHe]   = useState('');
  const [titleEn, setTitleEn]   = useState('');
  const [descHe, setDescHe]     = useState('');
  const [descEn, setDescEn]     = useState('');
  const [categoryHe, setCategoryHe] = useState(TEMPLATE_CATEGORIES[0]?.he ?? '');
  const [categoryEn, setCategoryEn] = useState(TEMPLATE_CATEGORIES[0]?.en ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill from active template when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (activeTemplate) {
      setSaveMode('update');
      setTitleHe(activeTemplate.titleHe);
      setTitleEn(activeTemplate.titleEn);
      setDescHe(activeTemplate.descHe);
      setDescEn(activeTemplate.descEn);
      setIcon(activeTemplate.icon);
      setCategoryHe(activeTemplate.categoryHe);
      setCategoryEn(activeTemplate.categoryEn);
    } else {
      setSaveMode('new');
      setTitleHe(''); setTitleEn(''); setDescHe(''); setDescEn('');
      setIcon('🌿');
      setCategoryHe(TEMPLATE_CATEGORIES[0]?.he ?? '');
      setCategoryEn(TEMPLATE_CATEGORIES[0]?.en ?? '');
    }
  }, [isOpen, activeTemplate]);

  function handleCategoryChange(he: string) {
    setCategoryHe(he);
    const cat = TEMPLATE_CATEGORIES.find(c => c.he === he);
    if (cat) setCategoryEn(cat.en);
  }

  async function handleSave() {
    if (!titleHe.trim() || !titleEn.trim() || !token) return;
    setIsSaving(true);
    try {
      // Strip IDs from elements before storing
      const elements = mapObjects.map(({ id: _id, ...rest }) => rest);

      const id = saveMode === 'update' && activeTemplate ? activeTemplate.id : crypto.randomUUID();
      await api.put('/api/templates', {
        overrides: [{
          id,
          title_he: titleHe,
          title_en: titleEn,
          description_he: descHe || null,
          description_en: descEn || null,
          is_hidden: false,
          sort_order: 0,
          icon,
          category_he: categoryHe,
          category_en: categoryEn,
          is_custom: saveMode === 'new' ? true : (activeTemplate?.id === id ? false : true),
          elements,
        }],
      }, token);

      onSuccess(isHe ? 'התבנית נשמרה בהצלחה ✓' : 'Template saved successfully ✓');
      onClose();
    } catch (err: any) {
      alert(isHe ? `שגיאה: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  const canSave = titleHe.trim().length > 0 && titleEn.trim().length > 0;

  const lbl: React.CSSProperties = {
    fontFamily: ASSIST, fontSize: 12, fontWeight: 600,
    color: 'rgba(237,224,196,0.55)', display: 'block',
    marginBottom: 5, textAlign: 'right',
  };

  return (
    <>
      <style>{`
        .satm-input { background: rgba(255,255,255,0.07); border: 1px solid rgba(245,200,64,0.2); border-radius: 7px; padding: 8px 11px; font-size: 13px; font-family: ${ASSIST}; color: ${PARCH}; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; direction: rtl; }
        .satm-input:focus { border-color: rgba(245,200,64,0.5); }
        .satm-input::placeholder { color: rgba(237,224,196,0.3); }
        .satm-input-ltr { direction: ltr; text-align: left; }
        .satm-textarea { background: rgba(255,255,255,0.07); border: 1px solid rgba(245,200,64,0.2); border-radius: 7px; padding: 8px 11px; font-size: 13px; font-family: ${ASSIST}; color: ${PARCH}; outline: none; width: 100%; box-sizing: border-box; resize: vertical; min-height: 58px; transition: border-color 0.15s; direction: rtl; }
        .satm-textarea:focus { border-color: rgba(245,200,64,0.5); }
        .satm-textarea::placeholder { color: rgba(237,224,196,0.3); }
        .satm-textarea-ltr { direction: ltr; text-align: left; }
        .satm-select { background: rgba(10,28,12,0.98); border: 1px solid rgba(245,200,64,0.2); border-radius: 7px; padding: 8px 11px; font-size: 13px; font-family: ${ASSIST}; color: ${PARCH}; outline: none; width: 100%; box-sizing: border-box; cursor: pointer; direction: rtl; }
        .satm-select:focus { border-color: rgba(245,200,64,0.5); }
        .satm-radio { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(245,200,64,0.12); transition: background 0.12s, border-color 0.12s; }
        .satm-radio:hover { background: rgba(245,200,64,0.04); border-color: rgba(245,200,64,0.22); }
        .satm-radio.active { background: rgba(245,200,64,0.08); border-color: rgba(245,200,64,0.35); }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Modal — always RTL per spec */}
        <div
          dir="rtl"
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 500,
            maxHeight: '90dvh',
            background: `linear-gradient(180deg, #1a3a1c 0%, ${FOREST} 100%)`,
            border: '1px solid rgba(245,200,64,0.22)',
            borderRadius: 14,
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header — X on left (start in RTL = right, so X is flex-end = left) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 14px',
            borderBottom: '1px solid rgba(245,200,64,0.1)',
            flexShrink: 0,
          }}>
            {/* Title on right (flex-start in RTL) */}
            <h2 style={{ fontFamily: FRANK, fontSize: 18, fontWeight: 700, color: GOLD, margin: 0 }}>
              🔖 {isHe ? 'שמור כתבנית' : 'Save as Template'}
            </h2>
            {/* X on left (flex-end in RTL) */}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1px solid rgba(245,200,64,0.2)',
                background: 'transparent', color: 'rgba(237,224,196,0.5)',
                cursor: 'pointer', fontSize: 15, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >✕</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>

            {/* 1. אפשרות שמירה — only when a template is loaded */}
            {activeTemplate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={lbl}>אפשרות שמירה</label>

                <div
                  className={`satm-radio${saveMode === 'update' ? ' active' : ''}`}
                  onClick={() => setSaveMode('update')}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', marginTop: 1, flexShrink: 0,
                    border: `2px solid ${saveMode === 'update' ? GOLD : 'rgba(245,200,64,0.3)'}`,
                    background: saveMode === 'update' ? GOLD : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {saveMode === 'update' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: FOREST }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: FRANK, fontSize: 13, fontWeight: 700, color: PARCH }}>
                      עדכן תבנית קיימת
                    </div>
                    <div style={{ fontFamily: ASSIST, fontSize: 12, color: 'rgba(237,224,196,0.5)', marginTop: 2 }}>
                      {`עדכן את "${activeTemplate.titleHe}"`}
                    </div>
                  </div>
                </div>

                <div
                  className={`satm-radio${saveMode === 'new' ? ' active' : ''}`}
                  onClick={() => setSaveMode('new')}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', marginTop: 1, flexShrink: 0,
                    border: `2px solid ${saveMode === 'new' ? GOLD : 'rgba(245,200,64,0.3)'}`,
                    background: saveMode === 'new' ? GOLD : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {saveMode === 'new' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: FOREST }} />}
                  </div>
                  <div style={{ fontFamily: FRANK, fontSize: 13, fontWeight: 700, color: PARCH }}>
                    שמור כתבנית חדשה
                  </div>
                </div>
              </div>
            )}

            {/* 2. אייקון + קטגוריה */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: '0 0 72px' }}>
                <label style={lbl}>אייקון</label>
                <input className="satm-input" value={icon} onChange={e => setIcon(e.target.value)}
                  maxLength={4} style={{ fontSize: 22, textAlign: 'center', padding: '5px 4px', direction: 'ltr' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>קטגוריה</label>
                <select className="satm-select" value={categoryHe} onChange={e => handleCategoryChange(e.target.value)}>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <option key={cat.he} value={cat.he}>{isHe ? cat.he : cat.en}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. שם התבנית (עברית) */}
            <div>
              <label style={lbl}>שם התבנית (עברית)</label>
              <input className="satm-input" placeholder="שם בעברית" value={titleHe}
                onChange={e => setTitleHe(e.target.value)} />
            </div>

            {/* 4. שם התבנית (אנגלית) */}
            <div>
              <label style={lbl}>שם התבנית (אנגלית)</label>
              <input className="satm-input satm-input-ltr" placeholder="Template name" value={titleEn}
                onChange={e => setTitleEn(e.target.value)} />
            </div>

            {/* 5. תיאור (עברית) */}
            <div>
              <label style={lbl}>תיאור (עברית)</label>
              <textarea className="satm-textarea" placeholder="תיאור קצר..." value={descHe}
                onChange={e => setDescHe(e.target.value)} rows={2} />
            </div>

            {/* 6. תיאור (אנגלית) */}
            <div>
              <label style={lbl}>תיאור (אנגלית)</label>
              <textarea className="satm-textarea satm-textarea-ltr" placeholder="Short description..." value={descEn}
                onChange={e => setDescEn(e.target.value)} rows={2} />
            </div>

            {/* 7. מספר אלמנטים */}
            <div style={{ fontFamily: ASSIST, fontSize: 12, color: 'rgba(237,224,196,0.4)', textAlign: 'right' }}>
              {mapObjects.length} אלמנטים יישמרו בתבנית
            </div>
          </div>

          {/* Footer — ביטול right, שמור left (RTL) */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-start',
            padding: '14px 22px',
            borderTop: '1px solid rgba(245,200,64,0.1)',
            flexShrink: 0,
          }}>
            {/* שמור is flex-start = right in RTL visually, but we want it prominent */}
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              style={{
                fontFamily: FRANK, fontSize: 14, fontWeight: 700,
                padding: '9px 26px', borderRadius: 7,
                cursor: canSave && !isSaving ? 'pointer' : 'not-allowed',
                background: canSave ? GOLD : 'rgba(245,200,64,0.2)',
                border: 'none',
                color: canSave ? FOREST : 'rgba(237,224,196,0.3)',
                opacity: canSave && !isSaving ? 1 : 0.6,
              }}
            >
              {isSaving ? 'שומר...' : 'שמור 💾'}
            </button>
            <button
              onClick={onClose}
              style={{
                fontFamily: ASSIST, fontSize: 14, fontWeight: 500,
                padding: '9px 22px', borderRadius: 7, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(245,200,64,0.25)',
                color: 'rgba(237,224,196,0.6)',
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
