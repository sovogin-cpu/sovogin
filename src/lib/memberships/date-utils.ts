/**
 * Utility functions for formatting PostgreSQL DATE columns (YYYY-MM-DD)
 * preserving calendar day without UTC timezone shifts.
 */

/**
 * Parses a plain DATE string (YYYY-MM-DD) into a local Date object.
 * Avoids new Date("YYYY-MM-DD") UTC midnight shift to previous day in negative timezones.
 */
export function parseMembershipDateOnly(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const clean = String(dateStr).trim().substring(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

/**
 * Formats a plain DATE string (YYYY-MM-DD) in Spanish long format.
 * Example: "2026-09-01" -> "1 de septiembre de 2026"
 */
export function formatMembershipDateOnly(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return "";
  const d = parseMembershipDateOnly(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES", options || {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formats a plain DATE string (YYYY-MM-DD) in Spanish short numeric format.
 * Example: "2026-09-01" -> "01/09/2026"
 */
export function formatMembershipDateOnlyShort(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "";
  const d = parseMembershipDateOnly(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
