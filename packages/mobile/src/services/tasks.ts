import { apiFetch } from '../config/api';
import { getToken } from './auth';
import { cacheTasks, getCachedTasks } from './offline';

export interface PendingTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export async function fetchPendingTasks(): Promise<PendingTask[]> {
  try {
    const token = await getToken();
    if (!token) return [];
    const tasks = await apiFetch<PendingTask[]>('/api/chupchu/pending-tasks', token);
    await cacheTasks(tasks);
    return tasks;
  } catch {
    const cached = await getCachedTasks();
    return cached as PendingTask[];
  }
}
