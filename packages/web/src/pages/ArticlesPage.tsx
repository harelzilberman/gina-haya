import { useState, useEffect } from 'react';
import { api } from '../api/client';
import i18n from '../i18n';
import { ArticleReader } from '../components/ArticleReader';

interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  category?: string | null;
}

const ARTICLE_CATEGORIES = [
  { id: 'fertilizers',  labelHe: 'דשנים טבעיים',   labelEn: 'Fertilizers',        emoji: '🌱' },
  { id: 'pest-control', labelHe: 'הדברה',           labelEn: 'Pest Control',       emoji: '🐛' },
  { id: 'compost',      labelHe: 'קומפוסט',         labelEn: 'Compost',            emoji: '♻️' },
  { id: 'bd-preps',     labelHe: 'פרפרטים BD',      labelEn: 'BD Preps',           emoji: '🌙' },
  { id: 'companion',    labelHe: 'שיתופי פעולה',    labelEn: 'Companion Planting', emoji: '🤝' },
  { id: 'techniques',   labelHe: 'טכניקות גינון',   labelEn: 'Techniques',         emoji: '🔧' },
] as const;

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

export function ArticlesPage() {
  const [articles,    setArticles]    = useState<ArticleMeta[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeSlug,  setActiveSlug]  = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    const lang = i18n.language === 'en' ? 'en' : 'he';
    api.get<ArticleMeta[]>(`/api/articles?lang=${lang}`)
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeFilter === 'all'
    ? articles
    : articles.filter(a => a.category === activeFilter);

  if (activeSlug) {
    return <ArticleReader slug={activeSlug} onClose={() => setActiveSlug(null)} />;
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0e1e0f 0%, #142B16 30%, #0a1a0c 100%)',
        padding: '40px 48px 60px',
        fontFamily: ASSIST,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: FRANK, fontSize: '32px', color: GOLD, margin: '0 0 8px' }}>
          📖 מאמרים
        </h1>
        <p style={{ fontFamily: ASSIST, fontSize: '15px', color: `${PARCH}60`, margin: 0 }}>
          מדריכים מעמיקים לגינון ביודינמי — נכתבים על ידי צ'ופצ'ו
        </p>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {[{ id: 'all', labelHe: '✨ הכל', emoji: '' }, ...ARTICLE_CATEGORIES].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            style={{
              fontFamily: ASSIST, fontSize: '13px',
              padding: '6px 16px', borderRadius: '99px',
              border: `1px solid ${activeFilter === cat.id ? GOLD : 'rgba(245,200,64,0.2)'}`,
              background: activeFilter === cat.id ? 'rgba(245,200,64,0.15)' : 'transparent',
              color: activeFilter === cat.id ? GOLD : `${PARCH}60`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {'emoji' in cat && cat.emoji ? `${cat.emoji} ` : ''}{cat.labelHe}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
          <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>טוען מאמרים...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
          <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 8px' }}>
            {articles.length === 0 ? 'מאמרים בדרך...' : 'אין מאמרים בקטגוריה זו'}
          </p>
          <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}50`, margin: 0 }}>
            צ'ופצ'ו עובד על התוכן 🌿
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {filtered.map(article => (
            <ArticleCard
              key={article.slug}
              article={article}
              onClick={() => setActiveSlug(article.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article, onClick }: { article: ArticleMeta; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const cat = ARTICLE_CATEGORIES.find(c => c.id === article.category);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(245,200,64,0.06)' : 'rgba(20,50,22,0.5)',
        border: `1px solid ${hovered ? 'rgba(245,200,64,0.35)' : 'rgba(245,200,64,0.12)'}`,
        borderRadius: '12px', overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.18s, border-color 0.18s, background 0.18s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ padding: '16px' }}>
        {/* Category + read time */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          {cat && (
            <span style={{
              fontFamily: ASSIST, fontSize: '10px',
              background: 'rgba(245,200,64,0.1)', color: GOLD,
              border: '1px solid rgba(245,200,64,0.2)',
              borderRadius: '99px', padding: '2px 8px',
            }}>
              {cat.emoji} {cat.labelHe}
            </span>
          )}
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}45` }}>
            {article.readTimeMinutes} דק׳
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: FRANK, fontSize: '16px', color: hovered ? GOLD : PARCH,
          margin: '0 0 8px', lineHeight: 1.35, transition: 'color 0.15s',
        }}>
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p style={{
            fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}60`,
            margin: '0 0 12px', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ color: GOLD, fontSize: '14px' }}>קרא ›</span>
        </div>
      </div>
    </div>
  );
}
