import { useState } from 'react';

const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const SCORE_COLOURS: Record<string, string> = {
  green:  '#4A9C68',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
};
const DAY_TYPE_HE: Record<string, string> = {
  fruit: 'פרי', root: 'שורש', flower: 'פרח', leaf: 'עלה',
};
const DAY_TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  fruit:  { bg: 'rgba(200,160,64,0.15)',  color: '#C8A040' },
  root:   { bg: 'rgba(139,99,64,0.15)',   color: '#B08060' },
  flower: { bg: 'rgba(200,120,160,0.15)', color: '#C878A0' },
  leaf:   { bg: 'rgba(74,156,104,0.15)',  color: '#4A9C68' },
};

function scoreToColourKey(score: number | null): string {
  if (score === null) return 'yellow';
  if (score >= 8) return 'green';
  if (score >= 6) return 'yellow';
  if (score >= 4) return 'orange';
  return 'red';
}

function formatHebrewDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatQuantity(h: { quantity_grams: number | null; quantity_units: number | null; quantity_type: string | null }): string | null {
  if (h.quantity_type === 'grams' && h.quantity_grams) return `${h.quantity_grams} גרם`;
  if (h.quantity_type === 'kg' && h.quantity_grams) return `${(h.quantity_grams / 1000).toFixed(1)} ק"ג`;
  if (h.quantity_units) return `${h.quantity_units} יח'`;
  return null;
}

interface HarvestRecord {
  id: string;
  plant_name_he: string;
  plant_name_en: string;
  harvest_date: string;
  quantity_grams: number | null;
  quantity_units: number | null;
  quantity_type: string | null;
  notes: string | null;
  day_type: string | null;
  planting_score: number | null;
}

interface Props {
  harvest: HarvestRecord;
  onDelete: (id: string) => void;
}

export function HarvestCard({ harvest: h, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    } else {
      onDelete(h.id);
    }
  }

  const badge   = h.day_type ? DAY_TYPE_BADGE[h.day_type] : null;
  const qty     = formatQuantity(h);
  const colKey  = scoreToColourKey(h.planting_score);
  const dotCol  = SCORE_COLOURS[colKey];

  return (
    <div dir="rtl" style={{
      background:   'rgba(9,20,16,0.7)',
      border:       '1px solid rgba(0,229,195,0.15)',
      borderRadius: '12px',
      padding:      '14px 16px',
      display:      'flex',
      alignItems:   'flex-start',
      gap:          '12px',
    }}>
      {/* Planting score dot */}
      <div style={{
        flexShrink:      0,
        width:           '10px',
        height:          '10px',
        borderRadius:    '50%',
        backgroundColor: dotCol,
        boxShadow:       `0 0 6px ${dotCol}88`,
        marginTop:       '6px',
      }} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '16px', color: PARCH, lineHeight: 1.2 }}>
              {h.plant_name_he}
            </div>
            <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}55`, marginTop: '1px' }}>
              {h.plant_name_en}
            </div>
          </div>
          <button
            onClick={handleDelete}
            title="מחק קציר"
            style={{
              flexShrink:      0,
              fontFamily:      ASSIST,
              fontSize:        confirming ? '11px' : '14px',
              color:           confirming ? '#E06060' : `${PARCH}44`,
              background:      'none',
              border:          confirming ? '1px solid rgba(224,96,96,0.3)' : 'none',
              borderRadius:    '4px',
              cursor:          'pointer',
              padding:         confirming ? '2px 6px' : '0 2px',
              transition:      'color 0.2s',
              whiteSpace:      'nowrap',
            }}
            onMouseEnter={e => { if (!confirming) (e.currentTarget as HTMLElement).style.color = '#E06060'; }}
            onMouseLeave={e => { if (!confirming) (e.currentTarget as HTMLElement).style.color = `${PARCH}44`; }}
          >
            {confirming ? 'בטוח?' : '✕'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          {/* Date */}
          <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77` }}>
            {formatHebrewDate(h.harvest_date)}
          </span>

          {/* Quantity */}
          {qty && (
            <>
              <span style={{ color: `${PARCH}33` }}>·</span>
              <span style={{ fontFamily: ASSIST, fontSize: '12px', color: GOLD, fontWeight: 600 }}>
                {qty}
              </span>
            </>
          )}

          {/* Day type badge */}
          {badge && h.day_type && (
            <span style={{
              fontFamily:      ASSIST,
              fontSize:        '10px',
              fontWeight:      600,
              padding:         '2px 8px',
              borderRadius:    '50px',
              backgroundColor: badge.bg,
              color:           badge.color,
            }}>
              {DAY_TYPE_HE[h.day_type]}
            </span>
          )}
        </div>

        {/* Notes */}
        {h.notes && (
          <div style={{
            fontFamily: ASSIST,
            fontSize:   '12px',
            fontStyle:  'italic',
            color:      `${PARCH}66`,
            marginTop:  '6px',
            lineHeight: 1.5,
          }}>
            {h.notes}
          </div>
        )}
      </div>
    </div>
  );
}
