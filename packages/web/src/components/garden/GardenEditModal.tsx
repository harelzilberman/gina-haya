import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Garden } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  garden: Garden;
  onClose: () => void;
}

const SOIL_TYPES = ['clay', 'sandy', 'loam', 'chalky', 'silty', 'peaty', 'mixed'];

export function GardenEditModal({ garden, onClose }: Props) {
  const { t } = useTranslation('garden');
  const { updateGarden } = useGardenStore();
  const { show: showToast } = useToastStore();

  const [name, setName] = useState(garden.name);
  const [location, setLocation] = useState(garden.location_region ?? '');
  const [soilType, setSoilType] = useState(garden.soil_type ?? '');
  const [notes, setNotes] = useState(garden.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await updateGarden(garden.id, {
        name: name.trim(),
        locationRegion: location.trim() || null,
        soilType: soilType || null,
        notes: notes.trim() || null,
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

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-green-400';
  const inputStyle = { borderColor: 'rgba(0,0,0,0.12)', backgroundColor: '#FAFAFA', color: '#1B2A4A' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdrop}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-base font-bold" style={{ color: '#1B2A4A' }}>
            {t('editGarden')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            aria-label={t('cancel')}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 flex flex-col gap-3">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
              {t('gardenName')}
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('gardenName')}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
              {t('location')}
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t('location')}
            />
          </div>

          {/* Soil type */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
              {t('soilType.label')}
            </label>
            <select
              className={inputClass}
              style={inputStyle}
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
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
              {t('notes')}
            </label>
            <textarea
              className={inputClass}
              style={{ ...inputStyle, resize: 'none' }}
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('notes')}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 px-5 py-4"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity"
            style={{ backgroundColor: '#4A7C59', opacity: (!name.trim() || saving) ? 0.6 : 1 }}
          >
            {saving ? '...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
