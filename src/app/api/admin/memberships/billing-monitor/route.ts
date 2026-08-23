import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/memberships/billing-monitor
 * Admin-only read-only observability endpoint for system charges and automated billing metrics.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Server-side Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Admin Permission Check
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

    // 3. Compute Current Calendar Month Date Range (Colombia Timezone / UTC)
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    // 4. Query System Charges in Current Calendar Month
    const { data: monthCharges, error: monthErr } = await supabase
      .from("membership_charges")
      .select("original_amount")
      .eq("source", "system")
      .gte("created_at", startOfMonth);

    if (monthErr) {
      console.error("[BILLING-MONITOR] Error fetching month charges:", monthErr);
    }

    const monthSystemChargesCount = monthCharges?.length || 0;
    const monthSystemChargesAmount = (monthCharges || []).reduce(
      (sum, item) => sum + Number(item.original_amount || 0),
      0
    );

    // 5. Query Latest System Charge
    const { data: latestCharge, error: latestErr } = await supabase
      .from("membership_charges")
      .select("created_at, concept, original_amount")
      .eq("source", "system")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      console.error("[BILLING-MONITOR] Error fetching latest charge:", latestErr);
    }

    // 6. Query Recent 10 System Charges with Associate Name
    const { data: recentCharges, error: recentErr } = await supabase
      .from("membership_charges")
      .select(`
        id,
        concept,
        original_amount,
        currency,
        due_date,
        period_start,
        period_end,
        admin_status,
        created_at,
        associates (
          full_name
        )
      `)
      .eq("source", "system")
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentErr) {
      console.error("[BILLING-MONITOR] Error fetching recent charges:", recentErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        monthSystemChargesCount,
        monthSystemChargesAmount,
        latestSystemChargeDate: latestCharge?.created_at || null,
        recentSystemCharges: (recentCharges || []).map((charge) => {
          // Normalize associate full_name safely whether returned as object, array, or null
          const assoc = charge.associates;
          const associateName = Array.isArray(assoc)
            ? assoc[0]?.full_name || "Asociado"
            : (assoc as { full_name?: string } | null)?.full_name || "Asociado";

          return {
            id: charge.id,
            associateName,
            concept: charge.concept,
            originalAmount: Number(charge.original_amount),
            currency: charge.currency,
            dueDate: charge.due_date,
            periodStart: charge.period_start,
            periodEnd: charge.period_end,
            adminStatus: charge.admin_status,
            createdAt: charge.created_at,
          };
        }),
      },
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/admin/memberships/billing-monitor:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al cargar el monitoreo de facturación.",
      },
      { status: 500 }
    );
  }
}
