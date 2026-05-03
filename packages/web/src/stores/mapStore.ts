import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { api } from '../api/client';
import type { ShapeType } from '../data/mapObjects';

// ── Types ────────────────────────────────────────────────────────────────────

export type MapTool =
  | 'select' | 'plant'
  | 'house' | 'fence' | 'wall' | 'pergola' | 'deadzone' | 'walkway'
  | 'fruit-tree' | 'tree'
  | 'pot-rect' | 'pot-round'
  | 'bed' | 'hydroponics' | 'aquaponics' | 'raised-bed' | 'vertical';

export interface PlantPreview {
  plantNameHe: string;
  plantNameEn: string;
  emoji: string;
  spacing: number;
  x: number;
  y: number;
  bedName: string;
}

export interface MapObject {
  id: string;
  type: ShapeType;
  shapeKind: 'polygon' | 'rect' | 'circle';

  // Rect fields (x,y = top-left corner when rotation=0, all in meters)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;   // degrees

  // Polygon fields (meters)
  points?: [number, number][];

  // Circle fields (meters)
  cx?: number;
  cy?: number;
  radius?: number;

  label: string;
  isFruitTree?: boolean;
  fruitTreeName?: string;
  wallHeightM?: number;
  locked?: boolean;
  z?: number;
}

export interface PlantMarker {
  id: string;
  plantNameHe: string;
  plantNameEn: string;
  emoji: string;
  x: number;
  y: number;
  spacing: number;
  notes?: string;
}

export interface MapData {
  objects: MapObject[];
  plants: PlantMarker[];
}

export interface WizardStatus {
  runsUsedThisMonth: number;
  limit: number | null;
  canRun: boolean;
}

interface ActivePlant {
  nameHe: string;
  nameEn: string;
  emoji: string;
  spacing: number;
}

interface MapState {
  mapId: string | null;
  mapData: MapData;
  northAngle: number;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  isDirty: boolean;
  selectedTool: MapTool;
  activePlant: ActivePlant | null;
  selectedObjectId: string | null;
  showSunZones: boolean;
  wizardStatus: WizardStatus | null;
  history: MapData[];
  error: string | null;
  previewPlants: PlantPreview[];

  loadMap: (gardenId?: string) => Promise<void>;
  saveMap: () => Promise<void>;
  createMap: (gardenId?: string) => Promise<void>;
  reset: () => void;

  setTool: (tool: MapTool) => void;
  setActivePlant: (plant: ActivePlant | null) => void;
  selectObject: (id: string | null) => void;
  toggleSunZones: () => void;
  setNorthAngle: (angle: number) => void;

  addObject: (obj: Omit<MapObject, 'id'>) => string;
  updateObject: (id: string, changes: Partial<MapObject>) => void;
  deleteObject: (id: string) => void;

  addPlant: (plant: Omit<PlantMarker, 'id'>) => void;
  updatePlant: (id: string, changes: Partial<PlantMarker>) => void;
  removePlant: (id: string) => void;

  toggleLock: (id: string) => void;
  undo: () => void;
  loadWizardStatus: () => Promise<void>;

  setPreviewPlants: (plants: PlantPreview[]) => void;
  confirmPlantPreview: () => void;
  cancelPlantPreview: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => useMapStore.getState().saveMap(), 800);
}

function getToken() {
  return useAuthStore.getState().session?.access_token;
}

const EMPTY_MAP: MapData = { objects: [], plants: [] };
const MAX_HISTORY = 20;

// ── Store ────────────────────────────────────────────────────────────────────

