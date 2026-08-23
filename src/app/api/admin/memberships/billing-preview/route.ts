import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runBillingDryRun } from "@/lib/memberships/billing-engine";

/**
 * GET /api/admin/memberships/billing-preview
 * Admin-only DRY-RUN endpoint to simulate recurring charge generation without database mutations.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Autenticación Server-Side
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Permisos Admin
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

    // 3. Ejecutar simulación DRY-RUN pura (Cero escrituras en DB)
    const dryRunResult = await runBillingDryRun(supabaseAdmin);

    return NextResponse.json({
      success: true,
      data: dryRunResult,
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/admin/memberships/billing-preview:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado al ejecutar billing preview.",
      },
      { status: 500 }
    );
  }
}
