import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export interface PlantSummary {
  id: string;
  common_name_he: string;
  common_name_en: string;
  latin_name: string | null;
  category: string | null;
  day_type_affinity: string[];
  description_he: string;
  description_en: string;
  emoji: string | null;
}

export interface PlantDetail extends PlantSummary {
  companion_plants: string[];
  avoid_plants: string[];
  sowing_months_israel: number[];
  harvest_months_israel: number[];
}

interface Filters {
  search?: string;
  category?: string;
}

export function usePlants(filters: Filters = {}) {
  const { i18n } = useTranslation();
  const [plants, setPlants] = useState<PlantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Debounce search; fire immediately for non-search changes
    const hasSearch = (filters.search ?? '').length > 0;
    const delay = hasSearch ? 300 : 0;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ lang: i18n.language });
        if (filters.search?.trim()) params.set('search', filters.search.trim());
        if (filters.category)       params.set('category', filters.category);

        setPlants(await api.get<PlantSummary[]>(`/api/plants?${params}`));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters.search, filters.category, i18n.language]);

  return { plants, isLoading, error };
}

export async function fetchPlantDetail(id: string): Promise<PlantDetail> {
  return api.get<PlantDetail>(`/api/plants/${id}`);
}
