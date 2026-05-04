import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../stores/mapStore';
import { useGardenSwitcherStore } from '../stores/gardenSwitcherStore';
import { usePlanLimit } from '../hooks/usePlanLimit';
import { UpgradeModal } from '../components/upgrade/UpgradeModal';

const SPIN_CSS = `
@keyframes mapSpin { to { transform: rotate(360deg); } }
.gina-toolbar-scroll::-webkit-scrollbar { display: none; }
`;

function SaveIndicator({ isSaving, lastSaved, saveError, onRetry }: {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  onRetry: () => void;
}) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!lastSaved) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [lastSaved]);

  if (!isSaving && !showSaved && !saveError) return null;

  const ASST = '"Assistant","Heebo",sans-serif';

  return (
    <>
      <style>{SPIN_CSS}</style>
      <div style={{
        position: 'absolute', top: '12px', left: '12px',
        display: 'flex', alignItems: 'center', gap: '6px',
        backgroundColor: 'rgba(20,43,22,0.92)',
        border: `1px solid ${saveError ? 'rgba(217,83,79,0.4)' : 'rgba(245,200,64,0.2)'}`,
        borderRadius: '6px', padding: '5px 10px', zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {isSaving && (
          <>
            <span style={{
              width: '11px', height: '11px', border: '2px solid rgba(237,224,196,0.2)',
              borderTopColor: 'rgba(237,224,196,0.6)', borderRadius: '50%',
              display: 'inline-block', animation: 'mapSpin 0.8s linear infinite', flexShrink: 0,
            }} />
            <span style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.55)' }}>שומר...</span>
          </>
        )}
        {!isSaving && showSaved && !saveError && (
          <span style={{ fontFamily: ASST, fontSize: '12px', color: '#7DC084' }}>נשמר ✓</span>
        )}
        {saveError && (
          <>
            <span style={{ fontFamily: ASST, fontSize: '12px', color: '#d9534f' }}>שגיאה בשמירה</span>
            <button
              onClick={onRetry}
              style={{
                fontFamily: ASST, fontSize: '11px', color: '#F5C840',
                background: 'none', border: '1px solid rgba(245,200,64,0.35)',
                borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', marginRight: '2px',
              }}
            >
              נסה שנית
            </button>
          </>
        )}
      </div>
    </>
  );
}
import { MapToolbar } from '../components/map/MapToolbar';
import { GardenCanvas } from '../components/map/GardenCanvas';
import { PlantPicker } from '../components/map/PlantPicker';
import { MapTour, shouldShowTour } from '../components/map/MapTour';
import { WizardModal } from '../components/map/WizardModal';

export function MapPage() {
  const store = useMapStore();
  const { activeGardenId } = useGardenSwitcherStore();
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const navigate = useNavigate();
  const { tier, limits } = usePlanLimit();
  const [showTour, setShowTour]     = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [plantLimitModalOpen, setPlantLimitModalOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(
    () => window.innerWidth < 1100 || localStorage.getItem('map-panel-collapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('map-panel-collapsed', panelCollapsed ? 'true' : 'false');
  }, [panelCollapsed]);

  const plantCount = store.mapData.plants.length;
  const plantsAtLimit = limits.maxPlantsPerGarden !== null && plantCount >= limits.maxPlantsPerGarden;

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
    if (!activeGardenId) return;
    const init = async () => {
      await store.loadMap(activeGardenId);
      if (!useMapStore.getState().mapId) {
        await store.createMap(activeGardenId);
      }
      store.loadWizardStatus();
    };
    init();
  }, [activeGardenId]);

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
      {/* Canvas area — fills viewport between navbar and bottom nav */}
      <div style={{ position: 'fixed', top: 'var(--navbar-height)', insetInlineStart: 0, insetInlineEnd: 0, height: 'calc(100dvh - var(--navbar-height) - var(--bottomnav-height))', display: 'flex', flexDirection: isHe ? 'row-reverse' : 'row', overflow: 'hidden' }}>
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
        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          <SaveIndicator
            isSaving={store.isSaving}
            lastSaved={store.lastSaved}
            saveError={store.saveError}
            onRetry={store.saveMap}
          />
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
            plantsAtLimit={plantsAtLimit}
            onPlantsAtLimitClick={() => setPlantLimitModalOpen(true)}
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

        {/* Plant picker panel — collapsible */}
        {store.selectedTool === 'plant' && (
          <div style={{
            width: panelCollapsed ? '32px' : '260px',
            transition: 'width 0.2s ease',
            flexShrink: 0,
            height: '100%',
            overflow: 'hidden',
            background: 'rgba(20,43,22,0.97)',
            borderInlineStart: panelCollapsed ? '1px solid rgba(245,200,64,0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <button
              onClick={() => setPanelCollapsed(v => !v)}
              style={{
                width: '100%', padding: '8px 0', flexShrink: 0,
                background: 'none', border: 'none', borderBottom: '1px solid rgba(245,200,64,0.08)',
                cursor: 'pointer', fontSize: '12px', color: 'rgba(237,224,196,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title={panelCollapsed ? 'הרחב פאנל' : 'כווץ פאנל'}
            >
              {panelCollapsed ? '◀' : '▶'}
            </button>
            {!panelCollapsed && (
              <PlantPicker
                activePlant={store.activePlant}
                onSetActivePlant={store.setActivePlant}
              />
            )}
          </div>
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

      <UpgradeModal
        isOpen={plantLimitModalOpen}
        onClose={() => setPlantLimitModalOpen(false)}
        limitType="plants"
        currentTier={tier}
      />

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
