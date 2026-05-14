import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToday } from '../hooks/useCalendar';
import { useTasks } from '../hooks/useTasks';
import { useAuthStore } from '../stores/authStore';
import { useChupChuPanelStore } from '../stores/chupChuPanelStore';
import { drawMoon, getMoonTilt } from '../components/calendar/TodayCardV2';

// ── Welcome checklist ──────────────────────────────────────────────────────
const CHECKLIST_KEY = 'gina-haya-welcome-checklist';

function loadChecklist(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}'); }
  catch { return {}; }
}

function WelcomeChecklist({ onOpenChupchu }: { onOpenChupchu: () => void }) {
  const navigate = useNavigate();
  const [done, setDone] = useState(loadChecklist);

  const mark = (key: string) => {
    const next = { ...done, [key]: true };
    setDone(next);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  };

  if (done.addedPlant && done.openedTracker && done.talkedToChupchu) return null;

  const items = [
    { key: null,             label: 'צור חשבון',        done: true,                  action: null },
    { key: 'addedPlant',     label: 'הוסף צמח לגינה',   done: !!done.addedPlant,     action: () => { mark('addedPlant');    navigate('/map');     } },
    { key: 'openedTracker',  label: 'פתח מעקב גידול',   done: !!done.openedTracker,  action: () => { mark('openedTracker'); navigate('/tracker'); } },
    { key: 'talkedToChupchu', label: "דבר עם צ'ופצ'ו",  done: !!done.talkedToChupchu, action: () => { mark('talkedToChupchu'); onOpenChupchu(); } },
  ] as const;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30,62,32,0.9) 0%, rgba(20,43,22,0.95) 100%)',
      border: '1px solid rgba(245,200,64,0.22)',
      borderRadius: '14px', padding: '18px 20px',
      marginBottom: '20px', direction: 'rtl',
    }}>
      <h3 style={{
        fontFamily: FRANK, fontSize: '16px', color: GOLD,
        margin: '0 0 14px', fontWeight: 700,
      }}>
        ✨ התחל כאן
      </h3>
      {items.map((item, i) => (
        <div
          key={i}
          onClick={item.action ?? undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '9px 0',
            borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            cursor: item.action ? 'pointer' : 'default',
            opacity: item.done ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>
            {item.done ? '✅' : '⬜'}
          </span>
          <span style={{
            fontFamily: ASST, fontSize: '14px',
            color: item.done ? `${PARCH}60` : PARCH,
            textDecoration: item.done ? 'line-through' : 'none',
            flex: 1,
          }}>
            {item.label}
          </span>
          {!item.done && item.action != null && (
            <span style={{ color: `${GOLD}80`, fontSize: '14px' }}>›</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Design tokens ──────────────────────────────────────────────────────────
const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

const DAY_TYPE_MAP: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  fruit:  { emoji: '🍎', label: 'פרי',   color: '#EF745A', bg: 'rgba(239,116,90,0.18)' },
  root:   { emoji: '🥕', label: 'שורש',  color: '#B58863', bg: 'rgba(181,136,99,0.18)' },
  flower: { emoji: '🌸', label: 'פרח',   color: '#C884C8', bg: 'rgba(196,132,200,0.18)' },
  leaf:   { emoji: '🌿', label: 'עלה',   color: '#7DC084', bg: 'rgba(125,192,132,0.18)' },
};

const SCORE_COLOR: Record<string, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#555555',
};

const MOON_SIGN_EN: Record<string, string> = {
  'טלה': 'Aries', 'שור': 'Taurus', 'תאומים': 'Gemini',
  'סרטן': 'Cancer', 'אריה': 'Leo', 'בתולה': 'Virgo',
  'מאזניים': 'Libra', 'עקרב': 'Scorpio', 'קשת': 'Sagittarius',
  'גדי': 'Capricorn', 'דלי': 'Aquarius', 'דגים': 'Pisces',
};

const PHASE_NAME_EN: Record<string, string> = {
  'ירח חדש': 'New Moon',
  'סהר גדל': 'Waxing Crescent',
  'רבע ראשון': 'First Quarter',
  'גיבנת גדלה': 'Waxing Gibbous',
  'ירח מלא': 'Full Moon',
  'כמעט מלא': 'Almost Full',
  'גיבנת דועכת': 'Waning Gibbous',
  'רבע אחרון': 'Last Quarter',
  'סהר דועך': 'Waning Crescent',
};

const CHUPCHU_SUMMARIES_EN: Record<string, string> = {
  fruit:  'Today is a Fruit day — ideal for planting tomatoes, cucumbers and peppers.',
  root:   'Today is a Root day — great for carrots, beets and onions.',
  flower: 'Today is a Flower day — perfect for flowers and aromatic herbs.',
  leaf:   'Today is a Leaf day — good time to prune and harvest leafy vegetables.',
};

const REST_DAY_TITLES: Record<string, string> = {
  'יום מנוחה לגינה': 'Garden rest day',
};

const NAV_BUTTONS = [
  { emoji: '📅', tKey: 'nav.calendar', to: '/calendar' },
  { emoji: '✅', tKey: 'nav.tasks',    to: '/tasks'    },
  { emoji: '🗺️', tKey: 'nav.map',     to: '/map'      },
  { emoji: '🌱', tKey: 'nav.tracker', to: '/tracker'  },
  { emoji: '📖', tKey: 'nav.plants',  to: '/plants'   },
  { emoji: '🎬', tKey: 'nav.guides',  to: '/guides'   },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'greeting.morning';
  if (h < 17) return 'greeting.afternoon';
  return 'greeting.evening';
}

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

// ── Moon canvas (bare — no labels) ────────────────────────────────────────
function MoonCanvas({ phasePct, phaseAngle }: { phasePct: number; phaseAngle: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tilt = getMoonTilt(phaseAngle, 31.5);
  useEffect(() => {
    if (ref.current) drawMoon(ref.current, phasePct, phaseAngle, tilt);
  }, [phasePct, phaseAngle, tilt]);
  return (
    <canvas
      ref={ref}
      width={165}
      height={165}
      style={{
        borderRadius: '50%',
        border: '2px solid rgba(245,200,64,0.40)',
        boxShadow: phasePct > 95
          ? '0 0 32px rgba(245,200,64,0.35)'
          : '0 0 16px rgba(245,200,64,0.18)',
        display: 'block',
      }}
    />
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { t, i18n } = useTranslation('dashboard');
  const isHe = i18n.language === 'he';
  const isMobile = useIsMobile();
  const { day, isLoading: calLoading } = useToday();
  const { tasks, updateStatus } = useTasks();
  const { user, profile } = useAuthStore();
  const { open: openChupChu } = useChupChuPanelStore();

  const today      = todayISO();
  const todayTasks = tasks.filter(t => t.date === today);
  const firstName  = profile?.display_name?.split(' ')[0] ?? '';
  const isNewUser  = user
    ? Date.now() - new Date(user.created_at).getTime() < 24 * 60 * 60 * 1000
    : false;
  const dayType    = day ? DAY_TYPE_MAP[day.dayType] ?? null : null;
  const scoreColor = day ? (SCORE_COLOR[day.scoreColour] ?? GOLD) : GOLD;

  const todayDateStr = new Date().toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Weekly tasks grouped by date
  const tasksByDate: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    (tasksByDate[t.date] ??= []).push(t);
  }
  const sortedDates = Object.keys(tasksByDate).sort();

  // BD prep advisory items
  const prepItems: string[] = [];
  if (day?.prep500Recommended) prepItems.push(t('prep.bd500'));
  if (day?.prep501Recommended) prepItems.push(t('prep.bd501'));
  if (day?.nodeActive)         prepItems.push(t('prep.node'));
  if (day?.perigeeActive)      prepItems.push(t('prep.perigee'));

  // ── Shared: Chupchu greeting card ─────────────────────────────────────
  const ChupChuCard = (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30,62,32,0.95) 0%, rgba(20,43,22,0.98) 100%)',
      border: '1px solid rgba(245,200,64,0.18)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Chupchu avatar — glowing moon orb */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 35% 35%, #F5E080, #C89010)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '34px',
          boxShadow: '0 0 24px rgba(245,200,64,0.35), 0 0 8px rgba(245,200,64,0.2)',
        }}>
          🌕
        </div>
        <div>
          <div style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, fontWeight: 700, lineHeight: 1.2 }}>
            {firstName ? t('greeting.hello', { name: firstName }) : t('greeting.helloGuest')} {t(getGreetingKey())}
          </div>
          <div style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70`, marginTop: '3px' }}>
            {t('chupchu.subtitle')}
          </div>
        </div>
      </div>

      {(day?.chupChuDailySummary || day?.dayType) && (
        <p style={{
          fontFamily: ASST, fontSize: '13px', color: `${PARCH}CC`,
          margin: 0, lineHeight: 1.6,
          borderRight: `3px solid ${GOLD}55`,
          paddingRight: '12px',
        }}>
          {isHe
            ? (day!.chupChuDailySummary || '')
            : (CHUPCHU_SUMMARIES_EN[day!.dayType] ?? day!.chupChuDailySummary ?? '')}
        </p>
      )}

      <button
        onClick={() => openChupChu()}
        style={{
          fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
          color: EARTH, background: GOLD,
          border: 'none', borderRadius: '10px',
          padding: '11px 20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          transition: 'filter 0.15s',
          width: '100%',
        }}
        onMouseEnter={e => { (e.currentTarget).style.filter = 'brightness(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget).style.filter = 'none'; }}
      >
        {t('chupchu.button')}
      </button>
    </div>
  );

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div dir={isHe ? 'rtl' : 'ltr'} style={{
        minHeight: '100vh', backgroundColor: EARTH,
        padding: '16px 12px 100px',
        fontFamily: ASST,
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}>

        {/* Welcome checklist — new users only */}
        {isNewUser && <WelcomeChecklist onOpenChupchu={openChupChu} />}

        {/* Section 1: Chupchu greeting */}
        {ChupChuCard}

        {/* Section 2: Today's summary strip */}
        {day && !calLoading && (
          <div style={{
            display: 'flex', gap: '8px',
            margin: '12px 0',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '2px',
          }}>
            {dayType && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
                background: dayType.bg, border: `1px solid ${dayType.color}55`,
                borderRadius: '99px', padding: '7px 14px',
              }}>
                <span style={{ fontSize: '15px' }}>{dayType.emoji}</span>
                <span style={{ fontFamily: ASST, fontSize: '12px', fontWeight: 600, color: dayType.color }}>
                  {t('dayTypePrefix')} {t('dayTypes.' + day!.dayType)}
                </span>
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              background: 'rgba(245,200,64,0.1)', border: '1px solid rgba(245,200,64,0.25)',
              borderRadius: '99px', padding: '7px 14px',
            }}>
              <span style={{ fontSize: '16px' }}>{moonEmoji(day.moonPhasePct)}</span>
              <span style={{ fontFamily: ASST, fontSize: '12px', color: GOLD, fontWeight: 600 }}>
                {day.moonPhasePct}%
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`,
              borderRadius: '99px', padding: '7px 14px',
            }}>
              <span style={{ fontSize: '15px' }}>⭐</span>
              <span style={{ fontFamily: ASST, fontSize: '12px', color: scoreColor, fontWeight: 700 }}>
                {day.plantingScore}/10
              </span>
            </div>
          </div>
        )}

        {/* Section 3: Today's tasks preview */}
        <div style={{
          background: 'rgba(20,50,22,0.6)', border: '1px solid rgba(245,200,64,0.12)',
          borderRadius: '14px', padding: '16px', marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: 0 }}>
              {t('todayTasks.title')}
            </h2>
            <Link
              to="/tasks"
              style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}65`, textDecoration: 'none' }}
            >
              {t('todayTasks.seeAll')}
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}50`, margin: 0 }}>
              {t('todayTasks.none')}
            </p>
          ) : (
            todayTasks.slice(0, 4).map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <button
                  onClick={() => updateStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                  style={{
                    flexShrink: 0,
                    width: '22px', height: '22px', borderRadius: '6px',
                    border: `2px solid ${task.status === 'done' ? '#4A7C59' : 'rgba(255,255,255,0.25)'}`,
                    background: task.status === 'done' ? '#4A7C59' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '12px', padding: 0,
                  }}
                >
                  {task.status === 'done' ? '✓' : ''}
                </button>
                <span style={{
                  fontFamily: ASST, fontSize: '13px',
                  color: task.status === 'done' ? `${PARCH}45` : PARCH,
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {isHe ? task.title : (REST_DAY_TITLES[task.title] ?? task.title)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Section 4: Navigation grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
        }}>
          {NAV_BUTTONS.map(btn => (
            <Link key={btn.to} to={btn.to} style={{ textDecoration: 'none' }}>
              <div style={{
                height: '100px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(245,200,64,0.18)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(245,200,64,0.1)';
                el.style.borderColor = 'rgba(245,200,64,0.45)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.borderColor = 'rgba(245,200,64,0.18)';
              }}
              >
                <span style={{ fontSize: '32px', lineHeight: 1 }}>{btn.emoji}</span>
                <span style={{ fontFamily: ASST, fontSize: '13px', color: GOLD, fontWeight: 600 }}>
                  {t(btn.tKey)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────
  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh', backgroundColor: EARTH,
      padding: '28px 28px 60px',
      fontFamily: ASST,
      boxSizing: 'border-box',
    }}>
      {isNewUser && (
        <div style={{ maxWidth: '1400px', margin: '0 auto 0', padding: '0 0 4px' }}>
          <WelcomeChecklist onOpenChupchu={openChupChu} />
        </div>
      )}

      <div style={{
        maxWidth: '1400px', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '300px 1fr 320px',
        gap: '20px',
        alignItems: 'start',
      }}>

        {/* ── Column 1: Chupchu + Navigation ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '88px' }}>
          {ChupChuCard}

          {/* Navigation links */}
          <div style={{
            background: 'rgba(20,50,22,0.55)', border: '1px solid rgba(245,200,64,0.1)',
            borderRadius: '14px', padding: '16px',
          }}>
            <h3 style={{
              fontFamily: ASST, fontSize: '11px', fontWeight: 700,
              color: `${PARCH}50`, margin: '0 0 10px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {t('quickNav')}
            </h3>
            {NAV_BUTTONS.map(btn => (
              <Link
                key={btn.to}
                to={btn.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 8px', textDecoration: 'none',
                  borderRadius: '8px', transition: 'background 0.15s',
                  color: PARCH,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,200,64,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '18px', width: '26px', textAlign: 'center', lineHeight: 1 }}>
                  {btn.emoji}
                </span>
                <span style={{ fontFamily: ASST, fontSize: '14px', flex: 1 }}>{t(btn.tKey)}</span>
                <span style={{ color: `${PARCH}35`, fontSize: '14px' }}>‹</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Column 2: Today's full briefing ── */}
        <div style={{
          background: 'rgba(20,50,22,0.5)', border: '1px solid rgba(245,200,64,0.12)',
          borderRadius: '16px', padding: '28px',
          display: 'flex', flexDirection: 'column', gap: '22px',
        }}>
          {/* Date header */}
          <div>
            <h1 style={{ fontFamily: FRANK, fontSize: '28px', color: GOLD, margin: '0 0 4px', lineHeight: 1.2 }}>
              {todayDateStr}
            </h1>
            <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}55`, margin: 0 }}>
              {t('biodynamic.subtitle')}
            </p>
          </div>

          {calLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', fontSize: '48px' }}>🌕</div>
          ) : day ? (
            <>
              {/* Moon + Cards row */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                {/* Cards grid — RTL start (right side visually) */}
                <div style={{
                  flex: 1,
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
                  alignContent: 'start',
                }}>
                  {/* Row 1 — planting score */}
                  <div style={{ background: `${scoreColor}14`, border: `1px solid ${scoreColor}44`, borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}60`, marginBottom: '4px' }}>{t('biodynamic.plantingScore')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '28px', color: scoreColor, fontWeight: 700, lineHeight: 1 }}>
                      {day.plantingScore}
                      <span style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}40`, fontWeight: 400 }}> /10</span>
                    </div>
                  </div>

                  {/* Row 1 — moon phase % */}
                  <div style={{ background: 'rgba(245,200,64,0.08)', border: '1px solid rgba(245,200,64,0.2)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}60`, marginBottom: '4px' }}>{t('biodynamic.moonPhase')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD }}>
                      {moonEmoji(day.moonPhasePct)} {day.moonPhasePct}%
                    </div>
                  </div>

                  {/* Row 1 — day type */}
                  {dayType ? (
                    <div style={{ background: dayType.bg, border: `1px solid ${dayType.color}55`, borderRadius: '12px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}60`, marginBottom: '4px' }}>{t('biodynamic.dayType')}</div>
                      <div style={{ fontFamily: FRANK, fontSize: '18px', color: dayType.color, fontWeight: 700 }}>
                        {dayType.emoji} {t('dayTypePrefix')} {t('dayTypes.' + day!.dayType)}
                      </div>
                    </div>
                  ) : <div />}

                  {/* Row 2 — moon sign */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}50`, marginBottom: '5px' }}>{t('biodynamic.moonSign')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>
                      {isHe ? day.moonSignHe : (MOON_SIGN_EN[day.moonSignHe] ?? day.moonSignHe)}
                    </div>
                  </div>

                  {/* Row 2 — rise time */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}50`, marginBottom: '5px' }}>{t('biodynamic.moonrise')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>{day.moonriseTime ?? '—'}</div>
                  </div>

                  {/* Row 2 — set time */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}50`, marginBottom: '5px' }}>{isHe ? 'שקיעת ירח' : 'Moonset'}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>{day.moonsetTime ?? '—'}</div>
                  </div>

                  {/* Row 3 — ascending/descending + phase name, full width */}
                  <div style={{
                    gridColumn: '1 / -1',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}50`, marginBottom: '5px' }}>{isHe ? 'כיוון הירח' : 'Moon direction'}</div>
                      <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>
                        {day.ascendingDescending === 'ascending' ? (isHe ? '↑ עולה' : '↑ Ascending') : (isHe ? '↓ יורד' : '↓ Descending')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}50`, marginBottom: '5px' }}>{isHe ? 'שם הפאזה' : 'Phase name'}</div>
                      <div style={{ fontFamily: FRANK, fontSize: '16px', color: PARCH }}>
                        {isHe ? day.moonPhaseNameHe : (PHASE_NAME_EN[day.moonPhaseNameHe] ?? day.moonPhaseNameHe)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moon canvas — RTL end (left side visually) */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MoonCanvas
                    phasePct={day.moonPhasePct ?? 0}
                    phaseAngle={day.moonPhaseAngle ?? (day.moonPhasePct ?? 0) / 100 * 360}
                  />
                </div>
              </div>

              {/* BD prep recommendations */}
              {prepItems.length > 0 && (
                <div style={{
                  background: 'rgba(245,200,64,0.05)', border: '1px solid rgba(245,200,64,0.15)',
                  borderRadius: '12px', padding: '18px',
                }}>
                  <h3 style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD, margin: '0 0 12px' }}>
                    {isHe ? 'המלצות ביודינמיות להיום' : "Today's biodynamic recommendations"}
                  </h3>
                  {prepItems.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: '8px', alignItems: 'flex-start',
                      fontFamily: ASST, fontSize: '13px', color: `${PARCH}CC`,
                      padding: '5px 0',
                    }}>
                      <span style={{ color: GOLD, flexShrink: 0 }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Node / perigee warning */}
              {(day.nodeActive || day.perigeeActive) && (
                <div style={{
                  background: 'rgba(192,98,42,0.12)', border: '1px solid rgba(192,98,42,0.3)',
                  borderRadius: '12px', padding: '14px 18px',
                  display: 'flex', gap: '10px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '22px' }}>⚠️</span>
                  <div style={{ fontFamily: ASST, fontSize: '13px', color: '#E8956A' }}>
                    {day.nodeActive
                      ? (isHe ? 'יום צומת — הימנע משתילה' : 'Node day — avoid planting')
                      : (isHe ? 'ירח בפריגיאה — הכוחות חלשים' : 'Moon at perigee — forces are weak')}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}50` }}>
              {isHe ? 'לא נמצאו נתוני לוח להיום' : 'No calendar data found for today'}
            </p>
          )}
        </div>

        {/* ── Column 3: Weekly tasks ── */}
        <div style={{
          background: 'rgba(20,50,22,0.5)', border: '1px solid rgba(245,200,64,0.12)',
          borderRadius: '16px', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          position: 'sticky', top: '88px',
          maxHeight: 'calc(100vh - 130px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
              {isHe ? 'משימות השבוע' : "This Week's Tasks"}
            </h2>
            <Link
              to="/tasks"
              style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}60`, textDecoration: 'none' }}
            >
              {isHe ? 'הכל ›' : 'All ›'}
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontFamily: ASST, fontSize: '13px', color: `${PARCH}50`, marginBottom: '12px' }}>
                {isHe ? 'אין משימות לשבוע זה' : 'No tasks this week'}
              </p>
              <Link
                to="/plan"
                style={{ fontFamily: FRANK, fontSize: '13px', color: GOLD, textDecoration: 'none' }}
              >
                {isHe ? 'צור תכנית שבועית →' : 'Create weekly plan →'}
              </Link>
            </div>
          ) : (
            sortedDates.map(date => {
              const isToday   = date === today;
              const dateTasks = tasksByDate[date];
              const d = new Date(date + 'T12:00:00');
              const dateLabel = d.toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
                weekday: 'long', day: 'numeric', month: 'short',
              });
              return (
                <div key={date}>
                  <div style={{
                    fontFamily: FRANK, fontSize: '12px',
                    color: isToday ? GOLD : `${PARCH}60`,
                    marginBottom: '6px', fontWeight: isToday ? 700 : 400,
                    paddingBottom: '4px',
                    borderBottom: `1px solid ${isToday ? 'rgba(245,200,64,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    {isToday ? (isHe ? '⬤ היום — ' : '⬤ Today — ') : ''}{dateLabel}
                  </div>
                  {dateTasks.map(task => (
                    <div key={task.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '5px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}>
                      <button
                        onClick={() => updateStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                        style={{
                          flexShrink: 0, width: '16px', height: '16px', borderRadius: '4px',
                          border: `1.5px solid ${task.status === 'done' ? '#4A7C59' : 'rgba(255,255,255,0.2)'}`,
                          background: task.status === 'done' ? '#4A7C59' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', color: 'white', padding: 0,
                        }}
                      >
                        {task.status === 'done' ? '✓' : ''}
                      </button>
                      <span style={{
                        fontFamily: ASST, fontSize: '13px',
                        color: task.status === 'done' ? `${PARCH}40` : `${PARCH}DD`,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {/* Add task CTA */}
          <Link
            to="/tasks"
            style={{
              display: 'block', textAlign: 'center', marginTop: 'auto',
              fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
              color: EARTH, background: GOLD,
              padding: '11px', borderRadius: '10px',
              textDecoration: 'none', transition: 'filter 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {isHe ? '+ הוסף משימה' : '+ Add task'}
          </Link>
        </div>
      </div>
    </div>
  );
}
