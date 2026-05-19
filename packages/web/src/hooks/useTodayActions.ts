import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

export interface MatchingPlant {
  plantNameHe: string;
  plantNameEn: string;
  emoji: string;
  gardenName: string;
  action: string;
}

export interface NonMatchingPlant {
  plantNameHe: string;
  plantNameEn: string;
  emoji: string;
}

export interface TrackerAlert {
  plantNameHe: string;
  plantNameEn: string;
  lastAnalysisDaysAgo: number | null;
}

export interface TodayActionsData {
  dayType: string;
  score: number | null;
  ascending: boolean;
  nodeActive: boolean;
  matchingPlants: MatchingPlant[];
  nonMatchingPlants: NonMatchingPlant[];
  trackerAlerts: TrackerAlert[];
  hasGardenData: boolean;
}

export function useTodayActions(): { data: TodayActionsData | null; loading: boolean } {
  const { session } = useAuthStore();
  const [data, setData] = useState<TodayActionsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    setLoading(true);
    api.get<TodayActionsData>('/api/dashboard/today-actions', session.access_token)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.access_token]);

  return { data, loading };
}
