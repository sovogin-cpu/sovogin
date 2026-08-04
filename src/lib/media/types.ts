export type MediaStatus = "active" | "archived";
export type MediaVisibility = "public" | "private";
export type MediaTypeFilter = "all" | "image" | "document" | "other";

export interface MediaCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  alt_text: string | null;
  original_filename: string;
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  mime_type: string;
  file_extension: string | null;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  sha256_hash: string;
  category_id: string | null;
  uploaded_by: string | null;
  status: MediaStatus;
  visibility: MediaVisibility;
  created_at: string;
  updated_at: string;
  media_categories?: MediaCategory | null;
}

export interface MediaUploadFormData {
  title: string;
  description?: string;
  alt_text?: string;
  category_id?: string;
  visibility: MediaVisibility;
}

export interface MediaFilterState {
  searchQuery: string;
  categoryId: string;
  status: MediaStatus | "all";
  visibility: MediaVisibility | "all";
  mediaType: MediaTypeFilter;
}
