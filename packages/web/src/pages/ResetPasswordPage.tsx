import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';
import { MIN_PASSWORD_LENGTH, mapAuthError } from '../utils/authErrors';

// ── Dedicated client with detectSessionInUrl: false ──────────────────────────
// The shared singleton (detectSessionInUrl: true) processes and clears the URL
// hash asynchronously via _initialize(). A separate client here ensures nothing
// consumes the URL before we read it, and we do all auth ops through this one.
const pageSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } },
);

type PageState = 'checking' | 'confirm' | 'set-password' | 'invalid' | 'request' | 'done';

interface AuthParams {
  access_token: string | null;
  refresh_token: string | null;
  token_hash: string | null;
  type: string | null;
  code: string | null;
  error: string | null;
  error_code: string | null;
  error_description: string | null;
}

// Capture auth params synchronously before any async Supabase processing
// can clear the URL, then immediately remove tokens from the address bar.
function captureAndCleanUrl(): AuthParams {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const get = (k: string): string | null => search.get(k) ?? hash.get(k);

  const params: AuthParams = {
    access_token:      get('access_token'),
    refresh_token:     get('refresh_token'),
    token_hash:        get('token_hash'),
    type:              get('type'),
    code:              get('code'),
    error:             get('error'),
    error_code:        get('error_code'),
    error_description: get('error_description'),
  };

  if (Object.values(params).some(Boolean)) {
    history.replaceState(null, '', window.location.pathname);
  }

  return params;
}

export function ResetPasswordPage() {
  // ── 1. Capture URL params on first render (synchronous) ────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [authParams] = useState<AuthParams>(captureAndCleanUrl);

  // ── 2. Derive initial page state from captured params ─────────────────────
  const [pageState, setPageState] = useState<PageState>(() => {
    if (authParams.error || authParams.error_code) {
      console.error('[reset-password] error param', authParams.error_code, authParams.error_description);
      return 'invalid';
    }
    if (authParams.token_hash && authParams.type === 'recovery') return 'confirm';
    if (
      (authParams.access_token && authParams.refresh_token && authParams.type === 'recovery') ||
      authParams.code
    ) return 'checking';
    return 'request';
  });

  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError]         = useState<string | null>(null);
  const [isLoading, setIsLoading]             = useState(false);

  // ── 3. Exchange implicit token or PKCE code ────────────────────────────────
  useEffect(() => {
    if (pageState !== 'checking') return;
    let cancelled = false;

    (async () => {
      try {
        let error: { message: string } | null = null;

        if (authParams.code) {
          ({ error } = await pageSupabase.auth.exchangeCodeForSession(authParams.code));
        } else if (authParams.access_token && authParams.refresh_token) {
          ({ error } = await pageSupabase.auth.setSession({
            access_token:  authParams.access_token,
            refresh_token: authParams.refresh_token,
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

  // ── 4. Belt-and-braces: PASSWORD_RECOVERY listener ────────────────────────
  useEffect(() => {
    const { data: { subscription } } = pageSupabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState(prev =>
          prev === 'checking' || prev === 'confirm' || prev === 'request' ? 'set-password' : prev
        );
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 5. confirm → verifyOtp (on button tap — not on load) ──────────────────
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const { error } = await pageSupabase.auth.verifyOtp({
        token_hash: authParams.token_hash!,
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
      const { error } = await pageSupabase.auth.updateUser({ password: newPassword });
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

          {/* checking — exchanging token */}
          {pageState === 'checking' && (
            <div dir="rtl" className="text-center space-y-4 py-4">
              <div className="text-3xl animate-pulse">🔗</div>
              <p className="text-navy font-medium">מאמת את הקישור…</p>
            </div>
          )}

          {/* confirm — token_hash: show button to avoid burning token on scan */}
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

          {/* request — send-link form (no auth params present, or navigated from invalid) */}
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
