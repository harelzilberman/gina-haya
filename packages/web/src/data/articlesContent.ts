import { ARTICLES } from './articles';

const CONTENT_HE: Record<string, string> = {};
const CONTENT_EN: Record<string, string> = {};

for (const a of ARTICLES) {
  if (a.htmlContent)   CONTENT_HE[a.id] = a.htmlContent;
  if (a.htmlContentEn) CONTENT_EN[a.id] = a.htmlContentEn;
}

export function getArticleContent(slug: string, lang: 'he' | 'en'): string | undefined {
  if (lang === 'en') return CONTENT_EN[slug];
  return CONTENT_HE[slug];
}
