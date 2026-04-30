import { useState, useEffect, useRef } from 'react';
import type { BiodynamicDay } from '@gina-haya/shared';
import { api } from '../api/client';

export function useToday() {
  const [day, setDay] = useState<BiodynamicDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const lastFetchedDate = useRef<string | null>(null);

  const fetchToday = () => {
    setIsLoading(true);
    setError(null);
    api.get<BiodynamicDay>('/api/calendar/today')
      .then(d => {
        lastFetchedDate.current = new Date().toISOString().split('T')[0];
        setDay(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  // Fetch on mount and after each midnight tick; schedule next midnight timer
  useEffect(() => {
    fetchToday();

    const now = new Date();
    const israelOffsetMs = 2 * 60 * 60 * 1000;
    const israelNow = new Date(now.getTime() + israelOffsetMs);
    const midnight = new Date(israelNow);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - israelNow.getTime();

    const timer = setTimeout(() => setTick(t => t + 1), msUntilMidnight);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Refetch when returning to a tab on a new calendar day
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentDate = new Date().toISOString().split('T')[0];
        if (lastFetchedDate.current !== currentDate) fetchToday();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { day, isLoading, error };
}

export function useWeek() {
  const [days, setDays] = useState<BiodynamicDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    api.get<BiodynamicDay[]>('/api/calendar/week')
      .then(setDays)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { days, isLoading, error };
}
