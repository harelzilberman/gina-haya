import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { ARTICLES } from '../data/articles';

// ── Tokens ────────────────────────────────────────────────────────────────────
const PAGE_BG  = '#050c05';
const GOLD     = '#c8a84b';
const GOLD_DIM = 'rgba(180,150,60,0.4)';
const TITLE_C  = '#f0e4c0';
const LEAD_C   = '#d4c9a8';
const BODY_C   = '#c0b48e';
const HEAD_C   = '#d4a843';
const SERIF    = 'Georgia, serif';
const SANS     = '"Assistant", "Heebo", sans-serif';

// ── Reading time ──────────────────────────────────────────────────────────────
function readingTime(text: string, lang: 'he' | 'en'): string {
  const words = text.trim().split(/\s+/).length;
  const mins  = Math.max(1, Math.ceil(words / 200));
  return lang === 'he' ? `${mins} דקות קריאה` : `${mins} min read`;
}

// ── Section splitter (biodynamic box detection) ───────────────────────────────
function splitSections(content: string) {
  const parts = content.split(/^(## .+)$/m);
  const out: Array<{ heading: string | null; body: string }> = [];
  if (parts[0].trim()) out.push({ heading: null, body: parts[0] });
  for (let i = 1; i < parts.length; i += 2) {
    out.push({ heading: parts[i], body: parts[i + 1] ?? '' });
  }
  return out;
}

// ── Section image map ─────────────────────────────────────────────────────────
const SECTION_IMG_MAP = [
  { heKw: 'שלב-אחר-שלב', enKw: 'step-by-step', key: 'steps'   as const, captionHe: 'שלבי ההכנה',          captionEn: 'Preparation steps'          },
  { heKw: 'תוצאות',      enKw: 'result',        key: 'results' as const, captionHe: 'תוצאות בגינה',         captionEn: 'Results in the garden'       },
];

// ── Ornamental divider ────────────────────────────────────────────────────────
function OrnamentalHr() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '2.8rem 0', color: GOLD_DIM }}>
      <div style={{ flex: 1, height: '1px', background: GOLD_DIM }} />
      <span style={{ fontSize: '14px', color: GOLD_DIM, flexShrink: 0 }}>✦</span>
      <div style={{ flex: 1, height: '1px', background: GOLD_DIM }} />
    </div>
  );
}

