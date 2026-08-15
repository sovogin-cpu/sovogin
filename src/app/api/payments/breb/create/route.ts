import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createBreBPaymentReference } from "@/lib/payments/breb-utils";
import { resolveEventRegistrationPrice } from "@/lib/payments/event-pricing";

type BreBCreateRequestBody = {
  productId: string;
  productType?: "event";

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
  try {
    const body = (await request.json()) as BreBCreateRequestBody;

    const productId = normalizeText(body.productId);
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
        { error: "Debes completar todos los campos obligatorios." },
        { status: 400 }
      );
    }

    if (
      !allowedDocumentTypes.includes(
        customerDocumentType as (typeof allowedDocumentTypes)[number]
      )
    ) {
      return NextResponse.json(
        { error: "El tipo de identificación seleccionado no es válido." },
        { status: 400 }
      );
    }

    if (
      customerDocumentNumber.length < 4 ||
      customerDocumentNumber.length > 30
    ) {
      return NextResponse.json(
        {
          error:
            "El número de identificación debe tener entre 4 y 30 caracteres.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(customerEmail)) {
      return NextResponse.json(
        { error: "El correo electrónico no tiene un formato válido." },
        { status: 400 }
      );
    }

    // 1. Obtener el evento directamente de la base de datos (Precio calculado server-side con tiered_pricing)
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title, price, tiered_pricing")
      .eq("id", productId)
      .single();

    if (eventError || !event) {
      console.error("Error buscando evento para orden Bre-B:", eventError);
      return NextResponse.json(
        { error: "El evento no existe o no está disponible." },
        { status: 404 }
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
        { error: "La categoría y modalidad seleccionadas no tienen un precio mayor a cero." },
        { status: 400 }
      );
    }

    // 2. Generar referencia única de pago Bre-B (SOV-BREB-{timestamp}-{random})
    const reference = createBreBPaymentReference();

    // 3. Crear la orden de pago en payment_orders con category y modality
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
        payment_method: "breb_qr",
      })
      .select("id, reference, product_name, amount, status, payment_method, category, modality")
      .single();

    if (orderError || !order) {
      console.error("Error creando la orden Bre-B:", orderError);
      return NextResponse.json(
        { error: "No fue posible generar la orden de pago Bre-B." },
        { status: 500 }
      );
    }

    // 4. Obtener la imagen del QR Oficial de Banco de Bogotá desde site_settings
    let brebQrUrl = "/img/breb-qr-official.png";
    const { data: settingsData } = await supabaseAdmin
      .from("site_settings")
      .select("data")
      .eq("id", "general")
      .maybeSingle();

    if (settingsData && settingsData.data) {
      const customQr =
        (settingsData.data as Record<string, unknown>).breb_qr_image_url ||
        (settingsData.data as Record<string, unknown>).breb_qr_media_url;
      if (typeof customQr === "string" && customQr.trim().length > 0) {
        brebQrUrl = customQr.trim();
      }
    }

    return NextResponse.json({
      success: true,
      reference: order.reference,
      orderId: order.id,
      amount: order.amount,
      eventTitle: order.product_name,
      brebQrUrl,
      status: order.status,
    });
  } catch (error: unknown) {
    console.error("Error en POST /api/payments/breb/create:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al procesar la orden Bre-B.",
      },
      { status: 500 }
    );
  }
}
