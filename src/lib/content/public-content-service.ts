import { SupabaseClient } from "@supabase/supabase-js";
import {
  ContentCategory,
  ContentChannel,
  ContentPostWithRelations,
} from "./types";
import { parseContentBlocks } from "./block-schema";
import { createSignedMediaUrl } from "@/lib/media/media-repository";
import { MediaItem } from "@/lib/media/types";

export interface ListPublishedContentOptions {
  channel: ContentChannel;
  searchQuery?: string;
  categoryId?: string;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListPublishedContentResult {
  posts: ContentPostWithRelations[];
  totalCount: number;
}

/**
 * List published public content for a channel.
 * Strictly filters out draft, archived, members_only, and future scheduled posts.
 */
export async function listPublishedContent(
  supabase: SupabaseClient,
  options: ListPublishedContentOptions
): Promise<ListPublishedContentResult> {
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("content_posts")
    .select(
      "*, content_post_categories(content_categories(*))",
      { count: "exact" }
    )
    .eq("channel", options.channel)
    .eq("status", "published")
    .eq("visibility", "public")
    .or(`published_at.is.null,published_at.lte.${nowIso}`);

  if (options.isFeatured !== undefined) {
    query = query.eq("is_featured", options.isFeatured);
  }

  if (options.searchQuery && options.searchQuery.trim() !== "") {
    const term = `%${options.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${term},excerpt.ilike.${term}`);
  }

  query = query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (options.limit) {
    const from = options.offset || 0;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rawPosts = data || [];
  let posts: ContentPostWithRelations[] = rawPosts.map((item) => {
    const categories: ContentCategory[] = Array.isArray(item.content_post_categories)
      ? item.content_post_categories
          .map((c: { content_categories: ContentCategory }) => c.content_categories)
          .filter(Boolean)
      : [];

    return {
      ...item,
      content: parseContentBlocks(item.content),
      categories,
    };
  });

  // Client-side category filter if categoryId is provided
  if (options.categoryId && options.categoryId !== "all") {
    posts = posts.filter((p) =>
      p.categories?.some((c) => c.id === options.categoryId)
    );
  }

  return {
    posts,
    totalCount: count ?? posts.length,
  };
}

/**
 * Get a single published public post by channel and slug.
 * Applies strict publication and public visibility rules.
 */
export async function getPublishedContentBySlug(
  supabase: SupabaseClient,
  channel: ContentChannel,
  slug: string
): Promise<ContentPostWithRelations | null> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("content_posts")
    .select("*, content_post_categories(content_categories(*))")
    .eq("channel", channel)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const categories: ContentCategory[] = Array.isArray(data.content_post_categories)
    ? data.content_post_categories
        .map((c: { content_categories: ContentCategory }) => c.content_categories)
        .filter(Boolean)
    : [];

  return {
    ...data,
    content: parseContentBlocks(data.content),
    categories,
  };
}

/**
 * List active public categories for a given channel (including global categories).
 */
export async function listPublicContentCategories(
  supabase: SupabaseClient,
  channel: ContentChannel
): Promise<ContentCategory[]> {
  const { data, error } = await supabase
    .from("content_categories")
    .select("*")
    .eq("is_active", true)
    .or(`channel.is.null,channel.eq.${channel}`)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as ContentCategory[]) || [];
}

/**
 * Generate a 3600s signed URL for public media items only.
 * Rejects inactive media items or private visibility.
 */
export async function createSignedMediaUrlForPublicContent(
  supabase: SupabaseClient,
  mediaId: string
): Promise<string | null> {
  if (!mediaId) return null;

  const { data, error } = await supabase
    .from("media_items")
    .select("storage_path, status, visibility")
    .eq("id", mediaId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "active" || data.visibility !== "public") {
    return null;
  }

  try {
    return await createSignedMediaUrl(supabase, data.storage_path, 3600);
  } catch {
    return null;
  }
}

/**
 * Resolve public media item with signed URL and metadata.
 */
export async function resolveContentMedia(
  supabase: SupabaseClient,
  mediaId: string
): Promise<{ item: MediaItem; signedUrl: string } | null> {
  if (!mediaId) return null;

  const { data, error } = await supabase
    .from("media_items")
    .select("*, media_categories(id, name, slug)")
    .eq("id", mediaId)
    .eq("status", "active")
    .eq("visibility", "public")
    .maybeSingle();

  if (error || !data) return null;
  const item = data as MediaItem;

  try {
    const signedUrl = await createSignedMediaUrl(supabase, item.storage_path, 3600);
    return { item, signedUrl };
  } catch {
    return null;
  }
}
