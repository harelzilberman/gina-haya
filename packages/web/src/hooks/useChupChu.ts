import { useCallback } from 'react';
import { useChupChuStore } from '../stores/chupChuStore';

export function useChupChu() {
  const store = useChupChuStore();
  // Use a selector so the stable function reference is the dependency,
  // not the whole store object (which recreates on every state change).
  const sendMessageFn = useChupChuStore(state => state.sendMessage);

  const sendMessage = useCallback(
    async (text: string, gardenId?: string, imageBase64?: string, imageDataUrl?: string) => {
      const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;
      if (!text.trim() && !hasImage) return;
      await sendMessageFn(text, gardenId, imageBase64, imageDataUrl);
    },
    [sendMessageFn],
  );

  return {
    messages:            store.messages,
    pendingMessage:      store.pendingMessage,
    pendingImageDataUrl: store.pendingImageDataUrl,
    isLoading:          store.isLoading,
    error:              store.error,
    rateLimited:        store.rateLimited,
    rateLimitTier:      store.rateLimitTier,
    usageThisMonth:     store.usageThisMonth,
    monthlyLimit:       store.monthlyLimit,
    usageToday:         store.usageToday,
    dailyLimit:         store.dailyLimit,
    expression:         store.expression,
    proposedTasks:      store.proposedTasks,
    memory:             store.memory,
    sendMessage,
    loadHistory:        store.loadHistory,
    clearHistory:       store.clearHistory,
    clearError:         store.clearError,
    setExpression:      store.setExpression,
    clearProposedTasks: store.clearProposedTasks,
    loadMemory:         store.loadMemory,
    triggerSummarize:   store.triggerSummarize,
  };
}
