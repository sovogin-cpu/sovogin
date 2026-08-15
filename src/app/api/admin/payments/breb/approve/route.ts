import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPaymentConfirmationEmail } from "@/lib/email/send-payment-confirmation";

type ApproveRequestBody = {
  orderId: string;
  brebTransactionReference?: string;
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

    const body = (await request.json()) as ApproveRequestBody;
    const { orderId, brebTransactionReference } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId es requerido." },
        { status: 400 }
      );
    }

    const cleanRef = typeof brebTransactionReference === "string" ? brebTransactionReference.trim() : undefined;

    // 3. Invocación RPC Transaccional con Bloqueo FOR UPDATE
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "approve_breb_payment_order",
      {
        p_order_id: orderId.trim(),
        p_admin_id: user.id,
        p_breb_transaction_reference: cleanRef || null,
      }
    );

    if (rpcError) {
      console.error("Error en RPC approve_breb_payment_order:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Error al procesar la aprobación del pago Bre-B." },
        { status: 400 }
      );
    }

    const result = rpcResult as {
      success: boolean;
      already_paid?: boolean;
      registration_id?: string;
    };

    // 4. Envío de Correo de Confirmación de Inscripción (Idempotente)
    // El envío de correo ocurre fuera de la transacción para no revertir la aprobación si la red falla.
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select(
        `
        id,
        reference,
        product_id,
        product_name,
        customer_name,
        customer_last_name,
        customer_email,
        amount,
        currency,
        confirmation_email_sent_at
        `
      )
      .eq("id", orderId.trim())
      .maybeSingle();

    if (order && order.customer_email && !order.confirmation_email_sent_at) {
      try {
        const emailResult = await sendPaymentConfirmationEmail({
          customerName: order.customer_name || "Estimado(a)",
          customerLastName: order.customer_last_name || "",
          customerEmail: order.customer_email,
          eventName: order.product_name || "Simposio SOVOGIN",
          reference: order.reference,
          amount: Number(order.amount),
          currency: order.currency || "COP",
          authorizationCode: "BREB-CONFIRMED",
          paidAt: new Date().toISOString(),
          productId: order.product_id || null,
        });

        if (emailResult.success) {
          await supabaseAdmin
            .from("payment_orders")
            .update({
              confirmation_email_sent_at: new Date().toISOString(),
              confirmation_email_error: null,
            })
            .eq("id", order.id);
        } else {
          console.error("Error enviando correo tras aprobación Bre-B:", emailResult.error);
          await supabaseAdmin
            .from("payment_orders")
            .update({
              confirmation_email_error: emailResult.error || "Fallo en servicio de email",
            })
            .eq("id", order.id);
        }
      } catch (mailErr: unknown) {
        const errMsg = mailErr instanceof Error ? mailErr.message : "Excepción en envío de correo";
        console.error("Excepción enviando correo Bre-B:", errMsg);
        await supabaseAdmin
          .from("payment_orders")
          .update({ confirmation_email_error: errMsg })
          .eq("id", order.id);
      }
    }

    return NextResponse.json({
      success: true,
      alreadyPaid: !!result.already_paid,
      registrationId: result.registration_id,
      message: result.already_paid
        ? "El pago ya se encontraba previamente aprobado."
        : "Pago Bre-B aprobado e inscripción creada exitosamente.",
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/payments/breb/approve:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al aprobar el pago Bre-B.",
      },
      { status: 500 }
    );
  }
}
