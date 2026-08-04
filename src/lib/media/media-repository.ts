import { SupabaseClient } from "@supabase/supabase-js";
import { MediaCategory, MediaFilterState, MediaItem } from "./types";
import { classifyMediaType } from "./file-utils";

export async function listMediaItems(
  supabase: SupabaseClient,
  filters?: Partial<MediaFilterState>
): Promise<MediaItem[]> {
  let query = supabase
    .from("media_items")
    .select("*, media_categories(id, name, slug)")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.visibility && filters.visibility !== "all") {
    query = query.eq("visibility", filters.visibility);
  }

  if (filters?.categoryId && filters.categoryId !== "all") {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters?.searchQuery && filters.searchQuery.trim() !== "") {
    const term = `%${filters.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${term},original_filename.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  let items = (data as MediaItem[]) || [];

  if (filters?.mediaType && filters.mediaType !== "all") {
    items = items.filter(
      (item) => classifyMediaType(item.mime_type) === filters.mediaType
    );
  }

  return items;
}

export async function listMediaCategories(
  supabase: SupabaseClient
): Promise<MediaCategory[]> {
  const { data, error } = await supabase
    .from("media_categories")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as MediaCategory[]) || [];
}

export async function findMediaByHash(
  supabase: SupabaseClient,
  hash: string
): Promise<MediaItem | null> {
  const { data, error } = await supabase
    .from("media_items")
    .select("*, media_categories(id, name, slug)")
    .eq("sha256_hash", hash)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return (data as MediaItem) || null;
}

export async function createMediaItem(
  supabase: SupabaseClient,
  itemData: Omit<MediaItem, "id" | "created_at" | "updated_at" | "media_categories">
): Promise<MediaItem> {
  const { data, error } = await supabase
    .from("media_items")
    .insert([itemData])
    .select("*, media_categories(id, name, slug)")
    .single();

  if (error) throw error;
  return data as MediaItem;
}

export async function updateMediaItem(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<MediaItem, "id" | "created_at" | "updated_at" | "media_categories">>
): Promise<MediaItem> {
  const { data, error } = await supabase
    .from("media_items")
    .update(updates)
    .eq("id", id)
    .select("*, media_categories(id, name, slug)")
    .single();

  if (error) throw error;
  return data as MediaItem;
}

export async function archiveMediaItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("media_items")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;
}

export async function createSignedMediaUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("media-library")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("No se pudo generar el enlace firmado.");
  }

  return data.signedUrl;
}
