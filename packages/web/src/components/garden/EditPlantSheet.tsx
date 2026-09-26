import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GardenPlant } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';
import { LOCATION_TYPES, locationLabel } from './PlantingBase';
import { PlantingBase } from './PlantingBase';
import { DAY_LETTERS_HE } from '../../constants/days';
import { EN_HEADING } from '../../styles/fonts';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';

const PLANT_TYPE_VALUES = ['annual', 'perennial', 'tree', 'shrub'] as const;
const SUN_EXPOSURE_VALUES = ['full_sun', 'partial_shade', 'shade'] as const;

// Legacy Hebrew values stored in DB — map to canonical enum keys.
const SUN_EXPOSURE_LEGACY: Record<string, string> = {
  '\u05E9\u05DE\u05E9 \u05DE\u05DC\u05D0\u05D4': 'full_sun',
  '\u05D7\u05E6\u05D9 \u05E6\u05DC': 'partial_shade',
  '\u05E6\u05DC': 'shade',
};

function normaliseSunExposure(v: string): string {
  return SUN_EXPOSURE_LEGACY[v] ?? v;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  backgroundColor: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.2)',
  borderRadius: '6px', padding: '10px 12px', fontFamily: EN_HEADING, fontSize: '14px',
  color: TEXT_MID, outline: 'none',
};

function labelStyle(isHe: boolean): React.CSSProperties {
  return {
    display: 'block', fontFamily: EN_HEADING, fontSize: '12px', color: `${TEXT_MID}80`,
    marginBottom: '6px', textAlign: isHe ? 'right' : 'left',
  };
}

