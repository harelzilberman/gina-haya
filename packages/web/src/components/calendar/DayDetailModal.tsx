import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import type { BiodynamicDay } from '@gina-haya/shared';

const GOLD     = '#F5C840';
const PARCH    = '#EDE0C4';
const SAGE_GRN = '#7DC084';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';
const ASSIST   = '"Assistant", "Heebo", sans-serif';

const SCORE_COLOURS: Record<string, string> = {
  green:  '#7DC084',
  yellow: '#F5C840',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#555555',
};

const DAY_TYPE_EMOJIS: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

const DAY_TYPE_COLOURS: Record<string, string> = {
  fruit:  '#7DC084',
  root:   '#C8A040',
  flower: '#D4709A',
  leaf:   '#7DC084',
};

const TIPS_HE: Record<string, string[]> = {
  fruit: [
    '✓ יום מצוין לשתילת עגבניות, מלפפונים, פלפלים וקישואים',
    '✓ הזמן האידיאלי לקציר ירקות פרי לטעם מיטבי',
    '✓ מומלץ לזרוע זרעי פרי ביום זה',
    '✓ הגזם את עצי הפרי ביום פרי לתוצאות טובות יותר',
  ],
  root: [
    '✓ שתול גזר, סלק, לפת, צנוניות ובצל',
    '✓ יום טוב לעבודת קרקע ועיבוד ערוגות',
    '✓ קצור ירקות שורש לאחסון ארוך יותר',
    '✓ מומלץ לשתול שום ובצל לפני החורף',
  ],
  flower: [
    '✓ שתול פרחים, צמחי נוי ועשבי תיבול מפרחים',
    '✓ יום טוב לקציר עשבי תיבול לייבוש ואחסון',
    '✓ מומלץ לקצץ גדרות חיות ביום פרח',
    '✓ הזמן הנכון לגזום עצי פרי פורחים',
  ],
  leaf: [
    '✓ שתול חסה, תרד, כרוב, פטרוזיליה וכוסברה',
    '✓ יום מצוין לגיזום וקציר ירקות עלים',
    '✓ מומלץ לדשן עם קומפוסט ביום עלה',
    '✓ השקיה יעילה יותר ביום עלה',
  ],
};

const TIPS_EN: Record<string, string[]> = {
  fruit: [
    '✓ Excellent day for planting tomatoes, cucumbers, peppers and zucchini',
    '✓ Ideal time to harvest fruit vegetables for best flavour',
    '✓ Recommended for sowing fruit seeds today',
    '✓ Prune fruit trees on a Fruit day for better results',
  ],
  root: [
    '✓ Plant carrots, beets, turnips, radishes and onions',
    '✓ Good day for soil work and bed preparation',
    '✓ Harvest root vegetables for longer storage',
    '✓ Recommended for planting garlic and onions before winter',
  ],
  flower: [
    '✓ Plant flowers, ornamental plants and flowering herbs',
    '✓ Good day for harvesting herbs for drying and storage',
    '✓ Recommended for trimming hedges on a Flower day',
    '✓ Right time to prune flowering fruit trees',
  ],
  leaf: [
    '✓ Plant lettuce, spinach, cabbage, parsley and coriander',
    '✓ Excellent day for pruning and harvesting leafy vegetables',
    '✓ Recommended to fertilise with compost on a Leaf day',
    '✓ Watering is more effective on a Leaf day',
  ],
};

const CHUPCHU_DEFAULTS_HE: Record<string, string> = {
  fruit:  'יום פרי מבורך! זרעו, שתלו וקצרו ירקות פרי להנאתכם.',
  root:   'יום שורש חזק — הקרקע מוכנה לקבל שורשים חדשים.',
  flower: 'יום פרח נפלא — הטבע פורח סביבכם.',
  leaf:   'יום עלה — הירוק בשיאו, גזמו וקצרו.',
};

const CHUPCHU_DEFAULTS_EN: Record<string, string> = {
  fruit:  'Blessed Fruit day! Sow, plant and harvest your fruiting vegetables.',
  root:   'Strong Root day — the soil is ready for new roots.',
  flower: 'Wonderful Flower day — nature blooms around you.',
  leaf:   'Leaf day — greens at their peak, trim and harvest.',
};

interface Props {
  day: BiodynamicDay;
  onClose: () => void;
}

