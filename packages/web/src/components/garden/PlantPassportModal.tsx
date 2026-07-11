import { useEffect, useState } from 'react';
import type { GardenPlant } from '../../stores/gardenStore';
import { useGardenStore } from '../../stores/gardenStore';
import type { Tracker, TimelineEntry, CheckinResult } from '../../stores/trackerStore';
import { useTrackerStore } from '../../stores/trackerStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { useChupChuPanelStore } from '../../stores/chupChuPanelStore';
import { api } from '../../api/client';
import { locationLabel } from './PlantingBase';
import { EditPlantSheet } from './EditPlantSheet';
import { NewTrackerModal } from '../tracker/NewTrackerModal';
import { PhotoUpload } from '../tracker/PhotoUpload';
import { AnalysisResult } from '../tracker/AnalysisResult';

const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const HEALTH_STYLE: Record<string, { bg: string; fg: string }> = {
  excellent: { bg: '#EAF3DE', fg: '#3B6D11' },
  good:      { bg: '#EAF3DE', fg: '#3B6D11' },
  fair:      { bg: '#FAEEDA', fg: '#854F0B' },
  poor:      { bg: '#FCEBED', fg: '#A32D2D' },
};

const PLANT_TYPE_EMOJI: Record<string, string> = { tree: '🌳', shrub: '🌳', perennial: '🔁', annual: '🌱' };

const ENTRY_META: Record<string, { color: string; emoji: string; label: string }> = {
  watering:       { color: '#1D9E75', emoji: '💧', label: 'השקיה' },
  fertilizing:    { color: '#4A9A50', emoji: '🌿', label: 'דישון' },
  note:           { color: '#C8A951', emoji: '📝', label: 'הערה' },
  photo:          { color: '#378ADD', emoji: '📸', label: 'תמונה' },
  chupchu:        { color: '#7F77DD', emoji: '🤖', label: "צ'ופצ'ו" },
  tracker_report: { color: '#C8A951', emoji: '📋', label: 'דוח מעקב' },
  task:           { color: '#C8A951', emoji: '✅', label: 'משימה' },
};

