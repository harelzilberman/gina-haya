import { useCallback } from 'react';
import { useMonStore } from '../stores/monStore';

export function useMon() {
  const store = useMonStore();

  const sendMessage = useCallback(
    async (text: string, gardenId?: string) => {
      if (!text.trim()) return;
      await store.sendMessage(text, gardenId);
    },
    [store.sendMessage]
  );

  return {
    messages:       store.messages,
    isLoading:      store.isLoading,
    error:          store.error,
    rateLimited:    store.rateLimited,
    rateLimitTier:  store.rateLimitTier,
    usageThisMonth: store.usageThisMonth,
    monthlyLimit:   store.monthlyLimit,
    sendMessage,
    loadHistory:    store.loadHistory,
    clearHistory:   store.clearHistory,
    clearError:     store.clearError,
  };
}
