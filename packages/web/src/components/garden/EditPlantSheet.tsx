import { useState } from 'react';
import type { GardenPlant } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';
import { LOCATION_TYPES, PlantingBase } from './PlantingBase';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PLANT_TYPES = [
  { value: 'annual',    labelHe: 'חד-שנתי' },
  { value: 'perennial', labelHe: 'רב-שנתי' },
  { value: 'tree',      labelHe: 'עץ' },
  { value: 'shrub',     labelHe: 'שיח' },
];

const SUN_EXPOSURES = ['שמש מלאה', 'חצי צל', 'צל'];

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  backgroundColor: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.2)',
  borderRadius: '6px', padding: '10px 12px', fontFamily: DM_SANS, fontSize: '14px',
  color: TEXT_MID, outline: 'none', direction: 'rtl',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}80`,
  marginBottom: '6px', textAlign: 'right',
};

function ChipRow({ options, value, onChange }: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', borderRadius: '20px',
            border: `1px solid ${value === opt.value ? BIO_CYAN : 'rgba(0,229,195,0.2)'}`,
            backgroundColor: value === opt.value ? 'rgba(0,229,195,0.12)' : 'transparent',
            color: value === opt.value ? BIO_CYAN : `${TEXT_MID}80`,
            fontFamily: DM_SANS, fontSize: '12.5px', cursor: 'pointer',
          }}
        >
          {opt.icon}{opt.label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  plant:    GardenPlant;
  gardenId: string;
  onClose:  () => void;
}

export function EditPlantSheet({ plant, gardenId, onClose }: Props) {
  const { patchGardenPlant } = useGardenStore();
  const { show: showToast } = useToastStore();

  const [variety,             setVariety]             = useState(plant.variety ?? '');
  const [locationType,        setLocationType]        = useState(plant.location_type ?? 'pot');
  const [locationDescription, setLocationDescription] = useState(plant.location_description ?? '');
  const [plantType,           setPlantType]           = useState(plant.plant_type ?? '');
  const [sunExposure,         setSunExposure]         = useState(plant.sun_exposure ?? '');
  const [soil,                setSoil]                = useState(plant.soil ?? '');
  const [companions,          setCompanions]          = useState(plant.companions ?? '');
  const [isSaving,            setIsSaving]            = useState(false);
  const [error,               setError]               = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await patchGardenPlant(plant.id, gardenId, {
        variety:             variety.trim() || undefined,
        locationType,
        locationDescription: locationDescription.trim() || undefined,
        plantType:           plantType || undefined,
        sunExposure:         sunExposure || undefined,
        soil:                soil.trim() || undefined,
        companions:          companions.trim() || undefined,
      });
      showToast('הפרטים עודכנו 🌱', 'info');
      onClose();
    } catch (err: any) {
      setError(err.message || 'משהו השתבש, נסה שוב');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 260, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div style={{
        backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
        borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
        padding: '20px 22px calc(20px + env(safe-area-inset-bottom))',
        width: '100%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto', direction: 'rtl',
      }}>
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(0,229,195,0.25)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: BIO_CYAN, margin: 0 }}>עריכת פרטי הצמח</h2>
          <button onClick={onClose} disabled={isSaving}
            style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '20px' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>זן / גיוון</label>
            <input type="text" value={variety} onChange={e => setVariety(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>סוג גידול</label>
            <ChipRow
              value={locationType}
              onChange={setLocationType}
              options={LOCATION_TYPES.map(l => ({ value: l.value, label: l.labelHe, icon: <span>{l.emoji}</span> }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <PlantingBase type={locationType} width={72} height={28} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>סוג צמח</label>
            <ChipRow value={plantType} onChange={setPlantType} options={PLANT_TYPES.map(p => ({ value: p.value, label: p.labelHe }))} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>תיאור מיקום</label>
            <input type="text" value={locationDescription} onChange={e => setLocationDescription(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>חשיפה לשמש</label>
            <ChipRow value={sunExposure} onChange={setSunExposure} options={SUN_EXPOSURES.map(s => ({ value: s, label: s }))} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>קרקע / מצע</label>
            <input type="text" value={soil} onChange={e => setSoil(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>צמחים שכנים</label>
            <input type="text" value={companions} onChange={e => setCompanions(e.target.value)} style={inputStyle} />
          </div>

          {error && (
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: '#e06060', textAlign: 'right', marginBottom: '16px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            style={{
              width: '100%', padding: '13px',
              backgroundColor: isSaving ? 'rgba(0,229,195,0.35)' : BIO_CYAN,
              color: '#050d0a', border: 'none', borderRadius: '8px',
              fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </form>
      </div>
    </div>
  );
}