function ChipRow({ options, value, onChange }: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
            fontFamily: EN_HEADING, fontSize: '12.5px', cursor: 'pointer',
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
  const { t, i18n } = useTranslation('garden');
  const isHe = i18n.language === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const headingFont = isHe ? FRANK : EN_HEADING;
  const ls = labelStyle(isHe);

  const { patchGardenPlant } = useGardenStore();
  const { show: showToast } = useToastStore();

  const [variety,             setVariety]             = useState(plant.variety ?? '');
  const [locationType,        setLocationType]        = useState(plant.location_type ?? 'pot');
  const [locationDescription, setLocationDescription] = useState(plant.location_description ?? '');
  const [plantType,           setPlantType]           = useState(plant.plant_type ?? '');
  const [sunExposure,         setSunExposure]         = useState(normaliseSunExposure(plant.sun_exposure ?? ''));
  const [soil,                setSoil]                = useState(plant.soil ?? '');
  const [companions,          setCompanions]          = useState(plant.companions ?? '');
  const [autoIrrigation,      setAutoIrrigation]      = useState(plant.auto_irrigation ?? false);
  const [irrigationDays,      setIrrigationDays]      = useState<number[]>(plant.irrigation_days ?? []);

  const initTimes = plant.irrigation_times?.length
    ? plant.irrigation_times.map(t => String(t).slice(0, 5))
    : ['06:00'];
  const initLitersRaw = plant.irrigation_liters ?? null;
  const initLiters: string[] = initTimes.map((_, i) =>
    initLitersRaw?.[i] != null ? String(initLitersRaw[i]) : ''
  );
  const [irrigationTimes,  setIrrigationTimes]  = useState<string[]>(initTimes);
  const [irrigationLiters, setIrrigationLiters] = useState<string[]>(initLiters);

  const [isSaving, setIsSaving] = useState(false);
  const [error,    setError]    = useState('');

  function toggleIrrigationDay(day: number) {
    setIrrigationDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  function updateIrrigationTime(index: number, value: string) {
    setIrrigationTimes(prev => { const next = [...prev]; next[index] = value; return next; });
  }

  function updateIrrigationLiters(index: number, raw: string) {
    setIrrigationLiters(prev => { const next = [...prev]; next[index] = raw; return next; });
  }

  function addIrrigationRun() {
    if (irrigationTimes.length >= 3) return;
    const pairs = irrigationTimes.map((t, i) => ({ t, l: irrigationLiters[i] ?? '' }));
    pairs.push({ t: '06:00', l: '' });
    pairs.sort((a, b) => a.t.localeCompare(b.t));
    setIrrigationTimes(pairs.map(p => p.t));
    setIrrigationLiters(pairs.map(p => p.l));
  }

  function removeIrrigationRun(index: number) {
    if (irrigationTimes.length <= 1) return;
    setIrrigationTimes(prev => prev.filter((_, i) => i !== index));
    setIrrigationLiters(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (autoIrrigation) {
      if (irrigationDays.length === 0) { setError(t('editPlant.errorNoDays')); return; }
      if (irrigationTimes.length === 0 || irrigationTimes.length > 3) { setError(t('editPlant.errorTimesRange')); return; }
    }

    const savePairs = irrigationTimes
      .map((t, i) => ({ t, l: irrigationLiters[i] ?? '' }))
      .sort((a, b) => a.t.localeCompare(b.t));
    const sortedTimes  = savePairs.map(p => p.t);
    const sortedLiters = savePairs.map(p => { const v = parseFloat(p.l); return isNaN(v) ? null : v; });

    setIsSaving(true);
    try {
      await patchGardenPlant(plant.id, gardenId, {
        variety:             variety.trim() || undefined,
        locationType,
        locationDescription: locationDescription.trim() || undefined,
        plantType:           plantType || undefined,
        sunExposure:         sunExposure || undefined,
        soil:                soil.trim() || undefined,
        companions:          companions.trim() || undefined,
        autoIrrigation,
        irrigationDays:      autoIrrigation ? irrigationDays  : [],
        irrigationTimes:     autoIrrigation ? sortedTimes     : [],
        irrigationLiters:    autoIrrigation ? sortedLiters    : null,
      });
      showToast(t('editPlant.savedToast'), 'info');
      onClose();
    } catch (err: any) {
      setError(err.message || t('editPlant.errorGeneric'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
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
        width: '100%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(0,229,195,0.25)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontFamily: headingFont, fontSize: '18px', color: BIO_CYAN, margin: 0 }}>{t('editPlant.title')}</h2>
          <button onClick={onClose} disabled={isSaving}
            style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '20px' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '14px' }}>
            <label style={ls}>{t('editPlant.varietyLabel')}</label>
            <input type="text" value={variety} onChange={e => setVariety(e.target.value)}
              style={{ ...inputStyle, direction: dir }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={ls}>{t('editPlant.locationTypeLabel')}</label>
            <ChipRow
              value={locationType}
              onChange={setLocationType}
              options={LOCATION_TYPES.map(l => ({ value: l.value, label: locationLabel(l.value, t), icon: <span>{l.emoji}</span> }))}
            />
            <div style={{ display: 'flex', justifyContent: isHe ? 'flex-end' : 'flex-start', marginTop: '10px' }}>
              <PlantingBase type={locationType} width={72} height={28} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={ls}>{t('editPlant.plantTypeLabel')}</label>
            <ChipRow value={plantType} onChange={setPlantType}
              options={PLANT_TYPE_VALUES.map(v => ({ value: v, label: t(`plantType.${v}`) }))} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={ls}>{t('editPlant.locationDescLabel')}</label>
            <input type="text" value={locationDescription} onChange={e => setLocationDescription(e.target.value)}
              style={{ ...inputStyle, direction: dir }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={ls}>{t('editPlant.sunExposureLabel')}</label>
            <ChipRow value={sunExposure} onChange={setSunExposure}
              options={SUN_EXPOSURE_VALUES.map(v => ({ value: v, label: t(`sunExposure.${v}`) }))} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={ls}>{t('editPlant.soilLabel')}</label>
            <input type="text" value={soil} onChange={e => setSoil(e.target.value)}
              style={{ ...inputStyle, direction: dir }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={ls}>{t('editPlant.companionsLabel')}</label>
            <input type="text" value={companions} onChange={e => setCompanions(e.target.value)}
              style={{ ...inputStyle, direction: dir }} />
          </div>

          {/* Automatic irrigation */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: autoIrrigation ? '14px' : 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: EN_HEADING, fontWeight: 700, fontSize: '15px', color: TEXT_MID }}>
                  {t('editPlant.autoIrrigationToggle')}
                </span>
                <span style={{ fontSize: '18px' }}>💧</span>
              </span>
              <button
                type="button"
                onClick={() => setAutoIrrigation(v => !v)}
                aria-pressed={autoIrrigation}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: autoIrrigation ? '#1565C0' : 'rgba(176,207,191,0.25)', position: 'relative', padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px',
                  [autoIrrigation ? 'left' : 'right']: '2px',
                  width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                } as React.CSSProperties} />
              </button>
            </div>

            {autoIrrigation && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  {DAY_LETTERS_HE.map((letter, i) => {
                    const selected = irrigationDays.includes(i);
                    return (
                      <button
                        key={i} type="button" onClick={() => toggleIrrigationDay(i)}
                        style={{
                          width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer',
                          border: `1px solid ${selected ? '#C8A951' : 'rgba(0,229,195,0.2)'}`,
                          background: selected ? '#C8A951' : 'rgba(9,20,16,0.85)',
                          color: selected ? '#fff' : TEXT_MID,
                          fontFamily: EN_HEADING, fontWeight: 700, fontSize: '14px',
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>

                {irrigationTimes.map((time, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {irrigationTimes.length > 1 && (
                      <button type="button" onClick={() => removeIrrigationRun(i)}
                        aria-label={t('editPlant.removeTimeAria')}
                        style={{ background: 'none', border: 'none', color: '#e06060', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}>
                        ✕
                      </button>
                    )}
                    <input type="time" value={time} onChange={e => updateIrrigationTime(i, e.target.value)}
                      style={{ ...inputStyle, flex: 1, textAlign: 'center' }} />
                    <input
                      type="text" inputMode="decimal"
                      value={irrigationLiters[i] ?? ''}
                      onChange={e => updateIrrigationLiters(i, e.target.value)}
                      placeholder={t('editPlant.quantityPlaceholder')}
                      aria-label={t('editPlant.quantityPlaceholder')}
                      style={{ ...inputStyle, width: '56px', textAlign: 'center', padding: '10px 4px' }}
                    />
                    <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${TEXT_MID}90`, whiteSpace: 'nowrap' }}>{t('editPlant.litersUnit')}</span>
                  </div>
                ))}

                {irrigationTimes.length < 3 && (
                  <button type="button" onClick={addIrrigationRun}
                    style={{ background: 'none', border: 'none', color: '#1D9E75', fontFamily: EN_HEADING, fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                    {t('editPlant.addTime')}
                  </button>
                )}
              </>
            )}
          </div>

          {error && (
            <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: '#e06060', textAlign: isHe ? 'right' : 'left', marginBottom: '16px' }}>{error}</p>
          )}

          <button type="submit" disabled={isSaving}
            style={{
              width: '100%', padding: '13px',
              backgroundColor: isSaving ? 'rgba(0,229,195,0.35)' : BIO_CYAN,
              color: '#050d0a', border: 'none', borderRadius: '8px',
              fontFamily: headingFont, fontSize: '16px', fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}>
            {isSaving ? t('editPlant.saving') : t('editPlant.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
