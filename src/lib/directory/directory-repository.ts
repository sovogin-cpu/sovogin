import { SupabaseClient } from "@supabase/supabase-js";
import {
  AssociateDirectoryCandidate,
  AssociateDirectoryProfileSummary,
  DoctorDirectoryAdminProfile,
  DoctorDirectoryFilters,
  DoctorDirectoryProfilePublic,
  DoctorProfileFormData,
} from "./types";
import { createDoctorSlug, normalizeWebsiteUrl } from "./directory-utils";

/**
 * List published doctor directory profiles for public frontend.
 * Mandatory filters: is_published = true AND consent_given_at IS NOT NULL.
 * Order: display_order ASC, display_name ASC.
 */
export async function listPublishedDoctors(
  supabase: SupabaseClient,
  filters?: DoctorDirectoryFilters
): Promise<DoctorDirectoryProfilePublic[]> {
  let query = supabase
    .from("doctor_directory_profiles")
    .select(
      "id, display_name, slug, specialty, subspecialty, country, department, city, clinic_name, public_phone, whatsapp_phone, public_email, office_address, profile_media_id, bio, website_url, social_links, telemedicine_available, is_verified, consent_given_at, is_published, display_order, created_at, updated_at"
    )
    .eq("is_published", true)
    .not("consent_given_at", "is", null);

  if (filters?.specialty && filters.specialty !== "all") {
    query = query.eq("specialty", filters.specialty);
  }

  if (filters?.city && filters.city !== "all") {
    query = query.eq("city", filters.city);
  }

  if (filters?.country && filters.country !== "all") {
    query = query.eq("country", filters.country);
  }

  if (filters?.department && filters.department !== "all") {
    query = query.eq("department", filters.department);
  }

  if (filters?.telemedicineAvailable !== undefined) {
    query = query.eq("telemedicine_available", filters.telemedicineAvailable);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `display_name.ilike.${term},specialty.ilike.${term},subspecialty.ilike.${term},city.ilike.${term},clinic_name.ilike.${term}`
    );
  }

  query = query
    .order("display_order", { ascending: true })
    .order("display_name", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return (data as DoctorDirectoryProfilePublic[]) || [];
}

/**
 * Get a single published doctor directory profile by ID.
 */
export async function getPublishedDoctorById(
  supabase: SupabaseClient,
  id: string
): Promise<DoctorDirectoryProfilePublic | null> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select(
      "id, display_name, slug, specialty, subspecialty, country, department, city, clinic_name, public_phone, whatsapp_phone, public_email, office_address, profile_media_id, bio, website_url, social_links, telemedicine_available, is_verified, consent_given_at, is_published, display_order, created_at, updated_at"
    )
    .eq("id", id)
    .eq("is_published", true)
    .not("consent_given_at", "is", null)
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorDirectoryProfilePublic) || null;
}

/**
 * Get a single published doctor directory profile by URL slug.
 */
export async function getPublishedDoctorBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<DoctorDirectoryProfilePublic | null> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select(
      "id, display_name, slug, specialty, subspecialty, country, department, city, clinic_name, public_phone, whatsapp_phone, public_email, office_address, profile_media_id, bio, website_url, social_links, telemedicine_available, is_verified, consent_given_at, is_published, display_order, created_at, updated_at"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .not("consent_given_at", "is", null)
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorDirectoryProfilePublic) || null;
}

/**
 * List distinct specialties from published profiles with consent.
 */
