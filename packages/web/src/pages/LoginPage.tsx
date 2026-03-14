import { useTranslation } from 'react-i18next';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  const { t } = useTranslation('auth');

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/10 mb-3">
            <span className="text-3xl">🌱</span>
          </div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">גינה חיה</h1>
          <p className="text-sm text-sage mt-1">Gina Haya</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-sage/25 shadow-sm px-6 py-8">
          <h2 className="text-lg font-semibold text-navy mb-6 text-center">
            {t('login.title')}
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
