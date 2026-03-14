import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Garden } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  garden: Garden;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables: '🥦', herbs: '🌿', fruit_trees: '🍊', flowers: '🌸', other: '🌱',
};

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
    <div
      className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ color: '#1B2A4A' }}>
          {t('plants.title')}
          {plants.length > 0 && (
            <span
              className="ms-2 text-xs font-normal px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#EAF4EE', color: '#4A7C59' }}
            >
              {plants.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => navigate('/plants')}
          className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
          style={{ backgroundColor: '#4A7C59', color: '#FFF' }}
        >
          + {t('plants.addPlant')}
        </button>
      </div>

      {/* Empty state */}
      {plants.length === 0 && (
        <div className="flex flex-col items-center py-8 gap-3">
          <span className="text-3xl">🌱</span>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {t('plants.none')}
          </p>
          <button
            onClick={() => navigate('/plants')}
            className="text-sm px-4 py-2 rounded-xl font-medium text-white"
            style={{ backgroundColor: '#4A7C59' }}
          >
            {t('plants.addPlant')}
          </button>
        </div>
      )}

      {/* Plant chips */}
      {plants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plants.map(plant => {
            const displayName = isHe ? plant.common_name_he : plant.common_name_en;
            return (
              <div
                key={plant.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#EAF4EE', color: '#1B2A4A' }}
              >
                <span>🌱</span>
                <span>{displayName}</span>
                <button
                  onClick={() => handleRemove(plant.plant_id, displayName)}
                  className="ms-1 w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none opacity-60 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: '#1B2A4A' }}
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
  );
}
