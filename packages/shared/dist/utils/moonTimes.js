"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISRAEL_DEFAULT_COORDS = void 0;
exports.moonRiseSetForLocalDate = moonRiseSetForLocalDate;
exports.formatTimeInZone = formatTimeInZone;
exports.moonBrightLimbAngleAt = moonBrightLimbAngleAt;
exports.moonDisplayAngle = moonDisplayAngle;
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
const MINUTE_MS = 60000;
const TRANSIT_STEP_MS = 10 * MINUTE_MS;
/** Longer than one lunar day (~24 h 50 m), so a sampled window always holds a transit. */
const TRANSIT_SEARCH_MS = 26 * HOUR_MS;
function moonAltitude(ms, latitude, longitude) {
    return suncalc_1.default.getMoonPosition(new Date(ms), latitude, longitude).altitude;
}
/**
 * The first upper transit (local maximum of the moon's altitude) after `fromMs`:
 * sampled every 10 minutes, then refined by ternary search to well under a minute.
 */
function nextUpperTransit(fromMs, latitude, longitude) {
    const alt = (ms) => moonAltitude(ms, latitude, longitude);
    const steps = Math.ceil(TRANSIT_SEARCH_MS / TRANSIT_STEP_MS);
    let prev = alt(fromMs);
    let cur = alt(fromMs + TRANSIT_STEP_MS);
    for (let i = 2; i <= steps; i++) {
        const t = fromMs + i * TRANSIT_STEP_MS;
        const next = alt(t);
        if (cur >= prev && cur > next) {
            let a = t - 2 * TRANSIT_STEP_MS;
            let b = t;
            for (let k = 0; k < 30; k++) {
                const m1 = a + (b - a) / 3;
                const m2 = b - (b - a) / 3;
                if (alt(m1) < alt(m2))
                    a = m1;
                else
                    b = m2;
            }
            return (a + b) / 2;
        }
        prev = cur;
        cur = next;
    }
    return fromMs; // not reached: every 26 h window contains an upper transit
}
/** Zenith angle of the bright limb at an instant (suncalc: illumination.angle − parallacticAngle). */
function moonBrightLimbAngleAt(instant, latitude, longitude) {
    const chi = suncalc_1.default.getMoonIllumination(instant).angle;
    const q = suncalc_1.default.getMoonPosition(instant, latitude, longitude).parallacticAngle;
    const a = (chi - q) % (2 * Math.PI);
    return a < 0 ? a + 2 * Math.PI : a;
}
/** Sun altitude below which it counts as dark: civil twilight (−6°). */
const CIVIL_DARK = -6 * RAD;
const NIGHT_STEP_MS = 5 * MINUTE_MS;
/**
 * The moment the moon is highest while the sky is dark (sun below −6°) during
 * the night after `date` — from that date's sunset to the next sunrise, i.e.
 * the dark part of local noon `date` → local noon `date + 1`. Sampled every
 * 5 minutes, refined by ternary search when the peak is inside the dark span.
 * Null when the moon never clears the horizon in darkness (around new moon)
 * or there is no darkness at all (polar summer).
 */
function bestDarkMoment(date, zone, latitude, longitude) {
    const start = Date.parse((0, date_1.localDateToUTCMidnight)(date, zone)) + 12 * HOUR_MS;
    const steps = Math.round(24 * HOUR_MS / NIGHT_STEP_MS);
    const isDark = (ms) => suncalc_1.default.getPosition(new Date(ms), latitude, longitude).altitude < CIVIL_DARK;
    const alt = (ms) => moonAltitude(ms, latitude, longitude);
    let bestMs = null;
    let bestAlt = -Infinity;
    for (let i = 0; i <= steps; i++) {
        const t = start + i * NIGHT_STEP_MS;
        if (!isDark(t))
            continue;
        const a = alt(t);
        if (a > bestAlt) {
            bestAlt = a;
            bestMs = t;
        }
    }
    if (bestMs === null || bestAlt <= HORIZON)
        return null;
    // Refine only when both neighbours are dark too (peak not at dusk/dawn).
    const lo = bestMs - NIGHT_STEP_MS;
    const hi = bestMs + NIGHT_STEP_MS;
    if (isDark(lo) && isDark(hi)) {
        let a = lo;
        let b = hi;
        for (let k = 0; k < 25; k++) {
            const m1 = a + (b - a) / 3;
            const m2 = b - (b - a) / 3;
            if (alt(m1) < alt(m2))
                a = m1;
            else
                b = m2;
        }
        const refined = (a + b) / 2;
        if (alt(refined) > bestAlt)
            bestMs = refined;
    }
    return bestMs;
}
/**
 * How the moon is oriented in the sky for the LOCAL day `date` ("YYYY-MM-DD")
 * at a location — the angle at which to draw the lit side.
 *
 * The instant used:
 *   • today (in `timeZone`): now, if the moon is above the horizon;
 *   • otherwise (and for any other date): the moment of maximum moon altitude
 *     while the sun is below −6° during that date's night (sunset → next
 *     sunrise); if the moon is never up in darkness that night (around new
 *     moon), the moon's upper transit after local noon.
 */
function moonDisplayAngle(date, latitude, longitude, timeZone, now = new Date()) {
    const zone = (0, calendarVariant_1.isValidIanaTimeZone)(timeZone) ? timeZone : calendarVariant_1.DEFAULT_CALENDAR_TIMEZONE;
    let atMs;
    if (date === (0, calendarVariant_1.localTodayISO)(zone, now) && moonAltitude(now.getTime(), latitude, longitude) > HORIZON) {
        atMs = now.getTime();
    }
    else {
        const localNoon = Date.parse((0, date_1.localDateToUTCMidnight)(date, zone)) + 12 * HOUR_MS;
        atMs = bestDarkMoment(date, zone, latitude, longitude)
            ?? nextUpperTransit(localNoon, latitude, longitude);
    }
    const at = new Date(atMs);
    return {
        angleRad: moonBrightLimbAngleAt(at, latitude, longitude),
        at,
        atLocalTime: at.toLocaleTimeString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }),
    };
}
//# sourceMappingURL=moonTimes.js.map