// index 0 = Sunday … index 6 = Saturday. Matches irrigation_days in the DB,
// the Flutter client, and chupchu.ts DAY_HE.
// Written as escapes deliberately: Hebrew literals in this array have already
// been silently reversed once by an RTL-aware editor. Do not "clean this up".
export const DAY_LETTERS_HE = [
  '\u05D0', // א  Sunday
  '\u05D1', // ב  Monday
  '\u05D2', // ג  Tuesday
  '\u05D3', // ד  Wednesday
  '\u05D4', // ה  Thursday
  '\u05D5', // ו  Friday
  '\u05E9', // ש  Saturday
] as const;
