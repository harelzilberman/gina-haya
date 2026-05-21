import { useTranslation } from 'react-i18next';
import type { Garden } from '../../stores/gardenStore';

interface Props {
  garden: Garden;
  onEdit: () => void;
}

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const SOIL_EMOJIS: Record<string, string> = {
  clay: '🟤', sandy: '🟡', loam: '🌱', chalky: '⬜', silty: '🌊', peaty: '🟫', mixed: '🎨',
};

export function GardenHeader({ garden, onEdit }: Props) {
  const { t } = useTranslation('garden');

  return (
    <div style={{
      background:   NIGHT_CARD,
      border:       '1px solid rgba(0,229,195,0.15)',
      borderRadius: '16px',
      padding:      '24px',
      marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: FRANK,
            fontWeight: 700,
            fontSize:   '24px',
            color:      TEXT_MID,
            margin:     '0 0 12px',
            lineHeight: 1.2,
          }}>
            {garden.name}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {garden.location_region && (
              <span style={{
                fontFamily:      DM_SANS,
                fontSize:        '12px',
                fontWeight:      400,
                padding:         '4px 12px',
                borderRadius:    '50px',
                backgroundColor: 'rgba(0,229,195,0.08)',
                border:          '1px solid rgba(0,229,195,0.25)',
                color:           BIO_CYAN,
              }}>
                📍 {garden.location_region}
              </span>
            )}
            {garden.soil_type && (
              <span style={{
                fontFamily:      DM_SANS,
                fontSize:        '12px',
                fontWeight:      400,
                padding:         '4px 12px',
                borderRadius:    '50px',
                backgroundColor: 'rgba(176,207,191,0.08)',
                border:          '1px solid rgba(176,207,191,0.2)',
                color:           TEXT_MID,
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
            border:          '1px solid rgba(0,229,195,0.4)',
            color:           BIO_CYAN,
            backgroundColor: 'transparent',
            cursor:          'pointer',
            transition:      'background-color 0.15s',
            whiteSpace:      'nowrap',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          ✏️ {t('edit')}
        </button>
      </div>

      {garden.notes && (
        <p style={{
          fontFamily:  DM_SANS,
          fontSize:    '13px',
          fontWeight:  300,
          lineHeight:  1.7,
          color:       `${TEXT_MID}88`,
          marginTop:   '16px',
          paddingTop:  '16px',
          borderTop:   '1px solid rgba(0,229,195,0.1)',
        }}>
          {garden.notes}
        </p>
      )}
    </div>
  );
}
