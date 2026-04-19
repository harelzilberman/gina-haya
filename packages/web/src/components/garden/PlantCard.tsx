import { useTranslation } from 'react-i18next';
import type { PlantSummary } from '../../hooks/usePlants';

interface Props {
  plant:   PlantSummary;
  index?:  number;
  onClick: (plant: PlantSummary) => void;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const GOLD    = '#F5C840';
const PARCH   = '#EDE0C4';
const SAGE    = '#7DC084';
const FRANK   = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST  = '"Assistant", "Heebo", sans-serif';
const PLAYFAIR= '"Playfair Display", Georgia, serif';

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables:  '🥦',
  herbs:       '🌿',
  fruit_trees: '🍊',
  flowers:     '🌸',
  other:       '🌱',
};

// Dark-theme pill styles per day type
const DAY_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  fruit:  { bg: 'rgba(245,200,64,0.18)',   color: GOLD },
  root:   { bg: 'rgba(155,122,72,0.28)',   color: '#D4B070' },
  flower: { bg: 'rgba(190,80,140,0.18)',   color: '#D88EC0' },
  leaf:   { bg: 'rgba(74,128,80,0.28)',    color: SAGE },
};

const DAY_TYPE_EMOJIS: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

export function PlantCard({ plant, index = 0, onClick }: Props) {
  const { t, i18n } = useTranslation('garden');
  const categoryEmoji = plant.emoji ?? CATEGORY_EMOJIS[plant.category ?? 'other'] ?? '🌱';
  const delay = `${index * 35}ms`;

  return (
    <button
      className="plant-card-in"
      onClick={() => onClick(plant)}
      aria-label={i18n.language === 'he' ? plant.common_name_he : plant.common_name_en}
      style={{
        animationDelay:  delay,
        display:         'flex',
        flexDirection:   'column',
        gap:             '12px',
        width:           '100%',
        textAlign:       'start',
        padding:         '20px',
        borderRadius:    '12px',
        background:      'rgba(28,58,30,0.7)',
        border:          '2px solid rgba(125,192,132,0.3)',
        cursor:          'pointer',
        transition:      'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform    = 'translateY(-3px)';
        el.style.border       = '2px solid rgba(245,200,64,0.5)';
        el.style.boxShadow    = '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,200,64,0.08)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform    = 'translateY(0)';
        el.style.border       = '2px solid rgba(125,192,132,0.3)';
        el.style.boxShadow    = 'none';
      }}
    >
      {/* TOP ROW: text block (right in RTL) + emoji circle (left in RTL) */}
      {/* In RTL flex, first child = right side, second child = left side */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>

        {/* Text block — occupies the RIGHT (start) in RTL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Hebrew name */}
          <p style={{
            fontFamily:   FRANK,
            fontWeight:   600,
            fontSize:     '17px',
            color:        PARCH,
            margin:       '0 0 3px',
            lineHeight:   1.3,
          }}>
            {plant.common_name_he}
          </p>

          {/* English name */}
          {plant.common_name_en && (
            <p style={{
              fontFamily:  ASSIST,
              fontWeight:  300,
              fontSize:    '13px',
              color:       SAGE,
              margin:      '0 0 3px',
              lineHeight:  1.3,
            }}>
              {plant.common_name_en}
            </p>
          )}

          {/* Latin name */}
          {plant.latin_name && (
            <p style={{
              fontFamily:  PLAYFAIR,
              fontStyle:   'italic',
              fontSize:    '12px',
              color:       `${PARCH}44`,
              margin:      0,
              overflow:    'hidden',
              textOverflow:'ellipsis',
              whiteSpace:  'nowrap',
            }}>
              {plant.latin_name}
            </p>
          )}
        </div>

        {/* Category emoji circle — LEFT in RTL (the visual end) */}
        <div
          aria-hidden="true"
          style={{
            flexShrink:      0,
            width:           '48px',
            height:          '48px',
            borderRadius:    '50%',
            backgroundColor: 'rgba(74,128,80,0.3)',
            border:          '1px solid rgba(125,192,132,0.2)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        '22px',
            lineHeight:      1,
          }}
        >
          {categoryEmoji}
        </div>

      </div>

      {/* Day type affinity pills — right-aligned, flow right→left in RTL */}
      {plant.day_type_affinity?.length > 0 && (
        <div style={{
          display:   'flex',
          flexWrap:  'wrap',
          gap:       '6px',
          marginTop: 'auto',
        }}>
          {plant.day_type_affinity.map(dt => {
            const s = DAY_TYPE_STYLES[dt] ?? { bg: 'rgba(100,100,100,0.2)', color: `${PARCH}99` };
            return (
              <span
                key={dt}
                style={{
                  fontFamily:      ASSIST,
                  fontSize:        '11px',
                  fontWeight:      500,
                  padding:         '3px 10px',
                  borderRadius:    '50px',
                  backgroundColor: s.bg,
                  color:           s.color,
                  border:          `1px solid ${s.color}33`,
                  whiteSpace:      'nowrap',
                }}
              >
                {DAY_TYPE_EMOJIS[dt]} {t(`encyclopedia.dayTypes.${dt}`, { defaultValue: dt })}
              </span>
            );
          })}
        </div>
      )}

    </button>
  );
}
