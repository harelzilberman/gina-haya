import type { GardenTask } from '../../api/tasks';

// ── Shared look of the biodynamic calendar page (grid + day panel) ──────────

export const EARTH = '#050d0a';
export const GOLD  = '#00e5c3';
export const PARCH = '#b0cfbf';
export const NIGHT_CARD = '#111f18';
export const TEXT = '#e8f5ee';
export const FRANK = '"Frank Ruhl Libre", Georgia, serif';

export const TYPE_CONFIG = {
  biodynamic:  { emoji: '🌙', label: 'biodynamic',  color: '#4A9C68' },
  maintenance: { emoji: '🔧', label: 'maintenance', color: '#C8A040' },
  custom:      { emoji: '✏️', label: 'custom',      color: '#C884C8' },
};

export const DAY_TYPE_STYLES: Record<string, { bg: string; color: string; emoji: string; labelKey: string }> = {
  fruit:  { bg: 'rgba(239,116,90,0.18)',  color: '#EF745A', emoji: '🍎', labelKey: 'dayTypes.fruit'  },
  root:   { bg: 'rgba(181,136,99,0.18)',  color: '#B58863', emoji: '🥕', labelKey: 'dayTypes.root'   },
  flower: { bg: 'rgba(196,132,200,0.18)', color: '#C884C8', emoji: '🌸', labelKey: 'dayTypes.flower' },
  leaf:   { bg: 'rgba(74,156,104,0.18)',  color: '#4A9C68', emoji: '🌿', labelKey: 'dayTypes.leaf'   },
};

export const DAY_TYPE_DESCS_HE: Record<string, string> = {
  fruit:  'קטיף פירות, זריעת פירות וזרעים',
  root:   'עיבוד קרקע, שתילת שורשים, קטיף שורשים',
  flower: 'קטיף פרחים, ייבוש צמחים',
  leaf:   'השקיה, דישון עלים, קטיף עלים',
};

export type TaskSource = 'biodynamic' | 'weekly_plan' | 'growing_tracker' | 'manual';

export function getTaskSource(task: GardenTask): TaskSource {
  if (task.type === 'biodynamic' || task.source_action === 'prep500' || task.source_action === 'prep501') {
    return 'biodynamic';
  }
  if (task.source_action === 'growing_tracker') return 'growing_tracker';
  if (task.plan_id) return 'weekly_plan';
  return 'manual';
}

export const SOURCE_STYLES = {
  biodynamic: {
    bg: 'rgba(55,138,221,0.12)', border: 'rgba(55,138,221,0.3)',
    badgeBg: 'rgba(55,138,221,0.2)', badgeColor: '#85B7EB',
    icon: '🌙', labelKey: 'sources.biodynamic',
  },
  weekly_plan: {
    bg: 'rgba(127,119,221,0.12)', border: 'rgba(127,119,221,0.3)',
    badgeBg: 'rgba(127,119,221,0.2)', badgeColor: '#AFA9EC',
    icon: '✨', labelKey: 'sources.weekly_plan',
  },
  growing_tracker: {
    bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.3)',
    badgeBg: 'rgba(29,158,117,0.2)', badgeColor: '#5DCAA5',
    icon: '🌱', labelKey: 'sources.growing_tracker',
  },
  manual: {
    bg: 'rgba(186,117,23,0.12)', border: 'rgba(186,117,23,0.3)',
    badgeBg: 'rgba(186,117,23,0.2)', badgeColor: '#EF9F27',
    icon: '✋', labelKey: 'sources.manual',
  },
} as const;

export function priorityColorOf(task: GardenTask): string | undefined {
  return task.source_action === 'high'   ? '#EF745A'
       : task.source_action === 'medium' ? GOLD
       : task.source_action === 'low'    ? '#4A9C68'
       : undefined;
}

export function moonEmoji(pct: number, isWaxing: boolean): string {
  if (isWaxing) {
    if (pct <= 2)  return '🌑';
    if (pct <= 48) return '🌒';
    if (pct <= 52) return '🌓';
    if (pct <= 97) return '🌔';
    return '🌕';
  }
  if (pct <= 2)  return '🌑';
  if (pct <= 48) return '🌘';
  if (pct <= 52) return '🌗';
  if (pct <= 97) return '🌖';
  return '🌕';
}

/** "YYYY-MM-DD" is the garden's local date: format it as a pure date (UTC). */
export function formatLocalDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString(locale, { ...opts, timeZone: 'UTC' });
}
