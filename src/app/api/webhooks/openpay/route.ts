import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

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
    const event =
      (await request.json()) as OpenpayWebhookEvent;

    const eventType = event.type ?? "unknown";

    console.log("Webhook Openpay recibido:", eventType);

    /*
     * Openpay envía este evento al registrar
     * una URL de webhook.
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
      console.warn(
        "Webhook sin transaction.id ni order_id"
      );

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
     * Intentamos localizar la orden primero por
     * openpay_transaction_id y después por reference.
     */
    let orderQuery = supabaseAdmin
      .from("payment_orders")
      .select(
        `
          id,
          reference,
          amount,
          currency,
          status,
          openpay_transaction_id
        `
      );

    if (transaction.id) {
      orderQuery = orderQuery.eq(
        "openpay_transaction_id",
        transaction.id
      );
    } else {
      orderQuery = orderQuery.eq(
        "reference",
        transaction.order_id
      );
    }

    let { data: order, error: orderError } =
      await orderQuery.maybeSingle();

    /*
     * Si no se encontró por transaction_id,
     * intentamos buscar por order_id.
     */
    if (
      !order &&
      transaction.id &&
      transaction.order_id
    ) {
      const fallbackResult = await supabaseAdmin
        .from("payment_orders")
        .select(
          `
            id,
            reference,
            amount,
            currency,
            status,
            openpay_transaction_id
          `
        )
        .eq("reference", transaction.order_id)
        .maybeSingle();

      order = fallbackResult.data;
      orderError = fallbackResult.error;
    }

    if (orderError) {
      console.error(
        "Error consultando payment_orders:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "No fue posible consultar la orden.",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
      console.warn(
        "No se encontró la orden para el webhook:",
        {
          transactionId: transaction.id,
          orderId: transaction.order_id,
        }
      );

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
     * Confirmar que el valor del webhook coincida.
     */
    if (
      transaction.amount !== undefined &&
      Number(transaction.amount) !==
        Number(order.amount)
    ) {
      console.error(
        "El valor recibido no coincide con la orden.",
        {
          expected: order.amount,
          received: transaction.amount,
        }
      );

      return NextResponse.json(
        {
          error:
            "El valor de la transacción no coincide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      transaction.currency &&
      transaction.currency !== order.currency
    ) {
      console.error(
        "La moneda recibida no coincide con la orden.",
        {
          expected: order.currency,
          received: transaction.currency,
        }
      );

      return NextResponse.json(
        {
          error:
            "La moneda de la transacción no coincide.",
        },
        {
          status: 400,
        }
      );
    }

    const newStatus = mapOpenpayStatus(
      eventType,
      transaction.status
    );

    const wasAlreadyPaid =
      order.status === "paid";

    const updatePayload = {
      status: newStatus,

      openpay_transaction_id:
        transaction.id ??
        order.openpay_transaction_id,

      openpay_status:
        transaction.status ?? eventType,

      authorization_code:
        transaction.authorization ?? null,

      payment_method:
        transaction.payment_method?.type ?? null,

      raw_webhook_response: event,

      paid_at:
        newStatus === "paid"
          ? new Date().toISOString()
          : null,
    };

    const { error: updateError } =
      await supabaseAdmin
        .from("payment_orders")
        .update(updatePayload)
        .eq("id", order.id);

    if (updateError) {
      console.error(
        "Error actualizando payment_orders:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No fue posible actualizar la orden.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Este bloque se ejecutará solo la primera
     * vez que una orden cambie a paid.
     */
    if (
      newStatus === "paid" &&
      !wasAlreadyPaid
    ) {
      console.log(
        "Pago confirmado por Openpay:",
        order.reference
      );

      /*
       * Próximamente aquí conectaremos:
       *
       * - creación del registro del asistente
       * - activación de la inscripción
       * - correo de confirmación
       * - generación de comprobante
       */
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
    console.error(
      "Error procesando webhook Openpay:",
      error
    );

    return NextResponse.json(
      {
        error:
          "La notificación recibida no es válida.",
      },
      {
        status: 400,
      }
    );
  }
}