import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import i18n from '../i18n';

// ── Local type ─────────────────────────────────────────────────────────────
interface Article {
  slug: string;
  title: string;
  description: string;
  content: string;
  readTimeMinutes: number;
  category?: string | null;
}

// ── Local categories catalog ───────────────────────────────────────────────
const ARTICLE_CATEGORIES = [
  { id: 'fertilizers',  labelHe: 'דשנים טבעיים',   labelEn: 'Fertilizers',        emoji: '🌱' },
  { id: 'pest-control', labelHe: 'הדברה',           labelEn: 'Pest Control',       emoji: '🐛' },
  { id: 'compost',      labelHe: 'קומפוסט',         labelEn: 'Compost',            emoji: '♻️' },
  { id: 'bd-preps',     labelHe: 'פרפרטים BD',      labelEn: 'BD Preps',           emoji: '🌙' },
  { id: 'companion',    labelHe: 'שיתופי פעולה',    labelEn: 'Companion Planting', emoji: '🤝' },
  { id: 'techniques',   labelHe: 'טכניקות גינון',   labelEn: 'Techniques',         emoji: '🔧' },
] as const;

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

// ── Image placeholder component ────────────────────────────────────────────
const ImagePlaceholder = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '160px', margin: '1.5rem 0',
    background: 'rgba(245,200,64,0.05)',
    border: '1px dashed rgba(245,200,64,0.2)',
    borderRadius: '10px',
    fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}50`,
    gap: '8px',
  }}>
    🖼️ תמונה בקרוב
  </div>
);

// ── Markdown component overrides ───────────────────────────────────────────
const MD: Record<string, React.ComponentType<any>> = {
  h2: ({ children }) => (
    <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, margin: '2rem 0 0.75rem', lineHeight: 1.3 }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontFamily: FRANK, fontSize: '18px', color: PARCH, margin: '1.5rem 0 0.5rem', lineHeight: 1.3 }}>
      {children}
    </h3>
  ),
  p: ({ children }) => {
    // Render IMAGE_PLACEHOLDER marker as the placeholder component
    if (typeof children === 'string' && children === '__IMAGE_PLACEHOLDER__') {
      return <ImagePlaceholder />;
    }
    return (
      <p style={{ fontFamily: ASSIST, fontSize: '16px', color: `${PARCH}DD`, lineHeight: 1.85, margin: '0 0 1rem' }}>
        {children}
      </p>
    );
  },
  blockquote: ({ children }) => (
    <blockquote style={{
      borderRight: `3px solid ${GOLD}`,
      borderLeft: 'none',
      margin: '1.25rem 0',
      padding: '14px 18px 14px 14px',
      background: 'rgba(245,200,64,0.06)',
      borderRadius: '0 8px 8px 0',
      fontStyle: 'italic',
      color: GOLD,
    }}>
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 1rem', padding: '0 1.5rem 0 0', listStyle: 'none' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 1rem', padding: '0 1.5rem 0 0' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{
      fontFamily: ASSIST, fontSize: '16px', color: `${PARCH}DD`,
      lineHeight: 1.85, marginBottom: '0.4rem',
      paddingRight: '1.2rem', position: 'relative',
    }}>
      <span style={{ position: 'absolute', right: 0, color: '#7DC084', fontWeight: 700 }}>•</span>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ color: GOLD, fontWeight: 700 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: `${PARCH}BB`, fontStyle: 'italic' }}>{children}</em>
  ),
  code: ({ children }) => (
    <code style={{
      fontFamily: 'monospace', fontSize: '13px',
      background: 'rgba(255,255,255,0.08)', color: `${PARCH}BB`,
      borderRadius: '4px', padding: '1px 6px',
    }}>
      {children}
    </code>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid rgba(245,200,64,0.15)', margin: '2rem 0' }} />
  ),
};

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  slug: string;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────
export function ArticleReader({ slug, onClose }: Props) {
  const [article,  setArticle]  = useState<Article | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setArticle(null);
    const lang = i18n.language === 'en' ? 'en' : 'he';
    api.get<Article>(`/api/articles/${slug}?lang=${lang}`)
      .then(setArticle)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
    setProgress(Math.min(100, Math.max(0, pct || 0)));
  }, []);

  const category = article?.category
    ? ARTICLE_CATEGORIES.find(c => c.id === article.category)
    : null;

  // Replace HTML comment IMAGE PLACEHOLDERs with a text marker ReactMarkdown can route
  const processedContent = article?.content
    .replace(/<!--\s*IMAGE PLACEHOLDER\s*-->/gi, '\n__IMAGE_PLACEHOLDER__\n')
    ?? '';

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(160deg, #0f2311 0%, #1a3d1c 60%, #0f2311 100%)',
        overflowY: 'auto',
        fontFamily: ASSIST,
      }}
    >
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,35,17,0.97)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(245,200,64,0.1)',
      }}>
        {/* Nav row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px',
        }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}80`,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0',
            }}
          >
            ‹ חזור למדריכים
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: `${PARCH}50`,
              cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: 0,
            }}
          >×</button>
        </div>

        {/* Reading progress bar */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', background: GOLD,
            width: `${progress}%`,
            transition: 'width 0.1s linear',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
            טוען מאמר...
          </p>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
          <p style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '0 0 8px' }}>
            המאמר עדיין בהכנה — בקרוב!
          </p>
          <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}60`, margin: '0 0 24px' }}>
            צ'ופצ'ו עובד על זה 🌿
          </p>
          <button
            onClick={onClose}
            style={{
              fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
              color: '#0f2311', background: GOLD,
              border: 'none', borderRadius: '8px',
              padding: '10px 24px', cursor: 'pointer',
            }}
          >
            חזור למדריכים
          </button>
        </div>
      )}

      {article && !loading && (
        <>
          {/* Article header */}
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '28px 24px 0' }}>
            {/* Category + read time */}
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'center',
              marginBottom: '14px', fontFamily: ASSIST, fontSize: '12px',
            }}>
              {category && (
                <span style={{
                  background: 'rgba(245,200,64,0.1)', color: GOLD,
                  border: '1px solid rgba(245,200,64,0.2)',
                  borderRadius: '99px', padding: '3px 10px',
                }}>
                  {category.emoji} {category.labelHe}
                </span>
              )}
              <span style={{ color: `${PARCH}50` }}>·</span>
              <span style={{ color: `${PARCH}60` }}>{article.readTimeMinutes} דקות קריאה</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: FRANK, fontSize: '28px', color: GOLD,
              margin: '0 0 20px', lineHeight: 1.25,
            }}>
              {article.title}
            </h1>

            {article.description && (
              <p style={{
                fontFamily: ASSIST, fontSize: '15px', color: `${PARCH}80`,
                lineHeight: 1.7, margin: '0 0 28px',
                borderRight: `3px solid rgba(245,200,64,0.25)`,
                paddingRight: '14px',
              }}>
                {article.description}
              </p>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(245,200,64,0.12)', margin: '0 0 28px' }} />
          </div>

          {/* Article body */}
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
            <ReactMarkdown components={MD}>
              {processedContent}
            </ReactMarkdown>
          </div>

          {/* Footer */}
          <div style={{
            maxWidth: '680px', margin: '40px auto 0',
            padding: '32px 24px 60px',
            borderTop: '1px solid rgba(245,200,64,0.12)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                  color: '#0f2311', background: GOLD,
                  border: 'none', borderRadius: '8px',
                  padding: '10px 22px', cursor: 'pointer',
                }}
              >
                ‹ חזור למדריכים
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
