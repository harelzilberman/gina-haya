import AsyncStorage from '@react-native-async-storage/async-storage';

const BD_CACHE_PREFIX = 'gina_bd_';
const TASKS_CACHE_KEY = 'gina_tasks_cache';
const JOURNAL_CACHE_KEY = 'gina_journal_cache';

// ── Biodynamic calendar ────────────────────────────────────────────────────

export async function cacheBdDay(date: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`${BD_CACHE_PREFIX}${date}`, JSON.stringify(data));
  } catch { /* ignore */ }
}

export async function getCachedBdDay(date: string): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(`${BD_CACHE_PREFIX}${date}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────

export async function cacheTasks(tasks: unknown[]): Promise<void> {
  try {
    const payload = { tasks: tasks.slice(0, 10), ts: Date.now() };
    await AsyncStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

export async function getCachedTasks(): Promise<unknown[]> {
  try {
    const raw = await AsyncStorage.getItem(TASKS_CACHE_KEY);
    if (!raw) return [];
    const { tasks } = JSON.parse(raw);
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

// ── Journal ───────────────────────────────────────────────────────────────

export async function cacheJournal(entries: unknown[]): Promise<void> {
  try {
    const payload = { entries: entries.slice(0, 5), ts: Date.now() };
    await AsyncStorage.setItem(JOURNAL_CACHE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

export async function getCachedJournal(): Promise<unknown[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_CACHE_KEY);
    if (!raw) return [];
    const { entries } = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}
