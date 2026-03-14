import { useTranslation } from 'react-i18next';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  dayTypeFilter: string;
  onDayTypeChange: (v: string) => void;
}

const CATEGORIES = ['all', 'vegetables', 'herbs', 'fruit_trees', 'flowers'] as const;

const DAY_TYPES = [
  { key: 'fruit',  emoji: '🍅' },
  { key: 'root',   emoji: '🥕' },
  { key: 'flower', emoji: '🌸' },
  { key: 'leaf',   emoji: '🌿' },
] as const;

const SAGE = '#4A7C59';

export function PlantSearch({
  search, onSearchChange,
  category, onCategoryChange,
  dayTypeFilter, onDayTypeChange,
}: Props) {
  const { t } = useTranslation('garden');

  return (
    <div className="mb-5 flex flex-col gap-3">
      {/* Search input */}
      <input
        type="search"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={t('encyclopedia.search')}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{
          backgroundColor: '#FFFFFF',
          border:          '1px solid rgba(74,124,89,0.25)',
          color:           '#1B2A4A',
          boxShadow:       '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onFocus={e  => (e.target.style.boxShadow = `0 0 0 2px ${SAGE}40`)}
        onBlur={e   => (e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
      />

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const active = cat === 'all' ? category === '' : category === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat === 'all' ? '' : cat)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? SAGE   : '#FFFFFF',
                color:           active ? '#FFF' : '#6B7280',
                border:          active ? 'none' : '1px solid #D1D5DB',
              }}
            >
              {t(`encyclopedia.categories.${cat}`)}
            </button>
          );
        })}
      </div>

      {/* Day type filter pills */}
      <div className="flex gap-2 flex-wrap">
        {DAY_TYPES.map(({ key, emoji }) => {
          const active = dayTypeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onDayTypeChange(active ? '' : key)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? SAGE   : '#F9F5F0',
                color:           active ? '#FFF' : '#6B7280',
                border:          active ? 'none' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {emoji} {t(`encyclopedia.dayTypes.${key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
