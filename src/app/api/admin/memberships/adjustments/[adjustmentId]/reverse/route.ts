import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ adjustmentId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { adjustmentId } = await params;

    if (!adjustmentId || typeof adjustmentId !== "string") {
      return NextResponse.json({ error: "adjustmentId es requerido." }, { status: 400 });
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
    const { reason } = body;

    const cleanReason = reason ? String(reason).trim() : "";
    if (cleanReason.length < 3) {
      return NextResponse.json(
        { error: "El motivo de la reversión de ajuste debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    // 3. Invocar la RPC atómica reverse_membership_adjustment
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("reverse_membership_adjustment", {
      p_adjustment_id: adjustmentId.trim(),
      p_reason: cleanReason,
    });

    if (rpcError) {
      console.error("Error en RPC reverse_membership_adjustment:", rpcError);
      return NextResponse.json({ error: rpcError.message || "Error al revertir el ajuste." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: "Ajuste revertido exitosamente.",
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/adjustments/[adjustmentId]/reverse:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ocurrió un error inesperado al revertir el ajuste.",
      },
      { status: 500 }
    );
  }
}
