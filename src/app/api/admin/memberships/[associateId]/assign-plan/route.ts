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
    const { planId, categoryId, billingAnchorDate } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        { error: "El plan (planId) es requerido." },
        { status: 400 }
      );
    }

    // 3. Validar Asociado
    const { data: associate } = await supabaseAdmin
      .from("associates")
      .select("id, full_name, email")
      .eq("id", associateId.trim())
      .maybeSingle();

    if (!associate) {
      return NextResponse.json(
        { error: "No se encontró el asociado especificado." },
        { status: 404 }
      );
    }

    // 4. Validar que NO tenga membresía preexistente
    const { data: existingMem } = await supabaseAdmin
      .from("associate_memberships")
      .select("id")
      .eq("associate_id", associate.id)
      .maybeSingle();

    if (existingMem) {
      return NextResponse.json(
        {
          error:
            "El asociado ya posee una membresía asignada. Utilice la opción de 'Cambiar Plan' para actualizar su plan.",
        },
        { status: 400 }
      );
    }

    // 5. Validar Plan
    const { data: plan } = await supabaseAdmin
      .from("membership_plans")
      .select("id, is_active, name")
      .eq("id", planId.trim())
      .maybeSingle();

    if (!plan) {
      return NextResponse.json(
        { error: "El plan de membresía seleccionado no existe." },
        { status: 404 }
      );
    }

    if (!plan.is_active) {
      return NextResponse.json(
        { error: "El plan seleccionado se encuentra inactivo." },
        { status: 400 }
      );
    }

    // 6. Validar Categoría
    let finalCategoryId = categoryId ? String(categoryId).trim() : null;
    if (finalCategoryId) {
      const { data: cat } = await supabaseAdmin
        .from("membership_categories")
        .select("id")
        .eq("id", finalCategoryId)
        .maybeSingle();

      if (!cat) {
        return NextResponse.json(
          { error: "La categoría especificada no existe." },
          { status: 404 }
        );
      }
    } else {
      // Intentar obtener categoría predeterminada activa
      const { data: defaultCat } = await supabaseAdmin
        .from("membership_categories")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      finalCategoryId = defaultCat?.id || null;
    }

    const anchorDate = billingAnchorDate
      ? String(billingAnchorDate).trim()
      : new Date().toISOString().substring(0, 10);

    // 7. Insertar associate_memberships
    const { data: newMembership, error: insertError } = await supabaseAdmin
      .from("associate_memberships")
      .insert([
        {
          associate_id: associate.id,
          membership_plan_id: plan.id,
          category_id: finalCategoryId,
          started_at: new Date().toISOString(),
          billing_anchor_date: anchorDate,
          billing_status: "active",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error al asignar membresía inicial:", insertError);
      return NextResponse.json(
        { error: "Error al registrar la membresía: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: newMembership,
      message: `Membresía inicial asignada exitosamente a ${associate.full_name}.`,
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/memberships/[associateId]/assign-plan:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al asignar la membresía.",
      },
      { status: 500 }
    );
  }
}
