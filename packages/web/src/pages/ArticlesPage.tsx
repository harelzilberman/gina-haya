import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ARTICLES, type ArticleEntry } from '../data/articles';

const GOLD   = '#c8a84b';
const PARCH  = '#d4c9a8';
const FRANK  = 'Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

const CATEGORY_FILTERS = [
  { id: 'all',          labelHe: '✨ הכל',           labelEn: '✨ All' },
  { id: 'Natural Fertilizers', labelHe: 'דשנים טבעיים',  labelEn: 'Natural Fertilizers', emoji: '🌱' },
  { id: 'Pest Control', labelHe: 'הדברה',            labelEn: 'Pest Control',          emoji: '🐛' },
  { id: 'Compost',      labelHe: 'קומפוסט',          labelEn: 'Compost',               emoji: '♻️' },
  { id: 'BD Preps',     labelHe: 'פרפרטים BD',       labelEn: 'BD Preps',              emoji: '🌙' },
  { id: 'Companion Planting', labelHe: 'שיתופי פעולה', labelEn: 'Companion Planting',  emoji: '🤝' },
] as const;

export function ArticlesPage() {
  const { i18n } = useTranslation();
  const navigate  = useNavigate();
  const lang: 'he' | 'en' = i18n.language === 'en' ? 'en' : 'he';
  const isRTL = lang === 'he';

  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filtered = activeFilter === 'all'
    ? ARTICLES
    : ARTICLES.filter(a => a.categoryEn === activeFilter);

  const heading    = lang === 'he' ? '📖 מאמרים' : '📖 Articles';
  const subheading = lang === 'he'
    ? "מדריכים מעמיקים לגינון ביודינמי — נכתבים על ידי צ'ופצ'ו"
    : 'In-depth guides to biodynamic gardening — written by Chupchu';
  const emptyMsg  = lang === 'he' ? 'מאמרים בדרך...' : 'Articles coming soon...';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
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
          {heading}
        </h1>
        <p style={{ fontFamily: ASSIST, fontSize: '15px', color: `${PARCH}60`, margin: 0 }}>
          {subheading}
        </p>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {CATEGORY_FILTERS.map(cat => {
          const label = lang === 'he' ? cat.labelHe : cat.labelEn;
          const active = activeFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              style={{
                fontFamily: ASSIST, fontSize: '13px',
                padding: '6px 16px', borderRadius: '99px',
                border: `1px solid ${active ? GOLD : 'rgba(180,150,60,0.2)'}`,
                background: active ? 'rgba(180,150,60,0.15)' : 'transparent',
                color: active ? GOLD : `${PARCH}60`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {'emoji' in cat ? `${cat.emoji} ` : ''}{label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
          <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 8px' }}>
            {emptyMsg}
          </p>
          <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}50`, margin: 0 }}>
            {lang === 'he' ? "צ'ופצ'ו עובד על התוכן 🌿" : 'Chupchu is working on it 🌿'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filtered.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              lang={lang}
              onClick={() => navigate(`/articles/${article.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({
  article,
  lang,
  onClick,
}: {
  article: ArticleEntry;
  lang: 'he' | 'en';
  onClick: () => void;
}) {
  const [hovered,  setHovered]  = useState(false);
  const [imgError, setImgError] = useState(false);

  const title       = lang === 'he' ? article.titleHe           : article.titleEn;
  const description = lang === 'he' ? article.metaDescriptionHe : article.metaDescriptionEn;
  const category    = lang === 'he' ? article.categoryHe        : article.categoryEn;
  const readLabel   = lang === 'he' ? 'קרא ›' : 'Read ›';
  const heroSrc     = article.images?.hero ?? null;
  const showHero    = heroSrc && !imgError;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(180,150,60,0.06)' : 'rgba(10,24,10,0.75)',
        border: `1px solid ${hovered ? 'rgba(180,150,60,0.35)' : 'rgba(180,150,60,0.14)'}`,
        borderRadius: '8px', overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.18s, border-color 0.18s, background 0.18s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Thumbnail */}
      {showHero ? (
        <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
          <img
            src={heroSrc!}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: 'transform 0.35s ease',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(5,12,5,0.65) 100%)',
          }} />
        </div>
      ) : (
        <div style={{
          height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #070f07 0%, #0f1e0f 100%)',
          borderBottom: '1px solid rgba(180,150,60,0.08)',
        }}>
          <span style={{
            fontFamily: ASSIST, fontSize: '11px',
            color: `${GOLD}35`, letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}>
            {category}
          </span>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        {/* Category badge */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{
            fontFamily: ASSIST, fontSize: '10px', letterSpacing: '0.05em',
            background: 'rgba(180,150,60,0.08)', color: GOLD,
            border: '1px solid rgba(180,150,60,0.2)',
            borderRadius: '99px', padding: '2px 9px',
          }}>
            {category}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: FRANK, fontSize: '16px', fontWeight: 400,
          color: hovered ? GOLD : PARCH,
          margin: '0 0 8px', lineHeight: 1.4, transition: 'color 0.15s',
        }}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p style={{
            fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}55`,
            margin: '0 0 12px', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}35` }}>
            {new Date(article.publishedAt + 'T12:00:00').toLocaleDateString(
              lang === 'he' ? 'he-IL' : 'en-US',
              { day: 'numeric', month: 'long', year: 'numeric' },
            )}
          </span>
          <span style={{ fontFamily: FRANK, color: `${GOLD}BB`, fontSize: '14px' }}>
            {readLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
