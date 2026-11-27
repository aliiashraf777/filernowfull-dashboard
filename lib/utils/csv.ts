// dashboard\lib\utils\csv.ts

/** Excel runs text starting with = + - @ as a formula. A leading quote makes it plain text. */
export const csvSafe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

/** Quotes one CSV cell. */
export const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;