import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlantInBed {
  instanceId: string;
  plantId: string;
  nameHe: string;
  emoji: string;
  spacingCm: number;
}

export interface Bed {
  id: string;
  name: string;
  /** position in garden-units (1 unit = 10 cm, so 10 = 1 m) */
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  plants: PlantInBed[];
}

export interface MapData {
  /** garden width in full meters */
  widthM: number;
  /** garden height in full meters */
  heightM: number;
  beds: Bed[];
}

interface MapStore {
  mapId: string | null;
  map: MapData;
  selectedBedId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;

  loadMap: () => Promise<void>;
  saveMap: () => Promise<void>;

  addBed: (bed: Omit<Bed, 'id' | 'plants'>) => string;
  updateBed: (id: string, updates: Partial<Omit<Bed, 'id' | 'plants'>>) => void;
  deleteBed: (id: string) => void;
  selectBed: (id: string | null) => void;

  addPlantToBed: (bedId: string, plant: Omit<PlantInBed, 'instanceId'>) => void;
  removePlantFromBed: (bedId: string, instanceId: string) => void;

  setMapSize: (widthM: number, heightM: number) => void;
}

// ── Debounced auto-save ──────────────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => useMapStore.getState().saveMap(), 1500);
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

// ── Store ────────────────────────────────────────────────────────────────────

const DEFAULT_MAP: MapData = { widthM: 10, heightM: 8, beds: [] };

export const useMapStore = create<MapStore>((set, get) => ({
  mapId: null,
  map: DEFAULT_MAP,
  selectedBedId: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,

  // ── loadMap ──────────────────────────────────────────────────────────────
  async loadMap() {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<any>('/api/map', token);
      set({
        mapId: data.id ?? null,
        map: {
          widthM:  data.width_m  ?? 10,
          heightM: data.height_m ?? 8,
          beds:    (data.beds    ?? []) as Bed[],
        },
        isLoading: false,
        isDirty: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  // ── saveMap ──────────────────────────────────────────────────────────────
  async saveMap() {
    const token = getToken();
    if (!token) return;
    const { map, mapId } = get();
    set({ isSaving: true });
    try {
      const saved = await api.post<any>('/api/map', {
        id:       mapId ?? undefined,
        width_m:  map.widthM,
        height_m: map.heightM,
        beds:     map.beds,
      }, token);
      set({ isSaving: false, isDirty: false, mapId: saved.id ?? mapId });
    } catch (err: any) {
      set({ isSaving: false, error: err.message });
    }
  },

  // ── addBed ───────────────────────────────────────────────────────────────
  addBed(bed) {
    const newBed: Bed = { ...bed, id: crypto.randomUUID(), plants: [] };
    set(s => ({ map: { ...s.map, beds: [...s.map.beds, newBed] }, isDirty: true }));
    scheduleSave();
    return newBed.id;
  },

  // ── updateBed ────────────────────────────────────────────────────────────
  updateBed(id, updates) {
    set(s => ({
      map: {
        ...s.map,
        beds: s.map.beds.map(b => (b.id === id ? { ...b, ...updates } : b)),
      },
      isDirty: true,
    }));
    scheduleSave();
  },

  // ── deleteBed ────────────────────────────────────────────────────────────
  deleteBed(id) {
    set(s => ({
      map: { ...s.map, beds: s.map.beds.filter(b => b.id !== id) },
      selectedBedId: s.selectedBedId === id ? null : s.selectedBedId,
      isDirty: true,
    }));
    scheduleSave();
  },

  // ── selectBed ────────────────────────────────────────────────────────────
  selectBed(id) {
    set({ selectedBedId: id });
  },

  // ── addPlantToBed ────────────────────────────────────────────────────────
  addPlantToBed(bedId, plant) {
    const item: PlantInBed = { ...plant, instanceId: crypto.randomUUID() };
    set(s => ({
      map: {
        ...s.map,
        beds: s.map.beds.map(b =>
          b.id === bedId ? { ...b, plants: [...b.plants, item] } : b
        ),
      },
      isDirty: true,
    }));
    scheduleSave();
  },

  // ── removePlantFromBed ───────────────────────────────────────────────────
  removePlantFromBed(bedId, instanceId) {
    set(s => ({
      map: {
        ...s.map,
        beds: s.map.beds.map(b =>
          b.id === bedId
            ? { ...b, plants: b.plants.filter(p => p.instanceId !== instanceId) }
            : b
        ),
      },
      isDirty: true,
    }));
    scheduleSave();
  },

  // ── setMapSize ────────────────────────────────────────────────────────────
  setMapSize(widthM, heightM) {
    set(s => ({
      map: { ...s.map, widthM, heightM },
      isDirty: true,
    }));
    scheduleSave();
  },
}));
