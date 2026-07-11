import { useState } from 'react';
import { usePlants, type PlantSummary } from '../../hooks/usePlants';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';
import { LOCATION_TYPES } from './PlantingBase';
import { PlantingBase } from './PlantingBase';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PLANT_TYPES = [
  { value: 'annual',    labelHe: 'חד-שנתי' },
  { value: 'perennial', labelHe: 'רב-שנתי' },
  { value: 'tree',       labelHe: 'עץ' },
  { value: 'shrub',       labelHe: 'שיח' },
];

const SUN_EXPOSURES = ['שמש מלאה', 'חצי צל', 'צל'];
const DAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

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
  gardenId: string;
  onClose:  () => void;
  onAdded:  (plantId: string) => void; // fires with the new garden_plants id — caller offers "start tracking?"
}

export function AddPlantModal({ gardenId, onClose, onAdded }: Props) {
  const { addPlantDetailed, patchGardenPlant } = useGardenStore();
  const { show: showToast } = useToastStore();

  const [search,               setSearch]               = useState('');
  const [showDropdown,         setShowDropdown]          = useState(false);
  const [selected,              setSelected]             = useState<PlantSummary | null>(null);
  const [nameHe,                setNameHe]               = useState('');
  const [nameEn,                setNameEn]               = useState('');
  const [variety,               setVariety]              = useState('');
  const [locationType,          setLocationType]         = useState('pot');
  const [locationDescription,   setLocationDescription]  = useState('');
  const [plantType,             setPlantType]            = useState('');
  const [sunExposure,           setSunExposure]          = useState('');
  const [soil,                  setSoil]                 = useState('');
  const [companions,            setCompanions]           = useState('');
  const [autoIrrigation,        setAutoIrrigation]       = useState(false);
  const [irrigationDays,        setIrrigationDays]       = useState<number[]>([]);
  const [irrigationTimes,       setIrrigationTimes]      = useState<string[]>(['07:00']);
  const [isSubmitting,          setIsSubmitting]         = useState(false);
  const [error,                 setError]                = useState('');

  const { plants: results } = usePlants({ search: search.length >= 2 ? search : undefined });

  function pickSpecies(p: PlantSummary) {
    setSelected(p);
    setNameHe(p.common_name_he);
    setNameEn(p.common_name_en);
    setSearch(p.common_name_he);
    setShowDropdown(false);
  }

  function clearSpecies() {
    setSelected(null);
    setNameHe('');
    setSearch('');
  }

  function toggleDay(d: number) {
    setIrrigationDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalNameHe = (nameHe || search).trim();
    if (!finalNameHe) { setError('יש להזין שם צמח'); return; }
    if (autoIrrigation && irrigationDays.length === 0) { setError('בחר לפחות יום השקיה אחד'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const newPlant = await addPlantDetailed(gardenId, {
        plantId:             selected?.id,
        commonNameHe:        finalNameHe,
        commonNameEn:        nameEn.trim() || undefined,
        locationType,
        locationDescription: locationDescription.trim() || undefined,
        plantType:           plantType || undefined,
        variety:             variety.trim() || undefined,
        autoIrrigation,
        irrigationDays:      autoIrrigation ? irrigationDays : undefined,
        irrigationTimes:     autoIrrigation ? irrigationTimes : undefined,
      });

      // sun_exposure / companions / soil aren't accepted at creation — patch them in
      if (sunExposure || companions.trim() || soil.trim()) {
        await patchGardenPlant(newPlant.id, gardenId, {
          sunExposure: sunExposure || undefined,
          companions:  companions.trim() || undefined,
          soil:        soil.trim() || undefined,
        });
      }

      showToast(`${finalNameHe} נוסף לגינה 🌱`, 'info');
      onAdded(newPlant.id);
    } catch (err: any) {
      if (err.errorCode === 'plant_limit_reached') {
        setError(err.message || 'הגעת למגבלת הצמחים לגינה זו');
      } else {
        setError(err.message || 'משהו השתבש, נסה שוב');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div style={{
        backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
        borderRadius: '12px', padding: '26px 22px', width: '100%', maxWidth: '460px',
        maxHeight: '90vh', overflowY: 'auto', direction: 'rtl',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '19px', color: BIO_CYAN, margin: 0 }}>הוספת צמח</h2>
          <button onClick={onClose} disabled={isSubmitting}
            style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '20px' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Species autocomplete */}
          <div style={{ marginBottom: '14px', position: 'relative' }}>
            <label style={labelStyle}>שם הצמח</label>
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setNameHe(e.target.value);
                setShowDropdown(true);
                if (selected && e.target.value !== selected.common_name_he) setSelected(null);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="למשל: עגבנייה, בזיליקום..."
              style={inputStyle}
            />
            {showDropdown && search.length >= 2 && results.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0,
                marginTop: '4px', background: '#0a1712', border: '1px solid rgba(0,229,195,0.25)',
                borderRadius: '8px', maxHeight: '180px', overflowY: 'auto', zIndex: 10,
              }}>
                {results.map(p => (
                  <button
                    key={p.id} type="button" onClick={() => pickSpecies(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      padding: '8px 12px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'right', color: TEXT_MID, fontFamily: DM_SANS, fontSize: '13px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,195,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{p.emoji ?? '🌱'}</span>
                    <span>{p.common_name_he}</span>
                    <span style={{ color: `${TEXT_MID}50`, fontSize: '11px' }}>{p.common_name_en}</span>
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${BIO_CYAN}` , margin: '6px 0 0' }}>
                נבחר מהאנציקלופדיה — {selected.common_name_en}{' '}
                <button type="button" onClick={clearSpecies} style={{ background: 'none', border: 'none', color: `${TEXT_MID}60`, cursor: 'pointer', textDecoration: 'underline', fontSize: '11px' }}>
                  נקה
                </button>
              </p>
            )}
          </div>

          {/* Variety */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>זן / גיוון (אופציונלי)</label>
            <input type="text" value={variety} onChange={e => setVariety(e.target.value)} placeholder="למשל: עגבניית שרי" style={inputStyle} />
          </div>

          {/* Location type — with live planting-base preview */}
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

          {/* Plant biological type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>סוג צמח (אופציונלי)</label>
            <ChipRow value={plantType} onChange={setPlantType} options={PLANT_TYPES.map(p => ({ value: p.value, label: p.labelHe }))} />
          </div>

          {/* Location description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>תיאור מיקום (אופציונלי)</label>
            <input type="text" value={locationDescription} onChange={e => setLocationDescription(e.target.value)} placeholder="למשל: פינה דרומית, עציץ גדול..." style={inputStyle} />
          </div>

          {/* Sun exposure */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>חשיפה לשמש (אופציונלי)</label>
            <ChipRow value={sunExposure} onChange={setSunExposure} options={SUN_EXPOSURES.map(s => ({ value: s, label: s }))} />
          </div>

          {/* Soil */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>קרקע / מצע (אופציונלי)</label>
            <input type="text" value={soil} onChange={e => setSoil(e.target.value)} placeholder="למשל: קומפוסט + חול" style={inputStyle} />
          </div>

          {/* Companions */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>צמחים שכנים (אופציונלי)</label>
            <input type="text" value={companions} onChange={e => setCompanions(e.target.value)} placeholder="למשל: בזיליקום, גזר" style={inputStyle} />
          </div>

          {/* Irrigation */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: autoIrrigation ? '10px' : 0 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>השקיה אוטומטית</label>
              <input type="checkbox" checked={autoIrrigation} onChange={e => setAutoIrrigation(e.target.checked)} />
            </div>
            {autoIrrigation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  {DAY_LABELS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        border: `1px solid ${irrigationDays.includes(i) ? BIO_CYAN : 'rgba(0,229,195,0.2)'}`,
                        background: irrigationDays.includes(i) ? 'rgba(0,229,195,0.15)' : 'transparent',
                        color: irrigationDays.includes(i) ? BIO_CYAN : `${TEXT_MID}70`,
                        fontFamily: DM_SANS, fontSize: '12px', cursor: 'pointer',
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={irrigationTimes[0]}
                  onChange={e => setIrrigationTimes([e.target.value])}
                  style={{ ...inputStyle, width: 'auto', alignSelf: 'flex-end' }}
                />
              </div>
            )}
          </div>

          {error && (
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: '#e06060', textAlign: 'right', marginBottom: '16px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '13px',
              backgroundColor: isSubmitting ? 'rgba(0,229,195,0.35)' : BIO_CYAN,
              color: '#050d0a', border: 'none', borderRadius: '8px',
              fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'מוסיף...' : 'הוסף לגינה 🌱'}
          </button>
        </form>
      </div>
    </div>
  );
}
