import { useTranslation } from 'react-i18next';
import { useToday } from '../../hooks/useCalendar';

const MOON_GOLD = '#B7924A';
const GOLD      = '#F5C840';
const PARCH     = '#EDE0C4';
const PLAYFAIR  = '"Playfair Display", Georgia, serif';
const ASSIST    = '"Assistant", "Heebo", sans-serif';

const DAY_TYPE_HE: Record<string, string> = {
  fruit:  'יום פרי 🍅',
  root:   'יום שורש 🥕',
  flower: 'יום פרח 🌸',
  leaf:   'יום עלה 🌿',
};

export function ChupChuGreeting() {
  const { t, i18n } = useTranslation('chupchu');
  const { day } = useToday();

  const calendarLine = day
    ? t('calendarContext', {
        dayType: i18n.language === 'he'
          ? (DAY_TYPE_HE[day.dayType] ?? day.dayTypeHe)
          : day.dayType,
      })
    : null;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', maxWidth: '85%' }}>
        {/* Avatar */}
        <div
          style={{
            flexShrink:     0,
            width:          '28px',
            height:         '28px',
            borderRadius:   '50%',
            background:     `radial-gradient(circle at 40% 40%, #F5D060, ${GOLD}, #C8960A)`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '13px',
            lineHeight:     1,
            marginBottom:   '2px',
          }}
          aria-hidden="true"
        >
          🌕
        </div>

        {/* Bubble */}
        <div
          style={{
            borderRadius:    '16px',
            borderTopLeftRadius: '4px',
            padding:         '10px 14px',
            fontSize:        '14px',
            lineHeight:      1.65,
            backgroundColor: 'var(--color-background-secondary, rgba(28,58,30,0.8))',
            border:          '1px solid rgba(245,200,64,0.15)',
            borderInlineEnd: `2px solid ${GOLD}`,
            color:           `var(--color-text-primary, ${PARCH})`,
            fontFamily:      PLAYFAIR,
          }}
        >
          <p style={{ margin: 0 }}>{t('greeting')}</p>
          {calendarLine && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', fontFamily: ASSIST, color: `${PARCH}99` }}>
              {calendarLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
