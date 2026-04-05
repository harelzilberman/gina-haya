import type { ChupChuMessage } from '@gina-haya/shared';
import { apiFetch } from '../config/api';
import { getToken } from './auth';

export async function sendChupChuMessage(
  message: string,
  history: ChupChuMessage[],
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const data = await apiFetch<{ response: string }>('/api/chupchu/chat', token, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return data.response;
}

export async function loadChupChuHistory(): Promise<ChupChuMessage[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    return await apiFetch<ChupChuMessage[]>('/api/chupchu/history', token);
  } catch {
    return [];
  }
}
