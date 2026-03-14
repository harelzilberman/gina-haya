import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGardenStore } from '../stores/gardenStore';
import { GardenHeader } from '../components/garden/GardenHeader';
import { GardenEditModal } from '../components/garden/GardenEditModal';
import { MyPlants } from '../components/garden/MyPlants';

export function GardenPage() {
  const { t } = useTranslation('garden');
  const { activeGarden, isLoading, loadGardens } = useGardenStore();
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    loadGardens();
  }, [loadGardens]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EC' }}>
        <span className="text-4xl animate-pulse">🌱</span>
      </div>
    );
  }

  if (!activeGarden) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EC' }}>
        <p className="text-base" style={{ color: '#6B7280' }}>{t('noGarden')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EC' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <GardenHeader garden={activeGarden} onEdit={() => setShowEdit(true)} />

        <MyPlants garden={activeGarden} />

        {/* Phase 2 map teaser */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm text-center"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-2xl mb-2">🗺️</p>
          <p className="text-sm font-semibold mb-1" style={{ color: '#1B2A4A' }}>
            {t('map.title')}
          </p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {t('map.phase2')}
          </p>
        </div>
      </div>

      {showEdit && (
        <GardenEditModal
          garden={activeGarden}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
