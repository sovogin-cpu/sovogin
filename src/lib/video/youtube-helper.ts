/**
 * SOVOGIN Event Transmission & YouTube Helper
 * Safely parses transmission provider configurations (YouTube, Zoom, Meet, Teams, External),
 * extracts YouTube video IDs, builds nocookie embed URLs, formats live chat URLs with trusted embed_domain validation,
 * and enforces strict HTTPS URL security.
 */

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export type TransmissionProvider =
  | "youtube"
  | "zoom"
  | "google_meet"
  | "microsoft_teams"
  | "external";

export interface TransmissionConfig {
  provider: TransmissionProvider;
  url: string;
  showLiveChat?: boolean;
}

export const TRUSTED_EMBED_DOMAINS = [
  "sovogin.com",
  "www.sovogin.com",
  "sovogin.vercel.app",
  "sovogin-beta.vercel.app",
] as const;

/**
 * Extracts a valid 11-character YouTube video ID from various supported URL formats or raw 11-char IDs.
 * Rejects foreign domains, malformed strings, and HTML iframe tags.
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject any raw HTML input (e.g. <iframe ...>)
  if (trimmed.includes("<") || trimmed.includes(">") || trimmed.toLowerCase().includes("iframe")) {
    return null;
  }

  // Direct 11-character video ID input (e.g. dQw4w9WgXcQ)
  if (YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    // Ensure URL has protocol for URL parser if missing
    const urlString = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check allowed YouTube domains
    const isYouTubeDomain =
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be" ||
      hostname === "www.youtu.be" ||
      hostname === "youtube-nocookie.com" ||
      hostname === "www.youtube-nocookie.com";

    if (!isYouTubeDomain) {
      return null;
    }

    // 1. youtu.be/VIDEO_ID
    if (hostname.includes("youtu.be")) {
      const pathname = parsedUrl.pathname.slice(1);
      const videoId = pathname.split("/")[0]?.split("?")[0]?.trim();
      return YOUTUBE_VIDEO_ID_REGEX.test(videoId || "") ? videoId : null;
    }

    // 2. youtube.com/watch?v=VIDEO_ID
    const searchParamId = parsedUrl.searchParams.get("v")?.trim();
    if (searchParamId && YOUTUBE_VIDEO_ID_REGEX.test(searchParamId)) {
      return searchParamId;
    }

    // 3. youtube.com/live/VIDEO_ID or youtube.com/embed/VIDEO_ID
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2) {
      const firstSegment = pathSegments[0].toLowerCase();
      if (firstSegment === "live" || firstSegment === "embed" || firstSegment === "v") {
        const candidateId = pathSegments[1].trim();
        if (YOUTUBE_VIDEO_ID_REGEX.test(candidateId)) {
          return candidateId;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Constructs a secure https://www.youtube-nocookie.com/embed/VIDEO_ID URL.
 * Returns null if the input URL or ID is invalid.
 */
export function buildYouTubeEmbedUrl(input: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}

/**
 * Validates and resolves a trusted embed_domain hostname for YouTube Live Chat.
 * Rejects untrusted / spoofed hostnames, returning null to prevent arbitrary Host header spoofing.
 */
export function getTrustedEmbedDomain(hostInput?: string | null): string | null {
  let targetHost = hostInput;

  if (!targetHost || typeof targetHost !== "string") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      targetHost = window.location.hostname;
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      targetHost = process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      return "sovogin.com";
    }
  }

  let cleaned = targetHost.trim().toLowerCase();

  // Strip protocol if included
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      cleaned = new URL(cleaned).hostname;
    } catch {
      cleaned = cleaned.replace(/^https?:\/\//, "");
    }
  }

  // Strip port if present (e.g. localhost:3000 -> localhost)
  if (cleaned.includes(":")) {
    cleaned = cleaned.split(":")[0];
  }

  // Strip pathname or trailing slashes if present
  if (cleaned.includes("/")) {
    cleaned = cleaned.split("/")[0];
  }

  if (!cleaned) return null;

  // 1. Allow localhost / loopback in local development
  if (cleaned === "localhost" || cleaned === "127.0.0.1") {
    return "localhost";
  }

  // 2. Check exact trusted production domain list
  const isTrusted = TRUSTED_EMBED_DOMAINS.some(
    (domain) => cleaned === domain || cleaned.endsWith("." + domain)
  );

  if (isTrusted) {
    return cleaned;
  }

  return null;
}

