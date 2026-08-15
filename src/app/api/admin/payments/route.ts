import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_STATUSES = [
  "all",
  "pending",
  "processing",
  "pending_verification",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
];

const VALID_METHODS = ["all", "breb", "openpay"];

export async function GET(request: NextRequest) {
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

    // 2. Verificación de Rol de Administrador en profiles
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

    // 3. Extracción y Validación de Query Parameters
    const { searchParams } = request.nextUrl;
    const method = searchParams.get("method") || "all";
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json(
        { error: "Filtro de método de pago inválido." },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Filtro de estado de orden inválido." },
        { status: 400 }
      );
    }

    // 4. Selección explícita de campos para la consulta administrativa
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
      amount,
      currency,
      payment_method,
      status,
      category,
      modality,
      breb_transaction_reference,
      breb_reported_at,
      breb_verified_at,
      breb_verified_by,
      breb_rejection_reason,
      registration_id,
      paid_at,
      created_at
    `;

    let dbQuery = supabaseAdmin
      .from("payment_orders")
      .select(selectFields)
      .order("created_at", { ascending: false });

    // 5. Aplicación de Filtro por Método de Pago
    if (method === "breb") {
      dbQuery = dbQuery.eq("payment_method", "breb_qr");
    } else if (method === "openpay") {
      dbQuery = dbQuery.neq("payment_method", "breb_qr");
    }

    // 6. Aplicación de Filtro por Estado
    if (status !== "all") {
      dbQuery = dbQuery.eq("status", status);
    }

    const { data: orders, error: dbError } = await dbQuery;

    if (dbError) {
      console.error("Error al consultar payment_orders en GET /api/admin/payments:", dbError);
      return NextResponse.json(
        { error: "Error al consultar las órdenes de pago en la base de datos." },
        { status: 500 }
      );
    }

    let items = orders || [];

    // 7. Filtrado de Búsqueda Server-Side (Referencia, Nombre, Email, Producto, Ref Bancaria)
    if (search.trim() !== "") {
      const term = search.trim().toLowerCase();
      items = items.filter(
        (o) =>
          o.reference?.toLowerCase().includes(term) ||
          o.customer_name?.toLowerCase().includes(term) ||
          o.customer_last_name?.toLowerCase().includes(term) ||
          o.customer_email?.toLowerCase().includes(term) ||
          o.product_name?.toLowerCase().includes(term) ||
          o.breb_transaction_reference?.toLowerCase().includes(term)
      );
    }

    return NextResponse.json({
      success: true,
      orders: items,
    });
  } catch (error: unknown) {
    console.error("Excepción en GET /api/admin/payments:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al obtener las órdenes de pago." },
      { status: 500 }
    );
  }
}
