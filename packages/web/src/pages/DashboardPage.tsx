import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToday } from '../hooks/useCalendar';
import { useTasks } from '../hooks/useTasks';
import { useAuthStore } from '../stores/authStore';
import { useChupChuPanelStore } from '../stores/chupChuPanelStore';
import { drawMoon, getMoonTilt, MoonSignSVG } from '../components/calendar/TodayCardV2';
import { getBDPlainSummary, type BDPlainSummary, type DayType } from '../utils/bdPlainLanguage';
import { useTodayActions, type TodayActionsData } from '../hooks/useTodayActions';

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
      background: 'linear-gradient(135deg, rgba(14,30,23,0.9) 0%, rgba(9,20,16,0.95) 100%)',
      border: '1px solid rgba(0,229,195,0.22)',
      borderRadius: '14px', padding: '18px 20px',
      marginBottom: '20px', direction: 'rtl',
    }}>
      <h3 style={{
        fontFamily: FRANK, fontSize: '16px', color: BIO_CYAN,
        margin: '0 0 14px', fontWeight: 700,
      }}>
        ✨ התחל כאן
      </h3>
      {items.map((item, i) => (
        <div
          key={i}
          onClick={item.action ? e => { e.stopPropagation(); item.action!(); } : undefined}
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
            color: item.done ? `${TEXT_MID}60` : TEXT_MID,
            textDecoration: item.done ? 'line-through' : 'none',
            flex: 1,
          }}>
            {item.label}
          </span>
          {!item.done && item.action != null && (
            <span style={{ color: `${BIO_CYAN}80`, fontSize: '14px' }}>›</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Design tokens ──────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const ASST       = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const DAY_TYPE_MAP: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  fruit:  { emoji: '🍎', label: 'פרי',   color: '#EF745A', bg: 'rgba(239,116,90,0.18)' },
  root:   { emoji: '🥕', label: 'שורש',  color: '#B58863', bg: 'rgba(181,136,99,0.18)' },
  flower: { emoji: '🌸', label: 'פרח',   color: '#C884C8', bg: 'rgba(196,132,200,0.18)' },
  leaf:   { emoji: '🌿', label: 'עלה',   color: '#4A9C68', bg: 'rgba(74,156,104,0.18)' },
};

const SCORE_COLOR: Record<string, string> = {
  green:  '#4A9C68',
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
        border: '2px solid rgba(0,229,195,0.35)',
        boxShadow: phasePct > 95
          ? '0 0 32px rgba(0,229,195,0.28)'
          : '0 0 16px rgba(0,229,195,0.14)',
        display: 'block',
      }}
    />
  );
}

