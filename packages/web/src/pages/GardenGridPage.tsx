import { useEffect, useState } from 'react';
import { useGardenStore } from '../stores/gardenStore';
import { useGardenSwitcherStore } from '../stores/gardenSwitcherStore';
import { useTrackerStore } from '../stores/trackerStore';
import { GardenSwitcher } from '../components/garden/GardenSwitcher';
import { CreateGardenModal } from '../components/garden/CreateGardenModal';
import { GardenPlantCard, AddPlantCard } from '../components/garden/GardenPlantCard';
import { AddPlantModal } from '../components/garden/AddPlantModal';
import { PlantPassportModal } from '../components/garden/PlantPassportModal';
import { NewTrackerModal } from '../components/tracker/NewTrackerModal';

const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

export function GardenGridPage() {
  // Deliberately NOT calling loadGardens()/initFromAuth() here — App.tsx already
  // triggers gardenSwitcherStore.initFromAuth() once the user is authenticated,
  // which syncs into gardenStore too. Calling it again here caused two concurrent
  // /api/garden fetches to race and clobber each other's result. Every other page
  // that reads garden state (GardensPage, MapPage) follows the same read-only pattern.
  const { activeGarden } = useGardenStore();
  const { isLoading } = useGardenSwitcherStore();
  const { trackers, loadTrackers } = useTrackerStore();

  const [showAddPlant,    setShowAddPlant]    = useState(false);
  const [showCreateGarden, setShowCreateGarden] = useState(false);
  const [showArchived,    setShowArchived]    = useState(false);
  const [trackDialogFor,  setTrackDialogFor]  = useState<string | null>(null); // garden_plants id
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [openPlantId,     setOpenPlantId]      = useState<string | null>(null);

  useEffect(() => {
    if (activeGarden) loadTrackers(activeGarden.id);
  }, [activeGarden?.id, loadTrackers]);

  if (isLoading && !activeGarden) {
    return (
      <div style={{ backgroundColor: NIGHT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '40px', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>🌱</span>
      </div>
    );
  }

  if (!activeGarden) {
    return (
      <div style={{ backgroundColor: NIGHT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: DM_SANS, fontSize: '15px', color: TEXT_MID }}>אין לך גינה עדיין</p>
      </div>
    );
  }

  const allPlants   = activeGarden.garden_plants ?? [];
  const activePlants = allPlants.filter(p => !p.archived_at);
  const archivedPlants = allPlants.filter(p => p.archived_at);

  // Looked up fresh from allPlants every render (rather than captured at click
  // time) so edits/archiving made inside the passport modal show up immediately
  // without needing to close and reopen it.
  const openPlant = openPlantId ? allPlants.find(p => p.id === openPlantId) ?? null : null;

  function trackerFor(plant: (typeof activePlants)[number]) {
    // Prefer the direct FK link; fall back to species+garden match for
    // trackers created before garden_plants_id was wired up on this page
    // Primary match uses the direct FK; fallback handles legacy rows without it.
    return (
      trackers.find(t => t.garden_plants_id === plant.id) ??
      trackers.find(t => !t.garden_plants_id && t.plant_id === plant.plant_id && t.garden_id === activeGarden?.id) ??
      null
    );
  }

  return (
    <>
      <div style={{ backgroundColor: NIGHT, minHeight: '100vh' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 60px', direction: 'rtl' }}>

          {/* Header row: garden switcher + label */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h1 style={{ fontFamily: FRANK, fontWeight: 700, fontSize: '20px', color: TEXT_MID, margin: 0 }}>
              🌱 הגינה שלי
            </h1>
            <GardenSwitcher onCreateGarden={() => setShowCreateGarden(true)} />
          </div>

          {/* Card grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {activePlants.map(plant => (
              <GardenPlantCard
                key={plant.id}
                plant={plant}
                tracker={trackerFor(plant)}
                onClick={() => setOpenPlantId(plant.id)}
              />
            ))}
            <AddPlantCard onClick={() => setShowAddPlant(true)} />
          </div>

          {/* Archived row */}
          {archivedPlants.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setShowArchived(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}60`,
                }}
              >
                {showArchived ? '▾' : '◂'} צמחים בעונות קודמות ({archivedPlants.length})
              </button>
              {showArchived && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px', opacity: 0.55 }}>
                  {archivedPlants.map(plant => (
                    <GardenPlantCard key={plant.id} plant={plant} tracker={null} onClick={() => setOpenPlantId(plant.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {showAddPlant && (
        <AddPlantModal
          gardenId={activeGarden.id}
          onClose={() => setShowAddPlant(false)}
          onAdded={(newPlantId) => {
            setShowAddPlant(false);
            setTrackDialogFor(newPlantId);
          }}
        />
      )}

      {/* Post-add "start tracking?" confirm */}
      {trackDialogFor && (
        <div
          role="dialog" aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 210, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '16px',
          }}
        >
          <div style={{
            backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
            borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '360px',
            textAlign: 'center', direction: 'rtl',
          }}>
            <p style={{ fontSize: '30px', margin: '0 0 10px' }}>📸</p>
            <p style={{ fontFamily: FRANK, fontSize: '16px', color: BIO_CYAN, margin: '0 0 6px' }}>
              להתחיל לעקוב אחרי הצמח?
            </p>
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}80`, margin: '0 0 20px' }}>
              צ'ופצ'ו ינתח תמונות ויציע משימות טיפול לאורך זמן
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setTrackDialogFor(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,229,195,0.25)',
                  background: 'transparent', color: `${TEXT_MID}80`, fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer',
                }}
              >
                לא עכשיו
              </button>
              <button
                onClick={() => { setShowTrackerModal(true); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: BIO_CYAN, color: '#050d0a', fontFamily: FRANK, fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                }}
              >
                כן, עקוב 🌱
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrackerModal && activeGarden && (
        <NewTrackerModal
          gardenPlantId={trackDialogFor ?? undefined}
          onClose={() => { setShowTrackerModal(false); setTrackDialogFor(null); }}
          onCreated={() => { setShowTrackerModal(false); setTrackDialogFor(null); if (activeGarden) loadTrackers(activeGarden.id); }}
        />
      )}

      <CreateGardenModal isOpen={showCreateGarden} onClose={() => setShowCreateGarden(false)} />

      {openPlant && (
        <PlantPassportModal
          plant={openPlant}
          tracker={trackerFor(openPlant)}
          gardenName={activeGarden.name}
          gardenId={activeGarden.id}
          onClose={() => setOpenPlantId(null)}
        />
      )}
    </>
  );
}
