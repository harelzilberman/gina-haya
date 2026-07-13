import { useState } from 'react';
import { useTrackerStore, type TrackerTask } from '../../stores/trackerStore';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PRIORITY_COLOURS: Record<string, string> = {
  high:   '#d9534f',
  medium: '#e6a817',
  low:    '#4A9C68',
};
const PRIORITY_HE: Record<string, string> = {
  high:   'דחוף',
  medium: 'השבוע',
  low:    'בקרוב',
};

interface Props {
  trackerId: string;
  tasks: TrackerTask[];
  onClose: () => void;
}

export function TaskApprovalModal({ trackerId, tasks, onClose }: Props) {
  const { approveTasks } = useTrackerStore();
  const [checked, setChecked] = useState<Set<number>>(() => new Set(tasks.map((_, i) => i)));
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [savedCount, setSavedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleApprove() {
    const selected = tasks.filter((_, i) => checked.has(i));
    if (selected.length === 0) { onClose(); return; }
    setStatus('saving');
    try {
      const result = await approveTasks(trackerId, selected);
      if (result.tasks_error) {
        setErrorMsg(result.tasks_error);
        setStatus('error');
      } else {
        setSavedCount(result.tasks_added);
        setStatus('done');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'שגיאה בשמירת המשימות');
      setStatus('error');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          300,
        display:         'flex',
        alignItems:      'flex-start',
        justifyContent:  'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter:  'blur(4px)',
        padding:         '16px',
        overflowY:       'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: NIGHT_CARD,
        border:          '1px solid rgba(0,229,195,0.2)',
        borderRadius:    '12px',
        padding:         '28px 24px',
        width:           '100%',
        maxWidth:        '520px',
        direction:       'rtl',
        margin:          '16px auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: BIO_CYAN, margin: 0 }}>
            אישור משימות גינה
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}55`, margin: '0 0 20px', lineHeight: 1.5 }}>
          קלוד הציע את המשימות הבאות בהתבסס על ניתוח הצמח. בחר את המשימות שברצונך להוסיף ללוח המשימות.
        </p>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontFamily: FRANK, fontSize: '18px', color: BIO_CYAN, marginBottom: '8px' }}>
              {savedCount} משימות נוספו ללוח המשימות!
            </p>
            <button onClick={onClose} style={{
              padding:         '10px 28px',
              backgroundColor: BIO_CYAN,
              color:           '#050d0a',
              border:          'none',
              borderRadius:    '8px',
              fontFamily:      FRANK,
              fontSize:        '15px',
              fontWeight:      700,
              cursor:          'pointer',
            }}>סגור</button>
          </div>
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: '#d9534f', marginBottom: '20px', lineHeight: 1.6 }}>
              {errorMsg || 'שגיאה בשמירת המשימות. אנא נסה שנית.'}
            </p>
            <button onClick={() => setStatus('idle')} style={{
              padding:         '10px 24px',
              backgroundColor: 'transparent',
              color:           BIO_CYAN,
              border:          `1px solid ${BIO_CYAN}`,
              borderRadius:    '8px',
              fontFamily:      FRANK,
              fontSize:        '14px',
              cursor:          'pointer',
              marginLeft:      '8px',
            }}>נסה שנית</button>
            <button onClick={onClose} style={{
              padding:         '10px 24px',
              backgroundColor: 'transparent',
              color:           `${TEXT_MID}50`,
              border:          '1px solid rgba(176,207,191,0.2)',
              borderRadius:    '8px',
              fontFamily:      DM_SANS,
              fontSize:        '14px',
              cursor:          'pointer',
            }}>סגור</button>
          </div>
        ) : (
          <>
            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {tasks.map((task, i) => {
                const isChecked = checked.has(i);
                const color     = PRIORITY_COLOURS[task.priority] ?? BIO_CYAN;
                return (
                  <label
                    key={i}
                    style={{
                      display:         'flex',
                      alignItems:      'flex-start',
                      gap:             '12px',
                      backgroundColor: isChecked ? 'rgba(0,229,195,0.06)' : 'rgba(255,255,255,0.03)',
                      border:          `1px solid ${isChecked ? 'rgba(0,229,195,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:    '8px',
                      padding:         '12px 14px',
                      cursor:          'pointer',
                      transition:      'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(i)}
                      style={{ marginTop: '3px', flexShrink: 0, accentColor: BIO_CYAN, width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                        <span style={{
                          padding:         '1px 8px',
                          borderRadius:    '10px',
                          fontSize:        '11px',
                          fontFamily:      DM_SANS,
                          fontWeight:      600,
                          backgroundColor: `${color}22`,
                          border:          `1px solid ${color}55`,
                          color,
                        }}>
                          {PRIORITY_HE[task.priority] ?? task.priority}
                        </span>
                        <strong style={{ fontFamily: FRANK, fontSize: '14px', color: TEXT_MID, textAlign: 'right', flex: 1 }}>
                          {task.title}
                        </strong>
                      </div>
                      {task.description && (
                        <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}60`, margin: 0, lineHeight: 1.5 }}>
                          {task.description}
                        </p>
                      )}
                      <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}35`, margin: '4px 0 0' }}>
                        בעוד {task.due_in_days} ימים
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
              <button
                onClick={handleApprove}
                disabled={status === 'saving'}
                style={{
                  padding:         '11px 24px',
                  backgroundColor: checked.size > 0 ? BIO_CYAN : 'rgba(0,229,195,0.3)',
                  color:           '#050d0a',
                  border:          'none',
                  borderRadius:    '8px',
                  fontFamily:      FRANK,
                  fontSize:        '15px',
                  fontWeight:      700,
                  cursor:          checked.size > 0 ? 'pointer' : 'default',
                  opacity:         status === 'saving' ? 0.7 : 1,
                }}
              >
                {status === 'saving' ? 'שומר...' : `הוסף ${checked.size} משימות`}
              </button>
              <button
                onClick={onClose}
                disabled={status === 'saving'}
                style={{
                  padding:         '11px 20px',
                  backgroundColor: 'transparent',
                  color:           `${TEXT_MID}50`,
                  border:          '1px solid rgba(176,207,191,0.15)',
                  borderRadius:    '8px',
                  fontFamily:      DM_SANS,
                  fontSize:        '14px',
                  cursor:          'pointer',
                }}
              >
                דלג
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
