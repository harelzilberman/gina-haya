import { useAuthStore } from '../stores/authStore';

export interface PlanLimits {
  maxGardens: number | null;
  maxPlantsPerGarden: number | null;
  maxTrackers: number | null;
  maxChupChuPerMonth: number | null;
  encyclopediaAccess: boolean;
}

const TIER_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxGardens:         1,
    maxPlantsPerGarden: 10,
    maxTrackers:        1,
    maxChupChuPerMonth: 20,
    encyclopediaAccess: false,
  },
  grower: {
    maxGardens:         3,
    maxPlantsPerGarden: 25,
    maxTrackers:        3,
    maxChupChuPerMonth: 50,
    encyclopediaAccess: true,
  },
  gardener_pro: {
    maxGardens:         10,
    maxPlantsPerGarden: null,
    maxTrackers:        10,
    maxChupChuPerMonth: null,
    encyclopediaAccess: true,
  },
  professional: {
    maxGardens:         null,
    maxPlantsPerGarden: null,
    maxTrackers:        null,
    maxChupChuPerMonth: null,
    encyclopediaAccess: true,
  },
};

export const TIER_DISPLAY: Record<string, { he: string; en: string; color: string }> = {
  free:         { he: 'חינם',       en: 'Free',         color: '#9CA3AF' },
  grower:       { he: 'גרואר',      en: 'Grower',       color: '#7DC084' },
  gardener_pro: { he: 'גנן פרו',    en: 'Gardener Pro', color: '#F5C840' },
  professional: { he: 'מקצועי',     en: 'Professional', color: '#60A5FA' },
};

export function usePlanLimit() {
  const { profile } = useAuthStore();
  const tier = profile?.subscription_tier ?? 'free';
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const display = TIER_DISPLAY[tier] ?? TIER_DISPLAY.free;

  return {
    tier,
    limits,
    display,
    isAtTrackerLimit:  (count: number) => limits.maxTrackers !== null && count >= limits.maxTrackers,
    isAtGardenLimit:   (count: number) => limits.maxGardens !== null && count >= limits.maxGardens,
    isAtPlantLimit:    (count: number) => limits.maxPlantsPerGarden !== null && count >= limits.maxPlantsPerGarden,
    canAccessEncyclopedia: limits.encyclopediaAccess,
  };
}
