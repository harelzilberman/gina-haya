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
    titleHe: 'ריסוס אצות ים לצמחים — כוח מהים בגינה',
    titleEn: 'Seaweed Spray for Plants — Ocean Power in Your Garden',
    metaDescriptionHe: 'כך תשתמשו בריסוס אצות ים כדי לחזק צמחים, לשפר עמידות ולעודד צמיחה מאוזנת בגינה.',
    metaDescriptionEn: 'Learn how seaweed spray supports plant vitality, resilience, and balanced growth in the garden.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: '02_ריסוס_אצות_ים.md',
    filenameEn: '02_seaweed_spray.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'green-manure',
    titleHe: 'דשן ירוק — להאכיל את הקרקע לפני הצמח',
    titleEn: 'Green Manure — Feed the Soil Before the Plants',
    metaDescriptionHe: 'כך משתמשים בדשן ירוק כדי לשפר פוריות, מבנה קרקע וחיוניות של הערוגה לאורך זמן.',
    metaDescriptionEn: 'Learn how green manure improves soil fertility, structure, and long-term garden health naturally.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: '03_דשן_ירוק.md',
    filenameEn: '03_green_manure.md',
    publishedAt: '2026-04-08',
    images: null,
  },
  {
    id: 'neem-oil',
    titleHe: 'שמן נים — נשק סודי נגד מזיקים',
    titleEn: 'Neem Oil — Secret Weapon Against Pests',
    metaDescriptionHe: 'כך משתמשים בשמן נים בצורה נכונה כדי להפחית לחץ מזיקים בגינה בלי לפעול באגרסיביות מיותרת.',
    metaDescriptionEn: 'Learn how to use neem oil safely and effectively to reduce pest pressure in the garden.',
    categoryHe: 'הדברה',
    categoryEn: 'Pest Control',
    filenameHe: '04_שמן_נים.md',
    filenameEn: '04_neem_oil.md',
    publishedAt: '2026-04-08',
    images: null,
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
