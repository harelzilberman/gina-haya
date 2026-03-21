import { useState } from 'react';
import { PLANTS, companionStatus } from '../../data/companions';
import type { PlantData } from '../../data/companions';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const CATEGORY_LABELS: Record<string, string> = {
  fruit:  'פרי 🍅',
  root:   'שורש 🥕',
  leaf:   'עלה 🥬',
  flower: 'פרח 🌸',
};

const STATUS_COLORS = {
  good:    { bg: 'rgba(74,128,80,0.18)',  border: `rgba(125,192,132,0.4)`,  dot: SAGE },
  bad:     { bg: 'rgba(163,48,48,0.18)',  border: `rgba(220,100,100,0.4)`,  dot: '#E07070' },
  neutral: { bg: 'rgba(40,60,40,0.15)',   border: `rgba(245,200,64,0.12)`,  dot: `${PARCH}44` },
};

interface Props {
  existingPlantIds: string[];
  onAdd: (plant: PlantData) => void;
  onClose: () => void;
}

export function PlantPicker({ existingPlantIds, onAdd, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = PLANTS.filter(p => {
    const matchSearch = !search ||
      p.nameHe.includes(search) ||
      p.nameEn.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{
      background: 'linear-gradient(160deg, rgba(22,50,24,0.98) 0%, rgba(20,43,22,0.99) 100%)',
      border: '1px solid rgba(245,200,64,0.15)',
      borderRadius: '12px',
      padding: '16px',
      maxHeight: '420px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: 0 }}>
          בחר צמח לשתילה
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: `${PARCH}55`, cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
        >
          ✕
        </button>
      </div>

      {/* Companion legend */}
      {existingPlantIds.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ ...legendDot(STATUS_COLORS.good.dot) }}>⬤</span>
          <span style={legendText}>טוב ביחד</span>
          <span style={{ ...legendDot(STATUS_COLORS.bad.dot) }}>⬤</span>
          <span style={legendText}>לא מומלץ</span>
          <span style={{ ...legendDot(`${PARCH}30`) }}>⬤</span>
          <span style={legendText}>ניטרלי</span>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <input
          placeholder="חיפוש..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, fontFamily: ASSIST, fontSize: '12px', color: PARCH,
            background: 'rgba(245,200,64,0.06)', border: '1px solid rgba(245,200,64,0.15)',
            borderRadius: '6px', padding: '6px 10px', outline: 'none',
          }}
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            fontFamily: ASSIST, fontSize: '11px', color: PARCH,
            background: 'rgba(245,200,64,0.06)', border: '1px solid rgba(245,200,64,0.15)',
            borderRadius: '6px', padding: '6px 8px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">הכל</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Plant grid */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {filtered.map(plant => {
            const status = companionStatus(plant.id, existingPlantIds);
            const colors = STATUS_COLORS[status];
            const alreadyAdded = existingPlantIds.includes(plant.id);
            return (
              <button
                key={plant.id}
                onClick={() => !alreadyAdded && onAdd(plant)}
                title={`${plant.nameEn} — ${plant.spacingCm} ס"מ מרווח`}
                style={{
                  fontFamily: ASSIST, fontSize: '12px', fontWeight: 500,
                  padding: '5px 10px', borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  color: alreadyAdded ? `${PARCH}44` : PARCH,
                  backgroundColor: alreadyAdded ? 'transparent' : colors.bg,
                  cursor: alreadyAdded ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'opacity 0.15s',
                  opacity: alreadyAdded ? 0.4 : 1,
                }}
              >
                <span style={{ color: colors.dot, fontSize: '8px', lineHeight: 1 }}>⬤</span>
                {plant.emoji} {plant.nameHe}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}44`, padding: '8px 0' }}>
              אין תוצאות
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const legendDot = (color: string): React.CSSProperties => ({
  color, fontSize: '10px',
});
const legendText: React.CSSProperties = {
  fontFamily: ASSIST, fontSize: '10px', color: `${PARCH}66`, marginRight: '6px',
};
