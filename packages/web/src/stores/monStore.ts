import { create } from 'zustand';
import type { MonMessage } from '@gina-haya/shared';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://powerful-embrace-production-95ea.up.railway.app';

function getToken(): string | null {
  return useAuthStore.getState().session?.access_token ?? null;
}

interface MonState {
  messages: MonMessage[];
  isLoading: boolean;
  error: string | null;
  rateLimited: boolean;
  rateLimitTier: string | null;
  usageThisMonth: number;
  monthlyLimit: number | null;

  sendMessage: (text: string, gardenId?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  clearError: () => void;
}

export const useMonStore = create<MonState>((set, get) => ({
  messages:       [],
  isLoading:      false,
  error:          null,
  rateLimited:    false,
  rateLimitTier:  null,
  usageThisMonth: 0,
  monthlyLimit:   20,

  clearError: () => set({ error: null }),

  sendMessage: async (text, gardenId) => {
    const token = getToken();
    if (!token || !text.trim()) return;

    // Optimistic: append user message immediately
    const userMsg: MonMessage = {
      role:      'user',
      content:   text.trim(),
      timestamp: new Date().toISOString(),
    };
    set(s => ({ messages: [...s.messages, userMsg], isLoading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/mon/chat`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text.trim(), gardenId }),
      });

      if (res.status === 429) {
        const data = await res.json();
        set({
          isLoading:      false,
          rateLimited:    true,
          rateLimitTier:  data.tier ?? null,
          usageThisMonth: data.messagesUsedThisMonth ?? get().usageThisMonth,
          monthlyLimit:   data.monthlyLimit ?? get().monthlyLimit,
        });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ isLoading: false, error: data.error ?? 'שגיאה בשליחת ההודעה' });
        return;
      }

      const data = await res.json();
      const monMsg: MonMessage = {
        role:      'assistant',
        content:   data.response,
        timestamp: new Date().toISOString(),
      };

      set(s => ({
        messages:       [...s.messages, monMsg],
        isLoading:      false,
        rateLimited:    false,
        usageThisMonth: data.messagesUsedThisMonth ?? s.usageThisMonth,
        monthlyLimit:   data.monthlyLimit           ?? s.monthlyLimit,
      }));
    } catch (err: any) {
      set({ isLoading: false, error: err.message ?? 'שגיאה בשליחת ההודעה' });
    }
  },

  loadHistory: async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.get<MonMessage[]>('/api/mon/history', token);
      set({ messages: data });
    } catch {
      // silently ignore — chat still works without history
    }
  },

  clearHistory: async () => {
    const token = getToken();
    if (!token) return;
    try {
      await api.del('/api/mon/history', token);
      set({ messages: [], usageThisMonth: 0, rateLimited: false });
    } catch {
      // silently ignore
    }
  },
}));
