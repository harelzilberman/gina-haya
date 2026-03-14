import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useAuthStore } from '../../stores/authStore';

export function PasswordResetForm() {
  const { t } = useTranslation('auth');
  const { dir } = useDirection();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await resetPassword(email);
    if (!useAuthStore.getState().error) setSent(true);
  };

  if (sent) {
    return (
      <div dir={dir} className="w-full text-center space-y-4">
        <div className="text-4xl">📬</div>
        <p className="text-navy font-medium">{t('reset.success')}</p>
        <Link to="/login" className="block text-sm text-sage hover:underline">
          {t('reset.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div dir={dir} className="w-full">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">
            {t('reset.emailLabel')}
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-sage/30 bg-white px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-sage py-2.5 text-sm font-medium text-white transition hover:bg-sage/90 disabled:opacity-60"
        >
          {isLoading ? '...' : t('reset.submitButton')}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className="text-sm text-sage hover:underline">
          {t('reset.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
