import { useState } from 'react';
import type { GardenTask } from '../../api/tasks';

const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';

const TYPE_CONFIG = {
  biodynamic: { emoji: '🌙', label: 'ביודינמי', color: '#7DC084' },
  maintenance: { emoji: '🔧', label: 'תחזוקה', color: '#C8A040' },
  custom:      { emoji: '✏️', label: 'אישי', color: '#C884C8' },
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

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export function TaskManager({ tasks, onUpdateStatus, onDelete, onAdd, isLoading }: Props) {
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

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0 }}>
          📋 משימות השבוע
        </h2>
        <button
          onClick={() => setShowAddForm(v => !v)}
          style={{
            fontFamily: ASSIST, fontSize: '13px', fontWeight: 600,
            padding: '6px 14px', borderRadius: '8px', border: `1px solid ${GOLD}55`,
            color: GOLD, background: 'rgba(245,200,64,0.08)', cursor: 'pointer',
          }}
        >
          + הוסף משימה
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}70` }}>
              {done} מתוך {total} משימות הושלמו
            </span>
            <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}50` }}>
              {pending} ממתינות
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg, #4A7C59, #F5C840)',
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
              background: filter === f ? 'rgba(245,200,64,0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתינות' : 'הושלמו'}
          </button>
        ))}
      </div>

      {/* Add task form */}
      {showAddForm && (
        <div style={{
          background: 'rgba(28,58,30,0.6)', border: '1px solid rgba(245,200,64,0.2)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="שם המשימה..."
              style={{
                fontFamily: ASSIST, fontSize: '14px', color: PARCH,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '8px 12px', outline: 'none', direction: 'rtl',
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
                ביטול
              </button>
              <button
                onClick={handleAdd}
                style={{ fontFamily: ASSIST, fontSize: '13px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none', background: GOLD, color: '#142B16', cursor: 'pointer' }}
              >
                הוסף
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks by date */}
      {isLoading ? (
        <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}50`, textAlign: 'center', padding: '20px' }}>
          טוען משימות...
        </p>
      ) : dates.length === 0 ? (
        <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}50`, textAlign: 'center', padding: '20px' }}>
          {filter === 'done' ? 'עדיין לא הושלמו משימות השבוע' : 'אין משימות לשבוע זה'}
        </p>
      ) : (
        dates.map(date => (
          <div key={date} style={{ marginBottom: '20px' }}>
            <p style={{ fontFamily: FRANK, fontSize: '14px', color: `${PARCH}80`, marginBottom: '8px', paddingRight: '4px' }}>
              {formatDate(date)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[date].map(task => {
                const cfg = TYPE_CONFIG[task.type];
                const isDone = task.status === 'done';
                const isSkipped = task.status === 'skipped';
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: isDone ? 'rgba(74,124,89,0.15)' : isSkipped ? 'rgba(255,255,255,0.03)' : 'rgba(28,58,30,0.5)',
                      border: `1px solid ${isDone ? 'rgba(74,124,89,0.3)' : 'rgba(255,255,255,0.07)'}`,
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
                        border: `2px solid ${isDone ? '#4A7C59' : 'rgba(255,255,255,0.2)'}`,
                        background: isDone ? '#4A7C59' : 'transparent',
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
                      direction: 'rtl', textAlign: 'right',
                    }}>
                      {task.title}
                    </span>

                    {/* Type badge */}
                    <span style={{
                      fontFamily: ASSIST, fontSize: '10px', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '99px',
                      background: `${cfg.color}22`, color: cfg.color, flexShrink: 0,
                    }}>
                      {cfg.label}
                    </span>

                    {/* Skip / Delete */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {!isDone && (
                        <button
                          onClick={() => onUpdateStatus(task.id, isSkipped ? 'pending' : 'skipped')}
                          title={isSkipped ? 'בטל דילוג' : 'דלג'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.5, padding: '2px' }}
                        >
                          {isSkipped ? '↩️' : '⏭️'}
                        </button>
                      )}
                      {task.type === 'custom' && (
                        <button
                          onClick={() => onDelete(task.id)}
                          title="מחק"
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
