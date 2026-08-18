import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { listAssociateMembershipsSummary } from "@/lib/memberships/memberships-repository";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Verificación de Autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol Admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    // 3. Consultar la cartera general desde el repository
    const result = await listAssociateMembershipsSummary(supabase);

    return NextResponse.json({
      success: true,
      summaries: result.summaries,
      kpis: result.kpis,
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/admin/memberships:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al consultar la cartera de membresías.",
      },
      { status: 500 }
    );
  }
}
