import { create } from 'zustand';
import type { MooshMessage } from '@gina-haya/shared';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://powerful-embrace-production-95ea.up.railway.app';

function getToken(): string | null {
  return useAuthStore.getState().session?.access_token ?? null;
}

interface MooshState {
  messages: MooshMessage[];
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

export const useMooshStore = create<MooshState>((set, get) => ({
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
    const userMsg: MooshMessage = {
      role:      'user',
      content:   text.trim(),
      timestamp: new Date().toISOString(),
    };
    set(s => ({ messages: [...s.messages, userMsg], isLoading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/moosh/chat`, {
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
      const mooshMsg: MooshMessage = {
        role:      'assistant',
        content:   data.response,
        timestamp: new Date().toISOString(),
      };

      set(s => ({
        messages:       [...s.messages, mooshMsg],
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
      const data = await api.get<MooshMessage[]>('/api/moosh/history', token);
      set({ messages: data });
    } catch {
      // silently ignore — chat still works without history
    }
  },

  clearHistory: async () => {
    const token = getToken();
    if (!token) return;
    try {
      await api.del('/api/moosh/history', token);
      set({ messages: [], usageThisMonth: 0, rateLimited: false });
    } catch {
      // silently ignore
    }
  },
}));
