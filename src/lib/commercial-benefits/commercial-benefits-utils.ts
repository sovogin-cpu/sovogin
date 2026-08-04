import { CommercialBenefitValidityStatus } from "./types";

/**
 * Normalize and validate external or internal link URLs for commercial benefits.
 * Rejects dangerous protocols (javascript:, data:, vbscript:).
 * Allows internal routes starting with '/' or secure HTTPS / HTTP URLs.
 */
export function normalizeCommercialBenefitUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Determine if a commercial benefit is currently valid based on active status and validity dates.
 */
export function isCommercialBenefitCurrentlyValid(
  startsAt?: string | null,
  endsAt?: string | null,
  isActive: boolean = true
): boolean {
  if (!isActive) return false;

  const now = new Date();
  if (startsAt) {
    const start = new Date(startsAt);
    if (now < start) return false;
  }

  if (endsAt) {
    const end = new Date(endsAt);
    if (now > end) return false;
  }

  return true;
}

/**
 * Get validity status category for filtering and badges: "current" | "upcoming" | "expired" | "undated".
 */
export function getCommercialBenefitValidityStatus(
  startsAt?: string | null,
  endsAt?: string | null
): CommercialBenefitValidityStatus {
  if (!startsAt && !endsAt) {
    return "undated";
  }

  const now = new Date();

  if (startsAt) {
    const start = new Date(startsAt);
    if (now < start) {
      return "upcoming";
    }
  }

  if (endsAt) {
    const end = new Date(endsAt);
    if (now > end) {
      return "expired";
    }
  }

  return "current";
}

/**
 * Format human-readable validity text for UI badges and card summaries.
 */
export function formatCommercialBenefitValidity(
  startsAt?: string | null,
  endsAt?: string | null
): string {
  if (!startsAt && !endsAt) {
    return "Vigencia permanente";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (startsAt && endsAt) {
    const startStr = new Date(startsAt).toLocaleDateString("es-CO", options);
    const endStr = new Date(endsAt).toLocaleDateString("es-CO", options);
    return `${startStr} al ${endStr}`;
  }

  if (startsAt) {
    const startStr = new Date(startsAt).toLocaleDateString("es-CO", options);
    return `Desde ${startStr}`;
  }

  if (endsAt) {
    const endStr = new Date(endsAt).toLocaleDateString("es-CO", options);
    return `Hasta ${endStr}`;
  }

  return "Vigencia permanente";
}

/**
 * Safely truncate plain text descriptions without breaking formatting.
 */
export function truncateCommercialBenefitDescription(
  text: string,
  maxLength: number = 180
): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
}
