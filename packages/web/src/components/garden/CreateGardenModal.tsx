import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useGardenSwitcherStore } from '../../stores/gardenSwitcherStore';
import type { Garden } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';
import { EN_HEADING } from '../../styles/fonts';
import { LocationPicker, type PickedLocation } from './LocationPicker';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (gardenId: string) => void;
}

type GardenWithCoords = Garden & { latitude: number; longitude: number };

function hasCoords(g: Garden | null | undefined): g is GardenWithCoords {
  return g?.latitude != null && g?.longitude != null;
}

/** Garden offered as "Same place as …": the active one if located, else the oldest located one. */
function sameAsCandidate(gardens: Garden[], activeId: string | null): GardenWithCoords | null {
  const active = gardens.find(g => g.id === activeId);
  if (hasCoords(active)) return active;
  return [...gardens]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .find(hasCoords) ?? null;
}

export function CreateGardenModal({ isOpen, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation('garden');
  const { dir } = useDirection();
  const { gardens, activeGardenId, createGarden, switchGarden } = useGardenSwitcherStore();
  const { show: showToast } = useToastStore();

  const [name, setName] = useState('');
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [pickedSameAs, setPickedSameAs] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const sameAs = sameAsCandidate(gardens, activeGardenId);

  function selectSameAs(g: GardenWithCoords) {
    const lat = Number(g.latitude);
    const lon = Number(g.longitude);
    setPicked({
      latitude: lat,
      longitude: lon,
      timezone: g.timezone,
      // Null lets the server name the place by reverse geocoding, as for GPS picks.
      locationName: g.location_name,
      label: g.location_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    });
    setPickedSameAs(true);
  }

  function selectFromPicker(loc: PickedLocation) {
    setPicked(loc);
    setPickedSameAs(false);
  }

  function reset() {
    setName(''); setPicked(null); setPickedSameAs(false); setDescription(''); setError('');
  }

  function close() {
    if (isSubmitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t('createGardenModal.nameRequired')); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const garden = await createGarden({
        name:        name.trim(),
        description: description.trim() || undefined,
        ...(picked && {
          latitude:     picked.latitude,
          longitude:    picked.longitude,
          timezone:     picked.timezone,
          locationName: picked.locationName,
        }),
      });
      // Await full switch (resets + reloads map/trackers) before closing. The
      // POST response already carries the server-resolved coordinates, timezone
      // and place name, so the calendar, moon and Chupchu use them right away.
      await switchGarden(garden.id);
      showToast(t('createGardenModal.createdToast', { name: garden.name }), 'success');
      reset();
      onCreated?.(garden.id);
      onClose();
      navigate('/gardens');
    } catch (err: any) {
      setError(err.message || t('createGardenModal.createError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    boxSizing:       'border-box',
    backgroundColor: 'rgba(9,20,16,0.85)',
    border:          '1px solid rgba(0,229,195,0.2)',
    borderRadius:    '6px',
    padding:         '10px 12px',
    fontFamily:      EN_HEADING,
    fontSize:        '14px',
    color:           TEXT_MID,
    outline:         'none',
  };

  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontFamily:   EN_HEADING,
    fontSize:     '13px',
    color:        `${TEXT_MID}BB`,
    marginBottom: '6px',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-garden-title"
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          600,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter:  'blur(6px)',
        padding:         '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        dir={dir}
        style={{
          backgroundColor: NIGHT_CARD,
          border:          '1px solid rgba(0,229,195,0.2)',
          borderRadius:    '14px',
          padding:         '28px 24px',
          width:           '100%',
          maxWidth:        '420px',
          maxHeight:       'calc(100vh - 32px)',
          overflowY:       'auto',
          boxSizing:       'border-box',
          boxShadow:       '0 20px 70px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 id="create-garden-title" style={{ fontFamily: FRANK, fontSize: '20px', color: BIO_CYAN, margin: 0 }}>
            {t('createGardenModal.title')} 🌿
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            aria-label={t('createGardenModal.close')}
            style={{
              background: 'none',
              border:     'none',
              color:      `${TEXT_MID}50`,
              cursor:     'pointer',
              fontSize:   '20px',
              padding:    '4px',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="create-garden-name" style={labelStyle}>{t('createGardenModal.nameLabel')} *</label>
            <input
              id="create-garden-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('createGardenModal.namePlaceholder')}
              dir="auto"
              style={inputStyle}
              autoFocus
              required
            />
          </div>

          {/* Location (optional) — drives weather, moon, calendar and Chupchu */}
          <div style={{ marginBottom: '16px' }}>
            <span style={labelStyle}>📍 {t('createGardenModal.locationLabel')}</span>

            {sameAs && (
              <button
                type="button"
                onClick={() => selectSameAs(sameAs)}
                aria-pressed={pickedSameAs}
                style={{
                  display:         'block',
                  width:           '100%',
                  boxSizing:       'border-box',
                  textAlign:       'start',
                  marginBottom:    '12px',
                  padding:         '10px 12px',
                  backgroundColor: pickedSameAs ? 'rgba(0,229,195,0.12)' : 'transparent',
                  color:           BIO_CYAN,
                  border:          `1px solid ${pickedSameAs ? BIO_CYAN : 'rgba(0,229,195,0.25)'}`,
                  borderRadius:    '8px',
                  fontFamily:      EN_HEADING,
                  fontSize:        '14px',
                  fontWeight:      600,
                  cursor:          'pointer',
                }}
              >
                {pickedSameAs ? '✓ ' : '🏡 '}
                {t('createGardenModal.sameAs', { name: sameAs.name })}
                {sameAs.location_name && (
                  <span dir="auto" style={{ display: 'block', marginTop: '2px', fontSize: '12px', fontWeight: 400, color: `${TEXT_MID}99` }}>
                    {sameAs.location_name}
                  </span>
                )}
              </button>
            )}

            <LocationPicker value={picked} onSelect={selectFromPicker} variant="dark" />

            {!picked && (
              <p style={{ margin: '8px 0 0', fontFamily: EN_HEADING, fontSize: '11px', color: `${TEXT_MID}80`, lineHeight: 1.5 }}>
                {t('createGardenModal.locationLaterHint')}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="create-garden-description" style={labelStyle}>{t('createGardenModal.descriptionLabel')}</label>
            <textarea
              id="create-garden-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('createGardenModal.descriptionPlaceholder')}
              rows={3}
              dir="auto"
              style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
            />
          </div>

          {error && (
            <p role="alert" style={{
              fontFamily:   EN_HEADING,
              fontSize:     '13px',
              color:        '#e06060',
              marginBottom: '16px',
              textAlign:    'start',
            }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={close}
              disabled={isSubmitting}
              style={{
                flex:        1,
                padding:     '12px',
                background:  'transparent',
                color:       `${TEXT_MID}80`,
                border:      '1px solid rgba(0,229,195,0.2)',
                borderRadius:'8px',
                fontFamily:  EN_HEADING,
                fontSize:    '14px',
                cursor:      'pointer',
              }}
            >
              {t('createGardenModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              style={{
                flex:            2,
                padding:         '12px',
                backgroundColor: isSubmitting || !name.trim() ? 'rgba(0,229,195,0.35)' : BIO_CYAN,
                color:           '#050d0a',
                border:          'none',
                borderRadius:    '8px',
                fontFamily:      FRANK,
                fontSize:        '15px',
                fontWeight:      700,
                cursor:          isSubmitting || !name.trim() ? 'not-allowed' : 'pointer',
                transition:      'filter 0.2s',
              }}
              onMouseEnter={e => { if (!isSubmitting && name.trim()) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {isSubmitting ? t('createGardenModal.submitting') : `${t('createGardenModal.submit')} 🌿`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
