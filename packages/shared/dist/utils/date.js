"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoneOffsetMinutes = zoneOffsetMinutes;
exports.todayIn = todayIn;
exports.localDateToUTCMidnight = localDateToUTCMidnight;
exports.startOfTodayIn = startOfTodayIn;
exports.startOfCurrentMonthIn = startOfCurrentMonthIn;
exports.todayInIsrael = todayInIsrael;
exports.israelDateToUTCMidnight = israelDateToUTCMidnight;
exports.startOfTodayIsrael = startOfTodayIsrael;
exports.startOfCurrentMonthIsrael = startOfCurrentMonthIsrael;
exports.formatDateHe = formatDateHe;
exports.formatDateEn = formatDateEn;
const calendar_1 = require("../constants/calendar");
// ── Timezone-aware dates ─────────────────────────────────────────────────────
//
// Garden-scoped logic passes the garden's IANA zone; person-scoped logic the
// user's home zone (API: getUserHomeZone). A null/invalid zone falls back to
// Asia/Jerusalem, so callers without a location behave exactly as before.
function zoneOrIsrael(tz) {
    if (typeof tz !== 'string' || !tz.trim())
        return calendar_1.ISRAEL_TIMEZONE;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return tz;
    }
    catch {
        return calendar_1.ISRAEL_TIMEZONE;
    }
}
/**
 * Offset of `timeZone` from UTC at `instantMs`, in minutes
 * (+120 for Israel winter, +330 for India, −300 for New York winter).
 */
function zoneOffsetMinutes(timeZone, instantMs) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(instantMs));
    const get = (type) => Number(parts.find(p => p.type === type)?.value ?? 0);
    const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return Math.round((wallAsUtc - Math.floor(instantMs / 1000) * 1000) / 60000);
}
/** Today's date ("YYYY-MM-DD") in `tz` (null/invalid → Asia/Jerusalem). */
function todayIn(tz, now = new Date()) {
    return now.toLocaleDateString('sv-SE', { timeZone: zoneOrIsrael(tz) });
}
/**
 * UTC ISO timestamp of local midnight at the start of `date` ("YYYY-MM-DD")
 * in `tz`. Works for DST changes and half-hour zones:
 *   localDateToUTCMidnight('2026-09-01', 'Asia/Jerusalem') → '2026-08-31T21:00:00.000Z'
 *   localDateToUTCMidnight('2026-09-01', 'Asia/Kolkata')   → '2026-08-31T18:30:00.000Z'
 */
function localDateToUTCMidnight(date, tz) {
    const zone = zoneOrIsrael(tz);
    const [y, m, d] = date.split('-').map(Number);
    const wallMidnight = Date.UTC(y, m - 1, d);
    // First guess with the offset at local noon, then correct with the offset
    // in force at that instant (matters when DST changes during the night).
    let instant = wallMidnight - zoneOffsetMinutes(zone, wallMidnight + 12 * 3600000) * 60000;
    instant = wallMidnight - zoneOffsetMinutes(zone, instant) * 60000;
    return new Date(instant).toISOString();
}
/** UTC ISO timestamp for the start of today in `tz`. */
function startOfTodayIn(tz) {
    return localDateToUTCMidnight(todayIn(tz), tz);
}
/** UTC ISO timestamp for the start of the current month in `tz`. */
function startOfCurrentMonthIn(tz) {
    return localDateToUTCMidnight(todayIn(tz).slice(0, 7) + '-01', tz);
}
// ── Israel wrappers (kept for existing callers) ──────────────────────────────
/** @deprecated Use todayIn(tz) with the garden's or user's home zone. */
function todayInIsrael() {
    return todayIn(calendar_1.ISRAEL_TIMEZONE);
}
/** @deprecated Use localDateToUTCMidnight(date, tz). */
function israelDateToUTCMidnight(israelDate) {
    return localDateToUTCMidnight(israelDate, calendar_1.ISRAEL_TIMEZONE);
}
/** @deprecated Use startOfTodayIn(tz). */
function startOfTodayIsrael() {
    return startOfTodayIn(calendar_1.ISRAEL_TIMEZONE);
}
/** @deprecated Use startOfCurrentMonthIn(tz). */
function startOfCurrentMonthIsrael() {
    return startOfCurrentMonthIn(calendar_1.ISRAEL_TIMEZONE);
}
/** Long date in Hebrew ("12 בנובמבר 2026") in `tz` (default Asia/Jerusalem). */
function formatDateHe(dateStr, tz = calendar_1.ISRAEL_TIMEZONE) {
    return new Date(dateStr).toLocaleDateString('he-IL', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: zoneOrIsrael(tz),
    });
}
/** Long date in English ("12 November 2026") in `tz` (default Asia/Jerusalem). */
function formatDateEn(dateStr, tz = calendar_1.ISRAEL_TIMEZONE) {
    return new Date(dateStr).toLocaleDateString('en-IL', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: zoneOrIsrael(tz),
    });
}
//# sourceMappingURL=date.js.map