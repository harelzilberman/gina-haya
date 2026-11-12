import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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
import { addDaysISO, localTodayISO, SCORE_COLOURS, CALENDAR_DATA_MIN_DATE, type BiodynamicDay } from '@gina-haya/shared';
import { useAuthStore } from '../stores/authStore';
import { tasksApi, type GardenTask } from '../api/tasks';
import { calendarApi } from '../api/calendar';
import { useCalendarZone } from '../hooks/useCalendarZone';
import { EN_HEADING } from '../styles/fonts';
import { DayPanel, DayPanelSheet } from '../components/calendar/DayPanel';
import {
  EARTH, GOLD, PARCH, FRANK, TYPE_CONFIG, DAY_TYPE_STYLES, DAY_TYPE_DESCS_HE, SOURCE_STYLES,
  getTaskSource, priorityColorOf, moonEmoji, formatLocalDate,
} from '../components/calendar/taskStyles';

// ── Biodynamic calendar page (/calendar) ─────────────────────────────────────
//
// The calendar grid (month by default, or week) with tasks, plus the selected
// day's full biodynamic card and tasks: a sticky side panel on desktop
// (≥ 1024px), a bottom sheet on narrow screens. The selected date and the
// view live in the URL (?date=YYYY-MM-DD&view=month|week). All dates are the
// active garden's LOCAL dates (useCalendarZone); date math is on "YYYY-MM-DD"
// strings, never on Date objects in the browser's zone.

const DESKTOP_MIN = 1024;
const MOBILE_MAX  = 768;
const PANEL_WIDTH = 400;
const ISO_DATE    = /^\d{4}-\d{2}-\d{2}$/;

function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

/**
 * First day of the week, 0 = Sunday … 6 = Saturday. Hebrew (Israel) weeks
 * start on Sunday; otherwise the browser locale's week info decides
 * (Intl firstDay: 1 = Monday … 7 = Sunday), falling back to Sunday.
 */
function weekStartFor(lang: string): number {
  if (lang.startsWith('he')) return 0;
  try {
    type WeekInfo = { firstDay?: number };
    const loc = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
    const first = Number(info?.firstDay);
    if (Number.isInteger(first) && first >= 1 && first <= 7) return first % 7;
  } catch { /* old browser / bad tag → Sunday */ }
  return 0;
}

/**
 * Short weekday label for a date. dayNames (tasks locale) is Monday-first;
 * index it by the date's real weekday so any week start lines up.
 */
function dayNameOf(dayNames: string[], iso: string): string {
  return dayNames[(weekdaySun0(iso) + 6) % 7];
}

/** Header labels in grid order for a week starting on `weekStart` (0 = Sunday). */
function weekdayHeaders(dayNames: string[], weekStart: number): string[] {
  return Array.from({ length: 7 }, (_, i) => dayNames[(weekStart + i + 6) % 7]);
}

// ── Pure "YYYY-MM-DD" date math (weekStart: 0 = Sunday … 6 = Saturday) ─────

