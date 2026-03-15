import { useTranslation } from 'react-i18next';
import type { Garden } from '../../stores/gardenStore';

interface Props {
  garden: Garden;
  onEdit: () => void;
}

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const CLAY   = '#9B7A48';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const SOIL_EMOJIS: Record<string, string> = {
  clay: '🟤', sandy: '🟡', loam: '🌱', chalky: '⬜', silty: '🌊', peaty: '🟫', mixed: '🎨',
};

export function GardenHeader({ garden, onEdit }: Props) {
  const { t } = useTranslation('garden');

  return (
    <div style={{
      background:    'rgba(28,58,30,0.7)',
      border:        '1px solid rgba(125,192,132,0.15)',
      borderRadius:  '16px',
      padding:       '24px',
      marginBottom:  '14px',
      backdropFilter:'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily:  FRANK,
            fontWeight:  700,
            fontSize:    '24px',
            color:       PARCH,
            margin:      '0 0 12px',
            lineHeight:  1.2,
          }}>
            {garden.name}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {garden.location_region && (
              <span style={{
                fontFamily:      ASSIST,
                fontSize:        '12px',
                fontWeight:      400,
                padding:         '4px 12px',
                borderRadius:    '50px',
                backgroundColor: 'rgba(74,128,80,0.2)',
                border:          `1px solid ${SAGE}44`,
                color:           SAGE,
              }}>
                📍 {garden.location_region}
              </span>
            )}
            {garden.soil_type && (
              <span style={{
                fontFamily:      ASSIST,
                fontSize:        '12px',
                fontWeight:      400,
                padding:         '4px 12px',
                borderRadius:    '50px',
                backgroundColor: 'rgba(155,122,72,0.2)',
                border:          `1px solid ${CLAY}44`,
                color:           PARCH,
              }}>
                {SOIL_EMOJIS[garden.soil_type] ?? '🌍'}{' '}
                {t(`soilType.${garden.soil_type}`, { defaultValue: garden.soil_type })}
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          aria-label={t('edit')}
          style={{
            flexShrink:      0,
            fontFamily:      FRANK,
            fontSize:        '13px',
            fontWeight:      600,
            padding:         '6px 16px',
            borderRadius:    '8px',
            border:          `1px solid ${GOLD}66`,
            color:           GOLD,
            backgroundColor: 'transparent',
            cursor:          'pointer',
            transition:      'background-color 0.15s',
            whiteSpace:      'nowrap',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          ✏️ {t('edit')}
        </button>
      </div>

      {garden.notes && (
        <p style={{
          fontFamily:  ASSIST,
          fontSize:    '13px',
          fontWeight:  300,
          lineHeight:  1.7,
          color:       `${PARCH}88`,
          marginTop:   '16px',
          paddingTop:  '16px',
          borderTop:   '1px solid rgba(125,192,132,0.1)',
        }}>
          {garden.notes}
        </p>
      )}
    </div>
  );
}
