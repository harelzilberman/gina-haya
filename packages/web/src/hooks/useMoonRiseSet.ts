import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { moonRiseSetForLocalDate, formatTimeInZone } from '@gina-haya/shared';
import { useGardenLocation } from './useGardenLocation';

/**
 * Moonrise / moonset labels for a local date ("YYYY-MM-DD") in `timeZone`,
 * computed (suncalc, packages/shared) from the active garden's coordinates —
 * Israel default coordinates when no garden has a location. A day without a
 * rise or a set gets "Doesn't rise today" / "Doesn't set today".
 */
export function useMoonRiseSet(date: string | null | undefined, timeZone: string) {
  const { t, i18n } = useTranslation('calendar');
  const { coords } = useGardenLocation();
  const locale = i18n.language === 'he' ? 'he-IL' : 'en-US';

  return useMemo(() => {
    if (!date) return null;
    try {
      const { rise, set } = moonRiseSetForLocalDate(date, coords.latitude, coords.longitude, timeZone);
      return {
        rise: rise ? formatTimeInZone(rise, timeZone, locale) : t('moonNoRise'),
        set:  set  ? formatTimeInZone(set, timeZone, locale)  : t('moonNoSet'),
      };
    } catch {
      return null;
    }
  }, [date, coords.latitude, coords.longitude, timeZone, locale, t]);
}
