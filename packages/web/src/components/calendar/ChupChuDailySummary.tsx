import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import type { BiodynamicDay } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const CHUPCHU_CSS = `
@keyframes chupchu-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(0,229,195,0.2), 0 0 4px rgba(0,229,195,0.1); }
  50%       { box-shadow: 0 0 22px rgba(0,229,195,0.4), 0 0 8px rgba(0,229,195,0.2); }
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
          display:        'flex',
          gap:            '14px',
          alignItems:     'flex-start',
          padding:        '18px 18px 18px 18px',
          paddingRight:   '16px',
          marginBottom:   '12px',
          background:     NIGHT_CARD,
          borderRadius:   '14px',
          border:         '1px solid rgba(0,229,195,0.12)',
          borderRight:    `3px solid ${BIO_CYAN}`,
          backdropFilter: 'blur(8px)',
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
            background:      'radial-gradient(circle at 40% 40%, rgba(0,229,195,0.45), rgba(0,180,150,0.2))',
            border:          '1px solid rgba(0,229,195,0.3)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        '22px',
            lineHeight:      1,
          }}
        >
          🌱
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <p style={{
            fontFamily:    DM_SANS,
            fontSize:      '11px',
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         BIO_CYAN,
            margin:        '0 0 6px',
          }}>
            {isHe ? 'צ\'ופצ\'ו אומר:' : 'Chupchu says:'}
          </p>
          <p style={{
            fontFamily: FRANK,
            fontStyle:  'italic',
            fontSize:   '14px',
            lineHeight: 1.7,
            color:      `${TEXT_MID}CC`,
            margin:     0,
          }}>
            {summary}
          </p>
        </div>
      </div>
    </>
  );
}
