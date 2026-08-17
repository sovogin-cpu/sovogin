import { NextRequest, NextResponse } from "next/server";
import { resolveAssociateSession } from "@/lib/portal/portal-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CommercialBenefit, CommercialBenefitPrivateDetails, PortalCommercialBenefit } from "@/lib/commercial-benefits/types";
import { resolveCommercialBenefitMediaBatch } from "@/lib/commercial-benefits/public-commercial-benefits-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Verificación de Seguridad Server-Side
    const session = await resolveAssociateSession();

    if (session.error || !session.associate) {
      return NextResponse.json(
        { success: false, error: session.error || "Acceso no autorizado." },
        { status: session.status }
      );
    }

    if (session.associate.status !== "Activo") {
      return NextResponse.json(
        { success: false, error: "Su membresía SOVOGIN no se encuentra activa." },
        { status: 403 }
      );
    }

    // 2. Consultar convenios públicos vigentes en public.commercial_benefits
    const nowIso = new Date().toISOString();

    const { data: publicBenefits, error: publicError } = await supabaseAdmin
      .from("commercial_benefits")
      .select(
        "id, name, benefit_title, short_description, full_description, logo_media_id, promotional_media_id, link_url, starts_at, ends_at, display_order, is_active, is_featured, created_at, updated_at"
      )
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (publicError) {
      console.error("Error al consultar commercial_benefits:", publicError);
      return NextResponse.json(
        { success: false, error: "No se pudieron cargar los beneficios comerciales." },
        { status: 500 }
      );
    }

    const rawPublicList = (publicBenefits as CommercialBenefit[]) || [];
    if (rawPublicList.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        benefits: [],
      });
    }

    // 3. Consultar datos privados aislados desde public.commercial_benefit_private_details (Design B)
    const benefitIds = rawPublicList.map((b) => b.id);
    const privateDetailsMap: Record<string, CommercialBenefitPrivateDetails> = {};

    const { data: privateDetails, error: privateError } = await supabaseAdmin
      .from("commercial_benefit_private_details")
      .select("benefit_id, discount_code, redemption_instructions, exclusive_link_url")
      .in("benefit_id", benefitIds);

    if (privateError) {
      console.error("Error al consultar detalles privados de convenios en DB.");
      return NextResponse.json(
        { success: false, error: "No se pudieron consultar los detalles de los convenios." },
        { status: 500 }
      );
    }

    if (privateDetails) {
      privateDetails.forEach((row: CommercialBenefitPrivateDetails) => {
        if (row.benefit_id) {
          privateDetailsMap[row.benefit_id] = row;
        }
      });
    }

    // 4. Resolver URLs firmadas de medios de los beneficios
    const resolvedMediaBatch = await resolveCommercialBenefitMediaBatch(
      supabaseAdmin,
      rawPublicList
    );

    // 5. Merge SERVER-SIDE de datos públicos + privados + medios firmados
    const portalBenefits: PortalCommercialBenefit[] = rawPublicList.map((benefit) => {
      const mediaInfo = resolvedMediaBatch.find((m) => m.benefit.id === benefit.id);
      const privateRow = privateDetailsMap[benefit.id];

      return {
        ...benefit,
        discount_code: privateRow?.discount_code || null,
        redemption_instructions: privateRow?.redemption_instructions || null,
        exclusive_link_url: privateRow?.exclusive_link_url || null,
        logoSignedUrl: mediaInfo?.logoSignedUrl || null,
        promotionalSignedUrl: mediaInfo?.promotionalSignedUrl || null,
      };
    });

    return NextResponse.json({
      success: true,
      count: portalBenefits.length,
      benefits: portalBenefits,
    });
  } catch (error: unknown) {
    console.error("Excepción en GET /api/portal/benefits:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al obtener los beneficios.",
      },
      { status: 500 }
    );
  }
}
