"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todayInIsrael = todayInIsrael;
exports.formatDateHe = formatDateHe;
exports.formatDateEn = formatDateEn;
const calendar_1 = require("../constants/calendar");
function todayInIsrael() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: calendar_1.ISRAEL_TIMEZONE });
}
function formatDateHe(dateStr) {
    return new Date(dateStr).toLocaleDateString('he-IL', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: calendar_1.ISRAEL_TIMEZONE,
    });
}
function formatDateEn(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IL', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: calendar_1.ISRAEL_TIMEZONE,
    });
}
//# sourceMappingURL=date.js.map