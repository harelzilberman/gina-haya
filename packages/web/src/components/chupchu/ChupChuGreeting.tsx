import { useTranslation } from 'react-i18next';
import { useToday } from '../../hooks/useCalendar';

const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

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
            background:     'radial-gradient(circle at 40% 40%, rgba(0,229,195,0.5), rgba(0,180,150,0.2))',
            border:         '1px solid rgba(0,229,195,0.3)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '13px',
            lineHeight:     1,
            marginBottom:   '2px',
          }}
          aria-hidden="true"
        >
          🌱
        </div>

        {/* Bubble */}
        <div
          style={{
            borderRadius:        '16px',
            borderTopLeftRadius: '4px',
            padding:             '10px 14px',
            fontSize:            '14px',
            lineHeight:          1.65,
            backgroundColor:     '#111f18',
            border:              '1px solid rgba(0,229,195,0.15)',
            borderInlineEnd:     `2px solid ${BIO_CYAN}`,
            color:               TEXT_MID,
            fontFamily:          FRANK,
          }}
        >
          <p style={{ margin: 0 }}>{t('greeting')}</p>
          {calendarLine && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', fontFamily: DM_SANS, color: `${TEXT_MID}99` }}>
              {calendarLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