// ── Day Action Card ──────────────────────────────────────────────────────────
function DayActionCard({
  bdSummary,
  isHe,
  score,
  isNode,
  todayActions,
  actionsLoading,
}: {
  bdSummary: BDPlainSummary;
  isHe: boolean;
  score: number;
  isNode: boolean;
  todayActions?: TodayActionsData | null;
  actionsLoading?: boolean;
}) {
  const [bdOpen, setBdOpen] = useState(false);
  const goodFor = isHe ? bdSummary.goodFor.he : bdSummary.goodFor.en;
  const avoidToday = isHe ? bdSummary.avoidToday.he : bdSummary.avoidToday.en;
  const showAvoid = isNode || score < 4;

  const ACTION_LABEL_HE: Record<string, string> = { harvest: 'קטיף', plant: 'שתילה' };
  const ACTION_LABEL_EN: Record<string, string> = { harvest: 'Harvest', plant: 'Plant' };

  const hasPersonal = todayActions && todayActions.hasGardenData;
  const matching = todayActions?.matchingPlants ?? [];
  const nonMatching = todayActions?.nonMatchingPlants ?? [];
  const alerts = (todayActions?.trackerAlerts ?? []).filter(a =>
    a.lastAnalysisDaysAgo === null || a.lastAnalysisDaysAgo > 7
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Personalized plant section */}
      {actionsLoading && (
        <div style={{
          background: 'rgba(0,229,195,0.04)', border: '1px solid rgba(0,229,195,0.1)',
          borderRadius: '12px', padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {[100, 70, 85].map((w, i) => (
            <div key={i} style={{
              height: '14px', borderRadius: '6px',
              background: `rgba(0,229,195,0.07)`,
              width: `${w}%`,
            }} />
          ))}
        </div>
      )}

      {!actionsLoading && hasPersonal && !isNode && (
        <div style={{
          background: 'rgba(0,229,195,0.05)', border: '1px solid rgba(0,229,195,0.18)',
          borderRadius: '12px', padding: '16px 18px',
        }}>
          <h3 style={{ fontFamily: FRANK, fontSize: '14px', color: BIO_CYAN, margin: '0 0 10px', fontWeight: 700 }}>
            🌿 {isHe ? 'הגינה שלך היום:' : 'Your garden today:'}
          </h3>

          {matching.length > 0 ? (
            matching.map((p, i) => (
              <div key={i} style={{
                display: 'flex', gap: '10px', alignItems: 'center',
                padding: '6px 0',
                borderBottom: i < matching.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: ASST, fontSize: '13px', color: TEXT_MID }}>
                    {isHe ? p.plantNameHe : (p.plantNameEn || p.plantNameHe)}
                  </span>
                  {p.gardenName && (
                    <span style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}55`, marginRight: '6px', marginLeft: '6px' }}>
                      — {p.gardenName}
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: ASST, fontSize: '11px', fontWeight: 700,
                  background: p.action === 'harvest' ? 'rgba(74,156,104,0.25)' : 'rgba(181,136,99,0.25)',
                  color: p.action === 'harvest' ? '#4A9C68' : '#C8A070',
                  borderRadius: '99px', padding: '2px 10px', flexShrink: 0,
                }}>
                  {isHe ? ACTION_LABEL_HE[p.action] : ACTION_LABEL_EN[p.action]}
                </span>
              </div>
            ))
          ) : (
            <p style={{ fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}70`, margin: 0 }}>
              {isHe
                ? 'הצמחים בגינה שלך לא מתאימים במיוחד להיום — אבל תמיד אפשר להשקות ולבדוק.'
                : "Your plants aren't a strong match for today — but watering and checking is always fine."}
            </p>
          )}

          {nonMatching.length > 0 && matching.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}45`, marginBottom: '6px' }}>
                {isHe ? 'שאר הגינה — פחות מתאים להיום:' : "Rest of garden — less ideal today:"}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {nonMatching.map((p, i) => (
                  <span key={i} style={{
                    fontFamily: ASST, fontSize: '12px', color: `${TEXT_MID}55`,
                    background: 'rgba(255,255,255,0.04)', borderRadius: '99px',
                    padding: '3px 10px', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {p.emoji} {isHe ? p.plantNameHe : (p.plantNameEn || p.plantNameHe)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!actionsLoading && !hasPersonal && !isNode && (
        <div style={{
          background: 'rgba(0,229,195,0.04)', border: '1px dashed rgba(0,229,195,0.2)',
          borderRadius: '12px', padding: '14px 18px',
          display: 'flex', gap: '12px', alignItems: 'center',
        }}>
          <span style={{ fontSize: '20px' }}>🗺️</span>
          <div style={{ fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}70`, flex: 1 }}>
            {isHe
              ? 'הוסף צמחים למפת הגינה שלך כדי לקבל המלצות מותאמות אישית להיום.'
              : 'Add plants to your garden map to get personalized recommendations for today.'}
          </div>
          <a href="/map" style={{
            fontFamily: FRANK, fontSize: '12px', fontWeight: 700,
            color: BIO_CYAN, textDecoration: 'none', flexShrink: 0,
          }}>
            {isHe ? 'למפה ›' : 'Map ›'}
          </a>
        </div>
      )}

      {/* Tracker alerts */}
      {!actionsLoading && alerts.length > 0 && (
        <div style={{
          background: 'rgba(196,132,200,0.08)', border: '1px solid rgba(196,132,200,0.2)',
          borderRadius: '12px', padding: '12px 18px',
        }}>
          <h3 style={{ fontFamily: FRANK, fontSize: '13px', color: '#C884C8', margin: '0 0 8px', fontWeight: 700 }}>
            📸 {isHe ? 'כדאי לבדוק:' : 'Worth checking:'}
          </h3>
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}90`, padding: '3px 0',
            }}>
              <span style={{ color: '#C884C8', flexShrink: 0 }}>•</span>
              <span>{isHe ? a.plantNameHe : (a.plantNameEn || a.plantNameHe)}</span>
              <span style={{ color: `${TEXT_MID}45`, fontSize: '11px', marginRight: 'auto', marginLeft: 'auto' }}>
                {a.lastAnalysisDaysAgo === null
                  ? (isHe ? '(לא נבדק)' : '(never checked)')
                  : (isHe ? `(לפני ${a.lastAnalysisDaysAgo} ימים)` : `(${a.lastAnalysisDaysAgo}d ago)`)}
              </span>
              <a href="/tracker" style={{ fontFamily: ASST, fontSize: '11px', color: '#C884C8', textDecoration: 'none' }}>
                {isHe ? 'לבדיקה ›' : 'Check ›'}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Generic BD advice */}
      <div style={{
        background: 'rgba(0,229,195,0.04)', border: '1px solid rgba(0,229,195,0.12)',
        borderRadius: '12px', padding: '16px 18px',
      }}>
        <h3 style={{ fontFamily: FRANK, fontSize: '13px', color: `${BIO_CYAN}BB`, margin: '0 0 8px', fontWeight: 700 }}>
          ✅ {isHe ? 'פעולות מומלצות כלליות:' : 'General recommended actions:'}
        </h3>
        {goodFor.map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}99`,
            padding: '3px 0',
          }}>
            <span style={{ color: `${BIO_CYAN}80`, flexShrink: 0 }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {showAvoid && avoidToday.length > 0 && (
        <div style={{
          background: 'rgba(192,98,42,0.08)', border: '1px solid rgba(192,98,42,0.25)',
          borderRadius: '12px', padding: '14px 18px',
        }}>
          <h3 style={{ fontFamily: FRANK, fontSize: '13px', color: '#E8956A', margin: '0 0 8px', fontWeight: 700 }}>
            ⚠️ {isHe ? 'עדיף להמנע היום:' : 'Best to avoid today:'}
          </h3>
          {avoidToday.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: '8px', fontFamily: ASST, fontSize: '13px', color: '#E8956A', padding: '3px 0',
            }}>
              <span style={{ flexShrink: 0 }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setBdOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: ASST, fontSize: '12px', color: `${TEXT_MID}45`,
          textAlign: 'start' as const, padding: '2px 0',
          display: 'flex', alignItems: 'center', gap: '5px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = `${TEXT_MID}80`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${TEXT_MID}45`; }}
      >
        <span>{bdOpen ? '▾' : '›'}</span>
        <span>{isHe ? 'מה זה אומר?' : 'What does this mean?'}</span>
        <span style={{ color: `${TEXT_MID}25` }}> — </span>
        <span style={{ color: `${TEXT_MID}35` }}>{isHe ? bdSummary.bdDetail.he : bdSummary.bdDetail.en}</span>
      </button>

      {bdOpen && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px', padding: '14px 16px',
          fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}75`, lineHeight: 1.7,
        }}>
          <div style={{ marginBottom: '6px' }}>{isHe ? bdSummary.bdDetail.he : bdSummary.bdDetail.en}</div>
          <div style={{ color: `${TEXT_MID}50`, fontSize: '12px' }}>
            {isHe ? `ציון ביודינמי: ${score}/10` : `Biodynamic score: ${score}/10`}
          </div>
        </div>
      )}
    </div>
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
  const { data: todayActions, loading: actionsLoading } = useTodayActions();

  const today      = todayISO();
  const todayTasks = tasks.filter(t => t.date === today);
  const firstName  = profile?.display_name?.split(' ')[0] ?? '';
  const isNewUser  = user
    ? Date.now() - new Date(user.created_at).getTime() < 24 * 60 * 60 * 1000
    : false;
  const dayType    = day ? DAY_TYPE_MAP[day.dayType] ?? null : null;
  const scoreColor = day ? (SCORE_COLOR[day.scoreColour] ?? BIO_CYAN) : BIO_CYAN;

  const bdSummary = day ? getBDPlainSummary(
    day.dayType as DayType,
    day.plantingScore,
    day.ascendingDescending === 'ascending',
    !!day.nodeActive,
    !!day.prep500Recommended,
    !!day.prep501Recommended,
  ) : null;

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
      background: 'linear-gradient(135deg, rgba(14,30,23,0.95) 0%, rgba(9,20,16,0.98) 100%)',
      border: '1px solid rgba(0,229,195,0.18)',
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
          background: 'radial-gradient(circle at 35% 35%, rgba(0,229,195,0.4), rgba(0,180,150,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '34px',
          boxShadow: '0 0 24px rgba(0,229,195,0.25), 0 0 8px rgba(0,229,195,0.15)',
        }}>
          🌕
        </div>
        <div>
          <div style={{ fontFamily: FRANK, fontSize: '20px', color: BIO_CYAN, fontWeight: 700, lineHeight: 1.2 }}>
            {firstName ? t('greeting.hello', { name: firstName }) : t('greeting.helloGuest')} {t(getGreetingKey())}
          </div>
          <div style={{ fontFamily: ASST, fontSize: '12px', color: `${TEXT_MID}70`, marginTop: '3px' }}>
            {t('chupchu.subtitle')}
          </div>
        </div>
      </div>

      {(day?.chupChuDailySummary || day?.dayType) && (
        <p style={{
          fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}CC`,
          margin: 0, lineHeight: 1.6,
          borderRight: `3px solid ${BIO_CYAN}55`,
          paddingRight: '12px',
        }}>
          {isHe
            ? (day!.chupChuDailySummary || '')
            : (CHUPCHU_SUMMARIES_EN[day!.dayType] ?? day!.chupChuDailySummary ?? '')}
        </p>
      )}

      <button
        onClick={e => { e.stopPropagation(); openChupChu(); }}
        style={{
          fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
          color: NIGHT, background: BIO_CYAN,
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
        minHeight: '100vh', backgroundColor: NIGHT,
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
                  {bdSummary
                    ? (isHe ? bdSummary.headline.he : bdSummary.headline.en).split('—')[0].trim()
                    : `${t('dayTypePrefix')} ${t('dayTypes.' + day!.dayType)}`}
                </span>
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              background: 'rgba(0,229,195,0.1)', border: '1px solid rgba(0,229,195,0.25)',
              borderRadius: '99px', padding: '7px 14px',
            }}>
              <span style={{ fontSize: '16px' }}>{moonEmoji(day.moonPhasePct)}</span>
              <span style={{ fontFamily: ASST, fontSize: '12px', color: BIO_CYAN, fontWeight: 600 }}>
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

        {/* Section 3: Plain-language action card */}
        {day && !calLoading && bdSummary && (
          <div style={{ marginBottom: '12px' }}>
            <DayActionCard
              bdSummary={bdSummary}
              isHe={isHe}
              score={day.plantingScore}
              isNode={!!day.nodeActive}
              todayActions={todayActions}
              actionsLoading={actionsLoading}
            />
          </div>
        )}

        {/* Section 4: Today's tasks preview */}
        <div style={{
          background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.12)',
          borderRadius: '14px', padding: '16px', marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '16px', color: BIO_CYAN, margin: 0 }}>
              {t('todayTasks.title')}
            </h2>
            <Link
              to="/tasks"
              style={{ fontFamily: ASST, fontSize: '12px', color: `${TEXT_MID}65`, textDecoration: 'none' }}
            >
              {t('todayTasks.seeAll')}
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <p style={{ fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}50`, margin: 0 }}>
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
                    border: `2px solid ${task.status === 'done' ? BIO_CYAN : 'rgba(255,255,255,0.25)'}`,
                    background: task.status === 'done' ? BIO_CYAN : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: NIGHT, fontSize: '12px', padding: 0,
                  }}
                >
                  {task.status === 'done' ? '✓' : ''}
                </button>
                <span style={{
                  fontFamily: ASST, fontSize: '13px',
                  color: task.status === 'done' ? `${TEXT_MID}45` : TEXT_MID,
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {isHe ? task.title : (REST_DAY_TITLES[task.title] ?? task.title)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Section 5: Navigation grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
        }}>
          {NAV_BUTTONS.map(btn => (
            <Link key={btn.to} to={btn.to} style={{ textDecoration: 'none' }}>
              <div style={{
                height: '100px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0,229,195,0.18)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(0,229,195,0.1)';
                el.style.borderColor = 'rgba(0,229,195,0.45)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.borderColor = 'rgba(0,229,195,0.18)';
              }}
              >
                <span style={{ fontSize: '32px', lineHeight: 1 }}>{btn.emoji}</span>
                <span style={{ fontFamily: ASST, fontSize: '13px', color: BIO_CYAN, fontWeight: 600 }}>
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
      minHeight: '100vh', backgroundColor: NIGHT,
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
            background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.1)',
            borderRadius: '14px', padding: '16px',
          }}>
            <h3 style={{
              fontFamily: ASST, fontSize: '11px', fontWeight: 700,
              color: `${TEXT_MID}50`, margin: '0 0 10px',
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
                  color: TEXT_MID,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,195,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '18px', width: '26px', textAlign: 'center', lineHeight: 1 }}>
                  {btn.emoji}
                </span>
                <span style={{ fontFamily: ASST, fontSize: '14px', flex: 1 }}>{t(btn.tKey)}</span>
                <span style={{ color: `${TEXT_MID}35`, fontSize: '14px' }}>‹</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Column 2: Today's full briefing ── */}
        <div style={{
          background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.12)',
          borderRadius: '16px', padding: '28px',
          display: 'flex', flexDirection: 'column', gap: '22px',
        }}>
          {/* Date header */}
          <div>
            <h1 style={{ fontFamily: FRANK, fontSize: '28px', color: BIO_CYAN, margin: '0 0 4px', lineHeight: 1.2 }}>
              {todayDateStr}
            </h1>
            <p style={{ fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}55`, margin: 0 }}>
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
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}60`, marginBottom: '4px' }}>{t('biodynamic.plantingScore')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '28px', color: scoreColor, fontWeight: 700, lineHeight: 1 }}>
                      {day.plantingScore}
                      <span style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}40`, fontWeight: 400 }}> /10</span>
                    </div>
                    {bdSummary && (
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${scoreColor}CC`, marginTop: '5px', lineHeight: 1.3 }}>
                        {isHe ? bdSummary.scoreLabel.he : bdSummary.scoreLabel.en}
                      </div>
                    )}
                  </div>

                  {/* Row 1 — moon phase % */}
                  <div style={{ background: 'rgba(0,229,195,0.07)', border: '1px solid rgba(0,229,195,0.2)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}60`, marginBottom: '4px' }}>{t('biodynamic.moonPhase')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '22px', color: BIO_CYAN }}>
                      {moonEmoji(day.moonPhasePct)} {day.moonPhasePct}%
                    </div>
                  </div>

                  {/* Row 1 — day type / plain headline */}
                  {dayType ? (
                    <div style={{ background: dayType.bg, border: `1px solid ${dayType.color}55`, borderRadius: '12px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}60`, marginBottom: '4px' }}>
                        {isHe ? 'היום בגינה' : 'Today in the garden'}
                      </div>
                      <div style={{ fontFamily: FRANK, fontSize: '13px', color: dayType.color, fontWeight: 700, lineHeight: 1.4 }}>
                        {bdSummary
                          ? (isHe ? bdSummary.headline.he : bdSummary.headline.en)
                          : `${dayType.emoji} ${t('dayTypePrefix')} ${t('dayTypes.' + day!.dayType)}`}
                      </div>
                    </div>
                  ) : <div />}

                  {/* Row 2 — moon sign */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}50`, marginBottom: '5px' }}>{t('biodynamic.moonSign')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '16px', color: TEXT_MID }}>
                      {isHe ? day.moonSignHe : (MOON_SIGN_EN[day.moonSignHe] ?? day.moonSignHe)}
                    </div>
                  </div>

                  {/* Row 2 — rise time */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}50`, marginBottom: '5px' }}>{t('biodynamic.moonrise')}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '16px', color: TEXT_MID }}>{day.moonriseTime ?? '—'}</div>
                  </div>

                  {/* Row 2 — set time */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}50`, marginBottom: '5px' }}>{isHe ? 'שקיעת ירח' : 'Moonset'}</div>
                    <div style={{ fontFamily: FRANK, fontSize: '16px', color: TEXT_MID }}>{day.moonsetTime ?? '—'}</div>
                  </div>

                  {/* Row 3 — ascending/descending + phase name, full width */}
                  <div style={{
                    gridColumn: '1 / -1',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}50`, marginBottom: '5px' }}>
                        🌙 {isHe ? 'הירח היום' : 'Moon today'}
                      </div>
                      <div style={{ fontFamily: FRANK, fontSize: '14px', color: TEXT_MID, lineHeight: 1.4 }}>
                        {bdSummary
                          ? (isHe ? bdSummary.moonMessage.he : bdSummary.moonMessage.en)
                          : (day.ascendingDescending === 'ascending' ? (isHe ? '↑ עולה' : '↑ Ascending') : (isHe ? '↓ יורד' : '↓ Descending'))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: ASST, fontSize: '11px', color: `${TEXT_MID}50`, marginBottom: '5px' }}>{isHe ? 'שם הפאזה' : 'Phase name'}</div>
                      <div style={{ fontFamily: FRANK, fontSize: '16px', color: TEXT_MID }}>
                        {isHe ? day.moonPhaseNameHe : (PHASE_NAME_EN[day.moonPhaseNameHe] ?? day.moonPhaseNameHe)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moon canvas — RTL end (left side visually) */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: '165px', height: '165px' }}>
                    <MoonCanvas
                      phasePct={day.moonPhasePct ?? 0}
                      phaseAngle={day.moonPhaseAngle ?? (day.moonPhasePct ?? 0) / 100 * 360}
                    />
                    {(day.moonPhasePct ?? 0) < 3 && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', zIndex: 10,
                      }}>
                        <MoonSignSVG />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Plain-language action card */}
              {bdSummary && (
                <DayActionCard
                  bdSummary={bdSummary}
                  isHe={isHe}
                  score={day.plantingScore}
                  isNode={!!day.nodeActive}
                  todayActions={todayActions}
                  actionsLoading={actionsLoading}
                />
              )}

              {/* Perigee notice */}
              {day.perigeeActive && !day.nodeActive && (
                <div style={{
                  background: 'rgba(192,98,42,0.08)', border: '1px solid rgba(192,98,42,0.22)',
                  borderRadius: '12px', padding: '12px 18px',
                  display: 'flex', gap: '10px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '18px' }}>🌕</span>
                  <div style={{ fontFamily: ASST, fontSize: '13px', color: '#E8956A' }}>
                    {isHe ? 'הירח קרוב לכדור הארץ היום — כוחות הגאות חזקים יותר מהרגיל' : 'Moon close to Earth today — tidal forces are stronger than usual'}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: ASST, fontSize: '14px', color: `${TEXT_MID}50` }}>
              {isHe ? 'לא נמצאו נתוני לוח להיום' : 'No calendar data found for today'}
            </p>
          )}
        </div>

        {/* ── Column 3: Weekly tasks ── */}
        <div style={{
          background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.12)',
          borderRadius: '16px', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          position: 'sticky', top: '88px',
          maxHeight: 'calc(100vh - 130px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: BIO_CYAN, margin: 0 }}>
              {isHe ? 'משימות השבוע' : "This Week's Tasks"}
            </h2>
            <Link
              to="/tasks"
              style={{ fontFamily: ASST, fontSize: '12px', color: `${TEXT_MID}60`, textDecoration: 'none' }}
            >
              {isHe ? 'הכל ›' : 'All ›'}
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontFamily: ASST, fontSize: '13px', color: `${TEXT_MID}50`, marginBottom: '12px' }}>
                {isHe ? 'אין משימות לשבוע זה' : 'No tasks this week'}
              </p>
              <Link
                to="/plan"
                style={{ fontFamily: FRANK, fontSize: '13px', color: BIO_CYAN, textDecoration: 'none' }}
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
                    color: isToday ? BIO_CYAN : `${TEXT_MID}60`,
                    marginBottom: '6px', fontWeight: isToday ? 700 : 400,
                    paddingBottom: '4px',
                    borderBottom: `1px solid ${isToday ? 'rgba(0,229,195,0.2)' : 'rgba(255,255,255,0.06)'}`,
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
                          border: `1.5px solid ${task.status === 'done' ? BIO_CYAN : 'rgba(255,255,255,0.2)'}`,
                          background: task.status === 'done' ? BIO_CYAN : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', color: NIGHT, padding: 0,
                        }}
                      >
                        {task.status === 'done' ? '✓' : ''}
                      </button>
                      <span style={{
                        fontFamily: ASST, fontSize: '13px',
                        color: task.status === 'done' ? `${TEXT_MID}40` : `${TEXT_MID}DD`,
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
              color: NIGHT, background: BIO_CYAN,
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
