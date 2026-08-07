import { SupabaseClient } from "@supabase/supabase-js";
import { ContentBlock, ContentBlockType } from "./types";
import { BlockResponsiveConfig } from "./block-layout-types";
import { PublicViewerType, ResolvedPublicMediaMap } from "./public-renderer-types";
import { createSignedMediaUrl } from "@/lib/media/media-repository";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function collectBlockMediaIds(blocks: ContentBlock[]): string[] {
  const idsSet = new Set<string>();

  for (const block of blocks) {
    if (!block) continue;

    // Direct block media properties
    if (block.type === "image" && block.mediaId) {
      if (UUID_REGEX.test(block.mediaId.trim())) idsSet.add(block.mediaId.trim());
    } else if (block.type === "attachment" && block.mediaId) {
      if (UUID_REGEX.test(block.mediaId.trim())) idsSet.add(block.mediaId.trim());
    } else if (block.type === "hero" && block.mediaId) {
      if (UUID_REGEX.test(block.mediaId.trim())) idsSet.add(block.mediaId.trim());
    } else if (block.type === "gallery" && Array.isArray(block.mediaIds)) {
      for (const id of block.mediaIds) {
        if (typeof id === "string" && UUID_REGEX.test(id.trim())) {
          idsSet.add(id.trim());
        }
      }
    } else if (block.type === "cta" && block.mediaId) {
      if (UUID_REGEX.test(block.mediaId.trim())) idsSet.add(block.mediaId.trim());
    }

    // Background image layout mediaId
    if (
      block.layout?.background?.type === "image" &&
      block.layout.background.mediaId &&
      UUID_REGEX.test(block.layout.background.mediaId.trim())
    ) {
      idsSet.add(block.layout.background.mediaId.trim());
    }
  }

  return Array.from(idsSet);
}

export async function resolvePublicMediaBatch(
  supabase: SupabaseClient,
  mediaIds: string[]
): Promise<ResolvedPublicMediaMap> {
  const map: ResolvedPublicMediaMap = {};
  if (!mediaIds || mediaIds.length === 0) return map;

  try {
    const { data, error } = await supabase
      .from("media_items")
      .select("id, title, alt_text, mime_type, storage_path, original_filename, file_size")
      .in("id", mediaIds)
      .eq("status", "active")
      .eq("visibility", "public");

    if (error) {
      console.error("Error consultando media_items para el renderer público:", error);
      return map;
    }

    if (!data || data.length === 0) return map;

    for (const item of data) {
      let signedUrl: string | null = null;
      if (item.storage_path) {
        try {
          signedUrl = await createSignedMediaUrl(supabase, item.storage_path, 3600);
        } catch (err) {
          console.error(`Error generando signed URL para media ${item.id}:`, err);
        }
      }

      map[item.id] = {
        id: item.id,
        title: item.title || item.original_filename || "Archivo multimedia",
        alt_text: item.alt_text || null,
        mime_type: item.mime_type || "application/octet-stream",
        signedUrl,
        original_filename: item.original_filename || "archivo",
        file_size: item.file_size || 0,
      };
    }

    return map;
  } catch (err) {
    console.error("Error en resolvePublicMediaBatch:", err);
    return map;
  }
}

export function shouldRenderBlock(
  block: ContentBlock,
  viewerType: PublicViewerType = "public"
): boolean {
  if (!block) return false;

  const mode = block.layout?.visibility?.mode;
  if (!mode || mode === "always") {
    return true;
  }

  if (mode === "public_only") {
    return viewerType === "public";
  }

  if (mode === "members_only") {
    return viewerType === "member";
  }

  return true;
}

export function getResponsiveVisibilityClasses(responsive?: BlockResponsiveConfig): string {
  if (!responsive) return "";

  const { hideOnMobile, hideOnTablet, hideOnDesktop } = responsive;

  if (!hideOnMobile && !hideOnTablet && !hideOnDesktop) {
    return "";
  }

  if (hideOnMobile && hideOnTablet && hideOnDesktop) {
    return "hidden";
  }

  if (hideOnMobile && hideOnTablet && !hideOnDesktop) {
    return "hidden lg:block";
  }

  if (hideOnMobile && !hideOnTablet && hideOnDesktop) {
    return "hidden md:block lg:hidden";
  }

  if (hideOnMobile && !hideOnTablet && !hideOnDesktop) {
    return "hidden md:block";
  }

  if (!hideOnMobile && hideOnTablet && hideOnDesktop) {
    return "md:hidden";
  }

  if (!hideOnMobile && hideOnTablet && !hideOnDesktop) {
    return "md:hidden lg:block";
  }

  if (!hideOnMobile && !hideOnTablet && hideOnDesktop) {
    return "lg:hidden";
  }

  return "";
}

export function isSafePublicHref(href: string | null | undefined): boolean {
  if (!href || typeof href !== "string") return false;

  const trimmed = href.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  // Reject dangerous protocols
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  if (trimmed.startsWith("/")) return true;
  if (lower.startsWith("https://")) return true;
  if (lower.startsWith("http://")) return true;
  if (lower.startsWith("mailto:")) return true;
  if (lower.startsWith("tel:")) return true;

  // External domain without scheme (default to https)
  if (trimmed.includes(".") && !trimmed.startsWith("http")) {
    return true;
  }

  return false;
}

export function normalizePublicHref(href: string | null | undefined): string | null {
  if (!isSafePublicHref(href)) return null;

  const trimmed = href!.trim();
  const lower = trimmed.toLowerCase();

  if (
    trimmed.startsWith("/") ||
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return trimmed;
  }

  if (trimmed.includes(".") && !trimmed.startsWith("http")) {
    return `https://${trimmed}`;
  }

  return null;
}

export function isExternalPublicHref(href: string | null | undefined): boolean {
  const safe = normalizePublicHref(href);
  if (!safe) return false;
  return safe.startsWith("http://") || safe.startsWith("https://");
}

export function createSafeMapsUrl(
  address: string,
  latitude?: number,
  longitude?: number
): string {
  if (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  const cleanAddress = address.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`;
}

export function blockSupportsColumns(type: ContentBlockType): boolean {
  return type === "gallery" || type === "sponsors";
}
