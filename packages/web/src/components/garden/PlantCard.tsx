import { useTranslation } from 'react-i18next';
import type { PlantSummary } from '../../hooks/usePlants';

interface Props {
  plant: PlantSummary;
  onClick: (plant: PlantSummary) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables:  '🥦',
  herbs:       '🌿',
  fruit_trees: '🍊',
  flowers:     '🌸',
  other:       '🌱',
};

const DAY_TYPE_COLOURS: Record<string, string> = {
  fruit:  '#FED7AA',
  root:   '#FDE68A',
  flower: '#FBCFE8',
  leaf:   '#BBF7D0',
};

const DAY_TYPE_EMOJIS: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

export function PlantCard({ plant, onClick }: Props) {
  const { t, i18n } = useTranslation('garden');
  const isHe = i18n.language === 'he';

  const displayName = isHe ? plant.common_name_he : plant.common_name_en;
  const categoryEmoji = CATEGORY_EMOJIS[plant.category ?? 'other'] ?? '🌱';

  return (
    <button
      onClick={() => onClick(plant)}
      className="w-full text-start bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4 flex flex-col gap-2"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      aria-label={displayName}
    >
      {/* Category emoji + name */}
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
          {categoryEmoji}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-snug" style={{ color: '#1B2A4A' }}>
            {displayName}
          </p>
          {plant.latin_name && (
            <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
              {plant.latin_name}
            </p>
          )}
        </div>
      </div>

      {/* Category label */}
      {plant.category && (
        <p className="text-xs" style={{ color: '#6B7280' }}>
          {t(`encyclopedia.categories.${plant.category}`, { defaultValue: plant.category })}
        </p>
      )}

      {/* Day type affinity pills */}
      {plant.day_type_affinity?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-1">
          {plant.day_type_affinity.map(dt => (
            <span
              key={dt}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: DAY_TYPE_COLOURS[dt] ?? '#E5E7EB', color: '#1B2A4A' }}
            >
              {DAY_TYPE_EMOJIS[dt]} {t(`encyclopedia.dayTypes.${dt}`, { defaultValue: dt })}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
