const NAVY = '#1B2A4A';
const SAGE = '#4A7C59';
const CREAM = '#FDF6EC';

const SECTIONS = [
  {
    title: 'מה אנחנו אוספים',
    body: 'אנו אוספים את כתובת הדוא"ל שלך, שם תצוגה, ומידע על הגינה שהזנת (צמחים, מיקום, העדפות). איננו אוספים מידע רפואי, פיננסי, או נתונים רגישים אחרים.',
  },
  {
    title: 'כיצד אנחנו משתמשים במידע',
    body: 'המידע שלך משמש אך ורק לאספקת השירות — לוח הביודינמי האישי, שיחות עם מוש לבנה, וניהול הגינה. איננו מוכרים או חולקים את המידע שלך עם צדדים שלישיים לצורכי פרסום.',
  },
  {
    title: 'אחסון נתונים',
    body: 'כל הנתונים מאוחסנים בשרתים מאובטחים של Supabase (EU region). הנתונים מוצפנים בזמן העברה ובזמן אחסון. גיבויים מתבצעים מדי יום.',
  },
  {
    title: 'עוגיות ומעקב',
    body: 'אנו משתמשים בעוגיות הכרחיות בלבד לשמירת מצב הכניסה שלך. איננו משתמשים בכלי מעקב פרסומיים או ב-cookies של צדדים שלישיים.',
  },
  {
    title: 'הזכויות שלך',
    body: 'בכל עת תוכל לבקש עותק של הנתונים שלך, לתקן אותם, או למחוק את חשבונך לחלוטין. לבקשות כאלה שלח אימייל ל-hello@gina-haya.com ונטפל בכך תוך 14 ימי עסקים.',
  },
  {
    title: 'שינויים במדיניות',
    body: 'אם נשנה מדיניות זו בצורה מהותית, נשלח הודעה בדוא"ל ונציין את תאריך העדכון בראש הדף. המשך השימוש לאחר השינוי מהווה הסכמה למדיניות המעודכנת.',
  },
  {
    title: 'יצירת קשר',
    body: 'לכל שאלה בנושא פרטיות: hello@gina-haya.com',
  },
];

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div
          className="rounded-2xl shadow-sm p-8"
          style={{ backgroundColor: '#ffffff' }}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: NAVY }}>
            מדיניות פרטיות
          </h1>
          <p className="text-sm mb-8 opacity-60" style={{ color: NAVY }}>
            עודכן לאחרונה: מרץ 2026
          </p>

          <p className="leading-relaxed mb-8" style={{ color: '#475569' }}>
            גינה חיה (Gina Haya) מחויבת לשמור על פרטיותך. מסמך זה מסביר בשפה פשוטה מה אנחנו אוספים, איך אנחנו משתמשים בזה, ומה הזכויות שלך.
          </p>

          <div className="space-y-6">
            {SECTIONS.map((section, i) => (
              <div key={i}>
                <h2 className="text-lg font-bold mb-2" style={{ color: NAVY }}>
                  {i + 1}. {section.title}
                </h2>
                <p className="leading-relaxed" style={{ color: '#475569' }}>
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-10 p-4 rounded-xl text-sm"
            style={{ backgroundColor: SAGE + '15', borderInlineStart: `3px solid ${SAGE}` }}
          >
            <p style={{ color: NAVY }}>
              <strong>בקיצור:</strong> אנחנו גינה קטנה, לא חברת ביג-דאטה. המידע שלך נשאר שלך ומשמש רק כדי לעזור לגינה שלך לגדול טוב יותר.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
