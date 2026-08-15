import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPaymentConfirmationEmail } from "@/lib/email/send-payment-confirmation";

type OpenpayWebhookEvent = {
  type?: string;
  event_date?: string;
  verification_code?: string;

  transaction?: {
    id?: string;
    order_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    authorization?: string | null;
    error_message?: string | null;
    payment_method?: {
      type?: string;
    };
  };
};

type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

function mapOpenpayStatus(
  eventType: string,
  transactionStatus?: string
): PaymentStatus {
  switch (eventType) {
    case "charge.succeeded":
      return "paid";

    case "charge.failed":
      return "failed";

    case "charge.cancelled":
      return "cancelled";

    case "charge.refunded":
      return "refunded";

    case "charge.expired":
      return "expired";

    default:
      break;
  }

  switch (transactionStatus) {
    case "completed":
      return "paid";

    case "failed":
      return "failed";

    case "cancelled":
      return "cancelled";

    case "refunded":
      return "refunded";

    case "expired":
      return "expired";

    case "in_progress":
    case "charge_pending":
      return "processing";

    default:
      return "processing";
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = (await request.json()) as OpenpayWebhookEvent;

    const eventType = event.type ?? "unknown";

    console.log("Webhook Openpay recibido:", eventType);

    /*
     * Openpay envía este evento al registrar una URL de webhook.
     */
    if (eventType === "verification") {
      console.log(
        "Código de verificación Openpay:",
        event.verification_code
      );

      return NextResponse.json(
        {
          received: true,
          verification: true,
        },
        {
          status: 200,
        }
      );
    }

    const transaction = event.transaction;

    if (!transaction?.id && !transaction?.order_id) {
      console.warn("Webhook sin transaction.id ni order_id");

      return NextResponse.json(
        {
          received: true,
        },
        {
          status: 200,
        }
      );
    }

    /*
     * Intentamos localizar la orden primero por openpay_transaction_id y después por reference.
     */
    const selectFields = `
      id,
      reference,
      product_type,
      product_id,
      product_name,
      customer_name,
      customer_last_name,
      customer_email,
      customer_phone,
      customer_document_type,
      customer_document_number,
      category,
      modality,
      amount,
      currency,
      status,
      openpay_transaction_id,
      registration_id,
      confirmation_email_sent_at
    `;

    let orderQuery = supabaseAdmin
      .from("payment_orders")
      .select(selectFields);

    if (transaction.id) {
      orderQuery = orderQuery.eq("openpay_transaction_id", transaction.id);
    } else {
      orderQuery = orderQuery.eq("reference", transaction.order_id);
    }

    let { data: order, error: orderError } = await orderQuery.maybeSingle();

    /*
     * Fallback por order_id si no se encontró por transaction_id
     */
    if (!order && transaction.id && transaction.order_id) {
      const fallbackResult = await supabaseAdmin
        .from("payment_orders")
        .select(selectFields)
        .eq("reference", transaction.order_id)
        .maybeSingle();

      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError) {
      console.error("Error consultando payment_orders:", orderError);

      return NextResponse.json(
        {
          error: "No fue posible consultar la orden.",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
      console.warn("No se encontró la orden para el webhook:", {
        transactionId: transaction.id,
        orderId: transaction.order_id,
      });

      return NextResponse.json(
        {
          received: true,
          orderFound: false,
        },
        {
          status: 200,
        }
      );
    }

    /*
     * Confirmar que el valor y moneda coincidan
     */
    if (
      transaction.amount !== undefined &&
      Number(transaction.amount) !== Number(order.amount)
    ) {
      console.error("El valor recibido no coincide con la orden.", {
        expected: order.amount,
        received: transaction.amount,
      });

      return NextResponse.json(
        {
          error: "El valor de la transacción no coincide.",
        },
        {
          status: 400,
        }
      );
    }

    if (transaction.currency && transaction.currency !== order.currency) {
      console.error("La moneda recibida no coincide con la orden.", {
        expected: order.currency,
        received: transaction.currency,
      });

      return NextResponse.json(
        {
          error: "La moneda de la transacción no coincide.",
        },
        {
          status: 400,
        }
      );
    }

    const newStatus = mapOpenpayStatus(eventType, transaction.status);
    const wasAlreadyPaid = order.status === "paid";

    const updatePayload = {
      status: newStatus,
      openpay_transaction_id: transaction.id ?? order.openpay_transaction_id,
      openpay_status: transaction.status ?? eventType,
      authorization_code: transaction.authorization ?? null,
      payment_method: transaction.payment_method?.type ?? null,
      raw_webhook_response: event,
      paid_at: newStatus === "paid" ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabaseAdmin
      .from("payment_orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      console.error("Error actualizando payment_orders:", updateError);

      return NextResponse.json(
        {
          error: "No fue posible actualizar la orden.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * OBJETIVO 1 & 2: Inscripción automática e Idempotencia
     */
    if (newStatus === "paid") {
      console.log("Pago confirmado por Openpay:", order.reference);

      // Verificación de Idempotencia: ¿Existe inscripción vinculada a la orden o referencia?
      let registrationId = order.registration_id || null;

      const { data: existingReg } = await supabaseAdmin
        .from("registrations")
        .select("id, created_at")
        .or(`payment_order_id.eq.${order.id},payment_reference.eq.${order.reference}`)
        .maybeSingle();

      if (existingReg) {
        console.log("Inscripción previa detectada (Idempotencia asegurada):", {
          reference: order.reference,
          registrationId: existingReg.id,
        });
        registrationId = existingReg.id;

        // Garantizar que la orden tenga guardado el id de inscripción
        if (!order.registration_id) {
          await supabaseAdmin
            .from("payment_orders")
            .update({
              registration_id: existingReg.id,
              registration_created_at: existingReg.created_at || new Date().toISOString(),
            })
            .eq("id", order.id);
        }
      } else if (order.product_type === "event" && order.product_id) {
        // Crear automáticamente la inscripción en public.registrations
        const fullCustomerName = `${order.customer_name || ""} ${order.customer_last_name || ""}`.trim() || "Asistente";

        const orderObj = order as Record<string, unknown>;
        const finalCategory =
          typeof orderObj.category === "string" && orderObj.category.trim()
            ? orderObj.category.trim()
            : "Participante Openpay";
        const finalModality =
          typeof orderObj.modality === "string" && orderObj.modality.trim()
            ? orderObj.modality.trim()
            : "presencial";

        const registrationPayload = {
          payment_order_id: order.id,
          payment_reference: order.reference,
          event_id: order.product_id,
          full_name: fullCustomerName,
          email: (order.customer_email || "").toLowerCase(),
          phone: order.customer_phone || null,
          customer_document_type: order.customer_document_type || "CC",
          document_number: order.customer_document_number || "",
          amount: Number(order.amount),
          modality: finalModality,
          category: finalCategory,
          status: "confirmed",
          payment_status: "paid",
          payment_id: transaction.id || order.openpay_transaction_id || null,
          openpay_transaction_id: transaction.id || order.openpay_transaction_id || null,
          authorization_code: transaction.authorization || null,
          paid_at: new Date().toISOString(),
          origin: "openpay",
        };

        const { data: newReg, error: regError } = await supabaseAdmin
          .from("registrations")
          .insert([registrationPayload])
          .select("id, created_at")
          .single();

        if (regError) {
          console.error("Error al crear inscripción automática:", {
            reference: order.reference,
            error: regError.message,
          });
        } else if (newReg) {
          registrationId = newReg.id;
          console.log("Inscripción creada exitosamente:", newReg.id);

          // OBJETIVO 3: Actualizar payment_orders con registration_id y registration_created_at
          await supabaseAdmin
            .from("payment_orders")
            .update({
              registration_id: newReg.id,
              registration_created_at: newReg.created_at || new Date().toISOString(),
            })
            .eq("id", order.id);
        }
      } else {
        console.warn("Pago aprobado omitió inscripción (falta product_id o product_type invalido):", {
          reference: order.reference,
          productType: order.product_type,
          productId: order.product_id,
        });
      }

      // OBJETIVO 4: Envío de Correo de Confirmación
      if (!order.confirmation_email_sent_at && order.customer_email) {
        try {
          const emailResult = await sendPaymentConfirmationEmail({
            customerName: order.customer_name || "Estimado(a)",
            customerLastName: order.customer_last_name || "",
            customerEmail: order.customer_email,
            eventName: order.product_name || "Evento SOVOGIN",
            reference: order.reference,
            amount: Number(order.amount),
            currency: order.currency || "COP",
            authorizationCode: transaction.authorization || null,
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
            console.error("Fallo al enviar correo de confirmación:", emailResult.error);
            await supabaseAdmin
              .from("payment_orders")
              .update({
                confirmation_email_error: emailResult.error || "Error al enviar correo",
              })
              .eq("id", order.id);
          }
        } catch (mailErr: any) {
          console.error("Excepción en servicio de correo:", mailErr.message);
          await supabaseAdmin
            .from("payment_orders")
            .update({
              confirmation_email_error: mailErr.message || "Excepción enviando correo",
            })
            .eq("id", order.id);
        }
      }
    }

    return NextResponse.json(
      {
        received: true,
        orderFound: true,
        status: newStatus,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error procesando webhook Openpay:", error);

    return NextResponse.json(
      {
        error: "La notificación recibida no es válida.",
      },
      {
        status: 400,
      }
    );
  }
}