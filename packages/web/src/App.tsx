import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

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
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected app routes — wired up in Phase 2 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center text-navy">
                🌱 ברוכים הבאים לגינה חיה — Phase 2 build begins here.
              </div>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
