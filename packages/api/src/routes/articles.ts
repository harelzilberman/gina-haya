import { Router, type IRouter } from 'express';
import { ARTICLES } from '../../../web/src/data/articles';

export const articlesRouter: IRouter = Router();

function getLang(raw: unknown): 'he' | 'en' {
  return raw === 'en' ? 'en' : 'he';
}

// GET /api/articles?lang=he  — article list (metadata only, no HTML)
articlesRouter.get('/', (req, res) => {
  const lang = getLang(req.query.lang);

  const list = ARTICLES
    .filter(a => lang === 'en' ? !!a.htmlContentEn : !!a.htmlContent)
    .map(a => ({
      id:          a.id,
      slug:        a.id,
      titleHe:     a.titleHe,
      titleEn:     a.titleEn,
      category:    lang === 'en' ? a.categoryEn : a.categoryHe,
      publishedAt: a.publishedAt,
      webSlug:     a.id,
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
    id:                  article.id,
    slug:                article.id,
    titleHe:             article.titleHe,
    titleEn:             article.titleEn,
    metaDescriptionHe:   article.metaDescriptionHe,
    metaDescriptionEn:   article.metaDescriptionEn,
    category:            lang === 'en' ? article.categoryEn : article.categoryHe,
    categoryHe:          article.categoryHe,
    categoryEn:          article.categoryEn,
    publishedAt:         article.publishedAt,
    images:              article.images,
    webSlug:             article.id,
    htmlContent:         htmlContent ?? null,
  });
});
