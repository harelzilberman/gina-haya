import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface GardenPlant {
  id: string;
  plant_id: string;
  garden_id: string;
  common_name_he: string;
  common_name_en: string;
  notes: string;
  added_at: string;
}

export interface Garden {
  id: string;
  user_id: string;
  name: string;
  location_region: string | null;
  soil_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  garden_plants: GardenPlant[];
}

interface GardenState {
  gardens: Garden[];
  activeGarden: Garden | null;
  isLoading: boolean;
  error: string | null;
  loadGardens: () => Promise<void>;
  setActiveGarden: (garden: Garden) => void;
  updateGarden: (id: string, updates: { name?: string; locationRegion?: string | null; soilType?: string | null; notes?: string | null }) => Promise<void>;
  addPlant: (gardenId: string, plantId: string, commonNameHe: string, commonNameEn: string) => Promise<GardenPlant>;
  removePlant: (gardenId: string, plantId: string) => Promise<void>;
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

export const useGardenStore = create<GardenState>((set, get) => ({
  gardens: [],
  activeGarden: null,
  isLoading: false,
  error: null,

  loadGardens: async () => {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/garden`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load gardens');
      const data: Garden[] = await res.json();
      set({ gardens: data, activeGarden: data[0] ?? null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveGarden: (garden) => set({ activeGarden: garden }),

  updateGarden: async (id, updates) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/api/garden/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update garden');
    const updated: Garden = await res.json();
    set(state => ({
      gardens: state.gardens.map(g => g.id === id ? { ...g, ...updated } : g),
      activeGarden: state.activeGarden?.id === id
        ? { ...state.activeGarden, ...updated }
        : state.activeGarden,
    }));
  },

  addPlant: async (gardenId, plantId, commonNameHe, commonNameEn) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/api/garden/${gardenId}/plants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plantId, commonNameHe, commonNameEn }),
    });
    if (!res.ok) throw new Error('Failed to add plant');
    const newPlant: GardenPlant = await res.json();
    set(state => {
      const merge = (g: Garden) => ({
        ...g,
        garden_plants: [...g.garden_plants, newPlant],
      });
      return {
        gardens: state.gardens.map(g => g.id === gardenId ? merge(g) : g),
        activeGarden: state.activeGarden?.id === gardenId
          ? merge(state.activeGarden)
          : state.activeGarden,
      };
    });
    return newPlant;
  },

  removePlant: async (gardenId, plantId) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    // Optimistic update
    const filter = (g: Garden) => ({
      ...g,
      garden_plants: g.garden_plants.filter(p => p.plant_id !== plantId),
    });
    set(state => ({
      gardens: state.gardens.map(g => g.id === gardenId ? filter(g) : g),
      activeGarden: state.activeGarden?.id === gardenId
        ? filter(state.activeGarden)
        : state.activeGarden,
    }));
    const res = await fetch(`${API_BASE}/api/garden/${gardenId}/plants/${plantId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Revert by reloading
      get().loadGardens();
    }
  },
}));
