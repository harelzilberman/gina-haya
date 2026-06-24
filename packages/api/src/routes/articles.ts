import { Router, type IRouter } from 'express';
import articlesData from '../../../shared/data/articles.json';

export const articlesRouter: IRouter = Router();

type ArticleRecord = {
  id: string;
  titleHe: string;
  titleEn: string;
  metaDescriptionHe: string;
  metaDescriptionEn: string;
  categoryHe: string;
  categoryEn: string;
  filenameHe: string;
  filenameEn: string;
  publishedAt: string;
  images: { hero: string; steps?: string; results?: string } | null;
  htmlContent: string | null;
  htmlContentEn: string | null;
  comingSoon: boolean;
};

const ARTICLES = articlesData as ArticleRecord[];

function getLang(raw: unknown): 'he' | 'en' {
  return raw === 'en' ? 'en' : 'he';
}

// GET /api/articles?lang=he  — article list (metadata only, no HTML)
articlesRouter.get('/', (req, res) => {
  const lang = getLang(req.query.lang);

  const list = ARTICLES
    .filter(a => !a.comingSoon && (lang === 'en' ? !!a.htmlContentEn : !!a.htmlContent))
    .map(a => ({
      id:          a.id,
      slug:        a.id,
      titleHe:     a.titleHe,
      titleEn:     a.titleEn,
      category:    lang === 'en' ? a.categoryEn : a.categoryHe,
      publishedAt: a.publishedAt,
    }));

  res.json(list);
});

// GET /api/articles/:slug?lang=he  — full article including HTML content
articlesRouter.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const lang = getLang(req.query.lang);

  const article = ARTICLES.find(a => a.id === slug);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const htmlContent = lang === 'en' ? article.htmlContentEn : article.htmlContent;

  res.json({
    id:                article.id,
    slug:              article.id,
    titleHe:           article.titleHe,
    titleEn:           article.titleEn,
    metaDescriptionHe: article.metaDescriptionHe,
    metaDescriptionEn: article.metaDescriptionEn,
    category:          lang === 'en' ? article.categoryEn : article.categoryHe,
    categoryHe:        article.categoryHe,
    categoryEn:        article.categoryEn,
    publishedAt:       article.publishedAt,
    images:            article.images,
    comingSoon:        article.comingSoon,
    htmlContent:       htmlContent ?? null,
  });
});
