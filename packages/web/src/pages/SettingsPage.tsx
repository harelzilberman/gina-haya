import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { supabase } from '../lib/supabase';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usePlanLimit, TIER_DISPLAY } from '../hooks/usePlanLimit';
import { useCredits } from '../hooks/useCredits';

const EARTH  = '#050d0a';
const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

interface UsageData {
  tier: string;
  analyses: { used: number; limit: number | null; resetsAt: string };
  trackers: { active: number; limit: number | null };
  plants: { count: number; limit: number | null };
  chupchu: { used: number; limit: number | null; resetsAt: string };
  gardens: { count: number; limit: number | null };
}

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  const GOLD = '#00e5c3';
  const pct = limit !== null ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = limit !== null && pct >= 80;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1, height: '6px', borderRadius: '3px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        {limit !== null && (
          <div style={{
            height: '100%', width: `${pct}%`,
            backgroundColor: isNearLimit ? '#E87040' : GOLD,
            borderRadius: '3px',
            transition: 'width 0.4s ease',
          }} />
        )}
      </div>
      <span style={{
        fontFamily: '"Assistant","Heebo",sans-serif',
        fontSize: '12px',
        color: limit !== null ? (isNearLimit ? '#E87040' : 'rgba(176,207,191,0.6)') : 'rgba(176,207,191,0.4)',
        whiteSpace: 'nowrap',
        minWidth: '48px',
        textAlign: 'start',
      }}>
        {limit !== null ? `${used}/${limit}` : `${used} / ∞`}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const isHe = i18n.language === 'he';
  const navigate = useNavigate();
  const { profile, session } = useAuthStore();
  const { show: showToast }  = useToastStore();
  const { isSubscribed, permission, subscribe, unsubscribe, isLoading: pushLoading } = usePushNotifications();
  const { tier, display: tierDisplay } = usePlanLimit();
  const { credits } = useCredits();

  const [dailyTipEmail, setDailyTipEmail] = useState<boolean>(
    profile?.daily_tip_email ?? true
  );
  const [language, setLanguage] = useState<'he' | 'en'>(
    profile?.language_preference ?? 'he'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    api.get<UsageData>('/api/users/usage', session.access_token)
      .then(data => setUsage(data))
      .catch(() => {/* silently fail */});
  }, [session?.access_token]);

  async function handleSave() {
    if (!session?.access_token) return;
    setIsSaving(true);
    try {
      await api.patch(
        '/api/email/preferences',
        { dailyTipEmail, language },
        session.access_token
      );
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        useAuthStore.getState().loadProfile();
      }
      showToast(t('saveSuccess'), 'success');
    } catch (err: any) {
      showToast(err.message || t('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {/* Noise */}
      <div
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          9998,
          pointerEvents:   'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat:'repeat',
          opacity:         0.28,
        }}
      />

      <div dir={isHe ? 'rtl' : 'ltr'} style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* Page title */}
          <h1 style={{
            fontFamily:  FRANK,
            fontWeight:  700,
            fontSize:    '2rem',
            color:       GOLD,
            margin:      '0 0 24px',
            lineHeight:  1.1,
          }}>
            {t('title')}
          </h1>

          {/* Settings card */}
          <div style={{
            background:    'rgba(9,20,16,0.7)',
            border:        '1px solid rgba(0,229,195,0.15)',
            borderRadius:  '16px',
            padding:       '28px 24px',
            backdropFilter:'blur(8px)',
          }}>

            {/* Section label */}
            <h2 style={{
              fontFamily:  FRANK,
              fontWeight:  600,
              fontSize:    '16px',
              color:       PARCH,
              margin:      '0 0 24px',
            }}>
              {t('emailPrefs.sectionTitle')}
            </h2>

            {/* Daily tip toggle */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              gap:            '16px',
              marginBottom:   '28px',
            }}>
              <div>
                <div style={{ fontFamily: ASSIST, fontSize: '14px', fontWeight: 500, color: PARCH, marginBottom: '4px' }}>
                  {t('emailPrefs.dailyTipLabel')}
                </div>
                <div style={{ fontFamily: ASSIST, fontSize: '12px', fontWeight: 300, color: `${PARCH}55` }}>
                  {t('emailPrefs.dailyTipDesc')}
                </div>
              </div>

              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={dailyTipEmail}
                onClick={() => setDailyTipEmail(v => !v)}
                style={{
                  flexShrink:      0,
                  position:        'relative',
                  width:           '46px',
                  height:          '26px',
                  borderRadius:    '50px',
                  border:          'none',
                  backgroundColor: dailyTipEmail ? 'rgba(0,229,195,0.3)' : 'rgba(0,229,195,0.2)',
                  cursor:          'pointer',
                  transition:      'background-color 0.2s',
                  padding:         0,
                }}
              >
                <span style={{
                  position:        'absolute',
                  top:             '3px',
                  left:            dailyTipEmail ? '23px' : '3px',
                  width:           '20px',
                  height:          '20px',
                  borderRadius:    '50%',
                  backgroundColor: dailyTipEmail ? GOLD : `${PARCH}80`,
                  transition:      'left 0.2s, background-color 0.2s',
                  boxShadow:       dailyTipEmail ? `0 0 6px rgba(0,229,195,0.5)` : 'none',
                }} />
              </button>
            </div>

            {/* Language selector — pill style */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: ASSIST, fontSize: '14px', fontWeight: 500, color: PARCH, marginBottom: '12px' }}>
                {t('emailPrefs.languageLabel')}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['he', 'en'] as const).map(lang => {
                  const active = language === lang;
                  return (
                    <label
                      key={lang}
                      style={{
                        display:         'flex',
                        alignItems:      'center',
                        justifyContent:  'center',
                        padding:         '7px 22px',
                        borderRadius:    '50px',
                        border:          active ? 'none' : '1px solid rgba(0,229,195,0.3)',
                        backgroundColor: active ? GOLD : 'transparent',
                        color:           active ? EARTH : `${PARCH}88`,
                        fontFamily:      FRANK,
                        fontWeight:      600,
                        fontSize:        '13px',
                        cursor:          'pointer',
                        transition:      'background-color 0.15s, color 0.15s',
                        userSelect:      'none',
                      }}
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.6)';
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.3)';
                      }}
                    >
                      <input
                        type="radio"
                        name="language"
                        value={lang}
                        checked={language === lang}
                        onChange={() => setLanguage(lang)}
                        style={{ display: 'none' }}
                      />
                      {lang === 'he' ? 'עברית' : 'English'}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                width:           '100%',
                padding:         '13px',
                borderRadius:    '8px',
                border:          'none',
                backgroundColor: GOLD,
                fontFamily:      FRANK,
                fontWeight:      600,
                fontSize:        '15px',
                color:           EARTH,
                cursor:          isSaving ? 'default' : 'pointer',
                opacity:         isSaving ? 0.7 : 1,
                transition:      'filter 0.2s',
              }}
              onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {isSaving ? t('savingButton') : t('saveButton')}
            </button>

          </div>

          {/* My Plan section */}
          <div style={{
            background: 'rgba(9,20,16,0.5)',
            border: '1px solid rgba(0,229,195,0.15)',
            borderRadius: '12px', padding: '20px', marginTop: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: 0 }}>
                {isHe ? 'התכנית שלי' : 'My Plan'}
              </h3>
              <span style={{
                fontFamily: ASSIST, fontSize: '11px', fontWeight: 700,
                padding: '3px 10px', borderRadius: '12px',
                backgroundColor: `${tierDisplay.color}22`,
                color: tierDisplay.color,
                border: `1px solid ${tierDisplay.color}44`,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {isHe ? tierDisplay.he : tierDisplay.en}
              </span>
            </div>

            {usage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: isHe ? 'ניתוחי AI החודש' : 'AI analyses this month', used: usage.analyses.used, limit: usage.analyses.limit },
                  { label: isHe ? 'מעקבי גידול' : 'Growth trackers', used: usage.trackers.active, limit: usage.trackers.limit },
                  { label: isHe ? 'גינות' : 'Gardens', used: usage.gardens.count, limit: usage.gardens.limit },
                  { label: isHe ? 'שיחות צ\'ופצ\'ו' : 'Chupchu messages', used: usage.chupchu.used, limit: usage.chupchu.limit },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}BB` }}>
                        {row.label}
                      </span>
                    </div>
                    <UsageBar used={row.used} limit={row.limit} />
                  </div>
                ))}
              </div>
            )}

            {/* Purchased credits */}
            {(credits.analysis.available > 0 || credits.tracker.available > 0 || credits.garden.available > 0) && (
              <div style={{
                backgroundColor: 'rgba(0,229,195,0.06)',
                border: '1px solid rgba(0,229,195,0.2)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}>
                <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}70`, margin: '0 0 8px' }}>
                  {isHe ? 'קרדיטים שרכשת:' : 'Purchased credits:'}
                </p>
                {credits.analysis.available > 0 && (
                  <div style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD, margin: '0 0 4px' }}>
                    🔬 {isHe ? 'ניתוחים' : 'Analyses'}: {credits.analysis.available} {isHe ? 'זמינים' : 'available'}
                  </div>
                )}
                {credits.tracker.available > 0 && (
                  <div style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD, margin: '0 0 4px' }}>
                    🌱 {isHe ? 'מעקבים' : 'Trackers'}: {credits.tracker.available} {isHe ? 'זמינים' : 'available'}
                  </div>
                )}
                {credits.garden.available > 0 && (
                  <div style={{ fontFamily: FRANK, fontSize: '14px', color: GOLD }}>
                    🏡 {isHe ? 'גינות' : 'Gardens'}: {credits.garden.available} {isHe ? 'זמינות' : 'available'}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {tier !== 'professional' && (
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    flex: 1, padding: '10px',
                    backgroundColor: GOLD, color: EARTH,
                    border: 'none', borderRadius: '8px',
                    fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', transition: 'filter 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  {isHe ? 'שדרג תכנית' : 'Upgrade plan'}
                </button>
              )}
              <button
                onClick={() => navigate('/shop')}
                style={{
                  flex: 1, padding: '10px',
                  backgroundColor: 'transparent',
                  color: GOLD, border: `1px solid rgba(0,229,195,0.35)`,
                  borderRadius: '8px', fontFamily: FRANK, fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.35)'; }}
              >
                {isHe ? 'לחנות' : 'Shop'}
              </button>
            </div>
          </div>

          {/* Notifications section */}
          <div style={{ background: 'rgba(9,20,16,0.5)', border: '1px solid rgba(0,229,195,0.12)', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
            <h3 style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, margin: '0 0 16px' }}>{t('notifications.title')}</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: ASSIST, fontSize: '14px', color: PARCH, margin: '0 0 2px' }}>{t('notifications.pushLabel')}</p>
                <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}60`, margin: 0 }}>
                  {permission === 'denied'
                    ? t('notifications.blocked')
                    : isSubscribed
                      ? t('notifications.active')
                      : t('notifications.inactive')}
                </p>
              </div>
              {permission !== 'denied' && (
                <button
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                  style={{
                    fontFamily: ASSIST, fontSize: '13px', fontWeight: 600,
                    padding: '7px 16px', borderRadius: '8px',
                    border: isSubscribed ? '1px solid rgba(255,100,100,0.3)' : `1px solid ${GOLD}55`,
                    color: isSubscribed ? '#ff9090' : GOLD,
                    background: isSubscribed ? 'rgba(255,100,100,0.08)' : 'rgba(0,229,195,0.08)',
                    cursor: pushLoading ? 'default' : 'pointer',
                    opacity: pushLoading ? 0.7 : 1,
                  }}
                >
                  {pushLoading ? '...' : isSubscribed ? t('notifications.disable') : t('notifications.enable')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
