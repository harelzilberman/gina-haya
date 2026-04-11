export interface ArticleMeta {
  slug: string;
  category: string;
  titleHe: string;
  titleEn: string;
  descriptionHe?: string;
  readTimeMinutes: number;
  heroImage?: string;
  author: string;
  publishedAt: string;
}

export interface Article extends ArticleMeta {
  content: string; // raw markdown (body only, no frontmatter)
  htmlContent?: string;
}

export const ARTICLE_CATEGORIES = [
  { id: 'fertilizers',  labelHe: 'דשנים טבעיים',   labelEn: 'Fertilizers',        emoji: '🌱' },
  { id: 'pest-control', labelHe: 'הדברה',           labelEn: 'Pest Control',       emoji: '🐛' },
  { id: 'compost',      labelHe: 'קומפוסט',         labelEn: 'Compost',            emoji: '♻️' },
  { id: 'bd-preps',     labelHe: 'פרפרטים BD',      labelEn: 'BD Preps',           emoji: '🌙' },
  { id: 'companion',    labelHe: 'שיתופי פעולה',    labelEn: 'Companion Planting', emoji: '🤝' },
  { id: 'techniques',   labelHe: 'טכניקות גינון',   labelEn: 'Techniques',         emoji: '🔧' },
] as const;
