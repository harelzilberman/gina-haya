import { useTranslation } from 'react-i18next';

export function useDirection() {
  const { i18n } = useTranslation();
  return {
    dir: i18n.language === 'he' ? 'rtl' : 'ltr',
    isRTL: i18n.language === 'he',
    lang: i18n.language as 'he' | 'en',
  };
}
