const NAVY  = '#1B2A4A';
const SAGE  = '#4A9C68';
const CREAM = '#FDF6EC';

const CONTACT_EMAIL = 'gina.haya.contact@gmail.com';
const LAST_UPDATED_HE = '7 בספטמבר 2026';
const LAST_UPDATED_EN = 'September 7, 2026';

interface Section { title: string; body: string | string[] }

const HE_SECTIONS: Section[] = [
  {
    title: 'מה אנחנו אוספים ולמה',
    body: [
      'פרטי חשבון: כתובת דוא"ל ושם (אם סופקו) — לצורך כניסה לחשבון וניהולו. ניתן להתחבר עם דוא"ל+סיסמה או חשבון Google.',
      'נתוני הגינה שלך: הגינות והצמחים שהוספת, פרטי גידול (מיקום, סוג גידול, השקיה), משימות טיפול, יומן אירועים והערות שכתבת. אלה הנתונים שמאפשרים לאפליקציה לעבוד, והם נשמרים בשרתינו.',
      'תמונות צמחים — תמונות שאתה מצלם נשמרות במכשירך. כשאתה מבקש ניתוח AI, התמונה נשלחת לשרתינו ומשם ל-Anthropic לצורך הפקת הניתוח. תמונה שנותחה נשמרת אצלנו כל עוד החשבון פעיל, כדי שנוכל להציג את היסטוריית הצמח ולהשוות בין ניתוחים לאורך זמן, ונמחקת עם מחיקת החשבון. תמונות שלא נשלחו לניתוח נשארות במכשירך בלבד.',
      'דוחות ניתוח ומעקב — תוצאות הניתוחים, מצב הצמח לאורך זמן והשוואות בין בדיקות.',
      'הודעות שיחה עם צ\'ופצ\'ו — נשמרות לשמירת המשכיות השיחה; מעובדות ע"י ממשק Anthropic\'s Claude API, שהוא ספק שירות ה-AI שלנו.',
      'מיקום מקורב — אופציונלי, ברשותך בלבד; משמש לנתוני מזג אוויר מקומי ולוח ביודינמי. לא נשמרת היסטוריית מיקומים.',
      'מצב מנוי/רכישה — מנויים מטופלים ע"י Google Play; אנו מקבלים ושומרים את סטטוס המנוי (לא פרטי כרטיס האשראי שלך, שאנו אף פעם לא רואים).',
      'מונים בסיסיים (כגון מספר ניתוחי AI שנוצלו) — לאכיפת מגבלות תוכנית.',
    ],
  },
  {
    title: 'מה אנחנו לא עושים',
    body: 'אנחנו לא מוכרים את נתוניך האישיים. אנחנו לא עובדים עם רשתות פרסום. אנחנו לא משתמשים בנתוניך לאימון מודלי AI. אנחנו לא חולקים מידע עם צדדים שלישיים למעט ספקי שירות המעבדים נתונים מטעמנו (ראה סעיף הבא).',
  },
  {
    title: 'ספקי שירות',
    body: 'אנחנו עובדים עם ספקי השירות הבאים, שמעבדים נתונים מטעמנו ולפי הוראותינו בלבד: Supabase (אחסון מסד נתונים, אימות זהות ואחסון תמונות), Anthropic (עיבוד AI — שיחות עם צ\'ופצ\'ו ותמונות צמחים הנשלחות לניתוח), Google Play (תשלומים ומנויים), Railway (אחסון שרת). חלק מספקי השירות מעבדים נתונים מחוץ לישראל; ההעברה נעשית לצורך אספקת השירות בלבד.',
  },
  {
    title: 'אחסון ואבטחה',
    body: 'כל הנתונים מאוחסנים בשרתים מאובטחים של Supabase. כל התעבורה מוצפנת (HTTPS/TLS). אנחנו מיישמים נהלי אבטחה סבירים להגנה על מידעך.',
  },
  {
    title: 'שמירת נתונים ומחיקה',
    body: 'הנתונים נשמרים כל עוד החשבון פעיל, כולל תמונות שנשלחו לניתוח. משתמשים יכולים לבקש מחיקת חשבון בכל עת — ראה דף מחיקת חשבון. עם מחיקת החשבון נמחקות גם התמונות ששמורות בשרתינו. רשומות שימוש ורשומות תשלום נשמרות ללא מזהה החשבון, לצורכי חשבונאות ותפעול. המחיקה מושלמת תוך 30 יום.',
  },
  {
    title: 'גיל מינימלי',
    body: 'השירות מיועד למשתמשים בני 18 ומעלה. אנחנו לא אוספים ביודעין מידע מילדים מתחת לגיל 18.',
  },
  {
    title: 'שינויים במדיניות',
    body: 'אם נבצע שינויים מהותיים במדיניות זו, נשלח הודעה בדוא"ל ונציין את תאריך העדכון בראש הדף. המשך השימוש לאחר השינוי מהווה הסכמה למדיניות המעודכנת.',
  },
  {
    title: 'יצירת קשר',
    body: `לכל שאלה בנושא פרטיות: ${CONTACT_EMAIL}`,
  },
];

