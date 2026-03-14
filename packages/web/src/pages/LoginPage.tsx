import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#FDF6EC' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
            style={{ backgroundColor: 'rgba(74,124,89,0.1)' }}>
            <span className="text-3xl">🌱</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2A4A' }}>גינה חיה</h1>
          <p className="text-sm mt-1" style={{ color: '#4A7C59' }}>Gina Haya</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm px-6 py-8"
          style={{ border: '1px solid rgba(74,124,89,0.25)' }}>
          <h2 className="text-lg font-semibold mb-6 text-center" style={{ color: '#1B2A4A' }}>
            {t('login.title')}
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
