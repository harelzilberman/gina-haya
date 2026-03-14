import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CalendarPage } from './pages/CalendarPage';
import { MooshPage } from './pages/MooshPage';
import { PlantsPage } from './pages/PlantsPage';
import { GardenPage } from './pages/GardenPage';
import { BillingPage } from './pages/BillingPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingWizard } from './components/auth/OnboardingWizard';
import { ToastContainer } from './components/ui/Toast';
import { UpgradeModal } from './components/ui/UpgradeModal';
import { useUpgradeModalStore } from './stores/upgradeModalStore';
import { useAuthStore } from './stores/authStore';
import { useOnboardingStore } from './stores/onboardingStore';
import { supabase } from './lib/supabase';

export default function App() {
  const { i18n } = useTranslation();
  const { user, profile, isAuthReady, loadProfile, markOnboardingComplete } = useAuthStore();
  const { isComplete } = useOnboardingStore();
  const { isOpen: isUpgradeOpen } = useUpgradeModalStore();

  // Central RTL/LTR management
  useEffect(() => {
    const isRTL = i18n.language === 'he';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Force profile load whenever user changes
  useEffect(() => {
    if (user && !profile) {
      loadProfile();
    }
  }, [user, profile, loadProfile]);

  // Show onboarding wizard if profile loaded and not complete
  const showOnboarding =
    isAuthReady &&
    !!user &&
    profile !== null &&
    profile.onboarding_complete === false &&
    !isComplete;

  // Loading state while auth initialises
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EC' }}>
        <span className="text-4xl animate-pulse">🌱</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-heebo" style={{ backgroundColor: '#FDF6EC' }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center" style={{ color: '#1B2A4A' }}>
                <p className="text-lg font-semibold mb-5">🌱 ברוכים הבאים לגינה חיה</p>
                <div className="flex flex-col gap-3 items-center">
                  <a
                    href="/calendar"
                    className="inline-block px-5 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: '#4A7C59' }}
                  >
                    📅 לוח הביודינמי
                  </a>
                  <a
                    href="/moosh"
                    className="inline-block px-5 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: '#B7924A' }}
                  >
                    🌕 שוחח עם מוש
                  </a>
                  <a
                    href="/plants"
                    className="inline-block px-5 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: '#4A7C59' }}
                  >
                    🥦 אנציקלופדיית הצמחים
                  </a>
                  <a
                    href="/garden"
                    className="inline-block px-5 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: '#4A7C59' }}
                  >
                    🌿 הגינה שלי
                  </a>
                  <a
                    href="/billing"
                    className="inline-block px-5 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: '#B7924A' }}
                  >
                    💳 המנוי שלי
                  </a>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moosh"
          element={
            <ProtectedRoute>
              <MooshPage />
            </ProtectedRoute>
          }
        />
        {/* Public — no ProtectedRoute */}
        <Route path="/plants" element={<PlantsPage />} />
        <Route
          path="/garden"
          element={
            <ProtectedRoute>
              <GardenPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showOnboarding && <OnboardingWizard />}
      {isUpgradeOpen && <UpgradeModal />}
      <ToastContainer />
    </div>
  );
}
