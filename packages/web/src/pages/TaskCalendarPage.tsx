import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  biodynamic: { emoji: '🌙', label: 'biodynamic', color: '#7DC084' },
  maintenance: { emoji: '🔧', label: 'maintenance', color: '#C8A040' },
  custom:      { emoji: '✏️', label: 'custom',      color: '#C884C8' },
};

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string; emoji: string; labelKey: string }> = {
  fruit:  { bg: 'rgba(239,116,90,0.18)',  color: '#EF745A', emoji: '🍎', labelKey: 'dayTypes.fruit'  },
  root:   { bg: 'rgba(181,136,99,0.18)',  color: '#B58863', emoji: '🥕', labelKey: 'dayTypes.root'   },
  flower: { bg: 'rgba(196,132,200,0.18)', color: '#C884C8', emoji: '🌸', labelKey: 'dayTypes.flower' },
  leaf:   { bg: 'rgba(125,192,132,0.18)', color: '#7DC084', emoji: '🌿', labelKey: 'dayTypes.leaf'   },
};

// ── Source detection + styles ──────────────────────────────────────────────
function getTaskSource(task: GardenTask): 'biodynamic' | 'weekly_plan' | 'growing_tracker' | 'manual' {
  if (task.type === 'biodynamic' || task.source_action === 'prep500' || task.source_action === 'prep501') {
    return 'biodynamic';
  }
  if (task.source_action === 'growing_tracker') {
    return 'growing_tracker';
  }
  if (task.plan_id) {
    return 'weekly_plan';
  }
  return 'manual';
}

const SOURCE_STYLES = {
  biodynamic: {
    bg:          'rgba(55,138,221,0.12)',
    border:      'rgba(55,138,221,0.3)',
    badgeBg:     'rgba(55,138,221,0.2)',
    badgeColor:  '#85B7EB',
    icon:        '🌙',
    labelKey:    'sources.biodynamic',
  },
  weekly_plan: {
    bg:          'rgba(127,119,221,0.12)',
    border:      'rgba(127,119,221,0.3)',
    badgeBg:     'rgba(127,119,221,0.2)',
    badgeColor:  '#AFA9EC',
    icon:        '✨',
    labelKey:    'sources.weekly_plan',
  },
  growing_tracker: {
    bg:          'rgba(29,158,117,0.12)',
    border:      'rgba(29,158,117,0.3)',
    badgeBg:     'rgba(29,158,117,0.2)',
    badgeColor:  '#5DCAA5',
    icon:        '🌱',
    labelKey:    'sources.growing_tracker',
  },
  manual: {
    bg:          'rgba(186,117,23,0.12)',
    border:      'rgba(186,117,23,0.3)',
    badgeBg:     'rgba(186,117,23,0.2)',
    badgeColor:  '#EF9F27',
    icon:        '✋',
    labelKey:    'sources.manual',
  },
} as const;

function moonEmoji(pct: number, isWaxing: boolean): string {
  if (isWaxing) {
    if (pct <= 2)  return '🌑';
    if (pct <= 48) return '🌒';
    if (pct <= 52) return '🌓';
    if (pct <= 97) return '🌔';
    return '🌕';
  }
  if (pct <= 2)  return '🌑';
  if (pct <= 48) return '🌘';
  if (pct <= 52) return '🌗';
  if (pct <= 97) return '🌖';
  return '🌕';
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
  const day = d.getDay();
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
  const gridStart = startOfWeek(first);
  const gridEnd   = addDays(startOfWeek(last), 6);

  const days: string[] = [];
  let cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(toISO(cur));
    cur = addDays(cur, 1);
  }

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return { from: days[0], to: days[days.length - 1], days, weeks };
}

