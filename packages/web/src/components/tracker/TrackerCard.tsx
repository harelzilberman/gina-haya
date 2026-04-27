import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tracker, TrackerCheckin } from '../../stores/trackerStore';
import { CheckinHistory } from './CheckinHistory';
import { useTrackerStore } from '../../stores/trackerStore';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const SAGE  = '#4A7C59';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

const HEALTH_COLOURS: Record<string, string> = {
  excellent: '#5cb85c',
  good:      '#7DC084',
  fair:      '#e6a817',
  poor:      '#d9534f',
};

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  tracker: Tracker;
  onAddCheckin: (trackerId: string) => void;
  onDeleted: () => void;
}

export function TrackerCard({ tracker, onAddCheckin, onDeleted }: Props) {
  const { t, i18n } = useTranslation('tracker');
  const isHe = i18n.language === 'he';
  const { deleteTracker } = useTrackerStore();
  const { session } = useAuthStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [checkins, setCheckins] = useState<TrackerCheckin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const latest = tracker.latest_checkin;
  const analysis = latest?.ai_analysis;
  const healthColor = analysis ? (HEALTH_COLOURS[analysis.health] ?? SAGE) : 'rgba(237,224,196,0.2)';
  const healthLabel = analysis ? (isHe ? analysis.healthHe : ((analysis as any).healthEn ?? analysis.health)) : null;
  const stageLabel  = analysis ? (isHe ? analysis.growthStageHe : ((analysis as any).growthStageEn ?? analysis.growthStageHe)) : null;

  async function handleExpand() {
    if (!isExpanded && checkins.length === 0 && session?.access_token) {
      setLoadingCheckins(true);
      try {
        const data = await api.get<{ checkins?: TrackerCheckin[] } & { id: string }>(
          `/api/trackers/${tracker.id}`,
          session.access_token
        );
        setCheckins((data as any).checkins ?? []);
      } catch {
        // ignore
      } finally {
        setLoadingCheckins(false);
      }
    }
    setIsExpanded(v => !v);
  }

  async function handleDelete() {
    await deleteTracker(tracker.id);
    onDeleted();
  }

  return (
    <div
      style={{
        backgroundColor: 'rgba(28,58,30,0.7)',
        border: `1px solid ${isExpanded ? 'rgba(245,200,64,0.3)' : 'rgba(245,200,64,0.12)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Card header */}
      <div
        onClick={handleExpand}
        style={{ padding: '16px 18px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          {/* Right side: health dot + location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: healthColor,
                boxShadow: `0 0 6px ${healthColor}88`,
              }} />
              <span style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.5)' }}>
                {t(`card.locations.${tracker.location_type}`, { defaultValue: tracker.location_type })}
              </span>
            </div>
            {tracker.location_description && (
              <span style={{ fontFamily: ASST, fontSize: '11px', color: 'rgba(237,224,196,0.35)' }}>
                {tracker.location_description}
              </span>
            )}
          </div>

          {/* Left side: plant name */}
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 2px' }}>
              {isHe ? tracker.plant_name_he : (tracker.plant_name_en || tracker.plant_name_he)}
            </h3>
            <p style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.5)', margin: 0, fontStyle: 'italic' }}>
              {isHe ? tracker.plant_name_en : tracker.plant_name_he}
            </p>
          </div>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Health + stage badges */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {analysis && (
              <>
                <span style={{
                  padding: '2px 10px', borderRadius: '12px', fontFamily: ASST, fontSize: '11px', fontWeight: 600,
                  backgroundColor: `${healthColor}22`, border: `1px solid ${healthColor}55`, color: healthColor,
                }}>
                  {healthLabel}
                </span>
                <span style={{
                  padding: '2px 10px', borderRadius: '12px', fontFamily: ASST, fontSize: '11px',
                  backgroundColor: 'rgba(74,124,89,0.2)', border: '1px solid rgba(74,124,89,0.4)', color: '#7DC084',
                }}>
                  {stageLabel}
                </span>
              </>
            )}
          </div>

          {/* Last checkin */}
          <div style={{ textAlign: 'right' }}>
            {latest ? (
              <p style={{ fontFamily: ASST, fontSize: '11px', color: 'rgba(237,224,196,0.45)', margin: 0 }}>
                {t('card.lastCheckin', { count: daysSince(latest.checkin_date) })}
              </p>
            ) : (
              <p style={{ fontFamily: ASST, fontSize: '11px', color: 'rgba(237,224,196,0.3)', margin: 0 }}>
                {t('card.neverChecked')}
              </p>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <span style={{ fontFamily: ASST, fontSize: '11px', color: 'rgba(245,200,64,0.4)' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 18px',
        borderTop: '1px solid rgba(245,200,64,0.08)',
        backgroundColor: 'rgba(0,0,0,0.15)',
      }}>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.6)' }}>
              {t('card.deleteConfirm')}
            </span>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('card.cancel')}
            </button>
            <button
              onClick={handleDelete}
              style={{ fontFamily: ASST, fontSize: '12px', color: '#e06060', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {t('card.delete')}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                fontFamily: ASST, fontSize: '12px', color: 'rgba(220,100,100,0.5)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 8px', borderRadius: '4px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e06060'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(220,100,100,0.5)'; }}
            >
              {t('card.delete')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddCheckin(tracker.id); }}
              style={{
                fontFamily: FRANK, fontSize: '14px', fontWeight: 600,
                color: '#142B16',
                backgroundColor: GOLD,
                border: 'none',
                borderRadius: '20px',
                padding: '6px 18px',
                cursor: 'pointer',
                transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {t('card.addCheckin')}
            </button>
          </>
        )}
      </div>

      {/* Expanded checkin history */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid rgba(245,200,64,0.12)',
          padding: '12px 18px',
          maxHeight: '500px',
          overflowY: 'auto',
        }}>
          {loadingCheckins ? (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <span style={{ fontSize: '24px' }} className="animate-pulse">🌕</span>
            </div>
          ) : (
            <CheckinHistory checkins={checkins} />
          )}
        </div>
      )}
    </div>
  );
}
