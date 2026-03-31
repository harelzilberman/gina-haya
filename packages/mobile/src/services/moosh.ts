import type { MooshMessage } from '@gina-haya/shared';
import { apiFetch } from '../config/api';
import { getToken } from './auth';

export async function sendMooshMessage(
  message: string,
  history: MooshMessage[],
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const data = await apiFetch<{ response: string }>('/api/moosh/chat', token, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return data.response;
}

export async function loadMooshHistory(): Promise<MooshMessage[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    return await apiFetch<MooshMessage[]>('/api/moosh/history', token);
  } catch {
    return [];
  }
}
