/**
 * YouTube Video Link Helper & Sanitizer
 * Safely extracts YouTube VIDEO_ID and builds nocookie embed URLs for internal player rendering.
 */

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a valid 11-character YouTube video ID from various supported URL formats.
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

  // Direct video ID input
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
 * Validates whether an input URL or ID is a valid YouTube video reference.
 */
export function isValidYouTubeInput(input: string | null | undefined): boolean {
  return extractYouTubeVideoId(input) !== null;
}
