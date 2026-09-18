import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

const NAVY         = '#1B2A4A';
const SAGE         = '#4A9C68';
const CREAM        = '#FDF6EC';
const WARN_BG      = '#fff7ed';
const WARN_BORDER  = '#f97316';

const CONTACT_EMAIL      = 'gina.haya.contact@gmail.com';
const SUBJECT_HE         = 'בקשת מחיקת חשבון — גינה חיה';
const SUBJECT_EN         = 'Account Deletion Request — Gina Haya';
const SUBJECT_PARTIAL_HE = 'בקשת מחיקת נתונים — גינה חיה';
const SUBJECT_PARTIAL_EN = 'Data Deletion Request — Gina Haya';

/** Word the user must type to unlock the button, per language. */
const CONFIRM_WORD_HE = 'מחק';
const CONFIRM_WORD_EN = 'delete';

type Status = 'idle' | 'loading' | 'success' | 'error_401' | 'error_server' | 'error_network';

function mailtoHref(subject: string) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/* ── Signed-in form (both languages share one component) ── */

interface FormProps {
  lang: 'he' | 'en';
  email: string;
  confirmInput: string;
  setConfirmInput: (v: string) => void;
  status: Status;
  requestedAt: string | null;
  onSubmit: () => void;
}

function SignedInForm({ lang, email, confirmInput, setConfirmInput, status, requestedAt, onSubmit }: FormProps) {
  const confirmWord = lang === 'he' ? CONFIRM_WORD_HE : CONFIRM_WORD_EN;
  const inputMatches = confirmInput === confirmWord;
  const isHe = lang === 'he';

  const dateStr = requestedAt
    ? new Date(requestedAt).toLocaleString(isHe ? 'he-IL' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' })
    : null;

  if (status === 'success') {
    return (
      <div style={{ backgroundColor: '#f0fdf4', border: `1px solid ${SAGE}40`, borderRadius: '10px', padding: '20px 24px', marginBottom: '24px' }}>
        <p style={{ color: NAVY, fontWeight: 700, margin: '0 0 8px' }}>
          {isHe ? 'הבקשה התקבלה ✓' : 'Request received ✓'}
        </p>
        <p style={{ color: '#475569', margin: 0, lineHeight: 1.65 }}>
          {isHe
            ? 'בקשת מחיקת החשבון נרשמה ותטופל תוך 30 יום. החשבון ימשיך לפעול כרגיל עד לסיום התהליך.'
            : 'Your deletion request has been recorded and will be processed within 30 days. Your account will continue to work normally until the process is complete.'}
        </p>
        {dateStr && (
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '8px 0 0' }}>
            {isHe ? `נשלחה ב: ${dateStr}` : `Submitted: ${dateStr}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Account display */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
        <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>
          {isHe ? 'מחובר/ת בתור: ' : 'Signed in as: '}
          <strong style={{ color: NAVY }}>{email}</strong>
        </p>
      </div>

      {/* Error states — a failed request must never look like success */}
      {status === 'error_401' && (
        <div style={{ backgroundColor: WARN_BG, border: `1px solid ${WARN_BORDER}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
          <p style={{ color: '#9a3412', margin: 0, fontSize: '14px' }}>
            {isHe ? 'פג תוקף החיבור — יש להתחבר מחדש כדי לשלוח את הבקשה.' : 'Your session has expired — please sign in again to submit the request.'}
          </p>
        </div>
      )}
      {(status === 'error_server' || status === 'error_network') && (
        <div style={{ backgroundColor: WARN_BG, border: `1px solid ${WARN_BORDER}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
          <p style={{ color: '#9a3412', margin: 0, fontSize: '14px' }}>
            {isHe ? 'שגיאה בשליחת הבקשה. הבקשה לא נשלחה — יש לנסות שוב.' : 'The request could not be sent. Please try again.'}
          </p>
        </div>
      )}

      {/* Confirmation word input */}
      <p style={{ color: '#475569', lineHeight: 1.65, marginBottom: '10px', fontSize: '14px' }}>
        {isHe
          ? <>כדי לאשר, הקלד/י <strong style={{ color: '#dc2626' }}>{confirmWord}</strong> בשדה למטה:</>
          : <>To confirm, type <strong style={{ color: '#dc2626' }}>{confirmWord}</strong> below:</>}
      </p>
      <input
        type="text"
        value={confirmInput}
        onChange={e => setConfirmInput(e.target.value)}
        placeholder={confirmWord}
        dir={isHe ? 'rtl' : 'ltr'}
        style={{
          width: '100%', padding: '10px 14px', fontSize: '15px', boxSizing: 'border-box',
          border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none',
          fontFamily: 'inherit', marginBottom: '14px', direction: isHe ? 'rtl' : 'ltr',
        }}
      />
      <button
        onClick={onSubmit}
        disabled={!inputMatches || status === 'loading'}
        style={{
          display: 'inline-block', backgroundColor: '#dc2626', color: '#ffffff',
          border: 'none', fontWeight: 600, fontSize: '15px',
          padding: '12px 24px', borderRadius: '10px', cursor: inputMatches && status !== 'loading' ? 'pointer' : 'not-allowed',
          opacity: inputMatches && status !== 'loading' ? 1 : 0.4, transition: 'opacity 0.15s',
        }}
      >
        {status === 'loading'
          ? (isHe ? 'שולח...' : 'Sending…')
          : (isHe ? 'שלח בקשת מחיקת חשבון' : 'Submit account deletion request')}
      </button>
    </div>
  );
}

/* ── Sign-in prompt for anonymous visitors ── */

function SignInPrompt({ lang }: { lang: 'he' | 'en' }) {
  return (
    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
      <p style={{ color: '#475569', margin: 0, lineHeight: 1.65 }}>
        {lang === 'he' ? (
          <>
            <Link to="/login" style={{ color: SAGE, textDecoration: 'underline' }}>התחבר/י לחשבונך</Link>
            {' '}כדי לשלוח בקשה ישירות מהדף הזה, או שלח/י בקשה בדוא"ל מהכתובת הרשומה בחשבונך.
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: SAGE, textDecoration: 'underline' }}>Sign in to your account</Link>
            {' '}to submit a request directly on this page, or send a request by email from the address registered on your account.
          </>
        )}
      </p>
    </div>
  );
}

/* ── Page ── */

export function DeleteAccountPage() {
  const { session, user } = useAuthStore();
  const [confirmInput, setConfirmInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [requestedAt, setRequestedAt] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = 'מחיקת חשבון — גינה חיה | Account Deletion';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.content ?? '';
    if (meta) meta.content = 'בקשת מחיקת חשבון גינה חיה — הנתונים יוסרו תוך 30 יום. Request Gina Haya account deletion — data removed within 30 days.';
    return () => {
      document.title = prev;
      if (meta) meta.content = prevDesc;
    };
  }, []);

  const email = user?.email ?? null;
  const token = session?.access_token ?? null;
  const isSignedIn = !!token && !!email;

  async function handleSubmit() {
    if (!token) return;
    setStatus('loading');
    try {
      const data = await api.post<{ requested_at: string }>(
        '/api/users/deletion-request', {}, token
      );
      setRequestedAt(data.requested_at ?? null);
      setStatus('success');
    } catch (err: any) {
      // TypeError = network failure (fetch threw before getting a response)
      if (err.name === 'TypeError') {
        setStatus('error_network');
      } else if (
        err.message?.includes('HTTP 401') ||
        err.errorCode === 'unauthorized' ||
        err.errorData?.status === 401
      ) {
        setStatus('error_401');
      } else {
        setStatus('error_server');
      }
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', padding: '40px 44px' }}>

          {/* ── Hebrew section ── */}
          <div dir="rtl">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: NAVY, marginBottom: '24px' }}>
              מחיקת חשבון — גינה חיה
            </h1>

            {/* Warning box */}
            <div style={{ backgroundColor: WARN_BG, border: `1px solid ${WARN_BORDER}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '28px' }}>
              <p style={{ color: '#9a3412', fontWeight: 600, margin: '0 0 6px' }}>
                שים לב: מחיקת החשבון היא בלתי הפיכה
              </p>
              <p style={{ color: '#9a3412', margin: 0, lineHeight: 1.65 }}>
                מחיקת החשבון מסירה לצמיתות: גינות, צמחים, תמונות, רשומות יומן, היסטוריית טיפול ושיחות עם צ'ופצ'ו. לא ניתן לשחזר את המידע לאחר המחיקה.
              </p>
              <p style={{ color: '#9a3412', margin: '8px 0 0', lineHeight: 1.65 }}>
                החשבון ממשיך לפעול כרגיל עד לסיום עיבוד הבקשה (עד 30 יום). רשומות שימוש ורשומות תשלום נשמרות ללא מזהה החשבון שלך, לצורכי חשבונאות ותפעול.
              </p>
            </div>

            {/* Subscriptions note */}
            <div style={{ backgroundColor: '#f0fdf4', border: `1px solid ${SAGE}40`, borderRadius: '10px', padding: '16px 20px', marginBottom: '28px' }}>
              <p style={{ color: NAVY, fontWeight: 600, margin: '0 0 6px' }}>מנויים ב-Google Play</p>
              <p style={{ color: '#475569', margin: 0, lineHeight: 1.65 }}>
                מנויים פעילים מנוהלים ע"י Google Play — לא ע"י גינה חיה. מחיקת חשבון גינה חיה <strong>אינה מבטלת</strong> מנוי Google Play. כדי להימנע מחיוב עתידי, יש לבטל את המנוי ב-Google Play לפני בקשת מחיקת החשבון.
              </p>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>
              כיצד לבקש מחיקת חשבון
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '20px' }}>
              ניתן לשלוח בקשה ישירות מדף זה (כשמחובר/ת לחשבון), או לשלוח אימייל לכתובת הבאה <strong>מכתובת הדוא"ל הרשומה בחשבונך</strong>. אנחנו נאשר את קבלת הבקשה ונשלים את המחיקה תוך 30 יום.
            </p>

            {/* Signed-in form or prompt */}
            {isSignedIn ? (
              <SignedInForm
                lang="he"
                email={email}
                confirmInput={confirmInput}
                setConfirmInput={setConfirmInput}
                status={status}
                requestedAt={requestedAt}
                onSubmit={handleSubmit}
              />
            ) : (
              <SignInPrompt lang="he" />
            )}

            {/* Email alternative — always visible */}
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '8px' }}>
              {isSignedIn ? 'אפשרות נוספת: ' : ''}
              שלח/י בקשה בדוא"ל <strong>מכתובת הדוא"ל הרשומה בחשבונך</strong>:
            </p>
            <a
              href={mailtoHref(SUBJECT_HE)}
              style={{ display: 'inline-block', backgroundColor: isSignedIn ? NAVY : '#dc2626', color: '#ffffff', textDecoration: 'none', fontWeight: 600, fontSize: isSignedIn ? '14px' : '15px', padding: isSignedIn ? '10px 20px' : '12px 24px', borderRadius: '10px', marginBottom: '8px' }}
            >
              שלח בקשת מחיקה בדוא"ל
            </a>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
              {CONTACT_EMAIL} · נושא: {SUBJECT_HE}
            </p>

            <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px', lineHeight: 1.65 }}>
              לשאלות נוספות:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: SAGE }}>{CONTACT_EMAIL}</a>
            </p>

            {/* Partial deletion */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>מחיקת נתונים חלקית</h2>
              <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
                ניתן למחוק תוכן ספציפי — גינות, צמחים, תמונות, מעקבים — ישירות מתוך האפליקציה בכל עת. מחיקה כזו מסירה את הנתונים משרתינו מיידית.
              </p>
              <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
                ניתן גם לבקש מחיקה של נתונים ספציפיים מבלי למחוק את החשבון — שלח/י אימייל <strong>מכתובת הדוא"ל הרשומה בחשבונך</strong> עם פירוט הנתונים שברצונך להסיר. הבקשה תטופל תוך 30 יום.
              </p>
              <a
                href={mailtoHref(SUBJECT_PARTIAL_HE)}
                style={{ display: 'inline-block', backgroundColor: NAVY, color: '#ffffff', textDecoration: 'none', fontWeight: 600, fontSize: '14px', padding: '10px 20px', borderRadius: '10px', marginBottom: '8px' }}
              >
                שלח בקשת מחיקת נתונים חלקית
              </a>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                {CONTACT_EMAIL} · נושא: {SUBJECT_PARTIAL_HE}
              </p>
            </div>
          </div>

          {/* ── Separator ── */}
          <div style={{ margin: '44px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
              ENGLISH VERSION BELOW · גרסה בעברית למעלה
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          </div>

          {/* ── English section ── */}
          <div dir="ltr">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: NAVY, marginBottom: '24px' }}>
              Account Deletion — Gina Haya
            </h1>

            {/* Warning box */}
            <div style={{ backgroundColor: WARN_BG, border: `1px solid ${WARN_BORDER}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '28px' }}>
              <p style={{ color: '#9a3412', fontWeight: 600, margin: '0 0 6px' }}>
                Important: Account deletion is permanent and irreversible
              </p>
              <p style={{ color: '#9a3412', margin: 0, lineHeight: 1.65 }}>
                Deleting your account permanently removes: gardens, plants, photos, journal entries, care history, and Chupchu conversations. This action cannot be undone.
              </p>
              <p style={{ color: '#9a3412', margin: '8px 0 0', lineHeight: 1.65 }}>
                Your account continues to work normally until the request is processed (up to 30 days). Usage and payment records are kept without your account identifier, for accounting and operational purposes.
              </p>
            </div>

            {/* Subscriptions note */}
            <div style={{ backgroundColor: '#f0fdf4', border: `1px solid ${SAGE}40`, borderRadius: '10px', padding: '16px 20px', marginBottom: '28px' }}>
              <p style={{ color: NAVY, fontWeight: 600, margin: '0 0 6px' }}>Google Play subscriptions</p>
              <p style={{ color: '#475569', margin: 0, lineHeight: 1.65 }}>
                Active subscriptions are managed by Google Play — not by Gina Haya. Deleting your Gina Haya account <strong>does not cancel</strong> a Google Play subscription. To avoid future charges, cancel your subscription in Google Play before requesting account deletion.
              </p>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>
              How to request deletion
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '20px' }}>
              You can submit a request directly on this page (when signed in), or send an email from <strong>the address registered on your account</strong>. We will confirm receipt and complete the deletion within 30 days.
            </p>

            {/* Signed-in form or prompt */}
            {isSignedIn ? (
              <SignedInForm
                lang="en"
                email={email}
                confirmInput={confirmInput}
                setConfirmInput={setConfirmInput}
                status={status}
                requestedAt={requestedAt}
                onSubmit={handleSubmit}
              />
            ) : (
              <SignInPrompt lang="en" />
            )}

            {/* Email alternative — always visible */}
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '8px' }}>
              {isSignedIn ? 'Alternatively, ' : ''}
              send an email from <strong>the address registered on your account</strong>:
            </p>
            <a
              href={mailtoHref(SUBJECT_EN)}
              style={{ display: 'inline-block', backgroundColor: isSignedIn ? NAVY : '#dc2626', color: '#ffffff', textDecoration: 'none', fontWeight: 600, fontSize: isSignedIn ? '14px' : '15px', padding: isSignedIn ? '10px 20px' : '12px 24px', borderRadius: '10px', marginBottom: '8px' }}
            >
              Send deletion request by email
            </a>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
              {CONTACT_EMAIL} · Subject: {SUBJECT_EN}
            </p>

            <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px', lineHeight: 1.65 }}>
              For other questions:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: SAGE }}>{CONTACT_EMAIL}</a>
            </p>

            {/* Partial deletion */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>Partial data deletion</h2>
              <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
                You can delete specific content — gardens, plants, photos, trackers — directly inside the app at any time. Such deletions remove the data from our servers immediately.
              </p>
              <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
                You may also request deletion of specific data without deleting your account — send an email from <strong>the address registered on your account</strong> detailing the data you want removed. The request will be completed within 30 days.
              </p>
              <a
                href={mailtoHref(SUBJECT_PARTIAL_EN)}
                style={{ display: 'inline-block', backgroundColor: NAVY, color: '#ffffff', textDecoration: 'none', fontWeight: 600, fontSize: '14px', padding: '10px 20px', borderRadius: '10px', marginBottom: '8px' }}
              >
                Send partial data deletion request
              </a>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                {CONTACT_EMAIL} · Subject: {SUBJECT_PARTIAL_EN}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
