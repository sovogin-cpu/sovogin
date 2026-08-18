import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ planId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        { error: "planId es requerido." },
        { status: 400 }
      );
    }

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

    const body = await request.json().catch(() => ({}));

    // Cargar el plan existente
    const { data: existingPlan, error: findError } = await supabaseAdmin
      .from("membership_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (findError || !existingPlan) {
      return NextResponse.json(
        { error: "El plan especificado no fue encontrado." },
        { status: 404 }
      );
    }

    // Campos a actualizar
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.description !== undefined) updateData.description = body.description ? String(body.description).trim() : null;
    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);
    if (body.grace_period_days !== undefined) updateData.grace_period_days = Math.max(0, Number(body.grace_period_days) || 0);
    if (body.minimum_payment_amount !== undefined) updateData.minimum_payment_amount = Math.max(0, Number(body.minimum_payment_amount) || 0);
    if (body.allow_partial_payments !== undefined) updateData.allow_partial_payments = Boolean(body.allow_partial_payments);
    if (body.allow_overpayments !== undefined) updateData.allow_overpayments = Boolean(body.allow_overpayments);
    if (body.allow_custom_amount !== undefined) updateData.allow_custom_amount = Boolean(body.allow_custom_amount);

    if (body.standard_amount !== undefined && existingPlan.billing_mode === "recurring") {
      const amt = Number(body.standard_amount);
      if (amt <= 0) {
        return NextResponse.json(
          { error: "La tarifa estándar para planes recurrentes debe ser mayor a cero." },
          { status: 400 }
        );
      }
      updateData.standard_amount = amt;
    }

    // Manejo de modo de anclaje y campos fijos
    const anchorMode = body.billing_anchor_mode !== undefined ? body.billing_anchor_mode : existingPlan.billing_anchor_mode;
    if (body.billing_anchor_mode !== undefined) {
      if (!["anniversary", "fixed", "manual"].includes(anchorMode)) {
        return NextResponse.json(
          { error: "Modo de anclaje (billing_anchor_mode) inválido." },
          { status: 400 }
        );
      }
      updateData.billing_anchor_mode = anchorMode;
    }

    if (anchorMode === "fixed") {
      const dayVal = body.fixed_anchor_day !== undefined ? body.fixed_anchor_day : existingPlan.fixed_anchor_day;
      const dayNum = Number(dayVal);
      if (!dayNum || dayNum < 1 || dayNum > 31) {
        return NextResponse.json(
          { error: "El día fijo de anclaje debe estar entre 1 y 31." },
          { status: 400 }
        );
      }
      updateData.fixed_anchor_day = dayNum;

      if (body.fixed_anchor_month !== undefined) {
        updateData.fixed_anchor_month = body.fixed_anchor_month ? Number(body.fixed_anchor_month) : null;
      }
    } else {
      updateData.fixed_anchor_day = null;
      updateData.fixed_anchor_month = null;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from("membership_plans")
      .update(updateData)
      .eq("id", planId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar el plan: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: "Plan de membresía actualizado exitosamente. Los cambios aplicarán a futuras obligaciones.",
    });
  } catch (error: unknown) {
    console.error("Excepción en PATCH /api/admin/memberships/plans/[planId]:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al actualizar el plan.",
      },
      { status: 500 }
    );
  }
}