const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatHebrewDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ב${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
  const { patchGardenPlant, removePlant } = useGardenStore();
  const { getPlantTimeline, logWater, logFertilize, addNote } = useTrackerStore();
  const { session } = useAuthStore();
  const { show: showToast } = useToastStore();
  const { open: openChupChu } = useChupChuPanelStore();

  const [timeline,        setTimeline]        = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline]  = useState(true);
  const [tasks,           setTasks]            = useState<TaskRow[]>([]);
  const [loadingTasks,    setLoadingTasks]     = useState(true);
  const [busyAction,      setBusyAction]       = useState<string | null>(null);
  const [showEdit,        setShowEdit]         = useState(false);
  const [showNoteInput,   setShowNoteInput]    = useState(false);
  const [noteText,        setNoteText]         = useState('');
  const [confirmArchive,  setConfirmArchive]   = useState(false);
  const [confirmDelete,   setConfirmDelete]    = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen]  = useState(false);
  const [analysisResult,  setAnalysisResult]   = useState<CheckinResult | null>(null);

  const isArchived = !!plant.archived_at;
  const health     = tracker?.latest_checkin?.ai_analysis ?? null;
  const healthStyle = health ? (HEALTH_STYLE[health.health] ?? HEALTH_STYLE.good) : null;

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
        setTasks((all ?? []).filter(t => t.garden_plants_id === plant.id));
      } catch {
        // non-fatal
      } finally {
        setLoadingTasks(false);
      }
    })();
  }, [plant.id, session?.access_token]);

  const wateringCount = tracker?.watering_count ?? timeline.filter(t => t.entry_type === 'watering').length;
  const photoCount     = timeline.filter(t => t.entry_type === 'photo').length;
  const daysInGarden   = daysSince(plant.added_at) ?? 0;
  const lastWatered     = tracker?.last_watered_at
    ?? timeline.find(t => t.entry_type === 'watering')?.created_at
    ?? null;

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusyAction(key);
    try {
      await fn();
    } catch (err: any) {
      showToast(err.message || 'משהו השתבש', 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWater() {
    await withBusy('water', async () => {
      await logWater(plant.id, tracker?.id ?? null);
      showToast('נרשמה השקיה 💧', 'info');
      refreshTimeline();
    });
  }

  async function handleFertilize() {
    await withBusy('fertilize', async () => {
      await logFertilize(plant.id, tracker?.id ?? null);
      showToast('נרשם דישון 🌿', 'info');
      refreshTimeline();
    });
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    await withBusy('note', async () => {
      await addNote(plant.id, noteText.trim(), tracker?.id ?? null);
      setNoteText('');
      setShowNoteInput(false);
      showToast('ההערה נשמרה 📝', 'info');
      refreshTimeline();
    });
  }

  async function handleArchive() {
    await withBusy('archive', async () => {
      await patchGardenPlant(plant.id, gardenId, { archivedAt: new Date().toISOString() });
      showToast('הצמח הועבר לעונות קודמות 🍂', 'info');
      setConfirmArchive(false);
    });
  }

  async function handleRestore() {
    await withBusy('restore', async () => {
      await patchGardenPlant(plant.id, gardenId, { archivedAt: null });
      showToast('הצמח שוחזר 🌱', 'info');
    });
  }

  async function handleDelete() {
    await withBusy('delete', async () => {
      await removePlant(gardenId, plant.plant_id);
      showToast('הצמח נמחק', 'info');
      onClose();
    });
  }

  async function toggleTask(task: TaskRow) {
    if (!session?.access_token) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await api.patch(`/api/tasks/${task.id}`, { status: newStatus }, session.access_token);
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  }

  async function deleteTask(taskId: string) {
    if (!session?.access_token) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await api.del(`/api/tasks/${taskId}`, session.access_token);
    } catch {
      // best-effort — a stale row reappearing on next load is an acceptable failure mode
    }
  }

  const chip = (label: string, value: React.ReactNode, icon?: string) => (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '2px',
      background: 'rgba(0,229,195,0.05)', border: '1px solid rgba(0,229,195,0.12)',
      borderRadius: '10px', padding: '10px 12px',
    }}>
      <span style={{ fontFamily: DM_SANS, fontSize: '10px', color: `${TEXT_MID}60` }}>{icon ? `${icon} ` : ''}{label}</span>
      <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, fontWeight: 600 }}>{value}</span>
    </div>
  );

  const detailChips: React.ReactNode[] = [];
  detailChips.push(chip('סוג גידול', locationLabel(plant.location_type), LOCATION_EMOJI(plant.location_type)));
  if (plant.location_description) detailChips.push(chip('מיקום', plant.location_description));
  if (plant.sun_exposure) detailChips.push(chip('חשיפה לשמש', plant.sun_exposure, '☀️'));
  detailChips.push(chip('השקיה אחרונה', lastWatered ? formatHebrewDate(lastWatered) : 'טרם הושקה', '💧'));
  if (plant.companions) detailChips.push(chip('צמחים שכנים', plant.companions));
  if (plant.soil) detailChips.push(chip('קרקע', plant.soil));
  if (plant.plant_type) detailChips.push(chip('סוג צמח', plant.plant_type, PLANT_TYPE_EMOJI[plant.plant_type]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 220, background: NIGHT, overflowY: 'auto', direction: 'rtl' }}
    >
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 60px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <button onClick={onClose} style={iconBtnStyle} aria-label="סגור">✕</button>
          <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}60` }}>{gardenName}</span>
          {isArchived ? (
            <button onClick={handleRestore} style={iconBtnStyle} aria-label="שחזר" disabled={busyAction === 'restore'}>↺</button>
          ) : (
            <button onClick={() => setConfirmArchive(true)} style={iconBtnStyle} aria-label="סיים עונה">🗑</button>
          )}
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }}>🌱</div>
          <h1 style={{ fontFamily: FRANK, fontSize: '22px', fontWeight: 700, color: TEXT_MID, margin: '10px 0 2px' }}>
            {plant.common_name_he}
          </h1>
          {plant.variety && (
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}70`, margin: '0 0 4px' }}>{plant.variety}</p>
          )}
          <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}55`, margin: '0 0 10px' }}>
            {locationLabel(plant.location_type)}{plant.location_description ? ` · ${plant.location_description}` : ''}
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
            {plant.auto_irrigation && plant.irrigation_times && plant.irrigation_times.length > 0 && (
              <span style={{
                fontFamily: DM_SANS, fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '50px',
                background: '#DCEEFB', color: '#1565C0',
              }}>
                💦 השקיה אוטומטית · {plant.irrigation_times.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Archive badge */}
        {isArchived && plant.archived_at && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '14px',
            borderRadius: '10px', background: 'rgba(200,160,64,0.12)', border: '1px solid rgba(200,160,64,0.3)',
          }}>
            <span>🍂</span>
            <span style={{ fontFamily: DM_SANS, fontSize: '12.5px', color: '#C8A040' }}>
              העונה הסתיימה ב{formatHebrewDate(plant.archived_at)}
            </span>
          </div>
        )}

        {/* Chupchu bar */}
        <button
          onClick={() => openChupChu(`ספר לי על ה${plant.common_name_he} שלי`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
            padding: '11px 14px', marginBottom: '14px', borderRadius: '12px',
            background: 'rgba(0,229,195,0.08)', border: '1px solid rgba(0,229,195,0.25)',
            cursor: 'pointer', textAlign: 'right',
          }}
        >
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: BIO_CYAN, flex: 1 }}>
            שאל את צ'ופצ'ו על {plant.common_name_he}
          </span>
          <span style={{ color: `${BIO_CYAN}80` }}>‹</span>
        </button>

        {/* Quick actions */}
        {!isArchived && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <QuickAction emoji="💧" label="השקיתי" busy={busyAction === 'water'} onClick={handleWater} />
            <QuickAction emoji="🌿" label="דישנתי" busy={busyAction === 'fertilize'} onClick={handleFertilize} />
            <QuickAction
              emoji="📸" label="צלם"
              disabled={!tracker}
              title={!tracker ? 'התחל מעקב כדי לצלם ולנתח' : undefined}
              onClick={() => setPhotoUploadOpen(true)}
            />
            <QuickAction emoji="📝" label="הערה" onClick={() => setShowNoteInput(v => !v)} />
          </div>
        )}

        {showNoteInput && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="מה קורה עם הצמח?"
              style={{
                flex: 1, boxSizing: 'border-box', backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
                borderRadius: '8px', padding: '10px 12px', fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, direction: 'rtl',
              }}
            />
            <button
              onClick={handleSaveNote}
              disabled={busyAction === 'note'}
              style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: BIO_CYAN, color: '#050d0a', fontFamily: FRANK, fontWeight: 700, cursor: 'pointer' }}
            >
              שמור
            </button>
          </div>
        )}

        {/* Details grid */}
        <SectionHeader
          title="פרטי הצמח"
          action={!isArchived ? { label: 'עריכה ✎', onClick: () => setShowEdit(true) } : undefined}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {detailChips}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '22px', padding: '14px 0', borderTop: '1px solid rgba(0,229,195,0.1)', borderBottom: '1px solid rgba(0,229,195,0.1)' }}>
          <Stat value={daysInGarden} label="ימים בגינה" />
          <Stat value={wateringCount} label="השקיות" />
          <Stat value={photoCount} label="תמונות" />
        </div>

        {/* Tracker section */}
        <SectionHeader title="מעקב גידול" />
        {tracker ? (
          health ? (
            <div style={{ padding: '12px 14px', marginBottom: '20px', borderRadius: '12px', background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.15)' }}>
              <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, margin: '0 0 4px', fontWeight: 600 }}>
                {health.growthStageHe} · {health.healthHe}
              </p>
              <p style={{
                fontFamily: DM_SANS, fontSize: '12.5px', color: `${TEXT_MID}80`, margin: 0, lineHeight: 1.6,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}>
                {health.observations}
              </p>
            </div>
          ) : (
            <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}60`, marginBottom: '20px' }}>
              עדיין לא בוצע ניתוח. צלם תמונה לניתוח ראשון!
            </p>
          )
        ) : !isArchived ? (
          <div style={{
            padding: '18px', marginBottom: '20px', borderRadius: '12px', textAlign: 'center',
            background: 'rgba(74,156,104,0.1)', border: '1px solid rgba(74,156,104,0.3)',
          }}>
            <p style={{ fontFamily: FRANK, fontSize: '15px', color: '#4A9C68', margin: '0 0 4px' }}>התחל מעקב חכם</p>
            <p style={{ fontFamily: DM_SANS, fontSize: '12.5px', color: `${TEXT_MID}70`, margin: '0 0 12px' }}>
              קבל ניתוח AI, המלצות ביודינמיות ותזכורות מותאמות
            </p>
            <button
              onClick={() => setShowTrackerModal(true)}
              style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#4A9C68', color: '#fff', fontFamily: FRANK, fontWeight: 700, cursor: 'pointer' }}
            >
              התחל
            </button>
          </div>
        ) : null}

        {/* Tasks section */}
        <SectionHeader title={isArchived ? 'משימות העונה' : 'משימות קרובות'} />
        <div style={{ marginBottom: '20px' }}>
          {loadingTasks ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}50` }}>טוען...</p>
          ) : tasks.length === 0 ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}50` }}>אין משימות</p>
          ) : (
            tasks.slice(0, 5).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px' }}>
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  disabled={isArchived}
                  onChange={() => toggleTask(task)}
                />
                <span style={{
                  flex: 1, fontFamily: DM_SANS, fontSize: '13px',
                  color: task.status === 'completed' ? `${TEXT_MID}40` : TEXT_MID,
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </span>
                <span style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}50` }}>{task.date}</span>
                {!isArchived && (
                  <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: `${TEXT_MID}40`, cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))
          )}
          {tasks.length > 5 && (
            <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}50`, marginTop: '4px' }}>
              ועוד {tasks.length - 5} משימות...
            </p>
          )}
        </div>

        {/* Timeline */}
        <SectionHeader title="כל ההיסטוריה" />
        <div>
          {loadingTimeline ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}50` }}>טוען...</p>
          ) : timeline.length === 0 ? (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}50` }}>אין עדיין היסטוריה</p>
          ) : (
            timeline.map((entry, i) => {
              const meta = ENTRY_META[entry.entry_type] ?? ENTRY_META.note;
              return (
                <div key={entry.id} style={{ display: 'flex', gap: '10px', paddingBottom: i === timeline.length - 1 ? 0 : '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    {i !== timeline.length - 1 && <div style={{ flex: 1, width: '2px', background: 'rgba(176,207,191,0.15)', marginTop: '2px' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        fontFamily: DM_SANS, fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '50px',
                        background: `${meta.color}22`, color: meta.color,
                      }}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span style={{ fontFamily: DM_SANS, fontSize: '10.5px', color: `${TEXT_MID}50` }}>
                        {formatHebrewDate(entry.created_at)}
                      </span>
                    </div>
                    {entry.note && (
                      <p style={{ fontFamily: DM_SANS, fontSize: '12.5px', color: `${TEXT_MID}90`, margin: 0 }}>{entry.note}</p>
                    )}
                    {entry.entry_type === 'photo' && (
                      <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: 'rgba(55,138,221,0.12)', border: '1px solid rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '22px' }}>📸</span>
                      </div>
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
            מחק לצמיתות
          </button>
        )}
      </div>

      {/* Modals */}
      {showEdit && <EditPlantSheet plant={plant} gardenId={gardenId} onClose={() => setShowEdit(false)} />}

      {showTrackerModal && (
        <NewTrackerModal
          onClose={() => setShowTrackerModal(false)}
          onCreated={() => setShowTrackerModal(false)}
        />
      )}

      {photoUploadOpen && tracker && (
        <PhotoUpload
          trackerId={tracker.id}
          plantNameHe={plant.common_name_he}
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

      {confirmArchive && (
        <ConfirmDialog
          title="לסיים את העונה?"
          message={`"${plant.common_name_he}" יעבור לרשימת העונות הקודמות. תוכל לשחזר אותו בכל עת.`}
          confirmLabel="סיים עונה"
          busy={busyAction === 'archive'}
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="למחוק לצמיתות?"
          message={`פעולה זו לא ניתנת לביטול. כל ההיסטוריה של "${plant.common_name_he}" תימחק.`}
          confirmLabel="מחק לצמיתות"
          danger
          busy={busyAction === 'delete'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
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
        padding: '10px 4px', borderRadius: '10px', border: '1px solid rgba(0,229,195,0.15)',
        background: NIGHT_CARD, color: TEXT_MID, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: '18px' }}>{busy ? '…' : emoji}</span>
      <span style={{ fontFamily: DM_SANS, fontSize: '10.5px' }}>{label}</span>
    </button>
  );
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <h3 style={{ fontFamily: FRANK, fontSize: '14px', color: TEXT_MID, margin: 0 }}>{title}</h3>
      {action && (
        <button onClick={action.onClick} style={{ background: 'none', border: 'none', color: BIO_CYAN, fontFamily: DM_SANS, fontSize: '12px', cursor: 'pointer' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: FRANK, fontSize: '20px', fontWeight: 700, color: BIO_CYAN }}>{value}</div>
      <div style={{ fontFamily: DM_SANS, fontSize: '10.5px', color: `${TEXT_MID}60` }}>{label}</div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, busy, danger }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean; danger?: boolean;
}) {
  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '16px' }}
    >
      <div style={{ background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)', borderRadius: '12px', padding: '22px', width: '100%', maxWidth: '340px', textAlign: 'center', direction: 'rtl' }}>
        <p style={{ fontFamily: FRANK, fontSize: '16px', color: danger ? '#e06060' : BIO_CYAN, margin: '0 0 8px' }}>{title}</p>
        <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}80`, margin: '0 0 18px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,229,195,0.25)', background: 'transparent', color: `${TEXT_MID}80`, fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer' }}>
            ביטול
          </button>
          <button onClick={onConfirm} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: danger ? '#e06060' : BIO_CYAN, color: danger ? '#fff' : '#050d0a', fontFamily: FRANK, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