export const useMapStore = create<MapState>((set, get) => ({
  mapId: null,
  mapData: EMPTY_MAP,
  northAngle: 0,
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  saveError: null,
  isDirty: false,
  selectedTool: 'select',
  activePlant: null,
  selectedObjectId: null,
  showSunZones: false,
  wizardStatus: null,
  history: [],
  error: null,
  previewPlants: [],

  async loadMap(gardenId?: string) {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const url = gardenId ? `/api/map?gardenId=${gardenId}` : '/api/map';
      const data = await api.get<any>(url, token);
      if (!data.exists) {
        set({ isLoading: false, mapId: null, mapData: EMPTY_MAP, northAngle: 0, isDirty: false, history: [] });
        return;
      }
      const md = data.map_data ?? EMPTY_MAP;
      console.log('[mapStore] raw map_data from API — objects:', md.objects?.length ?? 0, ', plants:', md.plants?.length ?? 0);
      console.log('[mapStore] plant coords:', md.plants?.map((p: any) => ({ id: p.id?.slice(0,6), x: p.x, y: p.y })));
      console.log('RAW MAP_DATA ELEMENTS:', JSON.stringify((md.plants ?? []).slice(0, 3), null, 2));
      set({
        mapId: data.id,
        mapData: md,
        northAngle: data.north_angle ?? 0,
        isLoading: false,
        isDirty: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  async saveMap() {
    const token = getToken();
    if (!token) return;
    const { mapId, mapData, northAngle } = get();
    console.log('[mapStore] saveMap — plants being saved:', mapData.plants.map(p => ({ x: p.x, y: p.y, name: p.plantNameHe })));
    set({ isSaving: true });
    try {
      let saved: any;
      if (mapId) {
        saved = await api.patch<any>(`/api/map/${mapId}`, { mapData, northAngle }, token);
      } else {
        saved = await api.post<any>('/api/map', { mapData, northAngle }, token);
        set({ mapId: saved.id });
      }
      set({ isSaving: false, isDirty: false, lastSaved: new Date(), saveError: null });
    } catch (err: any) {
      set({ isSaving: false, saveError: err.message });
    }
  },

  async createMap(gardenId) {
    const token = getToken();
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const saved = await api.post<any>('/api/map', { gardenId, mapData: EMPTY_MAP, northAngle: 0 }, token);
      set({ mapId: saved.id, mapData: EMPTY_MAP, northAngle: 0, isLoading: false, isDirty: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  setTool(tool) { set({ selectedTool: tool, selectedObjectId: null }); },
  setActivePlant(plant) { set({ activePlant: plant }); },
  selectObject(id) { set({ selectedObjectId: id }); },
  toggleSunZones() { set(s => ({ showSunZones: !s.showSunZones })); },
  setNorthAngle(angle) {
    set({ northAngle: ((angle % 360) + 360) % 360, isDirty: true });
    scheduleSave();
  },

  addObject(obj) {
    const newObj: MapObject = { ...obj, id: crypto.randomUUID() };
    set(s => {
      const history = [s.mapData, ...s.history].slice(0, MAX_HISTORY);
      return { mapData: { ...s.mapData, objects: [...s.mapData.objects, newObj] }, history, isDirty: true };
    });
    scheduleSave();
    return newObj.id;
  },

  updateObject(id, changes) {
    set(s => ({
      mapData: { ...s.mapData, objects: s.mapData.objects.map(o => o.id === id ? { ...o, ...changes } : o) },
      isDirty: true,
    }));
    scheduleSave();
  },

  deleteObject(id) {
    set(s => {
      const history = [s.mapData, ...s.history].slice(0, MAX_HISTORY);
      return {
        mapData: { ...s.mapData, objects: s.mapData.objects.filter(o => o.id !== id) },
        selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
        history,
        isDirty: true,
      };
    });
    scheduleSave();
  },

  addPlant(plant) {
    console.log('[mapStore] addPlant x=', plant.x, 'y=', plant.y, 'name=', plant.plantNameHe);
    const newPlant: PlantMarker = { ...plant, id: crypto.randomUUID() };
    set(s => {
      const history = [s.mapData, ...s.history].slice(0, MAX_HISTORY);
      return { mapData: { ...s.mapData, plants: [...s.mapData.plants, newPlant] }, history, isDirty: true };
    });
    scheduleSave();
  },

  updatePlant(id, changes) {
    set(s => ({
      mapData: { ...s.mapData, plants: s.mapData.plants.map(p => p.id === id ? { ...p, ...changes } : p) },
      isDirty: true,
    }));
    scheduleSave();
  },

  removePlant(id) {
    set(s => ({ mapData: { ...s.mapData, plants: s.mapData.plants.filter(p => p.id !== id) }, isDirty: true }));
    scheduleSave();
  },

  toggleLock(id) {
    set(s => ({
      mapData: { ...s.mapData, objects: s.mapData.objects.map(o => o.id === id ? { ...o, locked: !o.locked } : o) },
      isDirty: true,
    }));
    scheduleSave();
  },

  undo() {
    const { history } = get();
    if (history.length === 0) return;
    const [prev, ...rest] = history;
    set({ mapData: prev, history: rest, isDirty: true });
    scheduleSave();
  },

  reset() {
    set({
      mapId: null,
      mapData: EMPTY_MAP,
      northAngle: 0,
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      saveError: null,
      error: null,
      history: [],
      previewPlants: [],
      selectedObjectId: null,
    });
  },

  async loadWizardStatus() {
    const token = getToken();
    if (!token) return;
    try {
      const status = await api.get<WizardStatus>('/api/map/wizard-status', token);
      set({ wizardStatus: status });
    } catch { /* silent */ }
  },

  setPreviewPlants(plants) { set({ previewPlants: plants }); },

  confirmPlantPreview() {
    const { previewPlants } = get();
    if (!previewPlants.length) return;
    const newPlants: PlantMarker[] = previewPlants.map(p => ({
      id: crypto.randomUUID(),
      plantNameHe: p.plantNameHe,
      plantNameEn: p.plantNameEn,
      emoji: p.emoji,
      spacing: p.spacing,
      x: p.x,
      y: p.y,
    }));
    set(s => {
      const history = [s.mapData, ...s.history].slice(0, MAX_HISTORY);
      return {
        mapData: { ...s.mapData, plants: [...s.mapData.plants, ...newPlants] },
        previewPlants: [],
        history,
        isDirty: true,
      };
    });
    scheduleSave();
  },

  cancelPlantPreview() { set({ previewPlants: [] }); },
}));
