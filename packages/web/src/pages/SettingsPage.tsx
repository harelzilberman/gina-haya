import { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const { profile, session } = useAuthStore();
  const { show: showToast } = useToastStore();

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
      // Reload profile to sync store
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
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EC' }}>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#1B2A4A' }}>
          ⚙️ הגדרות
        </h1>

        <div
          className="bg-white rounded-2xl shadow-sm p-6"
          style={{ border: '1px solid rgba(74,124,89,0.2)' }}
        >
          <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2A4A' }}>
            העדפות מייל
          </h2>

          {/* Daily tip toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm font-medium" style={{ color: '#1B2A4A' }}>
                קבל טיפ יומי מהגינה במייל
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#888888' }}>
                מוש ישלח לך כל בוקר את נתוני היום הביודינמי
              </div>
            </div>
            <button
              role="switch"
              aria-checked={dailyTipEmail}
              onClick={() => setDailyTipEmail(v => !v)}
              className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              style={{
                backgroundColor: dailyTipEmail ? '#4A7C59' : '#D1D5DB',
              }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                style={{
                  transform: dailyTipEmail ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* Language selector */}
          <div className="mb-8">
            <div className="text-sm font-medium mb-3" style={{ color: '#1B2A4A' }}>
              שפת המייל
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value="he"
                  checked={language === 'he'}
                  onChange={() => setLanguage('he')}
                  className="accent-green-700"
                  style={{ accentColor: '#4A7C59' }}
                />
                <span className="text-sm" style={{ color: '#333333' }}>עברית</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={language === 'en'}
                  onChange={() => setLanguage('en')}
                  style={{ accentColor: '#4A7C59' }}
                />
                <span className="text-sm" style={{ color: '#333333' }}>English</span>
              </label>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-opacity"
            style={{
              backgroundColor: '#4A7C59',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </div>
  );
}