const EN_SECTIONS: Section[] = [
  {
    title: 'What we collect and why',
    body: [
      'Account details: email address and name (if provided) — for login and account management. Sign-in via email/password or Google account.',
      'Your garden data: the gardens and plants you add, growing details (location, growing type, irrigation), care tasks, activity timeline and any notes you write. This is the data that makes the app work, and it is stored on our servers.',
      "Plant photos — photos you take stay on your device. When you request an AI analysis, the photo is sent to our servers and from there to Anthropic to produce the analysis. An analysed photo is retained by us while your account is active, so we can show you the plant's history and compare analyses over time, and is deleted when your account is deleted. Photos you never submit for analysis remain on your device only.",
      'Analysis and tracking records — analysis results, plant health over time, and comparisons between check-ins.',
      'Chat messages with Chupchu (צ\'ופצ\'ו) — stored to provide conversation continuity; processed by Anthropic\'s Claude API as our AI service provider.',
      'Location (approximate) — optional, with your permission; used for local weather and biodynamic calendar data. No location history is stored.',
      'Purchase/subscription state — subscriptions are processed by Google Play; we receive and store subscription status only (not your payment card details, which we never see).',
      'Basic usage counters (e.g. number of AI analyses used) — for enforcing plan limits.',
    ],
  },
  {
    title: 'What we do NOT do',
    body: 'We do not sell your personal data. We do not work with advertising networks. We do not use your data to train AI models. We do not share your information with third parties except service providers processing on our behalf (see next section).',
  },
  {
    title: 'Service providers',
    body: 'We work with the following service providers, who process data on our behalf and on our instructions only: Supabase (database storage, authentication and image storage), Anthropic (AI processing — Chupchu conversations and plant photos submitted for analysis), Google Play (payments and subscriptions), Railway (server hosting). Some service providers process data outside Israel; any such transfer is made solely to provide the service.',
  },
  {
    title: 'Storage & security',
    body: 'All data is stored on Supabase\'s secure servers. All traffic is encrypted (HTTPS/TLS). We implement reasonable security practices to protect your information.',
  },
  {
    title: 'Retention & deletion',
    body: 'Data is kept while the account is active, including photos submitted for analysis. Users may request account deletion at any time — see the Account Deletion page. When an account is deleted, the photos stored on our servers are deleted with it. Usage and payment records are kept without your account identifier, for accounting and operational purposes. Deletion is completed within 30 days.',
  },
  {
    title: 'Children',
    body: 'The service is intended for users 18 and older. We do not knowingly collect information from children under 18.',
  },
  {
    title: 'Policy changes',
    body: 'If we make material changes to this policy, we will send an email notification and show the update date at the top of the page. Continued use after the change constitutes acceptance of the updated policy.',
  },
  {
    title: 'Contact',
    body: `For any privacy questions: ${CONTACT_EMAIL}`,
  },
];

function SectionBlock({ sections, counterOffset = 0, textColor = '#475569' }: {
  sections: Section[];
  counterOffset?: number;
  textColor?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {sections.map((section, i) => (
        <div key={i}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: NAVY, marginBottom: '8px' }}>
            {i + 1 + counterOffset}. {section.title}
          </h2>
          {Array.isArray(section.body) ? (
            <ul style={{ margin: 0, paddingInlineStart: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {section.body.map((item, j) => (
                <li key={j} style={{ color: textColor, lineHeight: 1.7 }}>{item}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: textColor, lineHeight: 1.7, margin: 0 }}>{section.body}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', padding: '40px 44px' }}>

          {/* ── Hebrew section ── */}
          <div dir="rtl">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>
              מדיניות פרטיות — גינה חיה
            </h1>
            <p style={{ fontSize: '13px', color: NAVY, opacity: 0.55, marginBottom: '20px' }}>
              עודכן לאחרונה: {LAST_UPDATED_HE}
            </p>
            <p style={{ color: '#475569', lineHeight: 1.75, marginBottom: '32px' }}>
              גינה חיה מחויבת לשמור על פרטיותך. מסמך זה מסביר בשפה פשוטה מה אנחנו אוספים, איך אנחנו משתמשים בזה, ומה הזכויות שלך.
            </p>
            <SectionBlock sections={HE_SECTIONS} />
            <div
              style={{
                marginTop: '32px', padding: '16px 20px', borderRadius: '12px',
                backgroundColor: SAGE + '18', borderInlineStart: `3px solid ${SAGE}`,
              }}
            >
              <p style={{ color: NAVY, margin: 0, lineHeight: 1.65 }}>
                <strong>בקיצור:</strong> אנחנו גינה קטנה, לא חברת ביג-דאטה. המידע שלך נשאר שלך ומשמש רק כדי לעזור לגינה שלך לגדול טוב יותר.
              </p>
            </div>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#475569' }}>
              לבקשת מחיקת חשבון ונתונים:{' '}
              <a href="/delete-account" style={{ color: SAGE, textDecoration: 'underline' }}>
                דף מחיקת חשבון
              </a>
            </p>
          </div>

          {/* ── Separator ── */}
          <div style={{ margin: '48px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
              ENGLISH VERSION BELOW · גרסה בעברית למעלה
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          </div>

          {/* ── English section ── */}
          <div dir="ltr">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>
              Privacy Policy — Gina Haya
            </h1>
            <p style={{ fontSize: '13px', color: NAVY, opacity: 0.55, marginBottom: '20px' }}>
              Last updated: {LAST_UPDATED_EN}
            </p>
            <p style={{ color: '#475569', lineHeight: 1.75, marginBottom: '32px' }}>
              Gina Haya is committed to protecting your privacy. This document explains in plain language what we collect, how we use it, and what your rights are.
            </p>
            <SectionBlock sections={EN_SECTIONS} />
            <div
              style={{
                marginTop: '32px', padding: '16px 20px', borderRadius: '12px',
                backgroundColor: SAGE + '18', borderLeft: `3px solid ${SAGE}`,
              }}
            >
              <p style={{ color: NAVY, margin: 0, lineHeight: 1.65 }}>
                <strong>In short:</strong> we are a small garden, not a big-data company. Your data stays yours and is used only to help your garden grow better.
              </p>
            </div>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#475569' }}>
              To request account and data deletion:{' '}
              <a href="/delete-account" style={{ color: SAGE, textDecoration: 'underline' }}>
                Account Deletion page
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
