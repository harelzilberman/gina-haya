import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { useToday, useWeek } from '../hooks/useCalendar';
import { NodeBlackoutBanner }  from '../components/calendar/NodeBlackoutBanner';
import { MooshDailySummary }   from '../components/calendar/MooshDailySummary';
import { TodayCard }           from '../components/calendar/TodayCardV2';
import { WeekStrip }           from '../components/calendar/WeekStrip';
import { useMooshPanelStore }  from '../stores/mooshPanelStore';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const CAL_CSS = `
.cal-quickask::placeholder { color: rgba(237,224,196,0.3); }
.cal-quickask:focus { outline: none; }
@keyframes cal-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
@keyframes cal-fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cal-skeleton {
  background: linear-gradient(
    90deg,
    rgba(28,58,30,0.5) 25%,
    rgba(48,90,52,0.6) 50%,
    rgba(28,58,30,0.5) 75%
  );
  background-size: 800px 100%;
  animation: cal-shimmer 1.5s ease-in-out infinite;
  border-radius: 12px;
}
.cal-card-in {
  animation: cal-fade-in 0.4s ease-out both;
}
`;

// Loading skeleton
function CalendarSkeleton() {
  return (
    <div style={{ backgroundColor: EARTH, backgroundImage: NOISE_BG, minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="cal-skeleton" style={{ height: '24px', width: '160px', marginBottom: '24px' }} />
        <div className="cal-skeleton" style={{ height: '260px', marginBottom: '16px' }} />
        <div className="cal-skeleton" style={{ height: '80px',  marginBottom: '16px' }} />
        <div className="cal-skeleton" style={{ height: '100px' }} />
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { t, i18n } = useTranslation('calendar');
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';
  const { open: openMoosh } = useMooshPanelStore();
  const [quickAsk, setQuickAsk] = useState('');

  const handleQuickAsk = () => {
    const text = quickAsk.trim();
    if (!text) return;
    setQuickAsk('');
    openMoosh(text);
  };
  const { day, isLoading: dayLoading, error: dayError } = useToday();
  const { days, isLoading: weekLoading } = useWeek();

  if (dayLoading) {
    return (
      <>
        <style>{CAL_CSS}</style>
        <CalendarSkeleton />
      </>
    );
  }

  if (dayError || !day) {
    return (
      <>
        <style>{CAL_CSS}</style>
        <div
          style={{ backgroundColor: EARTH, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <p style={{ fontFamily: ASSIST, fontSize: '16px', color: 'rgba(237,224,196,0.7)' }}>
            {dayError || (isHe ? 'אין נתונים זמינים להיום' : 'No data available for today')}
          </p>
        </div>
      </>
    );
  }

  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const formattedDate = new Date().toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <>
      <style>{CAL_CSS}</style>

      {/* Noise overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          pointerEvents: 'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat: 'repeat',
          opacity: 0.35,
        }}
      />

      <div style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        {/* Node blackout banner — full width, outside container */}
        {day.nodeActive && <NodeBlackoutBanner day={day} />}

        <div dir={dir} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>

          {/* Page header */}
          <div className="cal-card-in" style={{ textAlign: dir === 'rtl' ? 'right' : 'left', marginBottom: '20px' }}>
            <p style={{
              fontFamily: ASSIST, fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.14em', textTransform: 'uppercase' as const,
              color: `${PARCH}66`, marginBottom: '6px',
            }}>
              {formattedDate}
            </p>
            <h1 style={{
              fontFamily: FRANK, fontWeight: 700, fontSize: '2rem',
              color: GOLD, margin: 0, lineHeight: 1.1,
            }}>
              {t('title')}
            </h1>
          </div>

          {/* Moosh daily summary */}
          <div className="cal-card-in" style={{ animationDelay: '100ms' }}>
            <MooshDailySummary day={day} />
          </div>

          {/* Today hero card */}
          <div className="cal-card-in" style={{ animationDelay: '200ms' }}>
            <TodayCard day={day} />
          </div>

          {/* Week strip */}
          {!weekLoading && days.length > 0 && (
            <div className="cal-card-in" style={{ animationDelay: '300ms' }}>
              <WeekStrip days={days} todayDate={todayISO} />
            </div>
          )}

          {/* Moosh quick-ask */}
          <div className="cal-card-in" style={{ animationDelay: '400ms', marginTop: '20px' }}>
            <div style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '10px',
              backgroundColor: 'rgba(28,58,30,0.5)',
              border:          '1px solid rgba(245,200,64,0.15)',
              borderRadius:    '12px',
              padding:         '10px 14px',
            }}>
              <div style={{
                flexShrink:     0,
                width:          '32px',
                height:         '32px',
                borderRadius:   '50%',
                background:     'radial-gradient(circle at 40% 40%, #F5D060, #F5C840, #C8960A)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '16px',
                lineHeight:     1,
              }}>🌕</div>
              <input
                type="text"
                className="cal-quickask"
                value={quickAsk}
                onChange={e => setQuickAsk(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAsk()}
                placeholder={isHe ? 'שאל את מוש על הגינה...' : 'Ask Moosh about the garden...'}
                style={{
                  flex:       '1 1 auto',
                  border:     'none',
                  background: 'transparent',
                  fontFamily: ASSIST,
                  fontSize:   '14px',
                  color:      PARCH,
                  direction:  dir,
                  textAlign:  dir === 'rtl' ? 'right' : 'left',
                }}
              />
              <button
                onClick={handleQuickAsk}
                disabled={!quickAsk.trim()}
                style={{
                  flexShrink:      0,
                  width:           '34px',
                  height:          '34px',
                  borderRadius:    '8px',
                  border:          'none',
                  backgroundColor: GOLD,
                  color:           EARTH,
                  fontFamily:      FRANK,
                  fontWeight:      700,
                  fontSize:        '16px',
                  cursor:          quickAsk.trim() ? 'pointer' : 'default',
                  opacity:         quickAsk.trim() ? 1 : 0.4,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  transition:      'opacity 0.2s',
                }}
              >→</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
