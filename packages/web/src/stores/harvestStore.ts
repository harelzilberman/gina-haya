import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

export interface Harvest {
  id: string;
  user_id: string;
  garden_id: string | null;
  plant_id: string | null;
  plant_name_he: string;
  plant_name_en: string;
  harvest_date: string;
  quantity_grams: number | null;
  quantity_units: number | null;
  quantity_type: 'grams' | 'units' | 'kg';
  notes: string | null;
  day_type: string | null;
  planting_score: number | null;
  created_at: string;
}

export interface HarvestStats {
  totalHarvests: number;
  thisMonth: number;
  lastMonth: number;
  topPlants: Array<{ nameHe: string; nameEn: string; count: number }>;
  byDayType: { fruit: number; root: number; flower: number; leaf: number };
  recentStreak: number;
}

export interface AddHarvestData {
  plantNameHe: string;
  plantNameEn: string;
  plantId?: string;
  gardenId?: string;
  harvestDate: string;
  quantityGrams?: number;
  quantityUnits?: number;
  quantityType: 'grams' | 'units' | 'kg';
  notes?: string;
}

interface HarvestState {
  harvests: Harvest[];
  total: number;
  stats: HarvestStats | null;
  isLoading: boolean;
  isStatsLoading: boolean;
  offset: number;
  loadHarvests: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  addHarvest: (data: AddHarvestData) => Promise<void>;
  deleteHarvest: (id: string) => Promise<void>;
  loadStats: () => Promise<void>;
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

const LIMIT = 20;

export const useHarvestStore = create<HarvestState>((set, get) => ({
  harvests:       [],
  total:          0,
  stats:          null,
  isLoading:      false,
  isStatsLoading: false,
  offset:         0,

  loadHarvests: async (reset = true) => {
    const token = getToken();
    if (!token) return;
    const offset = reset ? 0 : get().offset;
    set({ isLoading: true });
    try {
      const data = await api.get<{ harvests: Harvest[]; total: number }>(
        `/api/harvests?limit=${LIMIT}&offset=${offset}`,
        token
      );
      set(state => ({
        harvests: reset ? data.harvests : [...state.harvests, ...data.harvests],
        total:    data.total,
        offset:   offset + data.harvests.length,
      }));
    } catch (err: any) {
      console.error('loadHarvests', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { total, harvests, isLoading } = get();
    if (isLoading || harvests.length >= total) return;
    await get().loadHarvests(false);
  },

  addHarvest: async (data) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const harvest = await api.post<Harvest>('/api/harvests', data, token);
    set(state => ({
      harvests: [harvest, ...state.harvests],
      total:    state.total + 1,
    }));
    // Refresh stats
    get().loadStats();
  },

  deleteHarvest: async (id) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    // Optimistic
    set(state => ({
      harvests: state.harvests.filter(h => h.id !== id),
      total:    state.total - 1,
    }));
    try {
      await api.del(`/api/harvests/${id}`, token);
      get().loadStats();
    } catch {
      get().loadHarvests();
    }
  },

  loadStats: async () => {
    const token = getToken();
    if (!token) return;
    set({ isStatsLoading: true });
    try {
      const stats = await api.get<HarvestStats>('/api/harvests/stats', token);
      set({ stats });
    } catch (err: any) {
      console.error('loadStats', err.message);
    } finally {
      set({ isStatsLoading: false });
    }
  },
}));