function formatDate(dateStr: string, dayNames: string[], locale: string): { day: string; num: string; month: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayIdx = (d.getDay() + 6) % 7; // Mon=0
  return {
    day:   dayNames[dayIdx],
    num:   String(d.getDate()),
    month: d.toLocaleDateString(locale, { month: 'short' }),
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
  const { t, i18n } = useTranslation('tasks');
  const isHe = i18n.language === 'he';
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

  const isDone    = task.status === 'done';
  const isSkipped = task.status === 'skipped';
  const source    = getTaskSource(task);
  const src       = SOURCE_STYLES[source];

  const priorityColor =
    task.source_action === 'high'   ? '#EF745A' :
    task.source_action === 'medium' ? GOLD :
    task.source_action === 'low'    ? '#7DC084' : undefined;

  const cardStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity:   isDragging ? 0.4 : isSkipped ? 0.5 : 1,
    background: isDone ? 'rgba(74,124,89,0.15)' : src.bg,
    border:     `1px solid ${isDone ? 'rgba(74,124,89,0.4)' : src.border}`,
    borderRadius: '7px',
    padding:    '5px 8px 6px',
    display:    'flex',
    flexDirection: 'column',
    gap:        '3px',
    cursor:     'grab',
    userSelect: 'none',
    marginBottom: '4px',
    transition: 'opacity 0.15s',
  };

  return (
    <div ref={setNodeRef} style={cardStyle} {...listeners} {...attributes} onClick={e => e.stopPropagation()}>
      {/* Source badge */}
      <span style={{
        alignSelf: 'flex-start',
        fontFamily: ASST, fontSize: '9px',
        background: src.badgeBg, color: src.badgeColor,
        borderRadius: '4px', padding: '1px 5px',
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        lineHeight: 1.4,
      }}>
        {src.icon} {t(src.labelKey)}
      </span>

      {/* Content row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Checkbox */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onStatusToggle(task); }}
          style={{
            flexShrink: 0, width: '32px', height: '32px', borderRadius: '4px',
            border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '-8px -8px -8px -8px', padding: '8px',
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

        {/* Title */}
        <span
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit(task); }}
          style={{
            fontFamily: ASST, fontSize: '12px',
            color: isDone ? `${PARCH}60` : PARCH,
            flex: 1, textDecoration: isDone ? 'line-through' : 'none',
            direction: isHe ? 'rtl' : 'ltr', textAlign: isHe ? 'right' : 'left',
            cursor: 'pointer', overflow: 'hidden',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            minWidth: 0,
          }}
          title={task.title}
        >
          {task.title}
        </span>

        {priorityColor && (
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor, flexShrink: 0 }} />
        )}

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
  onDayClick,
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
  onDayClick: (date: string) => void;
  draggingId: string | null;
}) {
  const { t, i18n } = useTranslation('tasks');
  const isHe = i18n.language === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';
  const DAY_NAMES = t('dayNames', { returnObjects: true }) as string[];

  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayStyle = bd ? DAY_TYPE_STYLES[bd.dayType] : null;
  const { num, day, month } = formatDate(date, DAY_NAMES, locale);

  const done = tasks.filter(t => t.status === 'done').length;

  if (isMobileView && compact) {
    return (
      <div
        ref={setNodeRef}
        onClick={() => onDayClick(date)}
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
      onClick={() => onDayClick(date)}
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
        cursor: 'pointer',
      }}
    >
      {compact ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {dayStyle && (
                <span title={t(dayStyle.labelKey)} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '99px', background: dayStyle.bg, color: dayStyle.color, fontFamily: ASST, fontWeight: 600 }}>
                  {dayStyle.emoji}
                </span>
              )}
              {bd && <span title={bd.moonPhaseNameHe} style={{ fontSize: '11px', lineHeight: 1 }}>{moonEmoji(bd.moonPhasePct, (bd.moonPhaseAngle ?? 90) <= 180)}</span>}
            </div>
            <div style={{ textAlign: isHe ? 'right' : 'left' }}>
              <span style={{ fontFamily: FRANK, fontSize: '14px', color: isToday ? GOLD : isCurrentMonth ? PARCH : `${PARCH}50`, fontWeight: isToday ? 700 : 400 }}>{num}</span>
              <span style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}60`, marginRight: isHe ? '3px' : 0, marginLeft: isHe ? 0 : '3px' }}>{day}</span>
            </div>
          </div>
          {bd && bd.plantingScore > 0 && (
            <div style={{ display: 'flex', gap: '1px', marginBottom: '2px', alignItems: 'center' }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: i < bd.plantingScore ? (bd.plantingScore <= 3 ? '#E24B4A' : bd.plantingScore <= 6 ? '#EF9F27' : '#639922') : 'rgba(255,255,255,0.08)' }} />
              ))}
              <span style={{ fontFamily: ASST, fontSize: '8px', color: `${PARCH}50`, marginInlineStart: '2px' }}>{bd.plantingScore}</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}55` }}>{day}</div>
          <div style={{ fontFamily: FRANK, fontSize: '16px', color: isToday ? GOLD : isCurrentMonth ? PARCH : `${PARCH}50`, fontWeight: isToday ? 700 : 400 }}>{num}</div>
          <div style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}40` }}>{month}</div>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', marginTop: '2px' }}>
            {dayStyle && <span style={{ fontSize: '12px' }} title={t(dayStyle.labelKey)}>{dayStyle.emoji}</span>}
            {bd && <span style={{ fontSize: '12px' }} title={bd.moonPhaseNameHe}>{moonEmoji(bd.moonPhasePct, (bd.moonPhaseAngle ?? 90) <= 180)}</span>}
          </div>
          {bd && bd.plantingScore > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
              <div style={{ display: 'flex', gap: '1px', justifyContent: 'center', alignItems: 'center' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: i < bd.plantingScore ? (bd.plantingScore <= 3 ? '#E24B4A' : bd.plantingScore <= 6 ? '#EF9F27' : '#639922') : 'rgba(255,255,255,0.08)' }} />
                ))}
                <span style={{ fontFamily: ASST, fontSize: '10px', color: `${PARCH}60`, marginInlineStart: '4px' }}>{bd.plantingScore}/10</span>
              </div>
              <span style={{ fontFamily: ASST, fontSize: '9px', color: `${PARCH}30` }}>ציון שתילה ביודינמי</span>
            </div>
          )}
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
            {t('moreCount', { count: tasks.length - 3 })}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <button
          onClick={e => { e.stopPropagation(); onAdd(date); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: ASST, fontSize: '11px', color: `${PARCH}40`,
            padding: '0', lineHeight: 1, minHeight: '44px', minWidth: '44px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${PARCH}40`; }}
        >
          {t('addButton')}
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
  const { t, i18n } = useTranslation('tasks');
  const isHe = i18n.language === 'he';

  const [title, setTitle]   = useState(task?.title ?? '');
  const [date,  setDate]    = useState(task?.date ?? initialDate);
  const [notes, setNotes]   = useState(task?.notes ?? '');
  const [status, setStatus] = useState<GardenTask['status']>(task?.status ?? 'pending');

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,200,64,0.2)',
    borderRadius: '6px', padding: '8px 10px',
    fontFamily: ASST, fontSize: '14px', color: PARCH,
    outline: 'none', direction: isHe ? 'rtl' : 'ltr',
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
        direction: isHe ? 'rtl' : 'ltr',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
            {task ? t('modal.editTask') : t('modal.newTask')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: `${PARCH}60`, cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('modal.titlePlaceholder')}
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
            placeholder={t('modal.notesPlaceholder')}
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
                  {t(`modal.statuses.${s}`)}
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
              {t('modal.delete')}
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
              {t('modal.cancel')}
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
              {t('modal.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Day Detail Modal ──────────────────────────────────────────────────────────
const MODAL_CSS = `
@keyframes modalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

function ModalTaskRow({ task, onStatusToggle }: { task: GardenTask; onStatusToggle: (t: GardenTask) => void }) {
  const { t } = useTranslation('tasks');
  const isDone = task.status === 'done';
  const source = getTaskSource(task);
  const src    = SOURCE_STYLES[source];
  const priorityColor =
    task.source_action === 'high'   ? '#EF745A' :
    task.source_action === 'medium' ? GOLD :
    task.source_action === 'low'    ? '#7DC084' : undefined;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', marginBottom: '6px',
      background: isDone ? 'rgba(74,124,89,0.10)' : src.bg,
      border: `1px solid ${isDone ? 'rgba(74,124,89,0.3)' : src.border}`,
      borderRadius: '8px',
    }}>
      <button
        onClick={() => onStatusToggle(task)}
        style={{
          flexShrink: 0, width: '20px', height: '20px', borderRadius: '5px',
          border: `1.5px solid ${isDone ? '#4A7C59' : 'rgba(255,255,255,0.3)'}`,
          background: isDone ? '#4A7C59' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: 'white', padding: 0,
        }}
      >
        {isDone ? '✓' : ''}
      </button>
      <span style={{
        fontFamily: ASST, fontSize: '14px', flex: 1,
        color: isDone ? `${PARCH}50` : PARCH,
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {task.title}
      </span>
      <span style={{
        fontFamily: ASST, fontSize: '10px',
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

function DayDetailModal({ date, tasks, bd, onClose, onStatusToggle, onAddTask }: {
  date: string;
  tasks: GardenTask[];
  bd?: BiodynamicDay;
  onClose: () => void;
  onStatusToggle: (t: GardenTask) => void;
  onAddTask: (date: string, title: string) => void;
}) {
  const { t, i18n } = useTranslation('tasks');
  const isHe = i18n.language === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';

  const [addingTask, setAddingTask] = useState(false);
  const [newTitle,   setNewTitle]   = useState('');

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks    = tasks.filter(t => t.status === 'done');
  const dayStyle     = bd ? DAY_TYPE_STYLES[bd.dayType] : null;

  const fullDate = new Date(date + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const handleAddSubmit = () => {
    if (!newTitle.trim()) return;
    onAddTask(date, newTitle.trim());
    setNewTitle('');
    setAddingTask(false);
  };

  return (
    <>
      <style>{MODAL_CSS}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(20,43,22,0.98)', border: '1px solid rgba(245,200,64,0.25)',
            borderRadius: '16px', padding: '24px',
            maxWidth: '480px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
            direction: isHe ? 'rtl' : 'ltr',
            animation: 'modalIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '0 0 8px' }}>
                {fullDate}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {dayStyle && (
                  <span style={{
                    fontFamily: ASST, fontSize: '12px', padding: '3px 10px',
                    borderRadius: '99px', background: dayStyle.bg, color: dayStyle.color,
                  }}>
                    {dayStyle.emoji} {t('dayModal.dayTypePrefix')} {t(dayStyle.labelKey)}
                  </span>
                )}
                {bd && (
                  <span style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70` }}>
                    {moonEmoji(bd.moonPhasePct, (bd.moonPhaseAngle ?? 90) <= 180)} {bd.moonPhasePct}%
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: `${PARCH}50`,
                cursor: 'pointer', fontSize: '22px', padding: '0', lineHeight: 1, flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
              <div style={{ fontSize: '44px', marginBottom: '14px' }}>🌿</div>
              <h3 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '0 0 12px' }}>
                {t('dayModal.restDay')}
              </h3>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}80`, lineHeight: 1.8, margin: '0 0 14px', whiteSpace: 'pre-line' }}>
                {t('dayModal.noTasksMsg')}
              </p>
              <p style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: 0 }}>
                {t('dayModal.chupchu')}
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '4px' }}>
              {pendingTasks.map(task => (
                <ModalTaskRow key={task.id} task={task} onStatusToggle={onStatusToggle} />
              ))}
              {doneTasks.length > 0 && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    margin: '14px 0 8px',
                    color: `${PARCH}40`, fontFamily: ASST, fontSize: '11px',
                  }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                    <span>{t('dayModal.done')}</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                  </div>
                  {doneTasks.map(task => (
                    <ModalTaskRow key={task.id} task={task} onStatusToggle={onStatusToggle} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Inline add task */}
          {addingTask && (
            <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
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
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(245,200,64,0.25)',
                  borderRadius: '8px', padding: '8px 12px',
                  fontFamily: ASST, fontSize: '13px', color: PARCH,
                  outline: 'none', direction: isHe ? 'rtl' : 'ltr',
                }}
              />
              <button
                onClick={handleAddSubmit}
                disabled={!newTitle.trim()}
                style={{
                  background: newTitle.trim() ? GOLD : 'rgba(245,200,64,0.3)',
                  border: 'none', borderRadius: '8px', padding: '8px 14px',
                  color: EARTH, fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                  cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {t('dayModal.add')}
              </button>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '16px' }}>
            <button
              onClick={() => setAddingTask(true)}
              style={{
                fontFamily: ASST, fontSize: '13px', color: GOLD,
                background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.2)',
                borderRadius: '8px', padding: '9px 14px', cursor: 'pointer',
              }}
            >
              {t('dayModal.addTaskForDay')}
            </button>
            <button
              onClick={onClose}
              style={{
                fontFamily: ASST, fontSize: '13px', color: `${PARCH}60`,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '9px 16px', cursor: 'pointer',
              }}
            >
              {t('dayModal.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function TaskCalendarPage() {
  const { t, i18n } = useTranslation('tasks');
  const isHe = i18n.language === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';
  const DAY_NAMES = t('dayNames', { returnObjects: true }) as string[];

  const { session } = useAuthStore();
  const token = session?.access_token ?? '';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const [view,       setView]       = useState<'week' | 'month'>('week');
  const [anchor,     setAnchor]     = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [tasks,      setTasks]      = useState<GardenTask[]>([]);
  const [bdMap,      setBdMap]      = useState<Record<string, BiodynamicDay>>({});
  const [isLoading,       setIsLoading]       = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [noPlan,           setNoPlan]          = useState(false);
  const [addDate,      setAddDate]      = useState<string | null>(null);
  const [editTask,     setEditTask]     = useState<GardenTask | null>(null);
  const [draggingId,   setDraggingId]   = useState<string | null>(null);
  const [filter,       setFilter]       = useState<'all' | 'pending' | 'done'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: newDate } : t));
    try {
      await tasksApi.reschedule(taskId, newDate, token);
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: task.date } : t));
    }
  };

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

  const handleDayClick = (date: string) => setSelectedDate(date);

  const handleAddFromModal = async (date: string, title: string) => {
    try {
      const newTask = await tasksApi.create(date, title, token);
      setTasks(prev => [...prev, newTask]);
    } catch (err) {
      console.error('create task from modal failed', err);
    }
  };

  const filteredTasks = tasks.filter(t =>
    filter === 'all' ? true : filter === 'pending' ? t.status === 'pending' : t.status === 'done'
  );

  const tasksForDate = (date: string) => filteredTasks.filter(t => t.date === date);

  const draggingTask = draggingId ? tasks.find(t => t.id === draggingId) : null;

  const headerLabel = (() => {
    if (view === 'week') {
      const start = new Date(from + 'T12:00:00');
      const end   = new Date(to   + 'T12:00:00');
      return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  })();

  const totalPending = tasks.filter(t => t.status === 'pending').length;
  const totalDone    = tasks.filter(t => t.status === 'done').length;

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', backgroundColor: EARTH, padding: isMobile ? '16px 8px 80px' : '28px 16px 80px', fontFamily: ASST, overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Page header */}
        <div style={{ marginBottom: '16px' }}>
          {/* Row 1: title + stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h1 style={{ fontFamily: FRANK, fontSize: isMobile ? '22px' : '28px', color: GOLD, margin: '0 0 2px' }}>
                {t('title')}
              </h1>
              {tasks.length > 0 && (
                <p style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}55`, margin: 0 }}>
                  {t('completedOf', { done: totalDone, total: totalDone + totalPending })}
                </p>
              )}
            </div>

            {/* View toggle */}
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
                  {t(`views.${v}`)}
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
              {t('nav.prev')}
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
              <span style={{ fontFamily: FRANK, fontSize: isMobile ? '13px' : '15px', color: PARCH, textAlign: 'center' }}>{headerLabel}</span>
              <button
                onClick={goToday}
                style={{ background: 'none', border: '1px solid rgba(245,200,64,0.25)', borderRadius: '6px', color: GOLD, cursor: 'pointer', padding: '4px 8px', fontFamily: ASST, fontSize: '11px', fontWeight: 600, flexShrink: 0 }}
              >
                {t('nav.today')}
              </button>
            </div>

            <button
              onClick={() => navigate(1)}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: PARCH, cursor: 'pointer', padding: isMobile ? '8px 12px' : '6px 12px', fontFamily: ASST, fontSize: '14px', minWidth: '44px', minHeight: '44px' }}
            >
              {t('nav.next')}
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
                {t(`filters.${f}`)}
              </button>
            ))}
            <span style={{ color: `${PARCH}20` }}>|</span>
            {Object.values(DAY_TYPE_STYLES).map(s => (
              <span
                key={s.labelKey}
                style={{ fontFamily: ASST, fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: s.bg, color: s.color }}
              >
                {s.emoji}{!isMobile && ` ${t(s.labelKey)}`}
              </span>
            ))}
          </div>

          {/* Row 4: source legend */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
            {(Object.entries(SOURCE_STYLES) as [keyof typeof SOURCE_STYLES, typeof SOURCE_STYLES[keyof typeof SOURCE_STYLES]][]).map(([key, s]) => (
              <span key={key} style={{
                fontFamily: ASST, fontSize: '10px',
                background: s.badgeBg, color: s.badgeColor,
                borderRadius: '4px', padding: '2px 7px',
                display: 'inline-flex', alignItems: 'center', gap: '3px',
              }}>
                {s.icon}{!isMobile && ` ${t(s.labelKey)}`}
              </span>
            ))}
          </div>
        </div>

        {/* Week day name headers (month view) */}
        {view === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '6px', marginBottom: '4px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontFamily: ASST, fontSize: isMobile ? '9px' : '11px', color: `${PARCH}50`, padding: '4px 0' }}>
                {isMobile ? d.slice(0, 1) : d}
              </div>
            ))}
          </div>
        )}

        {/* Bootstrapping banner */}
        {isBootstrapping && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(245,200,64,0.07)', border: '1px solid rgba(245,200,64,0.2)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '12px',
          }}>
            <span style={{ fontSize: '20px', animation: 'spin 2s linear infinite' }}>🌕</span>
            <span style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}80` }}>
              {t('bootstrapping')}
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
              {t('noTasks.title')}
            </h2>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}70`, marginBottom: '24px', lineHeight: 1.6 }}>
              {t('noTasks.desc')}
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
              {t('noTasks.cta')}
            </Link>
          </div>
        )}

        {/* Calendar grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px' }} className="animate-pulse">🌕</div>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}50`, marginTop: '12px' }}>{t('loading')}</p>
          </div>
        ) : noPlan && tasks.length === 0 ? null : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {view === 'week' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(7, 1fr)',
                gap: '8px',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                width: '100%',
              }}>
                {days.map((date, idx) => {
                  const isLast = isMobile && idx === 6;
                  return (
                    <div key={date} style={{ gridColumn: isLast ? '1 / -1' : undefined, boxSizing: 'border-box', overflow: 'hidden', width: '100%' }}>
                      <DroppableDayCell
                        date={date}
                        bd={bdMap[date]}
                        tasks={tasksForDate(date)}
                        isCurrentMonth={true}
                        isToday={date === today}
                        compact={false}
                        onAdd={setAddDate}
                        onEdit={setEditTask}
                        onStatusToggle={handleStatusToggle}
                        onDelete={id => handleDeleteTask(id)}
                        onDayClick={handleDayClick}
                        draggingId={draggingId}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
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
                        onDayClick={handleDayClick}
                        draggingId={draggingId}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* DnD overlay */}
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

        {/* Day detail modal */}
        {selectedDate && (
          <DayDetailModal
            date={selectedDate}
            tasks={tasks.filter(t => t.date === selectedDate)}
            bd={bdMap[selectedDate]}
            onClose={() => setSelectedDate(null)}
            onStatusToggle={handleStatusToggle}
            onAddTask={handleAddFromModal}
          />
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