function isRealISODate(s: string | null): s is string {
  if (!s || !ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Sunday = 0 … Saturday = 6 */
function weekdaySun0(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay();
}

function startOfWeekISO(iso: string, weekStart: number): string {
  return addDaysISO(iso, -((weekdaySun0(iso) - weekStart + 7) % 7));
}

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

function monthStartISO(key: string): string {
  return `${key}-01`;
}

function monthEndISO(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function shiftMonthKey(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

function monthGrid(key: string, weekStart: number): { from: string; to: string; days: string[]; weeks: string[][] } {
  const from = startOfWeekISO(monthStartISO(key), weekStart);
  const to   = addDaysISO(startOfWeekISO(monthEndISO(key), weekStart), 6);
  const days: string[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) days.push(d);
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return { from, to, days, weeks };
}

function weekRange(anchor: string, weekStart: number): { from: string; to: string; days: string[] } {
  const from = startOfWeekISO(anchor, weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(from, i));
  return { from, to: days[6], days };
}

// ── Draggable task card (inside day cells) ───────────────────────────────────
function DraggableTaskCard({
  task, onEdit, onStatusToggle, onDelete, isDragging = false,
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
  const src       = SOURCE_STYLES[getTaskSource(task)];
  const priorityColor = priorityColorOf(task);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // The day cell is the keyboard target; task cards are reached by pointer
      // (drag) or via the day panel.
      tabIndex={-1}
      role="group"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.4 : isSkipped ? 0.5 : 1,
        background: isDone ? 'rgba(0,229,195,0.08)' : src.bg,
        border: `1px solid ${isDone ? 'rgba(0,229,195,0.2)' : src.border}`,
        borderRadius: '7px', padding: '5px 8px 6px',
        display: 'flex', flexDirection: 'column', gap: '3px',
        cursor: 'grab', userSelect: 'none', marginBottom: '4px', transition: 'opacity 0.15s',
      }}
    >
      <span style={{
        alignSelf: 'flex-start', fontFamily: EN_HEADING, fontSize: '9px',
        background: src.badgeBg, color: src.badgeColor, borderRadius: '4px', padding: '1px 5px',
        display: 'inline-flex', alignItems: 'center', gap: '3px', lineHeight: 1.4,
      }}>
        {src.icon} {t(src.labelKey)}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          tabIndex={-1}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onStatusToggle(task); }}
          aria-label={isDone ? t('panel.markPending', { title: task.title }) : t('panel.markDone', { title: task.title })}
          style={{
            flexShrink: 0, width: '32px', height: '32px', borderRadius: '4px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '-8px', padding: '8px',
          }}
        >
          <span style={{
            width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
            border: `1.5px solid ${isDone ? '#4A9C68' : 'rgba(255,255,255,0.25)'}`,
            background: isDone ? '#4A9C68' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white',
          }}>
            {isDone ? '✓' : ''}
          </span>
        </button>

        <span
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit(task); }}
          style={{
            fontFamily: EN_HEADING, fontSize: '12px', color: isDone ? `${PARCH}60` : PARCH,
            flex: 1, textDecoration: isDone ? 'line-through' : 'none',
            direction: isHe ? 'rtl' : 'ltr', textAlign: isHe ? 'right' : 'left',
            cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0,
          }}
          title={task.title}
        >
          {task.title}
        </span>

        {priorityColor && (
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor, flexShrink: 0 }} />
        )}

        <button
          tabIndex={-1}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          title={t('modal.delete')}
          aria-label={t('modal.delete')}
          style={{
            flexShrink: 0, width: '28px', height: '28px', borderRadius: '6px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)', fontSize: '14px', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(200,60,60,0.15)';
            e.currentTarget.style.color = '#e05555';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Markers shown in every cell ──────────────────────────────────────────────
function DayMarkers({ bd, size = 8 }: { bd?: BiodynamicDay; size?: number }) {
  const { t } = useTranslation('calendar');
  if (!bd) return null;
  const hasSignChange = (bd.transitions ?? []).some(tr => tr.type === 'sign_change');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      <span
        title={t('page.scoreDot', { score: bd.plantingScore })}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: SCORE_COLOURS[bd.scoreColour], flexShrink: 0 }}
      />
      {bd.nodeBlackoutToday && (
        <span title={t('page.nodeMarker')} style={{ fontSize: `${size + 2}px`, lineHeight: 1 }}>⚫</span>
      )}
      {hasSignChange && (
        <span title={t('page.signChangeMarker')} style={{ fontSize: `${size + 3}px`, lineHeight: 1, color: GOLD }}>⇄</span>
      )}
    </span>
  );
}

