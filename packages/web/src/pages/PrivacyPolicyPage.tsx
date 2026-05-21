import { useTranslation } from 'react-i18next';

const NAVY = '#1B2A4A';
const SAGE = '#4A9C68';
const CREAM = '#FDF6EC';

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation('privacy');
  const isHe = i18n.language === 'he';
  const sections = t('sections', { returnObjects: true }) as Array<{ title: string; body: string }>;

  return (
    <div className="min-h-screen" dir={isHe ? 'rtl' : 'ltr'} style={{ backgroundColor: CREAM }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div
          className="rounded-2xl shadow-sm p-8"
          style={{ backgroundColor: '#ffffff' }}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: NAVY }}>
            {t('title')}
          </h1>
          <p className="text-sm mb-8 opacity-60" style={{ color: NAVY }}>
            {t('lastUpdated')}
          </p>

          <p className="leading-relaxed mb-8" style={{ color: '#475569' }}>
            {t('intro')}
          </p>

          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-lg font-bold mb-2" style={{ color: NAVY }}>
                  {i + 1}. {section.title}
                </h2>
                <p className="leading-relaxed" style={{ color: '#475569' }}>
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-10 p-4 rounded-xl text-sm"
            style={{ backgroundColor: SAGE + '15', borderInlineStart: `3px solid ${SAGE}` }}
          >
            <p style={{ color: NAVY }}>
              <strong>{t('summaryLabel')}</strong> {t('summary')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
