import {
  ContentBlockType,
  ContentChannel,
  ContentDocumentMode,
  ContentPost,
  ContentPostStatus,
  ContentVisibility,
} from "./types";

export function slugifyContentTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // Trim hyphens from ends
}

export function normalizeContentSlug(slug: string): string {
  if (!slug) return "";
  return slugifyContentTitle(slug);
}

export function formatContentChannel(channel: ContentChannel): string {
  switch (channel) {
    case "innovation":
      return "Innovación";
    case "community":
      return "A la comunidad";
    case "news":
      return "Noticias";
    case "benefits":
      return "Beneficios";
    default:
      return channel;
  }
}

export function formatContentStatus(status: ContentPostStatus): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "published":
      return "Publicado";
    case "archived":
      return "Archivado";
    default:
      return status;
  }
}

export function formatContentVisibility(visibility: ContentVisibility): string {
  switch (visibility) {
    case "public":
      return "Público";
    case "members_only":
      return "Solo Asociados";
    default:
      return visibility;
  }
}

export function formatContentBlockType(type: ContentBlockType): string {
  switch (type) {
    case "paragraph":
      return "Párrafo";
    case "heading":
      return "Título";
    case "image":
      return "Imagen";
    case "youtube":
      return "Video de YouTube";
    case "attachment":
      return "Archivo adjunto";
    case "hero":
      return "Encabezado principal";
    case "button":
      return "Botón";
    case "gallery":
      return "Galería";
    case "cta":
      return "Llamado a la acción";
    case "sponsors":
      return "Patrocinadores";
    case "form":
      return "Formulario";
    case "map":
      return "Mapa";
    case "spacer":
      return "Espaciador";
    case "divider":
      return "Separador";
    case "quote":
      return "Cita";
    default:
      return type;
  }
}

export function getRecommendedBlocksForMode(
  mode: ContentDocumentMode
): ContentBlockType[] {
  if (mode === "article") {
    return [
      "heading",
      "paragraph",
      "image",
      "youtube",
      "attachment",
      "quote",
      "gallery",
    ];
  }

  return [
    "hero",
    "heading",
    "paragraph",
    "image",
    "gallery",
    "youtube",
    "cta",
    "button",
    "sponsors",
    "form",
    "map",
    "attachment",
    "quote",
    "spacer",
    "divider",
  ];
}

export function isContentPublished(post: ContentPost): boolean {
  return post.status === "published";
}

export function isPublicationAvailable(
  post: ContentPost,
  now?: Date
): boolean {
  if (post.status !== "published") return false;
  if (!post.published_at) return true;
  const currentDate = now ?? new Date();
  const publishDate = new Date(post.published_at);
  return publishDate <= currentDate;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );

  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  return null;
}

export function createContentExcerpt(
  text: string,
  maximumLength = 160
): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maximumLength) return cleaned;
  return `${cleaned.substring(0, maximumLength).trim()}...`;
}
