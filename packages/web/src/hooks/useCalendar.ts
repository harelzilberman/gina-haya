import { useState, useEffect } from 'react';
import type { BiodynamicDay } from '@gina-haya/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useToday() {
  const [day, setDay] = useState<BiodynamicDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchJSON<BiodynamicDay>(`${API_BASE}/api/calendar/today`)
      .then(setDay)
      .catch(err => setError(err.message))
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
    fetchJSON<BiodynamicDay[]>(`${API_BASE}/api/calendar/week`)
      .then(setDays)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { days, isLoading, error };
}
