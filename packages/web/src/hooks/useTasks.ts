import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { tasksApi, type GardenTask } from '../api/tasks';

export function useTasks() {
  const { session } = useAuthStore();
  const token = session?.access_token;
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await tasksApi.getWeek(token);
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const updateStatus = useCallback(async (id: string, status: 'pending' | 'done' | 'skipped') => {
    if (!token) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    try {
      await tasksApi.updateStatus(id, status, token);
    } catch (e) {
      loadTasks();
    }
  }, [token, loadTasks]);

  const addTask = useCallback(async (date: string, title: string) => {
    if (!token) return;
    const task = await tasksApi.create(date, title, token);
    setTasks(prev => [...prev, task]);
  }, [token]);

  const deleteTask = useCallback(async (id: string) => {
    if (!token) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await tasksApi.delete(id, token);
  }, [token]);

  return { tasks, isLoading, loadTasks, updateStatus, addTask, deleteTask };
}
