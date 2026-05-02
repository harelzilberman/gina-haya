import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export interface CreditBalance {
  total: number;
  used: number;
  available: number;
}

export interface Credits {
  analysis: CreditBalance;
  tracker:  CreditBalance;
  garden:   CreditBalance;
}

const EMPTY: Credits = {
  analysis: { total: 0, used: 0, available: 0 },
  tracker:  { total: 0, used: 0, available: 0 },
  garden:   { total: 0, used: 0, available: 0 },
};

export function useCredits() {
  const { session } = useAuthStore();
  const [credits, setCredits] = useState<Credits>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await api.get<Credits>('/api/shop/credits', session.access_token);
      setCredits(data);
    } catch {
      // silently fail — credits just show 0
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { refresh(); }, [refresh]);

  return { credits, loading, refresh };
}
