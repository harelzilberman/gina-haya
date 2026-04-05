import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import type { BiodynamicDay } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

const GOLD     = '#F5C840';
const PARCH    = '#EDE0C4';
const ASSIST   = '"Assistant", "Heebo", sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const CHUPCHU_CSS = `
@keyframes chupchu-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(245,200,64,0.3), 0 0 4px rgba(245,200,64,0.15); }
  50%       { box-shadow: 0 0 22px rgba(245,200,64,0.5), 0 0 8px rgba(245,200,64,0.25); }
}
.chupchu-avatar { animation: chupchu-glow 3s ease-in-out infinite; }
`;

const DEFAULT_SUMMARIES_HE: Record<string, string> = {
  fruit:  'יום פרי — זמן טוב לעסוק בפירות ובגידולים הנושאים פרי.',
  root:   'יום שורש — הגינה מזמינה אתכם לטפל בשורשים ובפקעות.',
  flower: 'יום פרח — אנרגיה מיוחדת לצמחי נוי ולתבלינים.',
  leaf:   'יום עלה — עסקו בגידולי עלים ובצמחיית ירוק.',
};

const DEFAULT_SUMMARIES_EN: Record<string, string> = {
  fruit:  'Today is a Fruit day — ideal for planting tomatoes, cucumbers and peppers.',
  root:   'Today is a Root day — great for carrots, beets and onions.',
  flower: 'Today is a Flower day — perfect for flowers and aromatic herbs.',
  leaf:   'Today is a Leaf day — good time to prune and harvest leafy vegetables.',
};

export function ChupChuDailySummary({ day }: Props) {
  const { i18n } = useTranslation();
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';

  const summary = isHe
    ? (day.chupChuDailySummary || DEFAULT_SUMMARIES_HE[day.dayType] || 'שלום מהגינה!')
    : (DEFAULT_SUMMARIES_EN[day.dayType] || 'Hello from the garden!');

  return (
    <>
      <style>{CHUPCHU_CSS}</style>

      <div
        dir={dir}
        style={{
          display:           'flex',
          gap:               '14px',
          alignItems:        'flex-start',
          padding:           '18px 18px 18px 18px',
          paddingRight:      '16px',
          marginBottom:      '12px',
          background:        'linear-gradient(145deg, rgba(28,58,30,0.8) 0%, rgba(20,43,22,0.9) 100%)',
          borderRadius:      '14px',
          border:            '1px solid rgba(245,200,64,0.1)',
          borderRight:       `3px solid ${GOLD}`,
          backdropFilter:    'blur(8px)',
        }}
      >
        {/* ChupChu avatar */}
        <div
          className="chupchu-avatar"
          aria-hidden="true"
          style={{
            flexShrink:      0,
            width:           '44px',
            height:          '44px',
            borderRadius:    '50%',
            background:      `radial-gradient(circle at 40% 40%, #F5D060, ${GOLD}, #C8960A)`,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        '22px',
            lineHeight:      1,
          }}
        >
          🌕
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <p style={{
            fontFamily:   ASSIST,
            fontSize:     '11px',
            fontWeight:   700,
            letterSpacing:'0.1em',
            textTransform:'uppercase',
            color:        GOLD,
            margin:       '0 0 6px',
          }}>
            {isHe ? 'צ\'ופצ\'ו אומר:' : 'Chupchu says:'}
          </p>
          <p style={{
            fontFamily:  PLAYFAIR,
            fontStyle:   'italic',
            fontSize:    '14px',
            lineHeight:  1.7,
            color:       `${PARCH}CC`,
            margin:      0,
          }}>
            {summary}
          </p>
        </div>
      </div>
    </>
  );
}
