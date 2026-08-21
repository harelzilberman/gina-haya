import { useState } from 'react';
import { useGardenStore } from '../../stores/gardenStore';
import { useHarvestStore, type AddHarvestData } from '../../stores/harvestStore';
import { useToday } from '../../hooks/useCalendar';

const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const EARTH  = '#050d0a';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const MODAL_CSS = `
.harvest-input {
  width: 100%;
  background: rgba(9,20,16,0.8);
  border: 1px solid rgba(0,229,195,0.2);
  border-radius: 8px;
  padding: 9px 12px;
  font-family: ${ASSIST};
  font-size: 14px;
  color: ${PARCH};
  outline: none;
  direction: rtl;
  text-align: right;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.harvest-input:focus { border-color: rgba(0,229,195,0.4); }
.harvest-input::placeholder { color: rgba(176,207,191,0.3); }
.harvest-select {
  background: rgba(9,20,16,0.8);
  border: 1px solid rgba(0,229,195,0.2);
  border-radius: 8px;
  padding: 9px 12px;
  font-family: ${ASSIST};
  font-size: 14px;
  color: ${PARCH};
  outline: none;
  direction: rtl;
  transition: border-color 0.2s;
  cursor: pointer;
}
.harvest-select:focus { border-color: rgba(0,229,195,0.4); }
`;

const DAY_TYPE_HE: Record<string, string> = {
  fruit: 'יום פרי 🍅', root: 'יום שורש 🥕', flower: 'יום פרח 🌸', leaf: 'יום עלה 🌿',
};

interface Props {
  onClose: () => void;
}

