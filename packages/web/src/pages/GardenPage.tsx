import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGardenStore } from '../stores/gardenStore';
import { GardenHeader } from '../components/garden/GardenHeader';
import { GardenEditModal } from '../components/garden/GardenEditModal';
import { MyPlants } from '../components/garden/MyPlants';

const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

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
        backgroundColor: NIGHT,
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
        backgroundColor: NIGHT,
        minHeight:       '100vh',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <p style={{ fontFamily: DM_SANS, fontSize: '15px', color: TEXT_MID }}>
          {t('noGarden')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ backgroundColor: NIGHT, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 16px 60px' }}>

          <GardenHeader garden={activeGarden} onEdit={() => setShowEdit(true)} />

          <MyPlants garden={activeGarden} />

          {/* Map teaser */}
          <div style={{
            padding:         '28px 24px',
            borderRadius:    '16px',
            border:          '2px dashed rgba(0,229,195,0.15)',
            backgroundColor: NIGHT_CARD,
            textAlign:       'center',
          }}>
            <p style={{ fontSize: '28px', lineHeight: 1, marginBottom: '10px' }}>🗺️</p>
            <p style={{
              fontFamily: FRANK,
              fontWeight: 600,
              fontSize:   '16px',
              color:      MUTED,
              margin:     '0 0 6px',
            }}>
              {t('map.title')}
            </p>
            <p style={{
              fontFamily: DM_SANS,
              fontSize:   '13px',
              color:      MUTED,
              opacity:    0.6,
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
