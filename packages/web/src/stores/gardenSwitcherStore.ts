import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useGardenStore, type Garden } from './gardenStore';
import { useMapStore } from './mapStore';
import { useTrackerStore } from './trackerStore';
import { api } from '../api/client';

const LS_KEY = 'active_garden_id';

export interface CreateGardenData {
  name: string;
  location?: string;
  description?: string;
}

interface GardenSwitcherState {
  gardens: Garden[];
  activeGardenId: string | null;
  isLoading: boolean;
  isSwitching: boolean;

  loadGardens: () => Promise<void>;
  switchGarden: (gardenId: string) => Promise<void>;
  createGarden: (data: CreateGardenData) => Promise<Garden>;
  deleteGarden: (gardenId: string) => Promise<void>;
  setDefaultGarden: (gardenId: string) => Promise<void>;
  initFromAuth: () => Promise<void>;
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

export const useGardenSwitcherStore = create<GardenSwitcherState>((set, get) => ({
  gardens: [],
  activeGardenId: null,
  isLoading: false,
  isSwitching: false,

  loadGardens: async () => {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true });
    try {
      const data = await api.get<Garden[]>('/api/garden', token);
      const { activeGardenId } = get();

      // Determine active garden: current selection → localStorage → is_default → first
      const lsId = localStorage.getItem(LS_KEY);
      const resolvedId =
        (activeGardenId && data.find(g => g.id === activeGardenId)?.id) ||
        (lsId && data.find(g => g.id === lsId)?.id) ||
        data.find(g => g.is_default)?.id ||
        data[0]?.id ||
        null;

      set({ gardens: data, activeGardenId: resolvedId, isLoading: false });

      // Sync gardenStore active garden
      if (resolvedId) {
        const activeGarden = data.find(g => g.id === resolvedId) ?? null;
        if (activeGarden) useGardenStore.setState({ activeGarden, gardens: data });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  switchGarden: async (gardenId: string) => {
    if (get().isSwitching) return;
    console.log('[garden] switching to:', gardenId);
    set({ isSwitching: true, activeGardenId: gardenId });
    localStorage.setItem(LS_KEY, gardenId);

    // Sync gardenStore active garden immediately from cached list
    const { gardens } = get();
    const activeGarden = gardens.find(g => g.id === gardenId) ?? null;
    if (activeGarden) useGardenStore.setState({ activeGarden });

    // Persist to server — non-blocking, best-effort
    const token = getToken();
    if (token) {
      api.patch('/api/users/profile', { activeGardenId: gardenId }, token).catch(() => {});
    }

    try {
      // Reset all stores first so no stale data is visible during load
      useMapStore.getState().reset();
      useTrackerStore.getState().reset();

      // Load map first (critical path — user sees this immediately)
      await useMapStore.getState().loadMap(gardenId);

      // Trackers fire-and-forget after map is ready
      useTrackerStore.getState().loadTrackers(gardenId);
    } finally {
      set({ isSwitching: false });
    }
  },

  createGarden: async (data: CreateGardenData) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const garden = await api.post<Garden>('/api/garden', data, token);
    set(state => ({ gardens: [...state.gardens, garden] }));
    return garden;
  },

  deleteGarden: async (gardenId: string) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    await api.del(`/api/garden/${gardenId}`, token);
    set(state => {
      const gardens = state.gardens.filter(g => g.id !== gardenId);
      const activeGardenId = state.activeGardenId === gardenId
        ? (gardens.find(g => g.is_default)?.id ?? gardens[0]?.id ?? null)
        : state.activeGardenId;
      return { gardens, activeGardenId };
    });

    const { activeGardenId } = get();
    if (activeGardenId) {
      localStorage.setItem(LS_KEY, activeGardenId);
      useMapStore.getState().reset();
      useTrackerStore.getState().reset();
      await useMapStore.getState().loadMap(activeGardenId);
      useTrackerStore.getState().loadTrackers(activeGardenId);
    }
  },

  setDefaultGarden: async (gardenId: string) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    await api.patch(`/api/garden/${gardenId}/set-default`, {}, token);
    set(state => ({
      gardens: state.gardens.map(g => ({ ...g, is_default: g.id === gardenId })),
    }));
  },

  initFromAuth: async () => {
    const token = getToken();
    if (!token) return;
    const profile = useAuthStore.getState().profile;
    const lsId = localStorage.getItem(LS_KEY);
    const preferred = lsId || profile?.active_garden_id || null;
    if (preferred) set({ activeGardenId: preferred });
    await get().loadGardens();
  },
}));
