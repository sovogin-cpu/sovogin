import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminCommercialBenefit,
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
 * Includes private details for admin editing.
 */
export async function listCommercialBenefitsAdmin(
  supabase: SupabaseClient,
  filters?: CommercialBenefitFilters
): Promise<AdminCommercialBenefit[]> {
  let query = supabase
    .from("commercial_benefits")
    .select("*, commercial_benefit_private_details(discount_code, redemption_instructions, exclusive_link_url)");

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

  const rawList = (data as unknown as Array<Record<string, unknown>>) || [];

  let results: AdminCommercialBenefit[] = rawList.map((item) => {
    const privObj = item.commercial_benefit_private_details;
    const priv = Array.isArray(privObj) ? privObj[0] : privObj;

    const { commercial_benefit_private_details, ...publicFields } = item;

    return {
      ...(publicFields as unknown as CommercialBenefit),
      discount_code: (priv as { discount_code?: string })?.discount_code || null,
      redemption_instructions: (priv as { redemption_instructions?: string })?.redemption_instructions || null,
      exclusive_link_url: (priv as { exclusive_link_url?: string })?.exclusive_link_url || null,
    };
  });

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
 * Get a single commercial benefit record by ID for admin panel.
 */
export async function getCommercialBenefitById(
  supabase: SupabaseClient,
  id: string
): Promise<AdminCommercialBenefit | null> {
  const { data, error } = await supabase
    .from("commercial_benefits")
    .select("*, commercial_benefit_private_details(discount_code, redemption_instructions, exclusive_link_url)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const item = data as unknown as Record<string, unknown>;
  const privObj = item.commercial_benefit_private_details;
  const priv = Array.isArray(privObj) ? privObj[0] : privObj;

  const { commercial_benefit_private_details, ...publicFields } = item;

  return {
    ...(publicFields as unknown as CommercialBenefit),
    discount_code: (priv as { discount_code?: string })?.discount_code || null,
    redemption_instructions: (priv as { redemption_instructions?: string })?.redemption_instructions || null,
    exclusive_link_url: (priv as { exclusive_link_url?: string })?.exclusive_link_url || null,
  };
}

/**
 * Create a new commercial benefit record (Public record + Private details).
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

  // 1. Insertar datos públicos en public.commercial_benefits
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

  const { data: createdBenefit, error } = await supabase
    .from("commercial_benefits")
    .insert([insertData])
    .select("*")
    .single();

  if (error || !createdBenefit) throw error || new Error("No se pudo crear el beneficio comercial.");

  // 2. Si existen datos privados, upsert en public.commercial_benefit_private_details
  const discountCode = payload.discount_code?.trim() || null;
  const redemptionInstructions = payload.redemption_instructions?.trim() || null;
  const exclusiveLinkUrl = normalizeCommercialBenefitUrl(payload.exclusive_link_url);

  if (discountCode || redemptionInstructions || exclusiveLinkUrl) {
    const { error: privErr } = await supabase
      .from("commercial_benefit_private_details")
      .upsert(
        {
          benefit_id: createdBenefit.id,
          discount_code: discountCode,
          redemption_instructions: redemptionInstructions,
          exclusive_link_url: exclusiveLinkUrl,
        },
        { onConflict: "benefit_id" }
      );

    if (privErr) {
      console.error("Error al guardar detalles privados del convenio:", privErr);
      throw new Error(
        `Error al guardar los detalles privados del convenio: ${privErr.message}`
      );
    }
  }

  return createdBenefit as CommercialBenefit;
}

/**
 * Update an existing commercial benefit record (Public record + Private details).
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

  // Actualizar tabla privada si los campos están presentes en el payload
  if (
    payload.discount_code !== undefined ||
    payload.redemption_instructions !== undefined ||
    payload.exclusive_link_url !== undefined
  ) {
    const discountCode = payload.discount_code !== undefined ? payload.discount_code?.trim() || null : undefined;
    const redemptionInstructions = payload.redemption_instructions !== undefined ? payload.redemption_instructions?.trim() || null : undefined;
    const exclusiveLinkUrl = payload.exclusive_link_url !== undefined ? normalizeCommercialBenefitUrl(payload.exclusive_link_url) : undefined;

    const { error: privErr } = await supabase
      .from("commercial_benefit_private_details")
      .upsert(
        {
          benefit_id: id,
          ...(discountCode !== undefined && { discount_code: discountCode }),
          ...(redemptionInstructions !== undefined && { redemption_instructions: redemptionInstructions }),
          ...(exclusiveLinkUrl !== undefined && { exclusive_link_url: exclusiveLinkUrl }),
        },
        { onConflict: "benefit_id" }
      );

    if (privErr) {
      console.error("Error al actualizar detalles privados del convenio:", privErr);
      throw new Error(
        `Error al actualizar los detalles privados del convenio: ${privErr.message}`
      );
    }
  }

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
 * Delete a commercial benefit.
 */
export async function deleteCommercialBenefit(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from("commercial_benefits")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

/**
 * Generate a 3600s signed URL for media item attached to a commercial benefit.
 */
export async function createCommercialBenefitSignedUrl(
  supabase: SupabaseClient,
  mediaId: string | null
): Promise<string | null> {
  if (!mediaId) return null;

  const { data, error } = await supabase
    .from("media_items")
    .select("storage_path")
    .eq("id", mediaId)
    .maybeSingle();

  if (error || !data || !data.storage_path) return null;

  try {
    const { data: signedData } = await supabase.storage
      .from("media-library")
      .createSignedUrl(data.storage_path, 3600);
    return signedData?.signedUrl || null;
  } catch {
    return null;
  }
}

