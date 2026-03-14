import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlants } from '../hooks/usePlants';
import type { PlantSummary } from '../hooks/usePlants';
import { PlantCard } from '../components/garden/PlantCard';
import { PlantSearch } from '../components/garden/PlantSearch';
import { PlantDetailModal } from '../components/garden/PlantDetailModal';
import { AdBanner } from '../components/ui/AdBanner';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
      <div className="flex gap-1">
        <div className="h-5 bg-gray-100 rounded-full w-14" />
        <div className="h-5 bg-gray-100 rounded-full w-14" />
      </div>
    </div>
  );
}

export function PlantsPage() {
  const { t } = useTranslation('garden');

  const [search, setSearch]             = useState('');
  const [category, setCategory]         = useState('');
  const [dayTypeFilter, setDayType]     = useState('');
  const [selected, setSelected]         = useState<PlantSummary | null>(null);

  const { plants, isLoading, error } = usePlants({ search, category });

  // Client-side day type filter (API doesn't expose a dayType param — filter here)
  const filtered = useMemo(() => {
    if (!dayTypeFilter) return plants;
    return plants.filter(p => p.day_type_affinity?.includes(dayTypeFilter));
  }, [plants, dayTypeFilter]);

  const hasActiveFilters = search || category || dayTypeFilter;

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setDayType('');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EC' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page title */}
        <h1 className="text-xl font-bold mb-5 text-center" style={{ color: '#1B2A4A' }}>
          {t('encyclopedia.title')}
        </h1>

        {/* Search + filters */}
        <PlantSearch
          search={search}           onSearchChange={setSearch}
          category={category}       onCategoryChange={setCategory}
          dayTypeFilter={dayTypeFilter} onDayTypeChange={setDayType}
        />

        {/* Error */}
        {error && (
          <p className="text-center text-sm mb-4" style={{ color: '#A33030' }}>{error}</p>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-base" style={{ color: '#6B7280' }}>
              {t('encyclopedia.noResults')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm px-4 py-1.5 rounded-full"
                style={{ backgroundColor: '#4A7C59', color: '#FFF' }}
              >
                {t('encyclopedia.clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* Plant grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={setSelected}
              />
            ))}
          </div>
        )}
      </div>

      <AdBanner />

      {/* Detail modal */}
      {selected && (
        <PlantDetailModal
          plant={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
