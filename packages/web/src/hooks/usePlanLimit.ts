import { getLimits } from '@gina-haya/shared';
import { useAuthStore } from '../stores/authStore';

export interface PlanLimits {
  maxGardens: number | null;
  maxPlantsPerGarden: number | null;
  maxTrackers: number | null;
  maxChupChuPerMonth: number | null;
  encyclopediaAccess: boolean;
}

// en display name + badge color per tier (Hebrew name comes from shared getLimits)
const TIER_META: Record<string, { en: string; color: string }> = {
  free:         { en: 'Free',         color: '#9CA3AF' },
  gardener_pro: { en: 'Gardener Pro', color: '#00e5c3' },
  advanced:     { en: 'Advanced',     color: '#56B87A' },
  professional: { en: 'Professional', color: '#60A5FA' },
  owner:        { en: 'Owner',        color: '#FFD700' },
};

const FALLBACK_META = { en: 'Free', color: '#9CA3AF' };

export function getTierDisplay(tier: string): { he: string; en: string; color: string } {
  const meta = TIER_META[tier] ?? FALLBACK_META;
  return { he: getLimits(tier).displayNameHe, en: meta.en, color: meta.color };
}

/** @deprecated Import getTierDisplay() instead */
export const TIER_DISPLAY: Record<string, { he: string; en: string; color: string }> = new Proxy(
  {} as Record<string, { he: string; en: string; color: string }>,
  { get: (_t, key: string) => getTierDisplay(key) },
);

export function usePlanLimit() {
  const { profile } = useAuthStore();
  const tier = profile?.subscription_tier ?? 'free';
  const sharedLimits = getLimits(tier);
  const display = getTierDisplay(tier);

  const limits: PlanLimits = {
    maxGardens:         sharedLimits.maxGardens,
    maxPlantsPerGarden: sharedLimits.maxPlantsPerGarden,
    maxTrackers:        sharedLimits.maxTrackers,
    maxChupChuPerMonth: sharedLimits.maxChupChuPerMonth,
    encyclopediaAccess: sharedLimits.encyclopediaAccess,
  };

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
