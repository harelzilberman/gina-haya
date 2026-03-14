import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MooshChat } from '../components/moosh/MooshChat';
import { useMoosh } from '../hooks/useMoosh';
import { useAuthStore } from '../stores/authStore';

export function MooshPage() {
  const { t } = useTranslation('moosh');
  const { loadHistory, usageThisMonth, monthlyLimit } = useMoosh();
  const { profile } = useAuthStore();

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const tier = profile?.subscription_tier ?? 'free';
  const isUnlimited = tier === 'gardener_pro' || tier === 'professional';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FDF6EC' }}
    >
      {/* Usage counter — only for limited tiers */}
      {!isUnlimited && monthlyLimit !== null && (
        <div className="flex justify-center pt-3 pb-1 px-4">
          <span
            className="text-xs px-3 py-1 rounded-full"
            style={{
              backgroundColor: usageThisMonth >= monthlyLimit
                ? '#FEE2E2'
                : 'rgba(74,124,89,0.1)',
              color: usageThisMonth >= monthlyLimit
                ? '#991B1B'
                : '#4A7C59',
            }}
          >
            {t('usageCounter', { used: usageThisMonth, limit: monthlyLimit })}
          </span>
        </div>
      )}

      {/* Chat panel */}
      <div
        className="flex-1 flex flex-col mx-auto w-full"
        style={{ maxWidth: '680px' }}
      >
        <MooshChat />
      </div>
    </div>
  );
}
