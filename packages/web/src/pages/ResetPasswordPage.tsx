import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';
import { MIN_PASSWORD_LENGTH, mapAuthError } from '../utils/authErrors';

type Stage = 'email-form' | 'verifying' | 'set-password' | 'invalid' | 'success';

export function ResetPasswordPage() {
  const navigate = useNavigate();

  // Detect recovery link: PKCE sends ?code=, implicit sends #type=recovery
  const isRecoveryLink =
    new URLSearchParams(window.location.search).has('code') ||
    window.location.hash.includes('type=recovery');

  const [stage, setStage] = useState<Stage>(isRecoveryLink ? 'verifying' : 'email-form');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isRecoveryLink) return;

    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (settled) return;
      if (event === 'PASSWORD_RECOVERY') {
        settled = true;
        setStage('set-password');
      }
    });

    // If no PASSWORD_RECOVERY fires within 15 s, the link is invalid/expired
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setStage(s => s === 'verifying' ? 'invalid' : s);
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setServerError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('הסיסמאות אינן תואמות');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStage('success');
    } catch (err: any) {
      setServerError(mapAuthError(err, 'he'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/10 mb-3">
            <span className="text-3xl">🌱</span>
          </div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">גינה חיה</h1>
          <p className="text-sm text-sage mt-1">Gina Haya</p>
        </div>

        <div className="bg-white rounded-2xl border border-sage/25 shadow-sm px-6 py-8">

          {/* State: email-form — request a reset link */}
          {stage === 'email-form' && (
            <>
              <h2 className="text-lg font-semibold text-navy mb-6 text-center">איפוס סיסמה</h2>
              <PasswordResetForm />
            </>
          )}

          {/* State: verifying — consumed the code, waiting for PASSWORD_RECOVERY */}
          {stage === 'verifying' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl animate-pulse">🔗</div>
              <p className="text-navy font-medium">מאמת את הקישור…</p>
            </div>
          )}

          {/* State: set-password — PASSWORD_RECOVERY fired, show new-password form */}
          {stage === 'set-password' && (
            <div dir="rtl">
              <h2 className="text-lg font-semibold text-navy mb-6 text-center">הגדרת סיסמה חדשה</h2>

              {(validationError || serverError) && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {validationError || serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">סיסמה חדשה</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-sage/30 bg-white px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                  />
                  <p className="mt-1 text-xs text-gray-400">לפחות 8 תווים</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">אימות סיסמה</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-sage/30 bg-white px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-sage py-2.5 text-sm font-medium text-white transition hover:bg-sage/90 disabled:opacity-60"
                >
                  {isLoading ? '...' : 'שמירת סיסמה חדשה'}
                </button>
              </form>
            </div>
          )}

          {/* State: invalid — link expired or bad token */}
          {stage === 'invalid' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl">⚠️</div>
              <p className="text-navy font-medium">הקישור לא תקין או שפג תוקפו</p>
              <button
                onClick={() => setStage('email-form')}
                className="text-sm text-sage hover:underline"
              >
                לבקשת קישור חדש
              </button>
            </div>
          )}

          {/* State: success — password updated */}
          {stage === 'success' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl">✅</div>
              <p className="text-navy font-medium">הסיסמה עודכנה</p>
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-full bg-sage py-2.5 text-sm font-medium text-white transition hover:bg-sage/90"
              >
                המשך לדף הבית
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
