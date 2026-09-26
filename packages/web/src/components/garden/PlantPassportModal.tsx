import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GardenPlant } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import type { Tracker, TimelineEntry, CheckinResult } from '../../stores/trackerStore';
import { useTrackerStore } from '../../stores/trackerStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { useChupChuPanelStore } from '../../stores/chupChuPanelStore';
import { api } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { locationLabel } from './PlantingBase';
import { DAY_LETTERS_HE } from '../../constants/days';
import { EditPlantSheet } from './EditPlantSheet';
import { NewTrackerModal } from '../tracker/NewTrackerModal';
import { PhotoUpload } from '../tracker/PhotoUpload';
import { AnalysisResult } from '../tracker/AnalysisResult';

const NIGHT      = '#0a1712';
const NIGHT_CARD = '#1a3226';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#c8e2d4';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const HEALTH_STYLE: Record<string, { bg: string; fg: string }> = {
  excellent: { bg: '#EAF3DE', fg: '#3B6D11' },
  good:      { bg: '#EAF3DE', fg: '#3B6D11' },
  fair:      { bg: '#FAEEDA', fg: '#854F0B' },
  poor:      { bg: '#FCEBED', fg: '#A32D2D' },
};

const PLANT_TYPE_EMOJI: Record<string, string> = { tree: '🌳', shrub: '🌳', perennial: '🔁', annual: '🌱' };

// Legacy Hebrew sun-exposure values → canonical enum keys.
const SUN_EXPOSURE_LEGACY: Record<string, string> = {
  '\u05E9\u05DE\u05E9 \u05DE\u05DC\u05D0\u05D4': 'full_sun',
  '\u05D7\u05E6\u05D9 \u05E6\u05DC': 'partial_shade',
  '\u05E6\u05DC': 'shade',
};

function normaliseSunExposure(v: string | null | undefined): string {
  if (!v) return '';
  return SUN_EXPOSURE_LEGACY[v] ?? v;
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  date: string;
  notes: string | null;
  garden_plants_id: string | null;
}

interface Props {
  plant:      GardenPlant;
  tracker:    Tracker | null;
  gardenName: string;
  gardenId:   string;
  onClose:    () => void;
}

