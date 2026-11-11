import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGardenStore } from '../../stores/gardenStore';
import { useGardenSwitcherStore } from '../../stores/gardenSwitcherStore';
import { useToastStore } from '../../stores/toastStore';
import { EN_HEADING } from '../../styles/fonts';

// ── Garden place name: display + inline edit ─────────────────────────────────
//
// Shows "📍 <place name>" with a pencil button. Editing saves via
// PATCH /api/garden/:id with { locationName } ONLY — the server changes just
// location_name, never coordinates or timezone. Saving an empty field resets
// the name to the automatic (reverse-geocoded) one.

/** Mirrors LOCATION_NAME_MAX in packages/api/src/services/geo.ts. */
const MAX_LEN = 80;

const ACCENT = '#00e5c3';
const TEXT   = '#b0cfbf';

interface Props {
  garden: {
    id: string;
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export function LocationNameEditor({ garden }: Props) {
  const { t } = useTranslation('garden');
  const updateGarden = useGardenStore(s => s.updateGarden);
  const { show: showToast } = useToastStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const hasCoords = garden.latitude != null && garden.longitude != null;
  const display = garden.location_name
    || (hasCoords
      ? `${Number(garden.latitude).toFixed(2)}, ${Number(garden.longitude).toFixed(2)}`
      : t('locationPicker.notSet'));

  function startEdit() {
    setDraft(garden.location_name ?? '');
    setEditing(true);
  }

  async function save() {
    if (saving) return;
    const value = draft.trim();
    if (value === (garden.location_name ?? '').trim() && value !== '') {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateGarden(garden.id, { locationName: value });
      // GardensPage reads the switcher store's copy of the list.
      useGardenSwitcherStore.setState(s => ({
        gardens: s.gardens.map(g => (g.id === garden.id ? { ...g, ...updated } : g)),
      }));
      showToast(t('locationName.savedToast'), 'success');
      setEditing(false);
    } catch {
      showToast(t('locationName.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <p
          style={{
            fontFamily: EN_HEADING, fontSize: '12px', color: `${TEXT}99`, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}
        >
          📍 {display}
        </p>
        {hasCoords && (
          <button
            type="button"
            onClick={startEdit}
            aria-label={t('locationName.edit')}
            title={t('locationName.edit')}
            style={{
              flexShrink: 0, background: 'transparent', border: 'none', padding: '2px 4px',
              color: ACCENT, cursor: 'pointer', fontSize: '13px', lineHeight: 1,
            }}
          >
            ✎
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); void save(); }}
      style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}
    >
      <label htmlFor={`location-name-${garden.id}`} style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${TEXT}99` }}>
        {t('locationName.label')}
      </label>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          id={`location-name-${garden.id}`}
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          autoFocus
          disabled={saving}
          placeholder={t('locationName.placeholder')}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
          style={{
            flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: '6px',
            border: `1px solid ${ACCENT}55`, background: 'rgba(0,0,0,0.25)',
            color: TEXT, fontFamily: EN_HEADING, fontSize: '13px',
          }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: '6px', border: 'none',
            background: ACCENT, color: '#050d0a', fontFamily: EN_HEADING, fontSize: '12px',
            fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? t('locationPicker.saving') : t('locationName.save')}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: '6px',
            border: `1px solid ${TEXT}33`, background: 'transparent', color: `${TEXT}AA`,
            fontFamily: EN_HEADING, fontSize: '12px', cursor: 'pointer',
          }}
        >
          {t('locationPicker.cancel')}
        </button>
      </div>
      <p style={{ margin: 0, fontFamily: EN_HEADING, fontSize: '11px', color: `${TEXT}66` }}>
        {t('locationName.hint')}
      </p>
    </form>
  );
}
