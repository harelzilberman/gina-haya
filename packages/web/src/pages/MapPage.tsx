import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMapStore } from '../stores/mapStore';
import { useGardenSwitcherStore } from '../stores/gardenSwitcherStore';
import { useAuthStore } from '../stores/authStore';
import { usePlanLimit } from '../hooks/usePlanLimit';
import { UpgradeModal } from '../components/upgrade/UpgradeModal';
import { api } from '../api/client';
import { mergeWithOverrides, type TemplateOverride } from '../data/gardenTemplates';

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

  const ASST = "'DM Sans','Assistant','Heebo',sans-serif";

  return (
    <>
      <style>{SPIN_CSS}</style>
      <div style={{
        position: 'absolute', top: '12px', left: '12px',
        display: 'flex', alignItems: 'center', gap: '6px',
        backgroundColor: 'rgba(9,20,16,0.92)',
        border: `1px solid ${saveError ? 'rgba(217,83,79,0.4)' : 'rgba(0,229,195,0.2)'}`,
        borderRadius: '6px', padding: '5px 10px', zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {isSaving && (
          <>
            <span style={{
              width: '11px', height: '11px', border: '2px solid rgba(176,207,191,0.2)',
              borderTopColor: 'rgba(176,207,191,0.6)', borderRadius: '50%',
              display: 'inline-block', animation: 'mapSpin 0.8s linear infinite', flexShrink: 0,
            }} />
            <span style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(176,207,191,0.55)' }}>שומר...</span>
          </>
        )}
        {!isSaving && showSaved && !saveError && (
          <span style={{ fontFamily: ASST, fontSize: '12px', color: '#4A9C68' }}>נשמר ✓</span>
        )}
        {saveError && (
          <>
            <span style={{ fontFamily: ASST, fontSize: '12px', color: '#d9534f' }}>שגיאה בשמירה</span>
            <button
              onClick={onRetry}
              style={{
                fontFamily: ASST, fontSize: '11px', color: '#00e5c3',
                background: 'none', border: '1px solid rgba(0,229,195,0.35)',
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
import { GardenTemplatesModal } from '../components/map/GardenTemplatesModal';
import { SaveAsTemplateModal } from '../components/map/SaveAsTemplateModal';
import type { GardenTemplate } from '../data/gardenTemplates';

const ADMIN_EMAIL = 'harelzilberman@gmail.com';

export function MapPage() {
  const store = useMapStore();
  const { activeGardenId } = useGardenSwitcherStore();
  const { user, session } = useAuthStore();
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const { tier, limits } = usePlanLimit();
  const [showTour, setShowTour]         = useState(false);
  const [showWizard, setShowWizard]     = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [plantLimitModalOpen, setPlantLimitModalOpen] = useState(false);
  const hasCheckedTemplates = useRef(false);
  const appliedNavTemplate = useRef(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleReopenTour = () => { localStorage.removeItem('has-seen-map-tour'); setShowTour(true); };

  function handleApplyTemplate(template: GardenTemplate) {
    store.applyTemplate(template.elements);
    store.setActiveTemplate({
      id: template.id,
      titleHe: template.title.he,
      titleEn: template.title.en,
      descHe: template.description.he,
      descEn: template.description.en,
      icon: template.icon,
      categoryHe: template.category.he,
      categoryEn: template.category.en,
    });
    setShowTemplates(false);
    setToast(isHe ? `תבנית "${template.title.he}" הוחלה! 🗺️` : `Template "${template.title.en}" applied! 🗺️`);
    setTimeout(() => setToast(null), 3000);
  }

  // clear any stale collapse state from previous version
  localStorage.removeItem('map-panel-collapsed');

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

  // Apply template from admin "Open in Map" navigation
  useEffect(() => {
    const templateId = (navState as any)?.applyTemplateId;
    if (!templateId || store.isLoading || appliedNavTemplate.current) return;
    appliedNavTemplate.current = true;
    api.get<TemplateOverride[]>('/api/templates').then(overrides => {
      const merged = mergeWithOverrides(overrides);
      const tpl = merged.find(t => t.id === templateId);
      if (tpl) handleApplyTemplate(tpl);
    }).catch(() => {});
    // Clear nav state so it doesn't re-apply on re-render
    window.history.replaceState({}, document.title);
  }, [store.isLoading, navState]);

  // Auto-open templates gallery when map loads empty (first time or still no elements)
  useEffect(() => {
    if (store.isLoading) { hasCheckedTemplates.current = false; return; }
    if (!hasCheckedTemplates.current) {
      hasCheckedTemplates.current = true;
      const isEmpty = store.mapData.objects.length === 0 && store.mapData.plants.length === 0;
      if (isEmpty && !shouldShowTour()) setShowTemplates(true);
    }
  }, [store.isLoading]);

  if (store.isLoading) {
    return (
      <div style={{ background: '#050d0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '48px' }}>🗺️</span>
      </div>
    );
  }

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ background: '#050d0a' }}>
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
          onTour={handleReopenTour}
          onTemplates={() => setShowTemplates(true)}
          isAdmin={isAdmin}
          onSaveAsTemplate={isAdmin ? () => setShowSaveAsTemplate(true) : undefined}
          saveAsTemplateDisabled={store.mapData.objects.length === 0}
        />
        <div data-tour="canvas" style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', paddingInlineEnd: store.selectedTool === 'plant' ? '260px' : '0px' }}>
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

        {/* Plant picker panel */}
        {store.selectedTool === 'plant' && (
          <div style={{
            position: 'absolute',
            top: '56px',
            insetInlineEnd: 0,
            width: '260px',
            height: 'calc(100% - 56px)',
            overflow: 'hidden',
            background: 'rgba(9,20,16,0.97)',
            borderInlineStart: '1px solid rgba(0,229,195,0.15)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <PlantPicker
              activePlant={store.activePlant}
              onSetActivePlant={store.setActivePlant}
            />
          </div>
        )}
      </div>

      <MapTour
        isOpen={showTour}
        onComplete={() => { localStorage.setItem('has-seen-map-tour', 'true'); setShowTour(false); }}
        onSkip={() => { localStorage.setItem('has-seen-map-tour', 'true'); setShowTour(false); }}
      />

      <GardenTemplatesModal
        isOpen={showTemplates}
        hasExistingElements={store.mapData.objects.length > 0 || store.mapData.plants.length > 0}
        onApply={handleApplyTemplate}
        onClose={() => setShowTemplates(false)}
      />

      <SaveAsTemplateModal
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        onSuccess={msg => { setToast(msg); setTimeout(() => setToast(null), 3000); }}
        mapObjects={store.mapData.objects}
        activeTemplate={store.activeTemplate}
        token={session?.access_token}
      />

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
          background: 'rgba(9,20,16,0.97)', border: '1px solid rgba(0,229,195,0.3)',
          borderRadius: '10px', padding: '10px 20px', zIndex: 500,
          fontFamily: "'DM Sans','Assistant','Heebo',sans-serif", fontSize: '13px', color: '#e8f5ee',
          whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

    </div>
  );
}
