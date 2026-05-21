import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GardenTask } from '../../api/tasks';

const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';

const TYPE_CONFIG = {
  biodynamic: { emoji: '🌙', labelHe: 'ביודינמי',  labelEn: 'Biodynamic',   color: '#4A9C68' },
  maintenance: { emoji: '🔧', labelHe: 'תחזוקה',    labelEn: 'Maintenance',  color: '#C8A040' },
  custom:      { emoji: '✏️', labelHe: 'אישי',      labelEn: 'Personal',     color: '#C884C8' },
};

const REST_DAY_TITLES: Record<string, string> = {
  'יום מנוחה לגינה': 'Garden rest day',
};

interface Props {
  tasks: GardenTask[];
  onUpdateStatus: (id: string, status: 'pending' | 'done' | 'skipped') => void;
  onDelete: (id: string) => void;
  onAdd: (date: string, title: string) => void;
  isLoading: boolean;
}

function groupByDate(tasks: GardenTask[]): Record<string, GardenTask[]> {
  return tasks.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {} as Record<string, GardenTask[]>);
}

function formatDate(dateStr: string, isHe: boolean): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export function TaskManager({ tasks, onUpdateStatus, onDelete, onAdd, isLoading }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const filtered = tasks.filter(t =>
    filter === 'all' ? true : filter === 'pending' ? t.status === 'pending' : t.status === 'done'
  );

  const grouped = groupByDate(filtered);
  const dates = Object.keys(grouped).sort();

  const pending = tasks.filter(t => t.status === 'pending').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;

  const handleAdd = () => {
    if (!newTaskDate || !newTaskTitle.trim()) return;
    onAdd(newTaskDate, newTaskTitle.trim());
    setNewTaskTitle('');
    setShowAddForm(false);
  };

  const filterLabels = {
    all:     isHe ? 'הכל'     : 'All',
    pending: isHe ? 'ממתינות' : 'Pending',
    done:    isHe ? 'הושלמו'  : 'Completed',
  };

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0 }}>
          📋 {isHe ? 'משימות השבוע' : "This Week's Tasks"}
        </h2>
        <button
          onClick={() => setShowAddForm(v => !v)}
          style={{
            fontFamily: ASSIST, fontSize: '13px', fontWeight: 600,
            padding: '6px 14px', borderRadius: '8px', border: `1px solid ${GOLD}55`,
            color: GOLD, background: 'rgba(0,229,195,0.08)', cursor: 'pointer',
          }}
        >
          {isHe ? '+ הוסף משימה' : '+ Add task'}
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}70` }}>
              {isHe ? `${done} מתוך ${total} משימות הושלמו` : `${done} of ${total} tasks completed`}
            </span>
            <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}50` }}>
              {isHe ? `${pending} ממתינות` : `${pending} pending`}
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg, #091410, #00e5c3)',
              width: `${total > 0 ? (done / total) * 100 : 0}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'pending', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: ASSIST, fontSize: '12px', fontWeight: 600,
              padding: '4px 12px', borderRadius: '99px',
              border: `1px solid ${filter === f ? GOLD : 'rgba(255,255,255,0.1)'}`,
              color: filter === f ? GOLD : `${PARCH}60`,
              background: filter === f ? 'rgba(0,229,195,0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Add task form */}
      {showAddForm && (
        <div style={{
          background: 'rgba(9,20,16,0.6)', border: '1px solid rgba(0,229,195,0.2)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder={isHe ? 'שם המשימה...' : 'Task name...'}
              style={{
                fontFamily: ASSIST, fontSize: '14px', color: PARCH,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '8px 12px', outline: 'none',
                direction: isHe ? 'rtl' : 'ltr',
              }}
            />
            <input
              type="date"
              value={newTaskDate}
              onChange={e => setNewTaskDate(e.target.value)}
              style={{
                fontFamily: ASSIST, fontSize: '14px', color: PARCH,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '8px 12px', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{ fontFamily: ASSIST, fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: `${PARCH}60`, background: 'transparent', cursor: 'pointer' }}
              >
                {isHe ? 'ביטול' : 'Cancel'}
              </button>
              <button
                onClick={handleAdd}
                style={{ fontFamily: ASSIST, fontSize: '13px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none', background: GOLD, color: '#050d0a', cursor: 'pointer' }}
              >
                {isHe ? 'הוסף' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks by date */}
      {isLoading ? (
        <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}50`, textAlign: 'center', padding: '20px' }}>
          {isHe ? 'טוען משימות...' : 'Loading tasks...'}
        </p>
      ) : dates.length === 0 ? (
        <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}50`, textAlign: 'center', padding: '20px' }}>
          {filter === 'done'
            ? (isHe ? 'עדיין לא הושלמו משימות השבוע' : 'No tasks completed yet')
            : (isHe ? 'אין משימות לשבוע זה' : 'No tasks this week')}
        </p>
      ) : (
        dates.map(date => (
          <div key={date} style={{ marginBottom: '20px' }}>
            <p style={{ fontFamily: FRANK, fontSize: '14px', color: `${PARCH}80`, marginBottom: '8px', paddingRight: isHe ? '4px' : 0, paddingLeft: isHe ? 0 : '4px' }}>
              {formatDate(date, isHe)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[date].map(task => {
                const cfg = TYPE_CONFIG[task.type];
                const isDone = task.status === 'done';
                const isSkipped = task.status === 'skipped';
                const taskTitle = !isHe && task.type !== 'custom'
                  ? (REST_DAY_TITLES[task.title] ?? task.title)
                  : task.title;
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: isDone ? 'rgba(0,229,195,0.08)' : isSkipped ? 'rgba(255,255,255,0.03)' : 'rgba(9,20,16,0.5)',
                      border: `1px solid ${isDone ? 'rgba(0,229,195,0.2)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '10px', padding: '10px 14px',
                      opacity: isSkipped ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => onUpdateStatus(task.id, isDone ? 'pending' : 'done')}
                      style={{
                        flexShrink: 0, width: '22px', height: '22px', borderRadius: '6px',
                        border: `2px solid ${isDone ? '#4A9C68' : 'rgba(255,255,255,0.2)'}`,
                        background: isDone ? '#4A9C68' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', color: 'white', flexDirection: 'column',
                      }}
                    >
                      {isDone ? '✓' : ''}
                    </button>

                    {/* Type emoji */}
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{cfg.emoji}</span>

                    {/* Title */}
                    <span style={{
                      fontFamily: ASSIST, fontSize: '14px', color: isDone ? `${PARCH}70` : PARCH,
                      flex: 1, textDecoration: isDone ? 'line-through' : 'none',
                      direction: isHe ? 'rtl' : 'ltr', textAlign: isHe ? 'right' : 'left',
                    }}>
                      {taskTitle}
                    </span>

                    {/* Type badge */}
                    <span style={{
                      fontFamily: ASSIST, fontSize: '10px', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '99px',
                      background: `${cfg.color}22`, color: cfg.color, flexShrink: 0,
                    }}>
                      {isHe ? cfg.labelHe : cfg.labelEn}
                    </span>

                    {/* Tracker origin badge */}
                    {task.source_action === 'growing_tracker' && (
                      <span style={{
                        fontFamily: ASSIST, fontSize: '10px', fontWeight: 600,
                        padding: '2px 8px', borderRadius: '99px',
                        background: 'rgba(0,229,195,0.08)', color: '#4A9C68', flexShrink: 0,
                      }}>
                        {isHe ? '🌱 ממעקב הגידול' : '🌱 From growth tracker'}
                      </span>
                    )}

                    {/* Skip / Delete */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {!isDone && (
                        <button
                          onClick={() => onUpdateStatus(task.id, isSkipped ? 'pending' : 'skipped')}
                          title={isSkipped ? (isHe ? 'בטל דילוג' : 'Undo skip') : (isHe ? 'דלג' : 'Skip')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.5, padding: '2px' }}
                        >
                          {isSkipped ? '↩️' : '⏭️'}
                        </button>
                      )}
                      {task.type === 'custom' && (
                        <button
                          onClick={() => onDelete(task.id)}
                          title={isHe ? 'מחק' : 'Delete'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.4, padding: '2px' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
