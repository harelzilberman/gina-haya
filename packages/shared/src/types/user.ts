// 'grower' was a retired legacy tier; confirmed zero DB rows as of 2026-07, dropped from the type.
export type SubscriptionTier = 'free' | 'gardener_pro' | 'advanced' | 'professional';

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
