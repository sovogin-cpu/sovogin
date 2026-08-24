import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Guardrail Server-Only
if (typeof window !== "undefined") {
  throw new Error("El helper de autenticación admin sólo puede ejecutarse en el servidor.");
}

export class AuthError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Valida que la petición provenga de un usuario autenticado con rol 'admin' en la tabla profiles
 */
export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Usuario no autenticado.", 401);
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new AuthError("Acceso denegado: Se requieren permisos de administrador.", 403);
  }

  return user;
}
