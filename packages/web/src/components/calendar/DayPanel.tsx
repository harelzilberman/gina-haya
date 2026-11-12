import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';
import type { GardenTask } from '../../api/tasks';
import { EN_HEADING } from '../../styles/fonts';
import { useChupChuPanelStore } from '../../stores/chupChuPanelStore';
import { NodeBlackoutBanner } from './NodeBlackoutBanner';
import { TodayCard } from './TodayCardV2';
import { ChupChuDailySummary } from './ChupChuDailySummary';
import {
  GOLD, PARCH, TEXT, NIGHT_CARD, EARTH, FRANK,
  SOURCE_STYLES, getTaskSource, priorityColorOf, formatLocalDate,
} from './taskStyles';

// ── Selected-day panel ───────────────────────────────────────────────────────
//
// Desktop: the sticky side panel of the biodynamic calendar page.
// Narrow screens: the same content inside a bottom sheet (DayPanelSheet).

const PANEL_CSS = `
.daypanel-quickask::placeholder { color: rgba(176,207,191,0.35); }
.daypanel-quickask:focus { outline: none; }
@keyframes daypanel-sheet-in {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`;

export function TaskRow({ task, onStatusToggle, onEdit }: {
  task: GardenTask;
  onStatusToggle: (t: GardenTask) => void;
  onEdit: (t: GardenTask) => void;
}) {
  const { t } = useTranslation('tasks');
  const isDone = task.status === 'done';
  const src    = SOURCE_STYLES[getTaskSource(task)];
  const priorityColor = priorityColorOf(task);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', marginBottom: '6px',
      background: isDone ? 'rgba(0,229,195,0.06)' : src.bg,
      border: `1px solid ${isDone ? 'rgba(0,229,195,0.15)' : src.border}`,
      borderRadius: '8px',
    }}>
      <button
        onClick={() => onStatusToggle(task)}
        aria-label={isDone ? t('panel.markPending', { title: task.title }) : t('panel.markDone', { title: task.title })}
        aria-pressed={isDone}
        style={{
          flexShrink: 0, width: '20px', height: '20px', borderRadius: '5px',
          border: `1.5px solid ${isDone ? '#4A9C68' : 'rgba(255,255,255,0.3)'}`,
          background: isDone ? '#4A9C68' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: 'white', padding: 0,
        }}
      >
        {isDone ? '✓' : ''}
      </button>
      <button
        onClick={() => onEdit(task)}
        title={t('modal.editTask')}
        style={{
          fontFamily: EN_HEADING, fontSize: '14px', flex: 1, minWidth: 0,
          color: isDone ? `${PARCH}50` : PARCH,
          textDecoration: isDone ? 'line-through' : 'none',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          textAlign: 'start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {task.title}
      </button>
      <span style={{
        fontFamily: EN_HEADING, fontSize: '10px',
        background: src.badgeBg, color: src.badgeColor,
        borderRadius: '4px', padding: '2px 6px',
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        {src.icon} {t(src.labelKey)}
      </span>
      {priorityColor && (
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: priorityColor, flexShrink: 0 }} />
      )}
    </div>
  );
}

interface DayPanelProps {
  date: string;
  todayISO: string;
  bd?: BiodynamicDay;
  /** True while the day's calendar data is still loading. */
  bdLoading?: boolean;
  tasks: GardenTask[];
  onBackToToday: () => void;
  onStatusToggle: (t: GardenTask) => void;
  onEdit: (t: GardenTask) => void;
  onAddTask: (date: string, title: string) => void;
  /** id for the heading (aria-labelledby of the panel / sheet). */
  headingId: string;
  onClose?: () => void;
}

