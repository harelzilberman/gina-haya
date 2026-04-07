import { useState, useEffect } from 'react';
import type { BiodynamicDay } from '@gina-haya/shared';
import { api } from '../api/client';

export function useToday() {
  const [day, setDay] = useState<BiodynamicDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    api.get<BiodynamicDay>('/api/calendar/today')
      .then(d => {
        console.log('[useToday] received moonPhasePct:', d.moonPhasePct);
        console.log('[useToday] received moonPhaseAngle:', d.moonPhaseAngle);
        setDay(d);
      })
      .catch(err => {
        console.error('[useToday] error:', err.message);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
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
