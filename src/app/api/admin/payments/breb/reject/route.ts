import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RejectRequestBody = {
  orderId: string;
  reason: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificación de Autenticación Server-Side
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol de Administrador
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

    const body = (await request.json()) as RejectRequestBody;
    const { orderId, reason } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId es requerido." },
        { status: 400 }
      );
    }

    const cleanReason = typeof reason === "string" ? reason.trim() : "";
    if (cleanReason.length < 5) {
      return NextResponse.json(
        { error: "Debes ingresar un motivo de rechazo de al menos 5 caracteres." },
        { status: 400 }
      );
    }

    if (cleanReason.length > 500) {
      return NextResponse.json(
        { error: "El motivo de rechazo no puede superar los 500 caracteres." },
        { status: 400 }
      );
    }

    // 3. Invocación RPC Transaccional para Rechazo con Lock
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "reject_breb_payment_order",
      {
        p_order_id: orderId.trim(),
        p_admin_id: user.id,
        p_reason: cleanReason,
      }
    );

    if (rpcError) {
      console.error("Error en RPC reject_breb_payment_order:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Error al procesar el rechazo del pago Bre-B." },
        { status: 400 }
      );
    }

    const result = rpcResult as {
      success: boolean;
      already_cancelled?: boolean;
    };

    return NextResponse.json({
      success: true,
      alreadyCancelled: !!result.already_cancelled,
      message: result.already_cancelled
        ? "El reporte de pago ya se encontraba rechazado."
        : "Reporte de pago Bre-B rechazado correctamente.",
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/payments/breb/reject:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al procesar el rechazo Bre-B.",
      },
      { status: 500 }
    );
  }
}
