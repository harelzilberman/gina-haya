import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { tasksApi, type GardenTask } from '../api/tasks';
import { calendarApi } from '../api/calendar';
import type { BiodynamicDay } from '@gina-haya/shared';

// ── Responsive hook ────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ── Design tokens ──────────────────────────────────────────────────────────
const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

const TYPE_CONFIG = {
  biodynamic: { emoji: '🌙', label: 'ביודינמי', color: '#7DC084' },
  maintenance: { emoji: '🔧', label: 'תחזוקה',   color: '#C8A040' },
  custom:      { emoji: '✏️', label: 'אישי',      color: '#C884C8' },
};

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string; emoji: string; label: string }> = {
  fruit:  { bg: 'rgba(239,116,90,0.18)',  color: '#EF745A', emoji: '🍎', label: 'פרי'   },
  root:   { bg: 'rgba(181,136,99,0.18)',  color: '#B58863', emoji: '🥕', label: 'שורש'  },
  flower: { bg: 'rgba(196,132,200,0.18)', color: '#C884C8', emoji: '🌸', label: 'פרח'   },
  leaf:   { bg: 'rgba(125,192,132,0.18)', color: '#7DC084', emoji: '🌿', label: 'עלה'   },
};

function moonEmoji(pct: number): string {
  if (pct < 6)  return '🌑';
  if (pct < 25) return '🌒';
  if (pct < 45) return '🌓';
  if (pct < 55) return '🌔';
  if (pct < 60) return '🌕';
  if (pct < 75) return '🌖';
  if (pct < 90) return '🌗';
  if (pct < 97) return '🌘';
  return '🌑';
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = (day + 1) % 7; // Mon=0
  return addDays(d, -diff);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function computeWeekRange(anchor: Date): { from: string; to: string; days: string[] } {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
  return { from: days[0], to: days[6], days };
}

function computeMonthRange(anchor: Date): { from: string; to: string; days: string[]; weeks: string[][] } {
  const first = startOfMonth(anchor);
  const last  = endOfMonth(anchor);
  // Pad to full weeks (Mon-based)
  const gridStart = startOfWeek(first);
  const gridEnd   = addDays(startOfWeek(last), 6);

  const days: string[] = [];
  let cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(toISO(cur));
    cur = addDays(cur, 1);
  }

  // Split into weeks
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return { from: days[0], to: days[days.length - 1], days, weeks };
}

