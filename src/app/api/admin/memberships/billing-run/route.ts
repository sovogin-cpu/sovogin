import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runBillingExecution } from "@/lib/memberships/billing-engine";

/**
 * POST /api/admin/memberships/billing-run
 * Admin-only execution endpoint to generate recurring membership charges in DB.
 * Requires explicit confirmation in request body: { "confirmation": "GENERATE_MEMBERSHIP_CHARGES" }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Server-side Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Admin Permission Check
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

    // 3. Mandatory Explicit Confirmation Check
    let body: { confirmation?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Se requiere un cuerpo JSON válido con la confirmación explícita." },
        { status: 400 }
      );
    }

    if (body.confirmation !== "GENERATE_MEMBERSHIP_CHARGES") {
      return NextResponse.json(
        {
          error:
            'Confirmación inválida o ausente. Debe enviar { "confirmation": "GENERATE_MEMBERSHIP_CHARGES" } para ejecutar la facturación.',
        },
        { status: 400 }
      );
    }

    // 4. Run Server-Side Billing Execution using Admin Client
    const executionResult = await runBillingExecution(supabaseAdmin);

    // 5. Server-side Observability Logging (Quantities only, no sensitive tokens/keys)
    console.log(
      `[BILLING-RUN] Run Date: ${executionResult.today} | Scanned: ${executionResult.scanned} | Eligible: ${executionResult.eligible} | Candidates: ${executionResult.candidatesCount} | Created: ${executionResult.createdCount} | IdempotentSkipped: ${executionResult.idempotentSkippedCount} | Failed: ${executionResult.failedCount} | CatchUpLimited: ${executionResult.catchUpLimitedMembershipsCount}`
    );

    return NextResponse.json({
      success: true,
      data: executionResult,
    });
  } catch (error: unknown) {
    console.error("Error en POST /api/admin/memberships/billing-run:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al ejecutar la facturación masiva.",
      },
      { status: 500 }
    );
  }
}
