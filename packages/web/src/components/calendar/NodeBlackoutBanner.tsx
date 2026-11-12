import { useTranslation } from 'react-i18next';
import { addDaysISO, type BiodynamicDay } from '@gina-haya/shared';
import { EN_HEADING } from '../../styles/fonts';
import { useCalendarZone } from '../../hooks/useCalendarZone';

interface Props {
  day: BiodynamicDay;
}

const BIO_CYAN = '#00e5c3';

const BANNER_CSS = `
@keyframes node-pulse {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
.node-dot { animation: node-pulse 1.8s ease-in-out infinite; }
`;

/**
 * Banner visibility: the node blackout window overlaps the day shown
 * (nodeBlackoutToday), or "now" is inside the window. nodeActive is only a
 * fallback for responses without nodeBlackoutToday (older API).
 */
export function isNodeBlackoutShown(day: BiodynamicDay, now: number = Date.now()): boolean {
  if (day.nodeBlackoutToday) return true;
  if (day.nodeBlackoutStart && day.nodeBlackoutEnd) {
    const start = Date.parse(day.nodeBlackoutStart);
    const end   = Date.parse(day.nodeBlackoutEnd);
    if (now >= start && now < end) return true;
  }
  return day.nodeBlackoutToday === undefined && day.nodeActive;
}

/** A moment as the garden's local date ("YYYY-MM-DD") and clock time. */
interface LocalMoment { date: string; time: string }

function toLocal(ms: number, timeZone: string, locale: string): LocalMoment {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ms);
  const time = new Date(ms).toLocaleTimeString(locale, { timeZone, hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

/**
 * How the node window relates to the selected local day:
 * - nodeDay:   the exact node moment falls on this day
 * - endsEarly: the window (from the previous day's node) ends during this day
 * - startsLate: the window (for the next day's node) starts during this day
 * - other:     anything else (e.g. covers the whole day) — described like nodeDay
 */
type NodeWindowKind = 'nodeDay' | 'endsEarly' | 'startsLate' | 'other';

interface NodeWindowInfo {
  kind: NodeWindowKind;
  node: LocalMoment;
  start: LocalMoment;
  end: LocalMoment;
  nowInside: boolean;
}

function describeNodeWindow(
  day: BiodynamicDay, timeZone: string, locale: string, now: number = Date.now(),
): NodeWindowInfo | null {
  if (!day.nodeBlackoutStart || !day.nodeBlackoutEnd) return null;
  const startMs = Date.parse(day.nodeBlackoutStart);
  const endMs   = Date.parse(day.nodeBlackoutEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  // The window is symmetric around the exact node moment.
  const nodeMs = (startMs + endMs) / 2;

  let start: LocalMoment, end: LocalMoment, node: LocalMoment;
  try {
    start = toLocal(startMs, timeZone, locale);
    end   = toLocal(endMs, timeZone, locale);
    node  = toLocal(nodeMs, timeZone, locale);
  } catch {
    return null;
  }

  const kind: NodeWindowKind =
    node.date === day.date ? 'nodeDay'
    : end.date === day.date ? 'endsEarly'
    : start.date === day.date ? 'startsLate'
    : 'other';

  return { kind, node, start, end, nowInside: now >= startMs && now < endMs };
}

export function NodeBlackoutBanner({ day }: Props) {
  const { t, i18n } = useTranslation('calendar');
  const zone = useCalendarZone();
  const locale = i18n.language === 'he' ? 'he-IL' : 'en-US';

  if (!isNodeBlackoutShown(day)) return null;

  // The day's own zone (variant days), else the active garden's zone.
  const info = describeNodeWindow(day, day.timezone ?? zone.timezone, locale);

  /** null on the selected day, else "tomorrow" / "yesterday" / a short date. */
  const dayWordOf = (m: LocalMoment): string | null =>
    m.date === day.date ? null
    : m.date === addDaysISO(day.date, 1)  ? t('nodeBlackout.tomorrow')
    : m.date === addDaysISO(day.date, -1) ? t('nodeBlackout.yesterday')
    : new Date(m.date + 'T12:00:00Z').toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  /** "HH:MM", prefixed with the day word when not on the selected day. */
  const at = (m: LocalMoment): string => {
    const dayWord = dayWordOf(m);
    return dayWord ? t('nodeBlackout.dayTime', { day: dayWord, time: m.time }) : m.time;
  };

  /** "Lunar node at HH:MM" / "Lunar node yesterday at HH:MM". */
  const nodeLine = (m: LocalMoment): string => {
    const dayWord = dayWordOf(m);
    return dayWord
      ? t('nodeBlackout.nodeAtDay', { day: dayWord, time: m.time })
      : t('nodeBlackout.nodeAt', { time: m.time });
  };

  // Legacy days (no exact times): the old generic wording.
  let heading = t('nodeBlackout.active');
  let detail: string | null = null;
  if (info) {
    const range = t('nodeBlackout.avoidRange', { start: at(info.start), end: at(info.end) });
    switch (info.kind) {
      case 'endsEarly':
        heading = t('nodeBlackout.endsEarly', { time: info.end.time });
        detail  = nodeLine(info.node);
        break;
      case 'startsLate':
        heading = t('nodeBlackout.startsLate', { time: info.start.time });
        detail  = nodeLine(info.node);
        break;
      default:
        heading = nodeLine(info.node);
        detail  = range;
    }
  }

  return (
    <>
      <style>{BANNER_CSS}</style>

      <div
        role="alert"
        style={{
          width:           '100%',
          padding:         '12px 20px',
          marginBottom:    '4px',
          backgroundColor: 'rgba(8,14,8,0.88)',
          borderBottom:    `1px solid ${BIO_CYAN}33`,
          borderTop:       `2px solid ${BIO_CYAN}55`,
          backdropFilter:  'blur(6px)',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          gap:             '4px',
          textAlign:       'center',
          boxSizing:       'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="node-dot" aria-hidden style={{ fontSize: '14px', lineHeight: 1 }}>⚫</span>
          {info?.nowInside && (
            <span style={{
              fontFamily:      EN_HEADING,
              fontSize:        '11px',
              fontWeight:      800,
              color:           '#050d0a',
              backgroundColor: BIO_CYAN,
              borderRadius:    '999px',
              padding:         '2px 8px',
              letterSpacing:   '0.04em',
            }}>
              {t('nodeBlackout.now')}
            </span>
          )}
          <p style={{
            fontFamily:    EN_HEADING,
            fontSize:      '13px',
            fontWeight:    700,
            color:         BIO_CYAN,
            margin:        0,
            letterSpacing: '0.04em',
          }}>
            {heading}
          </p>
          <span className="node-dot" aria-hidden style={{ fontSize: '14px', lineHeight: 1, animationDelay: '0.9s' }}>⚫</span>
        </div>

        {detail && (
          <p style={{
            fontFamily: EN_HEADING,
            fontSize:   '12px',
            color:      info?.nowInside ? `${BIO_CYAN}CC` : `${BIO_CYAN}99`,
            fontWeight: info?.nowInside ? 600 : 400,
            margin:     0,
          }}>
            {detail}
          </p>
        )}
      </div>
    </>
  );
}
