import { useTranslation } from 'react-i18next';
import type { Garden } from '../../stores/gardenStore';

interface Props {
  garden: Garden;
  onEdit: () => void;
}

const SOIL_EMOJIS: Record<string, string> = {
  clay: '🟤', sandy: '🟡', loam: '🌱', chalky: '⬜', silty: '🌊', peaty: '🟫', mixed: '🎨',
};

export function GardenHeader({ garden, onEdit }: Props) {
  const { t } = useTranslation('garden');

  return (
    <div
      className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight mb-1" style={{ color: '#1B2A4A' }}>
            {garden.name}
          </h1>

          <div className="flex flex-wrap gap-2 mt-2">
            {garden.location_region && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: '#EAF4EE', color: '#4A7C59' }}
              >
                📍 {garden.location_region}
              </span>
            )}
            {garden.soil_type && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: '#FEF3E2', color: '#B7924A' }}
              >
                {SOIL_EMOJIS[garden.soil_type] ?? '🌍'}{' '}
                {t(`soilType.${garden.soil_type}`, { defaultValue: garden.soil_type })}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onEdit}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: '#EAF4EE', color: '#4A7C59' }}
          aria-label={t('edit')}
        >
          ✏️ {t('edit')}
        </button>
      </div>

      {garden.notes && (
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: '#374151', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}
        >
          {garden.notes}
        </p>
      )}
    </div>
  );
}
