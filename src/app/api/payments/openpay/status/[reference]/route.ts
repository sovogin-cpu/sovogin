import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;
    const decodedReference = decodeURIComponent(reference || "");

    if (!decodedReference) {
      return NextResponse.json(
        { error: "Referencia no provista" },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from("payment_orders")
      .select(`
        reference,
        product_id,
        product_name,
        amount,
        currency,
        status,
        openpay_status,
        authorization_code,
        paid_at,
        created_at
      `)
      .eq("reference", decodedReference)
      .maybeSingle();

    if (error) {
      console.error("Error buscando estado de orden:", {
        reference: decodedReference,
        message: error.message,
        code: error.code,
      });

      return NextResponse.json(
        { error: "Error al consultar la orden" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: order.status,
      openpayStatus: order.openpay_status,
      paidAt: order.paid_at,
      amount: order.amount,
      currency: order.currency,
      productName: order.product_name,
      productId: order.product_id,
      reference: order.reference,
    });
  } catch (err: any) {
    console.error("Error inesperado consultando estado de orden:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
