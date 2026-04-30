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
    content: string;
    htmlContent?: string;
}
export declare const ARTICLE_CATEGORIES: readonly [{
    readonly id: "fertilizers";
    readonly labelHe: "דשנים טבעיים";
    readonly labelEn: "Fertilizers";
    readonly emoji: "🌱";
}, {
    readonly id: "pest-control";
    readonly labelHe: "הדברה";
    readonly labelEn: "Pest Control";
    readonly emoji: "🐛";
}, {
    readonly id: "compost";
    readonly labelHe: "קומפוסט";
    readonly labelEn: "Compost";
    readonly emoji: "♻️";
}, {
    readonly id: "bd-preps";
    readonly labelHe: "פרפרטים BD";
    readonly labelEn: "BD Preps";
    readonly emoji: "🌙";
}, {
    readonly id: "companion";
    readonly labelHe: "שיתופי פעולה";
    readonly labelEn: "Companion Planting";
    readonly emoji: "🤝";
}, {
    readonly id: "techniques";
    readonly labelHe: "טכניקות גינון";
    readonly labelEn: "Techniques";
    readonly emoji: "🔧";
}];
//# sourceMappingURL=article.d.ts.map