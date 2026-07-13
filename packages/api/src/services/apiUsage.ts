import { db } from '../db/client';

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Fire-and-forget: insert one row into api_usage for a single Anthropic API call.
 * Failures are logged to console and swallowed — never let logging break a user response.
 */
export async function logApiUsage(params: {
  userId: string | null | undefined;
  endpoint: string;
  model: string;
  usage: AnthropicUsage | null | undefined;
}): Promise<void> {
  try {
    await db.from('api_usage').insert({
      user_id:               params.userId ?? null,
      endpoint:              params.endpoint,
      model:                 params.model,
      input_tokens:          params.usage?.input_tokens          ?? null,
      output_tokens:         params.usage?.output_tokens         ?? null,
      cache_creation_tokens: params.usage?.cache_creation_input_tokens ?? null,
      cache_read_tokens:     params.usage?.cache_read_input_tokens     ?? null,
    });
  } catch (err: any) {
    console.error('[logApiUsage] failed to persist usage data:', err.message);
  }
}
