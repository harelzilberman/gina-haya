import { useState } from 'react';
import { PLANTS } from '../../data/companions';
import type { PlantData } from '../../data/companions';
import { useGardenStore } from '../../stores/gardenStore';

const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const SAGE   = '#4A9C68';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const CAT_LABELS: Record<string, string> = {
  fruit: 'פרי 🍅', root: 'שורש 🥕', leaf: 'עלה 🥬', flower: 'פרח 🌸',
  house_plant: 'צמחי בית 🌿', succulent: 'עסיסינים 🪴', cactus: 'צברים 🌵', medicinal: 'צמחי מרפא 🌸',
};

interface ActivePlant {
  nameHe: string; nameEn: string; emoji: string; spacing: number;
}

interface Props {
  activePlant: ActivePlant | null;
  onSetActivePlant: (p: ActivePlant | null) => void;
}

export function PlantPicker({ activePlant, onSetActivePlant }: Props) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const { gardens } = useGardenStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const gardenPlantNames = (gardens[0]?.garden_plants ?? []).map(
    (p: any) => (p.common_name_he as string).toLowerCase()
  );

  const filtered = PLANTS.filter(p => {
    const matchSearch = !search ||
      p.nameHe.includes(search) ||
      p.nameEn.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const gardenPlants = filtered.filter(p => gardenPlantNames.includes(p.nameHe.toLowerCase()));
  const otherPlants  = filtered.filter(p => !gardenPlantNames.includes(p.nameHe.toLowerCase()));

  function selectPlant(p: PlantData) {
    const same = activePlant?.nameEn === p.nameEn;
    onSetActivePlant(same ? null : { nameHe: p.nameHe, nameEn: p.nameEn, emoji: p.emoji, spacing: p.spacingCm });
  }

  return (
    <div style={isMobile ? {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      maxHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(9,20,16,0.97)',
      borderTop: '1px solid rgba(0,229,195,0.15)',
      borderRadius: '16px 16px 0 0',
      overflow: 'hidden',
    } : {
      width: '260px',
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(9,20,16,0.97)',
      borderInlineStart: '1px solid rgba(0,229,195,0.15)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid rgba(0,229,195,0.08)' }}>
        <h3 style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD, margin: '0 0 8px' }}>
          🌱 בחר צמח לשתילה
        </h3>
        {activePlant && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            borderRadius: '8px', backgroundColor: `${GOLD}18`, border: `1px solid ${GOLD}44`,
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>{activePlant.emoji}</span>
            <div>
              <div style={{ fontFamily: ASSIST, fontSize: '12px', color: GOLD, fontWeight: 600 }}>{activePlant.nameHe}</div>
              <div style={{ fontFamily: ASSIST, fontSize: '10px', color: `${PARCH}55` }}>{activePlant.spacing} ס"מ מרווח</div>
            </div>
            <button onClick={() => onSetActivePlant(null)}
              style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: `${PARCH}55`, cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
        )}
        <input
          placeholder="חיפוש צמח..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: ASSIST, fontSize: '12px', color: PARCH,
            background: 'rgba(0,229,195,0.06)', border: '1px solid rgba(0,229,195,0.15)',
            borderRadius: '6px', padding: '7px 10px', outline: 'none', marginBottom: '6px',
          }}
        />
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button onClick={() => setCatFilter('all')} style={filterBtn(catFilter === 'all')}>הכל</button>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setCatFilter(k)} style={filterBtn(catFilter === k)}>{v}</button>
          ))}
        </div>
      </div>

      {/* Plant list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', paddingBottom: '80px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {gardenPlants.length > 0 && (
          <>
            <p style={sectionLabel}>הצמחים שלי ⭐</p>
            {gardenPlants.map(p => <PlantRow key={p.id} plant={p} active={activePlant?.nameEn === p.nameEn} isGarden onSelect={() => selectPlant(p)} />)}
          </>
        )}
        <p style={sectionLabel}>כל הצמחים</p>
        {otherPlants.map(p => <PlantRow key={p.id} plant={p} active={activePlant?.nameEn === p.nameEn} onSelect={() => selectPlant(p)} />)}
        {filtered.length === 0 && <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}33`, textAlign: 'center', marginTop: '20px' }}>אין תוצאות</p>}
      </div>
    </div>
  );
}

function PlantRow({ plant, active, isGarden = false, onSelect }: { plant: PlantData; active: boolean; isGarden?: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', textAlign: 'right', padding: '7px 8px',
        borderRadius: '7px', marginBottom: '3px', cursor: 'pointer',
        border: `1px solid ${active ? GOLD + '55' : isGarden ? GOLD + '22' : 'transparent'}`,
        background: active ? `${GOLD}15` : isGarden ? `${GOLD}07` : 'transparent',
        transition: 'background 0.12s',
      }}>
      <span style={{ fontSize: '18px' }}>{plant.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'DM Sans, Assistant, Heebo, sans-serif', fontSize: '12px', fontWeight: active ? 600 : 400, color: active ? GOLD : '#b0cfbfCC' }}>{plant.nameHe}</div>
        <div style={{ fontFamily: 'DM Sans, Assistant, Heebo, sans-serif', fontSize: '10px', color: 'rgba(176,207,191,0.35)' }}>{plant.nameEn}</div>
      </div>
      <span style={{
        fontFamily: 'DM Sans, Assistant, Heebo, sans-serif', fontSize: '10px', padding: '2px 6px',
        borderRadius: '50px', background: 'rgba(0,229,195,0.12)', color: '#00e5c3',
      }}>{plant.spacingCm} ס"מ</span>
    </button>
  );
}

const filterBtn = (active: boolean): React.CSSProperties => ({
  fontFamily: ASSIST, fontSize: '10px', padding: '3px 8px', borderRadius: '50px',
  border: `1px solid ${active ? GOLD + '66' : 'rgba(0,229,195,0.15)'}`,
  color: active ? GOLD : `${PARCH}55`, backgroundColor: active ? `${GOLD}15` : 'transparent',
  cursor: 'pointer',
});

const sectionLabel: React.CSSProperties = {
  fontFamily: ASSIST, fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: 'rgba(176,207,191,0.3)', margin: '8px 0 4px',
};
