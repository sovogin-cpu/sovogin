import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listMembershipPlans } from "@/lib/memberships/memberships-repository";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Autenticación
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

    const plans = await listMembershipPlans(supabase);

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/admin/memberships/plans:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al consultar los planes de membresía.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const {
      name,
      description,
      currency = "COP",
      standard_amount = 0,
      billing_mode = "recurring",
      billing_interval_unit,
      billing_interval_count,
      billing_anchor_mode = "anniversary",
      fixed_anchor_month,
      fixed_anchor_day,
      allow_partial_payments = true,
      allow_overpayments = true,
      allow_custom_amount = true,
      minimum_payment_amount = 0,
      grace_period_days = 10,
      is_active = true,
    } = body;

    // 3. Validaciones de Payload según constraints reales de DB
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre del plan es requerido." },
        { status: 400 }
      );
    }

    if (!["recurring", "manual", "free"].includes(billing_mode)) {
      return NextResponse.json(
        { error: "Modo de cobro (billing_mode) inválido." },
        { status: 400 }
      );
    }

    if (!["anniversary", "fixed", "manual"].includes(billing_anchor_mode)) {
      return NextResponse.json(
        { error: "Modo de anclaje (billing_anchor_mode) inválido." },
        { status: 400 }
      );
    }

    // Normalizar payload según el modo de cobro
    let finalAmount = Number(standard_amount) || 0;
    let finalUnit = billing_interval_unit || null;
    let finalCount = Number(billing_interval_count) || null;

    if (billing_mode === "recurring") {
      if (finalAmount <= 0) {
        return NextResponse.json(
          { error: "Los planes recurrentes requieren una tarifa mayor a cero." },
          { status: 400 }
        );
      }
      if (!["day", "week", "month", "year"].includes(finalUnit)) {
        return NextResponse.json(
          { error: "El intervalo de cobro es inválido." },
          { status: 400 }
        );
      }
      if (!finalCount || finalCount < 1) {
        return NextResponse.json(
          { error: "El número de intervalos debe ser de al menos 1." },
          { status: 400 }
        );
      }
    } else if (billing_mode === "free") {
      finalAmount = 0;
      finalUnit = null;
      finalCount = null;
    } else if (billing_mode === "manual") {
      finalUnit = null;
      finalCount = null;
    }

    // Normalizar anclaje fijo
    let finalFixMonth = fixed_anchor_month ? Number(fixed_anchor_month) : null;
    let finalFixDay = fixed_anchor_day ? Number(fixed_anchor_day) : null;

    if (billing_anchor_mode === "fixed") {
      if (!finalFixDay || finalFixDay < 1 || finalFixDay > 31) {
        return NextResponse.json(
          { error: "El día fijo de anclaje debe estar entre 1 y 31." },
          { status: 400 }
        );
      }
    } else {
      finalFixMonth = null;
      finalFixDay = null;
    }

    const payload = {
      name: name.trim(),
      description: description ? String(description).trim() : null,
      currency: String(currency).trim().toUpperCase().substring(0, 3),
      standard_amount: finalAmount,
      billing_mode,
      billing_interval_unit: finalUnit,
      billing_interval_count: finalCount,
      billing_anchor_mode,
      fixed_anchor_month: finalFixMonth,
      fixed_anchor_day: finalFixDay,
      allow_partial_payments: Boolean(allow_partial_payments),
      allow_overpayments: Boolean(allow_overpayments),
      allow_custom_amount: Boolean(allow_custom_amount),
      minimum_payment_amount: Math.max(0, Number(minimum_payment_amount) || 0),
      grace_period_days: Math.max(0, Number(grace_period_days) || 0),
      is_active: Boolean(is_active),
    };

    const { data: newPlan, error: insertError } = await supabaseAdmin
      .from("membership_plans")
      .insert([payload])
      .select()
      .single();

    if (insertError) {
      console.error("Error insertando plan de membresía:", insertError);
      return NextResponse.json(
        { error: "Error al crear el plan de membresía: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
      message: "Plan de membresía creado exitosamente.",
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/plans:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al crear el plan.",
      },
      { status: 500 }
    );
  }
}
