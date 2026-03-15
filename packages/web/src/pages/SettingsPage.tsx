import { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { supabase } from '../lib/supabase';

const EARTH  = '#142B16';
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

export function SettingsPage() {
  const { profile, session } = useAuthStore();
  const { show: showToast }  = useToastStore();

  const [dailyTipEmail, setDailyTipEmail] = useState<boolean>(
    profile?.daily_tip_email ?? true
  );
  const [language, setLanguage] = useState<'he' | 'en'>(
    profile?.language_preference ?? 'he'
  );
  const [isSaving, setIsSaving] = useState(false);

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
      showToast('ההעדפות נשמרו בהצלחה ✓', 'success');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירה', 'error');
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

      <div style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
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
            הגדרות
          </h1>

          {/* Settings card */}
          <div style={{
            background:    'rgba(28,58,30,0.7)',
            border:        '1px solid rgba(125,192,132,0.15)',
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
              העדפות מייל
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
                  קבל טיפ יומי מהגינה במייל
                </div>
                <div style={{ fontFamily: ASSIST, fontSize: '12px', fontWeight: 300, color: `${PARCH}55` }}>
                  מוש ישלח לך כל בוקר את נתוני היום הביודינמי
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
                  backgroundColor: dailyTipEmail ? 'rgba(245,200,64,0.3)' : 'rgba(125,192,132,0.2)',
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
                  boxShadow:       dailyTipEmail ? `0 0 6px rgba(245,200,64,0.5)` : 'none',
                }} />
              </button>
            </div>

            {/* Language selector — pill style */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: ASSIST, fontSize: '14px', fontWeight: 500, color: PARCH, marginBottom: '12px' }}>
                שפת המייל
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
                        border:          active ? 'none' : '1px solid rgba(125,192,132,0.3)',
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
                        if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,192,132,0.6)';
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,192,132,0.3)';
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
              {isSaving ? 'שומר...' : 'שמור הגדרות'}
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
