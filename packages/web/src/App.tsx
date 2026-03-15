import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { CalendarPage } from './pages/CalendarPage';
import { MooshPage } from './pages/MooshPage';
import { PlantsPage } from './pages/PlantsPage';
import { GardenPage } from './pages/GardenPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingWizard } from './components/auth/OnboardingWizard';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
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
    <div className="min-h-screen font-heebo flex flex-col" style={{ backgroundColor: '#FDF6EC' }}>
      <Navbar />

      {/* pt-16 offsets the fixed navbar */}
      <main className="flex-1 pt-16">
        <Routes>
          {/* Auth pages — no layout wrapper needed (they have their own) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Root: landing for guests, redirect to calendar for logged-in users */}
          <Route
            path="/"
            element={user ? <Navigate to="/calendar" replace /> : <LandingPage />}
          />

          {/* Public pages */}
          <Route path="/plants" element={<PlantsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Protected pages */}
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
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {showOnboarding && <OnboardingWizard />}
      {isUpgradeOpen && <UpgradeModal />}
      <ToastContainer />
    </div>
  );
}
