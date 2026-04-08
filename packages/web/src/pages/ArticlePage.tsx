import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { ARTICLES } from '../data/articles';

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const BG     = 'linear-gradient(160deg, #0f2311 0%, #1a3d1c 60%, #0f2311 100%)';

// ── Inline image injection ─────────────────────────────────────────────────
// Maps section heading keywords → image key in ArticleEntry.images
const SECTION_IMAGE_MAP: Array<{ heKeyword: string; enKeyword: string; imageKey: 'steps' | 'results'; captionHe: string; captionEn: string }> = [
  {
    heKeyword: 'שלב-אחר-שלב',
    enKeyword: 'step-by-step',
    imageKey: 'steps',
    captionHe: 'הכנת תה קומפוסט שלב אחר שלב',
    captionEn: 'Preparing compost tea step by step',
  },
  {
    heKeyword: 'תוצאות',
    enKeyword: 'result',
    imageKey: 'results',
    captionHe: 'תוצאות בגינה לאחר שימוש בתה קומפוסט',
    captionEn: 'Garden results after applying compost tea',
  },
];

// ── Markdown component overrides ───────────────────────────────────────────
function makeMD(
  lang: 'he' | 'en',
  images: Record<string, string> | null,
): Record<string, React.ComponentType<any>> {
  return {
    h1: () => null,
    h2: ({ children }) => {
      const text = typeof children === 'string' ? children : String(children ?? '');
      const lowerText = text.toLowerCase();

      // Check if this heading should be followed by an inline image
      const matchedSection = SECTION_IMAGE_MAP.find(s =>
        lowerText.includes(s.heKeyword) || lowerText.includes(s.enKeyword)
      );
      const imgSrc = matchedSection && images ? images[matchedSection.imageKey] : null;
      const caption = matchedSection
        ? (lang === 'he' ? matchedSection.captionHe : matchedSection.captionEn)
        : null;

      return (
        <>
          <h2 style={{
            fontFamily: FRANK, fontSize: '24px', color: GOLD,
            margin: '2.5rem 0 0.75rem', lineHeight: 1.3,
            borderBottom: '1px solid rgba(245,200,64,0.12)',
            paddingBottom: '0.5rem',
          }}>
            {children}
          </h2>
          {imgSrc && (
            <figure style={{ margin: '1.25rem 0 2rem' }}>
              <img
                src={imgSrc}
                alt={caption ?? text}
                style={{
                  width: '100%', borderRadius: '12px',
                  display: 'block',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                }}
              />
              {caption && (
                <figcaption style={{
                  fontFamily: ASSIST, fontSize: '13px',
                  color: `${PARCH}55`, textAlign: 'center',
                  marginTop: '8px', fontStyle: 'italic',
                }}>
                  {caption}
                </figcaption>
              )}
            </figure>
          )}
        </>
      );
    },
    h3: ({ children }) => (
      <h3 style={{
        fontFamily: FRANK, fontSize: '19px', color: PARCH,
        margin: '2rem 0 0.6rem', lineHeight: 1.3,
      }}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p style={{
        fontFamily: ASSIST, fontSize: '18px', color: `${PARCH}DD`,
        lineHeight: 1.85, margin: '0 0 1.2rem',
      }}>
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{
        borderInlineStart: `4px solid ${GOLD}`,
        margin: '1.5rem 0', padding: '16px 20px',
        background: 'rgba(245,200,64,0.05)',
        borderRadius: '0 10px 10px 0',
        fontStyle: 'italic', color: GOLD,
      }}>
        {children}
      </blockquote>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: '0 0 1.2rem', paddingInlineStart: '1.5rem', listStyle: 'none' }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: '0 0 1.2rem', paddingInlineStart: '1.5rem' }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{
        fontFamily: ASSIST, fontSize: '18px', color: `${PARCH}DD`,
        lineHeight: 1.85, marginBottom: '0.5rem',
        position: 'relative', paddingInlineStart: '1.4rem',
      }}>
        <span style={{ position: 'absolute', insetInlineStart: 0, color: '#7DC084', fontWeight: 700 }}>•</span>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ color: GOLD, fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: `${PARCH}BB`, fontStyle: 'italic' }}>{children}</em>,
    code: ({ children }) => (
      <code style={{
        fontFamily: 'monospace', fontSize: '14px',
        background: 'rgba(255,255,255,0.08)', color: `${PARCH}BB`,
        borderRadius: '4px', padding: '2px 7px',
      }}>
        {children}
      </code>
    ),
    hr: () => (
      <hr style={{
        border: 'none',
        borderTop: '1px solid rgba(245,200,64,0.15)',
        margin: '2.5rem 0',
      }} />
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ASSIST, fontSize: '15px' }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{
        color: GOLD, borderBottom: `1px solid rgba(245,200,64,0.3)`,
        padding: '10px 14px', textAlign: 'start',
      }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{
        color: `${PARCH}CC`,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '10px 14px',
      }}>
        {children}
      </td>
    ),
  };
}