// ── Droppable day cell ───────────────────────────────────────────────────────
interface DayCellProps {
  date: string;
  bd?: BiodynamicDay;
  tasks: GardenTask[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tabbable: boolean;
  compact: boolean;
  isMobileView?: boolean;
  onAdd: (date: string) => void;
  onEdit: (t: GardenTask) => void;
  onStatusToggle: (t: GardenTask) => void;
  onDelete: (id: string) => void;
  onSelect: (date: string) => void;
  onArrow: (date: string, key: string) => void;
  draggingId: string | null;
}

function DroppableDayCell({
  date, bd, tasks, isCurrentMonth, isToday, isSelected, tabbable, compact, isMobileView = false,
  onAdd, onEdit, onStatusToggle, onDelete, onSelect, onArrow, draggingId,
}: DayCellProps) {
  const { t, i18n } = useTranslation('tasks');
  const { t: tc } = useTranslation('calendar');
  const isHe = i18n.language === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';
  const DAY_NAMES = t('dayNames', { returnObjects: true }) as string[];

  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayStyle = bd ? DAY_TYPE_STYLES[bd.dayType] : null;
  const num   = String(Number(date.slice(8, 10)));
  const day   = dayNameOf(DAY_NAMES, date);
  const month = formatLocalDate(date, locale, { month: 'short' });
  const done  = tasks.filter(x => x.status === 'done').length;

  const ariaLabel = tc('page.cellAria', {
    date: formatLocalDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    dayType: dayStyle ? t(dayStyle.labelKey) : tc('page.noDayType'),
    count: tasks.length,
  });

  const borderColour = isSelected ? GOLD
    : isOver ? 'rgba(0,229,195,0.4)'
    : isToday ? 'rgba(0,229,195,0.25)'
    : 'rgba(255,255,255,0.06)';

  const common = {
    ref: setNodeRef,
    role: 'button' as const,
    tabIndex: tabbable ? 0 : -1,
    'aria-label': ariaLabel,
    'aria-pressed': isSelected,
    'aria-current': isToday ? ('date' as const) : undefined,
    'data-date': date,
    onClick: () => onSelect(date),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(date); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        onArrow(date, e.key);
      }
    },
  };

  const numberColour = isToday ? GOLD : isCurrentMonth ? PARCH : `${PARCH}50`;

  if (isMobileView && compact) {
    return (
      <div
        {...common}
        style={{
          background: isOver ? 'rgba(0,229,195,0.08)' : isSelected ? 'rgba(0,229,195,0.12)' : isToday ? 'rgba(0,229,195,0.07)' : 'rgba(9,20,16,0.35)',
          border: `${isSelected ? 2 : 1}px solid ${borderColour}`,
          borderRadius: '6px', padding: '4px 2px', minHeight: '56px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
          opacity: isCurrentMonth ? 1 : 0.35, boxSizing: 'border-box', cursor: 'pointer', outlineOffset: '2px',
        }}
      >
        <span style={{ fontFamily: FRANK, fontSize: '12px', color: numberColour, fontWeight: isToday ? 700 : 400, lineHeight: 1.2 }}>
          {num}
        </span>
        {dayStyle && <span style={{ fontSize: '9px', lineHeight: 1 }}>{dayStyle.emoji}</span>}
        <DayMarkers bd={bd} size={5} />
        {tasks.length > 0 && (
          <span style={{
            fontFamily: EN_HEADING, fontSize: '9px', fontWeight: 700,
            background: 'rgba(0,229,195,0.2)', color: GOLD, borderRadius: '99px', padding: '1px 4px', lineHeight: 1.4,
          }}>
            {tasks.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      {...common}
      style={{
        background: isOver ? 'rgba(0,229,195,0.08)' : isSelected ? 'rgba(0,229,195,0.09)' : isToday ? 'rgba(0,229,195,0.05)' : 'rgba(9,20,16,0.35)',
        border: `${isSelected ? 2 : 1}px solid ${borderColour}`,
        borderRadius: '10px', padding: compact ? '6px' : '8px',
        minHeight: compact ? '96px' : '120px',
        display: 'flex', flexDirection: 'column', gap: '4px',
        opacity: isCurrentMonth ? 1 : 0.45,
        transition: 'background 0.15s, border-color 0.15s',
        boxSizing: 'border-box', width: '100%', cursor: 'pointer', outlineOffset: '2px', minWidth: 0,
      }}
    >
      {compact ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', minWidth: 0 }}>
              {dayStyle && (
                <span title={`${t(dayStyle.labelKey)} — ${DAY_TYPE_DESCS_HE[bd!.dayType] ?? ''}`} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '99px', background: dayStyle.bg, color: dayStyle.color, fontFamily: EN_HEADING, fontWeight: 600 }}>
                  {dayStyle.emoji}
                </span>
              )}
              {bd && <span title={bd.moonPhaseNameHe} style={{ fontSize: '11px', lineHeight: 1 }}>{moonEmoji(bd.moonPhasePct, (bd.moonPhaseAngle ?? 90) <= 180)}</span>}
              <DayMarkers bd={bd} size={7} />
            </div>
            <div style={{ textAlign: isHe ? 'right' : 'left', flexShrink: 0 }}>
              <span style={{ fontFamily: FRANK, fontSize: '14px', color: numberColour, fontWeight: isToday ? 700 : 400 }}>{num}</span>
              <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}CC`, marginInlineStart: '3px' }}>{day}</span>
            </div>
          </div>
          {bd && bd.plantingScore > 0 && (
            <div aria-hidden style={{ display: 'flex', gap: '1px', marginBottom: '2px', alignItems: 'center' }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: i < bd.plantingScore ? (bd.plantingScore <= 3 ? '#E24B4A' : bd.plantingScore <= 6 ? '#EF9F27' : '#639922') : 'rgba(255,255,255,0.08)' }} />
              ))}
              <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF`, marginInlineStart: '2px' }}>{bd.plantingScore}</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}CC` }}>{day}</div>
          <div style={{ fontFamily: FRANK, fontSize: '16px', color: numberColour, fontWeight: isToday ? 700 : 400 }}>{num}</div>
          <div style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF` }}>{month}</div>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', marginTop: '2px' }}>
            {dayStyle && <span style={{ fontSize: '12px' }} title={`${t(dayStyle.labelKey)} — ${DAY_TYPE_DESCS_HE[bd!.dayType] ?? ''}`}>{dayStyle.emoji}</span>}
            {bd && <span style={{ fontSize: '12px' }} title={bd.moonPhaseNameHe}>{moonEmoji(bd.moonPhasePct, (bd.moonPhaseAngle ?? 90) <= 180)}</span>}
            <DayMarkers bd={bd} size={8} />
          </div>
          {bd && bd.plantingScore > 0 && (
            <div aria-hidden style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
              <div style={{ display: 'flex', gap: '1px', justifyContent: 'center', alignItems: 'center' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: i < bd.plantingScore ? (bd.plantingScore <= 3 ? '#E24B4A' : bd.plantingScore <= 6 ? '#EF9F27' : '#639922') : 'rgba(255,255,255,0.08)' }} />
                ))}
                <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}CC`, marginInlineStart: '4px' }}>{bd.plantingScore}/10</span>
              </div>
              <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF` }}>{tc('page.plantingScoreLabel')}</span>
            </div>
          )}
        </div>
      )}

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
          <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF` }}>
            {t('moreCount', { count: tasks.length - 3 })}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <button
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); onAdd(date); }}
          onKeyDown={e => e.stopPropagation()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF`,
            padding: '0', lineHeight: 1, minHeight: '36px', minWidth: '36px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
          onMouseLeave={e => { e.currentTarget.style.color = `${PARCH}BF`; }}
        >
          {t('addButton')}
        </button>
        {tasks.length > 0 && (
          <span style={{ fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF` }}>
            {done}/{tasks.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Add / edit task modal ────────────────────────────────────────────────────
function TaskModal({
  initialDate, task, onSave, onClose, onDelete,
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,229,195,0.2)',
    borderRadius: '6px', padding: '8px 10px',
    fontFamily: EN_HEADING, fontSize: '14px', color: PARCH,
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
      <div role="dialog" aria-modal="true" aria-labelledby="task-modal-title" style={{
        background: '#111f18', border: '1px solid rgba(0,229,195,0.2)',
        borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px',
        direction: isHe ? 'rtl' : 'ltr', margin: '0 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 id="task-modal-title" style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
            {task ? t('modal.editTask') : t('modal.newTask')}
          </h3>
          <button onClick={onClose} aria-label={t('modal.cancel')} style={{ background: 'none', border: 'none', color: `${PARCH}60`, cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('modal.titlePlaceholder')}
            aria-label={t('modal.titlePlaceholder')}
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
            aria-label={t('modal.notesPlaceholder')}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
          />
          {task && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['pending', 'done', 'skipped'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '6px', cursor: 'pointer',
                    border: `1px solid ${status === s ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    background: status === s ? 'rgba(0,229,195,0.12)' : 'transparent',
                    color: status === s ? GOLD : `${PARCH}60`,
                    fontFamily: EN_HEADING, fontSize: '11px',
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
                color: 'rgba(220,80,80,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: EN_HEADING, fontSize: '13px',
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
                color: `${PARCH}60`, background: 'transparent', cursor: 'pointer', fontFamily: EN_HEADING, fontSize: '13px',
              }}
            >
              {t('modal.cancel')}
            </button>
            <button
              onClick={() => { if (title.trim()) onSave({ date, title: title.trim(), notes: notes || undefined, status }); }}
              disabled={!title.trim()}
              style={{
                padding: '8px 18px', borderRadius: '6px', border: 'none',
                background: title.trim() ? GOLD : 'rgba(0,229,195,0.3)',
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

// ── Main page ────────────────────────────────────────────────────────────────
export function BiodynamicCalendarPage() {
  const { t, i18n } = useTranslation('tasks');
  const { t: tc } = useTranslation('calendar');
  const isHe = i18n.language === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';
  const DAY_NAMES = t('dayNames', { returnObjects: true }) as string[];
  // Month grid, week view and weekday headers all use this one week start.
  const weekStart = useMemo(() => weekStartFor(i18n.language), [i18n.language]);
  const headerDayNames = weekdayHeaders(DAY_NAMES, weekStart);

  const { session } = useAuthStore();
  const token = session?.access_token ?? '';
  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= DESKTOP_MIN;
  const isMobile  = windowWidth < MOBILE_MAX;

  // The active garden's timezone / hemisphere variant.
  const zone = useCalendarZone();
  const todayISO = localTodayISO(zone.timezone);

  // ── Calendar data range (navigation stops at both ends) ──
  // From /api/calendar/status; the start falls back to CALENDAR_DATA_MIN_DATE.
  const [minDate, setMinDate] = useState<string>(CALENDAR_DATA_MIN_DATE);
  const [maxDate, setMaxDate] = useState<string | null>(null);
  const [statusSettled, setStatusSettled] = useState(false);
  useEffect(() => {
    calendarApi.getStatus()
      .then(s => {
        if (s.minDate && ISO_DATE.test(s.minDate)) setMinDate(s.minDate);
        setMaxDate(s.maxDate);
      })
      .catch(() => setMaxDate(null))
      .finally(() => setStatusSettled(true));
  }, []);

  // ── URL state: ?date=YYYY-MM-DD & ?view=month|week ──
  const [searchParams, setSearchParams] = useSearchParams();
  const view: 'month' | 'week' = searchParams.get('view') === 'week' ? 'week' : 'month';
  const rawDate = searchParams.get('date');
  const dateIsValid = isRealISODate(rawDate)
    && rawDate >= minDate
    && (maxDate == null || rawDate <= maxDate);
  const selectedDate = dateIsValid ? rawDate : todayISO;

  // Drop an invalid / out-of-range ?date= from the URL (→ today).
  useEffect(() => {
    if (rawDate != null && !dateIsValid && (statusSettled || !isRealISODate(rawDate))) {
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('date'); return p; }, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawDate, dateIsValid, statusSettled]);

  const selectDate = useCallback((date: string, replace = false) => {
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('date', date); return p; }, { replace });
  }, [setSearchParams]);

  const setView = (v: 'month' | 'week') => {
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('view', v); return p; }, { replace: true });
    setAnchor(selectedDate);
  };

  // ── Visible period ──
  // anchor = any date inside the visible month / week. Navigation moves the
  // anchor only; the selection (and the panel) stays until a day is clicked.
  const [anchor, setAnchor] = useState<string>(selectedDate);
  const anchorMonth = monthKeyOf(anchor);

  const { from, to, days, weeks } = useMemo(() => {
    if (view === 'week') {
      const w = weekRange(anchor, weekStart);
      return { ...w, weeks: [w.days] };
    }
    return monthGrid(anchorMonth, weekStart);
  }, [view, anchor, anchorMonth, weekStart]);

  // Keep the selected date in view when it changes (URL back/forward, keyboard,
  // "back to today"), but never jump on plain month navigation.
  useEffect(() => {
    if (selectedDate < from || selectedDate > to) setAnchor(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // ── Biodynamic days: one /range call per month grid, cached per zone ──
  const dayCache     = useRef(new Map<string, BiodynamicDay>());
  const monthsLoaded = useRef(new Map<string, 'loading' | 'done'>());
  const cacheZone    = useRef<string>('');
  const [cacheVersion, setCacheVersion] = useState(0);

  const ensureMonth = useCallback((key: string) => {
    if (!zone.ready) return;
    if (cacheZone.current !== zone.query) {
      cacheZone.current = zone.query;
      dayCache.current = new Map();
      monthsLoaded.current = new Map();
    }
    if (monthsLoaded.current.has(key)) return;
    if (maxDate && monthStartISO(key) > maxDate) return;
    if (monthEndISO(key) < minDate) return;
    monthsLoaded.current.set(key, 'loading');
    const grid = monthGrid(key, weekStart);
    const queryAtStart = zone.query;
    calendarApi.getRange(grid.from, grid.to, zone)
      .then(list => {
        if (cacheZone.current !== queryAtStart) return;
        for (const bd of list) dayCache.current.set(bd.date, bd);
        monthsLoaded.current.set(key, 'done');
        setCacheVersion(v => v + 1);
      })
      .catch(err => {
        console.error('[BiodynamicCalendarPage] calendar range failed', err);
        monthsLoaded.current.delete(key);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.ready, zone.query, zone.token, maxDate, minDate, weekStart]);

  useEffect(() => {
    const visibleMonths = new Set([monthKeyOf(from), anchorMonth, monthKeyOf(to)]);
    for (const m of visibleMonths) ensureMonth(m);
    // Prefetch the neighbours.
    ensureMonth(shiftMonthKey(anchorMonth, -1));
    ensureMonth(shiftMonthKey(anchorMonth, 1));
    // The panel's day may be outside the visible period.
    ensureMonth(monthKeyOf(selectedDate));
  }, [ensureMonth, from, to, anchorMonth, selectedDate]);

  const bdFor = useCallback(
    (date: string) => dayCache.current.get(date),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheVersion],
  );
  const monthState = (key: string) => monthsLoaded.current.get(key);

  // Empty month (data loaded, no days inside the month itself).
  const visibleMonthEmpty = view === 'month'
    && monthState(anchorMonth) === 'done'
    && !days.some(d => monthKeyOf(d) === anchorMonth && dayCache.current.has(d));
  const visibleMonthBeyondData = view === 'month'
    && ((maxDate != null && monthStartISO(anchorMonth) > maxDate) || monthEndISO(anchorMonth) < minDate);

  // ── Tasks ──
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  /** Load [rFrom, rTo] and replace the tasks in that range. */
  const loadTasks = useCallback(async (rFrom: string, rTo: string) => {
    if (!token) return;
    try {
      const fetched = await tasksApi.getRange(rFrom, rTo, token);
      setTasks(prev => [...prev.filter(x => x.date < rFrom || x.date > rTo), ...fetched]);
    } catch (err) {
      console.error('[BiodynamicCalendarPage] tasks load error', err);
    } finally {
      setTasksLoaded(true);
    }
  }, [token]);

  useEffect(() => { loadTasks(from, to); }, [loadTasks, from, to]);
  useEffect(() => {
    if (selectedDate < from || selectedDate > to) loadTasks(selectedDate, selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // ── UI state ──
  const [addDate,       setAddDate]       = useState<string | null>(null);
  const [editTask,      setEditTask]      = useState<GardenTask | null>(null);
  const [draggingId,    setDraggingId]    = useState<string | null>(null);
  const [filter,        setFilter]        = useState<'all' | 'pending' | 'done'>('all');
  const [showDayLegend, setShowDayLegend] = useState(false);
  const [sheetOpen,     setSheetOpen]     = useState(false);

  useEffect(() => { if (isDesktop) setSheetOpen(false); }, [isDesktop]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // ── Navigation ──
  const periodStartAfter = (dir: -1 | 1): string => view === 'week'
    ? addDaysISO(startOfWeekISO(anchor, weekStart), dir * 7)
    : monthStartISO(shiftMonthKey(anchorMonth, dir));
  const periodEndOf = (start: string): string => view === 'week'
    ? addDaysISO(start, 6)
    : monthEndISO(monthKeyOf(start));
  const nextDisabled = maxDate != null && periodStartAfter(1) > maxDate;
  const prevDisabled = periodEndOf(periodStartAfter(-1)) < minDate;

  const navigate = (dir: -1 | 1) => {
    if (dir === 1 && nextDisabled) return;
    if (dir === -1 && prevDisabled) return;
    setAnchor(periodStartAfter(dir));
  };

  const goToday = () => {
    setAnchor(todayISO);
    selectDate(todayISO);
  };

  // ── Selection / keyboard ──
  const pendingFocus = useRef<string | null>(null);
  const handleSelect = (date: string) => {
    selectDate(date);
    if (!isDesktop) setSheetOpen(true);
  };

  const handleArrow = (date: string, key: string) => {
    const rtl = isHe;
    const delta =
      key === 'ArrowUp'   ? -7 :
      key === 'ArrowDown' ?  7 :
      key === 'ArrowRight' ? (rtl ? -1 : 1) :
      /* ArrowLeft */        (rtl ? 1 : -1);
    const next = addDaysISO(date, delta);
    if ((maxDate && next > maxDate) || next < minDate) return;
    pendingFocus.current = next;
    selectDate(next, true);
    if (next < from || next > to) setAnchor(next);
  };

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-date="${target}"]`);
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  });

  // ── Task handlers ──
  const handleDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId  = String(active.id);
    const newDate = String(over.id);
    selectDate(newDate);
    const task = tasks.find(x => x.id === taskId);
    if (!task || task.date === newDate) return;

    setTasks(prev => prev.map(x => x.id === taskId ? { ...x, date: newDate } : x));
    try {
      await tasksApi.reschedule(taskId, newDate, token);
    } catch {
      setTasks(prev => prev.map(x => x.id === taskId ? { ...x, date: task.date } : x));
    }
  };

  const handleStatusToggle = async (task: GardenTask) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, status: newStatus } : x));
    try {
      await tasksApi.update(task.id, { status: newStatus }, token);
    } catch {
      setTasks(prev => prev.map(x => x.id === task.id ? { ...x, status: task.status } : x));
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
    setTasks(prev => prev.map(x => x.id === editTask.id ? updated : x));
    try {
      await tasksApi.update(editTask.id, { date: values.date, title: values.title, notes: values.notes ?? null, status: values.status }, token);
    } catch {
      setTasks(prev => prev.map(x => x.id === editTask.id ? editTask : x));
    }
    setEditTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(x => x.id !== id));
    try {
      await tasksApi.delete(id, token);
    } catch {
      await loadTasks(from, to);
    }
    setEditTask(null);
  };

  const handleAddFromPanel = async (date: string, title: string) => {
    try {
      const newTask = await tasksApi.create(date, title, token);
      setTasks(prev => [...prev, newTask]);
    } catch (err) {
      console.error('create task from panel failed', err);
    }
  };

  // ── Derived ──
  const filteredTasks = tasks.filter(x =>
    filter === 'all' ? true : filter === 'pending' ? x.status === 'pending' : x.status === 'done'
  );
  const tasksForDate = (date: string) => filteredTasks.filter(x => x.date === date);
  const draggingTask = draggingId ? tasks.find(x => x.id === draggingId) : null;
  const visibleTasks = tasks.filter(x => x.date >= from && x.date <= to);
  const totalPending = visibleTasks.filter(x => x.status === 'pending').length;
  const totalDone    = visibleTasks.filter(x => x.status === 'done').length;
  const selectionVisible = selectedDate >= from && selectedDate <= to;

  const headerLabel = view === 'week'
    ? `${formatLocalDate(from, locale, { day: 'numeric', month: 'long' })} – ${formatLocalDate(to, locale, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : formatLocalDate(monthStartISO(anchorMonth), locale, { month: 'long', year: 'numeric' });

  const panelProps = {
    date: selectedDate,
    todayISO,
    bd: bdFor(selectedDate),
    bdLoading: monthState(monthKeyOf(selectedDate)) !== 'done',
    // The panel lists all of the day's tasks (pending and done), unfiltered.
    tasks: tasks.filter(x => x.date === selectedDate),
    onBackToToday: goToday,
    onStatusToggle: handleStatusToggle,
    onEdit: setEditTask,
    onAddTask: handleAddFromPanel,
  };

  const cell = (date: string, compact: boolean, idx = 0) => (
    <DroppableDayCell
      key={date}
      date={date}
      bd={bdFor(date)}
      tasks={tasksForDate(date)}
      isCurrentMonth={view === 'week' || monthKeyOf(date) === anchorMonth}
      isToday={date === todayISO}
      isSelected={date === selectedDate}
      tabbable={selectionVisible ? date === selectedDate : idx === 0}
      compact={compact}
      isMobileView={isMobile}
      onAdd={setAddDate}
      onEdit={setEditTask}
      onStatusToggle={handleStatusToggle}
      onDelete={id => handleDeleteTask(id)}
      onSelect={handleSelect}
      onArrow={handleArrow}
      draggingId={draggingId}
    />
  );

  const navButtonStyle: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: PARCH,
    cursor: 'pointer', padding: isMobile ? '8px 12px' : '6px 12px', fontFamily: EN_HEADING, fontSize: '14px',
    minWidth: '44px', minHeight: '44px',
  };

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', backgroundColor: EARTH, padding: isMobile ? '16px 8px 80px' : '28px 16px 80px', fontFamily: EN_HEADING, overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        maxWidth: isDesktop ? '1440px' : '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box',
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? `minmax(0, 1fr) ${PANEL_WIDTH}px` : undefined,
        gap: '24px', alignItems: 'start',
      }}>

        {/* ── Calendar (start side) ── */}
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: '16px' }}>
            {/* Title + stats + view toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h1 style={{ fontFamily: FRANK, fontSize: isMobile ? '22px' : '28px', color: GOLD, margin: '0 0 2px' }}>
                  {tc('title')}
                </h1>
                {visibleTasks.length > 0 && (
                  <p style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}CC`, margin: 0 }}>
                    {t('completedOf', { done: totalDone, total: totalDone + totalPending })}
                  </p>
                )}
              </div>
              <div role="group" aria-label={tc('page.viewToggle')} style={{ display: 'flex', border: '1px solid rgba(0,229,195,0.2)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                {(['month', 'week'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    style={{
                      fontFamily: EN_HEADING, fontSize: '12px', fontWeight: 600,
                      padding: isMobile ? '6px 10px' : '6px 14px', border: 'none', cursor: 'pointer',
                      background: view === v ? 'rgba(0,229,195,0.15)' : 'transparent',
                      color: view === v ? GOLD : `${PARCH}60`,
                    }}
                  >
                    {t(`views.${v}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* prev / today / next */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button
                onClick={() => navigate(-1)}
                disabled={prevDisabled}
                title={prevDisabled ? tc('page.startOfData') : undefined}
                style={{ ...navButtonStyle, opacity: prevDisabled ? 0.3 : 1, cursor: prevDisabled ? 'default' : 'pointer' }}
              >
                {t('nav.prev')}
              </button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <span aria-live="polite" style={{ fontFamily: FRANK, fontSize: isMobile ? '13px' : '15px', color: PARCH, textAlign: 'center' }}>{headerLabel}</span>
                <button
                  onClick={goToday}
                  style={{ background: 'none', border: '1px solid rgba(0,229,195,0.25)', borderRadius: '6px', color: GOLD, cursor: 'pointer', padding: '4px 8px', fontFamily: EN_HEADING, fontSize: '11px', fontWeight: 600, flexShrink: 0 }}
                >
                  {t('nav.today')}
                </button>
              </div>
              <button
                onClick={() => navigate(1)}
                disabled={nextDisabled}
                title={nextDisabled ? tc('page.endOfData') : undefined}
                style={{ ...navButtonStyle, opacity: nextDisabled ? 0.3 : 1, cursor: nextDisabled ? 'default' : 'pointer' }}
              >
                {t('nav.next')}
              </button>
            </div>

            {/* filter + day-type legend */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['all', 'pending', 'done'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  style={{
                    fontFamily: EN_HEADING, fontSize: '11px', fontWeight: 600,
                    padding: '4px 8px', borderRadius: '99px',
                    border: `1px solid ${filter === f ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    color: filter === f ? GOLD : `${PARCH}55`,
                    background: filter === f ? 'rgba(0,229,195,0.1)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t(`filters.${f}`)}
                </button>
              ))}
              <span aria-hidden style={{ color: `${PARCH}20` }}>|</span>
              {Object.values(DAY_TYPE_STYLES).map(s => (
                <span key={s.labelKey} style={{ fontFamily: EN_HEADING, fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: s.bg, color: s.color }}>
                  {s.emoji}{!isMobile && ` ${t(s.labelKey)}`}
                </span>
              ))}
              <button
                onClick={() => setShowDayLegend(v => !v)}
                aria-expanded={showDayLegend}
                aria-label={tc('page.legendToggle')}
                title={tc('page.legendToggle')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '14px', opacity: 0.5, lineHeight: 1 }}
              >
                ℹ️
              </button>
            </div>

            {showDayLegend && (
              <div style={{
                marginTop: '4px', marginBottom: '4px', padding: '10px 14px',
                background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(0,229,195,0.1)',
                display: 'flex', flexWrap: 'wrap', gap: '10px',
              }}>
                {Object.entries(DAY_TYPE_DESCS_HE).map(([type, desc]) => {
                  const s = DAY_TYPE_STYLES[type];
                  if (!s) return null;
                  return (
                    <div key={type} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', minWidth: '180px' }}>
                      <span style={{ fontSize: '13px' }}>{s.emoji}</span>
                      <div style={{ fontFamily: EN_HEADING }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: s.color }}>{t(s.labelKey)}</span>
                        <span style={{ fontSize: '11px', color: `${PARCH}BF` }}> — {desc}</span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', fontSize: '11px', color: `${PARCH}BF` }}>
                  <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: SCORE_COLOURS.green }} /> {tc('page.legendScore')}</span>
                  <span>⚫ {tc('page.nodeMarker')}</span>
                  <span style={{ color: GOLD }}>⇄ <span style={{ color: `${PARCH}BF` }}>{tc('page.signChangeMarker')}</span></span>
                </div>
              </div>
            )}

            {/* task source legend */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
              {(Object.entries(SOURCE_STYLES) as [keyof typeof SOURCE_STYLES, typeof SOURCE_STYLES[keyof typeof SOURCE_STYLES]][]).map(([key, s]) => (
                <span key={key} style={{
                  fontFamily: EN_HEADING, fontSize: '10px', background: s.badgeBg, color: s.badgeColor,
                  borderRadius: '4px', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px',
                }}>
                  {s.icon}{!isMobile && ` ${t(s.labelKey)}`}
                </span>
              ))}
            </div>
          </div>

          {(visibleMonthEmpty || visibleMonthBeyondData) && (
            <p role="status" style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}99`, margin: '0 0 8px', textAlign: 'center' }}>
              {tc('page.noDataMonth')}
            </p>
          )}

          {view === 'month' && (
            <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '6px', marginBottom: '4px' }}>
              {headerDayNames.map(d => (
                <div key={d} style={{ textAlign: 'center', fontFamily: EN_HEADING, fontSize: '11px', color: `${PARCH}BF`, padding: '4px 0' }}>
                  {isMobile ? d.slice(0, 1) : d}
                </div>
              ))}
            </div>
          )}

          {!tasksLoaded && token ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '48px' }} className="animate-pulse">🌱</div>
              <p style={{ fontFamily: EN_HEADING, fontSize: '14px', color: `${PARCH}BF`, marginTop: '12px' }}>{t('loading')}</p>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div role="grid" aria-label={headerLabel}>
                {view === 'week' ? (
                  <div role="row" style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(7, minmax(0, 1fr))',
                    gap: '8px', boxSizing: 'border-box', width: '100%',
                  }}>
                    {days.map((date, idx) => (
                      <div key={date} role="gridcell" style={{ gridColumn: isMobile && idx === 6 ? '1 / -1' : undefined, minWidth: 0 }}>
                        {cell(date, false, idx)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '3px' : '6px' }}>
                    {weeks.map((week, wi) => (
                      <div key={wi} role="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: isMobile ? '3px' : '6px' }}>
                        {week.map((date, di) => (
                          <div key={date} role="gridcell" style={{ minWidth: 0 }}>
                            {cell(date, true, wi * 7 + di)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DragOverlay>
                {draggingTask && (
                  <div style={{
                    background: 'rgba(9,20,16,0.95)', border: `1px solid ${GOLD}44`, borderRadius: '7px', padding: '6px 10px',
                    fontFamily: EN_HEADING, fontSize: '12px', color: PARCH, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    cursor: 'grabbing', pointerEvents: 'none',
                  }}>
                    {TYPE_CONFIG[draggingTask.type].emoji} {draggingTask.title}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* ── Selected day (end side, sticky) ── */}
        {isDesktop && (
          <aside
            aria-labelledby="day-panel-heading"
            style={{
              // --navbar-height is measured by the Navbar (ResizeObserver).
              position: 'sticky', top: 'calc(var(--navbar-height, 64px) + 24px)',
              maxHeight: 'calc(100vh - var(--navbar-height, 64px) - 40px)', overflowY: 'auto',
              scrollbarWidth: 'thin', paddingInlineEnd: '2px',
            }}
          >
            <DayPanel {...panelProps} headingId="day-panel-heading" />
          </aside>
        )}
      </div>

      {/* Narrow screens: the same content as a bottom sheet */}
      {!isDesktop && sheetOpen && (
        <DayPanelSheet {...panelProps} onClose={() => setSheetOpen(false)} />
      )}

      {addDate && (
        <TaskModal initialDate={addDate} task={null} onSave={handleAddTask} onClose={() => setAddDate(null)} />
      )}
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
  );
}
