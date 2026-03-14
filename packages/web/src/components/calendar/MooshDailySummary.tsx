import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

const MOON_GOLD = '#B7924A';

const DEFAULT_SUMMARIES: Record<string, string> = {
  fruit:  'יום פרי — זמן טוב לעסוק בפירות ובגידולים הנושאים פרי.',
  root:   'יום שורש — הגינה מזמינה אתכם לטפל בשורשים ובפקעות.',
  flower: 'יום פרח — אנרגיה מיוחדת לצמחי נוי ולתבלינים.',
  leaf:   'יום עלה — עסקו בגידולי עלים ובצמחיית ירוק.',
};

export function MooshDailySummary({ day }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const summary = day.mooshDailySummary || DEFAULT_SUMMARIES[day.dayType] || 'שלום מהגינה!';

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex gap-4 items-start"
      style={{
        borderRight: isRTL ? `4px solid ${MOON_GOLD}` : undefined,
        borderLeft:  !isRTL ? `4px solid ${MOON_GOLD}` : undefined,
      }}
    >
      {/* Moosh avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{ backgroundColor: MOON_GOLD }}
        aria-hidden="true"
      >
        🌕
      </div>

      {/* Text */}
      <div>
        <p className="text-xs font-bold mb-1" style={{ color: MOON_GOLD }}>
          מוש אומר:
        </p>
        <p className="text-sm italic leading-relaxed" style={{ color: '#374151' }}>
          {summary}
        </p>
      </div>
    </div>
  );
}
