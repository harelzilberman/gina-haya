import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Pages (to be created in Phase 1 build)
// import { CalendarPage } from './pages/CalendarPage';
// import { GardenPage } from './pages/GardenPage';
// import { MooshPage } from './pages/MooshPage';
// import { AuthPage } from './pages/AuthPage';

export default function App() {
  const { i18n } = useTranslation();

  // Central RTL/LTR management — all components inherit this
  useEffect(() => {
    const isRTL = i18n.language === 'he';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-cream font-heebo">
      <Routes>
        {/* Routes wired up during Phase 1 build */}
        <Route path="/" element={<div className="p-8 text-center">🌱 Gina Haya — Scaffold ready. Phase 1 build begins here.</div>} />
      </Routes>
    </div>
  );
}
