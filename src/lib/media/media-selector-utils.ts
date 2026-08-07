import { MediaItem } from "./types";
import { classifyMediaType } from "./file-utils";
import { MediaSelectorKind, MediaSelectorVisibilityRequirement } from "./media-selector-types";

export function isMediaItemImage(item: MediaItem): boolean {
  return classifyMediaType(item.mime_type) === "image";
}

export function isMediaItemDocument(item: MediaItem): boolean {
  return classifyMediaType(item.mime_type) === "document";
}

export function filterMediaItemsByKind(
  items: MediaItem[],
  kind: MediaSelectorKind
): MediaItem[] {
  if (kind === "image") {
    return items.filter(isMediaItemImage);
  }
  if (kind === "document") {
    return items.filter(isMediaItemDocument);
  }
  return items;
}

export function deduplicateMediaIds(ids: string[]): string[] {
  const valid = ids.filter((id) => typeof id === "string" && id.trim().length > 0);
  return Array.from(new Set(valid));
}

export function formatMediaFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = (bytes / Math.pow(k, i)).toFixed(1);
  return `${num} ${sizes[i]}`;
}

export function formatMediaDimensions(
  width: number | null,
  height: number | null
): string | null {
  if (width && height) {
    return `${width} × ${height} px`;
  }
  return null;
}

export function canSelectMediaItem(
  item: MediaItem,
  requirement: MediaSelectorVisibilityRequirement = "public"
): boolean {
  if (item.status !== "active") return false;
  if (requirement === "public" && item.visibility !== "public") return false;
  return true;
}

export function createMediaSelectorLabel(item: MediaItem): string {
  return item.title || item.original_filename || "Archivo multimedia";
}
