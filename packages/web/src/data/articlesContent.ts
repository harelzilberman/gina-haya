import { ARTICLES } from './articles';

const CONTENT: Record<string, string> = {};
for (const a of ARTICLES) {
  if (a.htmlContent) CONTENT[a.id] = a.htmlContent;
}

export function getArticleContent(slug: string): string | undefined {
  return CONTENT[slug];
}