/**
 * Builds YouTube Live Chat embed URL with a validated embed_domain parameter.
 * Returns null if input video reference is invalid or host is untrusted.
 */
export function buildYouTubeLiveChatUrl(
  input: string | null | undefined,
  hostName?: string | null
): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;

  const trustedDomain = getTrustedEmbedDomain(hostName);
  if (!trustedDomain) return null;

  return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${encodeURIComponent(trustedDomain)}`;
}

/**
 * Validates whether an external transmission link uses HTTPS and rejects unsafe protocols.
 */
export function validateExternalTransmissionUrl(
  input: string | null | undefined
): { isValid: boolean; url: string | null; error?: string } {
  if (!input || typeof input !== "string") {
    return { isValid: false, url: null, error: "No se especificó un enlace de transmisión." };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, url: null, error: "El enlace no puede estar vacío." };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return { isValid: false, url: null, error: "Protocolo de enlace no seguro detectado." };
  }

  if (!lower.startsWith("https://")) {
    return { isValid: false, url: null, error: "El enlace debe utilizar el protocolo seguro (https://)." };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { isValid: false, url: null, error: "El enlace debe utilizar HTTPS." };
    }
    return { isValid: true, url: trimmed };
  } catch {
    return { isValid: false, url: null, error: "Formato de URL no válido." };
  }
}

/**
 * Validates whether an input URL or ID is a valid YouTube video reference.
 */
export function isValidYouTubeInput(input: string | null | undefined): boolean {
  return extractYouTubeVideoId(input) !== null;
}

/**
 * Parses raw live_url field (either legacy string/URL or serialized JSON) into structured TransmissionConfig.
 */
export function parseTransmissionConfig(input: string | null | undefined): TransmissionConfig {
  if (!input || typeof input !== "string") {
    return { provider: "youtube", url: "", showLiveChat: false };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { provider: "youtube", url: "", showLiveChat: false };
  }

  // Attempt parsing JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const rawProvider = String(parsed.provider || "youtube").toLowerCase();
        let provider: TransmissionProvider = "youtube";
        if (
          rawProvider === "zoom" ||
          rawProvider === "google_meet" ||
          rawProvider === "microsoft_teams" ||
          rawProvider === "external"
        ) {
          provider = rawProvider as TransmissionProvider;
        }

        return {
          provider,
          url: typeof parsed.url === "string" ? parsed.url.trim() : "",
          showLiveChat: Boolean(parsed.showLiveChat),
        };
      }
    } catch {
      // Fallback to plain URL parsing
    }
  }

  // Plain string/URL heuristic for legacy event compatibility
  if (extractYouTubeVideoId(trimmed)) {
    return { provider: "youtube", url: trimmed, showLiveChat: false };
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("zoom.us") || lower.includes("zoom.com")) {
    return { provider: "zoom", url: trimmed };
  }
  if (lower.includes("meet.google.com")) {
    return { provider: "google_meet", url: trimmed };
  }
  if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com")) {
    return { provider: "microsoft_teams", url: trimmed };
  }

  return { provider: "external", url: trimmed };
}

/**
 * Serializes TransmissionConfig to store in live_url.
 * Uses plain URL for simple YouTube links without chat for backward compatibility,
 * and JSON for multi-provider or live chat configurations.
 */
export function serializeTransmissionConfig(config: TransmissionConfig): string {
  const trimmedUrl = config.url.trim();

  if (
    config.provider === "youtube" &&
    !config.showLiveChat &&
    (trimmedUrl.startsWith("http") || YOUTUBE_VIDEO_ID_REGEX.test(trimmedUrl))
  ) {
    return trimmedUrl;
  }

  return JSON.stringify({
    provider: config.provider,
    url: trimmedUrl,
    showLiveChat: Boolean(config.showLiveChat),
  });
}
