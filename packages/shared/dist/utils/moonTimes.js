"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISRAEL_DEFAULT_COORDS = void 0;
exports.moonRiseSetForLocalDate = moonRiseSetForLocalDate;
exports.formatTimeInZone = formatTimeInZone;
const suncalc_1 = __importDefault(require("suncalc"));
const date_1 = require("./date");
const calendarVariant_1 = require("./calendarVariant");
/** Israel default location (Jerusalem) — used when a garden has no coordinates. */
exports.ISRAEL_DEFAULT_COORDS = { latitude: 31.78, longitude: 35.22 };
const HOUR_MS = 3600000;
const RAD = Math.PI / 180;
/** Horizon correction (refraction + semi-diameter), as in suncalc.getMoonTimes. */
const HORIZON = 0.133 * RAD;
/**
 * Moonrise and moonset during the LOCAL day `date` ("YYYY-MM-DD") in `timeZone`
 * at the given coordinates.
 *
 * suncalc.getMoonTimes() always scans from midnight in the runtime's zone (or
 * UTC); this runs the same algorithm (altitude sampled every hour with a
 * quadratic fit through 3 points) from the garden's local midnight to the next
 * local midnight, so it is correct for any zone, including DST days.
 */
function moonRiseSetForLocalDate(date, latitude, longitude, timeZone) {
    const zone = (0, calendarVariant_1.isValidIanaTimeZone)(timeZone) ? timeZone : calendarVariant_1.DEFAULT_CALENDAR_TIMEZONE;
    const start = Date.parse((0, date_1.localDateToUTCMidnight)(date, zone));
    const [y, m, d] = date.split('-').map(Number);
    const nextDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    const end = Date.parse((0, date_1.localDateToUTCMidnight)(nextDate, zone));
    const hours = Math.max(1, Math.round((end - start) / HOUR_MS));
    const alt = (h) => suncalc_1.default.getMoonPosition(new Date(start + h * HOUR_MS), latitude, longitude).altitude - HORIZON;
    let rise = null;
    let set = null;
    let h0 = alt(0);
    let ye = 0;
    // Two hours per step: fit a parabola through h0 (i−1), h1 (i), h2 (i+1).
    for (let i = 1; i <= hours; i += 2) {
        const h1 = alt(i);
        const h2 = alt(Math.min(i + 1, hours));
        const a = (h0 + h2) / 2 - h1;
        const b = (h2 - h0) / 2;
        const xe = -b / (2 * a);
        ye = (a * xe + b) * xe + h1;
        const disc = b * b - 4 * a * h1;
        let roots = 0;
        let x1 = 0;
        let x2 = 0;
        if (disc >= 0) {
            const dx = Math.sqrt(disc) / (Math.abs(a) * 2);
            x1 = xe - dx;
            x2 = xe + dx;
            if (Math.abs(x1) <= 1)
                roots++;
            if (Math.abs(x2) <= 1)
                roots++;
            if (x1 < -1)
                x1 = x2;
        }
        if (roots === 1) {
            if (h0 < 0)
                rise = i + x1;
            else
                set = i + x1;
        }
        else if (roots === 2) {
            rise = i + (ye < 0 ? x2 : x1);
            set = i + (ye < 0 ? x1 : x2);
        }
        if (rise !== null && set !== null)
            break;
        h0 = h2;
    }
    const toDate = (h) => h === null || h < 0 || h > hours ? null : new Date(start + h * HOUR_MS);
    const riseAt = toDate(rise);
    const setAt = toDate(set);
    const none = riseAt === null && setAt === null;
    return {
        rise: riseAt,
        set: setAt,
        alwaysUp: none && ye > 0,
        alwaysDown: none && ye <= 0,
    };
}
/** "HH:MM" for an instant in `timeZone` (24-hour for he, locale default otherwise). */
function formatTimeInZone(instant, timeZone, locale) {
    const zone = (0, calendarVariant_1.isValidIanaTimeZone)(timeZone) ? timeZone : calendarVariant_1.DEFAULT_CALENDAR_TIMEZONE;
    return instant.toLocaleTimeString(locale, { timeZone: zone, hour: '2-digit', minute: '2-digit' });
}
//# sourceMappingURL=moonTimes.js.map