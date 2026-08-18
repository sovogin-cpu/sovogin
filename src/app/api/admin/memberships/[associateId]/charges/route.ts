import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ associateId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { associateId } = await params;

    if (!associateId || typeof associateId !== "string") {
      return NextResponse.json({ error: "associateId es requerido." }, { status: 400 });
    }

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

    const body = await request.json().catch(() => ({}));
    const { concept, originalAmount, dueDate, currency = "COP", periodStart, periodEnd, billingCycleKey } = body;

    const cleanConcept = concept ? String(concept).trim() : "";
    if (!cleanConcept) {
      return NextResponse.json({ error: "El concepto del cargo es requerido." }, { status: 400 });
    }

    const amountNum = Number(originalAmount);
    if (!amountNum || amountNum <= 0) {
      return NextResponse.json({ error: "El monto del cargo debe ser mayor a cero." }, { status: 400 });
    }

    if (!dueDate || typeof dueDate !== "string") {
      return NextResponse.json({ error: "La fecha de vencimiento es requerida." }, { status: 400 });
    }

    // 3. Invocar RPC atómica de creación de cargo + aplicación de crédito no asignado
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("create_membership_charge", {
      p_associate_id: associateId.trim(),
      p_concept: cleanConcept,
      p_original_amount: amountNum,
      p_due_date: dueDate.trim(),
      p_currency: String(currency).trim().toUpperCase().substring(0, 3),
      p_period_start: periodStart ? String(periodStart).trim() : null,
      p_period_end: periodEnd ? String(periodEnd).trim() : null,
      p_billing_cycle_key: billingCycleKey ? String(billingCycleKey).trim() : null,
      p_source: "manual_admin",
    });

    if (rpcError) {
      console.error("Error en RPC create_membership_charge:", rpcError);
      return NextResponse.json({ error: rpcError.message || "Error al crear el cargo manual." }, { status: 400 });
    }

    const creditAllocated = rpcResult?.credit_allocations_created || 0;
    const msg = creditAllocated > 0
      ? `Cargo creado exitosamente. Se aplicó automáticamente el crédito a favor preexistente.`
      : `Cargo creado exitosamente.`;

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: msg,
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/[associateId]/charges:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ocurrió un error inesperado al crear el cargo.",
      },
      { status: 500 }
    );
  }
}
