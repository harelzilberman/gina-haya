/**
 * Robustly extracts a JSON string from a Claude API response.
 *
 * Claude sometimes wraps its response in markdown code fences even when
 * instructed not to. This function handles all known variants:
 *   - Bare JSON
 *   - ```json\n...\n```
 *   - ``` \n...\n```
 *   - Prose before/after a fence block
 */
export function extractJson(text: string): string {
  const s = text.trim();

  // Pass 1: the entire response is one fence block (nothing before or after)
  let m = s.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```\s*$/);
  if (m) return m[1].trim();

  // Pass 2: a fence block exists somewhere inside the response
  m = s.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```/);
  if (m) return m[1].trim();

  // Pass 3: no fences — slice from the first { to the last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) return s.slice(first, last + 1);

  return s;
}

/**
 * Robustly extracts and parses JSON from a Claude API response.
 * Handles markdown fences, leading/trailing prose, and partial wrapping.
 */
export function extractAndParseJson(text: string): any {
  // Strip markdown code fences
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Find JSON object between first { and last }
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(cleaned.substring(objStart, objEnd + 1));
    } catch {}
  }

  // Find JSON array between first [ and last ]
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(cleaned.substring(arrStart, arrEnd + 1));
    } catch {}
  }

  throw new Error(`Failed to parse Claude response as JSON: ${text.substring(0, 200)}`);
}
