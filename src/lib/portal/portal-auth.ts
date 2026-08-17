import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface AssociateSessionResult {
  user: { id: string; email?: string } | null;
  associate: {
    id: string;
    full_name: string;
    email: string;
    document_number?: string | null;
    specialty?: string | null;
    status: string;
    user_id?: string | null;
    created_at?: string;
  } | null;
  error: string | null;
  status: number;
}

/**
 * Resolves identity server-side strictly through Supabase Auth session -> associate by user_id -> status === 'Activo'.
 * Never accepts associate_id from client input.
 */
export async function resolveAssociateSession(): Promise<AssociateSessionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      associate: null,
      error: "No autenticado. Por favor inicie sesión en el Portal del Asociado.",
      status: 401,
    };
  }

  const { data: associate, error: assocError } = await supabaseAdmin
    .from("associates")
    .select("id, full_name, email, document_number, specialty, status, user_id, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (assocError || !associate) {
    return {
      user: { id: user.id, email: user.email },
      associate: null,
      error: "Expediente de asociado no encontrado o no vinculado a esta cuenta de usuario.",
      status: 403,
    };
  }

  if (associate.status !== "Activo") {
    return {
      user: { id: user.id, email: user.email },
      associate,
      error: "Su membresía SOVOGIN no se encuentra activa actualmente.",
      status: 403,
    };
  }

  return {
    user: { id: user.id, email: user.email },
    associate,
    error: null,
    status: 200,
  };
}