export function DayPanel({
  date, todayISO, bd, bdLoading, tasks, onBackToToday, onStatusToggle, onEdit, onAddTask, headingId, onClose,
}: DayPanelProps) {
  const { t, i18n } = useTranslation('tasks');
  const { t: tc } = useTranslation('calendar');
  const isHe = i18n.language === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';
  const { open: openChupChu } = useChupChuPanelStore();

  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [quickAsk, setQuickAsk]     = useState('');

  const isToday  = date === todayISO;
  const fullDate = formatLocalDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDate = formatLocalDate(date, locale, { day: 'numeric', month: 'long' });

  const pendingTasks = tasks.filter(x => x.status !== 'done');
  const doneTasks    = tasks.filter(x => x.status === 'done');

  const handleAddSubmit = () => {
    if (!newTitle.trim()) return;
    onAddTask(date, newTitle.trim());
    setNewTitle('');
    setAddingTask(false);
  };

  const handleQuickAsk = () => {
    const text = quickAsk.trim();
    if (!text) return;
    setQuickAsk('');
    openChupChu(isToday ? text : `${tc('page.quickAskPrefix', { date: fullDate })} ${text}`);
  };

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <style>{PANEL_CSS}</style>

      {/* 1. Date heading + back to today */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 id={headingId} style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0, lineHeight: 1.3 }}>
            {fullDate}
          </h2>
          {isToday ? (
            <span style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}99` }}>{tc('today')}</span>
          ) : (
            <button
              onClick={onBackToToday}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: EN_HEADING, fontSize: '12px', color: GOLD, textDecoration: 'underline',
              }}
            >
              {tc('page.backToToday')}
            </button>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t('dayModal.close')}
            style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
              border: '1px solid rgba(0,229,195,0.2)', background: 'transparent',
              color: GOLD, cursor: 'pointer', fontSize: '15px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {bd ? (
        <>
          {/* 2. Node blackout (renders nothing when not relevant) */}
          <NodeBlackoutBanner day={bd} />

          {/* 3. Full day card: moon, day type, score ring, in-day changes, preps */}
          <TodayCard day={bd} showDate={false} />

          {/* 4. Chupchu's summary for the day */}
          <ChupChuDailySummary day={bd} />
        </>
      ) : (
        <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: `${PARCH}99`, margin: '4px 0', textAlign: 'center' }}>
          {bdLoading ? t('loading') : tc('page.noDataDay')}
        </p>
      )}

      {/* 5. The day's tasks */}
      <section aria-label={tc('page.tasksForDay', { date: shortDate })} style={{
        background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.12)', borderRadius: '14px', padding: '14px',
      }}>
        <h3 style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: '0 0 10px' }}>
          {tc('page.tasksForDay', { date: shortDate })}
        </h3>

        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6px 0 10px' }}>
            <div style={{ fontSize: '30px', marginBottom: '6px' }}>🌿</div>
            <p style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: '0 0 6px' }}>{t('dayModal.restDay')}</p>
            <p style={{ fontFamily: EN_HEADING, fontSize: '13px', color: `${PARCH}80`, lineHeight: 1.7, margin: '0 0 6px', whiteSpace: 'pre-line' }}>
              {t('dayModal.noTasksMsg')}
            </p>
            <p style={{ fontFamily: FRANK, fontSize: '13px', color: GOLD, margin: 0 }}>{t('dayModal.chupchu')}</p>
          </div>
        ) : (
          <div>
            {pendingTasks.map(task => (
              <TaskRow key={task.id} task={task} onStatusToggle={onStatusToggle} onEdit={onEdit} />
            ))}
            {doneTasks.length > 0 && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 8px',
                  color: `${PARCH}BF`, fontFamily: EN_HEADING, fontSize: '11px',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                  <span>{t('dayModal.done')}</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                </div>
                {doneTasks.map(task => (
                  <TaskRow key={task.id} task={task} onStatusToggle={onStatusToggle} onEdit={onEdit} />
                ))}
              </>
            )}
          </div>
        )}

        {addingTask ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddSubmit();
                if (e.key === 'Escape') { setAddingTask(false); setNewTitle(''); }
              }}
              placeholder={t('dayModal.addTaskPlaceholder')}
              aria-label={t('dayModal.addTaskPlaceholder')}
              style={{
                flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0,229,195,0.25)', borderRadius: '8px', padding: '8px 12px',
                fontFamily: EN_HEADING, fontSize: '13px', color: PARCH, outline: 'none',
                direction: isHe ? 'rtl' : 'ltr',
              }}
            />
            <button
              onClick={handleAddSubmit}
              disabled={!newTitle.trim()}
              style={{
                background: newTitle.trim() ? GOLD : 'rgba(0,229,195,0.3)',
                border: 'none', borderRadius: '8px', padding: '8px 14px',
                color: EARTH, fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {t('dayModal.add')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            style={{
              marginTop: '10px', fontFamily: EN_HEADING, fontSize: '13px', color: GOLD,
              background: 'rgba(0,229,195,0.08)', border: '1px solid rgba(0,229,195,0.2)',
              borderRadius: '8px', padding: '9px 14px', cursor: 'pointer',
            }}
          >
            {t('dayModal.addTaskForDay')}
          </button>
        )}
      </section>

      {/* 6. Quick-ask Chupchu (about the selected date when it isn't today) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.15)',
        borderRadius: '14px', padding: '10px 14px',
      }}>
        <div aria-hidden style={{
          flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, #00e5c3, #00b89e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1,
        }}>🌕</div>
        <input
          type="text"
          className="daypanel-quickask"
          value={quickAsk}
          onChange={e => setQuickAsk(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuickAsk()}
          placeholder={isToday ? tc('page.quickAskToday') : tc('page.quickAskDate', { date: shortDate })}
          aria-label={isToday ? tc('page.quickAskToday') : tc('page.quickAskDate', { date: shortDate })}
          style={{
            flex: '1 1 auto', minWidth: 0, border: 'none', background: 'transparent',
            fontFamily: EN_HEADING, fontSize: '14px', color: TEXT,
            direction: isHe ? 'rtl' : 'ltr', textAlign: 'start',
          }}
        />
        <button
          onClick={handleQuickAsk}
          disabled={!quickAsk.trim()}
          aria-label={tc('page.quickAskSend')}
          style={{
            flexShrink: 0, width: '44px', height: '44px', borderRadius: '10px', border: 'none',
            backgroundColor: GOLD, color: EARTH, fontFamily: FRANK, fontWeight: 700, fontSize: '16px',
            cursor: quickAsk.trim() ? 'pointer' : 'default', opacity: quickAsk.trim() ? 1 : 0.35,
            transition: 'opacity 0.2s',
          }}
        >
          {isHe ? '←' : '→'}
        </button>
      </div>
    </div>
  );
}

/** Narrow screens: the panel content as a bottom sheet (like the app). */
export function DayPanelSheet(props: Omit<DayPanelProps, 'onClose' | 'headingId'> & { onClose: () => void }) {
  const headingId = 'day-sheet-heading';
  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div
        onClick={props.onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        style={{
          position: 'fixed', insetInline: 0, bottom: 0, zIndex: 201,
          maxHeight: '88vh', overflowY: 'auto',
          background: 'rgba(9,20,16,0.98)', borderTop: '1px solid rgba(0,229,195,0.25)',
          borderRadius: '18px 18px 0 0', padding: '10px 16px 28px',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.6)',
          animation: 'daypanel-sheet-in 0.22s ease-out',
          boxSizing: 'border-box',
        }}
      >
        <div aria-hidden style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(176,207,191,0.3)', margin: '0 auto 12px' }} />
        <DayPanel {...props} headingId={headingId} />
      </div>
    </>
  );
}
