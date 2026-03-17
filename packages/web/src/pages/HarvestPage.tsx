import { useEffect, useState } from 'react';
import { useHarvestStore, type Harvest } from '../stores/harvestStore';
import { useGardenStore } from '../stores/gardenStore';
import { HarvestStats } from '../components/harvest/HarvestStats';
import { HarvestCard } from '../components/harvest/HarvestCard';
import { AddHarvestModal } from '../components/harvest/AddHarvestModal';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function monthLabel(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${HE_MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

function groupByMonth(harvests: Harvest[]): Array<{ label: string; items: Harvest[] }> {
  const map = new Map<string, Harvest[]>();
  for (const h of harvests) {
    const key = h.harvest_date.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(h);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: monthLabel(key + '-01'),
    items,
  }));
}

export function HarvestPage() {
  const { harvests, stats, isLoading, total, loadHarvests, loadStats, deleteHarvest, loadMore } = useHarvestStore();
  const { activeGarden, loadGardens } = useGardenStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadHarvests();
    loadStats();
    if (!activeGarden) loadGardens();
  }, [loadHarvests, loadStats, loadGardens, activeGarden]);

  const groups = groupByMonth(harvests);
  const hasMore = harvests.length < total;

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
        <div dir="rtl" style={{ maxWidth: '640px', margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
            <h1 style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '2rem', color: GOLD, margin: 0, lineHeight: 1.1 }}>
              יומן הקציר שלי
            </h1>
            <button
              onClick={() => setShowModal(true)}
              style={{
                fontFamily:      FRANK,
                fontWeight:      700,
                fontSize:        '14px',
                color:           '#142B16',
                backgroundColor: GOLD,
                border:          'none',
                borderRadius:    '8px',
                padding:         '8px 16px',
                cursor:          'pointer',
                transition:      'filter 0.2s',
                whiteSpace:      'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              הוסף קציר +
            </button>
          </div>

          {/* Stats */}
          {stats && <HarvestStats stats={stats} />}

          {/* Loading */}
          {isLoading && harvests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: ASSIST, color: `${PARCH}55` }}>
              <span style={{ fontSize: '32px' }}>🌾</span>
              <div style={{ marginTop: '8px', fontSize: '14px' }}>טוען...</div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && harvests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 16px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌾</div>
              <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, margin: '0 0 8px' }}>
                עדיין לא תיעדת קציר
              </h2>
              <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}66`, margin: '0 0 24px', lineHeight: 1.7 }}>
                כשתקצור משהו בגינה, תעד אותו כאן
                <br />
                ומוש ילמד מהנתונים שלך
              </p>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  fontFamily:      FRANK,
                  fontWeight:      700,
                  fontSize:        '15px',
                  color:           '#142B16',
                  backgroundColor: GOLD,
                  border:          'none',
                  borderRadius:    '8px',
                  padding:         '10px 24px',
                  cursor:          'pointer',
                  transition:      'filter 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                הוסף קציר ראשון
              </button>
            </div>
          )}

          {/* Harvest list grouped by month */}
          {groups.map(group => (
            <div key={group.label} style={{ marginBottom: '24px' }}>
              {/* Month header */}
              <div style={{
                fontFamily:    FRANK,
                fontSize:      '13px',
                fontWeight:    600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color:         `${PARCH}55`,
                marginBottom:  '10px',
                paddingBottom: '6px',
                borderBottom:  '1px solid rgba(245,200,64,0.08)',
              }}>
                {group.label}
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map(h => (
                  <HarvestCard key={h.id} harvest={h} onDelete={deleteHarvest} />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                onClick={loadMore}
                disabled={isLoading}
                style={{
                  fontFamily:      ASSIST,
                  fontSize:        '13px',
                  color:           GOLD,
                  background:      'none',
                  border:          `1px solid rgba(245,200,64,0.3)`,
                  borderRadius:    '50px',
                  padding:         '7px 22px',
                  cursor:          isLoading ? 'default' : 'pointer',
                  opacity:         isLoading ? 0.5 : 1,
                  transition:      'border-color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.3)'; }}
              >
                {isLoading ? 'טוען...' : 'טען עוד'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && <AddHarvestModal onClose={() => { setShowModal(false); loadHarvests(); loadStats(); }} />}
    </>
  );
}
