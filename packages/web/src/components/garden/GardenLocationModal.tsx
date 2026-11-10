import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useGardenStore } from '../../stores/gardenStore';
import { useGardenSwitcherStore } from '../../stores/gardenSwitcherStore';
import { useToastStore } from '../../stores/toastStore';
import { EN_HEADING } from '../../styles/fonts';
import { LocationPicker, type PickedLocation } from './LocationPicker';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const EARTH      = '#050d0a';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';

interface Props {
  gardenId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal wrapping LocationPicker that saves the chosen location to a garden
 * via PATCH /api/garden/:id and syncs both garden stores.
 */
export function GardenLocationModal({ gardenId, isOpen, onClose }: Props) {
  const { t } = useTranslation('garden');
  const { dir } = useDirection();
  const updateGarden = useGardenStore(s => s.updateGarden);
  const { show: showToast } = useToastStore();
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  function close() {
    setPicked(null);
    onClose();
  }

  async function handleSave() {
    if (!picked) return;
    setIsSaving(true);
    try {
      const updated = await updateGarden(gardenId, {
        latitude: picked.latitude,
        longitude: picked.longitude,
        timezone: picked.timezone,
        locationName: picked.locationName,
      });
      // GardensPage reads the switcher store's copy of the list.
      useGardenSwitcherStore.setState(s => ({
        gardens: s.gardens.map(g => (g.id === gardenId ? { ...g, ...updated } : g)),
      }));
      showToast(t('locationPicker.savedToast'), 'success');
      close();
    } catch {
      showToast(t('locationPicker.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="garden-location-title"
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: '16px',
      }}
    >
      <div
        dir={dir}
        style={{
          backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
          borderRadius: '14px', padding: '24px 20px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 20px 70px rgba(0,0,0,0.6)',
        }}
      >
        <h3
          id="garden-location-title"
          style={{ fontFamily: FRANK, fontSize: '20px', color: BIO_CYAN, margin: '0 0 16px', textAlign: 'center' }}
        >
          📍 {t('locationPicker.title')}
        </h3>

        <LocationPicker value={picked} onSelect={setPicked} variant="dark" autoFocus />

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={close}
            style={{
              flex: 1, padding: '10px',
              background: 'transparent', color: `${TEXT_MID}AA`,
              border: '1px solid rgba(176,207,191,0.2)', borderRadius: '8px',
              fontFamily: EN_HEADING, fontSize: '14px', cursor: 'pointer',
            }}
          >
            {t('locationPicker.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!picked || isSaving}
            style={{
              flex: 2, padding: '10px',
              backgroundColor: picked ? BIO_CYAN : 'rgba(0,229,195,0.25)', color: EARTH,
              border: 'none', borderRadius: '8px',
              fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
              cursor: !picked || isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? t('locationPicker.saving') : t('locationPicker.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
