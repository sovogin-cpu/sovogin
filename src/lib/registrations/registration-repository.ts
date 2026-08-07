import { SupabaseClient } from "@supabase/supabase-js";
import {
  CreateManualRegistrationDTO,
  Registration,
  RegistrationEventItem,
  RegistrationFilterState,
} from "./types";
import { cleanEmail } from "./registration-utils";

export async function listRegistrationsAdmin(
  supabase: SupabaseClient,
  filters?: Partial<RegistrationFilterState>
): Promise<Registration[]> {
  let query = supabase
    .from("registrations")
    .select("*, events(id, title)")
    .order("created_at", { ascending: false });

  if (filters?.eventId && filters.eventId !== "all") {
    query = query.eq("event_id", filters.eventId);
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters?.origin && filters.origin !== "all") {
    query = query.eq("origin", filters.origin);
  }

  if (filters?.modality && filters.modality !== "all") {
    query = query.eq("modality", filters.modality);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al listar inscripciones administrativas:", error);
    throw error;
  }

  let items = (data as Registration[]) || [];

  if (filters?.searchQuery && filters.searchQuery.trim() !== "") {
    const term = filters.searchQuery.trim().toLowerCase();
    items = items.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.document_number?.toLowerCase().includes(term) ||
        r.payment_reference?.toLowerCase().includes(term) ||
        r.events?.title?.toLowerCase().includes(term)
    );
  }

  return items;
}

export async function listEventsForAdminRegistration(
  supabase: SupabaseClient
): Promise<RegistrationEventItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error al cargar eventos para inscripciones:", error);
    return [];
  }

  return (data as RegistrationEventItem[]) || [];
}

export async function findPossibleDuplicateRegistration(
  supabase: SupabaseClient,
  eventId: string,
  documentNumber?: string | null,
  email?: string | null,
  excludeId?: string
): Promise<Registration | null> {
  if (!eventId) return null;

  const cleanDoc = documentNumber?.trim();
  const normalizedEmail = email ? cleanEmail(email) : "";

  if (!cleanDoc && !normalizedEmail) return null;

  let query = supabase.from("registrations").select("id, full_name, email, document_number, event_id").eq("event_id", eventId);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  if (cleanDoc) {
    query = query.eq("document_number", cleanDoc);
  } else if (normalizedEmail) {
    query = query.eq("email", normalizedEmail);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Error consultando duplicados de inscripción:", error);
    return null;
  }

  return (data as Registration) || null;
}

export async function createManualRegistration(
  supabase: SupabaseClient,
  dto: CreateManualRegistrationDTO
): Promise<Registration> {
  const normalizedEmail = cleanEmail(dto.email);

  const payload = {
    event_id: dto.event_id,
    full_name: dto.full_name.trim(),
    email: normalizedEmail,
    phone: dto.phone?.trim() || null,
    customer_document_type: dto.customer_document_type || "CC",
    document_number: dto.document_number?.trim() || null,
    amount: typeof dto.amount === "number" ? dto.amount : 0,
    modality: dto.modality || "presencial",
    category: dto.category?.trim() || null,
    status: dto.status || "confirmed",
    payment_status: dto.payment_status || "not_required",
    origin: dto.origin,
    payment_order_id: null,
    payment_reference: null,
    openpay_transaction_id: null,
    authorization_code: null,
    paid_at: dto.payment_status === "paid" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("registrations")
    .insert([payload])
    .select("*, events(id, title)")
    .single();

  if (error) {
    console.error("Error al crear inscripción manual:", error);
    throw error;
  }

  return data as Registration;
}

export async function updateManualRegistration(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Registration>
): Promise<Registration> {
  const { data, error } = await supabase
    .from("registrations")
    .update(updates)
    .eq("id", id)
    .select("*, events(id, title)")
    .single();

  if (error) {
    console.error("Error al actualizar inscripción:", error);
    throw error;
  }

  return data as Registration;
}

export async function cancelRegistration(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("registrations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("Error al cancelar inscripción:", error);
    throw error;
  }
}

export async function deleteRegistrationRecord(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("registrations").delete().eq("id", id);

  if (error) {
    console.error("Error al eliminar registro de inscripción:", error);
    throw error;
  }
}
