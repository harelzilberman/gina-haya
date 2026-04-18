import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { ARTICLES } from '../data/articles';

// ── Tokens ────────────────────────────────────────────────────────────────────
const PAGE_BG  = '#050c05';
const GOLD     = '#c8a84b';
const GOLD_DIM = 'rgba(180,150,60,0.4)';
const TITLE_C  = '#f0e4c0';
const SERIF    = 'Georgia, serif';
const SANS     = '"Assistant", "Heebo", sans-serif';

// ── Cream-theme tokens (article body) ────────────────────────────────────────
const CREAM   = '#faf5e8';
const INK     = '#2a1f0e';
const INK_M   = '#4a3520';
const INK_L   = '#7a5c3a';
const AMBER   = '#c8851a';
const PARCH   = '#f5edd8';
const DASHED  = 'rgba(122,92,58,0.3)';
const C_SERIF = "'Lora', Georgia, serif";
const C_SANS  = "'DM Sans', 'Assistant', sans-serif";

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

// ── Cream-theme helpers ───────────────────────────────────────────────────────
function extractText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return (node as unknown[]).map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in (node as object))
    return extractText((node as { props?: { children?: unknown } }).props?.children);
  return '';
}

function ChupChuBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fffdf5',
      border: '1px solid rgba(200,133,26,0.35)',
      borderRadius: '10px',
      padding: '1.1rem 1.3rem',
      margin: '1.75rem 0',
      display: 'flex', gap: '1rem',
      alignItems: 'flex-start', direction: 'rtl',
    }}>
      <img
        src="https://gina-haya.vercel.app/chupchu_final.png"
        alt="צ'ופצ'ו"
        style={{
          width: '46px', height: '46px', borderRadius: '50%',
          objectFit: 'cover' as const, objectPosition: 'center 15%',
          border: '1px solid rgba(200,133,26,0.35)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: '13px', fontWeight: 600 as const, color: AMBER, marginBottom: '4px' }}>
          {`צ'ופצ'ו אומר:`}
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: '1.05rem', lineHeight: 1.6, color: INK_M }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionBadge({ n }: { n: string }) {
  return (
    <div style={{
      width: '28px', height: '28px', borderRadius: '50%',
      background: INK, color: PARCH,
      fontFamily: C_SERIF, fontSize: '13px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {n}
    </div>
  );
}

// ── Markdown component factory (cream theme) ─────────────────────────────────
function makeMD(
  lang: 'he' | 'en',
  images: Record<string, string> | null,
): Record<string, React.ComponentType<any>> {
  const isRTL = lang === 'he';
  const state = { inSubsection: false };

  return {
    h1: () => null,

    h2: ({ children }) => {
      state.inSubsection = false;
      const text     = extractText(children);
      const numMatch = text.match(/^(\d+)\.\s*(.+)$/);
      const label    = numMatch ? numMatch[2] : text;
      const textLow  = text.toLowerCase();
      const imgMatch = SECTION_IMG_MAP.find(s => textLow.includes(s.heKw) || textLow.includes(s.enKw));
      const imgSrc   = imgMatch && images ? images[imgMatch.key] : null;
      const caption  = imgMatch ? (lang === 'he' ? imgMatch.captionHe : imgMatch.captionEn) : null;

      return (
        <div style={{ margin: '2.5rem 0 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.7rem',
            direction: isRTL ? 'rtl' : 'ltr', marginBottom: '0.5rem',
          }}>
            {numMatch && <SectionBadge n={numMatch[1]} />}
            <h2 style={{
              fontFamily: C_SERIF, fontSize: '1.25rem', fontWeight: 600,
              color: INK, lineHeight: 1.35, margin: 0,
            }}>
              {label}
            </h2>
          </div>
          <hr style={{ border: 'none', borderTop: `1px dashed ${DASHED}`, marginBottom: '1.25rem' }} />
          {imgSrc && (
            <figure style={{ margin: '0 0 1.5rem' }}>
              <img src={imgSrc} alt={caption ?? label}
                style={{ width: '100%', borderRadius: '6px', display: 'block' }} />
              {caption && (
                <figcaption style={{
                  fontFamily: C_SANS, fontSize: '12px', fontStyle: 'italic',
                  color: INK_L, textAlign: 'center', marginTop: '8px',
                }}>
                  {caption}
                </figcaption>
              )}
            </figure>
          )}
        </div>
      );
    },

    h3: ({ children }) => {
      state.inSubsection = true;
      return (
        <h3 style={{
          fontFamily: C_SERIF, fontSize: '0.875rem', fontWeight: 400,
          color: INK_L, fontStyle: 'italic',
          margin: '1.5rem 0 0.5rem', direction: isRTL ? 'rtl' : 'ltr',
        }}>
          {children}
        </h3>
      );
    },

    p: ({ children }) => {
      if (/^מצ'ופצ'ו/.test(extractText(children))) {
        return <ChupChuBox>{children}</ChupChuBox>;
      }
      return (
        <p style={{
          fontFamily: C_SANS, fontSize: '0.95rem', lineHeight: 1.85,
          color: INK_M, direction: isRTL ? 'rtl' : 'ltr',
          marginBottom: '1rem',
        }}>
          {children}
        </p>
      );
    },

    blockquote: ({ children }) => (
      <blockquote style={{
        borderInlineStart: `3px solid ${AMBER}`,
        paddingInlineStart: '1.25rem',
        margin: '1.75rem 0',
        fontFamily: C_SERIF, fontSize: '1.05rem', fontStyle: 'italic',
        color: INK_M, lineHeight: 1.75,
      }}>
        {children}
      </blockquote>
    ),

    ul: ({ children }) => (
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 1rem' }}>
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 1rem' }}>
        {children}
      </ol>
    ),

    li: ({ children, ordered, index }: any) => {
      if (ordered) {
        const num = (typeof index === 'number' ? index : 0) + 1;
        return (
          <li style={{
            display: 'flex', alignItems: 'flex-start',
            gap: '12px', marginBottom: '12px', listStyle: 'none',
          }}>
            <span style={{
              flexShrink: 0,
              width: '32px', height: '32px', borderRadius: '50%',
              background: AMBER, color: '#fff',
              fontFamily: C_SERIF, fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {num}
            </span>
            <div style={{
              fontFamily: C_SANS, fontSize: '0.9rem',
              color: INK_M, lineHeight: 1.7, paddingTop: '6px',
            }}>
              {children}
            </div>
          </li>
        );
      }
      if (state.inSubsection) {
        return (
          <div style={{
            background: PARCH,
            border: `1px solid ${DASHED}`,
            borderRadius: '7px',
            padding: '10px 14px',
            marginBottom: '6px',
            direction: isRTL ? 'rtl' : 'ltr',
            fontFamily: C_SANS, fontSize: '0.88rem',
            color: INK_M, lineHeight: 1.65,
          }}>
            {children}
          </div>
        );
      }
      return (
        <li style={{
          fontFamily: C_SANS, fontSize: '0.95rem', color: INK_M,
          lineHeight: 1.85, marginBottom: '0.4rem',
          position: 'relative', paddingInlineStart: '1.4rem', listStyle: 'none',
        }}>
          <span style={{ position: 'absolute', insetInlineStart: 0, color: AMBER, fontWeight: 700 }}>
            •
          </span>
          {children}
        </li>
      );
    },

    hr: () => (
      <hr style={{ border: 'none', borderTop: `1px dashed ${DASHED}`, margin: '2rem 0' }} />
    ),

    strong: ({ children }) => (
      <strong style={{ color: INK, fontWeight: 500 }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ color: INK_L, fontStyle: 'italic' }}>{children}</em>
    ),
    code: ({ children }) => (
      <code style={{
        fontFamily: 'monospace', fontSize: '13px',
        background: 'rgba(122,92,58,0.12)', color: INK,
        borderRadius: '3px', padding: '2px 5px',
      }}>
        {children}
      </code>
    ),

    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C_SANS, fontSize: '0.9rem' }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{
        color: INK, fontWeight: 600, borderBottom: `2px solid ${DASHED}`,
        padding: '8px 12px', textAlign: 'start',
      }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{
        color: INK_M,
        borderBottom: `1px dashed ${DASHED}`,
        padding: '8px 12px',
      }}>
        {children}
      </td>
    ),
  };
}

// ── Markdown parser ───────────────────────────────────────────────────────────
function parseMarkdown(raw: string, lang: 'he' | 'en') {
  // Title: standard # heading, or plain first non-metadata line
  const headingMatch = raw.match(/^#\s+(.+)$/m);
  let title = headingMatch ? headingMatch[1].trim() : '';
  if (!title) {
    const plainMatch = raw.match(/^(?![#\s])(?!כותרת|תיאור|SEO|Meta)(.+)$/m);
    if (plainMatch) title = plainMatch[1].trim();
  }

  // Description: ## heading format or inline colon format
  const descHMatch = raw.match(lang === 'he' ? /## תיאור מטא\n(.+)/ : /## Meta Description\n(.+)/);
  const descCMatch = raw.match(lang === 'he' ? /^תיאור מטא:\s*(.+)$/m : /^Meta Description:\s*(.+)$/m);
  const description = (descHMatch ?? descCMatch)?.[1]?.trim() ?? '';

  // Strip internal production sections (everything from matched heading to EOF)
  const internalHeadings = [
    /^##\s+פרומפטים ל-ComfyUI/m,
    /^##\s+SUGGESTED VISUAL ASSETS/im,
    /^##\s+הצעות לנכסים חזותיים/m,
  ];
  let stripped = raw;
  for (const p of internalHeadings) {
    const m = stripped.search(p);
    if (m !== -1) stripped = stripped.slice(0, m);
  }

  let content = stripped
    .replace(/^#\s.+$/m, '')
    .replace(/## (כותרת SEO|SEO Title)\n.+/g, '')
    .replace(/## (תיאור מטא|Meta Description)\n.+/g, '')
    .replace(/^כותרת SEO:.*$/mg, '')
    .replace(/^תיאור מטא:.*$/mg, '')
    .replace(/^SEO Title:.*$/mg, '')
    .replace(/^Meta Description:.*$/mg, '')
    .replace(/ComfyUI Prompt:\n"[^"]*"/g, '')
    .replace(/🌍.+/g, '');

  // For plain-title format (no # heading): strip preamble before first ## section
  if (!headingMatch) {
    content = content.replace(/^[^]*?(?=^## )/m, '');
  }

  return { title, description, content: content.trim() };
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

  useEffect(() => {
    const id = 'cream-article-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Caveat:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap';
      document.head.appendChild(link);
    }
  }, []);

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

    // If article has embedded HTML, skip markdown fetch
    if (entry?.htmlContent) {
      setLoading(false);
      return;
    }

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

  // Created fresh each render so state.inSubsection resets correctly
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
      {!loading && !error && entry?.htmlContent && (
        <iframe
          srcDoc={entry.htmlContent}
          style={{ width: '100%', border: 'none', minHeight: '100vh' }}
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            if (iframe.contentWindow) {
              iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
            }
          }}
          title={entry.titleHe}
        />
      )}

      {!loading && !error && !entry?.htmlContent && (
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

          {/* Article body — cream theme */}
          <div style={{ background: CREAM }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', padding: '44px 24px 56px' }}>
              {/* Meta description as styled intro */}
              {description && (
                <p style={{
                  fontFamily: C_SERIF, fontSize: '1.05rem', fontStyle: 'italic',
                  color: INK_M, lineHeight: 1.85, margin: '0 0 2rem',
                  borderInlineStart: `3px solid ${AMBER}`,
                  paddingInlineStart: '1.25rem',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}>
                  {description}
                </p>
              )}

              {/* Section-split rendering */}
              {sections.map((sec, i) => {
                const headingText = sec.heading?.replace(/^## /, '') ?? '';
                if (sec.heading && /מדריך חזותי|visual.?guide|הצעות לנכסים/i.test(headingText)) return null;
                const isBio     = sec.heading !== null && BIO_RE.test(headingText);
                const sectionMd = sec.heading ? `${sec.heading}\n${sec.body}` : sec.body;

                return isBio ? (
                  <div key={i} style={{
                    background: 'rgba(200,133,26,0.06)',
                    border: '1px solid rgba(200,133,26,0.2)',
                    borderRadius: '8px',
                    padding: '20px 24px',
                    margin: '0 0 0.5rem',
                  }}>
                    <ReactMarkdown components={MD}>{sectionMd}</ReactMarkdown>
                  </div>
                ) : (
                  <ReactMarkdown key={i} components={MD}>{sectionMd}</ReactMarkdown>
                );
              })}
            </div>
          </div>

          {/* Footer back nav */}
          <div style={{
            background: PARCH,
            borderTop: `1px dashed ${DASHED}`,
            textAlign: 'center',
            padding: '24px 24px 64px',
          }}>
            <button
              onClick={() => navigate('/articles')}
              style={{
                fontFamily: C_SERIF, fontSize: '14px',
                color: INK_L, background: 'none', border: 'none',
                cursor: 'pointer', letterSpacing: '0.03em',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = AMBER; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = INK_L; }}
            >
              {backLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
