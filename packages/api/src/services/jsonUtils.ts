/**
 * Robustly extracts a JSON object from a Claude API response.
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
  // ([\s\S]*?) is non-greedy so it stops at the FIRST closing fence
  m = s.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```/);
  if (m) return m[1].trim();

  // Pass 3: no fences — slice from the first { to the last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) return s.slice(first, last + 1);

  return s;
}
