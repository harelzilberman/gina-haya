import rawArticles from '../../../shared/data/articles.json';

export interface ArticleImages {
  hero: string;
  steps?: string;
  results?: string;
}

export interface ArticleEntry {
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
  images: ArticleImages | null;
  comingSoon: boolean;
}

export const ARTICLES: ArticleEntry[] = (rawArticles as any[]).map(a => ({
  id:               a.id,
  titleHe:          a.titleHe,
  titleEn:          a.titleEn,
  metaDescriptionHe: a.metaDescriptionHe,
  metaDescriptionEn: a.metaDescriptionEn,
  categoryHe:       a.categoryHe,
  categoryEn:       a.categoryEn,
  filenameHe:       a.filenameHe,
  filenameEn:       a.filenameEn,
  publishedAt:      a.publishedAt,
  images:           a.images ?? null,
  comingSoon:       a.comingSoon ?? false,
}));
