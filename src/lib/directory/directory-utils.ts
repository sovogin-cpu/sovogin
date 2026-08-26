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
 * Sanitizes search terms for safe use inside PostgREST .or() filter expressions.
 * Removes commas, parentheses, quotes, and control symbols that could break PostgREST AST parsing.
 */
export function sanitizePostgrestSearchTerm(term: string): string {
  if (!term || typeof term !== "string") return "";
  return term
    .replace(/[,()'"%_\\]/g, " ")
    .replace(/\s+/g, " ")
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
 * Formats city, department, and country for display.
 */
export function buildFullLocationString(
  city: string,
  department?: string | null,
  country?: string | null
): string {
  const parts: string[] = [city];
  if (department && department.trim() !== "") {
    parts.push(department.trim());
  }
  if (country && country.trim() !== "") {
    parts.push(country.trim());
  }
  return parts.join(", ");
}

/**
 * Validates whether a string is a standard UUID (v4/v1).
 */
export function isUUID(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val.trim()
  );
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
 * Generates a safe WhatsApp URL (https://wa.me/...) for professional contact.
 * Respects international country codes (+...) or defaults to Colombia (57) for 10-digit numbers.
 */
export function buildWhatsAppUrl(
  phone?: string | null,
  country?: string | null
): string | null {
  if (!phone || phone.trim() === "") return null;
  const trimmed = phone.trim();

  // If already starts with explicit plus and international code (+1..., +34..., +57...)
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 7 ? `https://wa.me/${digits}` : null;
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  if (digitsOnly.length < 7) return null;

  // 10 digits starting with 3 (Colombian mobile format)
  if (digitsOnly.length === 10 && digitsOnly.startsWith("3")) {
    if (country && country.trim() !== "" && country.trim().toLowerCase() !== "colombia") {
      return `https://wa.me/${digitsOnly}`;
    }
    return `https://wa.me/57${digitsOnly}`;
  }

  return `https://wa.me/${digitsOnly}`;
}

/**
 * Normalizes website URLs to safe HTTPS links.
 * Rejects javascript:, data:, file:, and insecure non-HTTP protocols.
 */
export function normalizeWebsiteUrl(url?: string | null): string | null {
  if (!url || url.trim() === "") return null;
  const trimmed = url.trim();

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
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
