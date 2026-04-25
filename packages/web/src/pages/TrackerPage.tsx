import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrackerStore, type CheckinResult } from '../stores/trackerStore';
import { useAuthStore } from '../stores/authStore';
import { useGardenStore } from '../stores/gardenStore';
import { TrackerCard } from '../components/tracker/TrackerCard';
import { NewTrackerModal } from '../components/tracker/NewTrackerModal';
import { PhotoUpload } from '../components/tracker/PhotoUpload';
import { AnalysisResult } from '../components/tracker/AnalysisResult';

const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

const TIER_TRACKER_LIMITS: Record<string, number | null> = {
  free:         1,
  grower:       3,
  gardener_pro: 10,
  professional: null,
};

export function TrackerPage() {
  const { t, i18n } = useTranslation('tracker');
  const isHe = i18n.language === 'he';
  const { trackers, isLoading, loadTrackers } = useTrackerStore();
  const { profile } = useAuthStore();
  const { activeGarden, loadGardens } = useGardenStore();

  const [showNewTracker, setShowNewTracker] = useState(false);
  const [photoUploadTrackerId, setPhotoUploadTrackerId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CheckinResult | null>(null);

  const tier = profile?.subscription_tier ?? 'free';
  const maxTrackers = TIER_TRACKER_LIMITS[tier] ?? null;
  const trackerCount = trackers.length;
  const atLimit = maxTrackers !== null && trackerCount >= maxTrackers;

  useEffect(() => {
    loadTrackers();
    loadGardens();
  }, []);

  function handleAnalysisComplete(result: CheckinResult) {
    setPhotoUploadTrackerId(null);
    setAnalysisResult(result);
  }

  const photoTracker = photoUploadTrackerId
    ? trackers.find(tr => tr.id === photoUploadTrackerId)
    : null;

  const trackerCountLabel = maxTrackers !== null
    ? (atLimit
        ? t('trackerCountUpgrade', { count: trackerCount, max: maxTrackers })
        : t('trackerCount', { count: trackerCount, max: maxTrackers }))
    : t('trackerCountUnlimited', { count: trackerCount });

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        backgroundColor: EARTH,
        padding: '32px 24px 80px',
        fontFamily: ASST,
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Page header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <h1 style={{ fontFamily: FRANK, fontSize: '32px', color: GOLD, margin: '0 0 6px' }}>
              {t('title')}
            </h1>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: 'rgba(237,224,196,0.55)', margin: 0 }}>
              {t('subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            {/* Tier indicator */}
            <p style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.45)', margin: 0 }}>
              {trackerCountLabel}
            </p>

            {/* Add tracker button */}
            <button
              onClick={() => setShowNewTracker(true)}
              disabled={atLimit}
              style={{
                fontFamily: FRANK,
                fontSize: '15px',
                fontWeight: 700,
                color: atLimit ? 'rgba(237,224,196,0.4)' : EARTH,
                backgroundColor: atLimit ? 'rgba(245,200,64,0.2)' : GOLD,
                border: atLimit ? `1px solid rgba(245,200,64,0.3)` : 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: atLimit ? 'not-allowed' : 'pointer',
                transition: 'filter 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!atLimit) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              title={atLimit ? t('limitTooltip') : ''}
            >
              {t('addButton')}
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }} className="animate-pulse">🌕</div>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: 'rgba(237,224,196,0.45)' }}>
              {t('loading')}
            </p>
          </div>
        ) : trackers.length === 0 ? (
          /* Empty state */
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            border: '1px dashed rgba(245,200,64,0.2)',
            borderRadius: '16px',
            backgroundColor: 'rgba(28,58,30,0.3)',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌱</div>
            <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, marginBottom: '12px' }}>
              {t('empty.title')}
            </h2>
            <p style={{ fontFamily: ASST, fontSize: '15px', color: 'rgba(237,224,196,0.6)', marginBottom: '28px', lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 28px' }}>
              {t('empty.desc')}
            </p>
            <button
              onClick={() => setShowNewTracker(true)}
              style={{
                fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                color: EARTH, backgroundColor: GOLD,
                border: 'none', borderRadius: '8px',
                padding: '12px 28px', cursor: 'pointer',
                transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {t('empty.cta')}
            </button>
          </div>
        ) : (
          /* Tracker grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {trackers.map(tracker => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                onAddCheckin={(id) => setPhotoUploadTrackerId(id)}
                onDeleted={() => {/* optimistic update already done in store */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewTracker && (
        <NewTrackerModal
          onClose={() => setShowNewTracker(false)}
          onCreated={(result) => { setShowNewTracker(false); setAnalysisResult(result); }}
        />
      )}

      {photoUploadTrackerId && photoTracker && (
        <PhotoUpload
          trackerId={photoUploadTrackerId}
          plantNameHe={photoTracker.plant_name_he}
          onClose={() => setPhotoUploadTrackerId(null)}
          onComplete={handleAnalysisComplete}
        />
      )}

      {analysisResult && (
        <AnalysisResult
          analysis={analysisResult.analysis}
          growingPlan={analysisResult.growingPlan}
          checkinDate={analysisResult.checkin.checkin_date}
          tasksAdded={analysisResult.tasks_added}
          onClose={() => { setAnalysisResult(null); loadTrackers(); }}
        />
      )}
    </div>
  );
}
