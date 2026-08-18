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
    const { amount, paymentMethod, paidAt, currency = "COP", notes } = body;

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return NextResponse.json({ error: "El monto del pago debe ser mayor a cero." }, { status: 400 });
    }

    const cleanMethod = paymentMethod ? String(paymentMethod).trim() : "";
    if (!cleanMethod) {
      return NextResponse.json({ error: "El método de pago es requerido." }, { status: 400 });
    }

    let formattedPaidAt = paidAt ? String(paidAt).trim() : new Date().toISOString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(formattedPaidAt)) {
      formattedPaidAt = `${formattedPaidAt}T12:00:00Z`;
    }

    // 3. Invocar RPC atómica de registro de pago + asignaciones FIFO
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("register_membership_payment", {
      p_associate_id: associateId.trim(),
      p_amount: amountNum,
      p_payment_method: cleanMethod,
      p_paid_at: formattedPaidAt,
      p_currency: String(currency).trim().toUpperCase().substring(0, 3),
      p_notes: notes ? String(notes).trim() : null,
    });

    if (rpcError) {
      console.error("Error en RPC register_membership_payment:", rpcError);
      return NextResponse.json({ error: rpcError.message || "Error al registrar el pago manual." }, { status: 400 });
    }

    const allocationsCreated = rpcResult?.allocations_created || 0;
    const unallocatedCredit = rpcResult?.unallocated_credit || 0;

    let msg = `Pago registrado exitosamente.`;
    if (allocationsCreated > 0) {
      msg += ` Se aplicaron ${allocationsCreated} asignaciones a deudas pendientes.`;
    }
    if (unallocatedCredit > 0) {
      msg += ` Quedan ${unallocatedCredit} como crédito a favor disponible.`;
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: msg,
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/[associateId]/payments:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ocurrió un error inesperado al registrar el pago.",
      },
      { status: 500 }
    );
  }
}