const MODAL_CSS = `
@keyframes ddm-in {
  from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) scale(0.97); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.ddm-card { animation: ddm-in 0.25s ease-out both; }
.ddm-card::-webkit-scrollbar { display: none; }
`;

export function DayDetailModal({ day, onClose }: Props) {
  const { i18n } = useTranslation();
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const scoreColour  = SCORE_COLOURS[day.scoreColour] ?? GOLD;
  const dayColour    = DAY_TYPE_COLOURS[day.dayType] ?? SAGE_GRN;
  const tips         = isHe ? TIPS_HE[day.dayType] : TIPS_EN[day.dayType];
  const isAscending  = day.ascendingDescending === 'ascending';

  const fullDate = new Date(day.date + 'T12:00:00').toLocaleDateString(
    isHe ? 'he-IL' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jerusalem' },
  );

  const moonLabel = isHe
    ? (isAscending ? 'ירח עולה' : 'ירח יורד')
    : (isAscending ? 'Ascending Moon' : 'Descending Moon');

  const moonDesc = isHe
    ? (isAscending
      ? 'הארץ נושמת החוצה — מומלץ לקציר ואיסוף'
      : 'הארץ נושמת פנימה — הזמן הטוב ביותר לשתילה ולהשקיה')
    : (isAscending
      ? 'The earth breathes outward — recommended for harvesting and gathering'
      : 'The earth breathes inward — best time for planting and watering');

  const monSummary = isHe
    ? (day.chupChuDailySummary || CHUPCHU_DEFAULTS_HE[day.dayType] || '')
    : (CHUPCHU_DEFAULTS_EN[day.dayType] || '');

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          1000,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter:  'blur(4px)',
        }}
      />

      {/* Modal card */}
      <div
        className="ddm-card"
        dir={dir}
        role="dialog"
        aria-modal="true"
        style={{
          position:        'fixed',
          top:             '50%',
          left:            '50%',
          transform:       'translate(-50%, -50%)',
          zIndex:          1001,
          width:           'min(520px, calc(100vw - 32px))',
          maxHeight:       'calc(100vh - 64px)',
          overflowY:       'auto',
          backgroundColor: '#1C3A1E',
          border:          '1px solid rgba(245,200,64,0.25)',
          borderRadius:    '16px',
          boxShadow:       '0 24px 80px rgba(0,0,0,0.7)',
          scrollbarWidth:  'none',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          padding:      '20px 20px 16px',
          borderBottom: '1px solid rgba(245,200,64,0.08)',
          position:     'relative',
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label={isHe ? 'סגור' : 'Close'}
            style={{
              position:        'absolute',
              top:             '16px',
              insetInlineEnd:  '16px',
              width:           '28px',
              height:          '28px',
              borderRadius:    '50%',
              border:          '1px solid rgba(245,200,64,0.2)',
              backgroundColor: 'transparent',
              color:           GOLD,
              fontSize:        '15px',
              lineHeight:      1,
              cursor:          'pointer',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              padding:         0,
              transition:      'background-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            ✕
          </button>

          {/* Full date */}
          <p style={{
            fontFamily:    ASSIST,
            fontSize:      '12px',
            fontWeight:    600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         `${PARCH}55`,
            margin:        '0 0 10px',
            paddingInlineEnd: '36px',
          }}>
            {fullDate}
          </p>

          {/* Day type badge + Score */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap:   'wrap',
            gap:        '12px',
          }}>
            <div style={{
              display:         'inline-flex',
              alignItems:      'center',
              gap:             '7px',
              backgroundColor: `${dayColour}18`,
              border:          `1px solid ${dayColour}40`,
              borderRadius:    '8px',
              padding:         '6px 14px',
            }}>
              <span style={{ fontSize: '18px' }}>{DAY_TYPE_EMOJIS[day.dayType]}</span>
              <span style={{ fontFamily: FRANK, fontSize: '16px', fontWeight: 600, color: dayColour }}>
                {isHe ? day.dayTypeHe : day.dayType.charAt(0).toUpperCase() + day.dayType.slice(1) + ' Day'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: FRANK, fontSize: '36px', fontWeight: 700, lineHeight: 1, color: scoreColour }}>
                {day.plantingScore}
              </span>
              <span style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}55` }}>
                / 10
              </span>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* NODE BLACKOUT */}
          {day.nodeActive && (
            <div style={{
              backgroundColor: 'rgba(163,48,48,0.15)',
              border:          '1px solid rgba(163,48,48,0.35)',
              borderRadius:    '10px',
              padding:         '12px 16px',
            }}>
              <p style={{ fontFamily: ASSIST, fontSize: '14px', fontWeight: 700, color: '#E06060', margin: '0 0 4px' }}>
                ⚫ {isHe ? 'יום צומת — יום מנוחה לגינה' : 'Node Day — rest day for the garden'}
              </p>
              <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}77`, margin: 0 }}>
                {isHe
                  ? 'הימנע משתילה, קציר ועבודות קרקע'
                  : 'Avoid planting, harvesting and soil work'}
              </p>
            </div>
          )}

          {/* MOON SECTION */}
          <div style={{
            backgroundColor: 'rgba(20,43,22,0.6)',
            border:          '1px solid rgba(245,200,64,0.08)',
            borderRadius:    '10px',
            padding:         '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', color: GOLD }}>{isAscending ? '↑' : '↓'}</span>
              <span style={{ fontFamily: FRANK, fontSize: '15px', fontWeight: 600, color: GOLD }}>
                {moonLabel}
              </span>
            </div>
            <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}AA`, margin: '0 0 8px', lineHeight: 1.6 }}>
              {moonDesc}
            </p>
            <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}66`, margin: 0 }}>
              {isHe ? 'מזל הירח:' : 'Moon sign:'}{' '}
              <span style={{ color: SAGE_GRN }}>{isHe ? day.moonSignHe : day.moonSign}</span>
            </p>
          </div>

          {/* BIODYNAMIC TIPS */}
          <div>
            <p style={{
              fontFamily:    FRANK,
              fontSize:      '14px',
              fontWeight:    600,
              color:         GOLD,
              margin:        '0 0 10px',
              letterSpacing: '0.02em',
            }}>
              {isHe ? 'טיפים ביודינמיים ליום זה' : 'Biodynamic Tips for Today'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(tips ?? []).map((tip, i) => (
                <p key={i} style={{
                  fontFamily:         ASSIST,
                  fontSize:           '13px',
                  color:              `${PARCH}99`,
                  lineHeight:         1.55,
                  margin:             0,
                  paddingInlineStart: '4px',
                }}>
                  {tip}
                </p>
              ))}
            </div>
          </div>

          {/* BD PREPARATIONS */}
          {(day.prep500Recommended || day.prep501Recommended) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {day.prep500Recommended && (
                <div style={{
                  backgroundColor: 'rgba(245,200,64,0.08)',
                  border:          '1px solid rgba(245,200,64,0.25)',
                  borderRadius:    '8px',
                  padding:         '10px 14px',
                }}>
                  <p style={{ fontFamily: ASSIST, fontSize: '13px', color: GOLD, margin: 0 }}>
                    {isHe
                      ? '✅ זמן מומלץ למריחת פרפרט 500 (16:00–19:00)'
                      : '✅ Recommended time to apply BD-500 (16:00–19:00)'}
                  </p>
                </div>
              )}
              {day.prep501Recommended && (
                <div style={{
                  backgroundColor: 'rgba(245,200,64,0.08)',
                  border:          '1px solid rgba(245,200,64,0.25)',
                  borderRadius:    '8px',
                  padding:         '10px 14px',
                }}>
                  <p style={{ fontFamily: ASSIST, fontSize: '13px', color: GOLD, margin: 0 }}>
                    {isHe
                      ? '✅ זמן מומלץ למריחת פרפרט 501 (עלות השחר–09:00)'
                      : '✅ Recommended time to apply BD-501 (dawn–09:00)'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CHUPCHU TIP */}
          <div style={{
            display:           'flex',
            gap:               '12px',
            alignItems:        'flex-start',
            backgroundColor:   'rgba(20,43,22,0.7)',
            border:            '1px solid rgba(245,200,64,0.08)',
            borderInlineStart: `3px solid ${GOLD}`,
            borderRadius:      '10px',
            padding:           '14px 16px',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🌕</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily:    ASSIST,
                fontSize:      '11px',
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         GOLD,
                margin:        '0 0 6px',
              }}>
                {isHe ? "צ'ופצ'ו ממליץ:" : 'ChupChu recommends:'}
              </p>
              <p style={{
                fontFamily: PLAYFAIR,
                fontStyle:  'italic',
                fontSize:   '13px',
                lineHeight: 1.7,
                color:      `${PARCH}CC`,
                margin:     0,
              }}>
                {monSummary}
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
