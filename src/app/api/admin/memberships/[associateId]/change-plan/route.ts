import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ associateId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { associateId } = await params;

    if (!associateId || typeof associateId !== "string") {
      return NextResponse.json(
        { error: "associateId es requerido." },
        { status: 400 }
      );
    }

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
    const { newPlanId, reason } = body;

    if (!newPlanId || typeof newPlanId !== "string") {
      return NextResponse.json(
        { error: "El nuevo plan (newPlanId) es requerido." },
        { status: 400 }
      );
    }

    const cleanReason = reason ? String(reason).trim() : "";
    if (cleanReason.length < 3) {
      return NextResponse.json(
        { error: "El motivo del cambio de plan debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    // 3. Invocar exclusivamente la RPC atómica transaccional de Supabase
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "change_associate_membership_plan",
      {
        p_associate_id: associateId.trim(),
        p_new_plan_id: newPlanId.trim(),
        p_reason: cleanReason,
      }
    );

    if (rpcError) {
      console.error("Error en RPC change_associate_membership_plan:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Error al ejecutar el cambio de plan atómico." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: "Plan de membresía actualizado exitosamente con registro de auditoría.",
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/[associateId]/change-plan:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al cambiar el plan.",
      },
      { status: 500 }
    );
  }
}
