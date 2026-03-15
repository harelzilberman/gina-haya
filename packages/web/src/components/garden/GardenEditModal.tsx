import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Garden } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  garden:  Garden;
  onClose: () => void;
}

const EARTH  = '#142B16';
const SOIL   = '#1C3A1E';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const SOIL_TYPES = ['clay', 'sandy', 'loam', 'chalky', 'silty', 'peaty', 'mixed'];

const MODAL_CSS = `
@keyframes garden-modal-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.garden-modal-card { animation: garden-modal-in 0.2s ease-out both; }
.garden-input::placeholder { color: rgba(237,224,196,0.3); }
.garden-input:focus {
  border-color: rgba(245,200,64,0.4) !important;
  outline: none;
  box-shadow: 0 0 0 2px rgba(245,200,64,0.06);
}
.garden-select option { background-color: #1C3A1E; color: #EDE0C4; }
`;

export function GardenEditModal({ garden, onClose }: Props) {
  const { t } = useTranslation('garden');
  const { updateGarden } = useGardenStore();
  const { show: showToast } = useToastStore();

  const [name,     setName]     = useState(garden.name);
  const [location, setLocation] = useState(garden.location_region ?? '');
  const [soilType, setSoilType] = useState(garden.soil_type ?? '');
  const [notes,    setNotes]    = useState(garden.notes ?? '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await updateGarden(garden.id, {
        name:           name.trim(),
        locationRegion: location.trim() || null,
        soilType:       soilType || null,
        notes:          notes.trim() || null,
      });
      showToast(t('savedSuccess'), 'success');
      onClose();
    } catch {
      showToast(t('saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    boxSizing:       'border-box',
    backgroundColor: 'rgba(20,43,22,0.8)',
    border:          '1px solid rgba(125,192,132,0.2)',
    borderRadius:    '8px',
    padding:         '11px 14px',
    fontFamily:      ASSIST,
    fontSize:        '14px',
    color:           PARCH,
    transition:      'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontFamily:   ASSIST,
    fontWeight:   400,
    fontSize:     '13px',
    color:        `${PARCH}70`,
    marginBottom: '6px',
  };

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Backdrop */}
      <div
        onClick={handleBackdrop}
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          1000,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '16px',
        }}
      >
        <div
          className="garden-modal-card"
          style={{
            position:        'relative',
            width:           '100%',
            maxWidth:        '448px',
            backgroundColor: SOIL,
            border:          '1px solid rgba(245,200,64,0.2)',
            borderRadius:    '16px',
            padding:         '32px',
            maxHeight:       '90vh',
            overflowY:       'auto',
          }}
        >
          {/* Close button — top-LEFT (RTL) */}
          <button
            onClick={onClose}
            aria-label={t('cancel')}
            style={{
              position:        'absolute',
              top:             '16px',
              left:            '16px',
              width:           '32px',
              height:          '32px',
              borderRadius:    '50%',
              backgroundColor: 'rgba(245,200,64,0.1)',
              border:          '1px solid rgba(245,200,64,0.25)',
              color:           GOLD,
              fontSize:        '18px',
              cursor:          'pointer',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              transition:      'background-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.1)'; }}
          >
            ×
          </button>

          {/* Title */}
          <h2 style={{
            fontFamily:   FRANK,
            fontWeight:   700,
            fontSize:     '20px',
            color:        GOLD,
            margin:       '0 0 24px',
            paddingInlineStart: '4px',
          }}>
            {t('editGarden')}
          </h2>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Name */}
            <div>
              <label style={labelStyle}>{t('gardenName')}</label>
              <input
                className="garden-input"
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('gardenName')}
              />
            </div>

            {/* Location */}
            <div>
              <label style={labelStyle}>{t('location')}</label>
              <input
                className="garden-input"
                style={inputStyle}
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={t('location')}
              />
            </div>

            {/* Soil type */}
            <div>
              <label style={labelStyle}>{t('soilType.label')}</label>
              <select
                className="garden-input garden-select"
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={soilType}
                onChange={e => setSoilType(e.target.value)}
              >
                <option value="">—</option>
                {SOIL_TYPES.map(st => (
                  <option key={st} value={st}>
                    {t(`soilType.${st}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>{t('notes')}</label>
              <textarea
                className="garden-input"
                style={{ ...inputStyle, resize: 'none' }}
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('notes')}
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={onClose}
              style={{
                flex:            1,
                padding:         '11px',
                borderRadius:    '8px',
                border:          '1px solid rgba(125,192,132,0.2)',
                backgroundColor: 'transparent',
                fontFamily:      ASSIST,
                fontSize:        '14px',
                color:           `${PARCH}77`,
                cursor:          'pointer',
                transition:      'background-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              style={{
                flex:            1,
                padding:         '11px',
                borderRadius:    '8px',
                border:          'none',
                backgroundColor: GOLD,
                fontFamily:      FRANK,
                fontWeight:      600,
                fontSize:        '14px',
                color:           EARTH,
                cursor:          !name.trim() || saving ? 'default' : 'pointer',
                opacity:         !name.trim() || saving ? 0.6 : 1,
                transition:      'filter 0.15s, opacity 0.15s',
              }}
              onMouseEnter={e => { if (name.trim() && !saving) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {saving ? '...' : t('save')}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
