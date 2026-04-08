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

// ── Image placeholder ──────────────────────────────────────────────────────
function ImagePlaceholder({ lang }: { lang: 'he' | 'en' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '160px', margin: '1.5rem 0',
      background: 'rgba(245,200,64,0.05)',
      border: '1px dashed rgba(245,200,64,0.2)',
      borderRadius: '10px',
      fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}50`,
      gap: '8px',
    }}>
      {lang === 'he' ? '🖼️ תמונה בקרוב' : '🖼️ Image coming soon'}
    </div>
  );
}

// ── Markdown component overrides ───────────────────────────────────────────
function makeMD(lang: 'he' | 'en'): Record<string, React.ComponentType<any>> {
  return {
    h1: () => null,
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
      if (typeof children === 'string' && children.trim() === '__IMAGE_PLACEHOLDER__') {
        return <ImagePlaceholder lang={lang} />;
      }
      return (
        <p style={{ fontFamily: ASSIST, fontSize: '16px', color: `${PARCH}DD`, lineHeight: 1.85, margin: '0 0 1rem' }}>
          {children}
        </p>
      );
    },
    blockquote: ({ children }) => (
      <blockquote style={{
        borderInlineStart: `3px solid ${GOLD}`,
        margin: '1.25rem 0', padding: '14px 18px',
        background: 'rgba(245,200,64,0.06)',
        borderRadius: '8px', fontStyle: 'italic', color: GOLD,
      }}>
        {children}
      </blockquote>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: '0 0 1rem', paddingInlineStart: '1.5rem', listStyle: 'none' }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: '0 0 1rem', paddingInlineStart: '1.5rem' }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ fontFamily: ASSIST, fontSize: '16px', color: `${PARCH}DD`, lineHeight: 1.85, marginBottom: '0.4rem', position: 'relative', paddingInlineStart: '1.2rem' }}>
        <span style={{ position: 'absolute', insetInlineStart: 0, color: '#7DC084', fontWeight: 700 }}>•</span>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ color: GOLD, fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: `${PARCH}BB`, fontStyle: 'italic' }}>{children}</em>,
    code: ({ children }) => (
      <code style={{ fontFamily: 'monospace', fontSize: '13px', background: 'rgba(255,255,255,0.08)', color: `${PARCH}BB`, borderRadius: '4px', padding: '1px 6px' }}>
        {children}
      </code>
    ),
    hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(245,200,64,0.15)', margin: '2rem 0' }} />,
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ASSIST, fontSize: '14px' }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ color: GOLD, borderBottom: `1px solid rgba(245,200,64,0.3)`, padding: '8px 12px', textAlign: 'start' }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{ color: `${PARCH}CC`, borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px' }}>
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

  const content = raw
    .replace(/^#\s.+$/m, '')
    .replace(/## (כותרת SEO|SEO Title)\n.+/g, '')
    .replace(/## (תיאור מטא|Meta Description)\n.+/g, '')
    .replace(/ComfyUI Prompt:\n"[^"]*"/g, '')
    .replace(/🌍.+/g, '')
    .replace(/<!--\s*IMAGE PLACEHOLDER\s*-->/gi, '\n__IMAGE_PLACEHOLDER__\n')
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

  // The overlay div owns its own scroll (same pattern as ArticleReader)
  const scrollRef = useRef<HTMLDivElement>(null);

  const entry = ARTICLES.find(a => a.id === slug);

  useEffect(() => {
    if (!slug) { setError(true); setLoading(false); return; }

    setLoading(true);
    setError(false);
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
  const MD = makeMD(lang);

  return (
    // position:fixed + inset:0 gives this page its own scroll context and covers the
    // Navbar — same approach as ArticleReader so the layout is predictable.
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
        background: 'rgba(15,35,17,0.97)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(245,200,64,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
          <button
            onClick={() => navigate('/articles')}
            style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}80`, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}
          >
            {backLabel}
          </button>
          <button
            onClick={() => navigate('/articles')}
            style={{ background: 'none', border: 'none', color: `${PARCH}50`, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
        {/* Reading progress bar */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', background: GOLD, width: `${progress}%`, transition: 'width 0.1s linear' }} />
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
            style={{ fontFamily: FRANK, fontSize: '14px', fontWeight: 700, color: '#0f2311', background: GOLD, border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer' }}
          >
            {backLabel}
          </button>
        </div>
      )}

      {/* ── Article ────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* Header */}
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px 0' }}>
            {categoryLabel && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontFamily: ASSIST, fontSize: '12px', background: 'rgba(245,200,64,0.1)', color: GOLD, border: '1px solid rgba(245,200,64,0.2)', borderRadius: '99px', padding: '3px 12px' }}>
                  {categoryLabel}
                </span>
              </div>
            )}
            <h1 style={{ fontFamily: FRANK, fontSize: '28px', color: GOLD, margin: '0 0 20px', lineHeight: 1.25 }}>
              {title}
            </h1>
            {description && (
              <p style={{ fontFamily: ASSIST, fontSize: '15px', color: `${PARCH}80`, lineHeight: 1.7, margin: '0 0 28px', borderInlineStart: `3px solid rgba(245,200,64,0.25)`, paddingInlineStart: '14px' }}>
                {description}
              </p>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(245,200,64,0.12)', margin: '0 0 28px' }} />
          </div>

          {/* Body */}
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
            <ReactMarkdown components={MD}>{content}</ReactMarkdown>
          </div>

          {/* Footer */}
          <div style={{ maxWidth: '680px', margin: '40px auto 0', padding: '28px 24px 60px', borderTop: '1px solid rgba(245,200,64,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => navigate('/articles')}
                style={{ fontFamily: FRANK, fontSize: '14px', fontWeight: 700, color: '#0f2311', background: GOLD, border: 'none', borderRadius: '8px', padding: '10px 22px', cursor: 'pointer' }}
              >
                {backLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
