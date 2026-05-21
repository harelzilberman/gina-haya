import { useTranslation } from 'react-i18next';
import type { PlantSummary } from '../../hooks/usePlants';

interface Props {
  plant:   PlantSummary;
  index?:  number;
  onClick: (plant: PlantSummary) => void;
}

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables:  '🥦',
  herbs:       '🌿',
  fruit_trees: '🍊',
  flowers:     '🌸',
  other:       '🌱',
};

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  fruit:  { bg: 'rgba(239,116,90,0.18)',  color: '#EF745A' },
  root:   { bg: 'rgba(181,136,99,0.18)',  color: '#B58863' },
  flower: { bg: 'rgba(196,132,200,0.18)', color: '#C884C8' },
  leaf:   { bg: 'rgba(0,229,195,0.12)',   color: BIO_CYAN  },
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
        background:      NIGHT_CARD,
        border:          '1px solid rgba(0,229,195,0.15)',
        cursor:          'pointer',
        transition:      'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform   = 'translateY(-3px)';
        el.style.borderColor = 'rgba(0,229,195,0.45)';
        el.style.boxShadow   = '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,229,195,0.06)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform   = 'translateY(0)';
        el.style.borderColor = 'rgba(0,229,195,0.15)';
        el.style.boxShadow   = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: FRANK,
            fontWeight: 600,
            fontSize:   '17px',
            color:      TEXT_MID,
            margin:     '0 0 3px',
            lineHeight: 1.3,
          }}>
            {plant.common_name_he}
          </p>

          {plant.common_name_en && (
            <p style={{
              fontFamily: DM_SANS,
              fontWeight: 300,
              fontSize:   '13px',
              color:      MUTED,
              margin:     '0 0 3px',
              lineHeight: 1.3,
            }}>
              {plant.common_name_en}
            </p>
          )}

          {plant.latin_name && (
            <p style={{
              fontFamily:  DM_SANS,
              fontStyle:   'italic',
              fontSize:    '12px',
              color:       `${TEXT_MID}44`,
              margin:      0,
              overflow:    'hidden',
              textOverflow:'ellipsis',
              whiteSpace:  'nowrap',
            }}>
              {plant.latin_name}
            </p>
          )}
        </div>

        <div
          aria-hidden="true"
          style={{
            flexShrink:      0,
            width:           '48px',
            height:          '48px',
            borderRadius:    '50%',
            backgroundColor: 'rgba(0,229,195,0.1)',
            border:          '1px solid rgba(0,229,195,0.2)',
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

      {plant.day_type_affinity?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
          {plant.day_type_affinity.map(dt => {
            const s = DAY_TYPE_STYLES[dt] ?? { bg: 'rgba(100,100,100,0.2)', color: `${TEXT_MID}99` };
            return (
              <span
                key={dt}
                style={{
                  fontFamily:      DM_SANS,
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
