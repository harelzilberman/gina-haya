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
    images: { hero: '/images/articles/compost-tea.png' },
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
    images: { hero: '/images/articles/seaweed.jpg' },
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
    images: { hero: '/images/articles/green-manure.jpg' },
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
    images: { hero: '/images/articles/urine.jpg' },
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
    images: { hero: '/images/articles/neem.jpg' },
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
    images: { hero: '/images/articles/beneficial-insects.jpg' },
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
    images: { hero: '/images/articles/yellow-traps.jpg' },
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
    images: { hero: '/images/articles/companion-plants.jpg' },
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
    id: 'compost-pile',
    titleHe: 'ערימת קומפוסט',
    titleEn: 'Compost Pile — The Complete Guide',
    metaDescriptionHe: 'ערימת קומפוסט היא לב הגינה הביודינמית — מפעל חיים שהופך שאריות מטבח וגן לאדמה פורייה, שחורה ועשירה.',
    metaDescriptionEn: 'Build a healthy compost pile with the right layers, ratios and timeline for rich finished compost.',
    categoryHe: 'קומפוסט',
    categoryEn: 'Compost',
    filenameHe: '21_ערימת_קומפוסט.md',
    filenameEn: '21_compost_pile.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/compost-pile.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --soil1:#1a0f06;
  --soil2:#2d1a08;
  --soil3:#4a2e10;
  --soil4:#7a4e20;
  --soil5:#a87040;
  --humus:#f0e8d8;
  --humus-dark:#e0d0b8;
  --green:#2a4a1a;
  --green-light:#4a7a2a;
  --green-pale:#d0e8b8;
  --amber:#c8880a;
  --rust:#8b3a1a;
  --cream:#faf6ef;
  font-family:'Lato',sans-serif;
  background:var(--cream);
  color:var(--soil1);
}
.hero{
  position:relative;
  overflow:hidden;
  padding:0;
}
.hero-layers{
  display:flex;
  flex-direction:column;
  gap:0;
}
.layer{
  padding:0 2.5rem;
  display:flex;
  align-items:center;
}
.layer-sky{background:#c8e8f0;padding-top:2.5rem;padding-bottom:1rem;gap:2rem;}
.layer-brown{background:#8b5a2a;height:14px;}
.layer-dark{background:#4a2e10;height:10px;}
.layer-darkest{background:#1a0f06;height:8px;}
.hero-tag{display:inline-block;background:rgba(0,0,0,0.2);color:#e0d8c8;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:0.9rem;}
.hero h1{font-family:'Playfair Display',serif;font-size:2.8rem;font-weight:700;color:var(--soil1);line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Playfair Display',serif;font-size:0.95rem;font-style:italic;color:var(--soil4);margin-bottom:1.1rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:var(--soil4);font-weight:300;}
.hero-img{width:130px;height:130px;border-radius:50%;object-fit:cover;object-position:center 18%;border:3px solid var(--soil4);flex-shrink:0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Playfair Display',serif;font-size:1.05rem;line-height:1.9;color:var(--soil3);border-right:3px solid var(--soil4);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--soil2);color:var(--humus);font-family:'Playfair Display',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--soil1);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--soil5);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(74,46,16,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--soil3);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--soil1);font-weight:700;}
.layers-diagram{margin:1.25rem 0;border-radius:8px;overflow:hidden;border:1px solid rgba(74,46,16,0.2);}
.dlayer{padding:12px 16px;direction:rtl;display:flex;align-items:center;gap:12px;}
.dlayer-1{background:#d0e8b8;}
.dlayer-2{background:#c8a870;}
.dlayer-3{background:#d0e8b8;}
.dlayer-4{background:#a87040;}
.dlayer-5{background:#d0e8b8;}
.dlayer-6{background:#8b5a2a;}
.dlayer-label{font-size:0.85rem;font-weight:700;flex:1;}
.dlayer-desc{font-size:0.78rem;font-weight:300;opacity:0.8;}
.dlayer-cm{font-size:0.72rem;font-weight:700;white-space:nowrap;opacity:0.7;}
.dlayer-1 .dlayer-label{color:#2a4a1a;}
.dlayer-2 .dlayer-label{color:#4a2e10;}
.dlayer-3 .dlayer-label{color:#2a4a1a;}
.dlayer-4 .dlayer-label{color:#2a1408;}
.dlayer-5 .dlayer-label{color:#2a4a1a;}
.dlayer-6 .dlayer-label{color:#faf6ef;}
.dlayer-6 .dlayer-desc{color:#e0d0b8;}
.dlayer-6 .dlayer-cm{color:#c8a870;}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:1.25rem 0;}
.stat{background:var(--soil2);border-radius:6px;padding:14px;text-align:center;}
.stat-val{font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:var(--amber);display:block;}
.stat-lbl{font-size:0.72rem;color:#a87040;margin-top:3px;}
.timeline{display:flex;flex-direction:column;gap:0;margin:1.25rem 0;position:relative;}
.timeline::before{content:'';position:absolute;right:17px;top:20px;bottom:20px;width:2px;background:var(--humus-dark);}
.tl{display:flex;gap:14px;align-items:flex-start;padding:10px 0;direction:rtl;position:relative;z-index:1;}
.tl-dot{width:34px;height:34px;border-radius:50%;background:var(--soil3);color:var(--humus);font-size:0.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1.2;}
.tl-title{font-size:0.9rem;font-weight:700;color:var(--soil1);margin-bottom:2px;}
.tl-desc{font-size:0.82rem;color:var(--soil4);line-height:1.6;}
.chupchu{background:var(--humus);border:1px solid rgba(74,46,16,0.2);border-radius:8px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(74,46,16,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--soil4);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--soil3);}
.signs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.sign{border-radius:8px;padding:12px 14px;direction:rtl;}
.sign-good{background:var(--green-pale);border:1px solid rgba(74,122,42,0.3);}
.sign-bad{background:#fce8e0;border:1px solid rgba(139,58,26,0.3);}
.sign-title{font-size:0.82rem;font-weight:700;margin-bottom:6px;}
.sign-good .sign-title{color:var(--green);}
.sign-bad .sign-title{color:var(--rust);}
.sign-item{font-size:0.8rem;line-height:1.65;color:var(--soil3);margin-bottom:3px;}
.related{background:var(--humus-dark);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--soil1);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--green-light);text-decoration:none;}
.related-link::before{content:'←';color:var(--soil4);font-size:12px;}
.footer-cta{background:var(--soil1);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(168,112,64,0.4);flex-shrink:0;}
.footer-text{font-family:'Playfair Display',serif;font-size:0.9rem;line-height:1.7;color:var(--humus);flex:1;}
.footer-text em{font-size:0.78rem;color:#4a2e10;font-style:normal;}
.footer-btn{display:inline-block;background:var(--amber);color:var(--soil1);font-size:0.8rem;font-weight:700;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.stats{grid-template-columns:1fr 1fr;}.signs{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-layers">
    <div class="layer layer-sky">
      <div style="flex:1;">
        <span class="hero-tag">קומפוסט · Composting</span>
        <h1 itemprop="headline">ערימת קומפוסט</h1>
        <div class="hero-en">Compost Pile — The Complete Guide</div>
        <div class="hero-meta"><span>קריאה: 10 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
      </div>
      <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
    </div>
    <div class="layer layer-brown"></div>
    <div class="layer layer-dark"></div>
    <div class="layer layer-darkest"></div>
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">ערימת קומפוסט היא לב הגינה הביודינמית — מפעל חיים שהופך שאריות מטבח וגן לאדמה פורייה, שחורה ועשירה. ברגע שמבינים את העקרונות, זה פשוט מאוד.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>שכבות הקומפוסט</h2><span class="sh-en">The layers</span></div>
    <hr class="div">
    <p class="p">הסוד הוא <strong>איזון בין חומר ירוק לחומר חום</strong> — פחמן לחנקן, יבש ללח, קשה לרך. כל שכבה תורמת משהו אחר לתהליך.</p>
    <div class="layers-diagram">
      <div class="dlayer dlayer-1"><span class="dlayer-label">חומר ירוק</span><span class="dlayer-desc">גזם טרי, קליפות, שאריות ירק</span><span class="dlayer-cm">10 ס"מ</span></div>
      <div class="dlayer dlayer-2"><span class="dlayer-label">חומר חום</span><span class="dlayer-desc">עלים יבשים, קש, קרטון</span><span class="dlayer-cm">10 ס"מ</span></div>
      <div class="dlayer dlayer-3"><span class="dlayer-label">חומר ירוק</span><span class="dlayer-desc">חזרה על הכבוד ירוק</span><span class="dlayer-cm">10 ס"מ</span></div>
      <div class="dlayer dlayer-4"><span class="dlayer-label">חומר חום</span><span class="dlayer-desc">וכן הלאה לסירוגין</span><span class="dlayer-cm">10 ס"מ</span></div>
      <div class="dlayer dlayer-5"><span class="dlayer-label">אדמה / קומפוסט ישן</span><span class="dlayer-desc">מחסן חיידקים — מאיץ את הפירוק</span><span class="dlayer-cm">2 ס"מ</span></div>
      <div class="dlayer dlayer-6"><span class="dlayer-label">בסיס — ענפים דקים</span><span class="dlayer-desc">מאפשר אוורור מהתחתית</span><span class="dlayer-cm">15 ס"מ</span></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>המספרים החשובים</h2><span class="sh-en">Key numbers</span></div>
    <hr class="div">
    <div class="stats">
      <div class="stat"><span class="stat-val">30:1</span><div class="stat-lbl">יחס פחמן:חנקן אידיאלי</div></div>
      <div class="stat"><span class="stat-val">60°C</span><div class="stat-lbl">טמפ' ליבה — הורג זרעי עשבים</div></div>
      <div class="stat"><span class="stat-val">3–6</span><div class="stat-lbl">חודשים עד קומפוסט בשל</div></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הגלובוס בחזה שלי מלמד אותי — כל דבר שחי חוזר לאדמה. הקומפוסט רק מאיץ את מה שהטבע עושה ממילא. אתה לא יוצר — אתה מסייע.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>לוח הזמנים</h2><span class="sh-en">Timeline</span></div>
    <hr class="div">
    <div class="timeline">
      <div class="tl"><div class="tl-dot">שבוע 1</div><div><div class="tl-title">הקמה</div><div class="tl-desc">בניית הערימה בשכבות. הוספת מים אם יבש מדי — כמו ספוג סחוט.</div></div></div>
      <div class="tl"><div class="tl-dot">שבוע 2</div><div><div class="tl-title">חום ראשון</div><div class="tl-desc">הערימה מתחממת — זה סימן טוב. החיידקים עובדים. לא לגעת.</div></div></div>
      <div class="tl"><div class="tl-dot">שבוע 4</div><div><div class="tl-title">הפיכה ראשונה</div><div class="tl-desc">מניידים חומר מבחוץ לפנים, מאווררים. הערימה תתחמם שוב.</div></div></div>
      <div class="tl"><div class="tl-dot">חודש 2</div><div><div class="tl-title">הפיכות נוספות</div><div class="tl-desc">כל 3–4 שבועות. ככל שמפנים יותר — הקומפוסט מוכן מהר יותר.</div></div></div>
      <div class="tl"><div class="tl-dot">חודש 3+</div><div><div class="tl-title">קומפוסט בשל</div><div class="tl-desc">צבע שחור, ריח אדמה יער, לא מזהים חומרים מקוריים — מוכן!</div></div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ד</div><h2>סימנים לאבחון</h2><span class="sh-en">Diagnosis</span></div>
    <hr class="div">
    <div class="signs">
      <div class="sign sign-good"><div class="sign-title">הערימה בריאה</div><div class="sign-item">מתחממת לאחר הפיכה</div><div class="sign-item">ריח אדמה נעים</div><div class="sign-item">לחה אבל לא רטובה</div><div class="sign-item">תולעים ורודות גלויות</div></div>
      <div class="sign sign-bad"><div class="sign-title">צריך התייחסות</div><div class="sign-item">ריח רקבון — חסר אוורור</div><div class="sign-item">יבש מדי — הוסף מים</div><div class="sign-item">קר מדי — הוסף ירוק</div><div class="sign-item">נמלים — יבש מדי</div></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">יום שורש לפי הלוח הביודינמי — הזמן הטוב ביותר להוסיף לקומפוסט ולהפוך אותו. האדמה קולטת את החיים החדשים ביום הזה.</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/vermicompost">ורמיקומפוסט — תולעים בעבודה</a>
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט — להפיק מהקומפוסט יותר</a>
      <a class="related-link" href="/articles/compost-dont">מה לא לשים בקומפוסט</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש הבא לעבוד עם הקומפוסט?<br><em>Find the biodynamic root day for composting work.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'vermicompost',
    titleHe: 'ורמיקומפוסט',
    titleEn: 'Vermicompost — The Worm Factory',
    metaDescriptionHe: 'תולעת אחת קטנה ואדומה אוכלת פסולת מטבח ומפרישה את הדשן העשיר ביותר שידע הגננות הביודינמית.',
    metaDescriptionEn: 'Set up a worm bin at home and harvest the richest organic fertiliser in biodynamic gardening.',
    categoryHe: 'קומפוסט',
    categoryEn: 'Compost',
    filenameHe: '22_ורמיקומפוסט.md',
    filenameEn: '22_vermicompost.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/vermicompost.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --worm:#8b2a1a;
  --worm-pale:#f5d8d0;
  --dark:#1a0a0a;
  --rich:#2d1408;
  --mid:#5a2a14;
  --humus:#c8a070;
  --soil:#f0e8d8;
  --soil-dark:#e0d0b8;
  --alive:#4a6a1a;
  --alive-pale:#d8e8b8;
  --pink:#c85a5a;
  font-family:'DM Sans',sans-serif;
  background:var(--soil);
  color:var(--dark);
}
.hero{
  background:var(--rich);
  padding:3rem 2.5rem 2.5rem;
  display:flex;align-items:center;gap:2rem;
  position:relative;overflow:hidden;
}
.hero-worm-lines{
  position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(35deg,transparent,transparent 18px,rgba(139,42,26,0.08) 18px,rgba(139,42,26,0.08) 19px);
}
.hero-content{flex:1;position:relative;z-index:1;}
.hero-tag{display:inline-block;background:var(--worm);color:#fce8e4;font-size:10px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:1rem;}
.hero h1{font-family:'DM Serif Display',serif;font-size:2.8rem;color:#f5e8e0;line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'DM Serif Display',serif;font-size:0.95rem;font-style:italic;color:var(--humus);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#7a4a2a;font-weight:300;}
.hero-img{width:130px;height:130px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid var(--worm);flex-shrink:0;position:relative;z-index:1;}
.body{padding:0 2.5rem;}
.intro{font-family:'DM Serif Display',serif;font-size:1.05rem;line-height:1.9;color:var(--rich);border-right:3px solid var(--worm);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--worm);color:#fce8e4;font-family:'DM Serif Display',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--dark);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--mid);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(139,42,26,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--rich);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--dark);font-weight:500;}
.worm-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:1.25rem 0;}
.wf{background:var(--dark);border-radius:8px;padding:14px;text-align:center;}
.wf-val{font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--worm);display:block;margin-bottom:2px;}
.wf-lbl{font-size:0.72rem;color:#7a4a2a;}
.setup-steps{display:flex;flex-direction:column;gap:8px;margin:1.25rem 0;}
.setup-step{display:flex;gap:12px;align-items:flex-start;background:var(--soil-dark);border-radius:6px;padding:12px;direction:rtl;}
.step-n{width:30px;height:30px;background:var(--worm);color:white;border-radius:50%;font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step-title{font-size:0.9rem;font-weight:500;color:var(--dark);margin-bottom:2px;}
.step-desc{font-size:0.82rem;color:var(--mid);line-height:1.6;}
.chupchu{background:var(--worm-pale);border:1px solid rgba(139,42,26,0.25);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(139,42,26,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--worm);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--rich);}
.feed-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.feed-yes{background:var(--alive-pale);border:1px solid rgba(74,106,26,0.25);border-radius:8px;padding:12px 14px;direction:rtl;}
.feed-no{background:#fce8e0;border:1px solid rgba(139,42,26,0.25);border-radius:8px;padding:12px 14px;direction:rtl;}
.feed-title{font-size:0.82rem;font-weight:500;margin-bottom:6px;}
.feed-yes .feed-title{color:var(--alive);}
.feed-no .feed-title{color:var(--worm);}
.feed-item{font-size:0.8rem;color:var(--rich);line-height:1.7;}
.castings-box{background:var(--dark);border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0;direction:rtl;}
.castings-title{font-size:0.72rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--humus);margin-bottom:0.75rem;}
.castings-text{font-family:'DM Serif Display',serif;font-size:1rem;line-height:1.8;color:#d8c8a8;}
.related{background:var(--soil-dark);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'DM Serif Display',serif;font-size:1rem;color:var(--dark);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--alive);text-decoration:none;}
.related-link::before{content:'←';color:var(--worm);font-size:12px;}
.footer-cta{background:var(--dark);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid var(--worm);flex-shrink:0;}
.footer-text{font-family:'DM Serif Display',serif;font-size:0.9rem;line-height:1.7;color:#d8c0a8;flex:1;}
.footer-text em{font-size:0.78rem;color:#4a2a14;font-style:normal;}
.footer-btn{display:inline-block;background:var(--worm);color:#fce8e4;font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.worm-facts{grid-template-columns:1fr 1fr;}.feed-grid{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-worm-lines"></div>
  <div class="hero-content">
    <span class="hero-tag">קומפוסט · Composting</span>
    <h1 itemprop="headline">ורמיקומפוסט</h1>
    <div class="hero-en">Vermicompost — The Worm Factory</div>
    <div class="hero-meta"><span>קריאה: 6 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
  </div>
  <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
</header>
<div class="body">
  <p class="intro" itemprop="description">תולעת אחת קטנה ואדומה אוכלת פסולת מטבח ומפרישה את הדשן העשיר ביותר שידע הגננות הביודינמית. ורמיקומפוסט הוא קומפוסט על סטרואידים — וכל מה שצריך זה קופסה וקצת תולעים.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>למה תולעים?</h2><span class="sh-en">Why worms?</span></div>
    <hr class="div">
    <p class="p">תולעי אדמה אוכלות חומר אורגני ומייצרות <strong>הפרשות תולעים (castings)</strong> — הדשן האורגני הצפוף ביותר בטבע. עשיר פי 5–7 מקומפוסט רגיל בחנקן, זרחן ואשלגן, ורווי חיידקים מועילים.</p>
    <div class="worm-facts">
      <div class="wf"><span class="wf-val">5×</span><div class="wf-lbl">יותר חנקן מקומפוסט רגיל</div></div>
      <div class="wf"><span class="wf-val">500g</span><div class="wf-lbl">אוכל ביום לכל ק"ג תולעים</div></div>
      <div class="wf"><span class="wf-val">90</span><div class="wf-lbl">יום עד קומפוסט בשל ראשון</div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>הקמת מערכת ורמיקומפוסט</h2><span class="sh-en">Setup</span></div>
    <hr class="div">
    <div class="setup-steps">
      <div class="setup-step"><div class="step-n">1</div><div><div class="step-title">הכלי</div><div class="step-desc">קופסת פלסטיק אטומה לאור עם חורי ניקוז. גודל מינימלי 40×60 ס"מ. עדיף מערכת שכבות.</div></div></div>
      <div class="setup-step"><div class="step-n">2</div><div><div class="step-title">מצע ראשוני</div><div class="step-desc">קרטון קרוע + עיתון ישן + קצת אדמה — בסיס נוח ולח לתולעים להתיישב בו.</div></div></div>
      <div class="setup-step"><div class="step-n">3</div><div><div class="step-title">התולעים</div><div class="step-desc">תולעי אדמה אדומות (Eisenia fetida) — לא תולעי גינה רגילות. קונים בחנויות דיג או גינון.</div></div></div>
      <div class="setup-step"><div class="step-n">4</div><div><div class="step-title">מיקום</div><div class="step-desc">צל מלא, טמפ' 15–25°C. לא בשמש ישירה — תולעים מתות בחום מעל 35°C.</div></div></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הזרועות שלי הן כלי גינה — אבל התולעים עובדות 24 שעות ביממה בלי לעצור. יש לי כבוד גדול אליהן. הן הקדמוניות האמיתיות של הגינה.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>מה מאכילים</h2><span class="sh-en">What to feed</span></div>
    <hr class="div">
    <div class="feed-grid">
      <div class="feed-yes">
        <div class="feed-title">כן — אוהבות</div>
        <div class="feed-item">קליפות ירק ופרי</div>
        <div class="feed-item">שאריות קפה ותה</div>
        <div class="feed-item">קרטון ועיתון קרוע</div>
        <div class="feed-item">עלים יבשים</div>
        <div class="feed-item">לחם ישן (כמות קטנה)</div>
      </div>
      <div class="feed-no">
        <div class="feed-title">לא — מזיק להן</div>
        <div class="feed-item">בצל ושום (חומצה)</div>
        <div class="feed-item">הדרים בכמות גדולה</div>
        <div class="feed-item">בשר ומוצרי חלב</div>
        <div class="feed-item">מזון שמנוני</div>
        <div class="feed-item">חומר מבושל חם</div>
      </div>
    </div>
  </div>
  <div class="castings-box">
    <div class="castings-title">שימושים להפרשות התולעים</div>
    <div class="castings-text">הפרשות יבשות — מפזרים ישירות על אדמת הערוגה. נוזל (worm tea) — מדללים 1:10 ומשקים. אפשר להוסיף לתה קומפוסט להעצמה כפולה.</div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">ביום שורש לפי הלוח הביודינמי — הוסף הפרשות תולעים לאדמה. השורשים קולטים ביום הזה פי כמה. פתח גינה חיה לבדוק!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/compost-pile">ערימת קומפוסט — המדריך המלא</a>
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט — השלמה מושלמת</a>
      <a class="related-link" href="/articles/compost-dont">מה לא לשים בקומפוסט</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש הבא להוסיף ורמיקומפוסט לגינה?<br><em>Find the biodynamic root day for worm casting application.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'compost-dont',
    titleHe: 'מה לא לשים בקומפוסט',
    titleEn: 'What Not to Compost — The No-List',
    metaDescriptionHe: 'חלק מהחומרים יהרסו את כל הערימה — ריח, מחלות, מזיקים. הנה הרשימה שצריך לדעת בעל פה.',
    metaDescriptionEn: 'Know what to keep out of your compost pile to avoid smells, pests and pathogens.',
    categoryHe: 'קומפוסט',
    categoryEn: 'Compost',
    filenameHe: '23_מה_לא_לשים_בקומפוסט.md',
    filenameEn: '23_compost_dont.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/compost-dont.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --red:#cc1a1a;
  --red-pale:#fce8e8;
  --orange:#e05a00;
  --orange-pale:#fdf0e0;
  --green:#1a6a1a;
  --green-pale:#e0f0e0;
  --black:#0a0a0a;
  --dark:#1a1a1a;
  --gray:#3a3a3a;
  --gray-mid:#6a6a6a;
  --offwhite:#f8f6f2;
  --yellow:#f0c000;
  font-family:'Inter',sans-serif;
  background:var(--offwhite);
  color:var(--black);
}
.hero{
  background:var(--black);
  padding:3rem 2.5rem 2.5rem;
  display:flex;align-items:center;gap:2rem;
  position:relative;
  overflow:hidden;
}
.hero-diagonal{
  position:absolute;top:0;right:0;
  width:0;height:0;
  border-style:solid;
  border-width:0 120px 120px 0;
  border-color:transparent var(--red) transparent transparent;
}
.hero-content{flex:1;position:relative;z-index:1;}
.hero-tag{display:inline-block;background:var(--red);color:white;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:3px 11px;margin-bottom:1rem;}
.hero h1{font-family:'Bebas Neue',sans-serif;font-size:3.5rem;color:white;line-height:1;margin-bottom:0.3rem;direction:rtl;letter-spacing:0.02em;}
.hero-en{font-size:0.88rem;font-weight:300;color:var(--gray-mid);margin-bottom:1.25rem;letter-spacing:0.02em;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#4a4a4a;font-weight:300;}
.hero-img{width:110px;height:110px;border-radius:0;object-fit:cover;object-position:center 18%;border:2px solid var(--red);flex-shrink:0;}
.body{padding:0 2.5rem;}
.intro{font-size:1rem;line-height:1.85;color:var(--dark);border-right:4px solid var(--red);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:24px;height:24px;background:var(--red);color:white;font-family:'Bebas Neue',sans-serif;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--black);letter-spacing:0.03em;}
.sh-en{font-size:0.72rem;font-weight:300;color:var(--gray-mid);letter-spacing:0.05em;margin-right:auto;}
.div{border:none;border-top:2px solid var(--black);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--dark);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--black);font-weight:500;}
.no-list{display:flex;flex-direction:column;gap:8px;margin:1.25rem 0;}
.no-item{display:flex;align-items:flex-start;gap:0;border-radius:4px;overflow:hidden;direction:rtl;}
.no-icon{width:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;font-weight:400;}
.no-icon-red{background:var(--red);color:white;}
.no-icon-orange{background:var(--orange);color:white;}
.no-body{flex:1;padding:10px 12px;}
.no-title{font-size:0.88rem;font-weight:500;color:var(--black);margin-bottom:2px;}
.no-why{font-size:0.8rem;color:var(--gray);line-height:1.55;}
.yes-list{display:flex;flex-direction:column;gap:6px;margin:1.25rem 0;}
.yes-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--green-pale);border-radius:4px;direction:rtl;}
.yes-check{width:20px;height:20px;background:var(--green);border-radius:50%;color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.yes-text{font-size:0.88rem;color:var(--dark);}
.chupchu{background:white;border:2px solid var(--red);border-radius:4px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;object-fit:cover;object-position:center 15%;border:2px solid var(--red);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--red);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--dark);}
.speed-table{margin:1.25rem 0;border:1px solid #ddd;border-radius:4px;overflow:hidden;}
.speed-row{display:flex;align-items:center;border-bottom:1px solid #eee;direction:rtl;}
.speed-row:last-child{border-bottom:none;}
.speed-item{flex:1;padding:9px 12px;font-size:0.85rem;color:var(--dark);}
.speed-bar-wrap{width:100px;padding:9px 12px;flex-shrink:0;}
.speed-bar{height:8px;border-radius:4px;background:var(--green);}
.speed-header{background:#f0f0f0;font-weight:500;font-size:0.78rem;color:var(--gray);}
.related{background:#f0f0f0;border-radius:4px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:var(--black);margin-bottom:1rem;letter-spacing:0.03em;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--green);text-decoration:none;}
.related-link::before{content:'←';color:var(--red);font-size:14px;font-weight:700;}
.footer-cta{background:var(--black);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;object-fit:cover;object-position:center 15%;border:2px solid var(--red);flex-shrink:0;}
.footer-text{font-size:0.9rem;line-height:1.7;color:#c8c8c8;flex:1;}
.footer-text em{font-size:0.78rem;color:#4a4a4a;font-style:normal;}
.footer-btn{display:inline-block;background:var(--red);color:white;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:0.05em;padding:9px 20px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2.5rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-diagonal"></div>
  <div class="hero-content">
    <span class="hero-tag">קומפוסט · Composting</span>
    <h1 itemprop="headline">מה לא לשים בקומפוסט</h1>
    <div class="hero-en">What Not to Compost — The No-List</div>
    <div class="hero-meta"><span>קריאה: 4 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
  </div>
  <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
</header>
<div class="body">
  <p class="intro" itemprop="description">קומפוסט טוב הוא עסק עדין. מה שנכנס פנימה קובע מה יצא. חלק מהחומרים יהרסו את כל הערימה — ריח, מחלות, מזיקים. הנה הרשימה שצריך לדעת בעל פה.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>אסור — לעולם לא</h2><span class="sh-en">Never, ever</span></div>
    <hr class="div">
    <div class="no-list">
      <div class="no-item"><div class="no-icon no-icon-red">✗</div><div class="no-body"><div class="no-title">בשר, דגים ועצמות</div><div class="no-why">ריח חזק שמושך מזיקים ועכברים. מתפרק לאט ומייצר חיידקים מזיקים.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-red">✗</div><div class="no-body"><div class="no-title">מוצרי חלב</div><div class="no-why">ריח רקבון חזק, מושך חיות בר, מאט פירוק.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-red">✗</div><div class="no-body"><div class="no-title">שמנים ושומנים</div><div class="no-why">מונעים אוורור, חונקים חיידקים מועילים, ריח חזק.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-red">✗</div><div class="no-body"><div class="no-title">צמחים חולים</div><div class="no-why">מחלות וזרעי עשבים שוטים שורדים גם בטמפ' גבוהה ויחזרו לגינה.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-red">✗</div><div class="no-body"><div class="no-title">גזם מטופל בקוטלי מחלות</div><div class="no-why">כימיקלים הורגים חיידקים מועילים ועלולים להרעיל אדמה.</div></div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>בזהירות — רק במינון</h2><span class="sh-en">With caution</span></div>
    <hr class="div">
    <div class="no-list">
      <div class="no-item"><div class="no-icon no-icon-orange">!</div><div class="no-body"><div class="no-title">קליפות הדרים בכמות גדולה</div><div class="no-why">חומציות מדי — מאטות פירוק. עד 10% מהנפח — בסדר.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-orange">!</div><div class="no-body"><div class="no-title">בצל ושום גולמי</div><div class="no-why">ריח חזק, מדכא תולעים. בכמות קטנה — בסדר.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-orange">!</div><div class="no-body"><div class="no-title">עיתון מצויר / קרטון מצופה</div><div class="no-why">דיו עלול להכיל מתכות כבדות. עיתון רגיל — בסדר.</div></div></div>
      <div class="no-item"><div class="no-icon no-icon-orange">!</div><div class="no-body"><div class="no-title">אפר עץ בכמות גדולה</div><div class="no-why">מעלה pH חזק. כף-שתיים לכל שכבה — בסדר.</div></div></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הקומפוסט שלי הוא מה שהוא — רק מה שהגינה מייצרת. כשספק — אל תשים. עדיף ערימה קצת יותר קטנה ובריאה מערימה גדולה עם בעיות.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>כן — הכי טוב לקומפוסט</h2><span class="sh-en">Best inputs</span></div>
    <hr class="div">
    <div class="yes-list">
      <div class="yes-item"><div class="yes-check">✓</div><span class="yes-text">קליפות ירק ופרי טריות</span></div>
      <div class="yes-item"><div class="yes-check">✓</div><span class="yes-text">שאריות קפה ושקיות תה</span></div>
      <div class="yes-item"><div class="yes-check">✓</div><span class="yes-text">גזם ירוק — ענפים דקים, עלים טריים</span></div>
      <div class="yes-item"><div class="yes-check">✓</div><span class="yes-text">עלים יבשים, קש, קרטון נקי</span></div>
      <div class="yes-item"><div class="yes-check">✓</div><span class="yes-text">פרחים קמולים (לא מטופלים)</span></div>
      <div class="yes-item"><div class="yes-check">✓</div><span class="yes-text">ביצה — רק קליפה (לא הביצה עצמה)</span></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ד</div><h2>מהירות פירוק</h2><span class="sh-en">Decomposition speed</span></div>
    <hr class="div">
    <div class="speed-table">
      <div class="speed-row speed-header"><span class="speed-item">חומר</span><span class="speed-bar-wrap">מהירות</span></div>
      <div class="speed-row"><span class="speed-item">שאריות קפה</span><div class="speed-bar-wrap"><div class="speed-bar" style="width:90%;"></div></div></div>
      <div class="speed-row"><span class="speed-item">קליפות ירק</span><div class="speed-bar-wrap"><div class="speed-bar" style="width:80%;"></div></div></div>
      <div class="speed-row"><span class="speed-item">גזם ירוק</span><div class="speed-bar-wrap"><div class="speed-bar" style="width:65%;"></div></div></div>
      <div class="speed-row"><span class="speed-item">עלים יבשים</span><div class="speed-bar-wrap"><div class="speed-bar" style="width:40%;background:#c8a000;"></div></div></div>
      <div class="speed-row"><span class="speed-item">קרטון / עיתון</span><div class="speed-bar-wrap"><div class="speed-bar" style="width:30%;background:#c8a000;"></div></div></div>
      <div class="speed-row"><span class="speed-item">ענפים עבים</span><div class="speed-bar-wrap"><div class="speed-bar" style="width:15%;background:#cc4a00;"></div></div></div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/compost-pile">ערימת קומפוסט — המדריך המלא</a>
      <a class="related-link" href="/articles/vermicompost">ורמיקומפוסט</a>
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש הביודינמי לעבוד עם הקומפוסט?<br><em>Find the biodynamic root day for composting work.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה</a>
</footer>
</article>`,
  },
  {
    id: 'bd500',
    titleHe: 'BD 500 — קרן הזבל',
    titleEn: "Horn Manure — The Earth's Awakening",
    metaDescriptionHe: 'בסתיו, קרן פרה מלאה בזבל נקברת בעומק האדמה. באביב, כשחופרים, מה שיצא הוא לא זבל — זה משהו אחר לגמרי.',
    metaDescriptionEn: 'Bury cow manure in a horn through winter and unlock the most powerful biodynamic soil preparation.',
    categoryHe: 'פרפרטים BD',
    categoryEn: 'BD Preps',
    filenameHe: '24_BD500_קרן_הזבל.md',
    filenameEn: '24_bd500_horn_manure.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/bd500.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600&family=Jost:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --midnight:#06080f;
  --night:#0d1220;
  --dusk:#1a2040;
  --moon:#c8d4f0;
  --moon-pale:#e8edf8;
  --gold:#c8a030;
  --gold-pale:#f0e0a0;
  --earth:#3d2010;
  --earth-mid:#6a3a18;
  --earth-pale:#c8a070;
  --horn:#d4b880;
  --cream:#faf6ef;
  font-family:'Jost',sans-serif;
  background:var(--cream);
  color:var(--midnight);
}
.hero{
  background:var(--midnight);
  padding:4rem 2.5rem 3rem;
  position:relative;
  overflow:hidden;
  text-align:center;
}
.hero-stars{position:absolute;inset:0;pointer-events:none;}
.star{position:absolute;background:white;border-radius:50%;}
.hero-moon{
  position:absolute;top:1.5rem;left:50%;transform:translateX(-50%);
  width:60px;height:60px;border-radius:50%;
  background:var(--moon);
  opacity:0.15;
}
.hero-content{position:relative;z-index:1;}
.hero-tag{display:inline-block;border:1px solid rgba(200,160,48,0.4);color:var(--gold);font-family:'Cinzel',serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;padding:4px 14px;margin-bottom:1.5rem;}
.hero h1{font-family:'Cinzel',serif;font-size:2.8rem;font-weight:600;color:var(--moon-pale);line-height:1.1;margin-bottom:0.4rem;direction:rtl;}
.hero-num{font-family:'Cinzel',serif;font-size:5rem;font-weight:600;color:rgba(200,160,48,0.15);line-height:1;position:absolute;top:1rem;right:2rem;}
.hero-en{font-family:'IM Fell English',serif;font-size:1rem;font-style:italic;color:var(--gold);margin-bottom:1.5rem;}
.hero-meta{display:flex;gap:1.5rem;font-size:11px;color:rgba(200,212,240,0.4);font-weight:300;justify-content:center;}
.hero-img{width:100px;height:100px;border-radius:50%;object-fit:cover;object-position:center 18%;border:1px solid rgba(200,160,48,0.3);margin:1.5rem auto 0;display:block;}
.hero-divider{width:80px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:1.5rem auto 0;}
.body{padding:0 2.5rem;}
.intro{font-family:'IM Fell English',serif;font-size:1.1rem;font-style:italic;line-height:1.9;color:var(--earth-mid);border-right:2px solid var(--gold);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;background:var(--midnight);color:var(--gold);font-family:'Cinzel',serif;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(200,160,48,0.3);}
.sh h2{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:600;color:var(--midnight);}
.sh-en{font-size:0.72rem;font-weight:300;color:var(--earth-pale);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(100,58,24,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.9;color:var(--earth);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--midnight);font-weight:500;}
.ritual-steps{display:flex;flex-direction:column;gap:0;margin:1.25rem 0;position:relative;}
.ritual-steps::before{content:'';position:absolute;right:19px;top:24px;bottom:24px;width:1px;background:linear-gradient(to bottom,var(--gold),transparent);}
.rstep{display:flex;gap:14px;align-items:flex-start;padding:14px 0;direction:rtl;position:relative;z-index:1;}
.rstep-icon{width:38px;height:38px;border-radius:50%;background:var(--midnight);border:1px solid rgba(200,160,48,0.4);color:var(--gold);font-family:'Cinzel',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rstep-title{font-family:'Cinzel',serif;font-size:0.88rem;font-weight:600;color:var(--midnight);margin-bottom:3px;}
.rstep-desc{font-size:0.83rem;color:var(--earth-mid);line-height:1.65;}
.calendar-box{background:var(--midnight);border-radius:8px;padding:1.5rem;margin:1.25rem 0;direction:rtl;}
.cal-title{font-family:'Cinzel',serif;font-size:0.75rem;letter-spacing:0.12em;color:var(--gold);margin-bottom:1rem;}
.cal-row{display:flex;gap:0;margin-bottom:6px;align-items:center;direction:rtl;}
.cal-label{font-size:0.8rem;color:var(--moon);width:80px;flex-shrink:0;}
.cal-months{display:flex;gap:4px;flex:1;}
.cal-month{width:24px;height:24px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:rgba(255,255,255,0.3);flex-shrink:0;}
.cal-month.active-bury{background:rgba(200,160,48,0.3);color:var(--gold);}
.cal-month.active-dig{background:rgba(100,200,100,0.2);color:#80d080;}
.dynamo-box{background:rgba(200,160,48,0.06);border:1px solid rgba(200,160,48,0.2);border-radius:8px;padding:1.25rem 1.5rem;margin:1.25rem 0;direction:rtl;}
.dynamo-title{font-family:'Cinzel',serif;font-size:0.82rem;font-weight:600;color:var(--gold);margin-bottom:0.75rem;}
.dynamo-p{font-family:'IM Fell English',serif;font-size:0.95rem;font-style:italic;line-height:1.8;color:var(--earth-mid);}
.chupchu{background:var(--moon-pale);border:1px solid rgba(200,160,48,0.2);border-radius:8px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,160,48,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--gold);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--earth-mid);}
.related{background:var(--moon-pale);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Cinzel',serif;font-size:0.9rem;font-weight:600;color:var(--midnight);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--earth-mid);text-decoration:none;}
.related-link::before{content:'←';color:var(--gold);font-size:12px;}
.footer-cta{background:var(--midnight);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,160,48,0.3);flex-shrink:0;}
.footer-text{font-family:'IM Fell English',serif;font-size:0.95rem;font-style:italic;line-height:1.7;color:var(--moon);flex:1;}
.footer-text em{font-size:0.78rem;color:#3a4060;font-style:normal;font-family:'Jost',sans-serif;}
.footer-btn{display:inline-block;background:var(--gold);color:var(--midnight);font-family:'Cinzel',serif;font-size:0.8rem;font-weight:600;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;letter-spacing:0.05em;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-num{display:none;}.body{padding:0 1.5rem;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-stars">
    <div class="star" style="width:2px;height:2px;top:15%;right:20%;opacity:0.8;"></div>
    <div class="star" style="width:1px;height:1px;top:25%;right:40%;opacity:0.6;"></div>
    <div class="star" style="width:2px;height:2px;top:10%;right:60%;opacity:0.9;"></div>
    <div class="star" style="width:1px;height:1px;top:35%;right:75%;opacity:0.5;"></div>
    <div class="star" style="width:3px;height:3px;top:20%;right:85%;opacity:0.7;"></div>
    <div class="star" style="width:1px;height:1px;top:45%;right:30%;opacity:0.6;"></div>
    <div class="star" style="width:2px;height:2px;top:55%;right:55%;opacity:0.4;"></div>
    <div class="star" style="width:1px;height:1px;top:8%;right:50%;opacity:0.8;"></div>
  </div>
  <div class="hero-moon"></div>
  <div class="hero-num">500</div>
  <div class="hero-content">
    <span class="hero-tag">פרפרטים ביודינמיים · Biodynamic Preparations</span>
    <h1 itemprop="headline">BD 500 — קרן הזבל</h1>
    <div class="hero-en">Horn Manure — The Earth's Awakening</div>
    <div class="hero-meta"><span>קריאה: 12 דקות</span><span>רמה: מתקדם</span><span>עונה: סתיו–אביב</span></div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
    <div class="hero-divider"></div>
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">בסתיו, קרן פרה מלאה בזבל נקברת בעומק האדמה. שם, בחשכה, בקור, בלחות החורף — משהו עמוק קורה. באביב, כשחופרים, מה שיצא הוא לא זבל. זה משהו אחר לגמרי.</p>
  <div class="section">
    <div class="sh"><div class="sn">I</div><h2>הרעיון מאחורי הפרפרט</h2><span class="sh-en">The philosophy</span></div>
    <hr class="div">
    <p class="p">רודולף שטיינר, מייסד הגינה הביודינמית, טען שהקרן היא <strong>אנטנה של כוחות קוסמיים</strong>. הפרה שולחת את כוחות החיים שלה דרך הקרן אל האדמה — והזבל בתוכה סופג את כל אלה לאורך חודשי החורף.</p>
    <p class="p">התוצאה: פרפרט 500 עשיר בחיידקים, פטריות מיקוריזה, אנזימים ואנרגיה חיה שמעוררת את הקרקע מהשינה.</p>
  </div>
  <div class="dynamo-box">
    <div class="dynamo-title">מה קורה בקרן בחורף</div>
    <div class="dynamo-p">האדמה הקפואה מתנהגת כמו קפסולה. הקרן — בצורתה הספירלית — מרכזת את הכוחות פנימה. הזבל עובר תהליך המרה שאין לו שם מדויק — הוא לא מתפרק, הוא מתעלה.</div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הגלובוס בחזה שלי מלמד אותי — האדמה לא ישנה בחורף. היא חולמת. ופרפרט 500 הוא החלום שלה בצורת חומר.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">II</div><h2>הריטואל — שלב אחר שלב</h2><span class="sh-en">The ritual</span></div>
    <hr class="div">
    <div class="ritual-steps">
      <div class="rstep"><div class="rstep-icon">א</div><div><div class="rstep-title">איסוף הקרן</div><div class="rstep-desc">קרן פרה בוגרת — לא שור, לא עגל. הקרן היא צינור של אנרגיה חיה בלבד.</div></div></div>
      <div class="rstep"><div class="rstep-icon">ב</div><div><div class="rstep-title">מילוי בזבל</div><div class="rstep-desc">זבל פרה טרי ואיכותי. ממלאים היטב ללא חללים אוויר. אין דחיסה יתרה.</div></div></div>
      <div class="rstep"><div class="rstep-icon">ג</div><div><div class="rstep-title">קבורה — מיכאל (סוכות)</div><div class="rstep-desc">חופרים 50–60 ס"מ לאדמה. הקרן מונחת בנקודת צל, אדמה פוריה, לא ליד בטון.</div></div></div>
      <div class="rstep"><div class="rstep-icon">ד</div><div><div class="rstep-title">המתנה — כל החורף</div><div class="rstep-desc">4–6 חודשים. האדמה עובדת בחשכה. אין מה לעשות. זה הזמן לסמוך.</div></div></div>
      <div class="rstep"><div class="rstep-icon">ה</div><div><div class="rstep-title">חפירה — פסח</div><div class="rstep-desc">כשהאדמה מתחילה להתחמם. הפרפרט מוציאים בזהירות — צריך להריח אדמת יער. אז הצליח.</div></div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">III</div><h2>לוח קבורה וחפירה</h2><span class="sh-en">Calendar</span></div>
    <hr class="div">
    <div class="calendar-box">
      <div class="cal-title">חודשי שנה — קבורה וחפירה</div>
      <div class="cal-row">
        <span class="cal-label">קבורה</span>
        <div class="cal-months">
          <div class="cal-month">י'</div><div class="cal-month">פ'</div><div class="cal-month">מ'</div>
          <div class="cal-month">א'</div><div class="cal-month">מ'</div><div class="cal-month">י'</div>
          <div class="cal-month">י'</div><div class="cal-month">א'</div>
          <div class="cal-month active-bury">ס'</div><div class="cal-month active-bury">א'</div>
          <div class="cal-month active-bury">נ'</div><div class="cal-month active-bury">ד'</div>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">חפירה</span>
        <div class="cal-months">
          <div class="cal-month">י'</div><div class="cal-month">פ'</div>
          <div class="cal-month active-dig">מ'</div><div class="cal-month active-dig">א'</div>
          <div class="cal-month">מ'</div><div class="cal-month">י'</div>
          <div class="cal-month">י'</div><div class="cal-month">א'</div>
          <div class="cal-month">ס'</div><div class="cal-month">א'</div>
          <div class="cal-month">נ'</div><div class="cal-month">ד'</div>
        </div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">IV</div><h2>הדינמיזציה — לב השיטה</h2><span class="sh-en">Dynamization</span></div>
    <hr class="div">
    <p class="p">כפית אחת של פרפרט 500 מדוללת ב-<strong>40 ליטר מים</strong> ומוערבלת בעצמה למשך שעה תמימה — לסירוגין בכיוון השעון ונגדו. הכאוס והסדר לסירוגין — כך משחררים את הכוח.</p>
    <p class="p">מרססים בשקיעה, ישירות על האדמה — לא על עלים. פרפרט 500 מדבר עם השורשים.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">פרפרט 500 מרססים ביום שורש לפי הלוח הביודינמי — בשקיעה. האדמה ערה, השורשים פתוחים, והירח תומך. פתח גינה חיה לדעת מתי!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/bd501">BD 501 — קרן הסיליקה</a>
      <a class="related-link" href="/articles/cpp">CPP — בור הזבל</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש הבא לרסס BD 500?<br><em>Find the biodynamic root day for horn manure application.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה</a>
</footer>
</article>`,
  },
  {
    id: 'bd501',
    titleHe: 'BD 501 — קרן הסיליקה',
    titleEn: 'Horn Silica — The Light Preparation',
    metaDescriptionHe: 'אם BD 500 הוא כוח האדמה — BD 501 הוא כוח האור. אבקת קוורץ בקרן פרה, קבורה בקיץ, סופגת כוחות קוסמיים של אור.',
    metaDescriptionEn: 'Pack quartz powder into a cow horn, bury it through summer, and harvest the biodynamic light preparation.',
    categoryHe: 'פרפרטים BD',
    categoryEn: 'BD Preps',
    filenameHe: '25_BD501_קרן_הסיליקה.md',
    filenameEn: '25_bd501_horn_silica.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/bd501.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,600;1,400;1,600&family=Raleway:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --crystal:#e8f4ff;
  --crystal-deep:#a8c8f0;
  --sky:#4a88d0;
  --sky-deep:#1a4a8a;
  --noon:#fff8e8;
  --light:#fffef8;
  --prism1:#e8d0f8;
  --prism2:#d0e8ff;
  --prism3:#d0f8e8;
  --prism4:#fff0d0;
  --ink:#0a1428;
  --ink-mid:#1a3050;
  --ink-light:#4a6080;
  --gold:#c8a020;
  font-family:'Raleway',sans-serif;
  background:var(--light);
  color:var(--ink);
}
.hero{
  background:linear-gradient(160deg,var(--sky-deep) 0%,var(--sky) 60%,var(--crystal-deep) 100%);
  padding:3.5rem 2.5rem 3rem;
  position:relative;
  overflow:hidden;
  text-align:center;
}
.hero-rays{
  position:absolute;inset:0;pointer-events:none;
  background:repeating-conic-gradient(from 0deg at 50% -10%,rgba(255,255,255,0.04) 0deg,transparent 3deg,rgba(255,255,255,0.04) 6deg);
}
.hero-content{position:relative;z-index:1;}
.hero-tag{display:inline-block;background:rgba(255,255,255,0.15);color:white;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:3px 12px;border-radius:20px;margin-bottom:1.25rem;border:1px solid rgba(255,255,255,0.2);}
.hero h1{font-family:'Cormorant',serif;font-size:2.8rem;font-weight:600;color:white;line-height:1.05;margin-bottom:0.35rem;direction:rtl;}
.hero-num{font-family:'Raleway',sans-serif;font-size:5rem;font-weight:300;color:rgba(255,255,255,0.1);line-height:1;position:absolute;top:1rem;left:2rem;letter-spacing:-0.05em;}
.hero-en{font-family:'Cormorant',serif;font-size:1rem;font-style:italic;color:rgba(255,255,255,0.75);margin-bottom:1.5rem;}
.hero-meta{display:flex;gap:1.5rem;font-size:11px;color:rgba(255,255,255,0.45);font-weight:300;justify-content:center;}
.hero-img{width:100px;height:100px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid rgba(255,255,255,0.3);margin:1.5rem auto 0;display:block;}
.prism-bar{display:flex;height:4px;margin-top:2rem;}
.prism-seg{flex:1;}
.body{padding:0 2.5rem;}
.intro{font-family:'Cormorant',serif;font-size:1.1rem;font-style:italic;line-height:1.9;color:var(--ink-mid);border-right:2px solid var(--sky);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;background:var(--sky-deep);color:white;font-family:'Cormorant',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;}
.sh h2{font-family:'Cormorant',serif;font-size:1.25rem;font-weight:600;color:var(--ink);}
.sh-en{font-size:0.72rem;font-weight:300;color:var(--ink-light);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(74,136,208,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.9;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ink);font-weight:500;}
.contrast-box{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:1.25rem 0;}
.cb-500{background:var(--ink);border-radius:8px;padding:1.25rem;direction:rtl;}
.cb-501{background:var(--crystal);border-radius:8px;padding:1.25rem;direction:rtl;border:1px solid rgba(74,136,208,0.2);}
.cb-label{font-size:0.72rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.6rem;}
.cb-500 .cb-label{color:var(--gold);}
.cb-501 .cb-label{color:var(--sky);}
.cb-name{font-family:'Cormorant',serif;font-size:1.1rem;font-weight:600;margin-bottom:6px;}
.cb-500 .cb-name{color:white;}
.cb-501 .cb-name{color:var(--ink);}
.cb-desc{font-size:0.82rem;line-height:1.6;}
.cb-500 .cb-desc{color:rgba(200,212,240,0.7);}
.cb-501 .cb-desc{color:var(--ink-mid);}
.how-steps{display:flex;flex-direction:column;gap:8px;margin:1.25rem 0;}
.hstep{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:var(--crystal);border-radius:8px;direction:rtl;border:1px solid rgba(74,136,208,0.15);}
.hstep-n{width:28px;height:28px;background:var(--sky);color:white;border-radius:50%;font-size:12px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.hstep-title{font-size:0.88rem;font-weight:500;color:var(--ink);margin-bottom:2px;}
.hstep-desc{font-size:0.8rem;color:var(--ink-light);line-height:1.6;}
.timing-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.tg-card{border-radius:8px;padding:14px;direction:rtl;text-align:center;}
.tg-morning{background:var(--noon);border:1px solid rgba(200,160,32,0.2);}
.tg-evening{background:var(--ink);border:1px solid rgba(74,136,208,0.2);}
.tg-time{font-family:'Cormorant',serif;font-size:1.8rem;font-weight:600;display:block;margin-bottom:4px;}
.tg-morning .tg-time{color:var(--gold);}
.tg-evening .tg-time{color:var(--crystal-deep);}
.tg-label{font-size:0.78rem;font-weight:300;}
.tg-morning .tg-label{color:var(--ink-light);}
.tg-evening .tg-label{color:rgba(168,200,240,0.6);}
.tg-desc{font-size:0.75rem;margin-top:6px;line-height:1.5;}
.tg-morning .tg-desc{color:var(--ink-light);}
.tg-evening .tg-desc{color:rgba(168,200,240,0.5);}
.chupchu{background:var(--crystal);border:1px solid rgba(74,136,208,0.2);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(74,136,208,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--sky);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.related{background:var(--crystal);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Cormorant',serif;font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--sky-deep);text-decoration:none;}
.related-link::before{content:'←';color:var(--sky);font-size:12px;}
.footer-cta{background:var(--sky-deep);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(74,136,208,0.4);flex-shrink:0;}
.footer-text{font-family:'Cormorant',serif;font-size:0.95rem;font-style:italic;line-height:1.7;color:var(--crystal);flex:1;}
.footer-text em{font-size:0.78rem;color:#2a4a6a;font-style:normal;font-family:'Raleway',sans-serif;}
.footer-btn{display:inline-block;background:var(--sky);color:white;font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-num{display:none;}.body{padding:0 1.5rem;}.contrast-box{grid-template-columns:1fr;}.timing-grid{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-rays"></div>
  <div class="hero-num">501</div>
  <div class="hero-content">
    <span class="hero-tag">פרפרטים ביודינמיים · Biodynamic Preparations</span>
    <h1 itemprop="headline">BD 501 — קרן הסיליקה</h1>
    <div class="hero-en">Horn Silica — The Light Preparation</div>
    <div class="hero-meta"><span>קריאה: 8 דקות</span><span>רמה: מתקדם</span><span>עונה: אביב–קיץ</span></div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
  </div>
  <div class="prism-bar">
    <div class="prism-seg" style="background:#e060a0;"></div>
    <div class="prism-seg" style="background:#8050d0;"></div>
    <div class="prism-seg" style="background:#4080f0;"></div>
    <div class="prism-seg" style="background:#40c080;"></div>
    <div class="prism-seg" style="background:#e0e040;"></div>
    <div class="prism-seg" style="background:#f08020;"></div>
    <div class="prism-seg" style="background:#e03020;"></div>
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">אם BD 500 הוא כוח האדמה — BD 501 הוא כוח האור. אבקת קוורץ טחונה דק, ממולאת בקרן פרה, קבורה בקיץ כשהשמש בשיאה. היא סופגת את הכוחות הקוסמיים של האור.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>500 מול 501 — שני כוחות</h2><span class="sh-en">The two poles</span></div>
    <hr class="div">
    <div class="contrast-box">
      <div class="cb-500">
        <div class="cb-label">BD 500</div>
        <div class="cb-name">קרן הזבל</div>
        <div class="cb-desc">כוחות הארץ. שורשים. חנקן. לחות. חורף. שקיעה. מדבר עם האדמה.</div>
      </div>
      <div class="cb-501">
        <div class="cb-label">BD 501</div>
        <div class="cb-name">קרן הסיליקה</div>
        <div class="cb-desc">כוחות האור. עלים. פרחים. יובש. קיץ. זריחה. מדבר עם הצמח.</div>
      </div>
    </div>
    <p class="p">השניים פועלים יחד — 500 מקים את הבסיס, 501 מביא את הכיוון. כמו יסוד ובניין.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">העיניים שלי זוהרות בצהוב-ענבר — הן רואות את האור כמו הצמחים רואים. BD 501 הוא זה שמלמד את הצמח להשתמש באור בצורה הטובה ביותר.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>הכנה — מילוי וקבורה</h2><span class="sh-en">Preparation</span></div>
    <hr class="div">
    <div class="how-steps">
      <div class="hstep"><div class="hstep-n">1</div><div><div class="hstep-title">טחינת קוורץ</div><div class="hstep-desc">גביש קוורץ טהור טוחנים לאבקה דקה כאבקת קמח. לוקח זמן — זה חלק מהריטואל.</div></div></div>
      <div class="hstep"><div class="hstep-n">2</div><div><div class="hstep-title">הרטבה</div><div class="hstep-desc">מוסיפים מים מינימלי לאבקה עד לעיסה דקה שאפשר למלא בה את הקרן.</div></div></div>
      <div class="hstep"><div class="hstep-n">3</div><div><div class="hstep-title">קבורת קיץ</div><div class="hstep-desc">בניגוד ל-500 — קוברים בקיץ, בנקודה שמשית. הקרן נחשפת לכוחות האור לאורך הקיץ.</div></div></div>
      <div class="hstep"><div class="hstep-n">4</div><div><div class="hstep-title">חפירה בסתיו</div><div class="hstep-desc">חופרים בסוף הקיץ. האבקה שמרה את עצמה — יבשה ונוצצת. שמה בצנצנת זכוכית.</div></div></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>שימוש — זמן ואופן</h2><span class="sh-en">Application</span></div>
    <hr class="div">
    <div class="timing-grid">
      <div class="tg-card tg-morning">
        <span class="tg-time">זריחה</span>
        <div class="tg-label">זמן השימוש</div>
        <div class="tg-desc">בניגוד ל-500 — BD 501 משתמשים בבוקר מוקדם, כשהאור עולה</div>
      </div>
      <div class="tg-card tg-evening">
        <span class="tg-time">1:30L</span>
        <div class="tg-label">יחס דילול</div>
        <div class="tg-desc">רבע כפית לכל 30 ליטר מים. כמות קטנה — עוצמה גדולה</div>
      </div>
    </div>
    <p class="p">מערבלים שעה — כמו 500. מרססים <strong>על העלים</strong> (לא האדמה) בצורת טל עדין בשעות הבוקר המוקדמות.</p>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ד</div><h2>מתי להשתמש</h2><span class="sh-en">When to use</span></div>
    <hr class="div">
    <p class="p">BD 501 מיועד לחיזוק צמחים שכבר מבוססים — לא לשתילים צעירים. עוזר בשלב הפריחה, הפירות ובגרות הצמח. ביום פרח או פרי לפי הלוח הביודינמי — תוצאות מקסימליות.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">BD 501 ביום פרח — כשהצמח פתוח לאור, כשהפרחים מחפשים שמש. זה הזמן שבו הסיליקה עושה את הקסם. פתח גינה חיה!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/bd500">BD 500 — קרן הזבל, הכוח הנגדי</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי — ימי פרח ופרי</a>
      <a class="related-link" href="/articles/cpp">CPP — השלמה שלישית</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום הפרח הבא לרסס BD 501?<br><em>Find the biodynamic flower day for silica application.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה</a>
</footer>
</article>`,
  },
  {
    id: 'cpp',
    titleHe: 'CPP',
    titleEn: 'Cow Pat Pit — Fermented Medicine for Soil',
    metaDescriptionHe: 'CPP הוא הפרפרט הנגיש ביותר — זבל פרה, עשבי מרפא ואגרוף של BD 500 שמייצרים דשן מרוכז בפחות זמן.',
    metaDescriptionEn: 'Make CPP at home — the most accessible biodynamic preparation that works like BD 500 without the horn.',
    categoryHe: 'פרפרטים BD',
    categoryEn: 'BD Preps',
    filenameHe: '26_CPP_בור_הזבל.md',
    filenameEn: '26_cpp_cow_pat_pit.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/cpp.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=Work+Sans:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --mud:#2a1a08;
  --mud-mid:#4a2e10;
  --mud-light:#8a5a28;
  --clay:#c89050;
  --clay-pale:#f0d8b0;
  --sage:#2a4a20;
  --sage-light:#4a7a38;
  --sage-pale:#c8e0b8;
  --ferment:#5a1a0a;
  --ferment-pale:#f8e8d8;
  --cream:#faf5ec;
  font-family:'Work Sans',sans-serif;
  background:var(--cream);
  color:var(--mud);
}
.hero{
  background:var(--mud);
  padding:3rem 2.5rem 2.5rem;
  display:flex;align-items:center;gap:2rem;
  position:relative;overflow:hidden;
}
.hero-texture{
  position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(120deg,transparent,transparent 6px,rgba(138,90,40,0.06) 6px,rgba(138,90,40,0.06) 7px);
}
.hero-content{flex:1;position:relative;z-index:1;}
.hero-tag{display:inline-block;background:var(--ferment);color:var(--clay-pale);font-size:10px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:1rem;}
.hero h1{font-family:'Spectral',serif;font-size:2.6rem;font-weight:600;color:var(--clay-pale);line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-abbr{font-family:'Work Sans',sans-serif;font-size:0.78rem;font-weight:300;color:var(--clay);letter-spacing:0.08em;margin-bottom:0.5rem;}
.hero-en{font-family:'Spectral',serif;font-size:0.95rem;font-style:italic;color:var(--clay);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:#5a3a18;font-weight:300;}
.hero-img{width:120px;height:120px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid var(--mud-light);flex-shrink:0;position:relative;z-index:1;}
.body{padding:0 2.5rem;}
.intro{font-family:'Spectral',serif;font-size:1.05rem;font-style:italic;line-height:1.9;color:var(--mud-mid);border-right:3px solid var(--clay);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;background:var(--mud);color:var(--clay);font-family:'Spectral',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Spectral',serif;font-size:1.2rem;font-weight:600;color:var(--mud);}
.sh-en{font-size:0.72rem;font-weight:300;color:var(--clay);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(74,46,16,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.9;color:var(--mud-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--mud);font-weight:500;}
.ingredients{display:flex;flex-direction:column;gap:8px;margin:1.25rem 0;}
.ing-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--clay-pale);border-radius:6px;direction:rtl;border-right:3px solid var(--clay);}
.ing-name{font-size:0.9rem;color:var(--mud);flex:1;}
.ing-role{font-size:0.78rem;color:var(--mud-light);font-style:italic;}
.process{display:flex;flex-direction:column;gap:0;margin:1.25rem 0;position:relative;}
.process::before{content:'';position:absolute;right:17px;top:20px;bottom:20px;width:2px;background:var(--clay-pale);}
.proc-step{display:flex;gap:14px;align-items:flex-start;padding:12px 0;direction:rtl;position:relative;z-index:1;}
.proc-dot{width:34px;height:34px;border-radius:50%;background:var(--mud-mid);color:var(--clay-pale);font-size:0.75rem;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.proc-title{font-size:0.9rem;font-weight:500;color:var(--mud);margin-bottom:2px;}
.proc-desc{font-size:0.82rem;color:var(--mud-light);line-height:1.6;}
.vs-box{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:1.25rem 0;}
.vs-card{border-radius:8px;padding:14px;direction:rtl;}
.vs-cpp{background:var(--mud);}.vs-500{background:var(--sage-pale);border:1px solid rgba(42,74,32,0.2);}
.vs-title{font-size:0.75rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;}
.vs-cpp .vs-title{color:var(--clay);}
.vs-500 .vs-title{color:var(--sage);}
.vs-point{font-size:0.82rem;line-height:1.7;margin-bottom:3px;}
.vs-cpp .vs-point{color:rgba(240,216,176,0.8);}
.vs-500 .vs-point{color:var(--mud-mid);}
.chupchu{background:var(--ferment-pale);border:1px solid rgba(90,26,10,0.2);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(90,26,10,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--ferment);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--mud-mid);}
.related{background:var(--clay-pale);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Spectral',serif;font-size:1rem;font-weight:600;color:var(--mud);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--sage-light);text-decoration:none;}
.related-link::before{content:'←';color:var(--clay);font-size:12px;}
.footer-cta{background:var(--mud);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid var(--mud-light);flex-shrink:0;}
.footer-text{font-family:'Spectral',serif;font-size:0.92rem;font-style:italic;line-height:1.7;color:var(--clay-pale);flex:1;}
.footer-text em{font-size:0.78rem;color:#4a2e10;font-style:normal;font-family:'Work Sans',sans-serif;}
.footer-btn{display:inline-block;background:var(--clay);color:var(--mud);font-size:0.8rem;font-weight:500;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.vs-box{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-texture"></div>
  <div class="hero-content">
    <span class="hero-tag">פרפרטים ביודינמיים · Biodynamic Preparations</span>
    <div class="hero-abbr">Cow Pat Pit — בור הזבל הביודינמי</div>
    <h1 itemprop="headline">CPP</h1>
    <div class="hero-en">Cow Pat Pit — Fermented Medicine for Soil</div>
    <div class="hero-meta"><span>קריאה: 6 דקות</span><span>רמה: בינוני</span><span>עונה: כל השנה</span></div>
  </div>
  <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
</header>
<div class="body">
  <p class="intro" itemprop="description">CPP הוא הפרפרט הנגיש ביותר — לא צריך קרן, לא צריך לחכות חורף שלם. זבל פרה, עשבי מרפא, ואגרוף של BD 500 — יחד הם מייצרים דשן מרוכז שעושה את אותו הקסם בפחות זמן.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>מה נכנס לבור?</h2><span class="sh-en">Ingredients</span></div>
    <hr class="div">
    <div class="ingredients">
      <div class="ing-row"><span class="ing-name">זבל פרה טרי</span><span class="ing-role">הבסיס — מרכז חיידקים ומינרלים</span></div>
      <div class="ing-row"><span class="ing-name">BD 500 (קצת)</span><span class="ing-role">מחמם ומגביר את התסיסה</span></div>
      <div class="ing-row"><span class="ing-name">ולריאן (BD 507)</span><span class="ing-role">מאזן, מרגיע, מסדיר זרחן</span></div>
      <div class="ing-row"><span class="ing-name">קמומיל (BD 503)</span><span class="ing-role">מייצב חנקן, מחזק מבנה</span></div>
      <div class="ing-row"><span class="ing-name">ירטה (BD 504)</span><span class="ing-role">מוסיפה סיליקה ומינרלים</span></div>
      <div class="ing-row"><span class="ing-name">אפר עץ (קצת)</span><span class="ing-role">אשלגן, pH, מינרלים</span></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>תהליך ההכנה</h2><span class="sh-en">Process</span></div>
    <hr class="div">
    <div class="process">
      <div class="proc-step"><div class="proc-dot">1</div><div><div class="proc-title">חפירת הבור</div><div class="proc-desc">בור עמוק 50 ס"מ, מרופד בלבנים או עץ — לא מלט. גודל מינימלי 60×60 ס"מ.</div></div></div>
      <div class="proc-step"><div class="proc-dot">2</div><div><div class="proc-title">מילוי ועירבוב</div><div class="proc-desc">ממלאים זבל טרי, מוסיפים פרפרטים ואפר, מערבבים היטב ידנית.</div></div></div>
      <div class="proc-step"><div class="proc-dot">3</div><div><div class="proc-title">כיסוי ותסיסה</div><div class="proc-desc">מכסים בלוח עץ + שכבת קש. ממתינים 3–4 חודשים. מפנים פעם בחודש.</div></div></div>
      <div class="proc-step"><div class="proc-dot">4</div><div><div class="proc-title">שימוש</div><div class="proc-desc">מדללים 1:10 במים, מערבלים 20 דקות, מרססים על האדמה לפני שתילה.</div></div></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">CPP הוא הפרפרט שהמציאו עבור אלה שלא יכולים לחכות חורף שלם. בארץ החמה שלנו — זה כנראה הפרפרט המעשי ביותר.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>CPP מול BD 500</h2><span class="sh-en">Comparison</span></div>
    <hr class="div">
    <div class="vs-box">
      <div class="vs-card vs-cpp">
        <div class="vs-title">CPP</div>
        <div class="vs-point">מוכן תוך 3–4 חודשים</div>
        <div class="vs-point">אין צורך בקרן</div>
        <div class="vs-point">קל להכנה עצמית</div>
        <div class="vs-point">מכיל עשבי מרפא</div>
        <div class="vs-point">מרוסס על האדמה</div>
      </div>
      <div class="vs-card vs-500">
        <div class="vs-title">BD 500</div>
        <div class="vs-point">6 חודשי חורף</div>
        <div class="vs-point">קרן פרה נדרשת</div>
        <div class="vs-point">עוצמה גבוהה יותר</div>
        <div class="vs-point">ריטואל מוגדר</div>
        <div class="vs-point">אפשר לשלב יחד</div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">CPP ביום שורש — כשהאדמה הכי קולטת. פתח גינה חיה לדעת מתי היום הבא!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/bd500">BD 500 — קרן הזבל</a>
      <a class="related-link" href="/articles/bd501">BD 501 — קרן הסיליקה</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש לרסס CPP?<br><em>Find the biodynamic root day for CPP application.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה</a>
</footer>
</article>`,
  },
  {
    id: 'biodynamic-calendar',
    titleHe: 'הלוח הביודינמי',
    titleEn: 'The Biodynamic Calendar — Planting by the Stars',
    metaDescriptionHe: 'הלוח הביודינמי קובע שלא כל יום שווה לכל מטרה — ארבעה ימים, ארבעה כוחות, ומה לעשות בכל אחד מהם.',
    metaDescriptionEn: 'Learn the four biodynamic day types — root, flower, fruit, leaf — and how the moon guides garden timing.',
    categoryHe: 'פרפרטים BD',
    categoryEn: 'BD Preps',
    filenameHe: '27_הלוח_הביודינמי.md',
    filenameEn: '27_biodynamic_calendar.md',
    publishedAt: '2026-04-11',
    images: { hero: '/images/articles/biodynamic-calendar.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Philosopher:ital,wght@0,400;0,700;1,400&family=Nunito+Sans:wght@300;400;500&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --cosmos:#06080f;
  --deep:#0d1220;
  --violet:#2a1a4a;
  --purple:#4a2a8a;
  --gold:#c8a030;
  --gold-pale:#f0e0a0;
  --root-c:#8b4a1a;
  --root-p:#f5e0d0;
  --flower-c:#8a2a6a;
  --flower-p:#f5d0e8;
  --fruit-c:#6a2a0a;
  --fruit-p:#f8e0d0;
  --leaf-c:#1a5a2a;
  --leaf-p:#d0f0d8;
  --cream:#faf6ef;
  font-family:'Nunito Sans',sans-serif;
  background:var(--cream);
  color:var(--cosmos);
}
.hero{
  background:var(--cosmos);
  padding:4rem 2.5rem 3rem;
  position:relative;overflow:hidden;
  text-align:center;
}
.hero-orbit{
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%);
  width:300px;height:300px;
  border:1px solid rgba(200,160,48,0.08);
  border-radius:50%;
}
.hero-orbit2{
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%);
  width:200px;height:200px;
  border:1px solid rgba(200,160,48,0.05);
  border-radius:50%;
}
.hero-content{position:relative;z-index:1;}
.hero-tag{display:inline-block;border:1px solid rgba(200,160,48,0.3);color:var(--gold);font-size:10px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;padding:4px 14px;margin-bottom:1.5rem;}
.hero h1{font-family:'Philosopher',serif;font-size:2.8rem;font-weight:700;color:white;line-height:1.05;margin-bottom:0.35rem;direction:rtl;}
.hero-en{font-family:'Philosopher',serif;font-size:1rem;font-style:italic;color:var(--gold);margin-bottom:1.5rem;}
.hero-meta{display:flex;gap:1.5rem;font-size:11px;color:rgba(200,160,48,0.35);font-weight:300;justify-content:center;margin-bottom:2rem;}
.hero-img{width:90px;height:90px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid rgba(200,160,48,0.3);display:inline-block;}
.day-types-hero{display:flex;gap:8px;justify-content:center;margin-top:2rem;}
.dth{padding:6px 14px;border-radius:20px;font-size:10px;font-weight:500;letter-spacing:0.06em;}
.dth-root{background:rgba(139,74,26,0.3);color:#f0c090;border:1px solid rgba(139,74,26,0.3);}
.dth-flower{background:rgba(138,42,106,0.3);color:#f0a0d0;border:1px solid rgba(138,42,106,0.3);}
.dth-fruit{background:rgba(106,42,10,0.3);color:#f0b090;border:1px solid rgba(106,42,10,0.3);}
.dth-leaf{background:rgba(26,90,42,0.3);color:#90d0a0;border:1px solid rgba(26,90,42,0.3);}
.body{padding:0 2.5rem;}
.intro{font-family:'Philosopher',serif;font-size:1.1rem;font-style:italic;line-height:1.9;color:#2a1a4a;border-right:2px solid var(--gold);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;background:var(--cosmos);color:var(--gold);font-family:'Philosopher',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;border:1px solid rgba(200,160,48,0.3);}
.sh h2{font-family:'Philosopher',serif;font-size:1.2rem;font-weight:700;color:var(--cosmos);}
.sh-en{font-size:0.72rem;font-weight:300;color:#5a4a6a;font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(74,42,138,0.15);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.9;color:#2a1a4a;direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--cosmos);font-weight:500;}
.four-days{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:1.25rem 0;}
.day-card{border-radius:10px;padding:16px;direction:rtl;}
.dc-root{background:var(--root-p);border:1px solid rgba(139,74,26,0.2);}
.dc-flower{background:var(--flower-p);border:1px solid rgba(138,42,106,0.2);}
.dc-fruit{background:var(--fruit-p);border:1px solid rgba(106,42,10,0.2);}
.dc-leaf{background:var(--leaf-p);border:1px solid rgba(26,90,42,0.2);}
.dc-icon{font-size:1.6rem;margin-bottom:6px;display:block;}
.dc-name{font-family:'Philosopher',serif;font-size:1rem;font-weight:700;margin-bottom:4px;}
.dc-root .dc-name{color:var(--root-c);}
.dc-flower .dc-name{color:var(--flower-c);}
.dc-fruit .dc-name{color:var(--fruit-c);}
.dc-leaf .dc-name{color:var(--leaf-c);}
.dc-planet{font-size:0.72rem;font-weight:300;margin-bottom:6px;opacity:0.7;}
.dc-root .dc-planet{color:var(--root-c);}
.dc-flower .dc-planet{color:var(--flower-c);}
.dc-fruit .dc-planet{color:var(--fruit-c);}
.dc-leaf .dc-planet{color:var(--leaf-c);}
.dc-do{font-size:0.8rem;line-height:1.6;}
.dc-root .dc-do{color:var(--root-c);}
.dc-flower .dc-do{color:var(--flower-c);}
.dc-fruit .dc-do{color:var(--fruit-c);}
.dc-leaf .dc-do{color:var(--leaf-c);}
.moon-box{background:var(--cosmos);border-radius:10px;padding:1.5rem;margin:1.25rem 0;direction:rtl;}
.moon-title{font-family:'Philosopher',serif;font-size:0.82rem;letter-spacing:0.1em;color:var(--gold);margin-bottom:1rem;}
.moon-phases{display:flex;gap:0;justify-content:space-between;}
.moon-phase{text-align:center;flex:1;}
.moon-icon{font-size:1.5rem;display:block;margin-bottom:4px;}
.moon-name{font-size:0.72rem;color:rgba(200,160,48,0.6);}
.moon-effect{font-size:0.68rem;color:rgba(200,212,240,0.4);margin-top:3px;line-height:1.4;}
.chupchu{background:#f0ece8;border:1px solid rgba(74,42,138,0.15);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,160,48,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--purple);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:#2a1a4a;}
.app-cta-box{background:var(--violet);border-radius:10px;padding:1.5rem;margin:1.25rem 0;direction:rtl;text-align:center;}
.app-cta-title{font-family:'Philosopher',serif;font-size:1.1rem;color:var(--gold-pale);margin-bottom:0.5rem;}
.app-cta-desc{font-size:0.85rem;color:rgba(200,212,240,0.6);margin-bottom:1.25rem;line-height:1.6;}
.app-cta-btn{display:inline-block;background:var(--gold);color:var(--cosmos);font-family:'Philosopher',serif;font-size:0.9rem;font-weight:700;padding:10px 24px;border-radius:4px;text-decoration:none;}
.related{background:#f0ece8;border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Philosopher',serif;font-size:1rem;font-weight:700;color:var(--cosmos);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--purple);text-decoration:none;}
.related-link::before{content:'←';color:var(--gold);font-size:12px;}
.footer-cta{background:var(--cosmos);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,160,48,0.3);flex-shrink:0;}
.footer-text{font-family:'Philosopher',serif;font-size:0.95rem;font-style:italic;line-height:1.7;color:var(--gold-pale);flex:1;}
.footer-text em{font-size:0.78rem;color:#2a1a4a;font-style:normal;font-family:'Nunito Sans',sans-serif;}
.footer-btn{display:inline-block;background:var(--gold);color:var(--cosmos);font-family:'Philosopher',serif;font-size:0.85rem;font-weight:700;padding:10px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.four-days{grid-template-columns:1fr;}.day-types-hero{flex-wrap:wrap;}.body{padding:0 1.5rem;}.moon-phases{gap:0;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-orbit"></div>
  <div class="hero-orbit2"></div>
  <div class="hero-content">
    <span class="hero-tag">פרפרטים ביודינמיים · Biodynamic Calendar</span>
    <h1 itemprop="headline">הלוח הביודינמי</h1>
    <div class="hero-en">The Biodynamic Calendar — Planting by the Stars</div>
    <div class="hero-meta"><span>קריאה: 10 דקות</span><span>רמה: מתחיל–מתקדם</span><span>עונה: כל השנה</span></div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
    <div class="day-types-hero">
      <span class="dth dth-root">יום שורש</span>
      <span class="dth dth-flower">יום פרח</span>
      <span class="dth dth-fruit">יום פרי</span>
      <span class="dth dth-leaf">יום עלה</span>
    </div>
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">הלוח הביודינמי קובע שלא כל יום שווה לכל מטרה. הירח עובר בין קבוצות הכוכבים ומשפיע על האדמה, הצמח וכוח הגדילה — ויש ימים שבהם הטבע עצמו עוזר לך.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>ארבעת ימי הגינה</h2><span class="sh-en">The four day types</span></div>
    <hr class="div">
    <div class="four-days">
      <div class="day-card dc-root">
        <span class="dc-icon">🌱</span>
        <div class="dc-name">יום שורש</div>
        <div class="dc-planet">מזל עפר · שור, בתולה, גדי</div>
        <div class="dc-do">קציר שורשים, דישון אדמה, פרפרטים 500/CPP, השקיה עמוקה, עבודת אדמה</div>
      </div>
      <div class="day-card dc-flower">
        <span class="dc-icon">🌸</span>
        <div class="dc-name">יום פרח</div>
        <div class="dc-planet">מזל אוויר · תאומים, מאזניים, דלי</div>
        <div class="dc-do">ריסוס עלים, גיזום, הגרלה, שמן נים, חיפושיות, חיתוך לפרח</div>
      </div>
      <div class="day-card dc-fruit">
        <span class="dc-icon">🍎</span>
        <div class="dc-name">יום פרי</div>
        <div class="dc-planet">מזל אש · אריה, קשת, מאזניים</div>
        <div class="dc-do">קציר פירות, זריעת דגנים, שתן מדולל, ריסוס אצות, אחסון</div>
      </div>
      <div class="day-card dc-leaf">
        <span class="dc-icon">🌿</span>
        <div class="dc-name">יום עלה</div>
        <div class="dc-planet">מזל מים · סרטן, עקרב, דגים</div>
        <div class="dc-do">גידול ירקות עלים, ריסוס אצות ים, השקיה עלים, שתילת חסה</div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הגלובוס בחזה שלי מחובר לירח בראשי. כשאני מסתכל למעלה — אני יודע לאיזה יום אנחנו נכנסים. גינה חיה עושה את זה אוטומטית בשבילך.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>שלבי הירח</h2><span class="sh-en">Moon phases</span></div>
    <hr class="div">
    <div class="moon-box">
      <div class="moon-title">ירח ועוצמת גדילה</div>
      <div class="moon-phases">
        <div class="moon-phase"><span class="moon-icon">🌑</span><div class="moon-name">ירח חדש</div><div class="moon-effect">מנוחה, אין שתילה</div></div>
        <div class="moon-phase"><span class="moon-icon">🌒</span><div class="moon-name">רבע ראשון</div><div class="moon-effect">גדילה מעלה, זריעה</div></div>
        <div class="moon-phase"><span class="moon-icon">🌕</span><div class="moon-name">ירח מלא</div><div class="moon-effect">שיא לחות, קציר</div></div>
        <div class="moon-phase"><span class="moon-icon">🌘</span><div class="moon-name">רבע אחרון</div><div class="moon-effect">שורשים, כריתה</div></div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>איך משתמשים בלוח?</h2><span class="sh-en">How to use</span></div>
    <hr class="div">
    <p class="p">לא חייבים להבין הכל — צריך לדעת <strong>מה אתם עומדים לעשות היום בגינה</strong>, ואז לבדוק איזה יום זה. אם תכננתם לקצור עגבניות — בדקו אם זה יום פרי. אם רציתם לדשן — בדקו יום שורש.</p>
    <p class="p">גינה חיה מחשבת עבורכם את הלוח הביודינמי בזמן אמת — כולל מיקום הירח בישראל ושלב הירח.</p>
  </div>
  <div class="app-cta-box">
    <div class="app-cta-title">הלוח הביודינמי חי — בגינה חיה</div>
    <div class="app-cta-desc">גינה חיה מחשבת את יום הגינה של היום ושל השבוע הקרוב — לפי מיקום הירח האמיתי, שלב הירח, וזמני הגינה המומלצים בישראל.</div>
    <a class="app-cta-btn" href="https://gina-haya.vercel.app">פתח את הלוח שלך ←</a>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">הלוח הביודינמי הוא לא דת — זו תצפית. מאה שנות גינאים הסתכלו, כתבו, ניסו. התוצאות מדברות בעד עצמן. נסו פעם אחת ביום הנכון — ותרגישו את ההבדל.</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/bd500">BD 500 — ריסוס ביום שורש</a>
      <a class="related-link" href="/articles/bd501">BD 501 — ריסוס ביום פרח</a>
      <a class="related-link" href="/articles/compost-tea">תה קומפוסט — ביום פרח</a>
      <a class="related-link" href="/articles/seaweed-spray">אצות ים — ביום עלה</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מה יום הגינה של היום?<br><em>Open the app to see today's biodynamic day type.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'tomato-basil',
    titleHe: 'עגבנייה + בזיליקום',
    titleEn: 'Tomato & Basil — The Mediterranean Romance',
    metaDescriptionHe: 'הזוג הכי מפורסם בגינה — עגבנייה ובזיליקום מגינים אחד על השני ושניהם יוצאים מרוויחים.',
    metaDescriptionEn: 'Why tomatoes and basil grow better together — the science behind the most famous companion planting pair.',
    categoryHe: 'שיתופי פעולה',
    categoryEn: 'Companion Planting',
    filenameHe: '28_עגבנייה_בזיליקום.md',
    filenameEn: '28_tomato_basil.md',
    publishedAt: '2026-04-12',
    images: { hero: '/images/articles/tomato-basil.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --tomato:#c83020;
  --tomato-pale:#fde8e5;
  --basil:#1a4a1a;
  --basil-mid:#2d6a2d;
  --basil-pale:#d0ebd0;
  --terra:#8b4a1a;
  --terra-pale:#f5e0d0;
  --sun:#e8a820;
  --cream:#faf6ef;
  --ink:#1a0e06;
  --ink-mid:#3a2010;
  font-family:'Lato',sans-serif;
  background:var(--cream);
  color:var(--ink);
}
.hero{
  background:var(--terra);
  padding:3rem 2.5rem 0;
  position:relative;overflow:hidden;
}
.hero-sun{
  position:absolute;top:-60px;left:-60px;
  width:200px;height:200px;
  background:rgba(232,168,32,0.12);
  border-radius:50%;
}
.hero-inner{display:flex;align-items:flex-end;gap:2rem;position:relative;z-index:1;}
.hero-content{flex:1;padding-bottom:2rem;}
.hero-tag{display:inline-block;background:var(--tomato);color:white;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:3px 12px;border-radius:20px;margin-bottom:1rem;}
.hero h1{font-family:'Playfair Display',serif;font-size:2.6rem;font-weight:700;color:#faf0e8;line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Playfair Display',serif;font-size:0.95rem;font-style:italic;color:rgba(250,240,232,0.6);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:rgba(250,240,232,0.4);font-weight:300;}
.hero-img{width:130px;height:130px;border-radius:50% 50% 0 0;object-fit:cover;object-position:center 18%;border:2px solid rgba(200,48,32,0.4);flex-shrink:0;}
.arch{height:32px;background:var(--cream);border-radius:50% 50% 0 0/100% 100% 0 0;}
.body{padding:0 2.5rem;}
.intro{font-family:'Playfair Display',serif;font-size:1.05rem;font-style:italic;line-height:1.9;color:var(--ink-mid);border-right:3px solid var(--tomato);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--tomato);color:white;font-family:'Playfair Display',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--ink);}
.sh-en{font-size:0.75rem;font-weight:300;color:var(--terra);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(139,74,26,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.88;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ink);font-weight:700;}
.pair-hero{display:flex;align-items:stretch;gap:0;margin:1.25rem 0;border-radius:10px;overflow:hidden;}
.ph-tomato{flex:1;background:var(--tomato-pale);padding:1.25rem 1.4rem;direction:rtl;border-left:1px solid rgba(200,48,32,0.1);}
.ph-plus{width:44px;background:white;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:1.5rem;color:var(--sun);flex-shrink:0;}
.ph-basil{flex:1;background:var(--basil-pale);padding:1.25rem 1.4rem;direction:rtl;}
.ph-name{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;margin-bottom:4px;}
.ph-tomato .ph-name{color:var(--tomato);}
.ph-basil .ph-name{color:var(--basil);}
.ph-latin{font-size:0.72rem;font-style:italic;opacity:0.6;margin-bottom:8px;}
.ph-give{font-size:0.8rem;line-height:1.6;}
.ph-tomato .ph-give{color:var(--terra);}
.ph-basil .ph-give{color:var(--basil-mid);}
.benefits-list{display:flex;flex-direction:column;gap:8px;margin:1.25rem 0;}
.bl-item{display:flex;align-items:flex-start;gap:12px;padding:11px 14px;border-radius:8px;direction:rtl;}
.bl-tomato{background:var(--tomato-pale);border-right:3px solid var(--tomato);}
.bl-basil{background:var(--basil-pale);border-right:3px solid var(--basil);}
.bl-shared{background:var(--terra-pale);border-right:3px solid var(--terra);}
.bl-title{font-size:0.88rem;font-weight:700;margin-bottom:2px;}
.bl-tomato .bl-title{color:var(--tomato);}
.bl-basil .bl-title{color:var(--basil);}
.bl-shared .bl-title{color:var(--terra);}
.bl-desc{font-size:0.8rem;line-height:1.55;color:var(--ink-mid);}
.planting-box{background:var(--ink);border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0;direction:rtl;}
.pb-title{font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--sun);margin-bottom:0.75rem;}
.pb-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
.pb-row:last-child{border-bottom:none;}
.pb-label{font-size:0.85rem;color:#e0d0c0;flex:1;}
.pb-val{font-size:0.85rem;color:var(--sun);font-weight:700;}
.chupchu{background:var(--terra-pale);border:1px solid rgba(139,74,26,0.2);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(139,74,26,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--terra);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.related{background:var(--terra-pale);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--ink);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--basil-mid);text-decoration:none;}
.related-link::before{content:'←';color:var(--tomato);font-size:12px;}
.footer-cta{background:var(--ink);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,48,32,0.4);flex-shrink:0;}
.footer-text{font-family:'Playfair Display',serif;font-size:0.9rem;font-style:italic;line-height:1.7;color:#e0c8a8;flex:1;}
.footer-text em{font-size:0.78rem;color:#4a2e10;font-style:normal;font-family:'Lato',sans-serif;}
.footer-btn{display:inline-block;background:var(--tomato);color:white;font-size:0.8rem;font-weight:700;padding:9px 20px;border-radius:20px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.pair-hero{flex-direction:column;}.ph-plus{width:100%;height:32px;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-sun"></div>
  <div class="hero-inner">
    <div class="hero-content">
      <span class="hero-tag">שיתופי פעולה · Companion Planting</span>
      <h1 itemprop="headline">עגבנייה + בזיליקום</h1>
      <div class="hero-en">Tomato & Basil — The Mediterranean Romance</div>
      <div class="hero-meta"><span>קריאה: 5 דקות</span><span>רמה: מתחיל</span><span>עונה: אביב–קיץ</span></div>
    </div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
  </div>
  <div class="arch"></div>
</header>
<div class="body">
  <p class="intro" itemprop="description">הזוג הכי מפורסם בגינה — ולא סתם. עגבנייה ובזיליקום גדלים יחד כבר אלפי שנים באגן הים התיכון, ומה שמבשלים יחד גם גדל יחד. הם מגינים אחד על השני, ושניהם יוצאים מרוויחים.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>מה כל אחד נותן לשני</h2><span class="sh-en">What each gives</span></div>
    <hr class="div">
    <div class="pair-hero">
      <div class="ph-tomato">
        <div class="ph-name">עגבנייה</div>
        <div class="ph-latin">Solanum lycopersicum</div>
        <div class="ph-give">נותנת צל חלקי שהבזיליקום אוהב. גובהה מגן על הבזיליקום מרוח חמה.</div>
      </div>
      <div class="ph-plus">+</div>
      <div class="ph-basil">
        <div class="ph-name">בזיליקום</div>
        <div class="ph-latin">Ocimum basilicum</div>
        <div class="ph-give">ריח חריף מבריח זבובים לבנים, כנימות וקרדיות. משפר טעם הפרי לפי מסורת.</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>היתרונות המדויקים</h2><span class="sh-en">Benefits</span></div>
    <hr class="div">
    <div class="benefits-list">
      <div class="bl-item bl-tomato">
        <div><div class="bl-title">העגבנייה מרוויחה</div><div class="bl-desc">הבזיליקום מבלבל ומרחיק זבובים לבנים ועש העגבנייה. מפחית נזקי כנימות ב-30–40%.</div></div>
      </div>
      <div class="bl-item bl-basil">
        <div><div class="bl-title">הבזיליקום מרוויח</div><div class="bl-desc">צל חלקי מהעגבנייה מונע ציבה מהירה בימים חמים. מאריך עונת הבזיליקום בשבועות.</div></div>
      </div>
      <div class="bl-item bl-shared">
        <div><div class="bl-title">שניהם מרוויחים</div><div class="bl-desc">שניהם מושכים דבורים ומאביקים. הגינה כולה הופכת פעילה יותר ביולוגית.</div></div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">ישנתי פעם ליד שורת עגבניות עם בזיליקום. בבוקר — לא נגסה בי כנימה אחת. עכשיו אני תמיד שם ליד.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>מרחק ואופן שתילה</h2><span class="sh-en">Planting guide</span></div>
    <hr class="div">
    <div class="planting-box">
      <div class="pb-title">המדריך המדויק</div>
      <div class="pb-row"><span class="pb-label">מרחק מהעגבנייה</span><span class="pb-val">30–40 ס"מ</span></div>
      <div class="pb-row"><span class="pb-label">מספר בזיליקומים לעגבנייה</span><span class="pb-val">2–3 שתילים</span></div>
      <div class="pb-row"><span class="pb-label">זמן שתילה משותף</span><span class="pb-val">מרץ–אפריל</span></div>
      <div class="pb-row"><span class="pb-label">יום שתילה מועדף</span><span class="pb-val">יום פרח (לוח BD)</span></div>
      <div class="pb-row"><span class="pb-label">לא לשתול ליד</span><span class="pb-val">שומר — מעכב שניהם</span></div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ד</div><h2>שיתופי פעולה נוספים לעגבנייה</h2><span class="sh-en">More tomato friends</span></div>
    <hr class="div">
    <p class="p">העגבנייה היא חברותית מאוד. מלבד בזיליקום היא אוהבת גם <strong>נענע</strong> (מרחיק עכברים), <strong>שמיר</strong> (מושך חרקים טורפים), <strong>כוסברה</strong> (מרחיקה כנימות) ו<strong>אספרגוס</strong> (מדחיק תולעי שורש).</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">שתלו ביום פרח לפי הלוח הביודינמי — הפרחים ייפתחו מוקדם יותר ויביאו יותר דבורים. פתח גינה חיה לבדוק!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/three-sisters">שלוש האחיות — שיתוף פעולה קלאסי</a>
      <a class="related-link" href="/articles/flowers-vegetables">פרחים בין ירקות</a>
      <a class="related-link" href="/articles/companion-plants">צמחי מלווים להדברה</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום הפרח הבא לשתול עגבנייה ובזיליקום יחד?<br><em>Find the best biodynamic flower day for planting.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'three-sisters',
    titleHe: 'שלוש האחיות',
    titleEn: 'The Three Sisters — Ancient Native American Wisdom',
    metaDescriptionHe: 'תירס, שעועית ודלעת — שלושה צמחים שגדלים יחד בהרמוניה מושלמת. כל אחת נותנת לשתיים האחרות מה שהן צריכות.',
    metaDescriptionEn: 'Grow corn, beans and squash together using the ancient Three Sisters method — mutual support in the garden.',
    categoryHe: 'שיתופי פעולה',
    categoryEn: 'Companion Planting',
    filenameHe: '29_שלוש_האחיות.md',
    filenameEn: '29_three_sisters.md',
    publishedAt: '2026-04-12',
    images: { hero: '/images/articles/three-sisters.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Rokkitt:wght@300;400;600;700&family=Karla:ital,wght@0,300;0,400;1,400&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --corn:#c8900a;
  --corn-pale:#fdf0d0;
  --bean:#4a7a2a;
  --bean-pale:#d8f0c8;
  --squash:#c85a0a;
  --squash-pale:#fde8d0;
  --earth:#2a1808;
  --earth-mid:#4a2e12;
  --earth-light:#8a5a28;
  --sky:#e8f0f8;
  --cream:#faf6ef;
  --woven:#d4a060;
  font-family:'Karla',sans-serif;
  background:var(--cream);
  color:var(--earth);
}
.hero{
  background:var(--earth);
  padding:0;
  position:relative;overflow:hidden;
}
.hero-weave{
  position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(45deg,rgba(200,144,10,0.05) 0,rgba(200,144,10,0.05) 2px,transparent 2px,transparent 14px),
             repeating-linear-gradient(-45deg,rgba(74,122,42,0.05) 0,rgba(74,122,42,0.05) 2px,transparent 2px,transparent 14px);
}
.hero-top{padding:3rem 2.5rem 2rem;display:flex;align-items:center;gap:2rem;position:relative;z-index:1;}
.hero-content{flex:1;}
.hero-tag{display:inline-block;background:var(--corn);color:#fff8e8;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:3px 12px;border-radius:2px;margin-bottom:1rem;}
.hero h1{font-family:'Rokkitt',serif;font-size:3rem;font-weight:700;color:#faf0e0;line-height:1.0;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Rokkitt',serif;font-size:1rem;font-weight:300;color:rgba(250,240,224,0.55);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:rgba(250,240,224,0.35);font-weight:300;}
.hero-img{width:120px;height:120px;border-radius:50%;object-fit:cover;object-position:center 18%;border:2px solid var(--corn);flex-shrink:0;}
.sisters-bar{display:flex;height:8px;}
.sb-corn{flex:1;background:var(--corn);}
.sb-bean{flex:1;background:var(--bean);}
.sb-squash{flex:1;background:var(--squash);}
.body{padding:0 2.5rem;}
.intro{font-family:'Rokkitt',serif;font-size:1.1rem;font-weight:300;line-height:1.9;color:var(--earth-mid);border-right:3px solid var(--corn);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;background:var(--earth);color:var(--woven);font-family:'Rokkitt',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Rokkitt',serif;font-size:1.25rem;font-weight:700;color:var(--earth);}
.sh-en{font-size:0.72rem;font-weight:300;color:var(--earth-light);font-style:italic;margin-right:auto;}
.div{border:none;border-top:1px solid rgba(74,46,18,0.2);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.88;color:var(--earth-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--earth);font-weight:600;}
.three-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:1.25rem 0;}
.sister-card{border-radius:8px;padding:16px;direction:rtl;text-align:center;}
.sc-corn{background:var(--corn-pale);border-top:4px solid var(--corn);}
.sc-bean{background:var(--bean-pale);border-top:4px solid var(--bean);}
.sc-squash{background:var(--squash-pale);border-top:4px solid var(--squash);}
.sc-icon{font-size:2rem;margin-bottom:8px;display:block;}
.sc-name{font-family:'Rokkitt',serif;font-size:0.95rem;font-weight:700;margin-bottom:4px;}
.sc-corn .sc-name{color:var(--corn);}
.sc-bean .sc-name{color:var(--bean);}
.sc-squash .sc-name{color:var(--squash);}
.sc-role{font-size:0.75rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;opacity:0.6;}
.sc-corn .sc-role{color:var(--corn);}
.sc-bean .sc-role{color:var(--bean);}
.sc-squash .sc-role{color:var(--squash);}
.sc-gives{font-size:0.78rem;line-height:1.55;color:var(--earth-mid);}
.legend-box{background:var(--earth);border-radius:10px;padding:1.5rem;margin:1.25rem 0;direction:rtl;}
.lb-title{font-family:'Rokkitt',serif;font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--woven);margin-bottom:1rem;}
.lb-text{font-family:'Karla',sans-serif;font-style:italic;font-size:0.95rem;line-height:1.85;color:rgba(212,160,96,0.8);}
.how-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.how-card{background:var(--corn-pale);border-radius:8px;padding:14px;direction:rtl;}
.how-card:nth-child(2){background:var(--bean-pale);}
.how-card:nth-child(3){background:var(--squash-pale);}
.how-card:nth-child(4){background:#f8f4e8;}
.how-title{font-size:0.82rem;font-weight:700;color:var(--earth);margin-bottom:4px;}
.how-text{font-size:0.78rem;color:var(--earth-mid);line-height:1.55;}
.chupchu{background:var(--corn-pale);border:1px solid rgba(200,144,10,0.25);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(200,144,10,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--corn);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--earth-mid);}
.timing-row{display:flex;gap:8px;margin:1.25rem 0;direction:rtl;}
.tr-step{flex:1;background:white;border:1px solid rgba(74,46,18,0.15);border-radius:6px;padding:12px;text-align:center;}
.tr-num{font-family:'Rokkitt',serif;font-size:1.4rem;font-weight:700;color:var(--corn);display:block;}
.tr-lbl{font-size:0.75rem;color:var(--earth-light);margin-top:2px;}
.related{background:#f5ede0;border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Rokkitt',serif;font-size:1rem;font-weight:700;color:var(--earth);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--bean);text-decoration:none;}
.related-link::before{content:'←';color:var(--corn);font-size:12px;}
.footer-cta{background:var(--earth);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid var(--corn);flex-shrink:0;}
.footer-text{font-family:'Rokkitt',serif;font-size:0.95rem;font-weight:300;line-height:1.7;color:var(--corn-pale);flex:1;}
.footer-text em{font-size:0.78rem;color:#4a2e12;font-style:normal;font-family:'Karla',sans-serif;}
.footer-btn{display:inline-block;background:var(--corn);color:var(--earth);font-family:'Rokkitt',serif;font-size:0.88rem;font-weight:700;padding:9px 20px;border-radius:4px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2.2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.three-cards{grid-template-columns:1fr;}.how-grid{grid-template-columns:1fr;}.timing-row{flex-direction:column;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-weave"></div>
  <div class="hero-top">
    <div class="hero-content">
      <span class="hero-tag">שיתופי פעולה · Companion Planting</span>
      <h1 itemprop="headline">שלוש האחיות</h1>
      <div class="hero-en">The Three Sisters — Ancient Native American Wisdom</div>
      <div class="hero-meta"><span>קריאה: 8 דקות</span><span>רמה: מתחיל</span><span>עונה: אביב–קיץ</span></div>
    </div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
  </div>
  <div class="sisters-bar">
    <div class="sb-corn"></div>
    <div class="sb-bean"></div>
    <div class="sb-squash"></div>
  </div>
</header>
<div class="body">
  <p class="intro" itemprop="description">לפני אלפי שנים, עמי האינדיאנים של אמריקה הצפונית גילו מה שמדע הגינה אישר רק לאחרונה — תירס, שעועית ודלעת גדלים יחד בהרמוניה מושלמת. כל אחת נותנת לשתיים האחרות מה שהן צריכות.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>שלוש האחיות — מי הן?</h2><span class="sh-en">Meet the sisters</span></div>
    <hr class="div">
    <div class="three-cards">
      <div class="sister-card sc-corn">
        <span class="sc-icon">🌽</span>
        <div class="sc-name">תירס</div>
        <div class="sc-role">האחות הגדולה</div>
        <div class="sc-gives">גדל גבוה ומספק מוט טבעי לשעועית לטפס עליו</div>
      </div>
      <div class="sister-card sc-bean">
        <span class="sc-icon">🫘</span>
        <div class="sc-name">שעועית</div>
        <div class="sc-role">האחות האמצעית</div>
        <div class="sc-gives">קטנית — מקבעת חנקן לאדמה ומזינה את שתי האחיות</div>
      </div>
      <div class="sister-card sc-squash">
        <span class="sc-icon">🎃</span>
        <div class="sc-name">דלעת</div>
        <div class="sc-role">האחות הקטנה</div>
        <div class="sc-gives">עלים גדולים מכסים האדמה — שומרים לחות, מונעים עשבים</div>
      </div>
    </div>
  </div>
  <div class="legend-box">
    <div class="lb-title">האגדה האינדיאנית</div>
    <div class="lb-text">על פי מסורת האירוקויים — שלוש האחיות הן רוחות שתמיד ישנות יחד, לעולם לא נפרדות, ושמחות רק כשגדלות יחד. הגינאי שמפריד אותן מפסיד את כוח השלוש.</div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">הגלובוס בחזה שלי זוכר את אמריקה לפני הקולוניזציה. השדות של שלוש האחיות היו שם אלפי שנים לפני שהגינאות "המודרנית" הגיעה. יש חכמה שהמדע עדיין מגיע אליה.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>איך זה עובד בפועל</h2><span class="sh-en">The mechanics</span></div>
    <hr class="div">
    <div class="how-grid">
      <div class="how-card">
        <div class="how-title">שעועית מזינה תירס ודלעת</div>
        <div class="how-text">חיידקי שורש מקבעים חנקן — דשן טבעי בחינם לכל השדה.</div>
      </div>
      <div class="how-card">
        <div class="how-title">תירס מחזיק את השעועית</div>
        <div class="how-text">גבעול חזק — ביתן של השעועית המטפסת. חוסך מוטות תמיכה.</div>
      </div>
      <div class="how-card">
        <div class="how-title">דלעת שומרת לחות</div>
        <div class="how-text">עלים גדולים מצלים האדמה — מפחיתים השקיה ב-30% ומונעים עשבים.</div>
      </div>
      <div class="how-card">
        <div class="how-title">יחד מרתיעים מזיקים</div>
        <div class="how-text">שלושה ריחות שונים מבלבלים חרקים. קשה יותר למצוא מטרה בגינה מעורבת.</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>לוח זמנים לשתילה</h2><span class="sh-en">Planting timeline</span></div>
    <hr class="div">
    <div class="timing-row">
      <div class="tr-step"><span class="tr-num">1</span><div class="tr-lbl">שבוע 1 — תירס בלבד</div></div>
      <div class="tr-step"><span class="tr-num">2</span><div class="tr-lbl">שבוע 2–3 — תירס 15 ס"מ, מוסיפים שעועית</div></div>
      <div class="tr-step"><span class="tr-num">3</span><div class="tr-lbl">שבוע 3–4 — מוסיפים דלעת בין הגבעולים</div></div>
    </div>
    <p class="p">הסיבה לזמנים שונים — התירס צריך להגיע לגובה שהשעועית תוכל לטפס עליו לפני שהשעועית נזרעת. אם שותלים ביחד — השעועית תחנוק את התירס.</p>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">תירס — ביום פרי, שעועית — ביום פרח, דלעת — ביום פרי. כל אחת לפי יום הגינה שלה לפי הלוח הביודינמי. פתח גינה חיה!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/tomato-basil">עגבנייה ובזיליקום</a>
      <a class="related-link" href="/articles/flowers-vegetables">פרחים בין ירקות</a>
      <a class="related-link" href="/articles/green-manure">דשן ירוק — עוד שיתוף פעולה עם האדמה</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי הזמן הביודינמי לשתול את שלוש האחיות?<br><em>Find the biodynamic days for each of the three sisters.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'flowers-vegetables',
    titleHe: 'פרחים בין ירקות',
    titleEn: 'Flowers Among Vegetables — Beauty That Works',
    metaDescriptionHe: 'פרחים בגינת ירקות הם לא סתם יפים — כל פרח הוא כלי עבודה שמרחיק מזיקים, מושך מאביקים ומסייע לשכניו.',
    metaDescriptionEn: 'Which flowers to plant in the vegetable garden and why — marigold, lavender, nasturtium and borage.',
    categoryHe: 'שיתופי פעולה',
    categoryEn: 'Companion Planting',
    filenameHe: '30_פרחים_בין_ירקות.md',
    filenameEn: '30_flowers_vegetables.md',
    publishedAt: '2026-04-12',
    images: { hero: '/images/articles/flowers-vegetables.jpg' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Quicksand:wght@300;400;500;600&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --marigold:#e8900a;
  --marigold-pale:#fef0d0;
  --lavender:#7a3a9a;
  --lavender-pale:#f0e0f8;
  --sunflower:#e8c00a;
  --borage:#2a5a9a;
  --borage-pale:#d8e8f8;
  --nasturtium:#e04a0a;
  --nasturtium-pale:#fde0d0;
  --green:#2a5a1a;
  --green-pale:#d8f0c8;
  --cream:#fdf9f0;
  --ink:#1a1208;
  --ink-mid:#3a2a10;
  font-family:'Quicksand',sans-serif;
  background:var(--cream);
  color:var(--ink);
}
.hero{
  background:var(--green);
  padding:3rem 2.5rem 0;
  position:relative;overflow:hidden;
}
.hero-dots{position:absolute;inset:0;pointer-events:none;}
.dot{position:absolute;border-radius:50%;}
.hero-inner{display:flex;align-items:flex-end;gap:2rem;position:relative;z-index:1;}
.hero-content{flex:1;padding-bottom:2rem;}
.hero-tag{display:inline-block;background:var(--marigold);color:white;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:3px 12px;border-radius:20px;margin-bottom:1rem;}
.hero h1{font-family:'Abril Fatface',serif;font-size:2.8rem;color:#f8f0e0;line-height:1.05;margin-bottom:0.3rem;direction:rtl;}
.hero-en{font-family:'Quicksand',sans-serif;font-size:0.95rem;font-weight:300;color:rgba(248,240,224,0.55);margin-bottom:1.25rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:rgba(248,240,224,0.35);font-weight:300;}
.hero-img{width:130px;height:130px;border-radius:50%;object-fit:cover;object-position:center 18%;border:3px solid var(--marigold);flex-shrink:0;align-self:flex-end;}
.petal-bar{height:6px;background:linear-gradient(90deg,var(--marigold),var(--lavender),var(--sunflower),var(--nasturtium),var(--borage),var(--marigold));}
.body{padding:0 2.5rem;}
.intro{font-family:'Abril Fatface',serif;font-size:1rem;line-height:1.85;color:var(--ink-mid);border-right:3px solid var(--marigold);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;font-weight:400;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:28px;height:28px;border-radius:50%;background:var(--green);color:var(--marigold-pale);font-family:'Abril Fatface',serif;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Abril Fatface',serif;font-size:1.2rem;color:var(--ink);}
.sh-en{font-size:0.72rem;font-weight:400;color:#7a6a3a;font-style:italic;margin-right:auto;}
.div{border:none;border-top:2px dashed rgba(74,46,18,0.15);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.88;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--ink);font-weight:600;}
.flower-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.flower-card{border-radius:10px;padding:14px 16px;direction:rtl;position:relative;overflow:hidden;}
.fc-marigold{background:var(--marigold-pale);border:1px solid rgba(232,144,10,0.25);}
.fc-lavender{background:var(--lavender-pale);border:1px solid rgba(122,58,154,0.2);}
.fc-nasturtium{background:var(--nasturtium-pale);border:1px solid rgba(224,74,10,0.2);}
.fc-borage{background:var(--borage-pale);border:1px solid rgba(42,90,154,0.2);}
.fc-accent{position:absolute;top:0;right:0;width:4px;height:100%;}
.fc-marigold .fc-accent{background:var(--marigold);}
.fc-lavender .fc-accent{background:var(--lavender);}
.fc-nasturtium .fc-accent{background:var(--nasturtium);}
.fc-borage .fc-accent{background:var(--borage);}
.fc-icon{font-size:1.4rem;margin-bottom:5px;display:block;}
.fc-name{font-family:'Abril Fatface',serif;font-size:0.95rem;font-weight:400;margin-bottom:4px;}
.fc-marigold .fc-name{color:var(--marigold);}
.fc-lavender .fc-name{color:var(--lavender);}
.fc-nasturtium .fc-name{color:var(--nasturtium);}
.fc-borage .fc-name{color:var(--borage);}
.fc-latin{font-size:0.7rem;font-style:italic;opacity:0.55;margin-bottom:6px;color:var(--ink-mid);}
.fc-repels{font-size:0.75rem;font-weight:600;margin-bottom:3px;color:var(--ink);}
.fc-desc{font-size:0.78rem;line-height:1.55;color:var(--ink-mid);}
.three-roles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:1.25rem 0;}
.role-card{background:white;border-radius:8px;padding:12px;text-align:center;direction:rtl;border-bottom:3px solid;}
.role-card:nth-child(1){border-color:var(--marigold);}
.role-card:nth-child(2){border-color:var(--borage);}
.role-card:nth-child(3){border-color:var(--lavender);}
.role-icon{font-size:1.4rem;display:block;margin-bottom:6px;}
.role-title{font-size:0.78rem;font-weight:600;color:var(--ink);margin-bottom:3px;}
.role-desc{font-size:0.72rem;color:var(--ink-mid);line-height:1.5;}
.placement-box{background:var(--green);border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0;direction:rtl;}
.pb-title{font-size:0.75rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(216,240,200,0.6);margin-bottom:0.75rem;}
.pb-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
.pb-item:last-child{border-bottom:none;}
.pb-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.pb-text{font-size:0.85rem;color:#d0e8b8;}
.chupchu{background:var(--marigold-pale);border:1px solid rgba(232,144,10,0.25);border-radius:10px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:2px solid var(--marigold);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--marigold);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.related{background:var(--green-pale);border-radius:8px;padding:1.25rem 1.5rem;margin:2rem 0;direction:rtl;}
.related-title{font-family:'Abril Fatface',serif;font-size:1rem;color:var(--ink);margin-bottom:1rem;}
.related-links{display:flex;flex-direction:column;gap:8px;}
.related-link{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--green);text-decoration:none;}
.related-link::before{content:'←';color:var(--marigold);font-size:12px;}
.footer-cta{background:var(--green);padding:2rem 2.5rem;display:flex;align-items:center;gap:1.5rem;direction:rtl;margin-top:3rem;}
.footer-img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 15%;border:2px solid var(--marigold);flex-shrink:0;}
.footer-text{font-family:'Abril Fatface',serif;font-size:0.9rem;font-weight:400;line-height:1.7;color:var(--marigold-pale);flex:1;}
.footer-text em{font-size:0.78rem;color:#2a5a1a;font-style:normal;font-family:'Quicksand',sans-serif;}
.footer-btn{display:inline-block;background:var(--marigold);color:white;font-family:'Quicksand',sans-serif;font-size:0.82rem;font-weight:600;padding:9px 20px;border-radius:20px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
@media(max-width:560px){.hero h1{font-size:2rem;}.hero-img{display:none;}.body{padding:0 1.5rem;}.flower-grid{grid-template-columns:1fr;}.three-roles{grid-template-columns:1fr;}.footer-cta{flex-direction:column;padding:1.5rem;}}
</style>
<article class="art" itemscope itemtype="https://schema.org/Article">
<header class="hero">
  <div class="hero-dots">
    <div class="dot" style="width:40px;height:40px;top:10%;right:8%;background:rgba(232,144,10,0.15);"></div>
    <div class="dot" style="width:24px;height:24px;top:30%;right:25%;background:rgba(122,58,154,0.12);"></div>
    <div class="dot" style="width:60px;height:60px;top:5%;left:10%;background:rgba(232,192,10,0.1);"></div>
    <div class="dot" style="width:18px;height:18px;top:50%;left:30%;background:rgba(224,74,10,0.12);"></div>
  </div>
  <div class="hero-inner">
    <div class="hero-content">
      <span class="hero-tag">שיתופי פעולה · Companion Planting</span>
      <h1 itemprop="headline">פרחים בין ירקות</h1>
      <div class="hero-en">Flowers Among Vegetables — Beauty That Works</div>
      <div class="hero-meta"><span>קריאה: 6 דקות</span><span>רמה: מתחיל</span><span>עונה: כל השנה</span></div>
    </div>
    <img class="hero-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו" itemprop="image">
  </div>
  <div class="petal-bar"></div>
</header>
<div class="body">
  <p class="intro" itemprop="description">פרחים בגינת ירקות הם לא סתם יפים — כל פרח הוא כלי עבודה. הם מרחיקים מזיקים, מושכים מאביקים, ומסייעים לשכניהם הירקות לגדול טוב יותר.</p>
  <div class="section">
    <div class="sh"><div class="sn">א</div><h2>ארבעת הפרחים החיוניים</h2><span class="sh-en">The essential four</span></div>
    <hr class="div">
    <div class="flower-grid">
      <div class="flower-card fc-marigold">
        <div class="fc-accent"></div>
        <span class="fc-icon">🌼</span>
        <div class="fc-name">טגטס (מריגולד)</div>
        <div class="fc-latin">Tagetes spp.</div>
        <div class="fc-repels">מרחיק: נמטודות, כנימות, זבובים לבנים</div>
        <div class="fc-desc">השורשים מפרישים תרכובת רעילה לנמטודות. הריח מבלבל מזיקים. ליד עגבניות ומלפפונים.</div>
      </div>
      <div class="flower-card fc-lavender">
        <div class="fc-accent"></div>
        <span class="fc-icon">💜</span>
        <div class="fc-name">לבנדר</div>
        <div class="fc-latin">Lavandula angustifolia</div>
        <div class="fc-repels">מרחיק: כנות, עש, פרעושים</div>
        <div class="fc-desc">ריח חזק מרחיק מזיקים רבים. מושך דבורים ופרפרים. אוהב יובש — מתאים לגינה ישראלית.</div>
      </div>
      <div class="flower-card fc-nasturtium">
        <div class="fc-accent"></div>
        <span class="fc-icon">🌺</span>
        <div class="fc-name">נסטורציה</div>
        <div class="fc-latin">Tropaeolum majus</div>
        <div class="fc-repels">פח דבש: מושכת כנימות אליה — לא לירקות</div>
        <div class="fc-desc">אסטרטגיה מבריקה — הכנימות מעדיפות את הנסטורציה. כל הנזק שם, לא על הירקות.</div>
      </div>
      <div class="flower-card fc-borage">
        <div class="fc-accent"></div>
        <span class="fc-icon">🔵</span>
        <div class="fc-name">בורג' (לשון שור)</div>
        <div class="fc-latin">Borago officinalis</div>
        <div class="fc-repels">מרחיק: תולעי כרוב ומזיקי עגבנייה</div>
        <div class="fc-desc">עשבוני מהיר שמושך דבורי דבש. ליד תותים — מגדיל יבול. זרעים עצמאיים כל שנה.</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ב</div><h2>שלוש הסיבות לשתול פרחים</h2><span class="sh-en">Why it works</span></div>
    <hr class="div">
    <div class="three-roles">
      <div class="role-card">
        <span class="role-icon">🐝</span>
        <div class="role-title">האבקה</div>
        <div class="role-desc">פרחים מושכים דבורים — גם הירקות הסמוכים מואבקים טוב יותר</div>
      </div>
      <div class="role-card">
        <span class="role-icon">🛡</span>
        <div class="role-title">הגנה</div>
        <div class="role-desc">ריחות מבלבלים ומרחיקים חרקים שמחפשים ירקות לפי ריח</div>
      </div>
      <div class="role-card">
        <span class="role-icon">🪲</span>
        <div class="role-title">מלכוד</div>
        <div class="role-desc">פרחים כמו נסטורציה מושכים מזיקים אליהם — פח טבעי</div>
      </div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">צ'ופצ'ו אומר:</div>
      <div class="chupchu-text">ראיתי פעם גינת ירקות בלי פרחים. היא הייתה עצובה. הירקות גדלו, אבל לא שרו. כשהוספנו טגטס ולבנדר — הגינה הפכה להיות חיה.</div>
    </div>
  </div>
  <div class="section">
    <div class="sh"><div class="sn">ג</div><h2>איך לשלב אותם</h2><span class="sh-en">Placement tips</span></div>
    <hr class="div">
    <div class="placement-box">
      <div class="pb-title">עצות שתילה</div>
      <div class="pb-item"><div class="pb-dot" style="background:var(--marigold);"></div><span class="pb-text">טגטס — שורת גבול בשוליים, גם בין שורות ירקות</span></div>
      <div class="pb-item"><div class="pb-dot" style="background:var(--lavender);"></div><span class="pb-text">לבנדר — פינות ורכסים, לא בתוך הערוגה הצפופה</span></div>
      <div class="pb-item"><div class="pb-dot" style="background:var(--nasturtium);"></div><span class="pb-text">נסטורציה — מרחק 50 ס"מ מהירקות כ"פח" נפרד</span></div>
      <div class="pb-item"><div class="pb-dot" style="background:var(--borage);"></div><span class="pb-text">בורג' — ליד תותים ועגבניות, בסמיכות</span></div>
      <div class="pb-item"><div class="pb-dot" style="background:var(--sunflower);"></div><span class="pb-text">חמנייה — רקע גבוה, מצל חלקי וצד צפוני</span></div>
    </div>
  </div>
  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">שתלו פרחים ביום פרח לפי הלוח הביודינמי — הם יפרחו מהר יותר ויביאו יותר מאביקים. פתח גינה חיה לבדוק מתי!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/tomato-basil">עגבנייה ובזיליקום</a>
      <a class="related-link" href="/articles/three-sisters">שלוש האחיות</a>
      <a class="related-link" href="/articles/beneficial-beetles">חיפושיות טובות — מה מושך אותן</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום הפרח הביודינמי לשתול פרחים בגינה?<br><em>Find the biodynamic flower day for planting companion flowers.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
  {
    id: 'watering-pots',
    titleHe: 'השקיית עציצים — המדריך המקצועי',
    titleEn: 'Watering Potted Plants — The Professional Guide',
    metaDescriptionHe: 'למדו את הדרך המקצועית להשקות עציצים — עמוק, לעיתים רחוקות, ובמועד הנכון.',
    metaDescriptionEn: 'Learn the professional way to water potted plants — deep, infrequent, and at the right moment.',
    categoryHe: 'השקיה',
    categoryEn: 'Irrigation',
    filenameHe: '21_השקיה_עציצים.md',
    filenameEn: '21_watering_pots.md',
    publishedAt: '2026-04-18',
    images: { hero: '/images/articles/21_watering_pots.webp' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Assistant:wght@300;400;600&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --water:#1a4a6a;
  --water-mid:#2a6a9a;
  --water-light:#4a9aca;
  --water-pale:#d0eaf8;
  --clay:#8b5a2a;
  --clay-light:#c8a870;
  --soil:#2d1a08;
  --cream:#f8f4ee;
  --cream-dark:#ede4d4;
  --ink:#1a1408;
  --ink-mid:#3d2e10;
  --ink-light:#7a6040;
  --sage:#3a5a30;
  font-family:'Assistant',sans-serif;
  background:var(--cream);
  color:var(--ink);
}
.hero{
  background:linear-gradient(135deg,var(--water) 0%,var(--water-mid) 60%,#1a6a4a 100%);
  padding:3rem 2.5rem 2.5rem;
  position:relative;
  overflow:hidden;
  direction:rtl;
}
.hero::before{content:'💧';position:absolute;top:-20px;left:-10px;font-size:140px;opacity:0.07;transform:rotate(-15deg);}
.hero-tag{display:inline-block;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9);font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:0.9rem;}
.hero h1{font-family:'Lora',serif;font-size:2.4rem;font-weight:600;color:#fff;line-height:1.1;margin-bottom:0.3rem;}
.hero-en{font-family:'Lora',serif;font-size:0.9rem;font-style:italic;color:rgba(255,255,255,0.65);margin-bottom:1.1rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:rgba(255,255,255,0.55);font-weight:300;}
.body{padding:0 2.5rem;}
.intro{font-family:'Lora',serif;font-size:1.05rem;line-height:1.9;color:var(--water);border-right:3px solid var(--water-light);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--water);color:#fff;font-family:'Lora',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Lora',serif;font-size:1.2rem;font-weight:600;color:var(--water);}
.div{border:none;border-top:1px solid rgba(26,74,106,0.15);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--ink-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--water);font-weight:600;}
.steps{display:flex;flex-direction:column;gap:12px;margin:1.25rem 0;}
.step{background:#fff;border:1px solid rgba(26,74,106,0.15);border-radius:8px;padding:14px 16px;direction:rtl;border-right:4px solid var(--water-light);}
.step-head{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
.step-num{width:28px;height:28px;border-radius:50%;background:var(--water);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step-title{font-size:0.95rem;font-weight:700;color:var(--water);}
.step-row{font-size:0.85rem;line-height:1.65;color:var(--ink-mid);margin-bottom:4px;}
.step-row strong{color:var(--ink);font-weight:600;}
.mistakes{display:flex;flex-direction:column;gap:10px;margin:1.25rem 0;}
.mistake{background:#fff3f0;border:1px solid rgba(139,58,26,0.2);border-radius:8px;padding:12px 14px;direction:rtl;border-right:4px solid #c0503a;}
.m-title{font-size:0.9rem;font-weight:700;color:#8b3a1a;margin-bottom:6px;}
.m-row{font-size:0.82rem;line-height:1.6;color:var(--ink-mid);margin-bottom:3px;}
.m-row strong{color:var(--ink);font-weight:600;}
.m-fix{font-size:0.82rem;color:var(--sage);font-weight:600;margin-top:4px;}
.summary{background:var(--water-pale);border:1px solid rgba(26,74,106,0.2);border-radius:8px;padding:1.2rem 1.4rem;margin:1.5rem 0;direction:rtl;}
.sum-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:0.88rem;line-height:1.6;}
.sum-label{color:var(--water);font-weight:700;white-space:nowrap;flex-shrink:0;}
.sum-val{color:var(--ink-mid);}
.insight{background:linear-gradient(135deg,rgba(26,74,106,0.06),rgba(58,90,48,0.06));border:1px solid rgba(26,74,106,0.15);border-radius:8px;padding:1.2rem 1.4rem;margin:1.5rem 0;direction:rtl;}
.insight-tag{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--water-mid);margin-bottom:0.5rem;}
.insight-text{font-family:'Lora',serif;font-style:italic;font-size:0.95rem;line-height:1.8;color:var(--ink-mid);}
.result{margin:1.5rem 0;direction:rtl;}
.result-line{display:flex;align-items:flex-start;gap:8px;font-size:0.9rem;line-height:1.65;color:var(--ink-mid);margin-bottom:6px;}
.result-dot{width:6px;height:6px;border-radius:50%;background:var(--water-light);flex-shrink:0;margin-top:7px;}
.chupchu{background:var(--cream-dark);border:1px solid rgba(139,90,42,0.2);border-radius:8px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center 15%;border:1px solid rgba(139,90,42,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--clay);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--ink-mid);}
.related{margin:1.75rem 0;direction:rtl;}
.related-title{font-size:0.8rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-light);margin-bottom:0.75rem;}
.related-links{display:flex;flex-wrap:wrap;gap:8px;}
.related-link{font-size:0.82rem;color:var(--water);border:1px solid rgba(26,74,106,0.25);border-radius:99px;padding:5px 14px;text-decoration:none;transition:background 0.15s;}
.related-link:hover{background:rgba(26,74,106,0.08);}
.footer-cta{background:var(--water);padding:2rem 2.5rem;display:flex;gap:1rem;align-items:center;direction:rtl;margin-top:2rem;}
.footer-img{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);flex-shrink:0;}
.footer-text{font-size:0.9rem;line-height:1.6;color:rgba(255,255,255,0.85);flex:1;}
.footer-text em{color:rgba(255,255,255,0.55);font-size:0.8rem;}
.footer-btn{background:#fff;color:var(--water);font-weight:700;font-size:0.85rem;padding:10px 20px;border-radius:6px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
</style>
<article class="art">
<div class="hero">
  <div class="hero-tag">💧 השקיה</div>
  <h1>השקיית עציצים</h1>
  <div class="hero-en">Watering Potted Plants — The Professional Guide</div>
  <div class="hero-meta">
    <span>🌱 גינה חיה</span>
    <span>📅 אפריל 2026</span>
    <span>⏱ 5 דקות קריאה</span>
  </div>
</div>
<div class="body">
  <div class="intro">
    עציץ הוא עולם קטן.<br>
    הקרקע בתוכו מוגבלת, הניקוז מהיר, והצמח תלוי כולו בידיים שלכם.<br>
    המפתח להשקיית עציצים אינו תדירות — אלא שיפוט.
  </div>

  <div class="section">
    <div class="sh"><div class="sn">1</div><h2>הסבר ברור</h2></div>
    <hr class="div">
    <p class="p">בשדה, הקרקע היא מאגר גדול — שורשים יכולים להעמיק, הלחות מתפזרת לאזורים רחבים, ויש תמיד עתודה.</p>
    <p class="p">בעציץ, אין כל זה. האדמה מוגבלת, ומה שלא נספג יורד ויוצא. לכן, המטרה אינה לשמור על לחות תמידית — אלא ליצור מחזור של <strong>השקיה עמוקה, ואז ייבוש חלקי</strong>. כך מתפתחות שורשים בריאים, ומניעים ריקבון שורשים מעודף מים.</p>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">2</div><h2>מדריך שלב-אחר-שלב</h2></div>
    <hr class="div">
    <div class="steps">
      <div class="step">
        <div class="step-head"><div class="step-num">1</div><div class="step-title">בדקו לפני שאתם משקים</div></div>
        <div class="step-row"><strong>פעולה:</strong> הכניסו אצבע 2–4 ס"מ לתוך האדמה</div>
        <div class="step-row"><strong>מה לחפש:</strong> אם השכבה יבשה — השקו. אם עדיין לחה — המתינו</div>
        <div class="step-row"><strong>סימן נוסף:</strong> הרימו את העציץ — עציץ קל הוא עציץ צמא</div>
        <div class="step-row"><strong>זכרו:</strong> עציצים קטנים מתייבשים מהר; גדולים שומרים לחות זמן רב יותר</div>
      </div>
      <div class="step">
        <div class="step-head"><div class="step-num">2</div><div class="step-title">השקו עמוק ולאט</div></div>
        <div class="step-row"><strong>פעולה:</strong> השקו לאט על פני כל שטח האדמה</div>
        <div class="step-row"><strong>כמה:</strong> המשיכו עד שמים יוצאים מחורי הניקוז</div>
        <div class="step-row"><strong>טיפ:</strong> המתינו דקה-שתיים ואז הוסיפו עוד מעט — הריווי מגיע בגלים</div>
      </div>
      <div class="step">
        <div class="step-head"><div class="step-num">3</div><div class="step-title">רוקנו את הצלחית</div></div>
        <div class="step-row"><strong>פעולה:</strong> כ-20 דקות לאחר ההשקיה — ודאו שאין מים עומדים בצלחית</div>
        <div class="step-row"><strong>למה:</strong> שורשים שעומדים במים ללא חמצן נרקבים</div>
        <div class="step-row"><strong>הקו הדק:</strong> צלחית בסדר — מים עומדים שעות, זה בעיה</div>
      </div>
      <div class="step">
        <div class="step-head"><div class="step-num">4</div><div class="step-title">המתינו לייבוש חלקי</div></div>
        <div class="step-row"><strong>פעולה:</strong> אל תשקו שוב עד שהשכבה העליונה מתחילה להתייבש</div>
        <div class="step-row"><strong>מה לחפש:</strong> אדמה שמתנתקת מדפנות הכלי, צבע בהיר יותר בפני השטח</div>
        <div class="step-row"><strong>עיקרון:</strong> ייבוש חלקי — כן. ייבוש מוחלט — לא</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">3</div><h2>טעויות נפוצות</h2></div>
    <hr class="div">
    <div class="mistakes">
      <div class="mistake">
        <div class="m-title">❌ מים מעט כל יום</div>
        <div class="m-row">"מרדדים" מים על פני השטח בכל בוקר — השכבה העליונה לחה, השורשים יבשים</div>
        <div class="m-fix">✓ השקיה עמוקה, פחות תכופה</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ מים לפי לוח זמנים קבוע</div>
        <div class="m-row">משקים כל יומיים ללא קשר למצב האדמה — עציצים שונים מתייבשים בקצבים שונים</div>
        <div class="m-fix">✓ בדקו את האדמה, לא את הלוח</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ להשאיר מים בצלחית</div>
        <div class="m-row">שוכחים לרוקן — שורשים ספוגים בלי חמצן, ריקבון, צהבה</div>
        <div class="m-fix">✓ לרוקן תמיד. אחרי לילה — חובה</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ אדמת גינה בעציץ</div>
        <div class="m-row">אדמה רגילה מתדחסת בכלי, לא מאפשרת ניקוז, חונקת שורשים</div>
        <div class="m-fix">✓ תערובת עציצים מוכנה — מחזיקה לחות אך גם מנקזת</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ להתעלם מסוג הכלי</div>
        <div class="m-row">עציץ חרס מתייבש פי שניים מהר יותר מפלסטיק; עציץ בד — אפילו מהר יותר</div>
        <div class="m-fix">✓ התאימו את תדירות הבדיקה לחומר הכלי</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">4</div><h2>תובנה ביודינמית</h2></div>
    <hr class="div">
    <div class="insight">
      <div class="insight-tag">🌕 ביודינמי</div>
      <div class="insight-text">בגינה הביודינמית, השקיה אינה רק תחזוקה — היא מגע. כשאתם נוגעים באדמה, מרגישים את הלחות, מרימים את העציץ ומחושים את משקלו — אתם בשיח עם הצמח.<br><br>זמן ההשקיה הטוב ביותר לרוב הצמחים הוא <strong>הבוקר המוקדם</strong>. בימים חמים במיוחד — בדקו גם בין-הצהרים. לא כדי להשקות בהכרח — אלא כדי לדעת.</div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">5</div><h2>תוצאה — כשמשקים נכון</h2></div>
    <hr class="div">
    <div class="result">
      <div class="result-line"><div class="result-dot"></div><span>העלים זקופים יותר ובגוון עמוק יותר</span></div>
      <div class="result-line"><div class="result-dot"></div><span>הצמיחה מסודרת, לא עצבנית</span></div>
      <div class="result-line"><div class="result-dot"></div><span>האדמה ריחנית — ריח אדמה לאחר גשם, לא ריח עיפוש</span></div>
      <div class="result-line"><div class="result-dot"></div><span>הרמה של עציץ לח ורמה של עציץ יבש הופכות לשפה — אחת המיומנויות הכי שימושיות לגנן ביתי</span></div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">6</div><h2>סיכום מהיר</h2></div>
    <hr class="div">
    <div class="summary">
      <div class="sum-row"><span class="sum-label">מה לעשות:</span><span class="sum-val">בדקו לפני שאתם משקים — אצבע לאדמה, הרגישו את משקל הכלי</span></div>
      <div class="sum-row"><span class="sum-label">איך להשקות:</span><span class="sum-val">עמוק ולאט, עד שמים יוצאים מהניקוז</span></div>
      <div class="sum-row"><span class="sum-label">מתי:</span><span class="sum-val">כשהשכבה העליונה מתחילה להתייבש — לא לפי שעון</span></div>
      <div class="sum-row"><span class="sum-label">למה זה עובד:</span><span class="sum-val">שורשים עמוקים ובריאים, מניעת ריקבון, צמח חזק יותר</span></div>
    </div>
  </div>

  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">לפי הלוח הביודינמי — יום שורש הוא הזמן הטוב ביותר לעבוד עם אדמת העציץ ולהשקות לעומק. האדמה קולטת טוב יותר. פתח גינה חיה לבדוק!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/deep-vs-shallow-watering">השקיה עמוקה מול שטחית</a>
      <a class="related-link" href="/articles/drip-irrigation">השקיה בטפטוף</a>
      <a class="related-link" href="/articles/biodynamic-calendar">הלוח הביודינמי</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש הביודינמי הבא — הזמן הכי טוב להשקות לעומק?<br><em>Check the biodynamic root day for deep watering.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },

  // ── Article 22 — Ground Mulching (full HTML) ───────────────────────────────

  {
    id: 'ground-mulching',
    titleHe: 'חיפוי קרקע לחיסכון במים ולהפחתת עשבייה',
    titleEn: 'Ground Mulching for Water Saving and Weed Reduction',
    metaDescriptionHe: 'חיפוי קרקע הוא דרך טבעית ויעילה לחסוך במים, להפחית עשבייה, לשמור על לחות הקרקע ולשפר את פוריות האדמה. מדריך מקצועי בגישה ביודינמית.',
    metaDescriptionEn: 'Ground mulching is a natural and effective way to save water, reduce weeds, retain soil moisture, and improve soil fertility. A professional guide in the biodynamic approach.',
    categoryHe: 'השקיה',
    categoryEn: 'Irrigation',
    filenameHe: 'חיפוי_קרקע.md',
    filenameEn: '06_mulching.md',
    publishedAt: '2026-04-18',
    images: { hero: '/images/articles/22_multching.png' },
    htmlContent: `<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Assistant:wght@300;400;600&family=Caveat:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.art{
  --earth:#3a2010;
  --earth-mid:#5a3820;
  --earth-light:#8a6040;
  --straw:#c8a84b;
  --straw-pale:#f0e8c8;
  --green:#2a4a1a;
  --green-mid:#4a7a2a;
  --green-pale:#d0e8b0;
  --cream:#f8f4ec;
  --cream-dark:#ede4d0;
  --ink:#1a1008;
  font-family:'Assistant',sans-serif;
  background:var(--cream);
  color:var(--ink);
}
.hero{
  background:linear-gradient(135deg,var(--green) 0%,#3a6020 60%,var(--earth) 100%);
  padding:3rem 2.5rem 2.5rem;
  position:relative;
  overflow:hidden;
  direction:rtl;
}
.hero::before{content:'🌿';position:absolute;top:-10px;left:-10px;font-size:130px;opacity:0.08;transform:rotate(-20deg);}
.hero-tag{display:inline-block;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9);font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:3px 11px;border-radius:2px;margin-bottom:0.9rem;}
.hero h1{font-family:'Lora',serif;font-size:2.2rem;font-weight:600;color:#fff;line-height:1.1;margin-bottom:0.3rem;}
.hero-en{font-family:'Lora',serif;font-size:0.9rem;font-style:italic;color:rgba(255,255,255,0.6);margin-bottom:1.1rem;}
.hero-meta{display:flex;gap:1.25rem;font-size:11px;color:rgba(255,255,255,0.5);font-weight:300;}
.body{padding:0 2.5rem;}
.intro{font-family:'Lora',serif;font-size:1.05rem;line-height:1.9;color:var(--green);border-right:3px solid var(--green-mid);padding:0.25rem 1.1rem;margin:1.75rem 0;direction:rtl;}
.section{margin:2.25rem 0 0;}
.sh{display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;direction:rtl;}
.sn{width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;font-family:'Lora',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sh h2{font-family:'Lora',serif;font-size:1.2rem;font-weight:600;color:var(--green);}
.div{border:none;border-top:1px solid rgba(42,74,26,0.15);margin-bottom:1.1rem;}
.p{font-size:0.93rem;line-height:1.85;color:var(--earth-mid);direction:rtl;margin-bottom:0.9rem;}
.p strong{color:var(--green);font-weight:600;}
.steps{display:flex;flex-direction:column;gap:12px;margin:1.25rem 0;}
.step{background:#fff;border:1px solid rgba(42,74,26,0.15);border-radius:8px;padding:14px 16px;direction:rtl;border-right:4px solid var(--green-mid);}
.step-head{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
.step-num{width:28px;height:28px;border-radius:50%;background:var(--green);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step-title{font-size:0.95rem;font-weight:700;color:var(--green);}
.step-row{font-size:0.85rem;line-height:1.65;color:var(--earth-mid);margin-bottom:4px;}
.step-row strong{color:var(--ink);font-weight:600;}
.mistakes{display:flex;flex-direction:column;gap:10px;margin:1.25rem 0;}
.mistake{background:#fff8f0;border:1px solid rgba(139,90,42,0.2);border-radius:8px;padding:12px 14px;direction:rtl;border-right:4px solid var(--earth-light);}
.m-title{font-size:0.9rem;font-weight:700;color:var(--earth);margin-bottom:6px;}
.m-row{font-size:0.82rem;line-height:1.6;color:var(--earth-mid);margin-bottom:3px;}
.m-fix{font-size:0.82rem;color:var(--green);font-weight:600;margin-top:4px;}
.materials{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:1.25rem 0;}
.mat{background:var(--green-pale);border:1px solid rgba(42,74,26,0.2);border-radius:8px;padding:12px 14px;direction:rtl;}
.mat-name{font-size:0.88rem;font-weight:700;color:var(--green);margin-bottom:4px;}
.mat-desc{font-size:0.8rem;color:var(--earth-mid);line-height:1.5;}
.summary{background:var(--straw-pale);border:1px solid rgba(200,168,75,0.3);border-radius:8px;padding:1.2rem 1.4rem;margin:1.5rem 0;direction:rtl;}
.sum-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:0.88rem;line-height:1.6;}
.sum-label{color:var(--earth);font-weight:700;white-space:nowrap;flex-shrink:0;}
.sum-val{color:var(--earth-mid);}
.insight{background:linear-gradient(135deg,rgba(42,74,26,0.06),rgba(58,32,16,0.04));border:1px solid rgba(42,74,26,0.15);border-radius:8px;padding:1.2rem 1.4rem;margin:1.5rem 0;direction:rtl;}
.insight-tag{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--green-mid);margin-bottom:0.5rem;}
.insight-text{font-family:'Lora',serif;font-style:italic;font-size:0.95rem;line-height:1.8;color:var(--earth-mid);}
.result{margin:1.5rem 0;direction:rtl;}
.result-line{display:flex;align-items:flex-start;gap:8px;font-size:0.9rem;line-height:1.65;color:var(--earth-mid);margin-bottom:6px;}
.result-dot{width:6px;height:6px;border-radius:50%;background:var(--green-mid);flex-shrink:0;margin-top:7px;}
.chupchu{background:var(--cream-dark);border:1px solid rgba(139,90,42,0.2);border-radius:8px;padding:1rem 1.2rem;margin:1.75rem 0;display:flex;gap:0.9rem;align-items:flex-start;direction:rtl;}
.chupchu-img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid rgba(139,90,42,0.3);flex-shrink:0;}
.chupchu-name{font-family:'Caveat',cursive;font-size:13px;font-weight:600;color:var(--earth-light);margin-bottom:3px;}
.chupchu-text{font-family:'Caveat',cursive;font-size:1rem;line-height:1.55;color:var(--earth-mid);}
.related{margin:1.75rem 0;direction:rtl;}
.related-title{font-size:0.8rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--earth-light);margin-bottom:0.75rem;}
.related-links{display:flex;flex-wrap:wrap;gap:8px;}
.related-link{font-size:0.82rem;color:var(--green);border:1px solid rgba(42,74,26,0.25);border-radius:99px;padding:5px 14px;text-decoration:none;}
.footer-cta{background:var(--green);padding:2rem 2.5rem;display:flex;gap:1rem;align-items:center;direction:rtl;margin-top:2rem;}
.footer-img{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);flex-shrink:0;}
.footer-text{font-size:0.9rem;line-height:1.6;color:rgba(255,255,255,0.85);flex:1;}
.footer-text em{color:rgba(255,255,255,0.5);font-size:0.8rem;}
.footer-btn{background:#fff;color:var(--green);font-weight:700;font-size:0.85rem;padding:10px 20px;border-radius:6px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
</style>
<article class="art">
<div class="hero">
  <div class="hero-tag">🌿 השקיה וקרקע</div>
  <h1>חיפוי קרקע</h1>
  <div class="hero-en">Ground Mulching for Water Saving &amp; Weed Reduction</div>
  <div class="hero-meta">
    <span>🌱 גינה חיה</span>
    <span>📅 אפריל 2026</span>
    <span>⏱ 5 דקות קריאה</span>
  </div>
</div>
<div class="body">
  <div class="intro">
    יש פעולות קטנות בגינה שיוצרות שינוי גדול.<br>
    חיפוי קרקע הוא אחת מהן.<br>
    כאשר האדמה נשארת חשופה — הלחות בורחת, עשבים נובטים, והקרקע נחלשת. כיסוי נכון משנה את המשוואה.
  </div>

  <div class="section">
    <div class="sh"><div class="sn">1</div><h2>הסבר ברור</h2></div>
    <hr class="div">
    <p class="p">חיפוי קרקע הוא שכבה של חומר אורגני או טבעי שמונחת על פני האדמה. המטרה שלו: <strong>להגן על הקרקע, להפחית אידוי, לצמצם עשבייה</strong>, וליצור תנאים טובים יותר לחיים הביולוגיים שבאדמה.</p>
    <p class="p">בחקלאות ביודינמית נעדיף חומרים טבעיים, פשוטים ומקומיים ככל האפשר — חומרים שממשיכים את מחזור החיים של המקום. הקרקע אינה רק מצע לצמח — היא מערכת חיה.</p>
    <div class="materials">
      <div class="mat"><div class="mat-name">🌾 קש ועלים יבשים</div><div class="mat-desc">קלים, טבעיים, מעולים לירקות ועשבי תיבול</div></div>
      <div class="mat"><div class="mat-name">🪵 גזם מרוסק ושבבי עץ</div><div class="mat-desc">מחזיקים זמן רב — מתאים לעצים ושיחים</div></div>
      <div class="mat"><div class="mat-name">♻️ קומפוסט גס</div><div class="mat-desc">מזין ומגן בו-זמנית</div></div>
      <div class="mat"><div class="mat-name">🌿 חומר צמחי מקומי</div><div class="mat-desc">הכי זול, הכי מחובר למקום</div></div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">2</div><h2>מדריך שלב-אחר-שלב</h2></div>
    <hr class="div">
    <div class="steps">
      <div class="step">
        <div class="step-head"><div class="step-num">1</div><div class="step-title">השקו לפני החיפוי</div></div>
        <div class="step-row"><strong>פעולה:</strong> השקו את הקרקע היטב לפני הנחת החיפוי</div>
        <div class="step-row"><strong>למה:</strong> חיפוי מעל קרקע יבשה ישמור בעיקר על היובש הקיים</div>
        <div class="step-row"><strong>טיפ:</strong> הזמן הטוב ביותר הוא אחרי גשם או אחרי השקיה עמוקה</div>
      </div>
      <div class="step">
        <div class="step-head"><div class="step-num">2</div><div class="step-title">בחרו את חומר החיפוי</div></div>
        <div class="step-row"><strong>ירקות ועשבי תיבול:</strong> קש, עלים יבשים או קומפוסט גס</div>
        <div class="step-row"><strong>עצים ושיחים:</strong> גזם מרוסק ושבבי עץ — מחזיקים זמן רב יותר</div>
        <div class="step-row"><strong>חשוב:</strong> עדיף חומר נקי יחסית מזרעים כדי לא להכניס עשבייה חדשה</div>
      </div>
      <div class="step">
        <div class="step-head"><div class="step-num">3</div><div class="step-title">פזרו שכבה אחידה</div></div>
        <div class="step-row"><strong>עובי:</strong> 5–10 ס"מ על פני הקרקע</div>
        <div class="step-row"><strong>שימו לב:</strong> אל תצמידו את החיפוי לגזע — השאירו מרווח של 5–10 ס"מ</div>
        <div class="step-row"><strong>מטרה:</strong> אוורור סביב אזור הצוואר מונע ריקבון</div>
      </div>
      <div class="step">
        <div class="step-head"><div class="step-num">4</div><div class="step-title">חדשו לפי הצורך</div></div>
        <div class="step-row"><strong>תדירות:</strong> בדקו את שכבת החיפוי פעם בחודש-חודשיים</div>
        <div class="step-row"><strong>מה לחפש:</strong> שכבה שהתדקקה מתחת ל-3 ס"מ — זמן לחדש</div>
        <div class="step-row"><strong>יתרון:</strong> חיפוי שמתפרק הופך לחלק ממחזור החיים של הקרקע</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">3</div><h2>טעויות נפוצות</h2></div>
    <hr class="div">
    <div class="mistakes">
      <div class="mistake">
        <div class="m-title">❌ חיפוי על קרקע יבשה</div>
        <div class="m-row">מניחים חיפוי בלי להשקות לפני — החיפוי נועל את היובש בפנים</div>
        <div class="m-fix">✓ תמיד להשקות עמוק לפני הנחת החיפוי</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ הצמדה לגזע</div>
        <div class="m-row">לחות תמידית בצוואר הצמח גורמת לריקבון ומחלות</div>
        <div class="m-fix">✓ להשאיר מרווח של 5–10 ס"מ סביב הגזע</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ שכבה דקה מדי (1–2 ס"מ)</div>
        <div class="m-row">לא מספיק כדי לחסום אור לעשבים או לשמור על לחות</div>
        <div class="m-fix">✓ שכבה של 5–10 ס"מ לתוצאות אמיתיות</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ חומר עם זרעים</div>
        <div class="m-row">קש או גזם שמכיל זרעי עשבים מביא גל חדש של עשבייה</div>
        <div class="m-fix">✓ לבחור חומר יבש ונקי, או קומפוסט בשל היטב</div>
      </div>
      <div class="mistake">
        <div class="m-title">❌ לא מחדשים</div>
        <div class="m-row">החיפוי מתפרק ומאבד יעילות תוך חודשים</div>
        <div class="m-fix">✓ לבדוק ולחדש את השכבה לפחות פעמיים בשנה</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">4</div><h2>תובנה ביודינמית</h2></div>
    <hr class="div">
    <div class="insight">
      <div class="insight-tag">🌕 ביודינמי</div>
      <div class="insight-text">בגינה הביודינמית, חיפוי קרקע הוא יותר מטכניקה — הוא ביטוי של עיקרון.<br><br>האדמה אינה אמורה להיות חשופה. ביערות, בשדות טבעיים — הקרקע תמיד מכוסה. עלים נושרים, חומר אורגני מצטבר. זה לא בלגן — זה הגנה. כשאנחנו מחפים קרקע בגינה, אנחנו מחקים תהליך שהטבע מכיר היטב.</div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">5</div><h2>תוצאה — גינה עם חיפוי</h2></div>
    <hr class="div">
    <div class="result">
      <div class="result-line"><div class="result-dot"></div><span>הקרקע שומרת על לחות גם בחום — כל השקיה הופכת יעילה יותר</span></div>
      <div class="result-line"><div class="result-dot"></div><span>עשבים פחות — פחות עבודת תחזוקה</span></div>
      <div class="result-line"><div class="result-dot"></div><span>האדמה עם הזמן הופכת עשירה ורופפת יותר מפירוק החיפוי</span></div>
      <div class="result-line"><div class="result-dot"></div><span>אחת ההשקעות הפשוטות ביותר בגינה, עם אחד מהתמורות הגבוהות ביותר</span></div>
    </div>
  </div>

  <div class="section">
    <div class="sh"><div class="sn">6</div><h2>סיכום מהיר</h2></div>
    <hr class="div">
    <div class="summary">
      <div class="sum-row"><span class="sum-label">מה לעשות:</span><span class="sum-val">לכסות את הקרקע בשכבת חומר אורגני של 5–10 ס"מ</span></div>
      <div class="sum-row"><span class="sum-label">מתי:</span><span class="sum-val">אחרי השקיה טובה או אחרי גשם</span></div>
      <div class="sum-row"><span class="sum-label">איזה חומר:</span><span class="sum-val">קש, עלים, גזם — בהתאם לגידול</span></div>
      <div class="sum-row"><span class="sum-label">למה זה עובד:</span><span class="sum-val">מפחית אידוי, חוסם אור לעשבים, מזין את הקרקע לאורך זמן</span></div>
    </div>
  </div>

  <div class="chupchu">
    <img class="chupchu-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
    <div>
      <div class="chupchu-name">הסוד של צ'ופצ'ו:</div>
      <div class="chupchu-text">לפי הלוח הביודינמי — יום שורש הוא הזמן הטוב ביותר לפרוש חיפוי קרקע. הקרקע קולטת טוב יותר ביום הזה. פתח גינה חיה לבדוק!</div>
    </div>
  </div>
  <div class="related">
    <div class="related-title">מאמרים קשורים</div>
    <div class="related-links">
      <a class="related-link" href="/articles/watering-pots">השקיית עציצים</a>
      <a class="related-link" href="/articles/deep-watering">השקיה עמוקה מול שטחית</a>
      <a class="related-link" href="/articles/weed-control">הדברת עשבים טבעית</a>
    </div>
  </div>
</div>
<footer class="footer-cta">
  <img class="footer-img" src="https://gina-haya.vercel.app/chupchu_final.png" alt="צ'ופצ'ו">
  <div class="footer-text">מתי יום השורש הביודינמי הבא — הזמן הכי טוב לפרוש חיפוי?<br><em>Check the biodynamic root day for mulching.</em></div>
  <a class="footer-btn" href="https://gina-haya.vercel.app">פתח גינה חיה ←</a>
</footer>
</article>`,
  },
];
