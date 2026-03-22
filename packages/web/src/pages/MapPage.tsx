import { useEffect, useState } from 'react';
import { useMapStore } from '../stores/mapStore';
import { MapToolbar } from '../components/map/MapToolbar';
import { GardenCanvas } from '../components/map/GardenCanvas';
import { PlantPicker } from '../components/map/PlantPicker';
import { MapTour, shouldShowTour } from '../components/map/MapTour';
import { WizardModal } from '../components/map/WizardModal';

export function MapPage() {
  const store = useMapStore();
  const [showTour, setShowTour]     = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleConfirmPreview = () => {
    const count = store.previewPlants.length;
    store.confirmPlantPreview();
    setToast(`${count} צמחים נוספו למפה! 🌱`);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    store.loadMap();
    store.loadWizardStatus();
  }, []);

  useEffect(() => {
    if (!store.isLoading && shouldShowTour()) setShowTour(true);
  }, [store.isLoading]);

  if (store.isLoading) {
    return (
      <div style={{ background: '#142B16', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '48px' }}>🗺️</span>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: '#142B16' }}>
      {/* Toolbar — fixed, sits below the 64px navbar */}
      <MapToolbar
        selectedTool={store.selectedTool}
        onToolChange={store.setTool}
        showSunZones={store.showSunZones}
        onToggleSunZones={store.toggleSunZones}
        northAngle={store.northAngle}
        onNorthAngleChange={store.setNorthAngle}
        isSaving={store.isSaving}
        isDirty={store.isDirty}
        onSave={store.saveMap}
        onUndo={store.undo}
        onWizard={() => setShowWizard(true)}
        wizardStatus={store.wizardStatus}
        hasSavedMap={!!store.mapId}
      />

      {/* Canvas area — starts at 116px (64 navbar + 52 toolbar), fills rest of viewport */}
      <div style={{ position: 'fixed', top: '116px', left: 0, right: 0, bottom: 0, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GardenCanvas
            mapData={store.mapData}
            northAngle={store.northAngle}
            selectedTool={store.selectedTool}
            activePlant={store.activePlant}
            selectedObjectId={store.selectedObjectId}
            showSunZones={store.showSunZones}
            onAddObject={store.addObject}
            onUpdateObject={store.updateObject}
            onDeleteObject={store.deleteObject}
            onAddPlant={store.addPlant}
            onUpdatePlant={store.updatePlant}
            onRemovePlant={store.removePlant}
            onSelectObject={store.selectObject}
            onSetNorthAngle={store.setNorthAngle}
            previewPlants={store.previewPlants}
            onConfirmPreview={handleConfirmPreview}
            onCancelPreview={store.cancelPlantPreview}
          />
        </div>

        {/* Plant picker panel — shown in Part 2 */}
        {store.selectedTool === 'plant' && (
          <PlantPicker
            activePlant={store.activePlant}
            onSetActivePlant={store.setActivePlant}
          />
        )}
      </div>

      {showTour && <MapTour onDone={() => setShowTour(false)} />}

      {showWizard && store.mapId && (
        <WizardModal
          mapId={store.mapId}
          wizardStatus={store.wizardStatus}
          onClose={() => setShowWizard(false)}
          onRefreshStatus={store.loadWizardStatus}
          onPlacePlants={plants => { store.setPreviewPlants(plants); setShowWizard(false); }}
        />
      )}

      {/* Success toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(74,128,80,0.97)', border: '1px solid rgba(125,192,132,0.3)',
          borderRadius: '10px', padding: '10px 20px', zIndex: 500,
          fontFamily: '"Assistant","Heebo",sans-serif', fontSize: '13px', color: '#E8F5E9',
          whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      {/* First-time hint to create map */}
      {!store.mapId && !store.isLoading && (
        <div style={{
          position: 'fixed', bottom: '80px', insetInlineStart: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,43,22,0.97)', border: '1px solid rgba(245,200,64,0.2)',
          borderRadius: '10px', padding: '10px 16px', zIndex: 50,
          display: 'flex', alignItems: 'center', gap: '10px',
          fontFamily: '"Assistant","Heebo",sans-serif', fontSize: '13px', color: 'rgba(237,224,196,0.7)',
        }}>
          התחל לצייר — המפה תישמר אוטומטית
          <button
            onClick={() => store.createMap()}
            style={{
              fontFamily: '"Assistant","Heebo",sans-serif', fontSize: '12px', fontWeight: 600,
              padding: '5px 12px', borderRadius: '6px', border: 'none',
              backgroundColor: '#F5C840', color: '#142B16', cursor: 'pointer',
            }}
          >
            צור מפה
          </button>
        </div>
      )}
    </div>
  );
}
