import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const SAGE   = '#4A9C68';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

interface Props {
  tasks: string[];
  weekStart: string;
}

export function WeeklyTaskList({ tasks, weekStart }: Props) {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  const storageKey = `gina-haya-plan-tasks-${weekStart}`;

  const [checked, setChecked] = useState<boolean[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as boolean[];
        return tasks.map((_, i) => parsed[i] ?? false);
      }
    } catch { /* ignore */ }
    return tasks.map(() => false);
  });

  function toggle(idx: number) {
    setChecked(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  if (tasks.length === 0) return null;

  const done  = checked.filter(Boolean).length;
  const total = tasks.length;

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        background:    'linear-gradient(145deg, rgba(9,20,16,0.7) 0%, rgba(9,20,16,0.82) 100%)',
        border:        '1px solid rgba(0,229,195,0.12)',
        borderRadius:  '14px',
        padding:       '18px 18px 14px',
        marginBottom:  '16px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <h2 style={{
        fontFamily:  FRANK,
        fontSize:    '18px',
        fontWeight:  700,
        color:       GOLD,
        margin:      '0 0 14px',
        textAlign:   isHe ? 'right' : 'left',
      }}>
        {isHe ? 'משימות לשבוע' : 'Weekly Tasks'}
      </h2>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tasks.map((task, i) => (
          <li
            key={i}
            onClick={() => toggle(i)}
            style={{
              display:    'flex',
              alignItems: 'flex-start',
              gap:        '12px',
              padding:    '8px 0',
              cursor:     'pointer',
              borderBottom: i < tasks.length - 1 ? '1px solid rgba(0,229,195,0.06)' : 'none',
            }}
          >
            {/* Checkbox */}
            <div style={{
              flexShrink:      0,
              marginTop:       '1px',
              width:           '18px',
              height:          '18px',
              borderRadius:    '4px',
              border:          `1.5px solid ${checked[i] ? SAGE : `${GOLD}44`}`,
              backgroundColor: checked[i] ? `${SAGE}22` : 'transparent',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              transition:      'border-color 0.15s, background-color 0.15s',
              flexDirection:   'row',
            }}>
              {checked[i] && (
                <span style={{ fontSize: '11px', color: SAGE, lineHeight: 1 }}>✓</span>
              )}
            </div>

            {/* Number */}
            <span style={{
              flexShrink:  0,
              fontFamily:  ASSIST,
              fontSize:    '12px',
              fontWeight:  600,
              color:       `${GOLD}66`,
              minWidth:    '18px',
              textAlign:   'center',
              marginTop:   '1px',
            }}>
              {i + 1}.
            </span>

            {/* Task text */}
            <span style={{
              fontFamily:      ASSIST,
              fontSize:        '14px',
              lineHeight:      1.5,
              color:           checked[i] ? `${PARCH}44` : `${PARCH}CC`,
              textDecoration:  checked[i] ? 'line-through' : 'none',
              transition:      'color 0.15s',
              flex:            1,
            }}>
              {task}
            </span>
          </li>
        ))}
      </ol>

      <p style={{
        fontFamily: ASSIST,
        fontSize:   '11px',
        color:      `${PARCH}33`,
        textAlign:  'center',
        margin:     '12px 0 0',
      }}>
        {isHe
          ? `${done} מתוך ${total} משימות הושלמו`
          : `${done} of ${total} tasks completed`}
      </p>
    </div>
  );
}
