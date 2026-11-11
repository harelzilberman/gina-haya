import { useState, useEffect, useRef } from 'react';
import type { BiodynamicDay } from '@gina-haya/shared';
import { api } from '../api/client';
import { useCalendarZone, withZone, zoneToday, msUntilLocalMidnight } from './useCalendarZone';

/**
 * Today's biodynamic day for the active garden's timezone/hemisphere
 * (or the browser's timezone when there is no garden). Refetches at the
 * zone's local midnight and when the tab returns on a new local day.
 */
export function useToday() {
  const zone = useCalendarZone();
  const [day, setDay] = useState<BiodynamicDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const lastFetchedDate = useRef<string | null>(null);

  const fetchToday = () => {
    setIsLoading(true);
    setError(null);
    api.get<BiodynamicDay>(withZone('/api/calendar/today', zone), zone.token)
      .then(d => {
        lastFetchedDate.current = zoneToday(zone);
        setDay(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  // Fetch on mount / zone change and after each local-midnight tick.
  useEffect(() => {
    if (!zone.ready) return;
    fetchToday();
    const timer = setTimeout(() => setTick(t => t + 1), msUntilLocalMidnight(zone.timezone));
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, zone.ready, zone.query, zone.timezone]);

  // Refetch when returning to a tab on a new local day
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && zone.ready) {
        if (lastFetchedDate.current !== zoneToday(zone)) fetchToday();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.ready, zone.query, zone.timezone]);

  return { day, isLoading, error, timezone: zone.timezone, hemisphere: zone.hemisphere };
}

/** Next 7 days (from local today) for the active garden's zone. */
export function useWeek() {
  const zone = useCalendarZone();
  const [days, setDays] = useState<BiodynamicDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zone.ready) return;
    setIsLoading(true);
    setError(null);
    api.get<BiodynamicDay[]>(withZone('/api/calendar/week', zone), zone.token)
      .then(setDays)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.ready, zone.query]);

  return { days, isLoading, error };
}
