export interface ArticleImages {
  hero: string;
  steps?: string;
  results?: string;
}

export interface ArticleEntry {
  id: string;
  titleHe: string;
  titleEn: string;
  metaDescriptionHe: string;
  metaDescriptionEn: string;
  categoryHe: string;
  categoryEn: string;
  filenameHe: string;
  filenameEn: string;
  publishedAt: string;
  images: ArticleImages | null;
  htmlContent?: string;
}

export const ARTICLES: ArticleEntry[] = [
  {
    id: 'compost-tea',
    titleHe: 'תה קומפוסט — המדריך המלא לקרקע חיה',
    titleEn: 'Compost Tea — The Complete Guide to Living Soil',
    metaDescriptionHe: 'כך תכינו תה קומפוסט נכון, תחזקו את החיים בקרקע ותעזרו לצמחים לצמוח בצורה מאוזנת וטבעית.',
    metaDescriptionEn: 'Learn how to make compost tea step-by-step, apply it correctly, and boost soil life naturally.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: '01_תה_קומפוסט.md',
    filenameEn: '01_compost_tea.md',
    publishedAt: '2026-04-08',
    images: {
      hero:    '/articles/images/compost-tea/hero.png',
      steps:   '/articles/images/compost-tea/steps.png',
      results: '/articles/images/compost-tea/results.png',
    },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Caveat:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0;}

.art{
  --ink:#2a1f0e;
  --ink-mid:#4a3520;
  --ink-light:#7a5c3a;
  --parchment:#f5edd8;
  --parchment-dark:#ede0c4;
  --amber:#c8851a;
  --amber-light:#e8a83a;
  --moss:#4a6741;
  --moss-light:#6b8f62;
  --rust:#8b3a1a;
  --cream:#faf5e8;
  font-family:'DM Sans',sans-serif;
  background:var(--cream);
  color:var(--ink);
  max-width:800px;
  margin:0 auto;
}

/* HERO */
.hero{
  background:linear-gradient(150deg,#1e1508 0%,#2e2010 45%,#3d2d14 100%);
  padding:3rem 2.5rem 2.5rem;
  position:relative;
  overflow:hidden;
  display:flex;
  align-items:center;
  gap:2rem;
}
.hero::before{
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 6px);
  pointer-events:none;
}
.hero-content{flex:1;position:relative;z-index:1;}
.hero-category{
  display:inline-block;
  background:var(--amber);
  color:#fff8e8;
  font-size:10px;font-weight:500;
  letter-spacing:0.13em;text-transform:uppercase;
  padding:3px 11px;border-radius:2px;
  margin-bottom:1rem;
}
.hero h1{
  font-family:'Lora',serif;
  font-size:2.8rem;font-weight:600;
  color:#f5edd8;line-height:1.1;
  margin-bottom:0.3rem;
  direction:rtl;
}
.hero-en{
  font-family:'Lora',serif;
  font-size:1rem;font-style:italic;
  color:#c9a96e;margin-bottom:1.25rem;
}
.hero-meta{
  display:flex;gap:1.25rem;
  font-size:11px;color:#a08050;font-weight:300;
}
.hero-meta span{display:flex;align-items:center;gap:4px;}
.hero-img-wrap{
  position:relative;z-index:1;flex-shrink:0;
}
.hero-img{
  width:150px;height:150px;
  border-radius:50%;
  object-fit:cover;object-position:center 18%;
  border:2px solid rgba(200,133,26,0.5);
  display:block;
}
.hero-img-ring{
  position:absolute;inset:-8px;
  border-radius:50%;
  border:1px dashed rgba(200,133,26,0.25);
  pointer-events:none;
}

/* BODY */
.body{padding:0 2.5rem;}

/* INTRO PULL QUOTE */
.intro{
  font-family:'Lora',serif;
  font-size:1.1rem;line-height:1.85;
  color:var(--ink-mid);
  border-right:3px solid var(--amber);
  padding:0.25rem 1.25rem;
  margin:2rem 0;
  direction:rtl;
}

/* SECTION HEADERS */
.section{margin:2.5rem 0 0;}
.section-head{
  display:flex;align-items:center;
  gap:0.7rem;margin-bottom:0.5rem;
  direction:rtl;
}
.section-num{
  width:28px;height:28px;border-radius:50%;
  background:var(--ink);color:var(--parchment);
  font-family:'Lora',serif;font-size:13px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
}
.section-head h2{
  font-family:'Lora',serif;
  font-size:1.25rem;font-weight:600;color:var(--ink);
}
.section-en{
  font-size:0.75rem;font-weight:300;
  color:var(--ink-light);font-style:italic;
  margin-right:auto;
}
.divider{
  border:none;
  border-top:1px dashed rgba(122,92,58,0.3);
  margin-bottom:1.25rem;
}

/* BODY TEXT */
.p{
  font-size:0.95rem;line-height:1.85;
  color:var(--ink-mid);direction:rtl;
  margin-bottom:1rem;
}
.p strong{color:var(--ink);font-weight:500;}

/* INGREDIENTS GRID */
.ingredients{
  display:grid;grid-template-columns:1fr 1fr;
  gap:10px;margin:1.25rem 0;
}
.ing{
  display:flex;align-items:center;gap:10px;
  background:var(--parchment);
  border:1px solid rgba(122,92,58,0.2);
  border-radius:7px;padding:11px 14px;
  direction:rtl;
}
.ing-dot{width:8px;height:8px;border-radius:50%;background:var(--moss);flex-shrink:0;}
.ing-name{font-size:0.9rem;color:var(--ink-mid);}
.ing-qty{font-size:0.78rem;color:var(--ink-light);font-weight:300;margin-right:auto;}

/* WARNING BOX */
.warning{
  background:#fff8f2;
  border-right:3px solid var(--rust);
  border-radius:0 7px 7px 0;
  padding:12px 16px;margin:1.25rem 0;
  direction:rtl;
}
.warning-title{font-size:0.88rem;font-weight:500;color:var(--rust);margin-bottom:4px;}
.warning-body{font-size:0.85rem;color:var(--ink-mid);line-height:1.65;}

/* STEPS */
.steps{display:flex;flex-direction:column;gap:0;margin:1.25rem 0;position:relative;}
.steps::before{
  content:'';position:absolute;
  right:19px;top:24px;bottom:24px;width:1px;
  background:repeating-linear-gradient(to bottom,var(--amber-light) 0,var(--amber-light) 5px,transparent 5px,transparent 10px);
}
.step{
  display:flex;gap:16px;align-items:flex-start;
  padding:12px 0;direction:rtl;position:relative;z-index:1;
}
.step-num{
  width:38px;height:38px;border-radius:50%;
  background:var(--amber);color:#fff;
  font-family:'Lora',serif;font-size:15px;font-weight:600;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.step-body{padding-top:6px;}
.step-title{font-size:0.95rem;font-weight:500;color:var(--ink);margin-bottom:3px;}
.step-desc{font-size:0.875rem;color:var(--ink-light);line-height:1.65;}

/* CHUPCHU CALLOUT */
.chupchu{
  background:#fffdf5;
  border:1px solid rgba(200,133,26,0.35);
  border-radius:10px;
  padding:1.1rem 1.3rem;
  margin:1.75rem 0;
  display:flex;gap:1rem;
  align-items:flex-start;direction:rtl;
  position:relative;
}
.chupchu::after{
  content:'';position:absolute;
  inset:0;border-radius:10px;
  background:repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(200,133,26,0.03) 4px,rgba(200,133,26,0.03) 8px);
  pointer-events:none;
}
.chupchu-img{
  width:46px;height:46px;border-radius:50%;
  object-fit:cover;object-position:center 15%;
  border:1px solid rgba(200,133,26,0.35);
  flex-shrink:0;position:relative;z-index:1;
}
.chupchu-inner{position:relative;z-index:1;}
.chupchu-name{
  font-family:'Caveat',cursive;
  font-size:13px;font-weight:600;
  color:var(--amber);margin-bottom:4px;
}
.chupchu-text{
  font-family:'Caveat',cursive;
  font-size:1.05rem;line-height:1.6;
  color:var(--ink-mid);
}

/* TIPS GRID */
.tips{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.tip{
  background:var(--parchment);
  border-radius:8px;padding:14px 16px;direction:rtl;
}
.tip-icon{font-size:1.4rem;margin-bottom:6px;display:block;}
.tip-title{font-size:0.88rem;font-weight:500;color:var(--ink);margin-bottom:4px;}
.tip-body{font-size:0.82rem;color:var(--ink-light);line-height:1.6;}

/* PLANTS */
.plants{display:flex;gap:8px;flex-wrap:wrap;margin:0.75rem 0;direction:rtl;}
.plant{
  background:var(--moss);color:#e8f0e6;
  font-size:0.82rem;padding:4px 14px;border-radius:20px;
}

/* FAQ */
.faq{margin:0.5rem 0;}
.faq-item{
  border-bottom:1px dashed rgba(122,92,58,0.25);
  padding:12px 0;direction:rtl;
  cursor:pointer;
}
.faq-q{
  font-size:0.92rem;font-weight:500;color:var(--ink);
  display:flex;align-items:center;justify-content:space-between;
}
.faq-arrow{color:var(--amber);font-size:14px;transition:transform 0.2s;}
.faq-a{
  font-size:0.87rem;color:var(--ink-light);
  line-height:1.7;margin-top:8px;
  display:none;
}
.faq-item.open .faq-a{display:block;}
.faq-item.open .faq-arrow{transform:rotate(180deg);}

/* RELATED */
.related{
  background:var(--parchment-dark);
  border-radius:8px;padding:1.25rem 1.5rem;
  margin:2rem 0;direction:rtl;
}
.related-title{
  font-family:'Lora',serif;
  font-size:1rem;font-weight:600;color:var(--ink);
  margin-bottom:1rem;
}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{
  display:flex;align-items:center;gap:8px;
  font-size:0.88rem;color:var(--moss);
  text-decoration:none;
}
.related-link:hover{color:var(--amber);}
.related-link::before{content:'←';color:var(--amber);font-size:12px;}

/* FOOTER CTA */
.footer-cta{
  background:linear-gradient(150deg,#1e1508,#3d2d14);
  padding:2rem 2.5rem;
  display:flex;align-items:center;gap:1.5rem;
  direction:rtl;margin-top:3rem;
}
.footer-img{
  width:56px;height:56px;border-radius:50%;
  object-fit:cover;object-position:center 15%;
  border:1px solid rgba(200,133,26,0.4);flex-shrink:0;
}
.footer-text{
  font-family:'Lora',serif;
  font-size:0.95rem;line-height:1.7;color:#c9a96e;flex:1;
}
.footer-text em{font-size:0.82rem;color:#a08050;font-style:normal;}
.footer-btn{
  display:inline-block;background:var(--amber);
  color:#fff;font-size:0.82rem;font-weight:500;
  padding:9px 20px;border-radius:4px;
  text-decoration:none;white-space:nowrap;flex-shrink:0;
}

/* SCHEMA hidden */
.schema{display:none;}

@media(max-width:560px){
  .hero{flex-direction:column;align-items:flex-start;padding:2rem 1.5rem;}
  .hero h1{font-size:2rem;}
  .hero-img-wrap{align-self:center;}
  .body{padding:0 1.5rem;}
  .ingredients{grid-template-columns:1fr;}
  .tips{grid-template-columns:1fr;}
  .footer-cta{flex-direction:column;padding:1.5rem;}
}
</style>

<!-- Hidden SEO schema -->
<script type="application/ld+json" class="schema">
{
  "@context":"https://schema.org",
  "@type":"Article",
  "headline":"תה קומפוסט — המדריך המלא לגינה ביודינמית",
  "description":"למד איך להכין תה קומפוסט בבית — דשן טבעי עשיר בחיידקים מועילים שיחזק את הקרקע שלך בלי כימיקלים.",
  "author":{"@type":"Person","name":"צ'ופצ'ו — גינה חיה"},
  "publisher":{"@type":"Organization","name":"גינה חיה","url":"https://gina-haya.vercel.app"},
  "inLanguage":["he","en"],
  "keywords":"תה קומפוסט, דשן טבעי, גינה ביודינמית, קומפוסט, חיידקים מועילים",
  "articleSection":"דשנים טבעיים"
}
</script>

<article class="art" itemscope itemtype="https://schema.org/Article">

  <!-- HERO -->
  <header class="hero">
    <div class="hero-content">
      <span class="hero-category">דשנים טבעיים · Natural Fertilizers</span>
      <h1 itemprop="headline">תה קומפוסט</h1>
      <div class="hero-en">Compost Tea — The Living Brew</div>
      <div class="hero-meta">
        <span>⏱ קריאה: 6 דקות</span>
        <span>🌱 רמה: מתחיל</span>
        <span>📅 עונה: כל השנה</span>
      </div>
    </div>
    <div class="hero-img-wrap">
      <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — המדריך הביודינמי של גינה חיה" itemprop="image">
      <div class="hero-img-ring"></div>
    </div>
  </header>

  <div class="body">

    <!-- INTRO -->
    <p class="intro" itemprop="description">
      תה קומפוסט הוא אחד הדשנים הטבעיים הפשוטים והאפקטיביים ביותר שאפשר להכין בבית.
      הרעיון פשוט — להפוך את החיידקים הטובים מהקומפוסט שלך למשקה חי, עשיר בחיים,
      שהצמחים שלך ישמחו לשתות.
    </p>

    <!-- SECTION 1 -->
    <div class="section">
      <div class="section-head">
        <div class="section-num">א</div>
        <h2>מה זה בכלל תה קומפוסט?</h2>
        <span class="section-en">What is compost tea?</span>
      </div>
      <hr class="divider">
      <p class="p">
        בניגוד לדשן כימי שמספק לצמח מזון ישיר, <strong>תה קומפוסט הוא מנוע חיים</strong> —
        הוא מביא לאדמה שלך מיליארדי חיידקים, פטריות ואורגניזמים מועילים שבונים את
        המערכת האקולוגית של הקרקע. הקרקע החיה הזו היא שמזינה את הצמח לאורך זמן.
      </p>
      <p class="p">
        התוצאות: ספיגת מזון טובה יותר, עמידות גבוהה יותר למחלות, ופריחה שופעת יותר —
        הכל בלי כימיקלים ובלי הוצאות גדולות.
      </p>
    </div>

    <div class="chupchu">
      <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
      <div class="chupchu-inner">
        <div class="chupchu-name">צ'ופצ'ו אומר:</div>
        <div class="chupchu-text">
          כשצנחתי לתוך העץ שלי, הבנתי משהו — הקרקע מתחת לשורשים היא יקום שלם בפני עצמו.
          תה קומפוסט זה כמו להזמין את כל הגלקסיה הזו לבקר גם אצל הצמחים שלך.
        </div>
      </div>
    </div>

    <!-- SECTION 2 -->
    <div class="section">
      <div class="section-head">
        <div class="section-num">ב</div>
        <h2>מה צריך — הרכיבים</h2>
        <span class="section-en">Ingredients</span>
      </div>
      <hr class="divider">
      <div class="ingredients">
        <div class="ing"><div class="ing-dot"></div><span class="ing-name">קומפוסט בשל</span><span class="ing-qty">2–3 כוסות</span></div>
        <div class="ing"><div class="ing-dot"></div><span class="ing-name">מים ללא כלור</span><span class="ing-qty">10 ליטר</span></div>
        <div class="ing"><div class="ing-dot"></div><span class="ing-name">מלסה או דבש</span><span class="ing-qty">1–2 כפות</span></div>
        <div class="ing"><div class="ing-dot"></div><span class="ing-name">משאבת אקווריום</span><span class="ing-qty">24–36 שעות</span></div>
        <div class="ing"><div class="ing-dot"></div><span class="ing-name">שקית גרב / בד גזה</span><span class="ing-qty">לסינון</span></div>
        <div class="ing"><div class="ing-dot"></div><span class="ing-name">דלי 10–20 ליטר</span><span class="ing-qty">כלי ההכנה</span></div>
      </div>
      <div class="warning">
        <div class="warning-title">⚠ חשוב — מי ברז</div>
        <div class="warning-body">
          מי ברז מכילים כלור שהורג את החיידקים הטובים.
          השאירו דלי מים פתוח ללילה שלם לפני ההכנה,
          או השתמשו במים מסוננים / גשם.
        </div>
      </div>
    </div>

    <!-- SECTION 3 -->
    <div class="section">
      <div class="section-head">
        <div class="section-num">ג</div>
        <h2>הכנה — שלב אחר שלב</h2>
        <span class="section-en">Step by step</span>
      </div>
      <hr class="divider">
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-body">
            <div class="step-title">מכינים את הבסיס</div>
            <div class="step-desc">שמים קומפוסט בשל בתוך שקית גרב ישנה או בד גזה — זה יקל על הסינון בסוף. מניחים בתוך הדלי עם מים ללא כלור.</div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-body">
            <div class="step-title">מוסיפים מזון לחיידקים</div>
            <div class="step-desc">כף-שתיים של מלסה שחורה או דבש. זה הסוכר שיגרום לחיידקים להתרבות פי עשרות תוך שעות ספורות.</div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-body">
            <div class="step-title">האוויר — הסוד האמיתי</div>
            <div class="step-desc">מחברים משאבת אקווריום קטנה ומשאירים 24–36 שעות. האוויר מייצר חיידקים אירוביים — אלה שאתה רוצה. בלי אוויר? מקבלים חיידקים אנאירוביים שמריחים רע ועלולים להזיק לצמחים.</div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <div class="step-body">
            <div class="step-title">מסננים ומשתמשים מיד</div>
            <div class="step-desc">מסננים את הקומפוסט ומשתמשים בתה <strong>תוך 4 שעות</strong> מרגע כיבוי המשאבה. החיידקים חיים ורוצים להגיע לאדמה בזמן.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="chupchu">
      <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
      <div class="chupchu-inner">
        <div class="chupchu-name">טיפ של צ'ופצ'ו:</div>
        <div class="chupchu-text">
          הרחתי פעם תה קומפוסט שעמד יותר מדי — ריח כמו ביצה רקובה.
          זה אומר שהלך לכיוון הלא נכון.
          תה טוב מריח כמו אדמה לאחר גשם. תמיד תרח לפני שמשתמשים!
        </div>
      </div>
    </div>

    <!-- SECTION 4 -->
    <div class="section">
      <div class="section-head">
        <div class="section-num">ד</div>
        <h2>איך ומתי משתמשים</h2>
        <span class="section-en">How &amp; when to apply</span>
      </div>
      <hr class="divider">
      <div class="tips">
        <div class="tip">
          <span class="tip-icon">💧</span>
          <div class="tip-title">השקיה לאדמה</div>
          <div class="tip-body">מדללים 1:5 עם מים ומשקים ישירות לאדמה. מחזק את אוכלוסיית החיידקים בשורשים.</div>
        </div>
        <div class="tip">
          <span class="tip-icon">🌿</span>
          <div class="tip-title">ריסוס עלים</div>
          <div class="tip-body">מסננים טוב מאוד ומרססים בבוקר מוקדם לפני שהשמש חזקה. עוזר גם נגד פטריות עליים.</div>
        </div>
        <div class="tip">
          <span class="tip-icon">📅</span>
          <div class="tip-title">מחזוריות מומלצת</div>
          <div class="tip-body">כל 2–3 שבועות בעונת הגדילה. לפי הלוח הביודינמי — ביום פרי או פרח לתוצאות מיטביות.</div>
        </div>
        <div class="tip">
          <span class="tip-icon">🌱</span>
          <div class="tip-title">לשתלים צעירים</div>
          <div class="tip-body">דילול גבוה יותר — 1:10. שתלים רגישים לריכוז גבוה של חומרים אורגניים.</div>
        </div>
      </div>
    </div>

    <!-- SECTION 5 -->
    <div class="section">
      <div class="section-head">
        <div class="section-num">ה</div>
        <h2>מתאים במיוחד לצמחים אלה</h2>
        <span class="section-en">Best results with</span>
      </div>
      <hr class="divider">
      <div class="plants">
        <span class="plant">עגבניות</span>
        <span class="plant">מלפפונים</span>
        <span class="plant">פלפלים</span>
        <span class="plant">חציל</span>
        <span class="plant">עצי פרי</span>
        <span class="plant">תותים</span>
        <span class="plant">פרחים שנתיים</span>
        <span class="plant">עשבי תיבול</span>
        <span class="plant">דלועים</span>
        <span class="plant">ורדים</span>
      </div>
    </div>

    <!-- SECTION 6 — FAQ -->
    <div class="section">
      <div class="section-head">
        <div class="section-num">ו</div>
        <h2>שאלות נפוצות</h2>
        <span class="section-en">FAQ</span>
      </div>
      <hr class="divider">
      <div class="faq">
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">
            <span>כמה זמן אפשר לשמור את התה?</span>
            <span class="faq-arrow">▼</span>
          </div>
          <div class="faq-a">לא ניתן לשמור — יש להשתמש תוך 4 שעות מכיבוי המשאבה. לאחר מכן החיידקים מתים ויכולים לייצר תרכובות מזיקות.</div>
        </div>
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">
            <span>מה קורה אם אין לי קומפוסט בשל?</span>
            <span class="faq-arrow">▼</span>
          </div>
          <div class="faq-a">קומפוסט לא בשל יכול להזיק לצמחים. ניתן לקנות קומפוסט מוכן מחנויות גינון כחלופה עד שהקומפוסט שלך יהיה מוכן.</div>
        </div>
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">
            <span>האם תה קומפוסט מחליף דישון רגיל?</span>
            <span class="faq-arrow">▼</span>
          </div>
          <div class="faq-a">לא בדיוק — הוא מחזק את החיים בקרקע, אבל צמחים עם צורכי מזון גבוהים (כמו עגבניות) עדיין יזדקקו לדישון נוסף. חשבו עליו כתוסף, לא כתחליף מלא.</div>
        </div>
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">
            <span>מתי הזמן הטוב ביותר לפי הלוח הביודינמי?</span>
            <span class="faq-arrow">▼</span>
          </div>
          <div class="faq-a">ימי פרח וימי פרי — אלה הזמנים שבהם הצמח הכי קולט מזון ולחות. פתחו את גינה חיה לפני שמתחילים להכין.</div>
        </div>
      </div>
    </div>

    <div class="chupchu">
      <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
      <div class="chupchu-inner">
        <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
        <div class="chupchu-text">
          הלוח הביודינמי אומר שיש ימים שבהם הצמח "שותה" טוב יותר.
          ימי פרח וימי פרי הם הזמן האידאלי לתה הקומפוסט שלך —
          פתח את גינה חיה לפני שאתה מתחיל להכין!
        </div>
      </div>
    </div>

    <!-- RELATED ARTICLES -->
    <div class="related">
      <div class="related-title">מאמרים קשורים</div>
      <div class="related-links">
        <a class="related-link" href="#">ריסוס אצות ים — איך ומתי</a>
        <a class="related-link" href="#">ערימת קומפוסט — המדריך המלא</a>
        <a class="related-link" href="#">הלוח הביודינמי — מה זה ואיך משתמשים</a>
        <a class="related-link" href="#">BD 500 — קרן הזבל</a>
      </div>
    </div>

  </div>

  <!-- FOOTER CTA -->
  <footer class="footer-cta">
    <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה">
    <div class="footer-text">
      רוצה לדעת מהו היום הביודינמי הנכון להשקות עם תה קומפוסט?<br>
      <em>Want to know the right biodynamic day to apply your brew?</em>
    </div>
    <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
  </footer>

</article>

<script>
function toggleFaq(el){
  el.classList.toggle('open');
}
</script>`,
  },
  {
    id: 'seaweed-spray',
    titleHe: 'ריסוס אצות ים',
    titleEn: 'Seaweed Spray — The Ocean\'s Gift',
    metaDescriptionHe: 'כך תשתמשו בריסוס אצות ים כדי לחזק צמחים, לשפר עמידות ולעודד צמיחה מאוזנת בגינה.',
    metaDescriptionEn: 'Learn how seaweed spray supports plant vitality, resilience, and balanced growth in the garden.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: '02_ריסוס_אצות_ים.md',
    filenameEn: '02_seaweed_spray.md',
    publishedAt: '2026-04-08',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --ocean:#0a3d4a;
  --ocean-mid:#1a5c6e;
  --ocean-light:#2d8a9e;
  --foam:#e8f4f7;
  --foam-dark:#c2dde5;
  --salt:#f0f8fa;
  --kelp:#1a4a2e;
  --kelp-light:#2d7a4a;
  --brine:#7ab8c8;
  --amber:#c8851a;
  --rust:#8b4a1a;
  font-family:'Source Sans 3',sans-serif;
  background:var(--salt);
  color:var(--ocean);
}
.hero{
  background:var(--ocean);
  padding:3rem 2.5rem 0;
  position:relative;
  overflow:hidden;
}
.hero-waves{
  display:flex;
  align-items:flex-end;
  gap:2rem;
}
.hero-content{flex:1;padding-bottom:2rem;}
.hero-tag{
  display:inline-block;
  background:var(--ocean-light);
  color:#c8eef5;
  font-size:10px;font-weight:600;
  letter-spacing:0.14em;text-transform:uppercase;
  padding:3px 11px;border-radius:2px;
  margin-bottom:1rem;
}
.hero h1{
  font-family:'Playfair Display',serif;
  font-size:2.6rem;font-weight:700;
  color:#e8f4f7;line-height:1.1;
  margin-bottom:0.35rem;
  direction:rtl;
}
.hero-en{
  font-family:'Playfair Display',serif;
  font-size:0.95rem;font-style:italic;
  color:var(--brine);margin-bottom:1.25rem;
}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#5a9aaa;font-weight:300;}
.hero-img-wrap{flex-shrink:0;position:relative;align-self:flex-end;}
.hero-img{
  width:130px;height:130px;
  border-radius:50% 50% 0 0;
  object-fit:cover;object-position:center 18%;
  border:2px solid rgba(45,138,158,0.5);
  display:block;
}
.wave-bar{
  height:32px;background:var(--salt);
  border-radius:50% 50% 0 0 / 100% 100% 0 0;
  margin-top:-1px;
}
.body{padding:0 2.5rem;}
.intro{
  font-family:'Playfair Display',serif;
  font-size:1.05rem;line-height:1.85;
  color:var(--ocean-mid);
  border-right:3px solid var(--ocean-light);
  padding:0.25rem 1.1rem;
  margin:1.75rem 0;
  direction:rtl;
}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{
  width:26px;height:26px;border-radius:50%;
  background:var(--ocean);color:var(--foam);
  font-family:'Playfair Display',serif;font-size:12px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.sh h2{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--ocean);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--brine);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(45,138,158,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--ocean-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ocean);font-weight:600;}
.benefits{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.benefit{
  background:var(--foam);
  border:1px solid rgba(45,138,158,0.2);
  border-top:3px solid var(--ocean-light);
  border-radius:0 0 7px 7px;
  padding:12px 14px;direction:rtl;
}
.benefit-icon{font-size:1.3rem;margin-bottom:5px;display:block;}
.benefit-title{font-size:0.88rem;font-weight:600;color:var(--ocean);margin-bottom:3px;}
.benefit-body{font-size:0.8rem;color:var(--ocean-mid);line-height:1.55;}
.recipe-box{
  background:var(--ocean);
  border-radius:10px;
  padding:1.25rem 1.5rem;
  margin:1.25rem 0;
  direction:rtl;
}
.recipe-title{font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--brine);margin-bottom:1rem;}
.recipe-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);}
.recipe-row:last-child{border-bottom:none;}
.recipe-dot{width:6px;height:6px;border-radius:50%;background:var(--ocean-light);flex-shrink:0;}
.recipe-name{font-size:0.9rem;color:#c8eef5;}
.recipe-qty{font-size:0.8rem;color:var(--brine);margin-right:auto;font-weight:300;}
.chupchu{
  background:var(--foam);
  border:1px solid rgba(45,138,158,0.3);
  border-radius:10px;
  padding:1rem 1.2rem;
  margin:1.75rem 0;
  display:flex;gap:0.9rem;
  align-items:flex-start;direction:rtl;
}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(45,138,158,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--ocean-light);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ocean-mid);}
.timing{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:1.25rem 0;}
.timing-card{
  background:var(--foam-dark);
  border-radius:8px;padding:12px;
  text-align:center;direction:rtl;
}
.timing-val{font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:var(--ocean);display:block;}
.timing-lbl{font-size:0.75rem;color:var(--ocean-mid);font-weight:300;margin-top:2px;}
.warning{background:#fff8f2;border-right:3px solid var(--rust);border-radius:0 7px 7px 0;padding:12px 16px;margin:1.25rem 0;direction:rtl;}
.warning-title{font-size:0.88rem;font-weight:600;color:var(--rust);margin-bottom:4px;}
.warning-body{font-size:0.85rem;color:var(--ocean-mid);line-height:1.65;}
.plants{display:flex;gap:8px;flex-wrap:wrap;margin:0.75rem 0;direction:rtl;}
.plant{background:var(--kelp);color:#c8e8d5;font-size:0.82rem;padding:4px 14px;border-radius:20px;}
.related{background:var(--foam-dark);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--ocean);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--kelp-light);text-decoration:none;}
.related-link::before{content:'←';color:var(--ocean-light);font-size:12px;}
.footer-cta{
  background:var(--ocean);
  padding:2rem 2.5rem;
  display:flex;align-items:center;gap:1.5rem;
  direction:rtl;margin-top:3rem;
}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(45,138,158,0.5);flex-shrink:0;}
.footer-text{font-family:'Playfair Display',serif;font-size:0.92rem;line-height:1.7;color:var(--brine);flex:1;}
.footer-text em{font-size:0.8rem;color:#4a8a9a;font-style:normal;}
.footer-btn{display:inline-block;background:var(--ocean-light);color:#e8f4f7;font-size:0.8rem;font-weight:600;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){
  .hero h1{font-size:1.9rem;}
  .hero-img-wrap{display:none;}
  .body{padding:0 1.5rem;}
  .benefits{grid-template-columns:1fr;}
  .timing{grid-template-columns:1fr 1fr;}
  .footer-cta{flex-direction:column;padding:1.5rem;}
}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-waves">
    <div class="hero-content">
      <span class="hero-tag">דשנים טבעיים · Natural Fertilizers</span>
      <h1 itemprop="headline">ריסוס אצות ים</h1>
      <div class="hero-en">Seaweed Spray — The Ocean's Gift</div>
      <div class="hero-meta">
        <span>קריאה: 5 דקות</span>
        <span>רמה: מתחיל</span>
        <span>עונה: כל השנה</span>
      </div>
    </div>
    <div class="hero-img-wrap">
      <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
    </div>
  </div>
  <div class="wave-bar"></div>
</header>
<div class="body">
  <p class="intro" itemprop="description">
    האוקיינוס מכיל למעלה מ-60 מינרלים ואלמנטים קורט שהצמח שלך כמעט לא מקבל מהאדמה. ריסוס אצות ים הוא הדרך הפשוטה ביותר לתת לצמחים שלך את כל העושר הזה — ישירות על העלים.
  </p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>למה אצות ים?</h2><span class="sh-en">Why seaweed?</span></div>
    <hr class="div">
    <p class="p">אצות ים הן מהאורגניזמים הרב-תכליתיים ביותר בטבע. הן גדלות ללא אדמה, סופגות מינרלים ישירות ממי הים, ומכילות <strong>ציטוקינינים, אוקסינים וגיברלינים</strong> — הורמוני גדילה טבעיים שמגרים את הצמח ממש כמו מינון אנרגיה.</p>
    <p class="p">בניגוד לדשנים כימיים שמגיעים בכמויות גדולות, ריסוס אצות עובד בכמויות זעירות — מעט מאוד עושה הרבה מאוד.</p>
  </div>
  <div class="benefits">
    <div class="benefit"><span class="benefit-icon">🌿</span><div class="benefit-title">עלים מבריקים ובריאים</div><div class="benefit-body">הכלורופיל מתחזק, העלים מתכהים ומתעבים.</div></div>
    <div class="benefit"><span class="benefit-icon">💪</span><div class="benefit-title">עמידות למחלות</div><div class="benefit-body">מחזק את דפנות התא, מקשה על חדירת פטריות.</div></div>
    <div class="benefit"><span class="benefit-icon">🌱</span><div class="benefit-title">שורשים עמוקים יותר</div><div class="benefit-body">הציטוקינינים מגרים צמיחת שורש ראשוני.</div></div>
    <div class="benefit"><span class="benefit-icon">🌡</span><div class="benefit-title">עמידות לקיצוניות</div><div class="benefit-body">עוזר לצמח לעמוד בחום, קור ויובש.</div></div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הגלובוס בחזה שלי מלמד אותי — 70% מהכדור שלנו הוא ים. הצמחים שלך יודעים את זה גם. תנו להם לטעום ממנו.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>הכנת תמיסת הריסוס</h2><span class="sh-en">How to prepare</span></div>
    <hr class="div">
    <div class="recipe-box">
      <div class="recipe-title">מתכון בסיסי — 10 ליטר</div>
      <div class="recipe-row"><div class="recipe-dot"></div><span class="recipe-name">אצות ים מיובשות / אבקת אצות</span><span class="recipe-qty">2–3 כפות</span></div>
      <div class="recipe-row"><div class="recipe-dot"></div><span class="recipe-name">מים ללא כלור</span><span class="recipe-qty">10 ליטר</span></div>
      <div class="recipe-row"><div class="recipe-dot"></div><span class="recipe-name">השרייה</span><span class="recipe-qty">24–48 שעות</span></div>
      <div class="recipe-row"><div class="recipe-dot"></div><span class="recipe-name">סינון דק לפני ריסוס</span><span class="recipe-qty">חובה</span></div>
    </div>
    <p class="p">אפשר גם להשתמש במוצרי אצות מרוכזים מחנות הגינון — מדללים לפי הוראות היצרן, בדרך כלל 1:500 עד 1:1000.</p>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>זמן ותדירות</h2><span class="sh-en">Timing</span></div>
    <hr class="div">
    <div class="timing">
      <div class="timing-card"><span class="timing-val">7:00</span><div class="timing-lbl">שעת ריסוס מועדפת — לפני שהשמש חזקה</div></div>
      <div class="timing-card"><span class="timing-val">14 י'</span><div class="timing-lbl">מחזוריות בעונת גדילה</div></div>
      <div class="timing-card"><span class="timing-val">3×</span><div class="timing-lbl">מינימום בעונה לתוצאות</div></div>
    </div>
    <div class="warning">
      <div class="warning-title">אל תרססו בצהריים</div>
      <div class="warning-body">שמש חזקה + עלים רטובים = כוויות עלים. תמיד בבוקר מוקדם או בשעות הערב.</div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">טיפ של צ'ופצ'ו:</div>
      <div class="chupchu-text">שילוב מנצח — ריסוס אצות ים ביום עלה לפי הלוח הביודינמי. העלים בשיא הקליטה שלהם בדיוק בזמן הזה.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ד</div><h2>מתאים במיוחד ל</h2><span class="sh-en">Best for</span></div>
    <hr class="div">
    <div class="plants">
      <span class="plant">עשבי תיבול</span><span class="plant">ירקות עלים</span><span class="plant">תותים</span>
      <span class="plant">פרחים</span><span class="plant">שתלים צעירים</span><span class="plant">עצי הדר</span>
      <span class="plant">גפן</span><span class="plant">ורדים</span>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט — המדריך המלא</a>
      <a class="related-link" href="/articles/green-manure">דשן ירוק — מה זה ואיך עושים</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי — ימי עלה ופרח</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">
    רוצה לדעת מהו יום העלה הבא לפי הלוח הביודינמי?<br>
    <em>Find the perfect biodynamic leaf day for your seaweed spray.</em>
  </div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'green-manure',
    titleHe: 'דשן ירוק',
    titleEn: 'Green Manure — Grow to Give Back',
    metaDescriptionHe: 'כך משתמשים בדשן ירוק כדי לשפר פוריות, מבנה קרקע וחיוניות של הערוגה לאורך זמן.',
    metaDescriptionEn: 'Learn how green manure improves soil fertility, structure, and long-term garden health naturally.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: '03_דשן_ירוק.md',
    filenameEn: '03_green_manure.md',
    publishedAt: '2026-04-08',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --forest:#1a3a1e;
  --forest-mid:#2d5c32;
  --forest-light:#4a8a50;
  --leaf:#6ab870;
  --leaf-pale:#c8e8ca;
  --meadow:#f2f7f2;
  --meadow-dark:#ddeedd;
  --soil:#3d2a0e;
  --soil-light:#7a5c3a;
  --gold:#b8940a;
  --rust:#8b3a1a;
  font-family:'IBM Plex Sans',sans-serif;
  background:var(--meadow);
  color:var(--forest);
}
.hero{
  background:var(--forest);
  padding:3rem 2.5rem 2.5rem;
  position:relative;
  display:flex;align-items:center;gap:2rem;
  overflow:hidden;
}
.hero::after{
  content:'';
  position:absolute;bottom:0;left:0;right:0;height:4px;
  background:repeating-linear-gradient(90deg,var(--forest-light) 0,var(--forest-light) 8px,transparent 8px,transparent 16px);
}
.hero-content{flex:1;}
.hero-tag{display:inline-block;background:var(--forest-light);color:#d0f0d2;font-size:10px;font-weight:500;letter-spacing:0.13em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:1rem;}
.hero h1{font-family:'Merriweather',serif;font-size:2.6rem;font-weight:700;color:#e8f5e8;line-height:1.1;margin-bottom:0.35rem;direction:rtl;}
.hero-en{font-family:'Merriweather',serif;font-size:0.95rem;font-style:italic;color:var(--leaf);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#5a8a5e;font-weight:300;}
.hero-img{width:140px;height:140px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid rgba(74,138,80,0.5);flex-shrink:0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Merriweather',serif;font-size:1.02rem;line-height:1.9;color:var(--forest-mid);border-right:3px solid var(--forest-light);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--forest);color:var(--leaf-pale);font-family:'Merriweather',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Merriweather',serif;font-size:1.2rem;font-weight:700;color:var(--forest);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--forest-light);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(74,138,80,0.25);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--forest-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--forest);font-weight:500;}
.plants-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.plant-card{background:white;border:1px solid rgba(74,138,80,0.2);border-radius:8px;padding:12px 14px;direction:rtl;border-right:4px solid var(--forest-light);}
.plant-name{font-size:0.9rem;font-weight:500;color:var(--forest);margin-bottom:3px;}
.plant-why{font-size:0.8rem;color:var(--forest-light);line-height:1.5;}
.plant-season{font-size:0.72rem;color:var(--soil-light);font-weight:300;margin-top:4px;}
.timeline{display:flex;flex-direction:column;gap:0;margin:1.25rem 0;position:relative;}
.timeline::before{content:'';position:absolute;right:17px;top:20px;bottom:20px;width:2px;background:var(--leaf-pale);}
.tl-item{display:flex;gap:14px;align-items:flex-start;padding:10px 0;direction:rtl;position:relative;z-index:1;}
.tl-dot{width:34px;height:34px;border-radius:50%;background:var(--forest-mid);color:white;font-size:0.75rem;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.tl-body{padding-top:4px;}
.tl-title{font-size:0.9rem;font-weight:500;color:var(--forest);margin-bottom:2px;}
.tl-desc{font-size:0.82rem;color:var(--forest-light);line-height:1.6;}
.chupchu{background:var(--meadow-dark);border:1px solid rgba(74,138,80,0.3);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(74,138,80,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--forest-mid);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--forest-mid);}
.npk-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:1.25rem 0;}
.npk-card{background:var(--forest);border-radius:8px;padding:14px;text-align:center;}
.npk-val{font-family:'Merriweather',serif;font-size:1.5rem;font-weight:700;color:var(--leaf);display:block;}
.npk-lbl{font-size:0.72rem;color:#5a8a5e;margin-top:2px;}
.npk-name{font-size:0.8rem;color:#a8d0aa;margin-top:4px;}
.warning{background:#fff8f2;border-right:3px solid var(--rust);border-radius:0 7px 7px 0;padding:12px 16px;margin:1.25rem 0;direction:rtl;}
.warning-title{font-size:0.88rem;font-weight:500;color:var(--rust);margin-bottom:4px;}
.warning-body{font-size:0.85rem;color:var(--forest-mid);line-height:1.65;}
.related{background:var(--meadow-dark);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Merriweather',serif;font-size:1rem;font-weight:700;color:var(--forest);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--forest-light);text-decoration:none;}
.related-link::before{content:'←';color:var(--forest-mid);font-size:12px;}
.footer-cta{background:var(--forest);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(74,138,80,0.5);flex-shrink:0;}
.footer-text{font-family:'Merriweather',serif;font-size:0.9rem;line-height:1.7;color:var(--leaf);flex:1;}
.footer-text em{font-size:0.78rem;color:#4a7a4e;font-style:normal;}
.footer-btn{display:inline-block;background:var(--forest-light);color:#e8f5e8;font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero{flex-direction:column;}.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.plants-grid{grid-template-columns:1fr;}.npk-row{grid-template-columns:1fr 1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-content">
    <span class="hero-tag">דשנים טבעיים · Natural Fertilizers</span>
    <h1 itemprop="headline">דשן ירוק</h1>
    <div class="hero-en">Green Manure — Grow to Give Back</div>
    <div class="hero-meta"><span>קריאה: 8 דקות</span><span>רמה: מתחיל–בינוני</span><span>עונה: סתיו–אביב</span></div>
  </div>
  <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
</header>
<div class="body">
  <p class="intro" itemprop="description">
    דשן ירוק הוא הרעיון הפשוט והגאוני ביותר בגינה ביודינמית — גדלים צמחים מיוחדים שכל מטרתם היא לחזור לאדמה. הם מתים כדי שהאדמה תחיה.
  </p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>מה זה בעצם?</h2><span class="sh-en">What is green manure?</span></div>
    <hr class="div">
    <p class="p">דשן ירוק הוא גידול מכוון של צמחים <strong>שלא מיועדים לאכילה</strong> — הם גדלים, ואז נחרשים חזרה לאדמה בעודם ירוקים. הם פועלים בשלוש רמות במקביל: מוסיפים חומר אורגני, מקבעים חנקן מהאוויר, ומשפרים את מבנה הקרקע.</p>
    <p class="p">בגינה ביודינמית, דשן ירוק הוא גם "תרופה לאדמה" — כל צמח בוחר לפי מה שהאדמה חסרה.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">כשצנחתי לתוך העץ שלי, ראיתי שגם עצים מתים — הם פשוט הופכים לאדמה חדשה. דשן ירוק הוא אותו רעיון, רק מהיר יותר.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>הצמחים הכי טובים לדשן ירוק</h2><span class="sh-en">Best plants to use</span></div>
    <hr class="div">
    <div class="plants-grid">
      <div class="plant-card">
        <div class="plant-name">פול מצרי</div>
        <div class="plant-why">מקבע חנקן מהאוויר — אחד הטובים ביותר</div>
        <div class="plant-season">זריעה: אוקטובר–נובמבר</div>
      </div>
      <div class="plant-card">
        <div class="plant-name">לוביה</div>
        <div class="plant-why">צומחת מהר, שורשים עמוקים, מינרלים רבים</div>
        <div class="plant-season">זריעה: מרץ–אפריל</div>
      </div>
      <div class="plant-card">
        <div class="plant-name">חרדל</div>
        <div class="plant-why">מדכא עשבים שוטים, חיטוי קרקע טבעי</div>
        <div class="plant-season">זריעה: ספטמבר–פברואר</div>
      </div>
      <div class="plant-card">
        <div class="plant-name">פציליה</div>
        <div class="plant-why">פרחים יפים, מפרה דבורים, נחרש בקלות</div>
        <div class="plant-season">זריעה: ספטמבר–ינואר</div>
      </div>
      <div class="plant-card">
        <div class="plant-name">שיפון</div>
        <div class="plant-why">מונע סחיפת קרקע, שורשים שבירי מבנה</div>
        <div class="plant-season">זריעה: נובמבר–ינואר</div>
      </div>
      <div class="plant-card">
        <div class="plant-name">בקיה</div>
        <div class="plant-why">קטנית מצוינת, חנקן גבוה, צומחת מהר</div>
        <div class="plant-season">זריעה: אוקטובר–דצמבר</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>מה קורה בקרקע?</h2><span class="sh-en">Soil science</span></div>
    <hr class="div">
    <div class="npk-row">
      <div class="npk-card"><span class="npk-val">N</span><div class="npk-lbl">חנקן</div><div class="npk-name">קטניות מקבעות ישירות מהאוויר</div></div>
      <div class="npk-card"><span class="npk-val">P</span><div class="npk-lbl">זרחן</div><div class="npk-name">שורשים עמוקים מוציאים מהסלע</div></div>
      <div class="npk-card"><span class="npk-val">K</span><div class="npk-lbl">אשלגן</div><div class="npk-name">חומר אורגני מפרק ומשחרר</div></div>
    </div>
    <p class="p">הקטניות (פול, לוביה, בקיה) עובדות עם חיידקי <strong>ריזוביום</strong> בשורשיהן — יחד הן קובעות חנקן מהאוויר ומכניסות אותו לאדמה בחינם.</p>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ד</div><h2>תזמון וביצוע</h2><span class="sh-en">How &amp; when</span></div>
    <hr class="div">
    <div class="timeline">
      <div class="tl-item"><div class="tl-dot">1</div><div class="tl-body"><div class="tl-title">זורעים בתחילת הסתיו</div><div class="tl-desc">מיד אחרי קציר הקיץ — האדמה עדיין חמה, הצמחים צומחים מהר.</div></div></div>
      <div class="tl-item"><div class="tl-dot">2</div><div class="tl-body"><div class="tl-title">מניחים לגדול 6–10 שבועות</div><div class="tl-desc">עד לפני פריחה — ברגע שהפרח מתחיל, הצמח מעביר אנרגיה לזרע ולא לעלה.</div></div></div>
      <div class="tl-item"><div class="tl-dot">3</div><div class="tl-body"><div class="tl-title">חורשים / קוצרים ומניחים</div><div class="tl-desc">אפשר לחרוש עם מעדר ידני או פשוט לקצור ולהניח על פני האדמה כמולץ'.</div></div></div>
      <div class="tl-item"><div class="tl-dot">4</div><div class="tl-body"><div class="tl-title">ממתינים 3–4 שבועות</div><div class="tl-desc">הצמח מתפרק, האדמה מתחממת. רק אז שותלים את הגידול הבא.</div></div></div>
    </div>
    <div class="warning">
      <div class="warning-title">אל תשתלו מיד אחרי</div>
      <div class="warning-body">חומר ירוק טרי מתפרק ועלול לשרוף שורשים עדינים. תמיד ממתינים לפחות 3 שבועות לפני שתילה חדשה.</div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">לפי הלוח הביודינמי — יום שורש הוא הזמן הכי טוב לחרוש דשן ירוק. האדמה קולטת טוב יותר ביום הזה. פתח את גינה חיה לבדוק!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט — המדריך המלא</a>
      <a class="related-link" href="/articles/compost-pile">ערימת קומפוסט — איך בונים</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי — ימי שורש</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">
    מתי יום השורש הבא לחרוש את הדשן הירוק שלך?<br>
    <em>Check the biodynamic root day for your green manure work.</em>
  </div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'diluted-urine',
    titleHe: 'שתן מדולל',
    titleEn: 'Diluted Urine — The Alchemist\'s Fertilizer',
    metaDescriptionHe: 'שתן אנושי מדולל הוא אחד מדשני החנקן הטהורים והמיידיים ביותר בטבע — פשוט, חינמי, ואפקטיבי.',
    metaDescriptionEn: 'Diluted human urine is one of the purest and most immediately available nitrogen fertilizers in nature — simple, free, and effective.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: '21_שתן_מדולל.md',
    filenameEn: '21_diluted_urine.md',
    publishedAt: '2026-04-11',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --gold:#8a6a0a;
  --gold-bright:#c8980a;
  --gold-pale:#f5e8c0;
  --gold-deep:#4a3800;
  --ivory:#faf6ec;
  --ivory-dark:#f0e8d0;
  --ink:#1a1408;
  --ink-mid:#3d2e10;
  --ink-light:#7a6030;
  --copper:#8b4a1a;
  --sage:#3a5a30;
  font-family:'Jost',sans-serif;
  background:var(--ivory);
  color:var(--ink);
}
.hero{
  background:var(--gold-deep);
  padding:3rem 2.5rem 2.5rem;
  position:relative;
  display:flex;align-items:center;gap:2rem;
}
.hero::before{
  content:'';position:absolute;
  top:0;left:0;right:0;bottom:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.03) 28px,rgba(255,255,255,0.03) 29px);
  pointer-events:none;
}
.hero-content{flex:1;position:relative;z-index:1;}
.hero-tag{display:inline-block;background:rgba(200,152,10,0.3);color:#e8c870;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:1rem;border:1px solid rgba(200,152,10,0.4);}
.hero h1{font-family:'Cormorant Garamond',serif;font-size:3rem;font-weight:600;color:#f5e8c0;line-height:1.05;margin-bottom:0.35rem;direction:rtl;}
.hero-en{font-family:'Cormorant Garamond',serif;font-size:1rem;font-style:italic;color:#c8980a;margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#7a6030;font-weight:300;}
.hero-img-wrap{position:relative;z-index:1;flex-shrink:0;}
.hero-img{width:130px;height:130px;border-radius:50%;object-fit:cover;object-position:center 18%;border:1px solid rgba(200,152,10,0.4);display:block;}
.hero-img-ring{position:absolute;inset:-10px;border-radius:50%;border:1px dashed rgba(200,152,10,0.2);pointer-events:none;}
.body{padding:0 2.5rem;}
.intro{font-family:'Cormorant Garamond',serif;font-size:1.15rem;line-height:1.85;color:var(--ink-mid);border-right:3px solid var(--gold-bright);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--gold-deep);color:var(--gold-pale);font-family:'Cormorant Garamond',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:600;color:var(--ink);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--ink-light);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(138,106,10,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.9;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ink);font-weight:500;}
.ratio-visual{display:flex;align-items:center;gap:0;margin:1.5rem 0;direction:rtl;}
.ratio-part{display:flex;flex-direction:column;align-items:center;padding:1.25rem;text-align:center;}
.ratio-num{font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:600;line-height:1;}
.ratio-lbl{font-size:0.75rem;font-weight:300;margin-top:4px;}
.ratio-divider{font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--gold-bright);padding:0 0.5rem;align-self:center;}
.ratio-urine{background:var(--gold-pale);border:1px solid rgba(138,106,10,0.3);border-radius:8px 0 0 8px;flex:1;}
.ratio-urine .ratio-num{color:var(--gold);}
.ratio-urine .ratio-lbl{color:var(--gold);}
.ratio-water{background:var(--ivory-dark);border:1px solid rgba(138,106,10,0.15);border-radius:0 8px 8px 0;border-right:none;flex:4;}
.ratio-water .ratio-num{color:#3a6a8a;}
.ratio-water .ratio-lbl{color:#3a6a8a;}
.facts{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:1.25rem 0;}
.fact{background:var(--ivory-dark);border-radius:8px;padding:14px;text-align:center;}
.fact-val{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:600;color:var(--gold);display:block;}
.fact-lbl{font-size:0.75rem;color:var(--ink-light);margin-top:3px;font-weight:300;}
.do-dont{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:1.25rem 0;}
.do{background:#f0f7f0;border:1px solid rgba(58,90,48,0.2);border-radius:8px;padding:14px;direction:rtl;}
.dont{background:#fff5f0;border:1px solid rgba(139,74,26,0.2);border-radius:8px;padding:14px;direction:rtl;}
.do-title{font-size:0.82rem;font-weight:500;color:var(--sage);margin-bottom:8px;}
.dont-title{font-size:0.82rem;font-weight:500;color:var(--copper);margin-bottom:8px;}
.do-item,.dont-item{font-size:0.82rem;color:var(--ink-mid);line-height:1.65;margin-bottom:4px;padding-right:10px;position:relative;}
.do-item::before{content:'✓';position:absolute;right:0;color:var(--sage);}
.dont-item::before{content:'✗';position:absolute;right:0;color:var(--copper);}
.chupchu{background:var(--ivory-dark);border:1px solid rgba(138,106,10,0.25);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(138,106,10,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--gold);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.history-box{background:var(--gold-deep);border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0;direction:rtl;}
.history-title{font-size:0.75rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold-bright);margin-bottom:0.75rem;}
.history-text{font-family:'Cormorant Garamond',serif;font-size:1rem;font-style:italic;line-height:1.8;color:#d4b860;}
.related{background:var(--ivory-dark);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--sage);text-decoration:none;}
.related-link::before{content:'←';color:var(--gold);font-size:12px;}
.footer-cta{background:var(--gold-deep);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,152,10,0.4);flex-shrink:0;}
.footer-text{font-family:'Cormorant Garamond',serif;font-size:0.95rem;line-height:1.7;color:var(--gold-pale);flex:1;}
.footer-text em{font-size:0.8rem;color:#7a6030;font-style:normal;}
.footer-btn{display:inline-block;background:var(--gold-bright);color:#1a1408;font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero{flex-direction:column;}.hero h1{font-size:2.2rem;}.hero-img-wrap{display:none;}.body{padding:0 1.5rem;}.facts{grid-template-columns:1fr 1fr;}.do-dont{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-content">
    <span class="hero-tag">דשנים טבעיים · Natural Fertilizers</span>
    <h1 itemprop="headline">שתן מדולל</h1>
    <div class="hero-en">Diluted Urine — The Alchemist's Fertilizer</div>
    <div class="hero-meta"><span>קריאה: 5 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
  </div>
  <div class="hero-img-wrap">
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
    <div class="hero-img-ring"></div>
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">
    הדשן החינמי, הזמין תמיד, שאנשים מתביישים לדבר עליו — אבל שהשתמשו בו בכל תרבות חקלאית בהיסטוריה. שתן אנושי מדולל הוא אחד מדשני החנקן הטהורים והמיידיים ביותר בטבע.
  </p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>המדע שמאחורי הקסם</h2><span class="sh-en">The science</span></div>
    <hr class="div">
    <p class="p">שתן בריא מכיל בעיקר <strong>אוריאה</strong> — תרכובת חנקן שהצמח הופך במהירות לאמוניום ולאחר מכן לניטראט, שהוא צורת החנקן הכי זמינה לצמח. בנוסף יש בו זרחן ואשלגן.</p>
    <div class="facts">
      <div class="fact"><span class="fact-val">11%</span><div class="fact-lbl">חנקן (N) — גבוה מאוד</div></div>
      <div class="fact"><span class="fact-val">1%</span><div class="fact-lbl">זרחן (P)</div></div>
      <div class="fact"><span class="fact-val">2.5%</span><div class="fact-lbl">אשלגן (K)</div></div>
    </div>
    <p class="p">ריכוז החנקן בשתן טרי גבוה ממרבית הדשנים האורגניים — לכן הדילול קריטי.</p>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>יחס הדילול — הכלל הזהוב</h2><span class="sh-en">The golden ratio</span></div>
    <hr class="div">
    <div class="ratio-visual">
      <div class="ratio-part ratio-urine"><span class="ratio-num">1</span><span class="ratio-lbl">שתן</span></div>
      <div class="ratio-divider">:</div>
      <div class="ratio-part ratio-water"><span class="ratio-num">10</span><span class="ratio-lbl">מים</span></div>
    </div>
    <p class="p">לשתילים עדינים — 1:20. לעצי פרי בוגרים ועגבניות — 1:7 אפשרי. כלל האצבע: יחס 1:10 עובד כמעט לכל צמח.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">כן, זה נשמע מוזר. אבל הרצינות של הגינאי נמדדת בנכונות שלו לנסות את מה שעובד — לא רק את מה שנוח לדבר עליו.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>עושים ואל תעשו</h2><span class="sh-en">Do and don't</span></div>
    <hr class="div">
    <div class="do-dont">
      <div class="do">
        <div class="do-title">כן לעשות</div>
        <div class="do-item">תמיד לדלל 1:10 לפחות</div>
        <div class="do-item">השקיה לאדמה, לא ריסוס עלים</div>
        <div class="do-item">שתן טרי — תוך שעה מהאיסוף</div>
        <div class="do-item">בבוקר לפני השמש</div>
        <div class="do-item">על ירקות עלים ועצי פרי</div>
      </div>
      <div class="dont">
        <div class="dont-title">אל תעשו</div>
        <div class="dont-item">על ירקות שאוכלים את השורש</div>
        <div class="dont-item">שתן מדולל ישן (מסריח)</div>
        <div class="dont-item">בקרבת קטיף — 3 שבועות לפחות</div>
        <div class="dont-item">אם נוטלים תרופות</div>
        <div class="dont-item">ריסוס ישיר על עלים</div>
      </div>
    </div>
  </div>
  <div class="history-box">
    <div class="history-title">מסורת עתיקה</div>
    <div class="history-text">בסין המסורתית, ביפן, בהודו ובאפריקה — שתן אנושי שימש חקלאים במשך אלפי שנים. בסקנדינביה ובאירופה כפרית נאסף בחביות מיוחדות לשדות. זה לא חדש — זה ישן מאוד.</div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">לפי הלוח הביודינמי — ביום פרי הצמח רוצה חנקן לפרות. זה הזמן המושלם לשתן מדולל. פתח גינה חיה לבדוק מתי היום הבא!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט — דשן נוזלי חי</a>
      <a class="related-link" href="/articles/seaweed-spray">ריסוס אצות ים — מינרלים מהאוקיינוס</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי — ימי פרי</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">
    רוצה לדעת מהו יום הפרי הבא לפי הלוח הביודינמי?<br>
    <em>Find the perfect biodynamic fruit day for your liquid fertilizer.</em>
  </div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'neem-oil',
    titleHe: 'שמן נים',
    titleEn: 'Neem Oil — Nature\'s Pesticide Laboratory',
    metaDescriptionHe: 'כך משתמשים בשמן נים בצורה נכונה כדי להפחית לחץ מזיקים בגינה בלי לפעול באגרסיביות מיותרת.',
    metaDescriptionEn: 'Learn how to use neem oil safely and effectively to reduce pest pressure in the garden.',
    categoryHe: 'הדברה',
    categoryEn: 'Pest Control',
    filenameHe: '04_שמן_נים.md',
    filenameEn: '04_neem_oil.md',
    publishedAt: '2026-04-08',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --bitter:#0d1f0e;
  --bitter-mid:#1a3a1c;
  --bitter-light:#2d5c30;
  --neem:#4a8a4e;
  --neem-pale:#c8e8ca;
  --clinical:#f4f9f4;
  --clinical-dark:#e0eee0;
  --white:#ffffff;
  --amber:#7a5a08;
  --rust:#8b2a1a;
  --acid:#c8d800;
  font-family:'Space Grotesk',sans-serif;
  background:var(--clinical);
  color:var(--bitter);
}
.hero{
  background:var(--bitter);
  padding:0;
  display:flex;
  min-height:200px;
}
.hero-left{
  background:var(--bitter-mid);
  width:8px;
  flex-shrink:0;
}
.hero-accent{
  background:var(--neem);
  width:4px;
  flex-shrink:0;
}
.hero-body{
  flex:1;
  padding:2.5rem 2.5rem 2.5rem 1.5rem;
  display:flex;
  align-items:center;
  gap:2rem;
}
.hero-content{flex:1;}
.hero-tag{display:inline-block;border:1px solid rgba(74,138,78,0.5);color:var(--neem-pale);font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:3px 11px;margin-bottom:1rem;}
.hero h1{font-family:'Libre Baskerville',serif;font-size:2.8rem;font-weight:700;color:#e8f5e8;line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Space Grotesk',sans-serif;font-size:0.88rem;font-weight:300;color:var(--neem);margin-bottom:1.25rem;letter-spacing:0.02em;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#3a6a3e;font-weight:300;}
.hero-img{width:120px;height:120px;border-radius:4px;object-fit:cover;object-position:center 18%;border:1px solid rgba(74,138,78,0.3);flex-shrink:0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Libre Baskerville',serif;font-size:1rem;line-height:1.9;color:var(--bitter-mid);border-right:3px solid var(--neem);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:24px;height:24px;background:var(--bitter);color:var(--neem-pale);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Libre Baskerville',serif;font-size:1.15rem;font-weight:700;color:var(--bitter);}
.sh-en{font-size:0.72rem;font-weight:300;color:var(--neem);letter-spacing:0.05em;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(45,92,48,0.2);margin-bottom:1.1rem;}
.p{font-size:0.92rem;line-height:1.85;color:var(--bitter-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--bitter);font-weight:500;}
.compound-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.compound{background:var(--bitter);border-radius:4px;padding:14px;direction:rtl;}
.compound-name{font-size:0.88rem;font-weight:700;color:var(--neem-pale);margin-bottom:4px;}
.compound-desc{font-size:0.78rem;color:#5a8a5e;line-height:1.55;}
.recipe{background:var(--white);border:1px solid rgba(45,92,48,0.15);border-radius:4px;padding:1.25rem;margin:1.25rem 0;direction:rtl;}
.recipe-title{font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--neem);margin-bottom:1rem;}
.recipe-row{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid rgba(45,92,48,0.1);}
.recipe-row:last-child{border-bottom:none;}
.recipe-name{font-size:0.88rem;color:var(--bitter-mid);flex:1;}
.recipe-qty{font-size:0.82rem;color:var(--neem);font-weight:500;white-space:nowrap;}
.pests{margin:1.25rem 0;}
.pest-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(45,92,48,0.1);direction:rtl;}
.pest-row:last-child{border-bottom:none;}
.pest-name{font-size:0.9rem;font-weight:500;color:var(--bitter);flex:1;}
.pest-eff{display:flex;gap:3px;}
.pest-dot{width:10px;height:10px;border-radius:50%;}
.pest-dot.full{background:var(--neem);}
.pest-dot.half{background:var(--neem-pale);}
.pest-dot.empty{background:var(--clinical-dark);}
.chupchu{background:var(--clinical-dark);border-right:3px solid var(--neem);border-radius:0 8px 8px 0;padding:1rem 1.2rem 1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(45,92,48,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--neem);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--bitter-mid);}
.warning{background:#fff8f2;border-right:3px solid var(--rust);padding:12px 16px;margin:1.25rem 0;direction:rtl;}
.warning-title{font-size:0.85rem;font-weight:700;color:var(--rust);margin-bottom:4px;}
.warning-body{font-size:0.83rem;color:var(--bitter-mid);line-height:1.65;}
.related{background:var(--clinical-dark);border-radius:4px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Libre Baskerville',serif;font-size:0.95rem;font-weight:700;color:var(--bitter);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--bitter-light);text-decoration:none;}
.related-link::before{content:'←';color:var(--neem);font-size:12px;}
.footer-cta{background:var(--bitter);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:4px;object-fit:cover;object-position:center 15%;border:1px solid rgba(74,138,78,0.3);flex-shrink:0;}
.footer-text{font-family:'Libre Baskerville',serif;font-size:0.9rem;line-height:1.7;color:var(--neem-pale);flex:1;}
.footer-text em{font-size:0.78rem;color:#3a6a3e;font-style:normal;}
.footer-btn{display:inline-block;background:var(--neem);color:#e8f5e8;font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:2px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.compound-grid{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-left"></div>
  <div class="hero-accent"></div>
  <div class="hero-body">
    <div class="hero-content">
      <span class="hero-tag">הדברה · Pest Control</span>
      <h1 itemprop="headline">שמן נים</h1>
      <div class="hero-en">Neem Oil — Nature's Pesticide Laboratory</div>
      <div class="hero-meta"><span>קריאה: 6 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
    </div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">עץ הנים גדל בהודו ובדרום אסיה כבר אלפי שנים. הזרעים שלו מכילים מעבדה כימית שלמה — מעל 70 תרכובות פעילות שמבלבלות, מרתיעות והורגות מזיקים מבלי לפגוע בחרקים מועילים.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>מה עושה שמן הנים?</h2><span class="sh-en">How it works</span></div>
    <hr class="div">
    <p class="p">המנגנון של שמן נים שונה מקוטלי חרקים רגילים. הוא לא הורג מיד — הוא <strong>מבלבל את מחזור החיים</strong> של המזיק: מפריע להתרבות, מונע הטלת ביצים, ומונע מהזחלים להתפתח לבוגר.</p>
    <div class="compound-grid">
      <div class="compound"><div class="compound-name">Azadirachtin</div><div class="compound-desc">החומר הפעיל העיקרי. מחקה הורמון גדילה ומונע מהזחל להתפתח.</div></div>
      <div class="compound"><div class="compound-name">Nimbin</div><div class="compound-desc">תכונות אנטי-פטרייתיות ואנטי-ויראליות. מגן מפני מחלות עלים.</div></div>
      <div class="compound"><div class="compound-name">Salannin</div><div class="compound-desc">מרתיע חרקים מלאכול את העלים — מחסום הזנה יעיל.</div></div>
      <div class="compound"><div class="compound-name">Gedunin</div><div class="compound-desc">פעיל נגד קרדיות ופטריות — כולל אבקת אורנ"ה.</div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>הכנת תמיסת ריסוס</h2><span class="sh-en">Preparation</span></div>
    <hr class="div">
    <div class="recipe">
      <div class="recipe-title">מתכון — 1 ליטר תמיסה</div>
      <div class="recipe-row"><span class="recipe-name">שמן נים טהור (cold-pressed)</span><span class="recipe-qty">5 מ"ל (כפית)</span></div>
      <div class="recipe-row"><span class="recipe-name">סבון נוזלי טבעי (אמולסיפייר)</span><span class="recipe-qty">2–3 טיפות</span></div>
      <div class="recipe-row"><span class="recipe-name">מים פושרים</span><span class="recipe-qty">1 ליטר</span></div>
      <div class="recipe-row"><span class="recipe-name">ערבוב חזק לפני כל שימוש</span><span class="recipe-qty">חובה</span></div>
    </div>
    <p class="p">הסבון הוא האמולסיפייר — שמן ומים לא מתערבבים בלעדיו. בלי סבון התמיסה נפרדת ואתה מרסס מים בלבד.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">השיניים שלי עשויות עץ — ועץ הנים הוא אחד מבעלי הברית הטובים ביותר שיש לי בגינה. הרחתי אותו פעם. מר להפליא. המזיקים מסכימים איתי.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>יעילות לפי מזיק</h2><span class="sh-en">Effectiveness by pest</span></div>
    <hr class="div">
    <div class="pests">
      <div class="pest-row"><span class="pest-name">כנימות (אפיד)</span><div class="pest-eff"><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div></div></div>
      <div class="pest-row"><span class="pest-name">קרדית עכביש</span><div class="pest-eff"><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot half"></div></div></div>
      <div class="pest-row"><span class="pest-name">זבוב לבן (ורמות)</span><div class="pest-eff"><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot half"></div><div class="pest-dot empty"></div></div></div>
      <div class="pest-row"><span class="pest-name">אבקת אורנה (פטרייה)</span><div class="pest-eff"><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot empty"></div><div class="pest-dot empty"></div></div></div>
      <div class="pest-row"><span class="pest-name">זחלי פרפרים</span><div class="pest-eff"><div class="pest-dot full"></div><div class="pest-dot full"></div><div class="pest-dot half"></div><div class="pest-dot empty"></div><div class="pest-dot empty"></div></div></div>
    </div>
  </div>
  <div class="warning">
    <div class="warning-title">זמן ריסוס חשוב מאוד</div>
    <div class="warning-body">שמן נים מתפרק בשמש תוך 4–8 שעות — רססו תמיד בשקיעה או בבוקר מוקדם. ריסוס בצהריים = בזבוז מוחלט ועלול לשרוף עלים.</div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">ביום פרח לפי הלוח הביודינמי — רססו שמן נים. הצמח ער, הפרחים פתוחים, והחרקים הרעים פעילים. זמן תקיפה מושלם.</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/companion-plants">צמחי מלווים להדברה</a>
      <a class="related-link" href="/articles/beneficial-beetles">חיפושיות טובות — בעלי ברית</a>
      <a class="related-link" href="/articles/yellow-traps">מלכודות צהובות</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום הפרח הבא לרסס שמן נים?<br><em>Find the perfect biodynamic flower day for neem application.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'beneficial-insects',
    titleHe: 'חרקים מועילים בגינה — צוות ההגנה הטבעי שלכם',
    titleEn: 'Beneficial Insects in the Garden — Your Natural Pest Control Team',
    metaDescriptionHe: 'כך תעבדו עם חרקים מועילים כדי להפחית מזיקים באופן טבעי ולבנות גינה מאוזנת וחיה יותר.',
    metaDescriptionEn: 'Learn how beneficial insects help control pests naturally and create balance in the garden.',
    categoryHe: 'הדברה',
    categoryEn: 'Pest Control',
    filenameHe: '05_חרקים_מועילים.md',
    filenameEn: '05_beneficial_insects.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'beneficial-beetles',
    titleHe: 'חיפושיות טובות',
    titleEn: 'Beneficial Beetles — Your Garden\'s Tiny Army',
    metaDescriptionHe: 'חיפושיות טובות, זבובי רחף וצרעות טפיל — כך מזמינים אותם לגינה ומניחים להם לעשות את העבודה.',
    metaDescriptionEn: 'Learn which beneficial beetles and insects protect your garden and how to attract them naturally.',
    categoryHe: 'הדברה',
    categoryEn: 'Pest Control',
    filenameHe: '22_חיפושיות_טובות.md',
    filenameEn: '22_beneficial_beetles.md',
    publishedAt: '2026-04-11',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,700;0,800;1,400&family=Fraunces:ital,wght@0,400;0,600;1,400&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --red:#c82020;
  --red-pale:#fce8e8;
  --spot:#1a1a1a;
  --meadow:#fdf9ee;
  --meadow-dark:#f5edcf;
  --leaf:#3a6a2a;
  --leaf-pale:#d0ead0;
  --sky:#e8f4f0;
  --gold:#c89020;
  --ink:#1a2a1a;
  --ink-mid:#2a4a2a;
  font-family:'Nunito',sans-serif;
  background:var(--meadow);
  color:var(--ink);
}
.hero{
  background:var(--sky);
  padding:2.5rem 2.5rem 0;
  position:relative;
  overflow:hidden;
}
.hero-spots{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;}
.spot{position:absolute;background:var(--red-pale);border-radius:50%;}
.hero-inner{display:flex;align-items:flex-end;gap:2rem;}
.hero-content{flex:1;padding-bottom:2rem;}
.hero-tag{display:inline-block;background:var(--red);color:white;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:1rem;}
.hero h1{font-family:'Fraunces',serif;font-size:2.8rem;font-weight:600;color:var(--ink);line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Fraunces',serif;font-size:0.95rem;font-style:italic;color:var(--leaf);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#5a7a5a;font-weight:400;}
.hero-img{width:130px;height:130px;border-radius:50%;object-fit:cover;object-position:center 18%;border:3px solid var(--red);flex-shrink:0;align-self:flex-end;}
.grass-bar{height:28px;background:var(--meadow);border-radius:50% 50% 0 0 / 80% 80% 0 0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Fraunces',serif;font-size:1.05rem;line-height:1.9;color:var(--ink-mid);border-right:3px solid var(--red);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:28px;height:28px;border-radius:50%;background:var(--red);color:white;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Fraunces',serif;font-size:1.2rem;font-weight:600;color:var(--ink);}
.sh-en{font-size:0.75rem;font-weight:400;color:var(--leaf);font-style:italic;margin-right:auto;}
.div{border:none;border-top:2px dotted rgba(200,32,32,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ink);font-weight:700;}
.beetle-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:1.25rem 0;}
.beetle-card{background:white;border-radius:12px;padding:16px;direction:rtl;border:2px solid transparent;}
.beetle-card:nth-child(1){border-color:var(--red);}
.beetle-card:nth-child(2){border-color:#e87020;}
.beetle-card:nth-child(3){border-color:var(--leaf);}
.beetle-card:nth-child(4){border-color:#2080c8;}
.beetle-icon{font-size:2rem;margin-bottom:8px;display:block;}
.beetle-name{font-size:0.92rem;font-weight:800;color:var(--ink);margin-bottom:4px;}
.beetle-latin{font-size:0.72rem;font-style:italic;color:#7a7a7a;margin-bottom:6px;}
.beetle-eats{font-size:0.8rem;color:var(--ink-mid);line-height:1.5;}
.beetle-stat{font-size:0.72rem;font-weight:700;color:var(--red);margin-top:6px;}
.invite-box{background:var(--leaf-pale);border-radius:12px;padding:1.25rem 1.5rem;margin:1.25rem 0;direction:rtl;}
.invite-title{font-family:'Fraunces',serif;font-size:1rem;font-weight:600;color:var(--leaf);margin-bottom:0.75rem;}
.invite-list{display:flex;flex-direction:column;gap:6px;}
.invite-item{display:flex;align-items:flex-start;gap:10px;font-size:0.87rem;color:var(--ink-mid);line-height:1.5;}
.invite-bullet{width:8px;height:8px;border-radius:50%;background:var(--leaf);flex-shrink:0;margin-top:5px;}
.chupchu{background:var(--red-pale);border-radius:12px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;border:1px solid rgba(200,32,32,0.2);}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:2px solid var(--red);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--red);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.dont-box{background:#fff5f0;border-radius:8px;padding:1rem 1.25rem;margin:1.25rem 0;direction:rtl;border:1px solid rgba(200,32,32,0.15);}
.dont-title{font-size:0.85rem;font-weight:700;color:var(--red);margin-bottom:6px;}
.dont-text{font-size:0.83rem;color:var(--ink-mid);line-height:1.65;}
.related{background:var(--meadow-dark);border-radius:12px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Fraunces',serif;font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--leaf);text-decoration:none;}
.related-link::before{content:'←';color:var(--red);font-size:12px;}
.footer-cta{background:var(--ink);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:2px solid var(--red);flex-shrink:0;}
.footer-text{font-family:'Fraunces',serif;font-size:0.9rem;line-height:1.7;color:var(--leaf-pale);flex:1;}
.footer-text em{font-size:0.78rem;color:#3a5a3a;font-style:normal;}
.footer-btn{display:inline-block;background:var(--red);color:white;font-size:0.8rem;font-weight:700;padding:9px 20px;border-radius:20px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.beetle-cards{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-spots">
    <div class="spot" style="width:80px;height:80px;top:-20px;right:10%;opacity:0.4;"></div>
    <div class="spot" style="width:40px;height:40px;top:30px;left:15%;opacity:0.3;"></div>
    <div class="spot" style="width:120px;height:120px;bottom:-30px;left:5%;opacity:0.25;"></div>
  </div>
  <div class="hero-inner">
    <div class="hero-content">
      <span class="hero-tag">הדברה · Pest Control</span>
      <h1 itemprop="headline">חיפושיות טובות</h1>
      <div class="hero-en">Beneficial Beetles — Your Garden's Tiny Army</div>
      <div class="hero-meta"><span>קריאה: 5 דקות</span><span>רמה: מתחיל</span><span>עונה: אביב–קיץ</span></div>
    </div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
  </div>
  <div class="grass-bar"></div>
</header>
<div class="body">
  <p class="intro" itemprop="description">הגינה הביודינמית שלך לא צריכה קוטלי חרקים — היא צריכה צבא קטן שכבר חי בתוכה. חיפושיות, חרקים ועכבישים שמחפשים בדיוק את המזיקים שמטרידים אותך.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>ארבעת הגיבורים הגדולים</h2><span class="sh-en">The big four</span></div>
    <hr class="div">
    <div class="beetle-cards">
      <div class="beetle-card">
        <span class="beetle-icon">🐞</span>
        <div class="beetle-name">פרת משה רבנו</div>
        <div class="beetle-latin">Coccinellidae</div>
        <div class="beetle-eats">אוכלת כנימות, קרדיות, וזחלים קטנים</div>
        <div class="beetle-stat">עד 5,000 כנימות בחיים</div>
      </div>
      <div class="beetle-card">
        <span class="beetle-icon">🦋</span>
        <div class="beetle-name">זבוב רחף</div>
        <div class="beetle-latin">Syrphidae</div>
        <div class="beetle-eats">הזחלים שלו אוכלים כנימות — הבוגר מאביק פרחים</div>
        <div class="beetle-stat">גיבור כפול: הדברה + האבקה</div>
      </div>
      <div class="beetle-card">
        <span class="beetle-icon">🪲</span>
        <div class="beetle-name">חיפושית קרקע</div>
        <div class="beetle-latin">Carabidae</div>
        <div class="beetle-eats">ציד לילי — זחלים, חלזונות, ביצי מזיקים</div>
        <div class="beetle-stat">שמרנית קרקע מעולה</div>
      </div>
      <div class="beetle-card">
        <span class="beetle-icon">🦗</span>
        <div class="beetle-name">צרעת טפיל</div>
        <div class="beetle-latin">Parasitoid wasp</div>
        <div class="beetle-eats">מטילה ביצים בתוך מזיקים — הזחל אוכל מבפנים</div>
        <div class="beetle-stat">לא עוקצת בני אדם</div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">פרת משה רבנו אחת ישבה על ידי פעם ולא זזה שעה שלמה. אחר כך הבנתי — היא ציידת. היא חיכתה לכנימות לעבור. פשוט גאון.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>איך מזמינים אותם?</h2><span class="sh-en">How to attract them</span></div>
    <hr class="div">
    <div class="invite-box">
      <div class="invite-title">הגינה שהם רוצים לגור בה</div>
      <div class="invite-list">
        <div class="invite-item"><div class="invite-bullet"></div><span>שמיר, כוסברה ושומר — פרחי תפרחת קטנים שצרעות וזבובי רחף אוהבים</span></div>
        <div class="invite-item"><div class="invite-bullet"></div><span>ערימת עצים קטנה בפינה — בית מושלם לחיפושיות קרקע</span></div>
        <div class="invite-item"><div class="invite-bullet"></div><span>מים עומדים קטנים — קערת מים רדודה מושכת חרקים מועילים</span></div>
        <div class="invite-item"><div class="invite-bullet"></div><span>עשבים לא מטופחים בפינה אחת — מקלט ומקור מזון לחרקים</span></div>
        <div class="invite-item"><div class="invite-bullet"></div><span>פרחים פתוחים לאורך כל העונה — מקור נקטר רציף</span></div>
      </div>
    </div>
  </div>
  <div class="dont-box">
    <div class="dont-title">מה מבריח אותם?</div>
    <div class="dont-text">שמן נים, קוטלי חרקים אורגניים ואפילו סבון גינה — כולם פוגעים בחרקים המועילים בדיוק כמו במזיקים. השתמשו בהם בצנע ורק בזמן ההתקפה עצמה, לא כטיפול מונע.</div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">ביום פרח לפי הלוח הביודינמי — הפרחים פתוחים לרווחה והחרקים המועילים פעילים במיוחד. זה הזמן לצפות בהם עובדים!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/companion-plants">צמחי מלווים — שותפויות בגינה</a>
      <a class="related-link" href="/articles/neem-oil">שמן נים — מתי ואיך</a>
      <a class="related-link" href="/articles/yellow-traps">מלכודות צהובות</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום הפרח הבא — כשהחרקים המועילים הכי פעילים?<br><em>Find the biodynamic flower day for your garden allies.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'yellow-traps',
    titleHe: 'מלכודות צהובות',
    titleEn: 'Yellow Sticky Traps — Simple. Brutal. Effective.',
    metaDescriptionHe: 'מלכודות צהובות דביקות — הכלי הפשוט ביותר לניטור והדברת מזיקים בגינה ללא כימיקלים.',
    metaDescriptionEn: 'Yellow sticky traps — the simplest tool for monitoring and catching garden pests without chemicals.',
    categoryHe: 'הדברה',
    categoryEn: 'Pest Control',
    filenameHe: '23_מלכודות_צהובות.md',
    filenameEn: '23_yellow_traps.md',
    publishedAt: '2026-04-11',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --yellow:#f0d000;
  --yellow-dark:#c8a800;
  --yellow-deep:#6a5000;
  --black:#0a0a0a;
  --near-black:#141414;
  --gray:#2a2a2a;
  --gray-mid:#4a4a4a;
  --gray-light:#8a8a8a;
  --white:#fafafa;
  --danger:#e02020;
  font-family:'Barlow',sans-serif;
  background:var(--white);
  color:var(--black);
}
.hero{
  background:var(--yellow);
  padding:3rem 2.5rem 2.5rem;
  position:relative;
  display:flex;
  align-items:center;
  gap:2rem;
}
.hero-stripe{
  position:absolute;
  top:0;right:0;bottom:0;
  width:12px;
  background:repeating-linear-gradient(180deg,var(--black) 0,var(--black) 12px,var(--yellow-dark) 12px,var(--yellow-dark) 24px);
}
.hero-content{flex:1;}
.hero-tag{display:inline-block;background:var(--black);color:var(--yellow);font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:4px 12px;margin-bottom:1rem;}
.hero h1{font-family:'Barlow Condensed',sans-serif;font-size:4rem;font-weight:800;color:var(--black);line-height:0.95;margin-bottom:0.3rem;direction:rtl;text-transform:uppercase;}
.hero-en{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:400;color:var(--yellow-deep);margin-bottom:1.25rem;letter-spacing:0.05em;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:var(--yellow-deep);font-weight:400;}
.hero-img{width:120px;height:120px;border-radius:0;object-fit:cover;object-position:center 18%;border:3px solid var(--black);flex-shrink:0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Barlow',sans-serif;font-size:1rem;line-height:1.85;color:var(--gray);border-right:4px solid var(--black);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;background:var(--yellow);border:2px solid var(--black);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:var(--black);text-transform:uppercase;letter-spacing:0.03em;}
.sh-en{font-size:0.72rem;font-weight:400;color:var(--gray-light);letter-spacing:0.06em;margin-right:auto;}
.div{border:none;border-top:2px solid var(--black);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--gray);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--black);font-weight:600;}
.why-yellow{background:var(--yellow);border:2px solid var(--black);padding:1.5rem;margin:1.25rem 0;direction:rtl;}
.why-title{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;color:var(--black);text-transform:uppercase;margin-bottom:0.75rem;}
.why-text{font-size:0.9rem;color:var(--gray);line-height:1.7;}
.trap-types{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:1.25rem 0;}
.trap{border:2px solid var(--black);padding:14px;direction:rtl;}
.trap-color{width:100%;height:8px;margin-bottom:10px;}
.trap-name{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;color:var(--black);text-transform:uppercase;margin-bottom:4px;}
.trap-for{font-size:0.8rem;color:var(--gray-mid);line-height:1.5;}
.trap-note{font-size:0.72rem;color:var(--gray-light);margin-top:6px;font-style:italic;}
.placement{display:flex;flex-direction:column;gap:8px;margin:1.25rem 0;}
.place-row{display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--white);border:1px solid #ddd;direction:rtl;}
.place-num{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:800;color:var(--yellow-dark);flex-shrink:0;width:28px;text-align:center;}
.place-text{font-size:0.88rem;color:var(--gray);line-height:1.5;}
.chupchu{background:#f5f5f5;border:2px solid var(--black);padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;object-fit:cover;object-position:center 15%;border:2px solid var(--black);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--yellow-dark);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--gray);}
.warning{background:var(--danger);padding:12px 16px;margin:1.25rem 0;direction:rtl;}
.warning-title{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:800;color:white;text-transform:uppercase;margin-bottom:4px;}
.warning-body{font-size:0.83rem;color:rgba(255,255,255,0.9);line-height:1.65;}
.related{background:#f0f0f0;border:2px solid var(--black);padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;color:var(--black);text-transform:uppercase;margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--gray);text-decoration:none;}
.related-link::before{content:'←';color:var(--yellow-dark);font-size:14px;font-weight:800;}
.footer-cta{background:var(--black);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;object-fit:cover;object-position:center 15%;border:2px solid var(--yellow);flex-shrink:0;}
.footer-text{font-family:'Barlow',sans-serif;font-size:0.9rem;line-height:1.7;color:#c8c8c8;flex:1;}
.footer-text em{font-size:0.78rem;color:#5a5a5a;font-style:normal;}
.footer-btn{display:inline-block;background:var(--yellow);color:var(--black);font-family:'Barlow Condensed',sans-serif;font-size:0.9rem;font-weight:800;text-transform:uppercase;padding:10px 20px;text-decoration:none;white-space:nowrap;flex-shrink:0;letter-spacing:0.05em;}
@media(max-width:560px){.hero h1{font-size:2.8rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.trap-types{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-stripe"></div>
  <div class="hero-content">
    <span class="hero-tag">הדברה · Pest Control</span>
    <h1 itemprop="headline">מלכודות צהובות</h1>
    <div class="hero-en">Yellow Sticky Traps — Simple. Brutal. Effective.</div>
    <div class="hero-meta"><span>קריאה: 4 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
  </div>
  <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
</header>
<div class="body">
  <p class="intro" itemprop="description">הכלי הפשוט ביותר בארסנל ההדברה הטבעית — פיסת פלסטיק צהוב מכוסה בדבק. ללא כימיקלים, ללא מאמץ, ועם יעילות מפתיעה נגד מגוון רחב של מזיקים.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>למה צהוב?</h2><span class="sh-en">Why yellow?</span></div>
    <hr class="div">
    <div class="why-yellow">
      <div class="why-title">הפיזיקה של הצבע</div>
      <div class="why-text">רוב חרקי הגינה רואים ספקטרום קצר גל — הם רגישים מאוד לצהוב–ירוק. הצבע הצהוב מחקה עבורם עלים צעירים ורעננים — בדיוק מה שהם מחפשים. כשהם מתקרבים — הם נתקעים.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>סוגי מלכודות וצבעים</h2><span class="sh-en">Types &amp; colors</span></div>
    <hr class="div">
    <div class="trap-types">
      <div class="trap"><div class="trap-color" style="background:#f0d000;border:1px solid #aaa;"></div><div class="trap-name">צהוב</div><div class="trap-for">ורמות לבנות, כנימות, זבובי פירות, עש שממה</div><div class="trap-note">הכי נפוץ ויעיל לרוב המזיקים</div></div>
      <div class="trap"><div class="trap-color" style="background:#1a1aaa;border:1px solid #aaa;"></div><div class="trap-name">כחול</div><div class="trap-for">כנימות פרחים (Thrips) — לא נתפסות על צהוב</div><div class="trap-note">השתמשו כחול + צהוב ביחד</div></div>
      <div class="trap"><div class="trap-color" style="background:#cc2020;border:1px solid #aaa;"></div><div class="trap-name">אדום</div><div class="trap-for">מגרה זבובי פרי בעצים פירות</div><div class="trap-note">משמש לעיתים עם פרומון</div></div>
      <div class="trap"><div class="trap-color" style="background:#ffffff;border:1px solid #aaa;"></div><div class="trap-name">לבן</div><div class="trap-for">חרקים קופצים, מינים מסוימים של זבובים</div><div class="trap-note">פחות נפוץ, לבעיות ספציפיות</div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>מיקום ותלייה</h2><span class="sh-en">Placement</span></div>
    <hr class="div">
    <div class="placement">
      <div class="place-row"><span class="place-num">1</span><span class="place-text">גובה מיטבי: 10–20 ס"מ מעל פסגת הצמח — שם המזיקים טסים</span></div>
      <div class="place-row"><span class="place-num">2</span><span class="place-text">כיוון: צד צהוב מפנה לכיוון הצמחים, לא לשמש ישירות</span></div>
      <div class="place-row"><span class="place-num">3</span><span class="place-text">צפיפות: 1 מלכודת לכל 10 מ"ר — יותר לא מועיל</span></div>
      <div class="place-row"><span class="place-num">4</span><span class="place-text">החלפה: כל 4–6 שבועות, או כשהמשטח מלא ב-50%</span></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">תמיד בדוק את המלכודות. הן בעצם ניטור — תראה מה נתפס, תבין מה קורה בגינה. אם פתאום 20 ורמות לבנות — זה שלט אזהרה.</div>
    </div>
  </div>
  <div class="warning">
    <div class="warning-title">סכנה — גם חרקים טובים נתפסים</div>
    <div class="warning-body">מלכודות צהובות לא מבדילות — פרת משה רבנו, זבובי רחף וצרעות מועילות נתפסות גם כן. השתמשו במינון נכון ולא יותר מהנדרש.</div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/neem-oil">שמן נים — הדברה כימית טבעית</a>
      <a class="related-link" href="/articles/beneficial-beetles">חיפושיות טובות</a>
      <a class="related-link" href="/articles/companion-plants">צמחי מלווים</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">רוצה לדעת מתי הזמן הביודינמי הטוב לבדוק מלכודות?<br><em>Check your biodynamic calendar for optimal pest monitoring.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'companion-plants',
    titleHe: 'צמחי מלווים להדברה',
    titleEn: 'Companion Plants — The Art of Garden Friendships',
    metaDescriptionHe: 'צמחי מלווים דוחים מזיקים, מושכים חרקים מועילים ומגינים זה על זה — כך בוחרים ומשלבים אותם.',
    metaDescriptionEn: 'Companion plants repel pests, attract beneficial insects, and protect each other — learn how to choose and combine them.',
    categoryHe: 'הדברה',
    categoryEn: 'Pest Control',
    filenameHe: '24_צמחי_מלווים.md',
    filenameEn: '24_companion_plants.md',
    publishedAt: '2026-04-11',
    images: null,
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=Mulish:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --terracotta:#8b3a1a;
  --terracotta-pale:#f5e0d8;
  --sage:#3a5a2a;
  --sage-pale:#d8ecd0;
  --mustard:#8a7010;
  --mustard-pale:#f0e8b8;
  --lavender:#5a3a8a;
  --lavender-pale:#e8d8f8;
  --cream:#faf6ef;
  --cream-dark:#f0e8d8;
  --ink:#1e140a;
  --ink-mid:#3d2a14;
  --ink-light:#7a5a3a;
  font-family:'Mulish',sans-serif;
  background:var(--cream);
  color:var(--ink);
}
.hero{
  background:var(--terracotta);
  padding:3rem 2.5rem 0;
  position:relative;
  overflow:hidden;
}
.hero-pattern{
  position:absolute;inset:0;
  background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);
  background-size:20px 20px;
  pointer-events:none;
}
.hero-inner{display:flex;align-items:flex-end;gap:2rem;position:relative;z-index:1;}
.hero-content{flex:1;padding-bottom:2rem;}
.hero-tag{display:inline-block;background:rgba(255,255,255,0.15);color:#f5e0d8;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:3px 12px;border-radius:20px;margin-bottom:1rem;border:1px solid rgba(255,255,255,0.2);}
.hero h1{font-family:'Crimson Pro',serif;font-size:3rem;font-weight:600;color:#faf0e8;line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Crimson Pro',serif;font-size:1rem;font-style:italic;color:rgba(245,224,216,0.7);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:rgba(245,224,216,0.5);font-weight:300;}
.hero-img{width:130px;height:130px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid rgba(255,255,255,0.3);flex-shrink:0;align-self:flex-end;}
.arch{height:36px;background:var(--cream);border-radius:50% 50% 0 0 / 100% 100% 0 0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Crimson Pro',serif;font-size:1.1rem;font-style:italic;line-height:1.9;color:var(--ink-mid);border-right:3px solid var(--terracotta);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--terracotta);color:#faf0e8;font-family:'Crimson Pro',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Crimson Pro',serif;font-size:1.3rem;font-weight:600;color:var(--ink);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--ink-light);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(139,58,26,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.9;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ink);font-weight:500;}
.pairs{display:flex;flex-direction:column;gap:10px;margin:1.25rem 0;}
.pair{display:flex;align-items:stretch;gap:0;border-radius:8px;overflow:hidden;direction:rtl;}
.pair-a{flex:1;padding:12px 14px;display:flex;flex-direction:column;justify-content:center;}
.pair-connector{width:36px;display:flex;align-items:center;justify-content:center;font-family:'Crimson Pro',serif;font-size:1.1rem;font-weight:600;flex-shrink:0;}
.pair-b{flex:1;padding:12px 14px;display:flex;flex-direction:column;justify-content:center;}
.pair-name{font-size:0.9rem;font-weight:500;margin-bottom:2px;}
.pair-role{font-size:0.75rem;font-weight:300;line-height:1.4;}
.p1-a{background:var(--terracotta-pale);}.p1-a .pair-name{color:var(--terracotta);}
.p1-b{background:var(--sage-pale);}.p1-b .pair-name{color:var(--sage);}
.p1-c{background:var(--terracotta);color:rgba(255,255,255,0.6);}
.p2-a{background:var(--mustard-pale);}.p2-a .pair-name{color:var(--mustard);}
.p2-b{background:var(--sage-pale);}.p2-b .pair-name{color:var(--sage);}
.p2-c{background:var(--mustard);color:rgba(255,255,255,0.6);}
.p3-a{background:var(--lavender-pale);}.p3-a .pair-name{color:var(--lavender);}
.p3-b{background:var(--terracotta-pale);}.p3-b .pair-name{color:var(--terracotta);}
.p3-c{background:var(--lavender);color:rgba(255,255,255,0.6);}
.p4-a{background:var(--sage-pale);}.p4-a .pair-name{color:var(--sage);}
.p4-b{background:var(--mustard-pale);}.p4-b .pair-name{color:var(--mustard);}
.p4-c{background:var(--sage);color:rgba(255,255,255,0.6);}
.bad-pairs{background:var(--cream-dark);border-radius:8px;padding:1.1rem 1.4rem;margin:1.25rem 0;direction:rtl;}
.bad-title{font-size:0.82rem;font-weight:500;color:var(--terracotta);margin-bottom:0.6rem;}
.bad-list{display:flex;flex-direction:column;gap:5px;}
.bad-item{font-size:0.83rem;color:var(--ink-mid);display:flex;align-items:center;gap:8px;}
.bad-x{color:var(--terracotta);font-weight:700;}
.chupchu{background:var(--terracotta-pale);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;border:1px solid rgba(139,58,26,0.2);}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(139,58,26,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--terracotta);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.related{background:var(--cream-dark);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Crimson Pro',serif;font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--sage);text-decoration:none;}
.related-link::before{content:'←';color:var(--terracotta);font-size:12px;}
.footer-cta{background:var(--ink);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(139,58,26,0.4);flex-shrink:0;}
.footer-text{font-family:'Crimson Pro',serif;font-size:0.95rem;line-height:1.7;color:var(--terracotta-pale);flex:1;}
.footer-text em{font-size:0.8rem;color:#5a3a2a;font-style:normal;}
.footer-btn{display:inline-block;background:var(--terracotta);color:#faf0e8;font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:20px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2.2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-pattern"></div>
  <div class="hero-inner">
    <div class="hero-content">
      <span class="hero-tag">הדברה · Pest Control</span>
      <h1 itemprop="headline">צמחי מלווים להדברה</h1>
      <div class="hero-en">Companion Plants — The Art of Garden Friendships</div>
      <div class="hero-meta"><span>קריאה: 7 דקות</span><span>רמה: מתחיל–בינוני</span><span>עונה: כל השנה</span></div>
    </div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו — גינה חיה" itemprop="image">
  </div>
  <div class="arch"></div>
</header>
<div class="body">
  <p class="intro" itemprop="description">הגינה הביודינמית רואה את הצמחים כקהילה — כל אחד תורם לשכניו. צמחי מלווים הם שותפים אסטרטגיים שדוחים מזיקים, מושכים חרקים מועילים, ומגינים זה על זה בשקט.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>זוגות מנצחים</h2><span class="sh-en">Winning pairs</span></div>
    <hr class="div">
    <div class="pairs">
      <div class="pair">
        <div class="pair-a p1-a"><div class="pair-name">עגבנייה</div><div class="pair-role">אוהבת הגנה מכנימות ומפטריות</div></div>
        <div class="pair-connector p1-c">+</div>
        <div class="pair-b p1-b"><div class="pair-name">בזיליקום</div><div class="pair-role">ריח חריף מבריח זבובים לבנים וכנימות</div></div>
      </div>
      <div class="pair">
        <div class="pair-a p2-a"><div class="pair-name">כרוב ובני משפחתו</div><div class="pair-role">מותקפים על ידי פרפר הלבן</div></div>
        <div class="pair-connector p2-c">+</div>
        <div class="pair-b p2-b"><div class="pair-name">שמיר / נענע</div><div class="pair-role">מבלבלים את הפרפרים בריח חזק</div></div>
      </div>
      <div class="pair">
        <div class="pair-a p3-a"><div class="pair-name">ורדים</div><div class="pair-role">סובלים מכנימות ומחלות עלים</div></div>
        <div class="pair-connector p3-c">+</div>
        <div class="pair-b p3-b"><div class="pair-name">שום</div><div class="pair-role">מרחיק כנימות ופטריות בריח חריף</div></div>
      </div>
      <div class="pair">
        <div class="pair-a p4-a"><div class="pair-name">מלפפון / קישוא</div><div class="pair-role">קרדיות עכביש אוהבות אותם</div></div>
        <div class="pair-connector p4-c">+</div>
        <div class="pair-b p4-b"><div class="pair-name">קמומיל</div><div class="pair-role">מושך טורפים טבעיים של הקרדיות</div></div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">כשגדלתי בתוך העץ, למדתי שכל עץ מוקף בצמחים שמגינים עליו. הטבע כבר יודע את הכלל הזה. אנחנו רק צריכים להקשיב.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>מנגנוני ההגנה</h2><span class="sh-en">How it works</span></div>
    <hr class="div">
    <p class="p"><strong>בלבול חושי</strong> — ריחות חזקים מסכים את הריח של הצמח המטרה. פרפרים וחרקים מוצאים צמחים באמצעות ריח — ריח מסכים עוצר אותם לפני שמצאו.</p>
    <p class="p"><strong>משיכת אויבים טבעיים</strong> — פרחי תפרחת קטנים (שמיר, כוסברה, שומר) מושכים צרעות טפיל וזבובי רחף שאוכלים כנימות.</p>
    <p class="p"><strong>מחסום פיזי</strong> — גובה שונה, צפיפות, עלים שונים — קשה יותר לחרק לנוע בין שדות מעורבים מאשר בין שורות חד-גוניות.</p>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>שילובים שאסורים</h2><span class="sh-en">Incompatible pairs</span></div>
    <hr class="div">
    <div class="bad-pairs">
      <div class="bad-title">אלה לא אוהבים להיות ביחד</div>
      <div class="bad-list">
        <div class="bad-item"><span class="bad-x">✗</span>בצל + שעועית — הבצל מעכב צמיחת שעועית</div>
        <div class="bad-item"><span class="bad-x">✗</span>שום + אפונה — שום מדכא צמיחת קטניות</div>
        <div class="bad-item"><span class="bad-x">✗</span>שומר + כמעט הכל — עצמאי מאוד, עדיף גינה נפרדת</div>
        <div class="bad-item"><span class="bad-x">✗</span>עגבנייה + שומר — תחרות שורשים, שניהם סובלים</div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">שתילת צמחי מלווים ביום פרח לפי הלוח הביודינמי — הצמחים קולטים את ההשפעה של שכניהם החדשים הכי טוב ביום הזה. פתח גינה חיה!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/three-sisters">שלוש האחיות — שיתוף פעולה קלאסי</a>
      <a class="related-link" href="/articles/beneficial-beetles">חיפושיות טובות</a>
      <a class="related-link" href="/articles/neem-oil">שמן נים — מתי לעזור לצמחי המלווים</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום הפרח הביודינמי לשתול את צמחי המלווים שלך?<br><em>Find the best biodynamic flower day for companion planting.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'mulching',
    titleHe: 'חיפוי קרקע — להגן ולהזין את האדמה',
    titleEn: 'Mulching — Protect and Feed Your Soil',
    metaDescriptionHe: 'למדו איך חיפוי קרקע שומר על לחות, משפר פוריות ומגן על האדמה.',
    metaDescriptionEn: 'Learn how mulching protects soil, improves fertility, and reduces water loss naturally.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '06_חיפוי_קרקע.md',
    filenameEn: '06_mulching.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'vermicompost',
    titleHe: 'קומפוסט תולעים — להפוך פסולת לפוריות חיה',
    titleEn: 'Worm Composting — Turning Waste into Living Fertility',
    metaDescriptionHe: 'למדו איך תולעים הופכות שאריות למצע עשיר וחי.',
    metaDescriptionEn: 'Use worms to convert kitchen scraps into rich, living compost.',
    categoryHe: 'קומפוסט',
    categoryEn: 'Compost',
    filenameHe: '07_קומפוסט_תולעים.md',
    filenameEn: '07_vermicompost.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'biochar',
    titleHe: 'ביו־צ׳אר — בניית קרקע לטווח ארוך',
    titleEn: 'Biochar — Building Soil for the Long Term',
    metaDescriptionHe: 'למדו איך ביו־צ׳אר משפר מבנה, אחיזת מים ודשנים לאורך זמן.',
    metaDescriptionEn: 'Use biochar to improve soil structure, nutrient holding, and long-term fertility.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '08_ביו_צאר.md',
    filenameEn: '08_biochar.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'deep-vs-shallow-watering',
    titleHe: 'השקיה עמוקה מול השקיה שטחית',
    titleEn: 'Deep Watering vs. Shallow Watering',
    metaDescriptionHe: 'למדו איך עומק ההשקיה משפיע על שורשים וחוסן הצמח.',
    metaDescriptionEn: 'Learn how watering depth affects root growth and plant resilience.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '09_השקיה_עמוקה_מול_שטחית.md',
    filenameEn: '09_deep_vs_shallow_watering.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'drip-irrigation',
    titleHe: 'השקיה בטפטוף — מערכת חכמה לגינה',
    titleEn: 'Drip Irrigation — Efficient Garden Watering',
    metaDescriptionHe: 'למדו איך להשקות ביעילות ישירות לשורשים ולחסוך מים.',
    metaDescriptionEn: 'Use drip irrigation to deliver water efficiently to plant roots.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '10_השקיה_בטפטוף.md',
    filenameEn: '10_drip_irrigation.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'compost',
    titleHe: 'קומפוסט — הבסיס לחיים בקרקע',
    titleEn: 'Compost — The Foundation of Soil Life',
    metaDescriptionHe: 'למדו איך להכין קומפוסט עשיר ולהניח יסוד לקרקע חיה.',
    metaDescriptionEn: 'Learn how to build rich compost and create the foundation of living soil.',
    categoryHe: 'קומפוסט',
    categoryEn: 'Compost',
    filenameHe: '11_קומפוסט.md',
    filenameEn: '11_compost.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'raised-vs-ground',
    titleHe: 'ערוגות מוגבהות מול שתילה בקרקע',
    titleEn: 'Raised Beds vs. Ground Planting',
    metaDescriptionHe: 'השוו בין שיטות כדי לבחור מה מתאים לגינה שלכם.',
    metaDescriptionEn: 'Compare raised beds and in-ground planting to choose what suits your garden.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '12_ערוגות_מוגבהות_מול_קרקע.md',
    filenameEn: '12_raised_vs_ground.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'crop-rotation',
    titleHe: 'מחזור זרעים — למה זה חשוב',
    titleEn: 'Crop Rotation — Why It Matters',
    metaDescriptionHe: 'למדו איך מחזור זרעים מונע דלדול קרקע ומפחית מזיקים.',
    metaDescriptionEn: 'Understand how crop rotation prevents soil depletion and reduces pests.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '13_מחזור_זרעים.md',
    filenameEn: '13_crop_rotation.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'natural-weed-control',
    titleHe: 'הדברת עשבים טבעית',
    titleEn: 'Natural Weed Control Methods',
    metaDescriptionHe: 'למדו לשלוט בעשבים בעזרת חיפוי, תזמון ושיטות פשוטות.',
    metaDescriptionEn: 'Control weeds naturally using mulch, timing, and smart practices.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '14_עשבים_טבעי.md',
    filenameEn: '14_natural_weed_control.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'companion-planting',
    titleHe: 'שתילה משולבת — לעבוד עם הטבע',
    titleEn: 'Companion Planting — Working With Nature',
    metaDescriptionHe: 'למדו לשלב צמחים כך שיחזקו זה את זה ויפחיתו מזיקים.',
    metaDescriptionEn: 'Use plant relationships to improve growth, repel pests, and support biodiversity.',
    categoryHe: 'שיתופי פעולה',
    categoryEn: 'Companion Planting',
    filenameHe: '15_שתילה_משולבת.md',
    filenameEn: '15_companion_planting.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'soil-structure',
    titleHe: 'מבנה הקרקע — היסוד הנסתר',
    titleEn: 'Soil Structure — The Hidden Foundation',
    metaDescriptionHe: 'למדו איך מבנה הקרקע משפיע על מים, שורשים ובריאות הצמח.',
    metaDescriptionEn: 'Learn how soil structure affects water, roots, and plant health.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '16_מבנה_קרקע.md',
    filenameEn: '16_soil_structure.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'mycorrhizae',
    titleHe: 'מיקוריזה — הרשת התת־קרקעית',
    titleEn: 'Mycorrhizae — The Underground Network',
    metaDescriptionHe: 'הבינו איך פטריות מחברות שורשים ומשפרות קליטה.',
    metaDescriptionEn: 'Understand how fungi connect roots and improve nutrient uptake.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '17_מיקוריזה.md',
    filenameEn: '17_mycorrhizae.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'plant-stress-signals',
    titleHe: 'סימני סטרס בצמחים — לקרוא את הגינה',
    titleEn: 'Plant Stress Signals — How to Read Your Garden',
    metaDescriptionHe: 'לזהות סימני סטרס מוקדם.',
    metaDescriptionEn: 'Recognize stress signals in plants early.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '18_סימני_סטרס_בצמחים.md',
    filenameEn: '18_plant_stress_signals.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'plant-immunity',
    titleHe: 'חסינות טבעית בצמחים',
    titleEn: 'Natural Plant Immunity — Strength vs Treatment',
    metaDescriptionHe: 'לבנות צמחים חזקים באופן טבעי.',
    metaDescriptionEn: 'Build stronger plants naturally.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '19_חסינות_צמחים.md',
    filenameEn: '19_plant_immunity.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'seasonal-rhythm',
    titleHe: 'קצב עונתי בגינה',
    titleEn: 'Seasonal Gardening Rhythm — Working With Time',
    metaDescriptionHe: 'לעבוד עם עונות השנה.',
    metaDescriptionEn: 'Work with seasonal rhythms.',
    categoryHe: 'טכניקות גינון',
    categoryEn: 'Techniques',
    filenameHe: '20_קצב_עונתי.md',
    filenameEn: '20_seasonal_rhythm.md',
    publishedAt: '2026-04-08',
    images: null,
  },
];
