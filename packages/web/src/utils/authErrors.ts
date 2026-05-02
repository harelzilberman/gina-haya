const AUTH_ERROR_MAP: Record<string, { he: string; en: string }> = {
  'Invalid login credentials': {
    he: 'כתובת המייל או הסיסמה שגויים',
    en: 'Incorrect email or password',
  },
  'User already registered': {
    he: 'כתובת המייל כבר רשומה במערכת',
    en: 'This email is already registered',
  },
  'Email not confirmed': {
    he: 'יש לאמת את כתובת המייל לפני ההתחברות',
    en: 'Please confirm your email before signing in',
  },
  'Password should be at least 8 characters': {
    he: 'הסיסמה חייבת להכיל לפחות 8 תווים',
    en: 'Password must be at least 8 characters',
  },
  'signup_disabled': {
    he: 'ההרשמה אינה זמינה כרגע',
    en: 'Sign up is currently unavailable',
  },
};

export function mapAuthError(error: string | Error, lang: 'he' | 'en' = 'he'): string {
  const msg = typeof error === 'string' ? error : (error.message ?? '');
  for (const [key, val] of Object.entries(AUTH_ERROR_MAP)) {
    if (msg.includes(key)) return val[lang];
  }
  return lang === 'he'
    ? 'אירעה שגיאה. נסה שוב מאוחר יותר.'
    : 'An error occurred. Please try again.';
}
