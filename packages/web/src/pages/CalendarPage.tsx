import { useTranslation } from 'react-i18next';
import { useToday, useWeek } from '../hooks/useCalendar';
import { NodeBlackoutBanner }  from '../components/calendar/NodeBlackoutBanner';
import { MooshDailySummary }   from '../components/calendar/MooshDailySummary';
import { TodayCard }           from '../components/calendar/TodayCard';
import { WeekStrip }           from '../components/calendar/WeekStrip';
import { AdBanner }            from '../components/ui/AdBanner';

export function CalendarPage() {
  const { t } = useTranslation('calendar');
  const { day, isLoading: dayLoading, error: dayError } = useToday();
  const { days, isLoading: weekLoading } = useWeek();

  if (dayLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EC' }}
      >
        <span className="text-4xl animate-pulse">🌕</span>
      </div>
    );
  }

  if (dayError || !day) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EC' }}
      >
        <div className="text-center p-8">
          <p className="text-lg" style={{ color: '#A33030' }}>
            {dayError || 'אין נתונים זמינים להיום'}
          </p>
        </div>
      </div>
    );
  }

  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EC' }}>
      {/* Node blackout banner — full width, outside container */}
      {day.nodeActive && <NodeBlackoutBanner day={day} />}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Page title */}
        <h1 className="text-xl font-bold text-center mb-5" style={{ color: '#1B2A4A' }}>
          {t('title')}
        </h1>

        {/* Moosh daily summary */}
        <MooshDailySummary day={day} />

        {/* Today hero card */}
        <TodayCard day={day} />

        {/* Week strip */}
        {!weekLoading && days.length > 0 && (
          <WeekStrip days={days} todayDate={todayISO} />
        )}

        <AdBanner />
      </div>
    </div>
  );
}