const DAY_NAMES_HE = ['שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'ראשון'];

function formatDateHe(dateStr: string): { day: string; num: string; month: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayIdx = (d.getDay() + 6) % 7; // Mon=0
  return {
    day:   DAY_NAMES_HE[dayIdx],
    num:   String(d.getDate()),
    month: d.toLocaleDateString('he-IL', { month: 'short' }),
  };
}

// ── Draggable Task Card ─────────────────────────────────────────────────────
function DraggableTaskCard({
  task,
  onEdit,
  onStatusToggle,
  onDelete,
  isDragging = false,
}: {
  task: GardenTask;
  onEdit: (t: GardenTask) => void;
  onStatusToggle: (t: GardenTask) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

  const cfg  = TYPE_CONFIG[task.type];
  const isDone    = task.status === 'done';
  const isSkipped = task.status === 'skipped';

  // Priority colour from source_action
  const priorityColor =
    task.source_action === 'high'   ? '#EF745A' :
    task.source_action === 'medium' ? GOLD :
    task.source_action === 'low'    ? '#7DC084' : undefined;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : isSkipped ? 0.5 : 1,
    background: isDone
      ? 'rgba(74,124,89,0.15)'
      : 'rgba(20,50,22,0.8)',
    border: `1px solid ${isDone ? 'rgba(74,124,89,0.4)' : priorityColor ? `${priorityColor}55` : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '7px',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'grab',
    userSelect: 'none',
    marginBottom: '4px',
    transition: 'opacity 0.15s',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {/* Checkbox — 44px touch target wrapping the 16px visual */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onStatusToggle(task); }}
        style={{
          flexShrink: 0, width: '44px', height: '44px', borderRadius: '4px',
          border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '-14px -14px -14px -14px', padding: '14px',
        }}
      >
        <span style={{
          width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
          border: `1.5px solid ${isDone ? '#4A7C59' : 'rgba(255,255,255,0.25)'}`,
          background: isDone ? '#4A7C59' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', color: 'white',
        }}>
          {isDone ? '✓' : ''}
        </span>
      </button>

      {/* Type emoji */}
      <span style={{ fontSize: '12px', flexShrink: 0 }}>{cfg.emoji}</span>

      {/* Title */}
      <span
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onEdit(task); }}
        style={{
          fontFamily: ASST, fontSize: '12px',
          color: isDone ? `${PARCH}60` : PARCH,
          flex: 1, textDecoration: isDone ? 'line-through' : 'none',
          direction: 'rtl', textAlign: 'right',
          cursor: 'pointer', overflow: 'hidden',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          minWidth: 0,
        }}
        title={task.title}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      {priorityColor && (
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor, flexShrink: 0 }} />
      )}

      {/* Tracker badge */}
      {task.source_action === 'growing_tracker' && (
        <span style={{ fontSize: '10px', flexShrink: 0 }}>🌱</span>
      )}

      {/* Delete (custom tasks only) */}
      {task.type === 'custom' && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', opacity: 0.4, padding: '0', flexShrink: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Droppable Day Cell ──────────────────────────────────────────────────────
function DroppableDayCell({
  date,
  bd,
  tasks,
  isCurrentMonth,
  isToday,
  compact,
  isMobileView = false,
  onAdd,
  onEdit,
  onStatusToggle,
  onDelete,
  draggingId,
}: {
  date: string;
  bd?: BiodynamicDay;
  tasks: GardenTask[];
  isCurrentMonth: boolean;
  isToday: boolean;
  compact: boolean;
  isMobileView?: boolean;
  onAdd: (date: string) => void;
  onEdit: (t: GardenTask) => void;
  onStatusToggle: (t: GardenTask) => void;
  onDelete: (id: string) => void;
  draggingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayStyle = bd ? DAY_TYPE_STYLES[bd.dayType] : null;
  const { num, day, month } = formatDateHe(date);

  const pending = tasks.filter(t => t.status === 'pending').length;
  const done    = tasks.filter(t => t.status === 'done').length;

  // On mobile month view: ultra-compact — just date number + BD dot + task badge
  if (isMobileView && compact) {
    return (
      <div
        ref={setNodeRef}
        onClick={() => onAdd(date)}
        style={{
          background: isOver ? 'rgba(245,200,64,0.08)' : isToday ? 'rgba(245,200,64,0.07)' : 'rgba(20,50,22,0.35)',
          border: `1px solid ${isToday ? 'rgba(245,200,64,0.3)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '6px',
          padding: '4px 2px',
          minHeight: '52px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: isCurrentMonth ? 1 : 0.35,
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: FRANK, fontSize: '12px', color: isToday ? GOLD : isCurrentMonth ? PARCH : `${PARCH}50`, fontWeight: isToday ? 700 : 400, lineHeight: 1.2 }}>
          {num}
        </span>
        {dayStyle && <span style={{ fontSize: '9px', lineHeight: 1 }}>{dayStyle.emoji}</span>}
        {tasks.length > 0 && (
          <span style={{
            fontFamily: ASST, fontSize: '9px', fontWeight: 700,
            background: 'rgba(245,200,64,0.2)', color: GOLD,
            borderRadius: '99px', padding: '1px 4px', lineHeight: 1.4,
          }}>
            {tasks.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? 'rgba(245,200,64,0.08)'
          : isToday
            ? 'rgba(245,200,64,0.05)'
            : 'rgba(20,50,22,0.35)',
        border: `1px solid ${isOver ? 'rgba(245,200,64,0.4)' : isToday ? 'rgba(245,200,64,0.25)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '10px',
        padding: compact ? '6px' : '8px',
        minHeight: compact ? '90px' : '120px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: isCurrentMonth ? 1 : 0.45,
        transition: 'background 0.15s, border-color 0.15s',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Day header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {dayStyle && (
            <span
              title={dayStyle.label}
              style={{
                fontSize: '10px', padding: '1px 5px', borderRadius: '99px',
                background: dayStyle.bg, color: dayStyle.color, fontFamily: ASST, fontWeight: 600,
              }}
            >
              {dayStyle.emoji}
            </span>
          )}
          {bd && (
            <span title={bd.moonPhaseNameHe} style={{ fontSize: '11px', lineHeight: 1 }}>
              {moonEmoji(bd.moonPhasePct)}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontFamily: FRANK, fontSize: '14px',
              color: isToday ? GOLD : isCurrentMonth ? PARCH : `${PARCH}50`,
              fontWeight: isToday ? 700 : 400,
            }}
          >
            {num}
          </span>
          {compact && (
            <span style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}60`, marginRight: '3px' }}>
              {day}
            </span>
          )}
        </div>
      </div>

      {/* BD planting score bar */}
      {bd && bd.plantingScore > 0 && (
        <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: '3px', borderRadius: '99px',
                background: i < bd.plantingScore
                  ? (dayStyle?.color ?? GOLD)
                  : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      )}

      {/* Tasks */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        {tasks.slice(0, compact ? 3 : 99).map(task => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onStatusToggle={onStatusToggle}
            onDelete={onDelete}
            isDragging={draggingId === task.id}
          />
        ))}
        {compact && tasks.length > 3 && (
          <span style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}50` }}>
            +{tasks.length - 3} עוד...
          </span>
        )}
      </div>

      {/* Footer: add + summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <button
          onClick={() => onAdd(date)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: ASST, fontSize: '11px', color: `${PARCH}40`,
            padding: '0', lineHeight: 1, minHeight: '44px', minWidth: '44px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${PARCH}40`; }}
        >
          + הוסף
        </button>
        {tasks.length > 0 && (
          <span style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}40` }}>
            {done}/{tasks.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Add / Edit Task Modal ────────────────────────────────────────────────────
function TaskModal({
  initialDate,
  task,
  onSave,
  onClose,
  onDelete,
}: {
  initialDate: string;
  task: GardenTask | null;
  onSave: (values: { date: string; title: string; notes?: string; status?: GardenTask['status'] }) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle]   = useState(task?.title ?? '');
  const [date,  setDate]    = useState(task?.date ?? initialDate);
  const [notes, setNotes]   = useState(task?.notes ?? '');
  const [status, setStatus] = useState<GardenTask['status']>(task?.status ?? 'pending');

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,200,64,0.2)',
    borderRadius: '6px', padding: '8px 10px',
    fontFamily: ASST, fontSize: '14px', color: PARCH,
    outline: 'none', direction: 'rtl',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1a3a1c', border: '1px solid rgba(245,200,64,0.2)',
        borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px',
        direction: 'rtl',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
            {task ? 'עריכת משימה' : 'משימה חדשה'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: `${PARCH}60`, cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="שם המשימה..."
            style={inputStyle}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSave({ date, title: title.trim(), notes: notes || undefined, status }); }}
          />

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
          />

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הערות (אופציונלי)..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
          />

          {task && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['pending', 'done', 'skipped'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '6px', cursor: 'pointer',
                    border: `1px solid ${status === s ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    background: status === s ? 'rgba(245,200,64,0.12)' : 'transparent',
                    color: status === s ? GOLD : `${PARCH}60`,
                    fontFamily: ASST, fontSize: '11px',
                  }}
                >
                  {s === 'pending' ? 'ממתין' : s === 'done' ? 'הושלם' : 'דולג'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'space-between' }}>
          {task && onDelete && (
            <button
              onClick={onDelete}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(220,80,80,0.3)',
                color: 'rgba(220,80,80,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: ASST, fontSize: '13px',
              }}
            >
              מחק
            </button>
          )}
          <div style={{ display: 'flex', gap: '8px', marginInlineStart: 'auto' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                color: `${PARCH}60`, background: 'transparent', cursor: 'pointer', fontFamily: ASST, fontSize: '13px',
              }}
            >
              ביטול
            </button>
            <button
              onClick={() => { if (title.trim()) onSave({ date, title: title.trim(), notes: notes || undefined, status }); }}
              disabled={!title.trim()}
              style={{
                padding: '8px 18px', borderRadius: '6px', border: 'none',
                background: title.trim() ? GOLD : 'rgba(245,200,64,0.3)',
                color: EARTH, cursor: title.trim() ? 'pointer' : 'not-allowed',
                fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
              }}
            >
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function TaskCalendarPage() {
  const { session } = useAuthStore();
  const token = session?.access_token ?? '';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const [view,       setView]       = useState<'week' | 'month'>('week');
  const [anchor,     setAnchor]     = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [tasks,      setTasks]      = useState<GardenTask[]>([]);
  const [bdMap,      setBdMap]      = useState<Record<string, BiodynamicDay>>({});
  const [isLoading,      setIsLoading]      = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [noPlan,          setNoPlan]          = useState(false);
  const [addDate,    setAddDate]    = useState<string | null>(null);
  const [editTask,   setEditTask]   = useState<GardenTask | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'all' | 'pending' | 'done'>('all');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const today = toISO(new Date());
  const currentMonth = anchor.getMonth();

  const { from, to, days, weeks } = (() => {
    if (view === 'week') {
      const r = computeWeekRange(anchor);
      return { ...r, weeks: [r.days] };
    } else {
      return computeMonthRange(anchor);
    }
  })();

  const rangeIncludesToday = from <= today && today <= to;

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setNoPlan(false);
    try {
      const [fetchedTasks, fetchedBd] = await Promise.all([
        tasksApi.getRange(from, to, token),
        calendarApi.getRange(from, to),
      ]);

      const map: Record<string, BiodynamicDay> = {};
      for (const bd of fetchedBd) map[bd.date] = bd;
      setBdMap(map);

      // If no tasks exist and we're viewing the current week, auto-seed from plan
      if (fetchedTasks.length === 0 && rangeIncludesToday) {
        setIsLoading(false);
        setIsBootstrapping(true);
        try {
          await tasksApi.fromPlanAuto(token);
          const refetched = await tasksApi.getRange(from, to, token);
          setTasks(refetched);
          if (refetched.length === 0) setNoPlan(true);
        } catch {
          setNoPlan(true);
        } finally {
          setIsBootstrapping(false);
        }
      } else {
        setTasks(fetchedTasks);
      }
    } catch (err) {
      console.error('[TaskCalendarPage] load error', err);
    } finally {
      setIsLoading(false);
    }
  }, [from, to, token, rangeIncludesToday]);

  useEffect(() => { loadData(); }, [loadData]);

  // Navigate
  const navigate = (dir: -1 | 1) => {
    setAnchor(prev => {
      const d = new Date(prev);
      if (view === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    setAnchor(d);
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId  = String(active.id);
    const newDate = String(over.id);
    const task    = tasks.find(t => t.id === taskId);
    if (!task || task.date === newDate) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: newDate } : t));
    try {
      await tasksApi.reschedule(taskId, newDate, token);
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: task.date } : t));
    }
  };

  // Task actions
  const handleStatusToggle = async (task: GardenTask) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await tasksApi.update(task.id, { status: newStatus }, token);
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const handleAddTask = async (values: { date: string; title: string; notes?: string }) => {
    try {
      const newTask = await tasksApi.create(values.date, values.title, token, values.notes);
      setTasks(prev => [...prev, newTask]);
    } catch (err) {
      console.error('create task failed', err);
    }
    setAddDate(null);
  };

  const handleEditTask = async (values: { date: string; title: string; notes?: string; status?: GardenTask['status'] }) => {
    if (!editTask) return;
    const updated = { ...editTask, ...values };
    setTasks(prev => prev.map(t => t.id === editTask.id ? updated : t));
    try {
      await tasksApi.update(editTask.id, { date: values.date, title: values.title, notes: values.notes ?? null, status: values.status }, token);
    } catch {
      setTasks(prev => prev.map(t => t.id === editTask.id ? editTask : t));
    }
    setEditTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await tasksApi.delete(id, token);
    } catch {
      await loadData();
    }
    setEditTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t =>
    filter === 'all' ? true : filter === 'pending' ? t.status === 'pending' : t.status === 'done'
  );

  const tasksForDate = (date: string) => filteredTasks.filter(t => t.date === date);

  // Overlay dragged task card
  const draggingTask = draggingId ? tasks.find(t => t.id === draggingId) : null;

  // Header label
  const headerLabel = (() => {
    if (view === 'week') {
      const start = new Date(from + 'T12:00:00');
      const end   = new Date(to   + 'T12:00:00');
      return `${start.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  })();

  const totalPending = tasks.filter(t => t.status === 'pending').length;
  const totalDone    = tasks.filter(t => t.status === 'done').length;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: EARTH, padding: isMobile ? '16px 8px 80px' : '28px 16px 80px', fontFamily: ASST, overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Page header */}
        <div style={{ marginBottom: '16px' }}>
          {/* Row 1: title + stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h1 style={{ fontFamily: FRANK, fontSize: isMobile ? '22px' : '28px', color: GOLD, margin: '0 0 2px' }}>
                📋 לוח משימות
              </h1>
              {tasks.length > 0 && (
                <p style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}55`, margin: 0 }}>
                  {totalDone} מתוך {totalDone + totalPending} הושלמו
                </p>
              )}
            </div>

            {/* View toggle — always top-right */}
            <div style={{ display: 'flex', border: '1px solid rgba(245,200,64,0.2)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              {(['week', 'month'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    fontFamily: ASST, fontSize: '12px', fontWeight: 600,
                    padding: isMobile ? '6px 10px' : '6px 14px', border: 'none', cursor: 'pointer',
                    background: view === v ? 'rgba(245,200,64,0.15)' : 'transparent',
                    color: view === v ? GOLD : `${PARCH}60`,
                  }}
                >
                  {v === 'week' ? 'שבוע' : 'חודש'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: prev/today/next navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: PARCH, cursor: 'pointer', padding: isMobile ? '8px 12px' : '6px 12px', fontFamily: ASST, fontSize: '14px', minWidth: '44px', minHeight: '44px' }}
            >
              ‹ הקודם
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
              <span style={{ fontFamily: FRANK, fontSize: isMobile ? '13px' : '15px', color: PARCH, textAlign: 'center' }}>{headerLabel}</span>
              <button
                onClick={goToday}
                style={{ background: 'none', border: '1px solid rgba(245,200,64,0.25)', borderRadius: '6px', color: GOLD, cursor: 'pointer', padding: '4px 8px', fontFamily: ASST, fontSize: '11px', fontWeight: 600, flexShrink: 0 }}
              >
                היום
              </button>
            </div>

            <button
              onClick={() => navigate(1)}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: PARCH, cursor: 'pointer', padding: isMobile ? '8px 12px' : '6px 12px', fontFamily: ASST, fontSize: '14px', minWidth: '44px', minHeight: '44px' }}
            >
              הבא ›
            </button>
          </div>

          {/* Row 3: filter + BD legend */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'pending', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontFamily: ASST, fontSize: '11px', fontWeight: 600,
                  padding: '4px 8px', borderRadius: '99px',
                  border: `1px solid ${filter === f ? GOLD : 'rgba(255,255,255,0.1)'}`,
                  color: filter === f ? GOLD : `${PARCH}55`,
                  background: filter === f ? 'rgba(245,200,64,0.1)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתינות' : 'הושלמו'}
              </button>
            ))}
            <span style={{ color: `${PARCH}20` }}>|</span>
            {Object.values(DAY_TYPE_STYLES).map(s => (
              <span
                key={s.label}
                style={{ fontFamily: ASST, fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: s.bg, color: s.color }}
              >
                {s.emoji}{!isMobile && ` ${s.label}`}
              </span>
            ))}
          </div>
        </div>

        {/* Week day name headers (month view) */}
        {view === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '6px', marginBottom: '4px' }}>
            {DAY_NAMES_HE.map(d => (
              <div key={d} style={{ textAlign: 'center', fontFamily: ASST, fontSize: isMobile ? '9px' : '11px', color: `${PARCH}50`, padding: '4px 0' }}>
                {isMobile ? d.slice(0, 1) : d}
              </div>
            ))}
          </div>
        )}

        {/* Bootstrapping banner — auto-seeding tasks from weekly plan */}
        {isBootstrapping && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(245,200,64,0.07)', border: '1px solid rgba(245,200,64,0.2)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '12px',
          }}>
            <span style={{ fontSize: '20px', animation: 'spin 2s linear infinite' }}>🌕</span>
            <span style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}80` }}>
              צ'ופצ'ו מכין את משימות השבוע מהתכנית...
            </span>
          </div>
        )}

        {/* No plan empty state */}
        {noPlan && !isBootstrapping && tasks.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            border: '1px dashed rgba(245,200,64,0.2)', borderRadius: '16px',
            background: 'rgba(28,58,30,0.3)',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📋</div>
            <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, marginBottom: '10px' }}>
              אין משימות לתקופה זו
            </h2>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}70`, marginBottom: '24px', lineHeight: 1.6 }}>
              צור תכנית שבועית תחילה ומשימות ייווצרו אוטומטית
            </p>
            <Link
              to="/plan"
              style={{
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                color: EARTH, background: GOLD,
                padding: '10px 24px', borderRadius: '8px',
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              צור תכנית שבועית 🌕
            </Link>
          </div>
        )}

        {/* Calendar grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px' }} className="animate-pulse">🌕</div>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}50`, marginTop: '12px' }}>טוען לוח משימות...</p>
          </div>
        ) : noPlan && tasks.length === 0 ? null : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {view === 'week' ? (
              /* Week view — 2-col vertical grid on mobile, 7-col on desktop */
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(7, 1fr)',
                gap: '8px',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                width: '100%',
              }}>
                {days.map((date, idx) => {
                  const { day, num, month: mon } = formatDateHe(date);
                  const bd = bdMap[date];
                  const dayStyle = bd ? DAY_TYPE_STYLES[bd.dayType] : null;
                  // On mobile: last day (index 6) spans both columns
                  const isLast = isMobile && idx === 6;
                  return (
                    <div key={date} style={{ gridColumn: isLast ? '1 / -1' : undefined, boxSizing: 'border-box' }}>
                      {/* Column header */}
                      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                        <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}55` }}>{day}</div>
                        <div style={{ fontFamily: FRANK, fontSize: '16px', color: date === today ? GOLD : PARCH, fontWeight: date === today ? 700 : 400 }}>
                          {num}
                        </div>
                        <div style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}40` }}>{mon}</div>
                        {dayStyle && (
                          <div style={{ fontSize: '12px', marginTop: '2px' }}>{dayStyle.emoji}</div>
                        )}
                        {bd && (
                          <div style={{ fontSize: '12px' }} title={bd.moonPhaseNameHe}>{moonEmoji(bd.moonPhasePct)}</div>
                        )}
                        {bd && bd.plantingScore > 0 && (
                          <div style={{ display: 'flex', gap: '1px', justifyContent: 'center', marginTop: '2px' }}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <div
                                key={i}
                                style={{
                                  width: '8px', height: '3px', borderRadius: '1px',
                                  background: i < bd.plantingScore ? (dayStyle?.color ?? GOLD) : 'rgba(255,255,255,0.08)',
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <DroppableDayCell
                        date={date}
                        bd={bd}
                        tasks={tasksForDate(date)}
                        isCurrentMonth={true}
                        isToday={date === today}
                        compact={false}
                        onAdd={setAddDate}
                        onEdit={setEditTask}
                        onStatusToggle={handleStatusToggle}
                        onDelete={id => handleDeleteTask(id)}
                        draggingId={draggingId}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Month view — grid of weeks */
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '3px' : '6px' }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '6px' }}>
                    {week.map(date => (
                      <DroppableDayCell
                        key={date}
                        date={date}
                        bd={bdMap[date]}
                        tasks={tasksForDate(date)}
                        isCurrentMonth={new Date(date + 'T12:00:00').getMonth() === currentMonth}
                        isToday={date === today}
                        compact={true}
                        isMobileView={isMobile}
                        onAdd={setAddDate}
                        onEdit={setEditTask}
                        onStatusToggle={handleStatusToggle}
                        onDelete={id => handleDeleteTask(id)}
                        draggingId={draggingId}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* DnD overlay — renders the dragged card at pointer */}
            <DragOverlay>
              {draggingTask && (
                <div style={{
                  background: 'rgba(20,50,22,0.95)', border: `1px solid ${GOLD}44`,
                  borderRadius: '7px', padding: '6px 10px',
                  fontFamily: ASST, fontSize: '12px', color: PARCH,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  cursor: 'grabbing', pointerEvents: 'none',
                }}>
                  {TYPE_CONFIG[draggingTask.type].emoji} {draggingTask.title}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add task modal */}
        {addDate && (
          <TaskModal
            initialDate={addDate}
            task={null}
            onSave={handleAddTask}
            onClose={() => setAddDate(null)}
          />
        )}

        {/* Edit task modal */}
        {editTask && (
          <TaskModal
            initialDate={editTask.date}
            task={editTask}
            onSave={handleEditTask}
            onClose={() => setEditTask(null)}
            onDelete={editTask.type === 'custom' ? () => handleDeleteTask(editTask.id) : undefined}
          />
        )}
      </div>
    </div>
  );
}
