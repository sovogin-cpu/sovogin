import { MediaItem } from "./types";

export type MediaSelectorMode = "single" | "multiple";
export type MediaSelectorKind = "image" | "document" | "any";
export type MediaSelectorVisibilityRequirement = "public" | "any";

export interface MediaSelectorItem extends MediaItem {
  signedUrl?: string;
}

export interface MediaSelectorFilters {
  search: string;
  categoryId: string;
  kind: MediaSelectorKind;
  visibility: MediaSelectorVisibilityRequirement;
  mimeType?: string;
}

export interface MediaSelectorSelection {
  selectedIds: string[];
}
