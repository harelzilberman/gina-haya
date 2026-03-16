export type SubscriptionTier = 'free' | 'grower' | 'gardener_pro' | 'professional';
export interface User {
    id: string;
    email: string;
    displayName: string;
    languagePreference: 'he' | 'en';
    subscriptionTier: SubscriptionTier;
    createdAt: string;
}
export interface UserPreferences {
    language: 'he' | 'en';
    emailNotifications: boolean;
    dailyTipEmail: boolean;
}
//# sourceMappingURL=user.d.ts.map