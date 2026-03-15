import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const NAVY = '#1B2A4A';
const SAGE = '#4A7C59';
const CREAM = '#FDF6EC';
const MOON_GOLD = '#B7924A';

interface TodayPreview {
  score: number;
  dayType: string;
}

const DAY_TYPE_LABELS: Record<string, string> = {
  fruit: 'יום פרי 🍅',
  flower: 'יום פרח 🌸',
  root: 'יום שורש 🥕',
  leaf: 'יום עלה 🥬',
};

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 8 ? SAGE :
    score >= 6 ? '#C8A040' :
    score >= 4 ? '#C0622A' : '#A33030';

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3"
      style={{ backgroundColor: color }}
    >
      {score}
    </div>
  );
}

function TodayPreviewCard() {
  const [data, setData] = useState<TodayPreview | null>(null);

  useEffect(() => {
    fetch('/api/calendar/today')
      .then(r => r.json())
      .then(d => setData({ score: d.score ?? 7, dayType: d.dayType ?? 'fruit' }))
      .catch(() => setData({ score: 7, dayType: 'fruit' }));
  }, []);

  const preview = data ?? { score: 7, dayType: 'fruit' };

  return (
    <div
      className="rounded-2xl shadow-md p-6 text-center transition-all duration-200"
      style={{ backgroundColor: '#ffffff', maxWidth: '320px', width: '100%' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-60" style={{ color: NAVY }}>
        היום בגינה
      </p>
      <ScoreCircle score={preview.score} />
      <p className="text-lg font-semibold" style={{ color: NAVY }}>
        {DAY_TYPE_LABELS[preview.dayType] ?? preview.dayType}
      </p>
      <p className="text-sm mt-1 opacity-60" style={{ color: NAVY }}>
        ציון זריעה: {preview.score}/10
      </p>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🌕',
    title: 'לוח ביודינמי יומי',
    body: 'לוח שנה מדויק המשלב את שיטות פודולינסקי ותון. ציון זריעה יומי, סוג יום, כיוון הירח.',
  },
  {
    icon: '🤖',
    title: 'מוש לבנה — המומחה שלך',
    body: 'בינה מלאכותית ביודינמית שמכירה את הגינה שלך. שאל, קבל עצה, גדל טוב יותר.',
  },
  {
    icon: '🌿',
    title: 'אנציקלופדיה של צמחים',
    body: '100+ צמחים עם עצות ביודינמיות, ימים מומלצים, ולוח זריעה לישראל.',
  },
];

const PRICING = [
  {
    name: 'חינם לתמיד',
    price: null,
    features: ['לוח ביודינמי בסיסי', '5 שאלות למוש בחודש', 'אנציקלופדיה בסיסית'],
    cta: 'התחל עכשיו',
    highlight: false,
  },
  {
    name: 'Grower',
    price: '₪9/חודש',
    features: ['לוח ביודינמי מלא', '30 שאלות למוש', 'גינה אישית', 'התראות יומיות'],
    cta: 'בחר תוכנית',
    highlight: false,
  },
  {
    name: 'Gardener Pro',
    price: '₪14/חודש',
    features: ['הכל ב-Grower', 'שאלות ללא הגבלה', 'דוחות חודשיים', 'תמיכה מועדפת'],
    cta: 'בחר תוכנית',
    highlight: true,
  },
  {
    name: 'Professional',
    price: '₪49/חודש',
    features: ['הכל ב-Pro', 'API גישה', 'לוגו מותאם אישית', 'תמיכה ייעודית'],
    cta: 'בחר תוכנית',
    highlight: false,
  },
];

export function LandingPage() {
  function scrollToFeatures(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div style={{ backgroundColor: CREAM }}>
      {/* ── HERO ── */}
      <section
        className="flex flex-col lg:flex-row items-center justify-center gap-10 px-6 lg:px-16"
        style={{ paddingTop: '80px', paddingBottom: '80px', backgroundColor: CREAM }}
      >
        <div className="flex-1 max-w-xl">
          <h1
            className="font-bold leading-tight mb-5"
            style={{ fontSize: 'clamp(32px, 5vw, 48px)', color: NAVY }}
          >
            הגינה שלך, מחוברת לשמים
          </h1>
          <p
            className="mb-8 leading-relaxed"
            style={{ fontSize: '22px', color: '#475569', maxWidth: '600px' }}
          >
            לוח ביודינמי יומי, עצות מוש לבנה, וכל מה שצמחים שלך צריכים
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="inline-block font-semibold rounded-lg text-white transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: SAGE, padding: '16px 32px' }}
            >
              התחל בחינם
            </Link>
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="inline-block font-semibold rounded-lg transition-all duration-200 hover:opacity-70"
              style={{
                padding: '16px 32px',
                border: `2px solid ${NAVY}`,
                color: NAVY,
                backgroundColor: 'transparent',
              }}
            >
              ראה איך זה עובד
            </a>
          </div>
        </div>

        <div className="flex justify-center">
          <TodayPreviewCard />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ paddingTop: '80px', paddingBottom: '80px', backgroundColor: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="font-bold text-center mb-12"
            style={{ fontSize: '36px', color: NAVY }}
          >
            כל מה שגינה ביודינמית צריכה
          </h2>
          <div className="flex flex-col md:flex-row gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="flex-1 rounded-2xl shadow-sm p-8 transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-3" style={{ color: NAVY }}>{f.title}</h3>
                <p className="leading-relaxed" style={{ color: '#475569' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOOSH INTRODUCTION ── */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', backgroundColor: CREAM }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Avatar column */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-4"
                style={{ backgroundColor: MOON_GOLD }}
              >
                🌕
              </div>
              <h3 className="text-xl font-bold" style={{ color: NAVY }}>מוש לבנה</h3>
              <p className="text-sm font-medium" style={{ color: SAGE }}>סבא הירח שלך</p>
            </div>

            {/* Description column */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4" style={{ color: NAVY }}>שלום! אני מוש לבנה</h2>
              <p className="leading-relaxed mb-6" style={{ color: '#475569' }}>
                גדלתי בגליל וחקרתי חקלאות ביודינמית למעלה מ-20 שנה. עבדתי בחוות ביודינמיות בארץ ובפרובנס, ולמדתי מהאדמה, מהירח, ומהצמחים עצמם. עכשיו אני כאן כדי לעזור לגינה שלך לפרוח.
              </p>

              {/* Sample chat bubble */}
              <div
                className="rounded-2xl rounded-es-sm p-4 inline-block max-w-sm"
                style={{ backgroundColor: MOON_GOLD + '22', borderInlineStart: `4px solid ${MOON_GOLD}` }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">🌕</span>
                  <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                    היום הוא יום פרי 🍅 — הזמן המושלם לשתול עגבניות ופלפלים. הירח יורד, הארץ נושמת פנימה.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', backgroundColor: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="font-bold text-center mb-12"
            style={{ fontSize: '36px', color: NAVY }}
          >
            בחר את התוכנית שלך
          </h2>

          <div className="flex flex-row gap-4 overflow-x-auto pb-4">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className="rounded-2xl p-6 flex flex-col transition-all duration-200 hover:shadow-md"
                style={{
                  minWidth: '200px',
                  flex: '1 1 200px',
                  backgroundColor: '#ffffff',
                  border: plan.highlight ? `2px solid ${MOON_GOLD}` : '1px solid #e5e7eb',
                  position: 'relative',
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 start-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: MOON_GOLD, transform: 'translateX(-50%)' }}
                  >
                    הכי פופולרי
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1" style={{ color: NAVY }}>{plan.name}</h3>
                {plan.price && (
                  <p className="text-2xl font-bold mb-4" style={{ color: plan.highlight ? MOON_GOLD : SAGE }}>
                    {plan.price}
                  </p>
                )}
                {!plan.price && (
                  <p className="text-2xl font-bold mb-4" style={{ color: SAGE }}>חינם</p>
                )}
                <ul className="flex-1 mb-6 space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#475569' }}>
                      <span className="font-bold shrink-0" style={{ color: SAGE }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="block text-center font-semibold rounded-lg py-3 transition-all duration-200 hover:opacity-80"
                  style={{
                    backgroundColor: plan.highlight ? MOON_GOLD : SAGE,
                    color: '#ffffff',
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="text-center px-6"
        style={{ paddingTop: '80px', paddingBottom: '80px', backgroundColor: SAGE }}
      >
        <p
          className="italic mb-3 font-medium"
          style={{ fontSize: '28px', color: MOON_GOLD }}
        >
          "הגינה מחכה לך. היא תמיד שם."
        </p>
        <p className="mb-10 font-medium" style={{ fontSize: '18px', color: '#ffffff' }}>
          — מוש לבנה
        </p>
        <Link
          to="/signup"
          className="inline-block font-bold rounded-lg transition-all duration-200 hover:opacity-90"
          style={{
            backgroundColor: '#ffffff',
            color: SAGE,
            padding: '16px 40px',
            fontSize: '18px',
          }}
        >
          התחל עכשיו — בחינם
        </Link>
      </section>
    </div>
  );
}
