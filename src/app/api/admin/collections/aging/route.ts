import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getMembershipAgingReport } from "@/lib/memberships/aging-engine";
import { CollectionAction } from "@/lib/collections/types";
import {
  enrichAssociatesWithCollectionsStatus,
  filterAndSortEnrichedAssociates,
} from "@/lib/collections/collections-dashboard-service";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verificación de Autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol Admin
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

    // 3. Obtener Parámetros de Consulta
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const accountStatusFilter = searchParams.get("account_status") || "ALL";
    const agingBucketFilter = searchParams.get("aging_bucket") || "ALL";
    const collectionStatusFilter = searchParams.get("collection_status") || "ALL";
    const sortOption = searchParams.get("sort") || "dpd_desc";
    const asOfDateParam = searchParams.get("as_of_date") || undefined;

    // 4. Invocación de Verdad Financiera Inmutable desde Aging Engine (4A5.1)
    const agingReport = await getMembershipAgingReport(supabase, {
      asOfDate: asOfDateParam,
    });

    const rawAssociates = agingReport.associates || [];
    const uniqueAssociateIds = Array.from(new Set(rawAssociates.map((a) => a.associate_id)));

    // 5. Batch Query Anti-N+1 Optimizado para Gestiones de Cobranza (4A5.2)
    const actionsByAssociateId: Record<string, CollectionAction[]> = {};

    if (uniqueAssociateIds.length > 0) {
      const { data: actionsData, error: actionsErr } = await supabase
        .from("collection_actions")
        .select("id, associate_id, action_type, result_status, promised_payment_date, promised_payment_amount, next_follow_up_at, created_at")
        .in("associate_id", uniqueAssociateIds)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });

      if (actionsErr) {
        console.error("Fallo crítico al consultar collection_actions en batch:", actionsErr);
        return NextResponse.json(
          { error: "Error al consultar las gestiones de cobranza de la base de datos." },
          { status: 500 }
        );
      }

      if (actionsData) {
        for (const act of actionsData as CollectionAction[]) {
          if (!actionsByAssociateId[act.associate_id]) {
            actionsByAssociateId[act.associate_id] = [];
          }
          actionsByAssociateId[act.associate_id].push(act);
        }
      }
    }

    // 6. Enriquecer con helpers puros probados
    const evalNowIsoStr = new Date().toISOString();
    const enrichedAssociates = enrichAssociatesWithCollectionsStatus(
      rawAssociates,
      actionsByAssociateId,
      evalNowIsoStr
    );

    // 7. Filtrado y ordenamiento determinista
    const filteredAndSorted = filterAndSortEnrichedAssociates(enrichedAssociates, {
      search,
      accountStatusFilter,
      agingBucketFilter,
      collectionStatusFilter,
      sortOption,
    });

    return NextResponse.json({
      success: true,
      as_of_date: agingReport.as_of_date,
      summary: agingReport.summary,
      associates: filteredAndSorted,
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/admin/collections/aging:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al consultar el reporte de antigüedad de cartera y cobranza.",
      },
      { status: 500 }
    );
  }
}
