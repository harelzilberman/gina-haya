import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { useToday, useWeek } from '../hooks/useCalendar';
import { NodeBlackoutBanner }  from '../components/calendar/NodeBlackoutBanner';
import { ChupChuDailySummary }   from '../components/calendar/ChupChuDailySummary';
import { TodayCard }           from '../components/calendar/TodayCardV2';
import { WeekStrip }           from '../components/calendar/WeekStrip';
import { useChupChuPanelStore }  from '../stores/chupChuPanelStore';

const NIGHT   = '#050d0a';
const NIGHT_MID = '#091410';
const NIGHT_CARD = '#111f18';
const BIO_CYAN = '#00e5c3';
const TEXT    = '#e8f5ee';
const TEXT_MID = '#b0cfbf';
const MUTED   = '#6b9080';
const FRANK   = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const CAL_CSS = `
.cal-quickask::placeholder { color: rgba(176,207,191,0.35); }
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
    rgba(9,20,16,0.8) 25%,
    rgba(17,31,24,0.9) 50%,
    rgba(9,20,16,0.8) 75%
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
    <div style={{ backgroundColor: NIGHT, minHeight: '100vh', padding: '16px' }}>
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
  const { open: openChupChu } = useChupChuPanelStore();
  const [quickAsk, setQuickAsk] = useState('');

  const handleQuickAsk = () => {
    const text = quickAsk.trim();
    if (!text) return;
    setQuickAsk('');
    openChupChu(text);
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
          style={{ backgroundColor: NIGHT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <p style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID }}>
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

      <div style={{ backgroundColor: NIGHT, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        {day.nodeActive && <NodeBlackoutBanner day={day} />}

        <div dir={dir} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>

          {/* Page header */}
          <div className="cal-card-in" style={{ textAlign: dir === 'rtl' ? 'right' : 'left', marginBottom: '20px' }}>
            <p style={{
              fontFamily: DM_SANS, fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase' as const,
              color: MUTED, marginBottom: '6px',
            }}>
              {formattedDate}
            </p>
            <h1 style={{
              fontFamily: FRANK, fontWeight: 700, fontSize: '2rem',
              color: BIO_CYAN, margin: 0, lineHeight: 1.1,
            }}>
              {t('title')}
            </h1>
          </div>

          {/* ChupChu daily summary */}
          <div className="cal-card-in" style={{ animationDelay: '100ms' }}>
            <ChupChuDailySummary day={day} />
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

          {/* ChupChu quick-ask */}
          <div className="cal-card-in" style={{ animationDelay: '400ms', marginTop: '20px' }}>
            <div style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '10px',
              backgroundColor: NIGHT_CARD,
              border:          '1px solid rgba(0,229,195,0.15)',
              borderRadius:    '14px',
              padding:         '10px 14px',
            }}>
              <div style={{
                flexShrink:     0,
                width:          '32px',
                height:         '32px',
                borderRadius:   '50%',
                background:     `radial-gradient(circle at 40% 40%, #00e5c3, #00b89e)`,
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
                placeholder={isHe ? "שאל את צ'ופצ'ו על הגינה..." : 'Ask ChupChu about the garden...'}
                style={{
                  flex:       '1 1 auto',
                  border:     'none',
                  background: 'transparent',
                  fontFamily: DM_SANS,
                  fontSize:   '14px',
                  color:      TEXT,
                  direction:  dir,
                  textAlign:  dir === 'rtl' ? 'right' : 'left',
                }}
              />
              <button
                onClick={handleQuickAsk}
                disabled={!quickAsk.trim()}
                style={{
                  flexShrink:      0,
                  width:           '44px',
                  height:          '44px',
                  borderRadius:    '10px',
                  border:          'none',
                  backgroundColor: BIO_CYAN,
                  color:           NIGHT,
                  fontFamily:      FRANK,
                  fontWeight:      700,
                  fontSize:        '16px',
                  cursor:          quickAsk.trim() ? 'pointer' : 'default',
                  opacity:         quickAsk.trim() ? 1 : 0.35,
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
