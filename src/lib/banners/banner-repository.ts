import { SupabaseClient } from "@supabase/supabase-js";
import { Banner, BannerPosition } from "./banner-types";
import { isBannerCurrentlyActive } from "./banner-utils";

export async function listActiveBannersByPosition(
  supabase: SupabaseClient,
  position: BannerPosition
): Promise<Banner[]> {
  try {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("position", position)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`Error al listar banners para la posición ${position}:`, error);
      return [];
    }

    if (!data) return [];

    const banners = data as Banner[];
    return banners.filter(isBannerCurrentlyActive);
  } catch (error) {
    console.error(`Error inesperado al obtener banners de ${position}:`, error);
    return [];
  }
}

export async function listAdminBanners(
  supabase: SupabaseClient
): Promise<Banner[]> {
  try {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("position", { ascending: true })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al listar banners para administración:", error);
      return [];
    }

    return (data as Banner[]) ?? [];
  } catch (error) {
    console.error("Error inesperado en listAdminBanners:", error);
    return [];
  }
}
