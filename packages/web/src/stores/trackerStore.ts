import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

export interface PlantAnalysis {
  plantIdentified: string;
  plantIdentifiedEn: string;
  confidence: 'high' | 'medium' | 'low';
  growthStage: 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest' | 'dormant';
  growthStageHe: string;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  healthHe: string;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    naturalSolution: string;
  }>;
  observations: string;
  immediateActions: string[];
}

export interface GrowingPlan {
  summary: string;
  estimatedHarvestWeeks: number | null;
  steps: Array<{
    week: number;
    title: string;
    actions: string[];
    biodynamicTip: string;
    preparations: string[];
  }>;
  wateringSchedule: {
    frequencyDays: number;
    amountDescription: string;
    specialNotes: string;
  };
  fertilising: {
    compostAmount: string;
    timing: string;
    preparations: string[];
  };
  pestPrevention: string[];
  naturalFertilizers: string[];
}

export interface TrackerCheckin {
  id: string;
  tracker_id: string;
  user_id: string;
  checkin_date: string;
  growth_stage: string;
  ai_analysis: PlantAnalysis | null;
  growing_plan: GrowingPlan | null;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
}

export interface Tracker {
  id: string;
  user_id: string;
  garden_id: string | null;
  plant_id: string | null;
  plant_name_he: string;
  plant_name_en: string;
  location_type: 'garden' | 'pot' | 'balcony' | 'greenhouse' | 'other';
  location_description: string | null;
  created_at: string;
  updated_at: string;
  latest_checkin?: TrackerCheckin | null;
  checkins?: TrackerCheckin[];
}

export interface TrackerTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  due_in_days: number;
}

export interface CheckinResult {
  checkin: TrackerCheckin;
  analysis: PlantAnalysis;
  growingPlan: GrowingPlan;
  suggested_tasks?: TrackerTask[];
  used_credit?: boolean;
}

export interface LimitError {
  type: 'limit';
  tier: string;
  limit: number;
  limitType: string;
}

interface TrackerState {
  trackers: Tracker[];
  activeTrackerId: string | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  loadTrackers: (gardenId?: string) => Promise<void>;
  createTracker: (data: {
    plantNameHe: string;
    plantNameEn: string;
    plantId?: string;
    gardenId?: string;
    locationType: string;
    locationDescription?: string;
  }) => Promise<Tracker>;
  deleteTracker: (id: string) => Promise<void>;
  addCheckin: (
    trackerId: string,
    imageBase64: string,
    mimeType: string,
    notes?: string
  ) => Promise<CheckinResult>;
  approveTasks: (
    trackerId: string,
    tasks: TrackerTask[]
  ) => Promise<{ tasks_added: number; tasks_error: string | null }>;
  setActiveTrackerId: (id: string | null) => void;
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://powerful-embrace-production-95ea.up.railway.app';

export const useTrackerStore = create<TrackerState>((set, get) => ({
  trackers: [],
  activeTrackerId: null,
  isLoading: false,
  isAnalyzing: false,

  setActiveTrackerId: (id) => set({ activeTrackerId: id }),

  loadTrackers: async (gardenId?: string) => {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true });
    try {
      const url = gardenId ? `/api/trackers?gardenId=${gardenId}` : '/api/trackers';
      const data = await api.get<{ trackers: Tracker[] }>(url, token);
      set({ trackers: data.trackers });
    } catch (err: any) {
      console.error('loadTrackers', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  createTracker: async (data) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const tracker = await api.post<Tracker>('/api/trackers', data, token);
    set(state => ({ trackers: [{ ...tracker, latest_checkin: null }, ...state.trackers] }));
    return tracker;
  },

  deleteTracker: async (id) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    // Optimistic
    set(state => ({ trackers: state.trackers.filter(t => t.id !== id) }));
    try {
      await api.del(`/api/trackers/${id}`, token);
    } catch {
      get().loadTrackers();
    }
  },

  addCheckin: async (trackerId, imageBase64, mimeType, notes) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    set({ isAnalyzing: true });
    try {
      // Use raw fetch so we can inspect 429 body properly
      const res = await fetch(`${API_BASE}/api/trackers/${trackerId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64, mimeType, notes }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(data.error || 'forbidden');
        err.errorCode = data.error;
        err.limitData = { limit: data.limit, current: data.current, resetsAt: data.resets_at };
        throw err;
      }

      if (res.status === 429) {
        const data = await res.json();
        const err = new Error('limit_exceeded') as any;
        err.limitData = { tier: data.tier, limit: data.limit, limitType: data.type };
        throw err;
      }

      if (res.status === 422) {
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(data.message || 'התמונה גדולה מדי לניתוח');
        err.errorCode = data.error_code || 'image_too_large';
        throw err;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(data.message || data.error || `HTTP ${res.status}`);
        err.errorCode = data.error_code || 'unknown';
        throw err;
      }

      const result: CheckinResult = await res.json();

      // Update tracker's latest checkin in store
      set(state => ({
        trackers: state.trackers.map(t =>
          t.id === trackerId
            ? { ...t, latest_checkin: result.checkin }
            : t
        ),
      }));

      return result;
    } finally {
      set({ isAnalyzing: false });
    }
  },

  approveTasks: async (trackerId, tasks) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    return api.post<{ tasks_added: number; tasks_error: string | null }>(
      `/api/trackers/${trackerId}/approve-tasks`,
      { tasks },
      token
    );
  },
}));
