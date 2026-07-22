const NAVY         = '#1B2A4A';
const SAGE         = '#4A9C68';
const CREAM        = '#FDF6EC';
const WARN_BG      = '#fff7ed';
const WARN_BORDER  = '#f97316';

const CONTACT_EMAIL  = 'gina.haya.contact@gmail.com';
const SUBJECT_HE     = 'בקשת מחיקת חשבון — גינה חיה';
const SUBJECT_EN     = 'Account Deletion Request — Gina Haya';

function mailtoHref(subject: string) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function DeleteAccountPage() {
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
            <div style={{
              backgroundColor: WARN_BG, border: `1px solid ${WARN_BORDER}`,
              borderRadius: '10px', padding: '16px 20px', marginBottom: '28px',
            }}>
              <p style={{ color: '#9a3412', fontWeight: 600, margin: '0 0 6px' }}>
                שים לב: מחיקת החשבון היא בלתי הפיכה
              </p>
              <p style={{ color: '#9a3412', margin: 0, lineHeight: 1.65 }}>
                מחיקת החשבון מסירה לצמיתות את הפרופיל שלך, הגינות, הצמחים, המעקבים, נתוני ציר הזמן, היסטוריית השיחות עם צ'ופצ'ו, ורשומות השימוש. לא ניתן לשחזר את המידע לאחר המחיקה.
              </p>
            </div>

            {/* Subscriptions note */}
            <div style={{
              backgroundColor: '#f0fdf4', border: `1px solid ${SAGE}40`,
              borderRadius: '10px', padding: '16px 20px', marginBottom: '28px',
            }}>
              <p style={{ color: NAVY, fontWeight: 600, margin: '0 0 6px' }}>
                מנויים ב-Google Play
              </p>
              <p style={{ color: '#475569', margin: 0, lineHeight: 1.65 }}>
                מנויים פעילים מנוהלים ע"י Google Play — לא ע"י גינה חיה. מחיקת חשבון גינה חיה <strong>אינה מבטלת</strong> מנוי Google Play. כדי להימנע מחיוב עתידי, יש לבטל את המנוי ב-Google Play לפני בקשת מחיקת החשבון.
              </p>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>
              כיצד לבקש מחיקת חשבון
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '20px' }}>
              שלח/י אימייל לכתובת הבאה <strong>מכתובת הדוא"ל הרשומה בחשבונך</strong> עם הבקשה למחיקת חשבון. אנחנו נאשר את קבלת הבקשה ונשלים את המחיקה תוך 30 יום.
            </p>
            <a
              href={mailtoHref(SUBJECT_HE)}
              style={{
                display: 'inline-block', backgroundColor: '#dc2626', color: '#ffffff',
                textDecoration: 'none', fontWeight: 600, fontSize: '15px',
                padding: '12px 24px', borderRadius: '10px', marginBottom: '8px',
              }}
            >
              שלח בקשת מחיקה בדוא"ל
            </a>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
              {CONTACT_EMAIL} · נושא: {SUBJECT_HE}
            </p>

            <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px', lineHeight: 1.65 }}>
              לשאלות נוספות ניתן לפנות אלינו גם ב-{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: SAGE }}>
                {CONTACT_EMAIL}
              </a>
            </p>
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
            <div style={{
              backgroundColor: WARN_BG, border: `1px solid ${WARN_BORDER}`,
              borderRadius: '10px', padding: '16px 20px', marginBottom: '28px',
            }}>
              <p style={{ color: '#9a3412', fontWeight: 600, margin: '0 0 6px' }}>
                Important: Account deletion is permanent and irreversible
              </p>
              <p style={{ color: '#9a3412', margin: 0, lineHeight: 1.65 }}>
                Deleting your account permanently removes your profile, gardens, plants, trackers, timeline data, chat history with Chupchu, and usage records. This action cannot be undone.
              </p>
            </div>

            {/* Subscriptions note */}
            <div style={{
              backgroundColor: '#f0fdf4', border: `1px solid ${SAGE}40`,
              borderRadius: '10px', padding: '16px 20px', marginBottom: '28px',
            }}>
              <p style={{ color: NAVY, fontWeight: 600, margin: '0 0 6px' }}>
                Google Play subscriptions
              </p>
              <p style={{ color: '#475569', margin: 0, lineHeight: 1.65 }}>
                Active subscriptions are managed by Google Play — not by Gina Haya. Deleting your Gina Haya account <strong>does not cancel</strong> a Google Play subscription. To avoid future charges, cancel your subscription in Google Play before requesting account deletion.
              </p>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, marginBottom: '12px' }}>
              How to request deletion
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '20px' }}>
              Send an email from <strong>the address registered on your account</strong> with a deletion request. We will confirm receipt and complete the deletion within 30 days.
            </p>
            <a
              href={mailtoHref(SUBJECT_EN)}
              style={{
                display: 'inline-block', backgroundColor: '#dc2626', color: '#ffffff',
                textDecoration: 'none', fontWeight: 600, fontSize: '15px',
                padding: '12px 24px', borderRadius: '10px', marginBottom: '8px',
              }}
            >
              Send deletion request by email
            </a>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
              {CONTACT_EMAIL} · Subject: {SUBJECT_EN}
            </p>

            <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px', lineHeight: 1.65 }}>
              For other questions contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: SAGE }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