export function AddHarvestModal({ onClose }: Props) {
  const { activeGarden } = useGardenStore();
  const { addHarvest }   = useHarvestStore();
  const { day }          = useToday();

  const [plantNameHe,   setPlantNameHe]   = useState('');
  const [plantNameEn,   setPlantNameEn]   = useState('');
  const [plantId,       setPlantId]       = useState<string | undefined>();
  const [useCustomPlant, setUseCustomPlant] = useState(false);
  const [harvestDate,   setHarvestDate]   = useState(new Date().toISOString().slice(0, 10));
  const [quantity,      setQuantity]      = useState('');
  const [quantityType,  setQuantityType]  = useState<'grams' | 'units' | 'kg'>('units');
  const [notes,         setNotes]         = useState('');
  const [isSaving,      setIsSaving]      = useState(false);
  const [error,         setError]         = useState('');

  // Pre-fill from garden plant selection
  function selectGardenPlant(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      setPlantNameHe('');
      setPlantNameEn('');
      setPlantId(undefined);
      return;
    }
    if (val === '__custom__') {
      setUseCustomPlant(true);
      setPlantNameHe('');
      setPlantNameEn('');
      setPlantId(undefined);
      return;
    }
    const plant = activeGarden?.garden_plants.find(p => p.id === val);
    if (plant) {
      setPlantNameHe(plant.common_name_he);
      setPlantNameEn(plant.common_name_en ?? '');
      setPlantId(plant.plant_id);
      setUseCustomPlant(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plantNameHe.trim() || !plantNameEn.trim()) {
      setError('נא להזין שם הצמח בעברית ובאנגלית');
      return;
    }

    const qty = parseInt(quantity, 10);
    const data: AddHarvestData = {
      plantNameHe: plantNameHe.trim(),
      plantNameEn: plantNameEn.trim(),
      plantId,
      gardenId: activeGarden?.id,
      harvestDate,
      quantityType,
      ...(quantity && !isNaN(qty) ? (
        quantityType === 'grams' ? { quantityGrams: qty } :
        quantityType === 'kg'    ? { quantityGrams: Math.round(qty * 1000) } :
                                   { quantityUnits: qty }
      ) : {}),
      notes: notes.trim() || undefined,
    };

    setIsSaving(true);
    try {
      await addHarvest(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  }

  const plants = activeGarden?.garden_plants ?? [];

  return (
    <>
      <style>{MODAL_CSS}</style>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        'fixed',
          inset:           0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex:          100,
          backdropFilter:  'blur(4px)',
        }}
      />
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position:        'fixed',
          top:             '50%',
          left:            '50%',
          transform:       'translate(-50%, -50%)',
          zIndex:          101,
          width:           'min(94vw, 460px)',
          maxHeight:       '90vh',
          overflowY:       'auto',
          backgroundColor: EARTH,
          border:          '1px solid rgba(0,229,195,0.2)',
          borderRadius:    '16px',
          padding:         '24px 22px',
          direction:       'rtl',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '20px', color: GOLD, margin: 0 }}>
            הוסף קציר 🌾
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: `${PARCH}66`, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Plant selector from garden */}
          {plants.length > 0 && !useCustomPlant && (
            <div>
              <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, display: 'block', marginBottom: '5px' }}>
                בחר מהגינה
              </label>
              <select className="harvest-select" onChange={selectGardenPlant} defaultValue="" style={{ width: '100%' }}>
                <option value="">-- בחר צמח --</option>
                {plants.map(p => (
                  <option key={p.id} value={p.id}>{p.common_name_he}</option>
                ))}
                <option value="__custom__">+ צמח אחר</option>
              </select>
            </div>
          )}

          {/* Custom plant name inputs */}
          {(plants.length === 0 || useCustomPlant || !plantNameHe) && (
            <>
              <div>
                <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, display: 'block', marginBottom: '5px' }}>
                  שם הצמח (עברית) *
                </label>
                <input
                  className="harvest-input"
                  type="text"
                  value={plantNameHe}
                  onChange={e => setPlantNameHe(e.target.value)}
                  placeholder="למשל: עגבנייה, לימון..."
                  required
                />
              </div>
              <div>
                <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, display: 'block', marginBottom: '5px' }}>
                  שם הצמח (אנגלית) *
                </label>
                <input
                  className="harvest-input"
                  type="text"
                  value={plantNameEn}
                  onChange={e => setPlantNameEn(e.target.value)}
                  placeholder="e.g. Tomato, Lemon..."
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>
            </>
          )}

          {/* Show selected plant */}
          {plantNameHe && !useCustomPlant && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(0,229,195,0.08)',
              border: '1px solid rgba(0,229,195,0.2)',
              borderRadius: '8px',
              fontFamily: ASSIST,
              fontSize: '14px',
              color: PARCH,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{plantNameHe}</span>
              <button
                type="button"
                onClick={() => { setPlantNameHe(''); setPlantNameEn(''); setPlantId(undefined); }}
                style={{ background: 'none', border: 'none', color: `${PARCH}55`, cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Date */}
          <div>
            <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, display: 'block', marginBottom: '5px' }}>
              תאריך קציר
            </label>
            <input
              className="harvest-input"
              type="date"
              value={harvestDate}
              onChange={e => setHarvestDate(e.target.value)}
              style={{ colorScheme: 'dark', direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          {/* Quantity */}
          <div>
            <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, display: 'block', marginBottom: '5px' }}>
              כמות (אופציונלי)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="harvest-input"
                type="number"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                style={{ flex: 1, direction: 'ltr', textAlign: 'left' }}
              />
              <select
                className="harvest-select"
                value={quantityType}
                onChange={e => setQuantityType(e.target.value as 'grams' | 'units' | 'kg')}
                style={{ flexShrink: 0 }}
              >
                <option value="units">יחידות</option>
                <option value="grams">גרם</option>
                <option value="kg">ק"ג</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, display: 'block', marginBottom: '5px' }}>
              הערות (אופציונלי)
            </label>
            <textarea
              className="harvest-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="כמות, איכות, תצפיות..."
              rows={2}
              style={{ resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {/* Calendar data (read-only) */}
          {day && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(9,20,16,0.6)',
              border: '1px solid rgba(0,229,195,0.1)',
              borderRadius: '8px',
            }}>
              <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44`, marginBottom: '4px' }}>
                נתוני לוח שנה להיום
              </div>
              <div style={{ display: 'flex', gap: '16px', fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}88` }}>
                <span>{DAY_TYPE_HE[day.dayType] ?? day.dayType}</span>
                <span>ציון {day.plantingScore}/10</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ fontFamily: ASSIST, fontSize: '12px', color: '#E06060', textAlign: 'right' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving}
            style={{
              fontFamily:      FRANK,
              fontWeight:      700,
              fontSize:        '16px',
              color:           '#050d0a',
              backgroundColor: isSaving ? 'rgba(0,229,195,0.5)' : GOLD,
              border:          'none',
              borderRadius:    '8px',
              padding:         '12px',
              cursor:          isSaving ? 'default' : 'pointer',
              transition:      'filter 0.2s',
              marginTop:       '4px',
            }}
            onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {isSaving ? 'שומר...' : 'שמור קציר 🌾'}
          </button>
        </form>
      </div>
    </>
  );
}
