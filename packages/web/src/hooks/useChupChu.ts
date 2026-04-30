import { useCallback } from 'react';
import { useChupChuStore } from '../stores/chupChuStore';

export function useChupChu() {
  const store = useChupChuStore();
  // Use a selector so the stable function reference is the dependency,
  // not the whole store object (which recreates on every state change).
  const sendMessageFn = useChupChuStore(state => state.sendMessage);

  const sendMessage = useCallback(
    async (text: string, gardenId?: string) => {
      if (!text.trim()) return;
      await sendMessageFn(text, gardenId);
    },
    [sendMessageFn],
  );

  return {
    messages:       store.messages,
    pendingMessage: store.pendingMessage,
    isLoading:      store.isLoading,
    error:          store.error,
    rateLimited:    store.rateLimited,
    rateLimitTier:  store.rateLimitTier,
    usageThisMonth: store.usageThisMonth,
    monthlyLimit:   store.monthlyLimit,
    expression:     store.expression,
    sendMessage,
    loadHistory:    store.loadHistory,
    clearHistory:   store.clearHistory,
    clearError:     store.clearError,
    setExpression:  store.setExpression,
  };
}
