import { Router, type IRouter } from 'express';

export const articlesRouter: IRouter = Router();

const BASE = 'https://raw.githubusercontent.com/harelzilberman/gina-haya/main/packages/web/public/articles';

const SLUG_CATEGORY: Record<string, string> = {
  'calendar':                    'bd-preps',
  'compost':                     'compost',
  'pest-management':             'pest-control',
  'soil-preparation':            'techniques',
  'trees':                       'techniques',
  '23_סימני_סטרס_בצמחים':       'Techniques',
  '21_השקיה_עציצים':            'Irrigation',
  'חיפוי_קרקע':                 'Irrigation',
  '01_תה_קומפוסט':              'Natural Fertilizers',
};

const WEB_SLUG: Record<string, string> = {
  '01_תה_קומפוסט':           'compost-tea',
  '02_ריסוס_אצות_ים':        'seaweed-spray',
  '03_דשן_ירוק':             'green-manure',
  '04_שמן_נים':              'neem-oil',
  '21_השקיה_עציצים':         'watering-pots',
  '23_סימני_סטרס_בצמחים':   'plant-stress-signs',
  'חיפוי_קרקע':             'ground-mulching',
};

function getLangDir(raw: unknown): 'he' | 'en' {
  return raw === 'en' ? 'en' : 'he';
}

function parseArticle(content: string, slug: string, lang: 'he' | 'en') {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  const descMatch = content.match(/## תיאור מטא\n(.+)/);
  const description = descMatch ? descMatch[1].trim() : '';

  const cleanContent = content
    .replace(/^#\s.+$/m, '')
    .replace(/## כותרת SEO\n.+/g, '')
    .replace(/## תיאור מטא\n.+/g, '')
    .replace(/ComfyUI Prompt:\n"[^"]*"/g, '')
    .replace(/🌍 לקריאה.+/g, '')
    .replace(/🌍 Read.+/g, '')
    .trim();

  const wordCount = content.split(/\s+/).length;
  const readTimeMinutes = Math.ceil(wordCount / (lang === 'he' ? 200 : 250));

  return { title, description, cleanContent, readTimeMinutes };
}

async function fetchArticle(lang: 'he' | 'en', filename: string): Promise<string> {
  const url = `${BASE}/${lang}/${filename}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status} ${url}`);
  return res.text();
}

// GET /api/articles?lang=he  — list article metadata from GitHub directory listing
articlesRouter.get('/', async (req, res) => {
  try {
    const lang = getLangDir(req.query.lang);
    // Use GitHub API to list files in the directory
    const apiUrl = `https://api.github.com/repos/harelzilberman/gina-haya/contents/packages/web/public/articles/${lang}`;
    const ghHeaders: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) ghHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    const apiRes = await fetch(apiUrl, { headers: ghHeaders });
    if (!apiRes.ok) return res.json([]);

    const files: { name: string }[] = await apiRes.json();
    const mdFiles = files.filter(f => f.name.endsWith('.md'));

    const metas = await Promise.all(
      mdFiles.map(async f => {
        const slug = f.name.replace(/\.md$/, '');
        try {
          const raw = await fetchArticle(lang, f.name);
          const { title, description, readTimeMinutes } = parseArticle(raw, slug, lang);
          return { slug, title, description, readTimeMinutes, category: SLUG_CATEGORY[slug] ?? null, webSlug: WEB_SLUG[slug] ?? null };
        } catch {
          return null;
        }
      })
    );

    res.json(metas.filter(Boolean));
  } catch (err: any) {
    console.error('[GET /api/articles]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:slug?lang=he  — full article from GitHub raw
articlesRouter.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!/^[a-z0-9_\u0590-\u05FF-]+$/i.test(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const lang = getLangDir(req.query.lang);

    let raw: string;
    try {
      raw = await fetchArticle(lang, `${slug}.md`);
    } catch {
      return res.status(404).json({ error: 'Article not found' });
    }

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
