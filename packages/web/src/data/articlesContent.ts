import rawArticles from '../../../shared/data/articles.json';

type RawArticle = { id: string; htmlContent: string | null; htmlContentEn: string | null };
const data = rawArticles as RawArticle[];

export function getArticleContent(slug: string, lang: 'he' | 'en'): string | undefined {
  const article = data.find(a => a.id === slug);
  if (!article) return undefined;
  const content = lang === 'en' ? article.htmlContentEn : article.htmlContent;
  return content ?? undefined;
}
