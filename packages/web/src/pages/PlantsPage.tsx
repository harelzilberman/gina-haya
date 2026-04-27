import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlants } from '../hooks/usePlants';
import type { PlantSummary } from '../hooks/usePlants';
import { PlantCard } from '../components/garden/PlantCard';
import { PlantSearch } from '../components/garden/PlantSearch';
import { PlantDetailModal } from '../components/garden/PlantDetailModal';
import { AdBanner } from '../components/ui/AdBanner';

// ── Design tokens ────────────────────────────────────────────────────────────
const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const SAGE   = '#7DC084';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

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
    rgba(28,58,30,0.5) 25%,
    rgba(48,90,52,0.6) 50%,
    rgba(28,58,30,0.5) 75%
  );
  background-size: 800px 100%;
  animation: plant-shimmer 1.5s ease-in-out infinite;
  border-radius: 10px;
}
.plant-card-in {
  animation: plant-card-in 0.4s ease-out both;
}
.plant-search-input::placeholder {
  color: rgba(237,224,196,0.4);
}
.plant-search-input:focus {
  border-color: rgba(245,200,64,0.5) !important;
  box-shadow: 0 0 0 3px rgba(245,200,64,0.07) !important;
  outline: none;
}
`;

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background:   'rgba(28,58,30,0.7)',
      border:       '1px solid rgba(125,192,132,0.12)',
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
          opacity:         0.3,
        }}
      />

      <div style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* Page header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: FRANK,
              fontWeight: 700,
              fontSize:   '2rem',
              color:      GOLD,
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
              fontFamily: ASSIST,
              fontSize:   '13px',
              color:      '#E06060',
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
                color:      GOLD,
                margin:     0,
              }}>
                {t('encyclopedia.noResults')}
              </p>
              <p style={{
                fontFamily: ASSIST,
                fontSize:   '14px',
                color:      SAGE,
                margin:     0,
              }}>
                נסה חיפוש אחר
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    marginTop:       '4px',
                    fontFamily:      ASSIST,
                    fontSize:        '13px',
                    fontWeight:      500,
                    padding:         '7px 22px',
                    borderRadius:    '50px',
                    border:          `1px solid ${GOLD}66`,
                    color:           GOLD,
                    backgroundColor: 'transparent',
                    cursor:          'pointer',
                    transition:      'background-color 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.1)'; }}
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
