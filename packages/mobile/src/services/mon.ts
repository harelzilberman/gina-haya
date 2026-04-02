import type { MonMessage } from '@gina-haya/shared';
import { apiFetch } from '../config/api';
import { getToken } from './auth';

export async function sendMonMessage(
  message: string,
  history: MonMessage[],
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const data = await apiFetch<{ response: string }>('/api/mon/chat', token, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return data.response;
}

export async function loadMonHistory(): Promise<MonMessage[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    return await apiFetch<MonMessage[]>('/api/mon/history', token);
  } catch {
    return [];
  }
}
