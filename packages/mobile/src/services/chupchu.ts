import type { ChupChuMessage } from '@gina-haya/shared';
import { apiFetch } from '../config/api';
import { getToken } from './auth';

export interface MobileToolCall {
  name: 'create_journal_entry' | 'create_task' | 'add_map_marker' | 'log_bd_prep';
  params: Record<string, unknown>;
  descriptionHe: string;
}

export interface ChupChuResponse {
  response: string;
  mobileTool?: MobileToolCall;
}

export async function sendChupChuMessage(
  message: string,
  history: ChupChuMessage[],
): Promise<ChupChuResponse> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const data = await apiFetch<{ response: string; mobileTool?: MobileToolCall }>(
    '/api/chupchu/chat',
    token,
    {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    },
  );
  return { response: data.response, mobileTool: data.mobileTool };
}

export async function executeTool(payload: {
  tool_name: string;
  params: Record<string, unknown>;
}): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  await apiFetch('/api/chupchu/execute-tool', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadJournalPhoto(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  const data = await apiFetch<{ url: string }>('/api/chupchu/upload-journal-photo', token, {
    method: 'POST',
    body: JSON.stringify({ base64, mimeType }),
  });
  return data.url;
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
