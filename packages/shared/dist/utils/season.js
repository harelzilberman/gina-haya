"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEMISPHERE_LABELS = exports.SEASON_LABELS = void 0;
exports.localDateInZone = localDateInZone;
exports.getGardenSeason = getGardenSeason;
exports.SEASON_LABELS = {
    winter: { he: 'חורף', en: 'winter' },
    spring: { he: 'אביב', en: 'spring' },
    summer: { he: 'קיץ', en: 'summer' },
    autumn: { he: 'סתיו', en: 'autumn' },
};
exports.HEMISPHERE_LABELS = {
    north: { he: 'חצי הכדור הצפוני', en: 'Northern Hemisphere' },
    south: { he: 'חצי הכדור הדרומי', en: 'Southern Hemisphere' },
};
const NORTH_SEASON_BY_MONTH = [
    'winter', 'winter', // Jan, Feb
    'spring', 'spring', 'spring', // Mar–May
    'summer', 'summer', 'summer', // Jun–Aug
    'autumn', 'autumn', 'autumn', // Sep–Nov
    'winter', // Dec
];
const OPPOSITE = {
    winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring',
};
/**
 * Local calendar date ("YYYY-MM-DD") of `date` in `timeZone`.
 * Falls back to UTC when the timezone is missing or not a valid IANA zone.
 */
function localDateInZone(date, timeZone) {
    if (timeZone) {
        try {
            return date.toLocaleDateString('sv-SE', { timeZone });
        }
        catch {
            // invalid zone — fall through to UTC
        }
    }
    return date.toISOString().slice(0, 10);
}
/**
 * Current meteorological season for a garden.
 *
 * @param latitude  Garden latitude; null/undefined/non-finite → null (unknown location).
 * @param date      The instant to evaluate (usually `new Date()`).
 * @param timezone  Garden IANA timezone; the local date decides the month. UTC if absent.
 */
function getGardenSeason(latitude, date, timezone) {
    if (latitude == null || !Number.isFinite(Number(latitude)))
        return null;
    const hemisphere = Number(latitude) >= 0 ? 'north' : 'south';
    const localDate = localDateInZone(date, timezone);
    const month = Number(localDate.slice(5, 7)); // 1–12
    const north = NORTH_SEASON_BY_MONTH[month - 1];
    const season = hemisphere === 'north' ? north : OPPOSITE[north];
    return {
        season,
        hemisphere,
        localDate,
        seasonLabel: exports.SEASON_LABELS[season],
        hemisphereLabel: exports.HEMISPHERE_LABELS[hemisphere],
    };
}
//# sourceMappingURL=season.js.map