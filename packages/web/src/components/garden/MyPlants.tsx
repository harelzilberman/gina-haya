import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Garden } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  garden: Garden;
}

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const PLANTS_CSS = `
.my-plant-chip-x { color: rgba(237,224,196,0.5); transition: color 0.15s; }
.my-plant-chip-x:hover { color: #F5C840 !important; }
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
        background:    'rgba(28,58,30,0.7)',
        border:        '1px solid rgba(125,192,132,0.15)',
        borderRadius:  '16px',
        padding:       '20px 24px',
        marginBottom:  '14px',
        backdropFilter:'blur(8px)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{
            fontFamily: FRANK,
            fontWeight: 600,
            fontSize:   '18px',
            color:      PARCH,
            margin:     0,
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
          }}>
            {t('plants.title')}
            {plants.length > 0 && (
              <span style={{
                fontFamily:      ASSIST,
                fontSize:        '11px',
                fontWeight:      500,
                padding:         '2px 8px',
                borderRadius:    '50px',
                backgroundColor: 'rgba(74,128,80,0.3)',
                border:          '1px solid rgba(125,192,132,0.25)',
                color:           SAGE,
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
            + {t('plants.addPlant')}
          </button>
        </div>

        {/* Empty state */}
        {plants.length === 0 && (
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            padding:        '32px 16px',
            gap:            '12px',
          }}>
            <span style={{ fontSize: '36px', lineHeight: 1 }}>🌱</span>
            <p style={{
              fontFamily: ASSIST,
              fontSize:   '14px',
              color:      `${SAGE}88`,
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
                border:          `1px solid ${GOLD}66`,
                color:           GOLD,
                backgroundColor: 'transparent',
                cursor:          'pointer',
                transition:      'background-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.08)'; }}
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
              const displayName = isHe ? plant.common_name_he : plant.common_name_en;
              return (
                <div
                  key={plant.id}
                  style={{
                    display:         'flex',
                    alignItems:      'center',
                    gap:             '6px',
                    padding:         '5px 12px',
                    borderRadius:    '50px',
                    backgroundColor: 'rgba(28,58,30,0.8)',
                    border:          '1px solid rgba(125,192,132,0.2)',
                    fontFamily:      ASSIST,
                    fontSize:        '13px',
                    color:           PARCH,
                  }}
                >
                  {/* Colour dot on end (left in RTL) */}
                  <span style={{ fontSize: '12px', order: 1 }}>🌱</span>
                  <span style={{ order: 0 }}>{displayName}</span>
                  <button
                    className="my-plant-chip-x"
                    onClick={() => handleRemove(plant.plant_id, displayName)}
                    style={{
                      order:           2,
                      width:           '18px',
                      height:          '18px',
                      borderRadius:    '50%',
                      border:          'none',
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      cursor:          'pointer',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      fontSize:        '13px',
                      lineHeight:      1,
                      padding:         0,
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