// ── Markdown parser ─────────────────────────────────────────────────────────
function parseMarkdown(raw: string, lang: 'he' | 'en') {
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const descPattern = lang === 'he'
    ? /## תיאור מטא\n(.+)/
    : /## Meta Description\n(.+)/;
  const descMatch = raw.match(descPattern);
  const description = descMatch ? descMatch[1].trim() : '';

  // Strip everything from internal-only headings onwards
  const internalHeadings = [
    /^##\s+פרומפטים ל-ComfyUI/m,
    /^##\s+SUGGESTED VISUAL ASSETS/im,
  ];
  let stripped = raw;
  for (const pattern of internalHeadings) {
    const m = stripped.search(pattern);
    if (m !== -1) stripped = stripped.slice(0, m);
  }

  const content = stripped
    .replace(/^#\s.+$/m, '')
    .replace(/## (כותרת SEO|SEO Title)\n.+/g, '')
    .replace(/## (תיאור מטא|Meta Description)\n.+/g, '')
    .replace(/ComfyUI Prompt:\n"[^"]*"/g, '')
    .replace(/🌍.+/g, '')
    .trim();

  return { title, description, content };
}

// ── Component ───────────────────────────────────────────────────────────────
export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { i18n }  = useTranslation();
  const lang: 'he' | 'en' = i18n.language === 'en' ? 'en' : 'he';
  const isRTL = lang === 'he';

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [content,     setContent]     = useState('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [heroError,   setHeroError]   = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const entry = ARTICLES.find(a => a.id === slug);
  const heroSrc  = entry?.images?.hero ?? null;
  const imageMap = entry?.images
    ? Object.fromEntries(
        Object.entries(entry.images).map(([k, v]) => [k, v as string])
      )
    : null;

  useEffect(() => {
    if (!slug) { setError(true); setLoading(false); return; }

    setLoading(true);
    setError(false);
    setHeroError(false);
    setProgress(0);

    const filename = lang === 'en'
      ? (entry?.filenameEn ?? `${slug}.md`)
      : (entry?.filenameHe ?? `${slug}.md`);

    fetch(`/articles/${lang}/${filename}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(raw => {
        const parsed = parseMarkdown(raw, lang);
        setTitle(parsed.title || (lang === 'he' ? entry?.titleHe : entry?.titleEn) || slug!);
        setDescription(parsed.description || (lang === 'he' ? entry?.metaDescriptionHe : entry?.metaDescriptionEn) || '');
        setContent(parsed.content);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, lang]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
    setProgress(Math.min(100, Math.max(0, pct || 0)));
  }, []);

  const categoryLabel = entry ? (lang === 'he' ? entry.categoryHe : entry.categoryEn) : null;
  const backLabel     = lang === 'he' ? '‹ חזור למאמרים' : '‹ Back to Articles';
  const MD = makeMD(lang, imageMap);

  const showHero = heroSrc && !heroError;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 100,
        background: BG,
        overflowY: 'auto',
        fontFamily: ASSIST,
      }}
    >
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,35,17,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(245,200,64,0.1)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px',
        }}>
          <button
            onClick={() => navigate('/articles')}
            style={{
              fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}70`,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = GOLD; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = `${PARCH}70`; }}
          >
            {backLabel}
          </button>
          <button
            onClick={() => navigate('/articles')}
            style={{
              background: 'none', border: 'none',
              color: `${PARCH}40`, cursor: 'pointer',
              fontSize: '20px', lineHeight: 1, padding: 0,
            }}
          >×</button>
        </div>
        {/* Reading progress bar */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', background: GOLD,
            width: `${progress}%`, transition: 'width 0.1s linear',
          }} />
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
            {lang === 'he' ? 'טוען מאמר...' : 'Loading article...'}
          </p>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
          <p style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '0 0 8px' }}>
            {lang === 'he' ? 'המאמר עדיין בהכנה — בקרוב!' : 'Article coming soon!'}
          </p>
          <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}60`, margin: '0 0 24px' }}>
            {lang === 'he' ? "צ'ופצ'ו עובד על זה 🌿" : 'Chupchu is working on it 🌿'}
          </p>
          <button
            onClick={() => navigate('/articles')}
            style={{
              fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
              color: '#0f2311', background: GOLD,
              border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer',
            }}
          >
            {backLabel}
          </button>
        </div>
      )}

      {/* ── Article ────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* ── Hero image ─────────────────────────────────────────────── */}
          {showHero ? (
            <div style={{ position: 'relative', width: '100%', maxHeight: '480px', overflow: 'hidden' }}>
              <img
                src={heroSrc!}
                alt={title}
                onError={() => setHeroError(true)}
                style={{
                  width: '100%', height: '480px',
                  objectFit: 'cover', display: 'block',
                }}
              />
              {/* Dark gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(10,25,12,0.25) 0%, rgba(10,25,12,0.6) 60%, rgba(10,25,12,0.97) 100%)',
              }} />
              {/* Title overlaid on hero */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '28px 32px',
                maxWidth: '780px', margin: '0 auto',
              }}>
                {categoryLabel && (
                  <span style={{
                    fontFamily: ASSIST, fontSize: '12px',
                    background: 'rgba(245,200,64,0.15)', color: GOLD,
                    border: '1px solid rgba(245,200,64,0.3)',
                    borderRadius: '99px', padding: '4px 14px',
                    display: 'inline-block', marginBottom: '14px',
                  }}>
                    {categoryLabel}
                  </span>
                )}
                <h1 style={{
                  fontFamily: FRANK, fontSize: 'clamp(26px, 4vw, 40px)',
                  color: GOLD, margin: 0, lineHeight: 1.2,
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                }}>
                  {title}
                </h1>
              </div>
            </div>
          ) : (
            /* No hero — plain header */
            <div style={{
              maxWidth: '780px', margin: '0 auto',
              padding: '36px 28px 0',
            }}>
              {categoryLabel && (
                <span style={{
                  fontFamily: ASSIST, fontSize: '12px',
                  background: 'rgba(245,200,64,0.1)', color: GOLD,
                  border: '1px solid rgba(245,200,64,0.2)',
                  borderRadius: '99px', padding: '3px 12px',
                  display: 'inline-block', marginBottom: '16px',
                }}>
                  {categoryLabel}
                </span>
              )}
              <h1 style={{
                fontFamily: FRANK, fontSize: 'clamp(24px, 4vw, 36px)',
                color: GOLD, margin: '0 0 20px', lineHeight: 1.25,
              }}>
                {title}
              </h1>
            </div>
          )}

          {/* ── Meta description ─────────────────────────────────────── */}
          <div style={{ maxWidth: '780px', margin: '0 auto', padding: showHero ? '28px 28px 0' : '0 28px' }}>
            {description && (
              <p style={{
                fontFamily: ASSIST, fontSize: '17px', color: `${PARCH}80`,
                lineHeight: 1.75, margin: '0 0 28px',
                borderInlineStart: `3px solid rgba(245,200,64,0.3)`,
                paddingInlineStart: '16px',
              }}>
                {description}
              </p>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(245,200,64,0.12)', margin: '0 0 32px' }} />
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 28px' }}>
            <ReactMarkdown components={MD}>{content}</ReactMarkdown>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div style={{
            maxWidth: '780px', margin: '48px auto 0',
            padding: '28px 28px 72px',
            borderTop: '1px solid rgba(245,200,64,0.12)',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <button
              onClick={() => navigate('/articles')}
              style={{
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                color: '#0f2311', background: GOLD,
                border: 'none', borderRadius: '10px',
                padding: '12px 28px', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245,200,64,0.2)',
              }}
            >
              {backLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
