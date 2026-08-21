import { useState, useRef } from 'react';
import { useTrackerStore, type CheckinResult } from '../../stores/trackerStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { MAX_PHOTO_SIZE_BYTES, MAX_PHOTO_SIZE_LABEL } from '@gina-haya/shared';
import { UpgradeModal } from '../upgrade/UpgradeModal';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const LOCATION_TYPES = [
  { value: 'garden',     labelHe: 'גינה',   icon: '🌿' },
  { value: 'pot',        labelHe: 'עציץ',   icon: '🪴' },
  { value: 'balcony',    labelHe: 'מרפסת',  icon: '🏠' },
  { value: 'greenhouse', labelHe: 'חממה',   icon: '🏡' },
  { value: 'other',      labelHe: 'אחר',    icon: '📍' },
];

const UNKNOWN_PLANT_RE = /^\s*(don'?t know|לא יודע|unknown|לא ידוע|אין מושג|לא זוהה|)\s*$/i;

interface Props {
  onClose:        () => void;
  onCreated:      (result: CheckinResult, wasAutoIdentified: boolean) => void;
  gardenPlantId?: string;
}

export function NewTrackerModal({ onClose, onCreated, gardenPlantId }: Props) {
  const { createTracker, addCheckin } = useTrackerStore();
  const { activeGarden }              = useGardenStore();
  const { profile }                   = useAuthStore();
  const { show: showToast }           = useToastStore();

  const [plantNameHe,          setPlantNameHe]          = useState('');
  const [plantNameEn,          setPlantNameEn]          = useState('');
  const [selectedPlantId,      setSelectedPlantId]      = useState('');
  const [locationType,         setLocationType]         = useState('garden');
  const [locationDescription,  setLocationDescription]  = useState('');
  const [notes,                setNotes]                = useState('');
  const [imageFile,            setImageFile]            = useState<File | null>(null);
  const [imagePreview,         setImagePreview]         = useState<string | null>(null);
  const [isSubmitting,         setIsSubmitting]         = useState(false);
  const [isAnalyzing,          setIsAnalyzing]          = useState(false);
  const [error,                setError]                = useState('');
  const [upgradeOpen,          setUpgradeOpen]          = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gardenPlants = activeGarden?.garden_plants ?? [];

  function handlePlantSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      setSelectedPlantId(''); setPlantNameHe(''); setPlantNameEn('');
      return;
    }
    if (val === '__custom__') {
      setSelectedPlantId('__custom__'); setPlantNameHe(''); setPlantNameEn('');
      return;
    }
    const plant = gardenPlants.find(p => p.plant_id === val);
    if (plant) {
      setSelectedPlantId(val);
      setPlantNameHe(plant.common_name_he);
      setPlantNameEn(plant.common_name_en ?? '');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError(`התמונה גדולה מדי. אנא בחר תמונה קטנה מ-${MAX_PHOTO_SIZE_LABEL}`);
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
    if (!imageFile) { setError('יש להעלות תמונה של הצמח'); return; }

    const isUnknownHe      = UNKNOWN_PLANT_RE.test(plantNameHe);
    const isUnknownEn      = UNKNOWN_PLANT_RE.test(plantNameEn);
    const wasAutoIdentified = isUnknownHe || isUnknownEn;

    if (!wasAutoIdentified && (!plantNameHe.trim() || !plantNameEn.trim())) {
      setError('יש להזין שם צמח בעברית ובאנגלית, או להשאיר ריק לזיהוי אוטומטי');
      return;
    }

    const resolvedNameHe = wasAutoIdentified ? 'לא ידוע' : plantNameHe.trim();
    const resolvedNameEn = wasAutoIdentified ? 'Unknown'  : plantNameEn.trim();

    setIsSubmitting(true);
    setError('');

    try {
      const tracker = await createTracker({
        plantNameHe: resolvedNameHe,
        plantNameEn: resolvedNameEn,
        plantId:       selectedPlantId && selectedPlantId !== '__custom__' ? selectedPlantId : undefined,
        gardenId:      activeGarden?.id,
        gardenPlantId: gardenPlantId,
        locationType,
        locationDescription: locationDescription.trim() || undefined,
      });

      setIsAnalyzing(true);
      const base64   = imagePreview!.split(',')[1];
      const mimeType = imageFile.type;
      const result   = await addCheckin(tracker.id, base64, mimeType, notes.trim() || undefined);
      if (result.used_credit) {
        showToast('השתמשת במגבלה החודשית — משתמש בקרדיט שרכשת 🔬', 'info');
      }
      onCreated(result, wasAutoIdentified);
    } catch (err: any) {
      if (err.errorCode === 'tracker_limit_reached' || err.message === 'limit_exceeded') {
        setUpgradeOpen(true);
      } else {
        setError(err.message || 'משהו השתבש, נסה שוב');
      }
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    backgroundColor: 'rgba(9,20,16,0.85)',
    border:          '1px solid rgba(0,229,195,0.2)',
    borderRadius:    '6px',
    padding:         '10px 12px',
    fontFamily:      DM_SANS,
    fontSize:        '14px',
    color:           TEXT_MID,
    outline:         'none',
    direction:       'rtl',
    boxSizing:       'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontFamily:   DM_SANS,
    fontSize:     '13px',
    color:        `${TEXT_MID}70`,
    marginBottom: '6px',
    textAlign:    'right',
  };

  const isLoading = isSubmitting || isAnalyzing;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          200,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter:  'blur(4px)',
        padding:         '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div
        style={{
          backgroundColor: NIGHT_CARD,
          border:          '1px solid rgba(0,229,195,0.2)',
          borderRadius:    '12px',
          padding:         '28px 24px',
          width:           '100%',
          maxWidth:        '440px',
          maxHeight:       '90vh',
          overflowY:       'auto',
          direction:       'rtl',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: BIO_CYAN, margin: 0 }}>
            צמח חדש למעקב
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '20px', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Loading overlay */}
        {isAnalyzing && (
          <div style={{
            textAlign:       'center',
            padding:         '24px 0',
            backgroundColor: 'rgba(9,20,16,0.8)',
            borderRadius:    '8px',
            marginBottom:    '16px',
          }}>
            <div style={{ fontSize: '48px', animation: 'pulse 1.5s ease-in-out infinite' }}>🌱</div>
            <p style={{ fontFamily: FRANK, fontSize: '18px', color: BIO_CYAN, margin: '12px 0 4px' }}>
              צ'ופצ'ו בודק את הצמח שלך...
            </p>
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}60`, margin: 0 }}>
              זה לוקח כ-15 שניות
            </p>
          </div>
        )}

        {/* UpgradeModal rendered on top when limit hit */}
        <UpgradeModal
          isOpen={upgradeOpen}
          onClose={() => { setUpgradeOpen(false); onClose(); }}
          limitType="trackers"
          currentTier={profile?.subscription_tier ?? 'free'}
        />

        {!isAnalyzing && !upgradeOpen && (
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
                      {p.common_name_he}{p.common_name_en ? ` (${p.common_name_en})` : ''}
                    </option>
                  ))}
                  <option value="__custom__">+ הזן צמח אחר</option>
                </select>
              </div>
            )}

            {/* Hebrew name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>שם הצמח בעברית (השאר ריק לזיהוי אוטומטי)</label>
              <input
                type="text"
                value={plantNameHe}
                onChange={e => setPlantNameHe(e.target.value)}
                placeholder="למשל: עגבנייה, בזיליקום — או השאר ריק"
                style={inputStyle}
              />
            </div>

            {/* English name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Plant name in English (leave blank to auto-identify)</label>
              <input
                type="text"
                value={plantNameEn}
                onChange={e => setPlantNameEn(e.target.value)}
                placeholder="e.g. Tomato, Basil — or leave blank"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
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
                      padding:         '7px 14px',
                      borderRadius:    '20px',
                      border:          `1px solid ${locationType === loc.value ? BIO_CYAN : 'rgba(0,229,195,0.2)'}`,
                      backgroundColor: locationType === loc.value ? 'rgba(0,229,195,0.12)' : 'transparent',
                      color:           locationType === loc.value ? BIO_CYAN : `${TEXT_MID}70`,
                      fontFamily:      DM_SANS,
                      fontSize:        '13px',
                      cursor:          'pointer',
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
                    border:          '2px dashed rgba(0,229,195,0.3)',
                    borderRadius:    '10px',
                    padding:         '28px 16px',
                    textAlign:       'center',
                    cursor:          'pointer',
                    backgroundColor: 'rgba(0,229,195,0.02)',
                    transition:      'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,229,195,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,229,195,0.3)')}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📸</div>
                  <p style={{ fontFamily: FRANK, fontSize: '16px', color: BIO_CYAN, margin: '0 0 4px' }}>
                    צלם או העלה תמונה של הצמח
                  </p>
                  <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}50`, margin: 0 }}>
                    צ'ופצ'ו ינתח את הצמח ויבנה תכנית גידול מותאמת
                  </p>
                  <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}35`, margin: '6px 0 0' }}>
                    JPG, PNG, WEBP עד 8MB
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
                      position:        'absolute',
                      top:             '8px',
                      left:            '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      border:          'none',
                      borderRadius:    '50%',
                      width:           '28px',
                      height:          '28px',
                      color:           'white',
                      cursor:          'pointer',
                      fontSize:        '14px',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                    }}
                  >
                    ✕
                  </button>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position:        'absolute',
                      bottom:          '8px',
                      left:            '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius:    '6px',
                      padding:         '4px 10px',
                      color:           'rgba(255,255,255,0.8)',
                      fontFamily:      DM_SANS,
                      fontSize:        '12px',
                      cursor:          'pointer',
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
              <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: '#e06060', textAlign: 'right', marginBottom: '16px' }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width:           '100%',
                padding:         '13px',
                backgroundColor: isLoading ? 'rgba(0,229,195,0.35)' : BIO_CYAN,
                color:           '#050d0a',
                border:          'none',
                borderRadius:    '8px',
                fontFamily:      FRANK,
                fontSize:        '16px',
                fontWeight:      700,
                cursor:          isLoading ? 'not-allowed' : 'pointer',
                transition:      'filter 0.2s',
              }}
            >
              {isSubmitting ? 'יוצר מעקב...' : 'נתח עם צ\'ופצ\'ו 🌱'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
