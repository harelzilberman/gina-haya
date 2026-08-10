import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { CalendarPage } from './pages/CalendarPage';
import { ChupChuPage } from './pages/ChupChuPage';
import { PlantsPage } from './pages/PlantsPage';
import { GardenGridPage } from './pages/GardenGridPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrackerPage } from './pages/TrackerPage';
import { GuidesPage } from './pages/GuidesPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { ArticlePage } from './pages/ArticlePage';
import { TaskCalendarPage } from './pages/TaskCalendarPage';
import { DashboardPage } from './pages/DashboardPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { PricingPage } from './pages/PricingPage';
import { ShopPage } from './pages/ShopPage';
import { GardensPage } from './pages/GardensPage';
import { HelpPage } from './pages/HelpPage';
import { AboutPage } from './pages/AboutPage';
import { AdminTemplatesPage } from './pages/AdminTemplatesPage';
import { AdminKnowledgePage } from './pages/AdminKnowledgePage';
import { AdminWaitlistPage } from './pages/AdminWaitlistPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingWizard } from './components/auth/OnboardingWizard';
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/ui/Toast';
import { UpgradeModal } from './components/ui/UpgradeModal';
import { LaunchBadge } from './components/ui/LaunchBadge';
import { ChupChuChat } from './components/chupchu/ChupChuChat';
import { useUpgradeModalStore } from './stores/upgradeModalStore';
import { useAuthStore } from './stores/authStore';
import { useGardenSwitcherStore } from './stores/gardenSwitcherStore';
import { useOnboardingStore } from './stores/onboardingStore';
import { useChupChuPanelStore } from './stores/chupChuPanelStore';
import { useChupChu } from './hooks/useChupChu';
import { supabase } from './lib/supabase';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const isChupChuPage = location.pathname === '/chupchu';
  const { user, profile, isAuthReady, loadProfile, markOnboardingComplete } = useAuthStore();
  const { initFromAuth } = useGardenSwitcherStore();
  const { isComplete, showWelcomeScreen } = useOnboardingStore();
  const { isOpen: isUpgradeOpen } = useUpgradeModalStore();
  const {
    isOpen:             isChupChuPanelOpen,
    initialMessage:     chupChuInitial,
    open:               openChupChuPanel,
    close:              closeChupChuPanel,
    clearInitialMessage,
  } = useChupChuPanelStore();
  const { loadHistory } = useChupChu();

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  // Initialize garden switcher when user logs in
  useEffect(() => {
    if (user) initFromAuth();
  }, [user]);

  // Load Chupchu history when the floating panel first opens
  useEffect(() => {
    if (isChupChuPanelOpen && user) loadHistory();
  }, [isChupChuPanelOpen, user]);

  const [showChupChuTooltip, setShowChupChuTooltip] = useState(false);
  const [chupChuIntroduced, setChupChuIntroduced] = useState(
    () => localStorage.getItem('chupchu-introduced') === 'true'
  );
  const prevWelcomeRef = useRef(false);

  useEffect(() => {
    if (prevWelcomeRef.current && !showWelcomeScreen && !chupChuIntroduced) {
      const timer = setTimeout(() => setShowChupChuTooltip(true), 5000);
      prevWelcomeRef.current = showWelcomeScreen;
      return () => clearTimeout(timer);
    }
    prevWelcomeRef.current = showWelcomeScreen;
  }, [showWelcomeScreen]);

  useEffect(() => {
    if (showChupChuTooltip) {
      const timer = setTimeout(() => setShowChupChuTooltip(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showChupChuTooltip]);

  // Show onboarding wizard if profile loaded and not complete
  const showOnboarding =
    isAuthReady &&
    !!user &&
    profile !== null &&
    profile.onboarding_complete === false &&
    !isComplete;

  // Loading state while auth initialises — skip gate for public content paths
  const isPublicContentPath =
    location.pathname === '/guides' ||
    location.pathname === '/articles' ||
    location.pathname.startsWith('/articles/') ||
    location.pathname === '/pricing' ||
    location.pathname === '/shop' ||
    location.pathname === '/help';
  if (!isAuthReady && !isPublicContentPath) {
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

      <main className="flex-1" style={{ paddingTop: '72px' }}>
        <Routes>
          {/* Auth pages — no layout wrapper needed (they have their own) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Root: dashboard for logged-in, landing for guests */}
          <Route
            path="/"
            element={user ? <ProtectedRoute><DashboardPage /></ProtectedRoute> : <LandingPage />}
          />
          <Route path="/home-old" element={<LandingPage />} />

          {/* Public pages */}
          <Route path="/plants" element={<PlantsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Protected pages */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="/chupchu" element={<ChupChuPage />} />
          <Route
            path="/garden"
            element={
              <ProtectedRoute>
                <GardenGridPage />
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
            path="/gardens"
            element={
              <ProtectedRoute>
                <GardensPage />
              </ProtectedRoute>
            }
          />
          <Route path="/guides" element={<GuidesPage />} />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TaskCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:slug" element={<ArticlePage />} />


          <Route path="/admin/templates" element={<AdminTemplatesPage />} />
          <Route path="/admin/knowledge" element={<AdminKnowledgePage />} />
          <Route path="/admin/waitlist"  element={<AdminWaitlistPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {showOnboarding && <OnboardingWizard />}
      {showWelcomeScreen && <WelcomeScreen />}
      {isUpgradeOpen && <UpgradeModal />}
      <ToastContainer />
      <LaunchBadge />

      {/* Floating ChupChu bubble — hidden on /chupchu page itself */}
      {!isChupChuPage && (
        <>
          {isChupChuPanelOpen && (
            <>
              {/* Transparent backdrop — click outside panel to close */}
              <div
                onClick={() => closeChupChuPanel()}
                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
              />
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position:        'fixed',
                  bottom:          'calc(92px + env(safe-area-inset-bottom))',
                  insetInlineStart: '12px',
                  width:           'min(400px, calc(100vw - 24px))',
                  maxHeight:       'calc(100dvh - 160px)',
                  zIndex:          9999,
                  borderRadius:    '16px',
                  boxShadow:       '0 16px 60px rgba(0,0,0,0.55)',
                  overflow:        'hidden',
                  display:         'flex',
                  flexDirection:   'column',
                }}>
                <ChupChuChat
                  compact
                  initialMessage={chupChuInitial}
                  onInitialMessageConsumed={clearInitialMessage}
                />
              </div>
            </>
          )}
          <div style={{ position: 'fixed', bottom: '24px', left: '20px', zIndex: 9999 }}>
            {showChupChuTooltip && !chupChuIntroduced && (
              <div style={{
                position: 'absolute', bottom: '60px', left: 0,
                width: '220px', padding: '12px 14px',
                background: 'rgba(10,26,12,0.96)',
                border: '1px solid rgba(0,229,195,0.25)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                fontSize: '13px', fontFamily: '"Assistant","Heebo",sans-serif',
                color: 'rgba(176,207,191,0.85)', lineHeight: 1.5,
                direction: 'rtl', pointerEvents: 'none',
              }}>
                זה צ'ופצ'ו — הגנן הביודינמי שלך! 🌿
                <br />
                לחץ כדי לשוחח איתו על הגינה שלך.
              </div>
            )}
            <div style={{ position: 'relative', width: '52px', height: '52px' }}>
              {!chupChuIntroduced && !isChupChuPanelOpen && (
                <div
                  onClick={e => { e.stopPropagation(); setShowChupChuTooltip(v => !v); }}
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#00e5c3', color: '#050d0a',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 1,
                  }}
                >?</div>
              )}
              <button
                data-tour="chupchu-bubble"
                onClick={e => {
                  e.stopPropagation();
                  if (isChupChuPanelOpen) {
                    closeChupChuPanel();
                  } else {
                    openChupChuPanel();
                    if (!chupChuIntroduced) {
                      localStorage.setItem('chupchu-introduced', 'true');
                      setChupChuIntroduced(true);
                      setShowChupChuTooltip(false);
                    }
                  }
                }}
                aria-label="שיחה עם צ'ופצ'ו"
                style={{
                  width:           '52px',
                  height:          '52px',
                  borderRadius:    '50%',
                  backgroundColor: '#00e5c3',
                  border:          'none',
                  cursor:          'pointer',
                  fontSize:        isChupChuPanelOpen ? '20px' : '26px',
                  fontWeight:      700,
                  color:           '#050d0a',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  boxShadow:       '0 4px 20px rgba(0,229,195,0.45)',
                  transition:      'filter 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                {isChupChuPanelOpen ? '✕' : '🌱'}
              </button>
            </div>
          </div>
        </>
      )}

      <div
        style={{
          background: '#0F1F11',
          borderTop: '0.5px solid rgba(201,168,76,0.15)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#6b9080',
          direction: 'rtl',
          flexShrink: 0,
        }}
      >
        <span>© 2026 גינה חיה</span>
        <a
          href="mailto:gina.haya.contact@gmail.com"
          style={{ color: '#6b9080', textDecoration: 'none' }}
        >
          📧 צור קשר
        </a>
      </div>
      <Analytics />
    </div>
  );
}
