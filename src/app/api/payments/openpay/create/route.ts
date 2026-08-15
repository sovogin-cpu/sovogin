import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createOpenpayRedirectCharge } from "@/lib/openpay/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveEventRegistrationPrice } from "@/lib/payments/event-pricing";

type PaymentRequestBody = {
  productId: string;
  productType: "event";

  customerName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;

  customerDocumentType: string;
  customerDocumentNumber: string;

  category?: string;
  modality?: string;
};

const allowedDocumentTypes = [
  "CC",
  "CE",
  "PAS",
  "NIT",
  "TI",
  "PEP",
  "PPT",
  "OTHER",
] as const;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDocumentNumber(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let createdOrderId: string | null = null;

  try {
    const body = (await request.json()) as PaymentRequestBody;

    const productId = normalizeText(body.productId);
    const productType = normalizeText(body.productType);

    const customerName = normalizeText(body.customerName);
    const customerLastName = normalizeText(body.customerLastName);
    const customerEmail = normalizeText(body.customerEmail).toLowerCase();
    const customerPhone = normalizeText(body.customerPhone);

    const customerDocumentType = normalizeText(
      body.customerDocumentType
    ).toUpperCase();

    const customerDocumentNumber = normalizeDocumentNumber(
      body.customerDocumentNumber
    );

    const category = normalizeText(body.category);
    const modality = normalizeText(body.modality);

    if (
      !productId ||
      !customerName ||
      !customerLastName ||
      !customerEmail ||
      !customerDocumentType ||
      !customerDocumentNumber
    ) {
      return NextResponse.json(
        {
          error: "Debes completar todos los campos obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (productType !== "event") {
      return NextResponse.json(
        {
          error: "El tipo de producto no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedDocumentTypes.includes(
        customerDocumentType as
          | "CC"
          | "CE"
          | "PAS"
          | "NIT"
          | "TI"
          | "PEP"
          | "PPT"
          | "OTHER"
      )
    ) {
      return NextResponse.json(
        {
          error: "El tipo de identificación seleccionado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      customerDocumentNumber.length < 4 ||
      customerDocumentNumber.length > 30
    ) {
      return NextResponse.json(
        {
          error: "El número de identificación debe tener entre 4 y 30 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidEmail(customerEmail)) {
      return NextResponse.json(
        {
          error: "El correo electrónico no tiene un formato válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Consultamos el evento directamente en Supabase.
     * El precio se calcula server-side según category y modality.
     */
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select(
        `
          id,
          title,
          description,
          date,
          location,
          price,
          tiered_pricing
        `
      )
      .eq("id", productId)
      .single();

    if (eventError || !event) {
      console.error("Error buscando el evento:", eventError);

      return NextResponse.json(
        {
          error: "El evento no existe o no está disponible.",
        },
        {
          status: 404,
        }
      );
    }

    // Resolución y validación estricta de precio server-side
    let resolvedPricing;
    try {
      resolvedPricing = resolveEventRegistrationPrice(event, category, modality);
    } catch (pricingError: unknown) {
      const msg = pricingError instanceof Error ? pricingError.message : "Error al validar la tarifa del evento.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { amount, category: resolvedCategory, modality: resolvedModality } = resolvedPricing;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "La categoría y modalidad seleccionadas no tienen un precio mayor a cero.",
        },
        {
          status: 400,
        }
      );
    }

    const reference = `SOV-${Date.now()}-${randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase()}`;

    /*
     * Creamos primero la orden en Supabase.
     */
    const { data: order, error: orderError } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        reference,

        product_type: "event",
        product_id: event.id,
        product_name: event.title,

        customer_name: customerName,
        customer_last_name: customerLastName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,

        customer_document_type: customerDocumentType,
        customer_document_number: customerDocumentNumber,

        category: resolvedCategory,
        modality: resolvedModality,

        amount,
        currency: "COP",
        status: "pending",
      })
      .select(
        `
          id,
          reference,
          product_name,
          amount,
          status,
          category,
          modality
        `
      )
      .single();

    if (orderError || !order) {
      console.error("Error creando la orden:", orderError);

      return NextResponse.json(
        {
          error: "No fue posible crear la orden de pago.",
        },
        {
          status: 500,
        }
      );
    }

    createdOrderId = order.id;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    /*
     * Creamos el pago redireccionado en Openpay.
     */
    const openpayCharge = await createOpenpayRedirectCharge({
      amount,
      description: `${event.title} - Sovogin`,
      orderId: reference,
      redirectUrl:
        `${siteUrl}/pago/resultado/` + encodeURIComponent(reference),
      customer: {
        name: customerName,
        last_name: customerLastName,
        phone_number: customerPhone || undefined,
        email: customerEmail,
      },
    });

    const paymentUrl = openpayCharge.payment_method?.url;

    if (!paymentUrl) {
      await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "failed",
          openpay_transaction_id: openpayCharge.id || null,
          openpay_status: openpayCharge.status || null,
          raw_openpay_response: openpayCharge,
        })
        .eq("id", order.id);

      return NextResponse.json(
        {
          error: "Openpay no devolvió un enlace de pago.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * Guardamos la información devuelta por Openpay.
     */
    const { error: updateError } = await supabaseAdmin
      .from("payment_orders")
      .update({
        status: "processing",
        openpay_transaction_id: openpayCharge.id,
        openpay_status: openpayCharge.status,
        openpay_payment_url: paymentUrl,
        payment_method: openpayCharge.payment_method?.type || "card",
        raw_openpay_response: openpayCharge,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Error actualizando la orden:", updateError);

      return NextResponse.json(
        {
          error:
            "El pago fue creado, pero no fue posible actualizar la orden.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      reference,
      paymentUrl,
    });
  } catch (error) {
    console.error("Error creando pago Openpay:", error);

    /*
     * Si la orden ya había sido creada y ocurre un error,
     * intentamos dejarla como fallida.
     */
    if (createdOrderId) {
      await supabaseAdmin
        .from("payment_orders")
        .update({
          status: "failed",
        })
        .eq("id", createdOrderId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al crear el pago.",
      },
      {
        status: 500,
      }
    );
  }
}