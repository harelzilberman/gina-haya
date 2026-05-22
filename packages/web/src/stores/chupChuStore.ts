import { create } from 'zustand';
import type { ChupChuMessage } from '@gina-haya/shared';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

export interface ProposedTask {
  title: { he: string; en: string };
  description: { he: string; en: string };
  date: string;
  category: string;
  priority: string;
}

export interface ChupChuMemory {
  summary_he: string | null;
  summary_en: string | null;
  garden_facts: Record<string, any> | null;
  last_updated: string | null;
}

function getActiveGardenId(): string | null {
  return localStorage.getItem('active_garden_id');
}

interface UserLocation {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

async function getLocationFromIP(): Promise<UserLocation | null> {
  try {
    const cached = sessionStorage.getItem('chupchu_location');
    if (cached) return JSON.parse(cached) as UserLocation;

    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    const location: UserLocation = {
      city:    data.city    ?? 'Unknown',
      country: data.country_name ?? 'Unknown',
      lat:     data.latitude,
      lon:     data.longitude,
    };
    if (!location.lat || !location.lon) return null;
    sessionStorage.setItem('chupchu_location', JSON.stringify(location));
    return location;
  } catch {
    return null;
  }
}

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
  pendingImageDataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  rateLimited: boolean;
  rateLimitTier: string | null;
  usageThisMonth: number;
  monthlyLimit: number | null;
  expression: ChupChuExpression;
  proposedTasks: ProposedTask[] | null;
  memory: ChupChuMemory | null;

  sendMessage: (text: string, gardenId?: string, imageBase64?: string, imageDataUrl?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  clearError: () => void;
  setExpression: (e: ChupChuExpression) => void;
  clearProposedTasks: () => void;
  loadMemory: () => Promise<void>;
  triggerSummarize: (lang: string) => Promise<void>;
}

export const useChupChuStore = create<ChupChuState>((set, get) => ({
  messages:            [],
  pendingMessage:      null,
  pendingImageDataUrl: null,
  isLoading:           false,
  error:               null,
  rateLimited:         false,
  rateLimitTier:       null,
  usageThisMonth:      0,
  monthlyLimit:        20,
  expression:          'default',
  proposedTasks:       null,
  memory:              null,

  clearError:          () => set({ error: null }),
  setExpression:       (e) => set({ expression: e }),
  clearProposedTasks:  () => set({ proposedTasks: null }),

  loadMemory: async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/chupchu/memory`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const { memory } = await res.json();
      if (memory) set({ memory });
    } catch {
      // no memory yet — fine
    }
  },

  triggerSummarize: async (lang) => {
    const token = getToken();
    if (!token) return;
    const { messages, memory } = get();
    if (messages.length < 6) return;
    try {
      await fetch(`${API_BASE}/api/chupchu/memory/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ conversationHistory: messages, lang, existingMemory: memory }),
      });
    } catch {
      // fire-and-forget — ignore failures
    }
  },

  sendMessage: async (text, gardenId, imageBase64, imageDataUrl) => {
    const token = getToken();
    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;
    if (!token || (!text.trim() && !hasImage)) return;

    const resolvedGardenId = gardenId ?? getActiveGardenId();

    const userMsg: ChupChuMessage = {
      role:      'user',
      content:   text.trim() || '🌿 [תמונה לזיהוי צמח]',
      timestamp: new Date().toISOString(),
    };
    // Track as pending — not yet confirmed by server
    set({
      pendingMessage:      userMsg,
      pendingImageDataUrl: imageDataUrl ?? null,
      isLoading:           true,
      error:               null,
      expression:          'thinking',
      proposedTasks:       null,
    });

    try {
      const location = await getLocationFromIP();

      const body: Record<string, unknown> = {
        message:  text.trim(),
        gardenId: resolvedGardenId,
        location,
      };
      if (hasImage) {
        body.imageBase64  = imageBase64;
        body.imageMimeType = 'image/jpeg';
      }

      const res = await fetch(`${API_BASE}/api/chupchu/chat`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const data = await res.json();
        set({
          pendingMessage:      null,
          pendingImageDataUrl: null,
          isLoading:           false,
          rateLimited:         true,
          rateLimitTier:       data.tier ?? null,
          usageThisMonth:      data.messagesUsedThisMonth ?? get().usageThisMonth,
          monthlyLimit:        data.monthlyLimit ?? get().monthlyLimit,
          expression:          'surprised',
        });
        scheduleExpressionReset(set);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ pendingMessage: null, pendingImageDataUrl: null, isLoading: false, error: data.error ?? 'שגיאה בשליחת ההודעה', expression: 'surprised' });
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
        messages:            [...s.messages, userMsg, assistantMsg],
        pendingMessage:      null,
        pendingImageDataUrl: null,
        isLoading:           false,
        rateLimited:         false,
        usageThisMonth:      data.messagesUsedThisMonth ?? s.usageThisMonth,
        monthlyLimit:        data.monthlyLimit           ?? s.monthlyLimit,
        expression:          isWise ? 'wise' : 'happy',
        proposedTasks:       data.proposedTasks && data.proposedTasks.length > 0 ? data.proposedTasks : null,
      }));
      scheduleExpressionReset(set);
    } catch (err: any) {
      set({ pendingMessage: null, pendingImageDataUrl: null, isLoading: false, error: err.message ?? 'שגיאה בשליחת ההודעה', expression: 'surprised' });
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
