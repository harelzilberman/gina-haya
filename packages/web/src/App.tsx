import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingWizard } from './components/auth/OnboardingWizard';
import { useAuthStore } from './stores/authStore';
import { useOnboardingStore } from './stores/onboardingStore';

export default function App() {
  const { i18n } = useTranslation();
  const { user, profile, isLoading } = useAuthStore();
  const { isComplete } = useOnboardingStore();

  // Central RTL/LTR management
  useEffect(() => {
    const isRTL = i18n.language === 'he';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Show onboarding wizard if: authenticated, profile loaded, not yet complete
  const showOnboarding =
    !isLoading &&
    !!user &&
    profile !== null &&
    profile.onboarding_complete === false &&
    !isComplete;

  return (
    <div className="min-h-screen bg-cream font-heebo">
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected app routes */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Onboarding wizard — rendered as overlay on top of any page */}
      {showOnboarding && <OnboardingWizard />}
    </div>
  );
}
