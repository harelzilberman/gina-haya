import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GARDEN_TEMPLATES, mergeWithOverrides, type GardenTemplate, type TemplateOverride } from '../../data/gardenTemplates';
import { api } from '../../api/client';

const GOLD    = '#F5C840';
const FOREST  = '#142B16';
const PARCH   = '#EDE0C4';
const ASSIST  = '"Assistant", "Heebo", sans-serif';
const FRANK   = '"Frank Ruhl Libre", Georgia, serif';

const MODAL_CSS = `
.gtm-card { transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s; }
.gtm-card:hover { border-color: rgba(245,200,64,0.4) !important; background-color: rgba(245,200,64,0.06) !important; }
.gtm-tab { transition: color 0.15s, border-color 0.15s, background-color 0.15s; }
.gtm-tab:hover { color: ${GOLD} !important; }
.gtm-scroll::-webkit-scrollbar { width: 4px; }
.gtm-scroll::-webkit-scrollbar-thumb { background: rgba(245,200,64,0.2); border-radius: 2px; }
`;

interface Props {
  isOpen: boolean;
  hasExistingElements: boolean;
  onApply: (template: GardenTemplate) => void;
  onClose: () => void;
}

export function GardenTemplatesModal({ isOpen, hasExistingElements, onApply, onClose }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  const [templates, setTemplates] = useState<GardenTemplate[]>(GARDEN_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState(GARDEN_TEMPLATES[0]?.category.he ?? '');
  const [selectedTemplate, setSelectedTemplate] = useState<GardenTemplate | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch overrides once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    api.get<TemplateOverride[]>('/api/templates')
      .then(overrides => {
        const merged = mergeWithOverrides(overrides);
        setTemplates(merged);
        if (merged.length > 0 && !merged.find(t => t.category.he === selectedCategory)) {
          setSelectedCategory(merged[0].category.he);
        }
      })
      .catch(() => { /* keep static data on error */ });
  }, [isOpen]);

  if (!isOpen) return null;

  // Derive categories from merged list
  const categories = Array.from(
    new Map(templates.map(t => [t.category.he, t.category])).values()
  );
  if (!categories.find(c => c.he === selectedCategory) && categories.length > 0) {
    // reset to first if current category disappeared
  }
  const visibleTemplates = templates.filter(t => t.category.he === selectedCategory);

  function handleApplyClick() {
    if (!selectedTemplate) return;
    if (hasExistingElements) {
      setShowConfirm(true);
    } else {
      onApply(selectedTemplate);
    }
  }

  function handleConfirm() {
    if (!selectedTemplate) return;
    setShowConfirm(false);
    onApply(selectedTemplate);
  }

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Modal */}
        <div
          dir={isHe ? 'rtl' : 'ltr'}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '760px',
            maxHeight: '90dvh',
            background: 'linear-gradient(180deg, #1a3a1c 0%, #142B16 100%)',
            border: '1px solid rgba(245,200,64,0.2)',
            borderRadius: '16px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Confirm overlay */}
          {showConfirm && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(10,24,11,0.93)',
              zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '16px',
            }}>
              <div style={{
                background: '#1a3a1c',
                border: '1px solid rgba(245,200,64,0.3)',
                borderRadius: '12px',
                padding: '28px 32px',
                maxWidth: '360px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
                <p style={{
                  fontFamily: FRANK, fontSize: '17px', color: PARCH,
                  lineHeight: 1.6, margin: '0 0 24px',
                }}>
                  {isHe
                    ? 'החלפת תבנית תמחק את הגינה הנוכחית. להמשיך?'
                    : 'Replacing the template will clear your current garden. Continue?'}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowConfirm(false)}
                    style={{
                      fontFamily: ASSIST, fontSize: '14px', fontWeight: 600,
                      padding: '9px 22px', borderRadius: '7px', cursor: 'pointer',
                      background: 'transparent',
                      border: '1px solid rgba(245,200,64,0.3)',
                      color: 'rgba(237,224,196,0.7)',
                    }}
                  >
                    {isHe ? 'ביטול' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{
                      fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                      padding: '9px 22px', borderRadius: '7px', cursor: 'pointer',
                      background: '#c0392b',
                      border: '1px solid #e74c3c',
                      color: '#fff',
                    }}
                  >
                    {isHe ? 'אשר והחל' : 'Confirm & Apply'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(245,200,64,0.12)',
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{
                fontFamily: FRANK, fontSize: '20px', fontWeight: 700,
                color: GOLD, margin: 0, lineHeight: 1.2,
              }}>
                🗺️ {isHe ? 'בחר תבנית לגינה שלך' : 'Choose a garden template'}
              </h2>
              <p style={{
                fontFamily: ASSIST, fontSize: '13px', color: 'rgba(237,224,196,0.5)',
                margin: '4px 0 0',
              }}>
                {isHe
                  ? `${templates.length} תבניות מוכנות`
                  : `${templates.length} ready-made templates`}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '1px solid rgba(245,200,64,0.2)',
                background: 'transparent', color: 'rgba(237,224,196,0.6)',
                cursor: 'pointer', fontSize: '16px', fontFamily: ASSIST,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Category tabs */}
          <div style={{
            display: 'flex', gap: '4px', padding: '12px 24px 0',
            overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' as any,
          }}>
            {categories.map(cat => {
              const active = selectedCategory === cat.he;
              return (
                <button
                  key={cat.he}
                  className="gtm-tab"
                  onClick={() => { setSelectedCategory(cat.he); setSelectedTemplate(null); }}
                  style={{
                    fontFamily: ASSIST, fontSize: '13px', fontWeight: active ? 700 : 400,
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    border: `1px solid ${active ? GOLD : 'rgba(245,200,64,0.2)'}`,
                    color: active ? GOLD : 'rgba(237,224,196,0.55)',
                    background: active ? 'rgba(245,200,64,0.1)' : 'transparent',
                  }}
                >
                  {isHe ? cat.he : cat.en}
                </button>
              );
            })}
          </div>

          {/* Template grid */}
          <div
            className="gtm-scroll"
            style={{
              flex: 1, overflowY: 'auto', padding: '16px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
              alignContent: 'start',
            }}
          >
            {visibleTemplates.map(tpl => {
              const selected = selectedTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className="gtm-card"
                  onClick={() => setSelectedTemplate(tpl)}
                  style={{
                    borderRadius: '10px',
                    border: `1.5px solid ${selected ? GOLD : 'rgba(245,200,64,0.15)'}`,
                    background: selected ? 'rgba(245,200,64,0.08)' : 'rgba(255,255,255,0.02)',
                    padding: '14px',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    boxShadow: selected ? `0 0 0 1px ${GOLD}33` : 'none',
                  }}
                >
                  <div style={{ fontSize: '28px', lineHeight: 1 }}>{tpl.icon}</div>
                  <div style={{
                    fontFamily: FRANK, fontSize: '14px', fontWeight: 700, color: PARCH,
                    lineHeight: 1.3,
                  }}>
                    {isHe ? tpl.title.he : tpl.title.en}
                  </div>
                  <div style={{
                    fontFamily: ASSIST, fontSize: '12px',
                    color: 'rgba(237,224,196,0.5)', lineHeight: 1.4,
                  }}>
                    {isHe ? tpl.description.he : tpl.description.en}
                  </div>
                  <div style={{
                    fontFamily: ASSIST, fontSize: '11px',
                    color: 'rgba(237,224,196,0.3)', marginTop: '2px',
                  }}>
                    {tpl.elements.length} {isHe ? 'אלמנטים' : 'elements'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            padding: '14px 24px',
            borderTop: '1px solid rgba(245,200,64,0.1)',
            flexShrink: 0,
          }}>
            {selectedTemplate && (
              <span style={{
                fontFamily: ASSIST, fontSize: '13px',
                color: 'rgba(237,224,196,0.5)',
                alignSelf: 'center',
                marginInlineEnd: 'auto',
              }}>
                {isHe ? `נבחר: ${selectedTemplate.title.he}` : `Selected: ${selectedTemplate.title.en}`}
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                fontFamily: ASSIST, fontSize: '14px', fontWeight: 500,
                padding: '9px 22px', borderRadius: '7px', cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(245,200,64,0.25)',
                color: 'rgba(237,224,196,0.6)',
              }}
            >
              {isHe ? 'ביטול' : 'Cancel'}
            </button>
            <button
              onClick={handleApplyClick}
              disabled={!selectedTemplate}
              style={{
                fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                padding: '9px 24px', borderRadius: '7px', cursor: selectedTemplate ? 'pointer' : 'not-allowed',
                background: selectedTemplate ? GOLD : 'rgba(245,200,64,0.2)',
                border: 'none',
                color: selectedTemplate ? FOREST : 'rgba(237,224,196,0.3)',
                opacity: selectedTemplate ? 1 : 0.6,
              }}
            >
              {isHe ? '✓ החל תבנית' : '✓ Apply Template'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