// ── Markdown component factory ────────────────────────────────────────────────
function makeMD(
  lang: 'he' | 'en',
  images: Record<string, string> | null,
): Record<string, React.ComponentType<any>> {
  const isRTL = lang === 'he';
  // Mutable state shared across all component calls within one render pass
  const state = { firstP: true };

  return {
    h1: () => null,

    h2: ({ children }) => {
      const text    = typeof children === 'string' ? children : String(children ?? '');
      const textLow = text.toLowerCase();
      const match   = SECTION_IMG_MAP.find(s => textLow.includes(s.heKw) || textLow.includes(s.enKw));
      const imgSrc  = match && images ? images[match.key] : null;
      const caption = match ? (lang === 'he' ? match.captionHe : match.captionEn) : null;

      return (
        <>
          <h2 style={{
            fontFamily: SERIF, fontSize: '26px', fontWeight: 400,
            color: HEAD_C, margin: '2.8rem 0 0.9rem', lineHeight: 1.35,
          }}>
            {children}
          </h2>
          {imgSrc && (
            <figure style={{ margin: '1rem 0 1.8rem' }}>
              <img
                src={imgSrc}
                alt={caption ?? text}
                style={{ width: '100%', borderRadius: '4px', display: 'block' }}
              />
              {caption && (
                <figcaption style={{
                  fontFamily: SERIF, fontSize: '13px', fontStyle: 'italic',
                  color: 'rgba(180,160,110,0.6)', textAlign: 'center', marginTop: '10px',
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
        fontFamily: SERIF, fontSize: '20px', fontWeight: 400,
        color: LEAD_C, margin: '2.2rem 0 0.6rem', lineHeight: 1.35,
      }}>
        {children}
      </h3>
    ),

    p: ({ children }) => {
      const isFirst = state.firstP;
      if (isFirst) state.firstP = false;

      if (isFirst) {
        // Lead paragraph + drop cap on first letter
        const kids     = Array.isArray(children) ? children : [children];
        const firstKid = kids[0];
        if (typeof firstKid === 'string' && firstKid.length > 0) {
          return (
            <p style={{
              fontFamily: SERIF, fontSize: '20px', fontStyle: 'italic',
              color: LEAD_C, lineHeight: 1.9, margin: '0 0 1.6rem', overflow: 'hidden',
            }}>
              <span style={{
                float: isRTL ? 'right' : 'left',
                fontSize: '72px', lineHeight: '0.82',
                color: GOLD,
                fontFamily: SERIF, fontWeight: 400, fontStyle: 'normal',
                marginInlineStart: '10px',
                marginBottom: '4px', paddingTop: '2px',
              }}>
                {firstKid[0]}
              </span>
              {firstKid.slice(1)}
              {kids.slice(1)}
            </p>
          );
        }
        // Fallback: lead without drop cap
        return (
          <p style={{
            fontFamily: SERIF, fontSize: '20px', fontStyle: 'italic',
            color: LEAD_C, lineHeight: 1.9, margin: '0 0 1.6rem',
          }}>
            {children}
          </p>
        );
      }

      return (
        <p style={{
          fontFamily: SERIF, fontSize: '17px', color: BODY_C,
          lineHeight: 1.9, margin: '0 0 1.3rem',
        }}>
          {children}
        </p>
      );
    },

    blockquote: ({ children }) => (
      <blockquote style={{
        borderInlineStart: `3px solid ${GOLD}`,
        paddingInlineStart: '24px',
        margin: '2rem 0',
        fontFamily: SERIF, fontSize: '22px', fontStyle: 'italic',
        color: LEAD_C, lineHeight: 1.55,
      }}>
        {children}
      </blockquote>
    ),

    ul: ({ children }) => (
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.3rem' }}>
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 1.3rem' }}>
        {children}
      </ol>
    ),

    li: ({ children, ordered, index }: any) => {
      if (ordered) {
        const num = (typeof index === 'number' ? index : 0) + 1;
        return (
          <li style={{
            display: 'flex', alignItems: 'flex-start',
            gap: '16px', marginBottom: '18px', listStyle: 'none',
          }}>
            <span style={{
              flexShrink: 0,
              width: '36px', height: '36px', borderRadius: '50%',
              border: '1px solid rgba(180,150,60,0.5)',
              color: GOLD, fontFamily: SERIF, fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {num}
            </span>
            <div style={{
              fontFamily: SERIF, fontSize: '16px',
              color: '#b8ac88', lineHeight: 1.75, paddingTop: '7px',
            }}>
              {children}
            </div>
          </li>
        );
      }
      return (
        <li style={{
          fontFamily: SERIF, fontSize: '17px', color: BODY_C,
          lineHeight: 1.85, marginBottom: '0.5rem',
          position: 'relative', paddingInlineStart: '1.4rem', listStyle: 'none',
        }}>
          <span style={{
            position: 'absolute', insetInlineStart: 0,
            color: GOLD, fontWeight: 700,
          }}>
            •
          </span>
          {children}
        </li>
      );
    },

    hr: () => <OrnamentalHr />,

    strong: ({ children }) => (
      <strong style={{ color: GOLD, fontWeight: 700 }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ color: LEAD_C, fontStyle: 'italic' }}>{children}</em>
    ),
    code: ({ children }) => (
      <code style={{
        fontFamily: 'monospace', fontSize: '14px',
        background: 'rgba(255,255,255,0.06)', color: LEAD_C,
        borderRadius: '3px', padding: '2px 6px',
      }}>
        {children}
      </code>
    ),

    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SERIF, fontSize: '15px' }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{
        color: GOLD, borderBottom: `1px solid ${GOLD_DIM}`,
        padding: '10px 14px', textAlign: 'start',
      }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{
        color: BODY_C,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '10px 14px',
      }}>
        {children}
      </td>
    ),
  };
}

// ── Markdown parser ───────────────────────────────────────────────────────────
function parseMarkdown(raw: string, lang: 'he' | 'en') {
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const descMatch = raw.match(
    lang === 'he' ? /## תיאור מטא\n(.+)/ : /## Meta Description\n(.+)/
  );
  const description = descMatch ? descMatch[1].trim() : '';

  // Strip internal production sections
  const internalHeadings = [
    /^##\s+פרומפטים ל-ComfyUI/m,
    /^##\s+SUGGESTED VISUAL ASSETS/im,
  ];
  let stripped = raw;
  for (const p of internalHeadings) {
    const m = stripped.search(p);
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

const BIO_RE = /ביודינמי|biodynamic/i;

// ── Component ─────────────────────────────────────────────────────────────────
export function ArticlePage() {
  const { slug }  = useParams<{ slug: string }>();
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
  const entry     = ARTICLES.find(a => a.id === slug);
  const heroSrc   = entry?.images?.hero ?? null;
  const imageMap  = entry?.images
    ? (Object.fromEntries(
        Object.entries(entry.images).filter(([, v]) => Boolean(v))
      ) as Record<string, string>)
    : null;

  useEffect(() => {
    if (!slug) { setError(true); setLoading(false); return; }
    setLoading(true); setError(false); setHeroError(false); setProgress(0);

    const filename = lang === 'en'
      ? (entry?.filenameEn ?? `${slug}.md`)
      : (entry?.filenameHe ?? `${slug}.md`);

    fetch(`/articles/${lang}/${filename}`)
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(raw => {
        const p = parseMarkdown(raw, lang);
        setTitle(p.title || (lang === 'he' ? entry?.titleHe : entry?.titleEn) || slug!);
        setDescription(
          p.description ||
          (lang === 'he' ? entry?.metaDescriptionHe : entry?.metaDescriptionEn) ||
          ''
        );
        setContent(p.content);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, lang]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setProgress(Math.min(100, Math.max(0, el.scrollTop / (el.scrollHeight - el.clientHeight) * 100)));
  }, []);

  const categoryLabel = entry ? (lang === 'he' ? entry.categoryHe : entry.categoryEn) : null;
  const backLabel     = lang === 'he' ? '← חזור למאמרים' : '← Back to Articles';
  const showHero      = heroSrc && !heroError;
  const readTime      = content ? readingTime(content, lang) : '';

  // Created fresh each render so state.firstP resets correctly
  const MD       = makeMD(lang, imageMap);
  const sections = content ? splitSections(content) : [];

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: PAGE_BG, overflowY: 'auto', fontFamily: SERIF,
      }}
    >
      {/* ── Sticky header + progress ────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(5,12,5,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(180,150,60,0.12)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: isRTL ? 'flex-start' : 'flex-end',
          padding: '11px 24px',
        }}>
          <button
            onClick={() => navigate('/articles')}
            style={{
              fontFamily: SERIF, fontSize: '13px',
              color: `${GOLD}88`, background: 'none', border: 'none',
              cursor: 'pointer', letterSpacing: '0.02em',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${GOLD}88`; }}
          >
            {backLabel}
          </button>
        </div>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{
            height: '100%', background: GOLD,
            width: `${progress}%`, transition: 'width 0.1s linear',
          }} />
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <p style={{ fontFamily: SERIF, fontSize: '18px', color: GOLD, margin: 0 }}>
            {lang === 'he' ? 'טוען מאמר...' : 'Loading article...'}
          </p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
          <p style={{ fontFamily: SERIF, fontSize: '20px', color: GOLD, margin: '0 0 8px' }}>
            {lang === 'he' ? 'המאמר עדיין בהכנה — בקרוב!' : 'Article coming soon!'}
          </p>
          <p style={{ fontFamily: SANS, fontSize: '14px', color: `${GOLD}55`, margin: '0 0 24px' }}>
            {lang === 'he' ? "צ'ופצ'ו עובד על זה 🌿" : 'Chupchu is working on it 🌿'}
          </p>
          <button
            onClick={() => navigate('/articles')}
            style={{
              fontFamily: SERIF, fontSize: '14px', color: PAGE_BG,
              background: GOLD, border: 'none', borderRadius: '6px',
              padding: '10px 24px', cursor: 'pointer',
            }}
          >
            {backLabel}
          </button>
        </div>
      )}

      {/* ── Article ───────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* Hero image */}
          {showHero ? (
            <div style={{ position: 'relative', height: '420px', overflow: 'hidden' }}>
              <img
                src={heroSrc!}
                alt={title}
                onError={() => setHeroError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Dark gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(5,12,5,0.1) 0%, rgba(5,12,5,0.55) 50%, rgba(5,12,5,0.97) 100%)',
              }} />
              {/* Category badge top corner */}
              {categoryLabel && (
                <div style={{
                  position: 'absolute', top: '20px',
                  ...(isRTL ? { right: '24px' } : { left: '24px' }),
                }}>
                  <span style={{
                    fontFamily: SANS, fontSize: '11px',
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                    color: GOLD, border: `1px solid ${GOLD}66`,
                    borderRadius: '99px', padding: '4px 14px',
                    background: 'rgba(5,12,5,0.7)',
                  }}>
                    {categoryLabel}
                  </span>
                </div>
              )}
              {/* Title + meta at bottom */}
              <div style={{
                position: 'absolute', bottom: '28px',
                ...(isRTL ? { right: '28px', left: '20px' } : { left: '28px', right: '20px' }),
              }}>
                <h1 style={{
                  fontFamily: SERIF, fontSize: 'clamp(28px, 4vw, 42px)',
                  fontWeight: 400, color: TITLE_C,
                  margin: '0 0 12px', lineHeight: 1.2,
                  textShadow: '0 2px 16px rgba(0,0,0,0.7)',
                }}>
                  {title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {categoryLabel && (
                    <span style={{
                      fontFamily: SANS, fontSize: '12px',
                      color: `${GOLD}AA`, letterSpacing: '0.05em',
                    }}>
                      {categoryLabel}
                    </span>
                  )}
                  {readTime && (
                    <span style={{ fontFamily: SANS, fontSize: '12px', color: `${TITLE_C}55` }}>
                      ⏱ {readTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Plain header — no hero image */
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '44px 24px 0' }}>
              {categoryLabel && (
                <span style={{
                  fontFamily: SANS, fontSize: '11px',
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  color: GOLD, border: `1px solid ${GOLD}55`,
                  borderRadius: '99px', padding: '4px 14px',
                  display: 'inline-block', marginBottom: '18px',
                }}>
                  {categoryLabel}
                </span>
              )}
              <h1 style={{
                fontFamily: SERIF, fontSize: 'clamp(26px, 4vw, 42px)',
                fontWeight: 400, color: TITLE_C,
                margin: '0 0 14px', lineHeight: 1.2,
              }}>
                {title}
              </h1>
              {readTime && (
                <span style={{ fontFamily: SANS, fontSize: '12px', color: `${TITLE_C}50` }}>
                  ⏱ {readTime}
                </span>
              )}
            </div>
          )}

          {/* Article body */}
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 24px 0' }}>
            {/* Meta description as styled intro */}
            {description && (
              <p style={{
                fontFamily: SERIF, fontSize: '17px', fontStyle: 'italic',
                color: `${LEAD_C}AA`,
                lineHeight: 1.75, margin: '0 0 40px',
                borderInlineStart: `3px solid ${GOLD_DIM}`,
                paddingInlineStart: '18px',
              }}>
                {description}
              </p>
            )}

            {/* Section-split rendering with biodynamic box wrapping */}
            {sections.map((sec, i) => {
              const headingText = sec.heading?.replace(/^## /, '') ?? '';
              const isBio       = sec.heading !== null && BIO_RE.test(headingText);
              const sectionMd   = sec.heading ? `${sec.heading}\n${sec.body}` : sec.body;

              return isBio ? (
                <div
                  key={i}
                  style={{
                    background: 'rgba(180,150,60,0.06)',
                    border: '1px solid rgba(180,150,60,0.2)',
                    borderRadius: '6px',
                    padding: '24px',
                    margin: '0 0 0.5rem',
                  }}
                >
                  <ReactMarkdown components={MD}>{sectionMd}</ReactMarkdown>
                </div>
              ) : (
                <ReactMarkdown key={i} components={MD}>{sectionMd}</ReactMarkdown>
              );
            })}
          </div>

          {/* Footer back nav */}
          <div style={{
            maxWidth: '720px', margin: '56px auto 0',
            padding: '24px 24px 80px',
            borderTop: `1px solid ${GOLD_DIM}`,
            textAlign: 'center',
          }}>
            <button
              onClick={() => navigate('/articles')}
              style={{
                fontFamily: SERIF, fontSize: '14px',
                color: `${GOLD}88`, background: 'none', border: 'none',
                cursor: 'pointer', letterSpacing: '0.03em',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `${GOLD}88`; }}
            >
              {backLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
