import { SupabaseClient } from "@supabase/supabase-js";
import {
  DoctorDirectoryFilters,
  DoctorDirectoryProfilePublic,
} from "./types";

/**
 * List published doctor directory profiles.
 * Mandatory filters: is_published = true AND consent_given_at IS NOT NULL.
 * Order: display_order ASC, display_name ASC.
 *
 * NOTE ON ACTIVE ASSOCIATES:
 * Active associate status verification will be enforced in future server-side functions.
 * Currently administrators manage is_published when associate status changes.
 */
export async function listPublishedDoctors(
  supabase: SupabaseClient,
  filters?: DoctorDirectoryFilters
): Promise<DoctorDirectoryProfilePublic[]> {
  let query = supabase
    .from("doctor_directory_profiles")
    .select(
      "id, display_name, specialty, subspecialty, city, public_phone, public_email, office_address, profile_media_id, bio, website_url, telemedicine_available, consent_given_at, is_published, display_order, created_at, updated_at"
    )
    .eq("is_published", true)
    .not("consent_given_at", "is", null);

  if (filters?.specialty && filters.specialty !== "all") {
    query = query.eq("specialty", filters.specialty);
  }

  if (filters?.city && filters.city !== "all") {
    query = query.eq("city", filters.city);
  }

  if (filters?.telemedicineAvailable !== undefined) {
    query = query.eq("telemedicine_available", filters.telemedicineAvailable);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `display_name.ilike.${term},specialty.ilike.${term},subspecialty.ilike.${term},city.ilike.${term}`
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
 * Mandatory filters: is_published = true AND consent_given_at IS NOT NULL.
 */
export async function getPublishedDoctorById(
  supabase: SupabaseClient,
  id: string
): Promise<DoctorDirectoryProfilePublic | null> {
  const { data, error } = await supabase
    .from("doctor_directory_profiles")
    .select(
      "id, display_name, specialty, subspecialty, city, public_phone, public_email, office_address, profile_media_id, bio, website_url, telemedicine_available, consent_given_at, is_published, display_order, created_at, updated_at"
    )
    .eq("id", id)
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
