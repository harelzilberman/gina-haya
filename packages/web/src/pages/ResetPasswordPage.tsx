import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, initialAuthParams } from '../lib/supabase';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';
import { MIN_PASSWORD_LENGTH, mapAuthError } from '../utils/authErrors';

type PageState = 'checking' | 'confirm' | 'set-password' | 'invalid' | 'request' | 'done';

// Coerce null to an empty-params object so the rest of the file stays uniform.
const ap = initialAuthParams ?? {
  access_token: null, refresh_token: null, token_hash: null,
  type: null, code: null, error: null, error_code: null, error_description: null,
};

export function ResetPasswordPage() {
  // ── 1. Remove tokens from the address bar (DOM side-effect → useEffect) ───
  useEffect(() => {
    if (initialAuthParams) {
      history.replaceState(null, '', window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Resolve initial page state from the module-load snapshot ───────────
  // initialAuthParams was captured in supabase.ts before createClient ran,
  // so it is immune to the singleton's detectSessionInUrl processing.
  const [pageState, setPageState] = useState<PageState>(() => {
    if (ap.error || ap.error_code) {
      console.error('[reset-password] error param', ap.error_code, ap.error_description);
      return 'invalid';
    }
    if (ap.token_hash && ap.type === 'recovery') return 'confirm';
    if (
      (ap.access_token && ap.refresh_token && ap.type === 'recovery') ||
      ap.code
    ) return 'checking';
    return 'request';
  });

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErr, setPasswordErr]         = useState<string | null>(null);
  const [confirmErr, setConfirmErr]           = useState<string | null>(null);
  const [serverError, setServerError]         = useState<string | null>(null);
  const [isLoading, setIsLoading]             = useState(false);

  // ── 3. Exchange implicit token (access_token) or PKCE code ────────────────
  useEffect(() => {
    if (pageState !== 'checking') return;
    let cancelled = false;

    (async () => {
      try {
        let error: { message: string } | null = null;

        if (ap.code) {
          ({ error } = await supabase.auth.exchangeCodeForSession(ap.code));
        } else if (ap.access_token && ap.refresh_token) {
          ({ error } = await supabase.auth.setSession({
            access_token:  ap.access_token,
            refresh_token: ap.refresh_token,
          }));
        }

        if (cancelled) return;
        if (error) {
          console.error('[reset-password] token exchange failed', error.message);
          setPageState('invalid');
        } else {
          setPageState('set-password');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[reset-password] token exchange threw', err);
          setPageState('invalid');
        }
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Belt-and-braces: PASSWORD_RECOVERY event ───────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState(prev =>
          prev === 'checking' || prev === 'confirm' || prev === 'request' ? 'set-password' : prev
        );
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 5. confirm → verifyOtp (on tap — never on load to protect against scanners) ──
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: ap.token_hash!,
        type: 'recovery',
      });
      if (error) {
        console.error('[reset-password] verifyOtp failed', error.message);
        setPageState('invalid');
      } else {
        setPageState('set-password');
      }
    } catch (err: any) {
      console.error('[reset-password] verifyOtp threw', err);
      setPageState('invalid');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 6. set-password → done ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate both fields and show all errors at once
    let hasError = false;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordErr(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
      hasError = true;
    } else {
      setPasswordErr(null);
    }
    if (newPassword !== confirmPassword) {
      setConfirmErr('הסיסמאות אינן תואמות');
      hasError = true;
    } else {
      setConfirmErr(null);
    }
    if (hasError) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPageState('done');
    } catch (err: any) {
      console.error('[reset-password] updateUser failed', err);
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

          {/* checking — exchanging token/code */}
          {pageState === 'checking' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl animate-pulse">🔗</div>
              <p className="text-navy font-medium">מאמת את הקישור…</p>
            </div>
          )}

          {/* confirm — token_hash flow: verify only on user tap */}
          {pageState === 'confirm' && (
            <div dir="rtl" className="text-center space-y-6 py-4">
              <div className="text-3xl">🔑</div>
              <p className="text-navy font-medium">קישור האיפוס אומת.</p>
              <p className="text-sm text-gray-500">לחצו להמשיך לאיפוס הסיסמה.</p>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full rounded-full bg-sage py-2.5 text-sm font-medium text-white transition hover:bg-sage/90 disabled:opacity-60"
              >
                {isLoading ? '…' : 'המשך לאיפוס סיסמה'}
              </button>
            </div>
          )}

          {/* set-password */}
          {pageState === 'set-password' && (
            <div dir="rtl">
              <h2 className="text-lg font-semibold text-navy mb-6 text-center">הגדרת סיסמה חדשה</h2>

              {serverError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">סיסמה חדשה</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => {
                      const v = e.target.value;
                      setNewPassword(v);
                      if (passwordErr && v.length >= MIN_PASSWORD_LENGTH) setPasswordErr(null);
                      // keep confirm error in sync as the user corrects the password field
                      if (confirmErr && v === confirmPassword) setConfirmErr(null);
                    }}
                    className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-1 ${
                      passwordErr
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                        : 'border-sage/30 focus:border-sage focus:ring-sage'
                    }`}
                  />
                  {passwordErr ? (
                    <p className="mt-1 text-xs text-red-600">{passwordErr}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">לפחות {MIN_PASSWORD_LENGTH} תווים</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">אימות סיסמה</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => {
                      const v = e.target.value;
                      setConfirmPassword(v);
                      if (confirmErr && v === newPassword) setConfirmErr(null);
                    }}
                    onBlur={() => {
                      if (confirmPassword && confirmPassword !== newPassword) {
                        setConfirmErr('הסיסמאות אינן תואמות');
                      }
                    }}
                    className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-1 ${
                      confirmErr
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                        : 'border-sage/30 focus:border-sage focus:ring-sage'
                    }`}
                  />
                  {confirmErr && (
                    <p className="mt-1 text-xs text-red-600">{confirmErr}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-sage py-2.5 text-sm font-medium text-white transition hover:bg-sage/90 disabled:opacity-60"
                >
                  {isLoading ? '…' : 'שמירת סיסמה חדשה'}
                </button>
              </form>
            </div>
          )}

          {/* invalid */}
          {pageState === 'invalid' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl">⚠️</div>
              <p className="text-navy font-medium">הקישור לאיפוס הסיסמה אינו תקין או שפג תוקפו.</p>
              <button
                onClick={() => setPageState('request')}
                className="mt-2 text-sm text-sage hover:underline"
              >
                שלחו לי קישור חדש
              </button>
            </div>
          )}

          {/* request — send-link form */}
          {pageState === 'request' && (
            <>
              <h2 className="text-lg font-semibold text-navy mb-6 text-center">איפוס סיסמה</h2>
              <PasswordResetForm />
            </>
          )}

          {/* done */}
          {pageState === 'done' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl">✅</div>
              <p className="text-navy font-medium">הסיסמה עודכנה בהצלחה!</p>
              <p className="text-sm text-gray-500">
                ניתן להתחבר עכשיו עם הסיסמה החדשה, גם באפליקציה.
              </p>
              <Link
                to="/login"
                className="block w-full rounded-full bg-sage py-2.5 text-sm font-medium text-white text-center transition hover:bg-sage/90"
              >
                התחברות
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
