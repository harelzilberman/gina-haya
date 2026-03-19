import { useState } from 'react';
import { useTrackerStore } from '../../stores/trackerStore';
import { useGardenStore } from '../../stores/gardenStore';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#4A7C59';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASST   = '"Assistant", "Heebo", sans-serif';

const LOCATION_TYPES = [
  { value: 'garden',     labelHe: 'גינה',   icon: '🌿' },
  { value: 'pot',        labelHe: 'עציץ',   icon: '🪴' },
  { value: 'balcony',    labelHe: 'מרפסת',  icon: '🏠' },
  { value: 'greenhouse', labelHe: 'חממה',   icon: '🏡' },
  { value: 'other',      labelHe: 'אחר',    icon: '📍' },
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function NewTrackerModal({ onClose, onCreated }: Props) {
  const { createTracker } = useTrackerStore();
  const { activeGarden } = useGardenStore();

  const [plantNameHe, setPlantNameHe] = useState('');
  const [plantNameEn, setPlantNameEn] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [locationType, setLocationType] = useState('garden');
  const [locationDescription, setLocationDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const gardenPlants = activeGarden?.garden_plants ?? [];

  function handlePlantSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      setSelectedPlantId('');
      setPlantNameHe('');
      setPlantNameEn('');
      return;
    }
    if (val === '__custom__') {
      setSelectedPlantId('__custom__');
      setPlantNameHe('');
      setPlantNameEn('');
      return;
    }
    const plant = gardenPlants.find(p => p.plant_id === val);
    if (plant) {
      setSelectedPlantId(val);
      setPlantNameHe(plant.common_name_he);
      setPlantNameEn(plant.common_name_en);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plantNameHe.trim() || !plantNameEn.trim()) {
      setError('יש להזין שם צמח בעברית ובאנגלית');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await createTracker({
        plantNameHe: plantNameHe.trim(),
        plantNameEn: plantNameEn.trim(),
        plantId: selectedPlantId && selectedPlantId !== '__custom__' ? selectedPlantId : undefined,
        gardenId: activeGarden?.id,
        locationType,
        locationDescription: locationDescription.trim() || undefined,
      });
      onCreated();
    } catch (err: any) {
      if (err.message === 'limit_exceeded') {
        setError('הגעת למגבלת המעקבים בתכנית שלך. שדרג לגישה לעוד מעקבים.');
      } else {
        setError(err.message || 'שגיאה ביצירת המעקב');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(245,200,64,0.25)',
    borderRadius: '6px',
    padding: '10px 12px',
    fontFamily: ASST,
    fontSize: '14px',
    color: PARCH,
    outline: 'none',
    direction: 'rtl',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: ASST,
    fontSize: '13px',
    color: 'rgba(237,224,196,0.7)',
    marginBottom: '6px',
    textAlign: 'right',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#1a3a1c',
          border: '1px solid rgba(245,200,64,0.2)',
          borderRadius: '12px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          direction: 'rtl',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0 }}>
            צמח חדש למעקב
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(237,224,196,0.5)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Plant selector */}
          {gardenPlants.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>בחר מהגינה שלך</label>
              <select
                value={selectedPlantId}
                onChange={handlePlantSelect}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">-- בחר צמח מהגינה --</option>
                {gardenPlants.map(p => (
                  <option key={p.plant_id} value={p.plant_id}>
                    {p.common_name_he} ({p.common_name_en})
                  </option>
                ))}
                <option value="__custom__">+ הזן צמח אחר</option>
              </select>
            </div>
          )}

          {/* Hebrew name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>שם הצמח בעברית *</label>
            <input
              type="text"
              value={plantNameHe}
              onChange={e => setPlantNameHe(e.target.value)}
              placeholder="לדוגמה: עגבנייה, בזיליקום, לימון..."
              style={inputStyle}
              required
            />
          </div>

          {/* English name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Plant name in English *</label>
            <input
              type="text"
              value={plantNameEn}
              onChange={e => setPlantNameEn(e.target.value)}
              placeholder="e.g. Tomato, Basil, Lemon..."
              style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
              required
            />
          </div>

          {/* Location type pills */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>סוג מיקום</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
              {LOCATION_TYPES.map(loc => (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setLocationType(loc.value)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '20px',
                    border: `1px solid ${locationType === loc.value ? GOLD : 'rgba(245,200,64,0.25)'}`,
                    backgroundColor: locationType === loc.value ? 'rgba(245,200,64,0.15)' : 'transparent',
                    color: locationType === loc.value ? GOLD : 'rgba(237,224,196,0.7)',
                    fontFamily: ASST,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {loc.icon} {loc.labelHe}
                </button>
              ))}
            </div>
          </div>

          {/* Location description */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>תיאור מיקום (אופציונלי)</label>
            <input
              type="text"
              value={locationDescription}
              onChange={e => setLocationDescription(e.target.value)}
              placeholder="לדוגמה: מרפסת דרומית, עציץ 30 ס״מ, ליד הגדר..."
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontFamily: ASST, fontSize: '13px', color: '#e06060', textAlign: 'right', marginBottom: '16px' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isSubmitting ? 'rgba(245,200,64,0.4)' : GOLD,
              color: EARTH,
              border: 'none',
              borderRadius: '8px',
              fontFamily: FRANK,
              fontSize: '16px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {isSubmitting ? 'יוצר מעקב...' : 'התחל מעקב 🌱'}
          </button>
        </form>
      </div>
    </div>
  );
}
