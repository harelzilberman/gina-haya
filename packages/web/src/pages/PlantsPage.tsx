import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlants } from '../hooks/usePlants';
import type { PlantSummary } from '../hooks/usePlants';
import { PlantCard } from '../components/garden/PlantCard';
import { PlantSearch } from '../components/garden/PlantSearch';
import { PlantDetailModal } from '../components/garden/PlantDetailModal';
import { AdBanner } from '../components/ui/AdBanner';

// ── Design tokens ────────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PLANTS_CSS = `
@keyframes plant-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
@keyframes plant-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.plant-skeleton {
  background: linear-gradient(
    90deg,
    rgba(9,20,16,0.8) 25%,
    rgba(17,31,24,0.9) 50%,
    rgba(9,20,16,0.8) 75%
  );
  background-size: 800px 100%;
  animation: plant-shimmer 1.5s ease-in-out infinite;
  border-radius: 10px;
}
.plant-card-in {
  animation: plant-card-in 0.4s ease-out both;
}
.plant-search-input::placeholder {
  color: rgba(176,207,191,0.35);
}
.plant-search-input:focus {
  border-color: rgba(0,229,195,0.45) !important;
  box-shadow: 0 0 0 3px rgba(0,229,195,0.07) !important;
  outline: none;
}
`;

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background:   NIGHT_CARD,
      border:       '1px solid rgba(0,229,195,0.08)',
      borderRadius: '12px',
      padding:      '20px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <div className="plant-skeleton" style={{ height: '18px', width: '70%', marginBottom: '8px' }} />
          <div className="plant-skeleton" style={{ height: '13px', width: '50%', marginBottom: '6px' }} />
          <div className="plant-skeleton" style={{ height: '12px', width: '40%' }} />
        </div>
        <div className="plant-skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }} />
      </div>
      {/* Pills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <div className="plant-skeleton" style={{ height: '22px', width: '60px', borderRadius: '50px' }} />
        <div className="plant-skeleton" style={{ height: '22px', width: '60px', borderRadius: '50px' }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PlantsPage() {
  const { t } = useTranslation('garden');

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [dayTypeFilter, setDayType] = useState('');
  const [selected, setSelected]     = useState<PlantSummary | null>(null);

  const { plants, isLoading, error } = usePlants({ search, category });

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
    <>
      <style>{PLANTS_CSS}</style>

      <div style={{ backgroundColor: NIGHT, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* Page header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: FRANK,
              fontWeight: 700,
              fontSize:   '2rem',
              color:      BIO_CYAN,
              margin:     0,
              lineHeight: 1.1,
            }}>
              {t('encyclopedia.title')}
            </h1>
          </div>

          {/* Search + filters */}
          <PlantSearch
            search={search}               onSearchChange={setSearch}
            category={category}           onCategoryChange={setCategory}
            dayTypeFilter={dayTypeFilter} onDayTypeChange={setDayType}
          />

          {/* Error */}
          {error && (
            <p style={{
              fontFamily: DM_SANS,
              fontSize:   '13px',
              color:      '#ff5c8a',
              textAlign:  'center',
              marginBottom:'16px',
            }}>
              {error}
            </p>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap:                 '14px',
            }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filtered.length === 0 && (
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '80px 16px',
              gap:            '12px',
            }}>
              <span style={{ fontSize: '48px', lineHeight: 1 }}>🌱</span>
              <p style={{
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize:   '22px',
                color:      BIO_CYAN,
                margin:     0,
              }}>
                {t('encyclopedia.noResults')}
              </p>
              <p style={{
                fontFamily: DM_SANS,
                fontSize:   '14px',
                color:      TEXT_MID,
                margin:     0,
              }}>
                נסה חיפוש אחר
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    marginTop:       '4px',
                    fontFamily:      DM_SANS,
                    fontSize:        '13px',
                    fontWeight:      500,
                    padding:         '7px 22px',
                    borderRadius:    '50px',
                    border:          `1px solid rgba(0,229,195,0.3)`,
                    color:           BIO_CYAN,
                    backgroundColor: 'transparent',
                    cursor:          'pointer',
                    transition:      'background-color 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {t('encyclopedia.clearFilters')}
                </button>
              )}
            </div>
          )}

          {/* Plant grid */}
          {!isLoading && filtered.length > 0 && (
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap:                 '14px',
            }}>
              {filtered.map((plant, idx) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  index={idx}
                  onClick={setSelected}
                />
              ))}
            </div>
          )}

        </div>

        <AdBanner />
      </div>

      {/* Detail modal */}
      {selected && (
        <PlantDetailModal
          plant={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
