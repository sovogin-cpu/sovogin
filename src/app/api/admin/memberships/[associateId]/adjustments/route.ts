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
    const { chargeId, type, amount, reason } = body;

    if (!chargeId || typeof chargeId !== "string") {
      return NextResponse.json({ error: "El chargeId es requerido." }, { status: 400 });
    }

    const cleanType = type ? String(type).trim().toLowerCase() : "";
    if (!["waiver", "discount", "write_off"].includes(cleanType)) {
      return NextResponse.json(
        { error: "El tipo de ajuste es inválido. Debe ser 'waiver', 'discount' o 'write_off'." },
        { status: 400 }
      );
    }

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return NextResponse.json({ error: "El monto del ajuste debe ser mayor a cero." }, { status: 400 });
    }

    const cleanReason = reason ? String(reason).trim() : "";
    if (cleanReason.length < 3) {
      return NextResponse.json({ error: "El motivo del ajuste debe tener al menos 3 caracteres." }, { status: 400 });
    }

    // 3. Invocar RPC atómica de creación de ajuste
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("create_membership_adjustment", {
      p_charge_id: chargeId.trim(),
      p_type: cleanType,
      p_amount: amountNum,
      p_reason: cleanReason,
    });

    if (rpcError) {
      console.error("Error en RPC create_membership_adjustment:", rpcError);
      return NextResponse.json({ error: rpcError.message || "Error al aplicar el ajuste." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: "Ajuste contable aplicado exitosamente.",
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/[associateId]/adjustments:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ocurrió un error inesperado al aplicar el ajuste.",
      },
      { status: 500 }
    );
  }
}
