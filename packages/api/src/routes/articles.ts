import { Router, type IRouter } from 'express';
import fs from 'fs';
import path from 'path';

export const articlesRouter: IRouter = Router();

// Articles folder: packages/web/public/articles/{lang}/
// __dirname = packages/api/src/routes/ → ../../../web/public/articles
const ARTICLES_DIR: string =
  process.env.ARTICLES_DIR ||
  path.resolve(__dirname, '../../../web/public/articles');

const SLUG_CATEGORY: Record<string, string> = {
  'calendar':         'bd-preps',
  'compost':          'compost',
  'pest-management':  'pest-control',
  'soil-preparation': 'techniques',
  'trees':            'techniques',
};

function getLangDir(raw: unknown): 'he' | 'en' {
  return raw === 'en' ? 'en' : 'he';
}

function parseArticle(content: string, slug: string, lang: 'he' | 'en') {
  // Extract title from first # heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  // Extract description from ## תיאור מטא section
  const descMatch = content.match(/## תיאור מטא\n(.+)/);
  const description = descMatch ? descMatch[1].trim() : '';

  // Clean content: strip metadata sections and noise
  const cleanContent = content
    .replace(/^#\s.+$/m, '')                  // remove h1 (shown in reader header)
    .replace(/## כותרת SEO\n.+/g, '')
    .replace(/## תיאור מטא\n.+/g, '')
    .replace(/ComfyUI Prompt:\n"[^"]*"/g, '')
    .replace(/🌍 לקריאה.+/g, '')
    .replace(/🌍 Read.+/g, '')
    .trim();

  // Estimate read time (avg 200 words/min Hebrew, 250 English)
  const wordCount = content.split(/\s+/).length;
  const readTimeMinutes = Math.ceil(wordCount / (lang === 'he' ? 200 : 250));

  return { title, description, cleanContent, readTimeMinutes };
}

// GET /api/articles?lang=he  — list all article metadata (no content)
articlesRouter.get('/', (req, res) => {
  try {
    const lang = getLangDir(req.query.lang);
    const dir = path.join(ARTICLES_DIR, lang);
    if (!fs.existsSync(dir)) return res.json([]);

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const metas = files.map(file => {
      const slug = file.replace(/\.md$/, '');
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const { title, description, readTimeMinutes } = parseArticle(raw, slug, lang);
        return { slug, title, description, readTimeMinutes, category: SLUG_CATEGORY[slug] ?? null };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json(metas);
  } catch (err: any) {
    console.error('[GET /api/articles]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:slug?lang=he  — full article including markdown content
articlesRouter.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    // Sanitise: only allow alphanumeric, hyphens, underscores
    if (!/^[a-z0-9_-]+$/i.test(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const lang = getLangDir(req.query.lang);
    const filePath = path.join(ARTICLES_DIR, lang, `${slug}.md`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const { title, description, cleanContent, readTimeMinutes } = parseArticle(raw, slug, lang);

    res.json({
      slug,
      title,
      description,
      content: cleanContent,
      readTimeMinutes,
      category: SLUG_CATEGORY[slug] ?? null,
    });
  } catch (err: any) {
    console.error('[GET /api/articles/:slug]', err);
    res.status(500).json({ error: err.message });
  }
});
