import { SupabaseClient } from "@supabase/supabase-js";

export interface CommercialBenefitPublic {
  id: string;
  name: string;
  benefit_title: string;
  short_description: string;
  full_description: string | null;
  logo_media_id: string | null;
  promotional_media_id: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  is_featured: boolean;
}

export interface CommercialBenefitPublicResolved {
  benefit: CommercialBenefitPublic;
  logoSignedUrl: string | null;
  promotionalSignedUrl: string | null;
}

/**
 * Fetch active and currently valid commercial benefits for public display.
 * Ordering: is_featured DESC, display_order ASC, created_at DESC.
 */
export async function listCurrentCommercialBenefits(
  supabase: SupabaseClient
): Promise<CommercialBenefitPublic[]> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("commercial_benefits")
    .select(
      "id, name, benefit_title, short_description, full_description, logo_media_id, promotional_media_id, link_url, starts_at, ends_at, display_order, is_featured"
    )
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data as CommercialBenefitPublic[]) || [];
}

/**
 * Resolve media signed URLs in batch for a list of public commercial benefits.
 * Enforces status = 'active' and visibility = 'public' on media_items.
 * Expiry: 3600 seconds.
 */
export async function resolveCommercialBenefitMediaBatch(
  supabase: SupabaseClient,
  benefits: CommercialBenefitPublic[]
): Promise<CommercialBenefitPublicResolved[]> {
  if (!benefits || benefits.length === 0) return [];

  // Collect all media IDs needing resolution
  const mediaIds = new Set<string>();
  benefits.forEach((b) => {
    if (b.logo_media_id) mediaIds.add(b.logo_media_id);
    if (b.promotional_media_id) mediaIds.add(b.promotional_media_id);
  });

  const mediaIdList = Array.from(mediaIds);
  const pathMap: Record<string, string> = {};

  if (mediaIdList.length > 0) {
    const { data: mediaItems } = await supabase
      .from("media_items")
      .select("id, storage_path")
      .in("id", mediaIdList)
      .eq("status", "active")
      .eq("visibility", "public");

    if (mediaItems) {
      mediaItems.forEach((item: { id: string; storage_path: string }) => {
        if (item.id && item.storage_path) {
          pathMap[item.id] = item.storage_path;
        }
      });
    }
  }

  // Create signed URLs for resolved media paths
  const signedUrlMap: Record<string, string> = {};
  for (const [id, storagePath] of Object.entries(pathMap)) {
    try {
      const { data } = await supabase.storage
        .from("media-library")
        .createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) {
        signedUrlMap[id] = data.signedUrl;
      }
    } catch {
      // Ignore preview error
    }
  }

  return benefits.map((b) => ({
    benefit: b,
    logoSignedUrl: b.logo_media_id ? signedUrlMap[b.logo_media_id] || null : null,
    promotionalSignedUrl: b.promotional_media_id
      ? signedUrlMap[b.promotional_media_id] || null
      : null,
  }));
}
