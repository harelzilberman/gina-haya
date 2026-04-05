import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { CalendarPage } from './pages/CalendarPage';
import { ChupChuPage } from './pages/ChupChuPage';
import { PlantsPage } from './pages/PlantsPage';
import { GardenPage } from './pages/GardenPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrackerPage } from './pages/TrackerPage';
import { PlanPage } from './pages/PlanPage';
import { MapPage }  from './pages/MapPage';
import { GuidesPage } from './pages/GuidesPage';
import { TaskCalendarPage } from './pages/TaskCalendarPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingWizard } from './components/auth/OnboardingWizard';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/ui/Toast';
import { UpgradeModal } from './components/ui/UpgradeModal';
import { ChupChuChat } from './components/chupchu/ChupChuChat';
import { useUpgradeModalStore } from './stores/upgradeModalStore';
import { useAuthStore } from './stores/authStore';
import { useOnboardingStore } from './stores/onboardingStore';
import { useChupChuPanelStore } from './stores/chupChuPanelStore';
import { supabase } from './lib/supabase';

export default function App() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const isMapPage   = location.pathname === '/map';
  const isChupChuPage = location.pathname === '/chupchu';
  const { user, profile, isAuthReady, loadProfile, markOnboardingComplete } = useAuthStore();
  const { isComplete } = useOnboardingStore();
  const { isOpen: isUpgradeOpen } = useUpgradeModalStore();
  const {
    isOpen:             isChupChuPanelOpen,
    initialMessage:     chupChuInitial,
    open:               openChupChuPanel,
    close:              closeChupChuPanel,
    clearInitialMessage,
  } = useChupChuPanelStore();

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

      {/* pt-[72px] offsets the fixed 64px navbar (skipped on map page — it manages its own layout) */}
      <main className="flex-1" style={{ paddingTop: isMapPage ? 0 : '72px' }}>
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
            path="/chupchu"
            element={
              <ProtectedRoute>
                <ChupChuPage />
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
          <Route
            path="/tracker"
            element={
              <ProtectedRoute>
                <TrackerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan"
            element={
              <ProtectedRoute>
                <PlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guides"
            element={
              <ProtectedRoute>
                <GuidesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TaskCalendarPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isMapPage && <Footer />}

      {showOnboarding && <OnboardingWizard />}
      {isUpgradeOpen && <UpgradeModal />}
      <ToastContainer />

      {/* Floating ChupChu bubble — hidden on /chupchu page itself */}
      {user && !isChupChuPage && (
        <>
          {isChupChuPanelOpen && (
            <div style={{
              position:      'fixed',
              bottom:        '92px',
              left:          '20px',
              width:         '400px',
              zIndex:        9999,
              borderRadius:  '16px',
              boxShadow:     '0 16px 60px rgba(0,0,0,0.55)',
              overflow:      'hidden',
            }}>
              <ChupChuChat
                compact
                initialMessage={chupChuInitial}
                onInitialMessageConsumed={clearInitialMessage}
              />
            </div>
          )}
          <button
            onClick={() => isChupChuPanelOpen ? closeChupChuPanel() : openChupChuPanel()}
            aria-label="שיחה עם צ'ופצ'ו"
            style={{
              position:        'fixed',
              bottom:          '24px',
              left:            '20px',
              width:           '52px',
              height:          '52px',
              borderRadius:    '50%',
              backgroundColor: '#F5C840',
              border:          'none',
              cursor:          'pointer',
              fontSize:        isChupChuPanelOpen ? '20px' : '26px',
              fontWeight:      700,
              color:           '#142B16',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              zIndex:          9999,
              boxShadow:       '0 4px 20px rgba(245,200,64,0.45)',
              transition:      'filter 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {isChupChuPanelOpen ? '✕' : '🌕'}
          </button>
        </>
      )}
    </div>
  );
}
