import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

export interface DayPlan {
  date: string;
  dateHe: string;
  dayOfWeek: string;
  dayType: string;
  dayTypeHe: string;
  dayTypeEmoji: string;
  plantingScore: number;
  scoreColour: string;
  nodeActive: boolean;
  moonDirection: string;
  moonDirectionHe: string;
  prep500: boolean;
  prep501: boolean;
  recommendedActions: string[];
  recommendedPlants: string[];
  avoidActions: string[];
  chupChuTip: string;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  weekSummary: string;
  bestDayForPlanting: string;
  bestDayForHarvest: string;
  days: DayPlan[];
  gardenTasks: string[];
  weatherSummary: string;
  generatedAt?: string;
}

interface PlanState {
  weeklyPlan: WeeklyPlan | null;
  isLoading: boolean;
  isRegenerating: boolean;
  error: string | null;
  lastGenerated: string | null;
  loadWeeklyPlan: (lang?: string) => Promise<void>;
  regeneratePlan: (lang?: string) => Promise<void>;
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

export const usePlanStore = create<PlanState>((set) => ({
  weeklyPlan:    null,
  isLoading:     false,
  isRegenerating: false,
  error:         null,
  lastGenerated: null,

  loadWeeklyPlan: async (lang = 'he') => {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const plan = await api.get<WeeklyPlan>(`/api/plans/weekly?lang=${lang}`, token);
      set({ weeklyPlan: plan, lastGenerated: plan.generatedAt ?? null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  regeneratePlan: async (lang = 'he') => {
    const token = getToken();
    if (!token) return;
    set({ isRegenerating: true, error: null });
    try {
      const plan = await api.post<WeeklyPlan>('/api/plans/weekly/regenerate', { lang }, token);
      set({ weeklyPlan: plan, lastGenerated: plan.generatedAt ?? null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isRegenerating: false });
    }
  },
}));