export async function listDoctorSpecialties(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select("specialty")
    .eq("is_published", true)
    .not("consent_given_at", "is", null);

  if (error) throw error;
  if (!data) return [];

  const set = new Set<string>();
  data.forEach((item: { specialty: string }) => {
    if (item.specialty) set.add(item.specialty);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * List distinct cities from published profiles with consent.
 */
export async function listDoctorCities(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select("city")
    .eq("is_published", true)
    .not("consent_given_at", "is", null);

  if (error) throw error;
  if (!data) return [];

  const set = new Set<string>();
  data.forEach((item: { city: string }) => {
    if (item.city) set.add(item.city);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// =============================================================================
// ADMINISTRATIVE REPOSITORY FUNCTIONS
// =============================================================================

export interface ListDirectoryAdminOptions {
  search?: string;
  isPublished?: "all" | "published" | "unpublished";
  city?: string;
  specialty?: string;
}

/**
 * List directory profiles for admin panel (published and unpublished).
 */
export async function listDirectoryAdminProfiles(
  supabase: SupabaseClient,
  options?: ListDirectoryAdminOptions
): Promise<DoctorDirectoryAdminProfile[]> {
  let query = supabase
    .from("doctor_directory_profiles")
    .select("*");

  if (options?.isPublished && options.isPublished !== "all") {
    query = query.eq("is_published", options.isPublished === "published");
  }

  if (options?.city && options.city !== "all") {
    query = query.eq("city", options.city);
  }

  if (options?.specialty && options.specialty !== "all") {
    query = query.eq("specialty", options.specialty);
  }

  if (options?.search && options.search.trim() !== "") {
    const term = `%${options.search.trim()}%`;
    query = query.or(
      `display_name.ilike.${term},specialty.ilike.${term},city.ilike.${term}`
    );
  }

  query = query
    .order("display_order", { ascending: true })
    .order("display_name", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return (data as DoctorDirectoryAdminProfile[]) || [];
}

/**
 * List all directory profile summaries in a single batch query.
 */
export async function listDirectoryProfileSummaries(
  supabase: SupabaseClient
): Promise<AssociateDirectoryProfileSummary[]> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select("id, associate_id, is_published, consent_given_at");

  if (error) throw error;
  return (data as AssociateDirectoryProfileSummary[]) || [];
}

/**
 * Get directory profile by associate_id using maybeSingle().
 */
export async function getDirectoryProfileByAssociateId(
  supabase: SupabaseClient,
  associateId: string
): Promise<DoctorDirectoryAdminProfile | null> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select("*")
    .eq("associate_id", associateId)
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorDirectoryAdminProfile) || null;
}

/**
 * Get associate candidate by ID without selecting sensitive document_number.
 */
export async function getAssociateCandidateById(
  supabase: SupabaseClient,
  associateId: string
): Promise<AssociateDirectoryCandidate | null> {
  const { data, error } = await supabase
    .from("associates")
    .select("id, full_name, email, specialty, status")
    .eq("id", associateId)
    .maybeSingle();

  if (error) throw error;
  return (data as AssociateDirectoryCandidate) || null;
}

/**
 * List associate candidates from `associates` table for linking to new directory profiles.
 * Excludes associates that already have a doctor_directory_profiles record.
 */
export async function listAssociateCandidates(
  supabase: SupabaseClient,
  searchQuery?: string
): Promise<AssociateDirectoryCandidate[]> {
  const { data: existingProfiles } = await supabase
    .from("doctor_directory_profiles")
    .select("associate_id");

  const existingAssociateIds = new Set(
    (existingProfiles || []).map((p: { associate_id: string }) => p.associate_id)
  );

  let query = supabase
    .from("associates")
    .select("id, full_name, email, specialty, status")
    .order("full_name", { ascending: true });

  if (searchQuery && searchQuery.trim() !== "") {
    const term = `%${searchQuery.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rawCandidates = (data as AssociateDirectoryCandidate[]) || [];
  return rawCandidates.filter((c) => !existingAssociateIds.has(c.id));
}

/**
 * Get a single directory profile by ID for admin editor.
 */
export async function getDirectoryAdminProfileById(
  supabase: SupabaseClient,
  id: string
): Promise<DoctorDirectoryAdminProfile | null> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorDirectoryAdminProfile) || null;
}

/**
 * Create a new doctor directory profile.
 */
export async function createDoctorDirectoryProfile(
  supabase: SupabaseClient,
  payload: DoctorProfileFormData
): Promise<DoctorDirectoryAdminProfile> {
  if (!payload.associate_id) {
    throw new Error("Debe seleccionar un asociado válido.");
  }

  // Duplicate check
  const existing = await getDirectoryProfileByAssociateId(supabase, payload.associate_id);
  if (existing) {
    throw new Error("Este asociado ya tiene un perfil en el Directorio Médico.");
  }

  const trimmedName = payload.display_name.trim();
  if (!trimmedName) {
    throw new Error("El nombre público del médico es obligatorio.");
  }

  if (payload.is_published && !payload.consentConfirmed) {
    throw new Error(
      "No se puede publicar un perfil sin el consentimiento registrado del médico."
    );
  }

  const consentGivenAt = payload.consentConfirmed ? new Date().toISOString() : null;
  const normalizedWeb = normalizeWebsiteUrl(payload.website_url);
  const generatedSlug = payload.slug?.trim() || createDoctorSlug(trimmedName);

  const insertData = {
    associate_id: payload.associate_id,
    display_name: trimmedName,
    slug: generatedSlug,
    specialty: payload.specialty.trim() || "Ginecología y Obstetricia",
    subspecialty: payload.subspecialty?.trim() || null,
    country: payload.country?.trim() || "Colombia",
    department: payload.department?.trim() || null,
    city: payload.city.trim() || "Cali",
    clinic_name: payload.clinic_name?.trim() || null,
    public_phone: payload.public_phone?.trim() || null,
    whatsapp_phone: payload.whatsapp_phone?.trim() || null,
    public_email: payload.public_email?.trim() || null,
    office_address: payload.office_address?.trim() || null,
    profile_media_id: payload.profile_media_id || null,
    bio: payload.bio?.trim() || null,
    website_url: normalizedWeb,
    social_links: payload.social_links || {},
    telemedicine_available: payload.telemedicine_available,
    is_verified: payload.is_verified ?? false,
    consent_given_at: consentGivenAt,
    is_published: payload.is_published,
    display_order: payload.display_order >= 0 ? payload.display_order : 0,
  };

  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .insert([insertData])
    .select("*")
    .single();

  if (error) throw error;
  return data as DoctorDirectoryAdminProfile;
}

/**
 * Update an existing doctor directory profile.
 */
export async function updateDoctorDirectoryProfile(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<DoctorProfileFormData>
): Promise<DoctorDirectoryAdminProfile> {
  const current = await getDirectoryAdminProfileById(supabase, id);
  if (!current) {
    throw new Error("El perfil de directorio no existe.");
  }

  const updates: Record<string, unknown> = {};

  if (payload.display_name !== undefined) {
    const trimmed = payload.display_name.trim();
    if (!trimmed) throw new Error("El nombre público no puede estar vacío.");
    updates.display_name = trimmed;

    // Direct update to slug if explicitly requested or fallback if current has no slug
    if (payload.slug !== undefined) {
      updates.slug = payload.slug?.trim() || createDoctorSlug(trimmed);
    } else if (!current.slug) {
      updates.slug = createDoctorSlug(trimmed);
    }
  } else if (payload.slug !== undefined) {
    updates.slug = payload.slug?.trim() || null;
  }

  if (payload.specialty !== undefined) updates.specialty = payload.specialty.trim();
  if (payload.subspecialty !== undefined) updates.subspecialty = payload.subspecialty?.trim() || null;
  if (payload.country !== undefined) updates.country = payload.country.trim();
  if (payload.department !== undefined) updates.department = payload.department?.trim() || null;
  if (payload.city !== undefined) updates.city = payload.city.trim();
  if (payload.clinic_name !== undefined) updates.clinic_name = payload.clinic_name?.trim() || null;
  if (payload.public_phone !== undefined) updates.public_phone = payload.public_phone?.trim() || null;
  if (payload.whatsapp_phone !== undefined) updates.whatsapp_phone = payload.whatsapp_phone?.trim() || null;
  if (payload.public_email !== undefined) updates.public_email = payload.public_email?.trim() || null;
  if (payload.office_address !== undefined) updates.office_address = payload.office_address?.trim() || null;
  if (payload.profile_media_id !== undefined) updates.profile_media_id = payload.profile_media_id || null;
  if (payload.bio !== undefined) updates.bio = payload.bio?.trim() || null;
  if (payload.website_url !== undefined) updates.website_url = normalizeWebsiteUrl(payload.website_url);
  if (payload.social_links !== undefined) updates.social_links = payload.social_links || {};
  if (payload.telemedicine_available !== undefined) updates.telemedicine_available = payload.telemedicine_available;
  if (payload.is_verified !== undefined) updates.is_verified = payload.is_verified;
  if (payload.display_order !== undefined) updates.display_order = Math.max(0, payload.display_order);

  // Consent & Publish rules
  let effectiveConsentAt = current.consent_given_at;
  if (payload.consentConfirmed) {
    if (!effectiveConsentAt) {
      effectiveConsentAt = new Date().toISOString();
    }
    updates.consent_given_at = effectiveConsentAt;
  }

  if (payload.is_published !== undefined) {
    if (payload.is_published && !effectiveConsentAt && !payload.consentConfirmed) {
      throw new Error("No se puede publicar un perfil sin consentimiento registrado.");
    }
    updates.is_published = payload.is_published;
  }

  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DoctorDirectoryAdminProfile;
}

/**
 * Toggle publication status for a doctor directory profile.
 */
export async function toggleDoctorDirectoryPublished(
  supabase: SupabaseClient,
  id: string,
  isPublished: boolean
): Promise<DoctorDirectoryAdminProfile> {
  const current = await getDirectoryAdminProfileById(supabase, id);
  if (!current) throw new Error("Perfil no encontrado.");

  if (isPublished && !current.consent_given_at) {
    throw new Error(
      "No se puede publicar el perfil sin el consentimiento previo del médico."
    );
  }

  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .update({ is_published: isPublished })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DoctorDirectoryAdminProfile;
}

/**
 * Unpublish doctor profile (soft archive).
 */
export async function archiveOrUnpublishDoctorProfile(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  await toggleDoctorDirectoryPublished(supabase, id, false);
}
