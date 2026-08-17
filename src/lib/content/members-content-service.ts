import { SupabaseClient } from "@supabase/supabase-js";
import { ContentPostWithRelations } from "./types";
import { parseContentBlocks } from "./block-schema";

/**
 * Fetch a single members_only published post by slug.
 * Applies strict publication and visibility = 'members_only' rules.
 */
export async function getMembersOnlyContentBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ContentPostWithRelations | null> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("content_posts")
    .select("*, content_post_categories(content_categories(*))")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "members_only")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .maybeSingle();

  if (error || !data) return null;

  const categories = Array.isArray(data.content_post_categories)
    ? data.content_post_categories
        .map((c: { content_categories: unknown }) => c.content_categories)
        .filter(Boolean)
    : [];

  return {
    ...data,
    content: parseContentBlocks(data.content),
    categories,
  };
}
