import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  isBreBPaymentOrder,
  canSubmitBreBPaymentForVerification,
} from "@/lib/payments/breb-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference || typeof reference !== "string") {
      return NextResponse.json(
        { error: "La referencia de pago es requerida." },
        { status: 400 }
      );
    }

    const cleanRef = reference.trim();

    // 1. Consultar la orden de pago en la base de datos
    const { data: order, error: orderError } = await supabaseAdmin
      .from("payment_orders")
      .select(
        "id, reference, status, payment_method, amount, product_name, breb_reported_at"
      )
      .eq("reference", cleanRef)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "La orden de pago no existe o no fue encontrada." },
        { status: 404 }
      );
    }

    // 2. Verificar que corresponda a un método de pago Bre-B
    if (!isBreBPaymentOrder(order.payment_method, order.reference)) {
      return NextResponse.json(
        {
          error:
            "La orden de pago indicada no corresponde a una transferencia Bre-B.",
        },
        { status: 400 }
      );
    }

    // 3. Comportamiento Idempotente según el Estado Actual de la Orden
    if (order.status === "pending_verification") {
      return NextResponse.json({
        success: true,
        alreadyReported: true,
        status: "pending_verification",
        reference: order.reference,
        brebReportedAt: order.breb_reported_at,
        message:
          "El pago ya se encuentra en proceso de verificación por el equipo administrativo.",
      });
    }

    if (
      order.status === "paid" ||
      order.status === "cancelled" ||
      order.status === "failed" ||
      order.status === "expired" ||
      order.status === "refunded"
    ) {
      return NextResponse.json({
        success: true,
        alreadyReported: true,
        status: order.status,
        reference: order.reference,
        message: `La orden de pago se encuentra en estado final (${order.status}).`,
      });
    }

    // 4. Si la orden está en estado 'pending', realizar transición a 'pending_verification'
    if (canSubmitBreBPaymentForVerification(order.status)) {
      const nowIso = new Date().toISOString();
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "pending_verification",
          breb_reported_at: nowIso,
        })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("id, reference, status, breb_reported_at")
        .maybeSingle();

      if (updateError) {
        console.error(
          "Error al actualizar orden a pending_verification:",
          updateError
        );
        return NextResponse.json(
          { error: "Error al registrar el reporte de pago Bre-B." },
          { status: 500 }
        );
      }

      if (updatedOrder) {
        return NextResponse.json({
          success: true,
          alreadyReported: false,
          status: "pending_verification",
          reference: order.reference,
          brebReportedAt: updatedOrder.breb_reported_at,
          message:
            "Tu reporte de pago ha sido recibido y está pendiente de verificación administrativa.",
        });
      }

      // Si updatedOrder es null: otra solicitud actualizó la orden concurrentemente
      const { data: recheckedOrder } = await supabaseAdmin
        .from("payment_orders")
        .select("id, reference, status, breb_reported_at, payment_method")
        .eq("id", order.id)
        .maybeSingle();

      const currentStatus = recheckedOrder?.status || order.status;

      if (currentStatus === "pending_verification") {
        return NextResponse.json({
          success: true,
          alreadyReported: true,
          status: "pending_verification",
          reference: order.reference,
          brebReportedAt:
            recheckedOrder?.breb_reported_at ||
            order.breb_reported_at ||
            nowIso,
          message:
            "El pago ya se encuentra en proceso de verificación por el equipo administrativo.",
        });
      }

      if (
        currentStatus === "paid" ||
        currentStatus === "cancelled" ||
        currentStatus === "failed" ||
        currentStatus === "expired" ||
        currentStatus === "refunded"
      ) {
        return NextResponse.json({
          success: true,
          alreadyReported: true,
          status: currentStatus,
          reference: order.reference,
          brebReportedAt:
            recheckedOrder?.breb_reported_at || order.breb_reported_at,
          message: `La orden de pago se encuentra en estado final (${currentStatus}).`,
        });
      }

      return NextResponse.json(
        {
          error:
            "No fue posible actualizar el estado de la orden. Intenta nuevamente.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyReported: true,
      status: order.status,
      reference: order.reference,
    });
  } catch (error: unknown) {
    console.error("Error en POST /api/payments/breb/report:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al reportar el pago Bre-B.",
      },
      { status: 500 }
    );
  }
}
