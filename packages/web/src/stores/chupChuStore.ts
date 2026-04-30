import { create } from 'zustand';
import type { ChupChuMessage } from '@gina-haya/shared';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://powerful-embrace-production-95ea.up.railway.app';

function getToken(): string | null {
  return useAuthStore.getState().session?.access_token ?? null;
}

export type ChupChuExpression = 'default' | 'happy' | 'surprised' | 'thinking' | 'wise';

const WISE_KEYWORDS = ['לוח', 'ירח', 'moon', 'calendar', 'biodynamic', 'BD prep'];

let expressionTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleExpressionReset(set: (partial: Partial<ChupChuState>) => void, delay = 3000) {
  if (expressionTimer) clearTimeout(expressionTimer);
  expressionTimer = setTimeout(() => {
    set({ expression: 'default' });
    expressionTimer = null;
  }, delay);
}

interface ChupChuState {
  messages: ChupChuMessage[];
  pendingMessage: ChupChuMessage | null;
  isLoading: boolean;
  error: string | null;
  rateLimited: boolean;
  rateLimitTier: string | null;
  usageThisMonth: number;
  monthlyLimit: number | null;
  expression: ChupChuExpression;

  sendMessage: (text: string, gardenId?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  clearError: () => void;
  setExpression: (e: ChupChuExpression) => void;
}

export const useChupChuStore = create<ChupChuState>((set, get) => ({
  messages:       [],
  pendingMessage: null,
  isLoading:      false,
  error:          null,
  rateLimited:    false,
  rateLimitTier:  null,
  usageThisMonth: 0,
  monthlyLimit:   20,
  expression:     'default',

  clearError:     () => set({ error: null }),
  setExpression:  (e) => set({ expression: e }),

  sendMessage: async (text, gardenId) => {
    const token = getToken();
    if (!token || !text.trim()) return;

    const userMsg: ChupChuMessage = {
      role:      'user',
      content:   text.trim(),
      timestamp: new Date().toISOString(),
    };
    // Track as pending — not yet confirmed by server
    set({ pendingMessage: userMsg, isLoading: true, error: null, expression: 'thinking' });

    try {
      const res = await fetch(`${API_BASE}/api/chupchu/chat`, {
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
          pendingMessage: null,
          isLoading:      false,
          rateLimited:    true,
          rateLimitTier:  data.tier ?? null,
          usageThisMonth: data.messagesUsedThisMonth ?? get().usageThisMonth,
          monthlyLimit:   data.monthlyLimit ?? get().monthlyLimit,
          expression:     'surprised',
        });
        scheduleExpressionReset(set);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ pendingMessage: null, isLoading: false, error: data.error ?? 'שגיאה בשליחת ההודעה', expression: 'surprised' });
        scheduleExpressionReset(set);
        return;
      }

      const data = await res.json();
      const assistantMsg: ChupChuMessage = {
        role:      'assistant',
        content:   data.response,
        timestamp: new Date().toISOString(),
      };

      const isWise = WISE_KEYWORDS.some(kw => data.response.toLowerCase().includes(kw.toLowerCase()));

      set(s => ({
        messages:       [...s.messages, userMsg, assistantMsg],
        pendingMessage: null,
        isLoading:      false,
        rateLimited:    false,
        usageThisMonth: data.messagesUsedThisMonth ?? s.usageThisMonth,
        monthlyLimit:   data.monthlyLimit           ?? s.monthlyLimit,
        expression:     isWise ? 'wise' : 'happy',
      }));
      scheduleExpressionReset(set);
    } catch (err: any) {
      set({ pendingMessage: null, isLoading: false, error: err.message ?? 'שגיאה בשליחת ההודעה', expression: 'surprised' });
      scheduleExpressionReset(set);
    }
  },

  loadHistory: async () => {
    const token = getToken();
    if (!token) return;
    if (get().messages.length > 0) return; // already loaded
    try {
      const data = await api.get<ChupChuMessage[]>('/api/chupchu/history', token);
      set({ messages: data });
    } catch {
      // silently ignore — chat still works without history
    }
  },

  clearHistory: async () => {
    const token = getToken();
    if (!token) return;
    try {
      await api.del('/api/chupchu/history', token);
      set({ messages: [], usageThisMonth: 0, rateLimited: false });
    } catch {
      // silently ignore
    }
  },
}));
