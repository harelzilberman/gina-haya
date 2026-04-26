import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import { MapToolbar } from '../components/map/MapToolbar';
import { GardenCanvas } from '../components/map/GardenCanvas';
import { PlantPicker } from '../components/map/PlantPicker';
import { MapTour, shouldShowTour } from '../components/map/MapTour';
import { WizardModal } from '../components/map/WizardModal';

export function MapPage() {
  const store = useMapStore();
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const [showTour, setShowTour]     = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleConfirmPreview = () => {
    store.mapData.objects.forEach(o => {
      if (!o.locked) store.updateObject(o.id, { locked: true });
    });
    const count = store.previewPlants.length;
    store.confirmPlantPreview();
    setToast(isHe ? `${count} צמחים נוספו למפה! 🌱` : `${count} plants added to the map! 🌱`);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const init = async () => {
      await store.loadMap();
      if (!useMapStore.getState().mapId) {
        await store.createMap();
      }
      store.loadWizardStatus();
    };
    init();
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
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ background: '#142B16' }}>
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
        hasSavedMap={true}
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
            onToggleLock={store.toggleLock}
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
          mapData={store.mapData}
          northAngle={store.northAngle}
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

    </div>
  );
}
