import { Router, type IRouter } from 'express';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Article, ArticleMeta } from '@gina-haya/shared';

export const articlesRouter: IRouter = Router();

// Articles folder: packages/web/public/articles/
// __dirname = packages/api/src/routes/ → ../../../web/public/articles
// Override with ARTICLES_DIR env var for production deployments.
const ARTICLES_DIR: string =
  process.env.ARTICLES_DIR ||
  path.resolve(__dirname, '../../../web/public/articles');

function safeReadMetas(): ArticleMeta[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  const metas: ArticleMeta[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
      const { data } = matter(raw);
      if (data.slug) metas.push(data as ArticleMeta);
    } catch {
      // skip malformed files
    }
  }

  return metas.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// GET /api/articles — list all article metadata (no content)
articlesRouter.get('/', (_req, res) => {
  try {
    res.json(safeReadMetas());
  } catch (err: any) {
    console.error('[GET /api/articles]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:slug — full article including markdown content
articlesRouter.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    // Sanitise: only allow alphanumeric, hyphens, underscores
    if (!/^[a-z0-9_-]+$/i.test(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const article: Article = { ...(data as ArticleMeta), content };
    res.json(article);
  } catch (err: any) {
    console.error('[GET /api/articles/:slug]', err);
    res.status(500).json({ error: err.message });
  }
});
