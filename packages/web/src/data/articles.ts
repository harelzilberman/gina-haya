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
}

export const ARTICLES: ArticleEntry[] = [
  {
    id: 'compost-tea',
    titleHe: 'תה קומפוסט — המדריך המלא',
    titleEn: 'Compost Tea — The Complete Guide',
    metaDescriptionHe: 'למדו להכין תה קומפוסט ביתי שמפעיל את חיי הקרקע, מחזק צמחים ומשנה את הגינה — שלב אחר שלב.',
    metaDescriptionEn: 'Learn how to brew and apply compost tea to activate soil microbes, boost plant health, and transform your biodynamic garden — step by step.',
    categoryHe: 'דשנים טבעיים',
    categoryEn: 'Natural Fertilizers',
    filenameHe: 'compost-tea.md',
    filenameEn: 'compost-tea.md',
    publishedAt: '2026-04-08',
  },
];
