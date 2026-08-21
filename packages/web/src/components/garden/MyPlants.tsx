import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Garden } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  garden: Garden;
}

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PLANTS_CSS = `
.my-plant-chip-x { color: rgba(176,207,191,0.5); transition: color 0.15s; }
.my-plant-chip-x:hover { color: #00e5c3 !important; }
`;

export function MyPlants({ garden }: Props) {
  const { t, i18n } = useTranslation('garden');
  const isHe = i18n.language === 'he';
  const { removePlant } = useGardenStore();
  const { show: showToast } = useToastStore();
  const navigate = useNavigate();

  const handleRemove = async (plantId: string, plantName: string) => {
    try {
      await removePlant(garden.id, plantId);
      showToast(`${plantName} ${t('plantRemoved')}`, 'info');
    } catch {
      showToast(t('removeError'), 'error');
    }
  };

  const plants = garden.garden_plants ?? [];

  return (
    <>
      <style>{PLANTS_CSS}</style>

      <div style={{
        background:   NIGHT_CARD,
        border:       '1px solid rgba(0,229,195,0.15)',
        borderRadius: '16px',
        padding:      '20px 24px',
        marginBottom: '14px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{
            fontFamily: FRANK,
            fontWeight: 600,
            fontSize:   '18px',
            color:      TEXT_MID,
            margin:     0,
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
          }}>
            {t('plants.title')}
            {plants.length > 0 && (
              <span style={{
                fontFamily:      DM_SANS,
                fontSize:        '11px',
                fontWeight:      500,
                padding:         '2px 8px',
                borderRadius:    '50px',
                backgroundColor: 'rgba(0,229,195,0.12)',
                border:          '1px solid rgba(0,229,195,0.25)',
                color:           BIO_CYAN,
              }}>
                {plants.length}
              </span>
            )}
          </h2>

          <button
            onClick={() => navigate('/plants')}
            style={{
              fontFamily:      FRANK,
              fontSize:        '13px',
              fontWeight:      600,
              padding:         '6px 16px',
              borderRadius:    '50px',
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
            + {t('plants.addPlant')}
          </button>
        </div>

        {/* Empty state */}
        {plants.length === 0 && (
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            padding:       '32px 16px',
            gap:           '12px',
          }}>
            <span style={{ fontSize: '36px', lineHeight: 1 }}>🌱</span>
            <p style={{
              fontFamily: DM_SANS,
              fontSize:   '14px',
              color:      `${TEXT_MID}88`,
              margin:     0,
            }}>
              {t('plants.none')}
            </p>
            <button
              onClick={() => navigate('/plants')}
              style={{
                fontFamily:      FRANK,
                fontSize:        '13px',
                fontWeight:      600,
                padding:         '7px 20px',
                borderRadius:    '50px',
                border:          '1px solid rgba(0,229,195,0.4)',
                color:           BIO_CYAN,
                backgroundColor: 'transparent',
                cursor:          'pointer',
                transition:      'background-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {t('plants.addPlant')}
            </button>
          </div>
        )}

        {/* Plant chips */}
        {plants.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {plants.map(plant => {
              const displayName = isHe ? plant.common_name_he : (plant.common_name_en || plant.common_name_he);
              return (
                <div
                  key={plant.id}
                  style={{
                    display:         'flex',
                    alignItems:      'center',
                    gap:             '6px',
                    padding:         '5px 12px',
                    borderRadius:    '50px',
                    backgroundColor: 'rgba(0,229,195,0.06)',
                    border:          '1px solid rgba(0,229,195,0.2)',
                    fontFamily:      DM_SANS,
                    fontSize:        '13px',
                    color:           TEXT_MID,
                  }}
                >
                  <span style={{ fontSize: '12px', order: 1 }}>🌱</span>
                  <span style={{ order: 0 }}>{displayName}</span>
                  <button
                    className="my-plant-chip-x"
                    onClick={() => handleRemove(plant.id, displayName)}
                    style={{
                      order:             2,
                      width:             '18px',
                      height:            '18px',
                      borderRadius:      '50%',
                      border:            'none',
                      backgroundColor:   'rgba(255,255,255,0.07)',
                      cursor:            'pointer',
                      display:           'flex',
                      alignItems:        'center',
                      justifyContent:    'center',
                      fontSize:          '13px',
                      lineHeight:        1,
                      padding:           0,
                      marginInlineStart: '2px',
                    }}
                    aria-label={`${t('remove')} ${displayName}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
