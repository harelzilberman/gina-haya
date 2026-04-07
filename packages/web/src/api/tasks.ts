import { api } from './client';

export interface GardenTask {
  id: string;
  user_id: string;
  plan_id: string | null;
  date: string;
  title: string;
  type: 'biodynamic' | 'maintenance' | 'custom';
  status: 'pending' | 'done' | 'skipped';
  notes: string | null;
  source_action: string | null;
  created_at: string;
  updated_at: string;
}

export const tasksApi = {
  getWeek: (token: string) =>
    api.get<GardenTask[]>('/api/tasks/week', token),

  getRange: (from: string, to: string, token: string) =>
    api.get<GardenTask[]>(`/api/tasks/range?from=${from}&to=${to}`, token),

  fromPlan: (planId: string | null, tasks: Array<{ date: string; title: string; type: string; source_action?: string }>, token: string) =>
    api.post<GardenTask[]>('/api/tasks/from-plan', { planId, tasks }, token),

  // Auto-build tasks from the server-stored weekly plan (no client synthesis needed)
  fromPlanAuto: (token: string) =>
    api.post<GardenTask[]>('/api/tasks/from-plan', { planId: null }, token),

  updateStatus: (id: string, status: 'pending' | 'done' | 'skipped', token: string, notes?: string) =>
    api.patch<GardenTask>(`/api/tasks/${id}`, { status, notes }, token),

  update: (id: string, updates: { status?: 'pending' | 'done' | 'skipped'; notes?: string | null; date?: string; title?: string }, token: string) =>
    api.patch<GardenTask>(`/api/tasks/${id}`, updates, token),

  reschedule: (id: string, date: string, token: string) =>
    api.patch<GardenTask>(`/api/tasks/${id}`, { date }, token),

  create: (date: string, title: string, token: string, notes?: string, source_action?: string) =>
    api.post<GardenTask>('/api/tasks', { date, title, notes, source_action }, token),

  delete: (id: string, token: string) =>
    api.del<{ ok: boolean }>(`/api/tasks/${id}`, token),
};
