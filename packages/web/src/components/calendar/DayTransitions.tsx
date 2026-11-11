import { useTranslation } from 'react-i18next';
import type { BiodynamicDay, CalendarTransition } from '@gina-haya/shared';
import { useDirection } from '../../hooks/useDirection';
import { EN_HEADING } from '../../styles/fonts';

// ── In-day changes (variant calendar only) ───────────────────────────────────
//
// "עלה עד 14:20 ← פרח" / "Leaf until 14:20 → Flower". Times are the garden's
// local time (computed server-side for the variant's UTC offset). Renders
// nothing for legacy days, which have no transitions.

const TEXT_MID = '#b0cfbf';
const BIO_CYAN = '#00e5c3';

function useTransitionLabel() {
  const { t, i18n } = useTranslation('calendar');
  const isHe = i18n.language === 'he';
  return (tr: CalendarTransition): string => {
    const time = tr.local_time;
    switch (tr.type) {
      case 'sign_change':
        return t('transitions.signChange', {
          from: isHe ? tr.from_day_type_he : t(`transitions.dayType.${tr.from_day_type}`),
          to:   isHe ? tr.to_day_type_he   : t(`transitions.dayType.${tr.to_day_type}`),
          time,
        });
      case 'asc_desc_change':
        return t('transitions.ascDesc', { direction: t(`transitions.direction.${tr.value}`), time });
      case 'new_moon':
        return t('transitions.newMoon', { time });
      case 'full_moon':
        return t('transitions.fullMoon', { time });
      default:
        return '';
    }
  };
}

export function DayTransitions({ day, align = 'start' }: { day: BiodynamicDay; align?: 'start' | 'center' }) {
  const { t } = useTranslation('calendar');
  const { dir } = useDirection();
  const label = useTransitionLabel();
  const items = (day.transitions ?? []).filter(tr => tr && tr.local_time);
  if (items.length === 0) return null;

  return (
    <div
      dir={dir}
      aria-label={t('transitions.title')}
      style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        alignItems: align === 'center' ? 'center' : 'stretch',
        margin: '0 0 14px',
      }}
    >
      {items.map((tr, i) => (
        <p
          key={`${tr.type}-${i}`}
          style={{
            margin: 0, fontFamily: EN_HEADING, fontSize: '13px', color: TEXT_MID,
            textAlign: align === 'center' ? 'center' : (dir === 'rtl' ? 'right' : 'left'),
          }}
        >
          <span aria-hidden style={{ color: BIO_CYAN, marginInlineEnd: '6px' }}>⏱</span>
          {label(tr)}
        </p>
      ))}
    </div>
  );
}
