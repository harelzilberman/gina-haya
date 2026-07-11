import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

export interface GardenPlant {
  id: string;
  plant_id: string;
  garden_id: string;
  common_name_he: string;
  common_name_en: string;
  notes: string;
  added_at: string;
  // Passport-ish fields — present on the API response, added here so the
  // card grid / add-plant flow can read and write them. All optional
  // because older rows may predate these columns.
  location_type?: string | null;
  location_description?: string | null;
  plant_type?: string | null;
  variety?: string | null;
  sun_exposure?: string | null;
  companions?: string | null;
  soil?: string | null;
  archived_at?: string | null;
}

export interface AddPlantData {
  plantId?: string;
  commonNameHe: string;
  commonNameEn?: string;
  notes?: string;
  locationType?: string;
  locationDescription?: string;
  plantType?: string;
  variety?: string;
  autoIrrigation?: boolean;
  irrigationDays?: number[];
  irrigationTimes?: string[];
}

export interface PatchGardenPlantData {
  sunExposure?: string;
  companions?: string;
  soil?: string;
}

export interface Garden {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  location: string | null;
  location_region: string | null;
  soil_type: string | null;
  notes: string | null;
  is_default: boolean;
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
  updateGarden: (id: string, updates: { name?: string; locationRegion?: string | null; soilType?: string | null; notes?: string | null; location?: string | null; description?: string | null }) => Promise<void>;
  addPlant: (gardenId: string, plantId: string, commonNameHe: string, commonNameEn: string) => Promise<GardenPlant>;
  addPlantDetailed: (gardenId: string, data: AddPlantData) => Promise<GardenPlant>;
  patchGardenPlant: (gardenPlantId: string, gardenId: string, data: PatchGardenPlantData) => Promise<GardenPlant>;
  removePlant: (gardenId: string, plantId: string) => Promise<void>;
  deleteGarden: (gardenId: string) => Promise<void>;
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
      const data = await api.get<Garden[]>('/api/garden', token);
      const currentActive = useGardenStore.getState().activeGarden;
      const activeGarden = currentActive
        ? (data.find(g => g.id === currentActive.id) ?? data[0] ?? null)
        : (data.find(g => g.is_default) ?? data[0] ?? null);
      set({ gardens: data, activeGarden });
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
    const updated = await api.patch<Garden>(`/api/garden/${id}`, updates, token);
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
    const newPlant = await api.post<GardenPlant>(`/api/garden/${gardenId}/plants`, { plantId, commonNameHe, commonNameEn }, token);
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

  // Full add-plant flow (mirrors the app's AddPlantScreen field set). Sends
  // everything POST /api/garden/:id/plants actually accepts; sun_exposure/
  // companions/soil aren't accepted at creation time so callers should
  // follow up with patchGardenPlant() for those.
  addPlantDetailed: async (gardenId, data) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const newPlant = await api.post<GardenPlant>(`/api/garden/${gardenId}/plants`, {
      plantId:              data.plantId,
      commonNameHe:         data.commonNameHe,
      commonNameEn:         data.commonNameEn,
      notes:                data.notes,
      locationType:         data.locationType,
      locationDescription:  data.locationDescription,
      plantType:            data.plantType,
      variety:              data.variety,
      auto_irrigation:      data.autoIrrigation ?? false,
      irrigation_days:      data.irrigationDays,
      irrigation_times:     data.irrigationTimes,
    }, token);
    set(state => {
      const merge = (g: Garden) => ({ ...g, garden_plants: [...g.garden_plants, newPlant] });
      return {
        gardens: state.gardens.map(g => g.id === gardenId ? merge(g) : g),
        activeGarden: state.activeGarden?.id === gardenId ? merge(state.activeGarden) : state.activeGarden,
      };
    });
    return newPlant;
  },

  // Sets fields the creation endpoint doesn't accept (sun_exposure/companions/soil
  // live on garden_plants but only via PATCH /api/garden/garden-plants/:id).
  patchGardenPlant: async (gardenPlantId, gardenId, data) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const { plant } = await api.patch<{ success: boolean; plant: GardenPlant }>(
      `/api/garden/garden-plants/${gardenPlantId}`,
      { sun_exposure: data.sunExposure, companions: data.companions, soil: data.soil },
      token
    );
    set(state => {
      const merge = (g: Garden) => ({
        ...g,
        garden_plants: g.garden_plants.map(p => p.id === gardenPlantId ? { ...p, ...plant } : p),
      });
      return {
        gardens: state.gardens.map(g => g.id === gardenId ? merge(g) : g),
        activeGarden: state.activeGarden?.id === gardenId ? merge(state.activeGarden) : state.activeGarden,
      };
    });
    return plant;
  },

  removePlant: async (gardenId, plantId) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
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
    try {
      await api.del(`/api/garden/${gardenId}/plants/${plantId}`, token);
    } catch {
      get().loadGardens();
    }
  },

  deleteGarden: async (gardenId) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    await api.del(`/api/garden/${gardenId}`, token);
    set(state => {
      const gardens = state.gardens.filter(g => g.id !== gardenId);
      const activeGarden = state.activeGarden?.id === gardenId
        ? (gardens.find(g => g.is_default) ?? gardens[0] ?? null)
        : state.activeGarden;
      return { gardens, activeGarden };
    });
  },
}));
