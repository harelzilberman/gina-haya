import { useEffect, useState } from 'react';
import { useMapStore } from '../stores/mapStore';
import { MapToolbar, type MapMode } from '../components/map/MapToolbar';
import { GardenCanvas } from '../components/map/GardenCanvas';
import { BedPanel } from '../components/map/BedPanel';
import { PlantPicker } from '../components/map/PlantPicker';
import type { Bed } from '../stores/mapStore';
import type { PlantData } from '../data/companions';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const MAP_CSS = `
@keyframes map-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export function MapPage() {
  const store = useMapStore();
  const [mode, setMode] = useState<MapMode>('select');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerBedId, setPickerBedId] = useState<string | null>(null);

  useEffect(() => {
    store.loadMap();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handlePlantClick(bedId: string) {
    setPickerBedId(bedId);
    setShowPicker(true);
  }

  function handleAddPlant(plant: PlantData) {
    if (!pickerBedId) return;
    store.addPlantToBed(pickerBedId, {
      plantId:   plant.id,
      nameHe:    plant.nameHe,
      emoji:     plant.emoji,
      spacingCm: plant.spacingCm,
    });
    setShowPicker(false);
  }

  function handleDeleteBed(id: string) {
    store.deleteBed(id);
    if (showPicker && pickerBedId === id) setShowPicker(false);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedBed = store.map.beds.find(b => b.id === store.selectedBedId) ?? null;
  const pickerBed   = store.map.beds.find(b => b.id === pickerBedId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (store.isLoading) {
    return (
      <div style={{ background: '#142B16', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{MAP_CSS}</style>
        <span style={{ fontSize: '48px', animation: 'map-fade-in 0.4s both' }}>🗺️</span>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: '#142B16', minHeight: '100vh', paddingTop: '64px', paddingBottom: '64px' }}>
      <style>{MAP_CSS}</style>

      {/* Page header */}
      <div style={{
        maxWidth: '820px', margin: '0 auto', padding: '20px 16px 12px',
        animation: 'map-fade-in 0.4s ease-out both',
      }}>
        <h1 style={{ fontFamily: FRANK, fontSize: '24px', color: GOLD, margin: '0 0 4px' }}>
          מפת הגינה
        </h1>
        <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}55`, margin: 0 }}>
          תכנן ערוגות, שתול צמחים וגלה שיתופי פעולה ביניהם
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 16px' }}>
        <MapToolbar
          mode={mode}
          onModeChange={m => { setMode(m); if (m !== 'plant') setShowPicker(false); }}
          isSaving={store.isSaving}
          isDirty={store.isDirty}
          onSave={() => store.saveMap()}
          widthM={store.map.widthM}
          heightM={store.map.heightM}
          onSizeChange={(w, h) => store.setMapSize(w, h)}
        />
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: '820px', margin: '0 auto', padding: '12px 16px',
        display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap',
      }}>
        {/* Canvas */}
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <GardenCanvas
            widthM={store.map.widthM}
            heightM={store.map.heightM}
            beds={store.map.beds}
            selectedBedId={store.selectedBedId}
            mode={mode}
            onSelectBed={id => { store.selectBed(id); if (mode !== 'plant') setShowPicker(false); }}
            onAddBed={bed => { const id = store.addBed(bed); store.selectBed(id); }}
            onUpdateBed={(id, u) => store.updateBed(id, u)}
            onDeleteBed={handleDeleteBed}
            onPlantClick={handlePlantClick}
          />
        </div>

        {/* Side panel */}
        <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Bed panel */}
          {selectedBed && !showPicker && (
            <BedPanel
              bed={selectedBed}
              onUpdate={u => store.updateBed(selectedBed.id, u)}
              onDelete={() => handleDeleteBed(selectedBed.id)}
              onRemovePlant={iid => store.removePlantFromBed(selectedBed.id, iid)}
              onClose={() => store.selectBed(null)}
            />
          )}

          {/* Plant picker */}
          {showPicker && pickerBed && (
            <PlantPicker
              existingPlantIds={pickerBed.plants.map(p => p.plantId)}
              onAdd={handleAddPlant}
              onClose={() => setShowPicker(false)}
            />
          )}

          {/* Empty state hint */}
          {!selectedBed && !showPicker && (
            <div style={{
              padding: '20px 16px', borderRadius: '12px',
              border: '1px dashed rgba(245,200,64,0.1)',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}33`, margin: '0 0 6px', lineHeight: 1.5 }}>
                {mode === 'draw'   && 'גרור על הקנבס ליצור ערוגה חדשה'}
                {mode === 'select' && 'לחץ על ערוגה כדי לערוך אותה'}
                {mode === 'plant'  && 'לחץ על ערוגה לבחירת צמחים'}
                {mode === 'delete' && 'לחץ על ערוגה למחיקתה'}
              </p>
              {store.map.beds.length === 0 && (
                <p style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}22`, margin: 0 }}>
                  הגינה ריקה — עבור למצב ציור כדי להתחיל
                </p>
              )}
            </div>
          )}

          {/* Stats */}
          {store.map.beds.length > 0 && (
            <div style={{
              padding: '12px 14px', borderRadius: '8px',
              border: '1px solid rgba(245,200,64,0.08)',
              backgroundColor: 'rgba(245,200,64,0.03)',
            }}>
              <p style={{ fontFamily: ASSIST, fontSize: '11px', fontWeight: 600, color: `${PARCH}44`, margin: '0 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                סיכום גינה
              </p>
              <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}77`, margin: '0 0 3px' }}>
                {store.map.beds.length} ערוגות ·{' '}
                {store.map.beds.reduce((s, b) => s + b.plants.length, 0)} צמחים
              </p>
              <p style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}44`, margin: 0 }}>
                {store.map.widthM} × {store.map.heightM} מ'
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {store.error && (
        <div style={{
          maxWidth: '820px', margin: '0 auto 12px', padding: '0 16px',
          fontFamily: ASSIST, fontSize: '12px', color: '#E07070',
        }}>
          ⚠️ {store.error}
        </div>
      )}
    </div>
  );
}
