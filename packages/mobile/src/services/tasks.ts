import { apiFetch } from '../config/api';
import { getToken } from './auth';
import { cacheTasks, getCachedTasks } from './offline';

export interface PendingTask {
  id: string;
  title: string;
  /** ISO date string (YYYY-MM-DD) from garden_tasks.date */
  date: string;
  /** Alias for date — kept for backward compatibility */
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string;
  status: 'pending' | 'done' | 'skipped';
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

export async function completeTask(taskId: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  await apiFetch(`/api/tasks/${taskId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'done' }),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  await apiFetch(`/api/tasks/${taskId}`, token, { method: 'DELETE' });
}

export async function updateTaskTitle(taskId: string, title: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  await apiFetch(`/api/tasks/${taskId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}
