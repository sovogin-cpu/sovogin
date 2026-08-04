/**
 * Formats doctor specialty and subspecialty for UI display.
 */
export function formatDoctorSpecialty(
  specialty: string,
  subspecialty?: string | null
): string {
  if (!subspecialty || subspecialty.trim() === "") {
    return specialty;
  }
  return `${specialty} - Subespecialidad en ${subspecialty.trim()}`;
}

/**
 * Normalizes search terms for lower-case accent-insensitive directory searching.
 */
export function normalizeDirectorySearch(term: string): string {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Formats city and office address cleanly for display.
 */
export function buildDoctorDisplayLocation(
  city: string,
  officeAddress?: string | null
): string {
  if (!officeAddress || officeAddress.trim() === "") {
    return city;
  }
  return `${officeAddress.trim()}, ${city}`;
}

/**
 * Validates whether a public email is a valid format without logging or exposing private data.
 */
export function isSafePublicEmail(email?: string | null): boolean {
  if (!email || email.trim() === "") return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Validates whether a public phone contains safe characters for tel: links.
 */
export function isSafePublicPhone(phone?: string | null): boolean {
  if (!phone || phone.trim() === "") return false;
  const trimmed = phone.trim();
  return /^[+0-9\s()\-]{6,20}$/.test(trimmed);
}

/**
 * Normalizes website URLs to safe HTTPS links.
 * Rejects javascript:, data:, and insecure non-HTTP protocols.
 */
export function normalizeWebsiteUrl(url?: string | null): string | null {
  if (!url || url.trim() === "") return null;
  const trimmed = url.trim();

  if (
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:") ||
    trimmed.toLowerCase().startsWith("vbscript:")
  ) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Generates a clean URL slug from a doctor display name for future routing.
 */
export function createDoctorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