export function PlantPassportModal({ plant, tracker, gardenName, gardenId, onClose }: Props) {
  const { t, i18n } = useTranslation('garden');
  const isHe = i18n.language === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const locale = isHe ? 'he-IL' : 'en-US';
  const headingFont = isHe ? FRANK : DM_SANS;

  const { patchGardenPlant, removePlant } = useGardenStore();
  const { getPlantTimeline, logWater, logFertilize, addNote, loadTrackers } = useTrackerStore();
  const { session } = useAuthStore();
  const { show: showToast } = useToastStore();
  const { open: openChupChu } = useChupChuPanelStore();

  const [timeline,         setTimeline]         = useState<TimelineEntry[]>([]);
  const [loadingTimeline,  setLoadingTimeline]  = useState(true);
  const [tasks,            setTasks]            = useState<TaskRow[]>([]);
  const [loadingTasks,     setLoadingTasks]     = useState(true);
  const [busyAction,       setBusyAction]       = useState<string | null>(null);
  const [showEdit,         setShowEdit]         = useState(false);
  const [showNoteInput,    setShowNoteInput]    = useState(false);
  const [noteText,         setNoteText]         = useState('');
  const [showEndOfSeason,  setShowEndOfSeason]  = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [photoUploadOpen,  setPhotoUploadOpen]  = useState(false);
  const [analysisResult,   setAnalysisResult]   = useState<CheckinResult | null>(null);

  const isArchived = !!plant.archived_at;
  const health     = tracker?.latest_checkin?.ai_analysis ?? null;
  const healthStyle = health ? (HEALTH_STYLE[health.health] ?? HEALTH_STYLE.good) : null;

  // Display name: prefer English when UI is English and English name exists.
  const displayName = !isHe && plant.common_name_en ? plant.common_name_en : plant.common_name_he;

  async function refreshTimeline() {
    setLoadingTimeline(true);
    try {
      const data = await getPlantTimeline(plant.id);
      setTimeline(data);
    } catch {
      // non-fatal — passport still usable without history
    } finally {
      setLoadingTimeline(false);
    }
  }

  useEffect(() => {
    refreshTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant.id]);

  useEffect(() => {
    (async () => {
      if (!session?.access_token) return;
      setLoadingTasks(true);
      try {
        const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const to   = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
        const all = await api.get<TaskRow[]>(
          `/api/tasks/range?from=${from}&to=${to}&include_archived=true`,
          session.access_token
        );
        setTasks((all ?? []).filter(tr => tr.garden_plants_id === plant.id));
      } catch {
        // non-fatal
      } finally {
        setLoadingTasks(false);
      }
    })();
  }, [plant.id, session?.access_token]);

  const wateringCount = tracker?.watering_count ?? timeline.filter(e => e.entry_type === 'watering').length;
  const photoCount     = timeline.filter(e => e.entry_type === 'photo').length;
  const daysInGarden   = daysSince(plant.added_at) ?? 0;
  const lastWatered = plant.last_watering?.at
    ?? tracker?.last_watered_at
    ?? timeline.find(e => e.entry_type === 'watering')?.created_at
    ?? null;
  const lastWateredSource = plant.last_watering?.source ?? null;

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusyAction(key);
    try {
      await fn();
    } catch (err: any) {
      showToast(err.message || t('passport.errorToast'), 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWater() {
    await withBusy('water', async () => {
      await logWater(plant.id, tracker?.id ?? null);
      showToast(t('passport.waterToast'), 'info');
      refreshTimeline();
    });
  }

  async function handleFertilize() {
    await withBusy('fertilize', async () => {
      await logFertilize(plant.id, tracker?.id ?? null);
      showToast(t('passport.fertilizeToast'), 'info');
      refreshTimeline();
    });
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    await withBusy('note', async () => {
      await addNote(plant.id, noteText.trim(), tracker?.id ?? null);
      setNoteText('');
      setShowNoteInput(false);
      showToast(t('passport.noteToast'), 'info');
      refreshTimeline();
    });
  }

  async function handleArchive() {
    await withBusy('archive', async () => {
      await patchGardenPlant(plant.id, gardenId, { archivedAt: new Date().toISOString() });
      showToast(t('passport.archiveToast'), 'info');
    });
  }

  async function handleRestore() {
    await withBusy('restore', async () => {
      await patchGardenPlant(plant.id, gardenId, { archivedAt: null });
      showToast(t('passport.restoreToast'), 'info');
    });
  }

  async function handleDelete() {
    await withBusy('delete', async () => {
      await removePlant(gardenId, plant.id);
      showToast(t('passport.deleteToast'), 'info');
      onClose();
    });
  }

  async function toggleTask(task: TaskRow) {
    if (!session?.access_token) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks(prev => prev.map(tr => tr.id === task.id ? { ...tr, status: newStatus } : tr));
    try {
      await api.patch(`/api/tasks/${task.id}`, { status: newStatus }, session.access_token);
    } catch {
      setTasks(prev => prev.map(tr => tr.id === task.id ? { ...tr, status: task.status } : tr));
    }
  }

  async function deleteTask(taskId: string) {
    if (!session?.access_token) return;
    setTasks(prev => prev.filter(tr => tr.id !== taskId));
    try {
      await api.del(`/api/tasks/${taskId}`, session.access_token);
    } catch {
      // best-effort
    }
  }

  const chip = (label: string, value: React.ReactNode, icon?: string) => (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '2px',
      background: 'rgba(0,229,195,0.09)', border: '1px solid rgba(0,229,195,0.2)',
      borderRadius: '10px', padding: '10px 12px',
    }}>
      <span style={{ fontFamily: DM_SANS, fontSize: '10px', color: `${TEXT_MID}82` }}>{icon ? `${icon} ` : ''}{label}</span>
      <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, fontWeight: 600 }}>{value}</span>
    </div>
  );

  // Build detail chips with translated labels
  const detailChips: React.ReactNode[] = [];
  detailChips.push(chip(t('passport.locationType'), locationLabel(plant.location_type, t), LOCATION_EMOJI(plant.location_type)));
  if (plant.location_description) detailChips.push(chip(t('passport.locationPlace'), plant.location_description));
  if (plant.sun_exposure) {
    const sunKey = normaliseSunExposure(plant.sun_exposure);
    detailChips.push(chip(t('passport.sunExposure'), t(`sunExposure.${sunKey}`, { defaultValue: plant.sun_exposure }), '☀️'));
  }
  const lastWateredLabel = lastWatered
    ? `${formatDate(lastWatered, locale)}${lastWateredSource === 'scheduled' ? ' ' + t('passport.scheduledSuffix') : ''}`
    : t('passport.notWateredYet');
  detailChips.push(chip(t('passport.lastWatered'), lastWateredLabel, '💧'));
  if (plant.companions) detailChips.push(chip(t('passport.companions'), plant.companions));
  if (plant.soil) detailChips.push(chip(t('passport.soil'), plant.soil));
  if (plant.plant_type) {
    detailChips.push(chip(
      t('passport.plantType'),
      t(`plantType.${plant.plant_type}`, { defaultValue: plant.plant_type }),
      PLANT_TYPE_EMOJI[plant.plant_type]
    ));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={dir}
      style={{ position: 'fixed', inset: 0, zIndex: 220, background: NIGHT, overflowY: 'auto' }}
    >
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 60px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <button onClick={onClose} style={iconBtnStyle} aria-label="Close">✕</button>
          <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}82` }}>{gardenName}</span>
          {isArchived ? (
            <button onClick={handleRestore} style={iconBtnStyle} aria-label="Restore" disabled={busyAction === 'restore'}>↺</button>
          ) : (
            <button onClick={() => setShowEndOfSeason(true)} style={iconBtnStyle} aria-label="End season / Delete">🗑</button>
          )}
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }}>🌱</div>
          <h1 style={{ fontFamily: headingFont, fontSize: '22px', fontWeight: 700, color: TEXT_MID, margin: '10px 0 2px' }}>
            {displayName}
          </h1>
          {plant.variety && (
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}88`, margin: '0 0 4px' }}>{plant.variety}</p>
          )}
          <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}78`, margin: '0 0 10px', direction: 'ltr' }}>
            {locationLabel(plant.location_type, t)}{plant.location_description ? ` · ${plant.location_description}` : ''}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {healthStyle && (
              <span style={{
                fontFamily: DM_SANS, fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '50px',
                background: healthStyle.bg, color: healthStyle.fg,
              }}>
                {health!.healthHe}
              </span>
            )}
            {plant.auto_irrigation && (
              <IrrigationBadge plant={plant} onEditClick={() => { if (!isArchived) setShowEdit(true); }} isArchived={isArchived} tGarden={t} isHe={isHe} />
            )}
          </div>
        </div>

        {/* Latest-report summary */}
        {tracker && health && (
          <div style={{ padding: '12px 14px', marginBottom: '14px', borderRadius: '12px', background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.24)' }}>
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, margin: '0 0 4px', fontWeight: 600 }}>
              {health.growthStageHe} · {health.healthHe}
            </p>
            {tracker.latest_checkin?.checkin_date && (
              <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}74`, margin: '0 0 4px' }}>
                {formatDate(tracker.latest_checkin.checkin_date, locale)}
              </p>
            )}
            <p style={{
              fontFamily: DM_SANS, fontSize: '12.5px', color: `${TEXT_MID}93`, margin: 0, lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}>
              {health.observations}
            </p>
          </div>
        )}

        {/* Archive badge */}
        {isArchived && plant.archived_at && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '14px',
            borderRadius: '10px', background: 'rgba(200,160,64,0.12)', border: '1px solid rgba(200,160,64,0.3)',
          }}>
            <span>🍂</span>
            <span style={{ fontFamily: DM_SANS, fontSize: '12.5px', color: '#C8A040' }}>
              {t('passport.endedSeason', { date: formatDate(plant.archived_at, locale) })}
            </span>
          </div>
        )}

        {/* Chupchu bar */}
        <button
          onClick={() => openChupChu(t('passport.openChupChu', { name: plant.common_name_he }))}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
            padding: '11px 14px', marginBottom: '14px', borderRadius: '12px',
            background: 'rgba(0,229,195,0.08)', border: '1px solid rgba(0,229,195,0.25)',
            cursor: 'pointer', textAlign: isHe ? 'right' : 'left',
          }}
        >
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: BIO_CYAN, flex: 1 }}>
            {t('passport.askChupChu', { name: displayName })}
          </span>
          <span style={{ color: `${BIO_CYAN}80` }}>‹</span>
        </button>

        {/* Quick actions */}
        {!isArchived && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <QuickAction emoji="💧" label={t('quickAction.water')} busy={busyAction === 'water'} onClick={handleWater} />
            <QuickAction emoji="🌿" label={t('quickAction.fertilize')} busy={busyAction === 'fertilize'} onClick={handleFertilize} />
            <QuickAction
              emoji="📸" label={t('quickAction.photo')}
              disabled={!tracker}
              title={!tracker ? t('passport.needsTrackerToPhoto') : undefined}
              onClick={() => setPhotoUploadOpen(true)}
            />
            <QuickAction emoji="📝" label={t('quickAction.note')} onClick={() => setShowNoteInput(v => !v)} />
          </div>
        )}

        {showNoteInput && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={t('passport.notePlaceholder')}
              style={{
                flex: 1, boxSizing: 'border-box', backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
                borderRadius: '8px', padding: '10px 12px', fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID,
                direction: dir,
              }}
            />
            <button
              onClick={handleSaveNote}
              disabled={busyAction === 'note'}
              style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: BIO_CYAN, color: '#050d0a', fontFamily: headingFont, fontWeight: 700, cursor: 'pointer' }}
            >
              {t('passport.saveNote')}
            </button>
          </div>
        )}

        {/* Details grid */}
        <SectionHeader
          title={t('passport.plantDetails')}
          action={!isArchived ? { label: t('passport.editAction'), onClick: () => setShowEdit(true) } : undefined}
          headingFont={headingFont}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {detailChips}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '22px', padding: '14px 0', borderTop: '1px solid rgba(0,229,195,0.16)', borderBottom: '1px solid rgba(0,229,195,0.16)' }}>
          <Stat value={daysInGarden} label={t('passport.daysInGarden')} headingFont={headingFont} />
          <Stat value={wateringCount} label={t('passport.wateringCount')} headingFont={headingFont} />
          <Stat value={photoCount} label={t('passport.photoCount')} headingFont={headingFont} />
        </div>

        {/* Tracker section */}
        {(!tracker && !isArchived) || (tracker && !health) ? (
          <>
            <SectionHeader title={t('passport.growthTracker')} headingFont={headingFont} />
            {tracker ? (
              <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}82`, marginBottom: '20px' }}>
                {t('passport.noAnalysis')}
              </p>
            ) : (
              <div style={{
                padding: '18px', marginBottom: '20px', borderRadius: '12px', textAlign: 'center',
                background: 'rgba(74,156,104,0.1)', border: '1px solid rgba(74,156,104,0.3)',
              }}>
                <p style={{ fontFamily: headingFont, fontSize: '15px', color: '#4A9C68', margin: '0 0 4px' }}>{t('passport.smartTracker')}</p>
                <p style={{ fontFamily: DM_SANS, fontSize: '12.5px', color: `${TEXT_MID}88`, margin: '0 0 12px' }}>
                  {t('passport.smartTrackerDesc')}
                </p>
                <button
                  onClick={() => setShowTrackerModal(true)}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#4A9C68', color: '#fff', fontFamily: headingFont, fontWeight: 700, cursor: 'pointer' }}
                >
                  {t('passport.start')}
                </button>
              </div>
            )}
          </>
        ) : null}

        {/* Tasks section */}
        <SectionHeader title={isArchived ? t('passport.pastSeasonTasks') : t('passport.upcomingTasks')} headingFont={headingFont} />
        <div style={{ marginBottom: '20px' }}>
          {loadingTasks ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}74` }}>{t('passport.loading')}</p>
          ) : tasks.length === 0 ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}74` }}>{t('passport.noTasks')}</p>
          ) : (
            tasks.slice(0, 5).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px' }}>
                <input type="checkbox" checked={task.status === 'completed'} disabled={isArchived} onChange={() => toggleTask(task)} />
                <span style={{
                  flex: 1, fontFamily: DM_SANS, fontSize: '13px',
                  color: task.status === 'completed' ? `${TEXT_MID}66` : TEXT_MID,
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </span>
                <span style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}74` }}>{task.date}</span>
                {!isArchived && (
                  <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: `${TEXT_MID}66`, cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))
          )}
          {tasks.length > 5 && (
            <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}74`, marginTop: '4px' }}>
              {t('passport.moreTasks', { count: tasks.length - 5 })}
            </p>
          )}
        </div>

        {/* Timeline */}
        <SectionHeader title={t('passport.allHistory')} headingFont={headingFont} />
        <div>
          {loadingTimeline ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}74` }}>{t('passport.loading')}</p>
          ) : timeline.length === 0 ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}74` }}>{t('passport.noHistory')}</p>
          ) : (
            timeline.map((entry, i) => {
              const color = ENTRY_COLOR[entry.entry_type] ?? '#C8A951';
              const emoji = ENTRY_EMOJI[entry.entry_type] ?? '📝';
              const label = t(`entryType.${entry.entry_type}`, { defaultValue: entry.entry_type });
              return (
                <div key={entry.id} style={{ display: 'flex', gap: '10px', paddingBottom: i === timeline.length - 1 ? 0 : '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {i !== timeline.length - 1 && <div style={{ flex: 1, width: '2px', background: 'rgba(176,207,191,0.25)', marginTop: '2px' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        fontFamily: DM_SANS, fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '50px',
                        background: `${color}22`, color,
                      }}>
                        {emoji} {label}
                      </span>
                      <span style={{ fontFamily: DM_SANS, fontSize: '10.5px', color: `${TEXT_MID}74`, direction: 'ltr' }}>
                        {formatDate(entry.created_at, locale)}
                      </span>
                    </div>
                    {entry.note && (
                      <p style={{ fontFamily: DM_SANS, fontSize: '12.5px', color: `${TEXT_MID}97`, margin: 0 }}>{entry.note}</p>
                    )}
                    {entry.photo_path && (
                      <TimelinePhoto photoPath={entry.photo_path} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete (archived only) */}
        {isArchived && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ marginTop: '24px', width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid rgba(220,80,80,0.35)', background: 'transparent', color: '#e06060', fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer' }}
          >
            {t('passport.deleteForever')}
          </button>
        )}
      </div>

      {/* Modals */}
      {showEdit && <EditPlantSheet plant={plant} gardenId={gardenId} onClose={() => setShowEdit(false)} />}

      {showTrackerModal && (
        <NewTrackerModal
          gardenPlantId={plant.id}
          onClose={() => setShowTrackerModal(false)}
          onCreated={() => { setShowTrackerModal(false); loadTrackers(gardenId); }}
        />
      )}

      {photoUploadOpen && tracker && (
        <PhotoUpload
          trackerId={tracker.id}
          plantNameHe={plant.common_name_he}
          plantNameEn={plant.common_name_en ?? undefined}
          onClose={() => setPhotoUploadOpen(false)}
          onComplete={(result) => { setPhotoUploadOpen(false); setAnalysisResult(result); refreshTimeline(); }}
        />
      )}

      {analysisResult && (
        <AnalysisResult
          analysis={analysisResult.analysis}
          growingPlan={analysisResult.growingPlan}
          checkinDate={analysisResult.checkin.checkin_date}
          suggestedTasksCount={analysisResult.suggested_tasks?.length ?? 0}
          wasAutoIdentified={false}
          onConfirmIdentification={async () => {}}
          onReviewTasks={() => setAnalysisResult(null)}
          onClose={() => setAnalysisResult(null)}
        />
      )}

      {showEndOfSeason && (
        <div
          role="dialog" aria-modal="true"
          dir={dir}
          style={{ position: 'fixed', inset: 0, zIndex: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '16px' }}
        >
          <div style={{ background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.18)', borderRadius: '14px', padding: '22px', width: '100%', maxWidth: '340px' }}>
            <p style={{ fontFamily: headingFont, fontSize: '15px', fontWeight: 700, color: TEXT_MID, margin: '0 0 16px', textAlign: 'center' }}>
              {t('passport.endOfSeasonTitle', { name: displayName })}
            </p>

            <button
              onClick={() => { setShowEndOfSeason(false); handleArchive(); }}
              disabled={!!busyAction}
              style={{ width: '100%', textAlign: isHe ? 'right' : 'left', padding: '14px', borderRadius: '10px', border: '1px solid rgba(200,169,81,0.4)', background: 'rgba(200,169,81,0.08)', cursor: 'pointer', marginBottom: '10px', display: 'block' }}
            >
              <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: '14px', color: '#C8A951', marginBottom: '4px' }}>{t('passport.archive')}</div>
              <div style={{ fontFamily: DM_SANS, fontSize: '12px', color: 'rgba(200,169,81,0.8)', lineHeight: 1.5 }}>{t('passport.archiveDesc')}</div>
            </button>

            <button
              onClick={() => { setShowEndOfSeason(false); handleDelete(); }}
              disabled={!!busyAction}
              style={{ width: '100%', textAlign: isHe ? 'right' : 'left', padding: '14px', borderRadius: '10px', border: '1px solid rgba(220,80,80,0.35)', background: 'rgba(220,80,80,0.06)', cursor: 'pointer', marginBottom: '16px', display: 'block' }}
            >
              <div style={{ fontFamily: DM_SANS, fontWeight: 700, fontSize: '14px', color: '#e06060', marginBottom: '4px' }}>{t('passport.deleteForever')}</div>
              <div style={{ fontFamily: DM_SANS, fontSize: '12px', color: 'rgba(220,80,80,0.7)', lineHeight: 1.5 }}>{t('passport.deleteForeverDesc')}</div>
            </button>

            <button
              onClick={() => setShowEndOfSeason(false)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,229,195,0.15)', background: 'transparent', color: `${TEXT_MID}99`, fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer' }}
            >
              {t('cancel', { ns: 'garden', defaultValue: 'ביטול' })}
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('passport.confirmDeleteTitle')}
          message={t('passport.confirmDeleteMessage', { name: displayName })}
          confirmLabel={t('passport.confirmDeleteButton')}
          danger
          busy={busyAction === 'delete'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          isHe={isHe}
          headingFont={headingFont}
        />
      )}
    </div>
  );
}

// ── Entry type maps ───────────────────────────────────────────────────────────
const ENTRY_COLOR: Record<string, string> = {
  watering:         '#1D9E75',
  fertilizing:      '#4A9A50',
  note:             '#C8A951',
  photo:            '#378ADD',
  chupchu:          '#7F77DD',
  chupchu_analysis: '#7F77DD',
  tracker_report:   '#C8A951',
  task:             '#C8A951',
};
const ENTRY_EMOJI: Record<string, string> = {
  watering:         '💧',
  fertilizing:      '🌿',
  note:             '📝',
  photo:            '📸',
  chupchu:          '🤖',
  chupchu_analysis: '🤖',
  tracker_report:   '📋',
  task:             '✅',
};

// ── IrrigationBadge ───────────────────────────────────────────────────────────
function IrrigationBadge({ plant, onEditClick, isArchived, tGarden, isHe }: {
  plant: GardenPlant;
  onEditClick: () => void;
  isArchived: boolean;
  tGarden: (key: string, opts?: any) => string;
  isHe: boolean;
}) {
  const activeDays = (plant.irrigation_days ?? []).filter(d => d >= 0 && d <= 6);
  const times      = plant.irrigation_times ?? [];
  const liters     = plant.irrigation_liters ?? null;

  // Build time·volume strings — wrapped in dir="ltr" for bidi safety
  const timeNodes: React.ReactNode[] = times.map((t, i) => {
    const norm = String(t).slice(0, 5);
    const l    = liters?.[i] ?? null;
    const text = l !== null ? `${norm}·${l}L` : norm;
    return <bdi key={i} dir="ltr">{text}</bdi>;
  });

  const dayLetters = activeDays.map(d => DAY_LETTERS_HE[d]).join(',');

  return (
    <button
      type="button"
      onClick={() => { if (!isArchived) onEditClick(); }}
      style={{
        fontFamily: DM_SANS, fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '50px',
        background: '#DCEEFB', color: '#1565C0', border: 'none',
        cursor: isArchived ? 'default' : 'pointer',
        maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: '4px',
      }}
    >
      <span>{tGarden('passport.autoIrrigation')}</span>
      {timeNodes.length > 0 && (
        <>
          <span> · </span>
          {timeNodes.reduce<React.ReactNode[]>((acc, node, i) => (
            i === 0 ? [node] : [...acc, <span key={`sep${i}`}>, </span>, node]
          ), [])}
        </>
      )}
      {dayLetters && <span dir="ltr"> · {dayLetters}</span>}
    </button>
  );
}

// ── Supabase-signed photo for timeline ────────────────────────────────────────
function TimelinePhoto({ photoPath }: { photoPath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    supabase.storage
      .from('tracker-photos')
      .createSignedUrl(photoPath, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [photoPath]);

  if (failed) return null;
  if (url) {
    return (
      <img src={url} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', marginTop: '4px', display: 'block' }} />
    );
  }
  return (
    <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: 'rgba(55,138,221,0.12)', border: '1px solid rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
      <span style={{ fontSize: '22px' }}>…</span>
    </div>
  );
}

function LOCATION_EMOJI(type: string | null | undefined): string {
  const map: Record<string, string> = { pot: '🪴', garden: '🌿', bed: '🟫', hydroponic: '💧', greenhouse: '🏡' };
  return map[type ?? 'pot'] ?? '🪴';
}

const iconBtnStyle: React.CSSProperties = {
  width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(0,229,195,0.2)',
  background: NIGHT_CARD, color: TEXT_MID, cursor: 'pointer', fontSize: '15px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function QuickAction({ emoji, label, onClick, busy, disabled, title }: {
  emoji: string; label: string; onClick: () => void; busy?: boolean; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      title={title}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        padding: '10px 4px', borderRadius: '10px', border: '1px solid rgba(0,229,195,0.24)',
        background: NIGHT_CARD, color: TEXT_MID, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: '18px' }}>{busy ? '…' : emoji}</span>
      <span style={{ fontFamily: DM_SANS, fontSize: '10.5px' }}>{label}</span>
    </button>
  );
}

function SectionHeader({ title, action, headingFont }: { title: string; action?: { label: string; onClick: () => void }; headingFont: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <h3 style={{ fontFamily: headingFont, fontSize: '14px', color: TEXT_MID, margin: 0 }}>{title}</h3>
      {action && (
        <button onClick={action.onClick} style={{ background: 'none', border: 'none', color: BIO_CYAN, fontFamily: DM_SANS, fontSize: '12px', cursor: 'pointer' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function Stat({ value, label, headingFont }: { value: number; label: string; headingFont: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: headingFont, fontSize: '20px', fontWeight: 700, color: BIO_CYAN }}>{value}</div>
      <div style={{ fontFamily: DM_SANS, fontSize: '10.5px', color: `${TEXT_MID}82` }}>{label}</div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, busy, danger, isHe, headingFont }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
  busy?: boolean; danger?: boolean; isHe: boolean; headingFont: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="dialog" aria-modal="true"
      dir={isHe ? 'rtl' : 'ltr'}
      style={{ position: 'fixed', inset: 0, zIndex: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '16px' }}
    >
      <div style={{ background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)', borderRadius: '12px', padding: '22px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
        <p style={{ fontFamily: headingFont, fontSize: '16px', color: danger ? '#e06060' : BIO_CYAN, margin: '0 0 8px' }}>{title}</p>
        <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}93`, margin: '0 0 18px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,229,195,0.25)', background: 'transparent', color: `${TEXT_MID}93`, fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer' }}>
            {t('button.cancel')}
          </button>
          <button onClick={onConfirm} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: danger ? '#e06060' : BIO_CYAN, color: danger ? '#fff' : '#050d0a', fontFamily: headingFont, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
