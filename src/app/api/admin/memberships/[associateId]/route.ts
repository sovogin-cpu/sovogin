import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAssociateMembershipLedgerDetail } from "@/lib/memberships/memberships-repository";

type RouteParams = {
  params: Promise<{ associateId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { associateId } = await params;

    if (!associateId || typeof associateId !== "string") {
      return NextResponse.json(
        { error: "associateId es requerido." },
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

    const detail = await getAssociateMembershipLedgerDetail(
      supabase,
      associateId.trim()
    );

    if (!detail) {
      return NextResponse.json(
        { error: "No se encontró el asociado especificado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      detail,
    });
  } catch (error: unknown) {
    console.error(
      "Error en GET /api/admin/memberships/[associateId]:",
      error
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al consultar el expediente de membresía del asociado.",
      },
      { status: 500 }
    );
  }
}
