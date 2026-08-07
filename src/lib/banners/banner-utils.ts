import { Banner, BannerPosition } from "./banner-types";

export function isBannerCurrentlyActive(
  banner: Pick<Banner, "is_active" | "starts_at" | "ends_at">
): boolean {
  if (banner.is_active === false) {
    return false;
  }

  const now = Date.now();

  if (banner.starts_at) {
    const startsAt = new Date(banner.starts_at).getTime();
    if (!Number.isNaN(startsAt) && startsAt > now) {
      return false;
    }
  }

  if (banner.ends_at) {
    const endsAt = new Date(banner.ends_at).getTime();
    if (!Number.isNaN(endsAt) && endsAt < now) {
      return false;
    }
  }

  return true;
}

export function normalizeBannerLink(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Reject unsafe schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }

  // Internal absolute paths
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Safe HTTP / HTTPS links
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }

  // External links missing scheme - default to https://
  if (trimmed.includes(".") && !trimmed.startsWith("http")) {
    return `https://${trimmed}`;
  }

  return null;
}

export function formatBannerPosition(position: BannerPosition | string): string {
  switch (position) {
    case "EVENTS_HEADER":
      return "Eventos";
    case "INNOVATION_HEADER":
      return "Innovación";
    case "COMMUNITY_HEADER":
      return "A la comunidad";
    case "RESOURCES_HEADER":
      return "Recursos";
    case "HOME_HERO":
      return "Banner principal del Home";
    case "ASSOCIATION_HEADER":
      return "Cabecera de Asociación";
    default:
      return position;
  }
}
