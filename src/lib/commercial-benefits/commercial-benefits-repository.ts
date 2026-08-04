import { SupabaseClient } from "@supabase/supabase-js";
import {
  CommercialBenefit,
  CommercialBenefitFilters,
  CommercialBenefitFormData,
} from "./types";
import {
  getCommercialBenefitValidityStatus,
  normalizeCommercialBenefitUrl,
} from "./commercial-benefits-utils";

/**
 * List all commercial benefits for the administrative panel supporting search and filters.
 * Order: display_order ASC, created_at DESC.
 */
export async function listCommercialBenefitsAdmin(
  supabase: SupabaseClient,
  filters?: CommercialBenefitFilters
): Promise<CommercialBenefit[]> {
  let query = supabase
    .from("commercial_benefits")
    .select("*");

  if (filters?.activeState && filters.activeState !== "all") {
    query = query.eq("is_active", filters.activeState === "active");
  }

  if (filters?.featuredState && filters.featuredState !== "all") {
    query = query.eq("is_featured", filters.featuredState === "featured");
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `name.ilike.${term},benefit_title.ilike.${term},short_description.ilike.${term}`
    );
  }

  query = query
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let results = (data as CommercialBenefit[]) || [];

  // Filter in memory for validityState if requested
  if (filters?.validityState && filters.validityState !== "all") {
    results = results.filter((b) => {
      const status = getCommercialBenefitValidityStatus(b.starts_at, b.ends_at);
      return status === filters.validityState;
    });
  }

  return results;
}

/**
 * Get a single commercial benefit record by ID.
 */
export async function getCommercialBenefitById(
  supabase: SupabaseClient,
  id: string
): Promise<CommercialBenefit | null> {
  const { data, error } = await supabase
    .from("commercial_benefits")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as CommercialBenefit) || null;
}

/**
 * Create a new commercial benefit record.
 */
export async function createCommercialBenefit(
  supabase: SupabaseClient,
  payload: CommercialBenefitFormData,
  userId?: string | null
): Promise<CommercialBenefit> {
  const trimmedName = payload.name.trim();
  if (!trimmedName) throw new Error("El nombre del aliado o empresa es obligatorio.");

  const trimmedTitle = payload.benefit_title.trim();
  if (!trimmedTitle) throw new Error("El título del beneficio es obligatorio.");

  const trimmedShortDesc = payload.short_description.trim();
  if (!trimmedShortDesc) throw new Error("La descripción corta es obligatoria.");

  if (payload.display_order < 0) {
    throw new Error("El orden de despliegue debe ser mayor o igual a 0.");
  }

  if (payload.starts_at && payload.ends_at) {
    const start = new Date(payload.starts_at);
    const end = new Date(payload.ends_at);
    if (end < start) {
      throw new Error("La fecha de finalización no puede ser anterior a la fecha de inicio.");
    }
  }

  const normalizedUrl = normalizeCommercialBenefitUrl(payload.link_url);

  const insertData = {
    name: trimmedName,
    benefit_title: trimmedTitle,
    short_description: trimmedShortDesc,
    full_description: payload.full_description?.trim() || null,
    logo_media_id: payload.logo_media_id || null,
    promotional_media_id: payload.promotional_media_id || null,
    link_url: normalizedUrl,
    starts_at: payload.starts_at || null,
    ends_at: payload.ends_at || null,
    display_order: Math.max(0, payload.display_order),
    is_active: payload.is_active,
    is_featured: payload.is_featured,
    created_by: userId || null,
    updated_by: userId || null,
  };

  const { data, error } = await supabase
    .from("commercial_benefits")
    .insert([insertData])
    .select("*")
    .single();

  if (error) throw error;
  return data as CommercialBenefit;
}

/**
 * Update an existing commercial benefit record.
 */
export async function updateCommercialBenefit(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<CommercialBenefitFormData>,
  userId?: string | null
): Promise<CommercialBenefit> {
  const current = await getCommercialBenefitById(supabase, id);
  if (!current) throw new Error("El beneficio comercial no existe.");

  const updates: Record<string, unknown> = {
    updated_by: userId || null,
  };

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío.");
    updates.name = trimmed;
  }

  if (payload.benefit_title !== undefined) {
    const trimmed = payload.benefit_title.trim();
    if (!trimmed) throw new Error("El título del beneficio no puede estar vacío.");
    updates.benefit_title = trimmed;
  }

  if (payload.short_description !== undefined) {
    const trimmed = payload.short_description.trim();
    if (!trimmed) throw new Error("La descripción corta no puede estar vacía.");
    updates.short_description = trimmed;
  }

  if (payload.full_description !== undefined) {
    updates.full_description = payload.full_description?.trim() || null;
  }

  if (payload.logo_media_id !== undefined) {
    updates.logo_media_id = payload.logo_media_id || null;
  }

  if (payload.promotional_media_id !== undefined) {
    updates.promotional_media_id = payload.promotional_media_id || null;
  }

  if (payload.link_url !== undefined) {
    updates.link_url = normalizeCommercialBenefitUrl(payload.link_url);
  }

  const effectiveStartsAt = payload.starts_at !== undefined ? payload.starts_at : current.starts_at;
  const effectiveEndsAt = payload.ends_at !== undefined ? payload.ends_at : current.ends_at;

  if (effectiveStartsAt && effectiveEndsAt) {
    const start = new Date(effectiveStartsAt);
    const end = new Date(effectiveEndsAt);
    if (end < start) {
      throw new Error("La fecha de finalización no puede ser anterior a la fecha de inicio.");
    }
  }

  if (payload.starts_at !== undefined) updates.starts_at = payload.starts_at || null;
  if (payload.ends_at !== undefined) updates.ends_at = payload.ends_at || null;
  if (payload.display_order !== undefined) updates.display_order = Math.max(0, payload.display_order);
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;
  if (payload.is_featured !== undefined) updates.is_featured = payload.is_featured;

  const { data, error } = await supabase
    .from("commercial_benefits")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as CommercialBenefit;
}

/**
 * Toggle active status.
 */
export async function toggleCommercialBenefitActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
  userId?: string | null
): Promise<CommercialBenefit> {
  const { data, error } = await supabase
    .from("commercial_benefits")
    .update({ is_active: isActive, updated_by: userId || null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as CommercialBenefit;
}

/**
 * Toggle featured status.
 */
export async function toggleCommercialBenefitFeatured(
  supabase: SupabaseClient,
  id: string,
  isFeatured: boolean,
  userId?: string | null
): Promise<CommercialBenefit> {
  const { data, error } = await supabase
    .from("commercial_benefits")
    .update({ is_featured: isFeatured, updated_by: userId || null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as CommercialBenefit;
}

/**
 * Soft archive a benefit (sets is_active = false, preserves historical records).
 */
export async function archiveCommercialBenefit(
  supabase: SupabaseClient,
  id: string,
  userId?: string | null
): Promise<CommercialBenefit> {
  return toggleCommercialBenefitActive(supabase, id, false, userId);
}

/**
 * Create a temporary 3600s signed URL for media items in private 'media-library' bucket.
 */
export async function createCommercialBenefitSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("media-library")
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
