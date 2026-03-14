import { useTranslation } from 'react-i18next';
import type { BiodynamicDay } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

export function NodeBlackoutBanner({ day }: Props) {
  const { t } = useTranslation('calendar');

  if (!day.nodeActive) return null;

  let endTime: string | null = null;
  if (day.nodeBlackoutEnd) {
    try {
      endTime = new Date(day.nodeBlackoutEnd).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jerusalem',
      });
    } catch {
      endTime = null;
    }
  }

  return (
    <div
      className="w-full py-3 px-4 mb-4"
      style={{ backgroundColor: '#111827', color: '#FFFFFF' }}
      role="alert"
    >
      <p className="font-bold text-center text-sm">
        {t('nodeBlackout.active')}
      </p>
      {endTime && (
        <p className="text-xs text-center mt-1" style={{ color: '#D1D5DB' }}>
          {t('nodeBlackout.endsAt', { time: endTime })}
        </p>
      )}
    </div>
  );
}
