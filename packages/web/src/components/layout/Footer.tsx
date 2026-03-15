import { useTranslation } from 'react-i18next';

const SAGE = '#4A7C59';

export function Footer() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  function toggleLanguage() {
    const next = isHebrew ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('i18nextLng', next);
  }

  return (
    <footer
      className="py-8 text-center text-sm"
      style={{ backgroundColor: SAGE, color: '#ffffff', fontSize: '14px' }}
    >
      <p className="mb-3 font-medium">© 2026 גינה חיה | Gina Haya</p>

      <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
        <a
          href="/privacy"
          className="underline transition-opacity duration-200 hover:opacity-70"
          style={{ color: '#ffffff' }}
        >
          מדיניות פרטיות
        </a>
        <span className="opacity-50">|</span>
        <a
          href="mailto:hello@gina-haya.com"
          className="underline transition-opacity duration-200 hover:opacity-70"
          style={{ color: '#ffffff' }}
        >
          צור קשר
        </a>
      </div>

      <button
        onClick={toggleLanguage}
        className="text-xs font-medium px-3 py-1 rounded-md border transition-all duration-200 hover:opacity-70"
        style={{ borderColor: '#ffffff', color: '#ffffff' }}
      >
        {isHebrew ? 'EN' : 'עב'}
      </button>
    </footer>
  );
}
