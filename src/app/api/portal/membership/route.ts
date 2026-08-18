import { NextResponse } from "next/server";
import { resolveAssociateSession } from "@/lib/portal/portal-auth";
import { getAssociateMembershipLedgerDetail } from "@/lib/memberships/memberships-repository";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  PortalChargeDTO,
  PortalMembershipDTO,
  PortalMembershipSummary,
  PortalPaymentDTO,
} from "@/lib/portal/membership-types";

/**
 * GET /api/portal/membership
 * Returns the logged-in associate's own membership ledger formatted as PortalMembershipDTO.
 * Identity is strictly resolved server-side from session auth cookie (user_id -> associate.id).
 * No associateId is accepted from client parameters.
 */
export async function GET() {
  try {
    // 1. Resolver sesión del asociado de forma segura server-side
    const sessionRes = await resolveAssociateSession();

    if (sessionRes.error || !sessionRes.associate) {
      return NextResponse.json(
        { success: false, error: sessionRes.error || "Acceso no autorizado." },
        { status: sessionRes.status }
      );
    }

    const associateId = sessionRes.associate.id;

    // 2. Obtener el expediente del repositorio central de membresías
    const ledgerDetail = await getAssociateMembershipLedgerDetail(supabaseAdmin, associateId);

    if (!ledgerDetail) {
      return NextResponse.json(
        { success: false, error: "No se encontró la información de membresía del asociado." },
        { status: 444 }
      );
    }

    // 3. Mapear DTO seguro para Portal
    const summary: PortalMembershipSummary = {
      category_name: ledgerDetail.summary.category_name,
      plan_name: ledgerDetail.summary.plan_name,
      billing_mode: ledgerDetail.membership?.plan?.billing_mode || "manual",
      billing_status: ledgerDetail.summary.billing_status,
      financial_status: ledgerDetail.summary.financial_status,
      currency: ledgerDetail.summary.currency,
      outstanding_balance: ledgerDetail.summary.outstanding_balance,
      credit_balance: ledgerDetail.summary.credit_balance,
      total_paid: ledgerDetail.summary.total_paid,
      total_charged: ledgerDetail.summary.total_charged,
      next_due_date: ledgerDetail.summary.next_due_date || null,
      grace_period_days: ledgerDetail.summary.grace_period_days,
      has_active_membership: Boolean(ledgerDetail.membership),
    };

    const charges: PortalChargeDTO[] = ledgerDetail.charges.map((c) => ({
      id: c.id,
      concept: c.concept,
      original_amount: Number(c.original_amount),
      allocated_amount: Number(c.allocated_amount || 0),
      adjustments_amount: Number(c.adjustments_amount || 0),
      net_debt: Number(c.net_debt || 0),
      due_date: c.due_date,
      admin_status: c.admin_status,
      is_overdue: Boolean(c.is_overdue),
    }));

    const payments: PortalPaymentDTO[] = ledgerDetail.payments
      .filter((p) => p.status === "completed" || p.status === "refunded")
      .map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paid_at: p.paid_at,
        payment_method: p.payment_method,
        status: p.status,
        currency: p.currency,
      }));

    const dto: PortalMembershipDTO = {
      summary,
      charges,
      payments,
    };

    return NextResponse.json({
      success: true,
      data: dto,
    });
  } catch (error: unknown) {
    console.error("Excepción en GET /api/portal/membership:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado al consultar membresía.",
      },
      { status: 500 }
    );
  }
}
