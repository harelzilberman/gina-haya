import { useState, useRef } from 'react';
import { useTrackerStore } from '../../stores/trackerStore';
import { useGardenStore } from '../../stores/gardenStore';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
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
  onCreated: (trackerId?: string) => void;
}

export function NewTrackerModal({ onClose, onCreated }: Props) {
  const { createTracker, addCheckin } = useTrackerStore();
  const { activeGarden } = useGardenStore();

  const [plantNameHe, setPlantNameHe] = useState('');
  const [plantNameEn, setPlantNameEn] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [locationType, setLocationType] = useState('garden');
  const [locationDescription, setLocationDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('התמונה גדולה מדי — מקסימום 10MB');
      return;
    }
    setImageFile(file);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plantNameHe.trim() || !plantNameEn.trim()) {
      setError('יש להזין שם צמח בעברית ובאנגלית');
      return;
    }
    if (!imageFile) {
      setError('יש להעלות תמונה של הצמח');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Step 1: Create tracker
      const tracker = await createTracker({
        plantNameHe: plantNameHe.trim(),
        plantNameEn: plantNameEn.trim(),
        plantId: selectedPlantId && selectedPlantId !== '__custom__' ? selectedPlantId : undefined,
        gardenId: activeGarden?.id,
        locationType,
        locationDescription: locationDescription.trim() || undefined,
      });

      // Step 2: Analyze image
      setIsAnalyzing(true);
      const base64 = imagePreview!.split(',')[1];
      const mimeType = imageFile.type;
      await addCheckin(tracker.id, base64, mimeType, notes.trim() || undefined);

      onCreated(tracker.id);
    } catch (err: any) {
      if (err.message === 'limit_exceeded') {
        setError('הגעת למגבלת המעקבים בתכנית שלך. שדרג לגישה לעוד מעקבים.');
      } else {
        setError(err.message || 'משהו השתבש, נסה שוב');
      }
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
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

  const isLoading = isSubmitting || isAnalyzing;

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
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
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
            disabled={isLoading}
            style={{ background: 'none', border: 'none', color: 'rgba(237,224,196,0.5)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Loading overlay */}
        {isAnalyzing && (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            backgroundColor: 'rgba(20,43,22,0.8)',
            borderRadius: '8px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '48px', animation: 'pulse 1.5s ease-in-out infinite' }}>🌕</div>
            <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '12px 0 4px' }}>
              צ'אפצ'ו בודק את הצמח שלך...
            </p>
            <p style={{ fontFamily: ASST, fontSize: '13px', color: 'rgba(237,224,196,0.6)', margin: 0 }}>
              זה לוקח כ-15 שניות
            </p>
          </div>
        )}

        {!isAnalyzing && (
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
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>שם הצמח בעברית *</label>
              <input
                type="text"
                value={plantNameHe}
                onChange={e => setPlantNameHe(e.target.value)}
                placeholder="למשל: עגבנייה, בזיליקום, לימון..."
                style={inputStyle}
                required
              />
            </div>

            {/* English name */}
            <div style={{ marginBottom: '16px' }}>
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

            {/* Location type */}
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
                    }}
                  >
                    {loc.icon} {loc.labelHe}
                  </button>
                ))}
              </div>
            </div>

            {/* Location description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>תיאור מיקום (אופציונלי)</label>
              <input
                type="text"
                value={locationDescription}
                onChange={e => setLocationDescription(e.target.value)}
                placeholder="למשל: מרפסת דרומית, עציץ 30 ס״מ..."
                style={inputStyle}
              />
            </div>

            {/* Photo upload — REQUIRED */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>תמונה של הצמח *</label>

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(245,200,64,0.35)',
                    borderRadius: '10px',
                    padding: '28px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(245,200,64,0.03)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,200,64,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(245,200,64,0.35)')}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📸</div>
                  <p style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: '0 0 4px' }}>
                    צלם או העלה תמונה של הצמח
                  </p>
                  <p style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.5)', margin: 0 }}>
                    צ'אפצ'ו ינתח את הצמח ויבנה תכנית גידול מותאמת
                  </p>
                  <p style={{ fontFamily: ASST, fontSize: '11px', color: 'rgba(237,224,196,0.35)', margin: '6px 0 0' }}>
                    JPG, PNG, WEBP עד 10MB
                  </p>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
                  <img
                    src={imagePreview}
                    alt="plant preview"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{
                      position: 'absolute', top: '8px', left: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      border: 'none', borderRadius: '50%',
                      width: '28px', height: '28px',
                      color: 'white', cursor: 'pointer',
                      fontSize: '14px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: '8px', left: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: '6px', padding: '4px 10px',
                      color: 'rgba(255,255,255,0.8)',
                      fontFamily: ASST, fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    החלף תמונה
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>הערות (אופציונלי)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="למשל: שתלתי לפני שבועיים, יש כתמים על העלים..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
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
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '13px',
                backgroundColor: isLoading ? 'rgba(245,200,64,0.4)' : GOLD,
                color: EARTH,
                border: 'none',
                borderRadius: '8px',
                fontFamily: FRANK,
                fontSize: '16px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'filter 0.2s',
              }}
            >
              {isSubmitting ? 'יוצר מעקב...' : 'נתח עם צ\'אפצ\'ו 🌕'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
