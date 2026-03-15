import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGardenStore } from '../stores/gardenStore';
import { GardenHeader } from '../components/garden/GardenHeader';
import { GardenEditModal } from '../components/garden/GardenEditModal';
import { MyPlants } from '../components/garden/MyPlants';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const SAGE   = '#7DC084';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

export function GardenPage() {
  const { t } = useTranslation('garden');
  const { activeGarden, isLoading, loadGardens } = useGardenStore();
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    loadGardens();
  }, [loadGardens]);

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: EARTH,
        minHeight:       '100vh',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <span style={{ fontSize: '40px', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>🌱</span>
      </div>
    );
  }

  if (!activeGarden) {
    return (
      <div style={{
        backgroundColor: EARTH,
        minHeight:       '100vh',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <p style={{ fontFamily: ASSIST, fontSize: '15px', color: `${PARCH}66` }}>
          {t('noGarden')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Noise overlay */}
      <div
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          9998,
          pointerEvents:   'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat:'repeat',
          opacity:         0.28,
        }}
      />

      <div style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 16px 60px' }}>

          <GardenHeader garden={activeGarden} onEdit={() => setShowEdit(true)} />

          <MyPlants garden={activeGarden} />

          {/* Phase 2 map teaser */}
          <div style={{
            padding:       '28px 24px',
            borderRadius:  '16px',
            border:        '2px dashed rgba(125,192,132,0.2)',
            backgroundColor:'rgba(20,43,22,0.4)',
            textAlign:     'center',
          }}>
            <p style={{ fontSize: '28px', lineHeight: 1, marginBottom: '10px' }}>🗺️</p>
            <p style={{
              fontFamily:  FRANK,
              fontWeight:  600,
              fontSize:    '16px',
              color:       `${PARCH}60`,
              margin:      '0 0 6px',
            }}>
              {t('map.title')}
            </p>
            <p style={{
              fontFamily: ASSIST,
              fontSize:   '13px',
              color:      `${SAGE}66`,
              margin:     0,
            }}>
              {t('map.phase2')}
            </p>
          </div>

        </div>
      </div>

      {showEdit && (
        <GardenEditModal
          garden={activeGarden}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
