import { SupabaseClient } from "@supabase/supabase-js";
import {
  AssociateMembershipSummary,
  FinancialStatus,
  MembershipAdjustment,
  MembershipCharge,
  MembershipLedgerDetail,
  MembershipPayment,
  MembershipPaymentAllocation,
  MembershipPlan,
  MembershipPlanChange,
  OverallPortfolioKpis,
} from "./types";

/**
 * Calculates financial status based on outstanding balance, credit balance, and overdue charges.
 * Precedence:
 * 1. EN MORA (has overdue debt > 0)
 * 2. PENDIENTE (has active debt > 0 within grace period)
 * 3. A FAVOR (no debt, has unallocated credit > 0)
 * 4. AL DÍA (no debt, 0 credit)
 */
export function calculateFinancialStatus(
  outstandingBalance: number,
  creditBalance: number,
  hasOverdueCharges: boolean
): FinancialStatus {
  if (outstandingBalance > 0 && hasOverdueCharges) {
    return "EN MORA";
  }
  if (outstandingBalance > 0) {
    return "PENDIENTE";
  }
  if (creditBalance > 0) {
    return "A FAVOR";
  }
  return "AL DÍA";
}

import { parseMembershipDateOnly } from "./date-utils";

/**
 * Helper to add days to a date string YYYY-MM-DD
 */

function isDateOverdue(dueDateStr: string, gracePeriodDays: number, now = new Date()): boolean {
  if (!dueDateStr) return false;
  const dueDate = parseMembershipDateOnly(dueDateStr);
  // Set to end of day of the due_date + grace_period
  dueDate.setDate(dueDate.getDate() + gracePeriodDays);
  dueDate.setHours(23, 59, 59, 999);
  return now > dueDate;
}

/**
 * Fetches all membership plans (Catalogue)
 */
export async function listMembershipPlans(
  supabase: SupabaseClient
): Promise<MembershipPlan[]> {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching membership plans:", error);
    throw error;
  }

  return (data as MembershipPlan[]) || [];
}

/**
 * Fetches overall portfolio summary and per-associate breakdown
 */
export async function listAssociateMembershipsSummary(
  supabase: SupabaseClient
): Promise<{
  summaries: AssociateMembershipSummary[];
  kpis: OverallPortfolioKpis;
}> {
  const now = new Date();

  // Fetch data in parallel for optimal performance
  const [
    { data: associatesData, error: assocErr },
    { data: membershipsData, error: memErr },
    { data: chargesData, error: chrErr },
    { data: paymentsData, error: payErr },
    { data: allocationsData, error: alcErr },
    { data: adjustmentsData, error: adjErr },
  ] = await Promise.all([
    supabase
      .from("associates")
      .select("id, full_name, email, document_number, specialty, status")
      .order("full_name", { ascending: true }),
    supabase.from("associate_memberships").select(
      "*, plan:membership_plans(*), category:membership_categories(*)"
    ),
    supabase
      .from("membership_charges")
      .select("*")
      .order("due_date", { ascending: true }),
    supabase
      .from("membership_payments")
      .select("*")
      .order("paid_at", { ascending: false }),
    supabase.from("membership_payment_allocations").select("*"),
    supabase.from("membership_adjustments").select("*"),
  ]);

  if (assocErr) throw assocErr;
  if (memErr) throw memErr;
  if (chrErr) throw chrErr;
  if (payErr) throw payErr;
  if (alcErr) throw alcErr;
  if (adjErr) throw adjErr;

  const associates = associatesData || [];
  const memberships = membershipsData || [];
  const charges = (chargesData || []) as MembershipCharge[];
  const payments = (paymentsData || []) as MembershipPayment[];
  const allocations = (allocationsData || []) as MembershipPaymentAllocation[];
  const adjustments = (adjustmentsData || []) as MembershipAdjustment[];

  // Maps for efficient lookups
  const membershipByAssociateId = new Map(
    memberships.map((m) => [m.associate_id, m])
  );

  // Filter valid completed payments
  const completedPayments = payments.filter((p) => p.status === "completed");
  const completedPaymentIdSet = new Set(completedPayments.map((p) => p.id));

  // Filter valid active allocations (not reversed AND belonging to completed payment)
  const activeAllocations = allocations.filter(
    (a) => !a.reversed_at && completedPaymentIdSet.has(a.payment_id)
  );

  // Group active allocations by charge_id and by payment_id
  const allocationsByChargeId = new Map<string, number>();
  const allocationsByPaymentId = new Map<string, number>();

  for (const alc of activeAllocations) {
    allocationsByChargeId.set(
      alc.charge_id,
      (allocationsByChargeId.get(alc.charge_id) || 0) + Number(alc.amount)
    );
    allocationsByPaymentId.set(
      alc.payment_id,
      (allocationsByPaymentId.get(alc.payment_id) || 0) + Number(alc.amount)
    );
  }

  // Group net adjustments by charge_id
  const adjustmentsByChargeId = new Map<string, number>();
  for (const adj of adjustments) {
    if (!adj.charge_id) continue;
    const current = adjustmentsByChargeId.get(adj.charge_id) || 0;
    const isCreditAdjustment = [
      "waiver",
      "discount",
      "write_off",
    ].includes(adj.type);
    const delta = isCreditAdjustment
      ? Number(adj.amount)
      : -Number(adj.amount); // reversal subtracts adjustment
    adjustmentsByChargeId.set(adj.charge_id, current + delta);
  }

  // Aggregate per associate
  let totalRecaudo = 0;
  let totalDeudaPendiente = 0;
  let totalCreditoAFavor = 0;
  let totalAsociadosEnMora = 0;

  const summaries: AssociateMembershipSummary[] = associates.map((assoc) => {
    const mem = membershipByAssociateId.get(assoc.id);
    const plan = mem?.plan;
    const category = mem?.category;

    const gracePeriodDays = plan?.grace_period_days ?? 10;
    const currency = plan?.currency || "COP";

    // Charges for this associate
    const assocCharges = charges.filter(
      (c) => c.associate_id === assoc.id && c.admin_status === "open"
    );

    let assocOutstandingBalance = 0;
    let assocHasOverdue = false;
    let nextDueDate: string | null = null;

    for (const chg of assocCharges) {
      const allocated = allocationsByChargeId.get(chg.id) || 0;
      const netAdjustments = adjustmentsByChargeId.get(chg.id) || 0;
      const netDebt = Math.max(
        0,
        Number(chg.original_amount) - allocated - netAdjustments
      );

      if (netDebt > 0) {
        assocOutstandingBalance += netDebt;
        const overdue = isDateOverdue(chg.due_date, gracePeriodDays, now);
        if (overdue) {
          assocHasOverdue = true;
        }

        if (!nextDueDate || new Date(chg.due_date) < new Date(nextDueDate)) {
          nextDueDate = chg.due_date;
        }
      }
    }

    // Payments for this associate
    const assocPayments = completedPayments.filter(
      (p) => p.associate_id === assoc.id
    );

    let assocTotalPaid = 0;
    let assocUnallocatedCredit = 0;
    let lastPaymentDate: string | null = null;

    for (const p of assocPayments) {
      const pAmount = Number(p.amount);
      assocTotalPaid += pAmount;

      const pAllocated = allocationsByPaymentId.get(p.id) || 0;
      const pUnallocated = Math.max(0, pAmount - pAllocated);
      assocUnallocatedCredit += pUnallocated;

      if (!lastPaymentDate || new Date(p.paid_at) > new Date(lastPaymentDate)) {
        lastPaymentDate = p.paid_at;
      }
    }

    // Total charged across all charges (including closed ones, excluding cancelled)
    const assocTotalCharged = charges
      .filter((c) => c.associate_id === assoc.id && c.admin_status !== "cancelled")
      .reduce((sum, c) => sum + Number(c.original_amount), 0);

    const finStatus = calculateFinancialStatus(
      assocOutstandingBalance,
      assocUnallocatedCredit,
      assocHasOverdue
    );

    if (finStatus === "EN MORA") {
      totalAsociadosEnMora++;
    }

    totalRecaudo += assocTotalPaid;
    totalDeudaPendiente += assocOutstandingBalance;
    totalCreditoAFavor += assocUnallocatedCredit;

    return {
      associate_id: assoc.id,
      full_name: assoc.full_name,
      document_number: assoc.document_number,
      email: assoc.email,
      specialty: assoc.specialty,
      status: assoc.status || "Activo",
      category_name: category?.name || "Sin categoría",
      plan_name: plan?.name || "Sin plan asignado",
      billing_status: mem?.billing_status || "-",
      currency,
      total_charged: assocTotalCharged,
      total_paid: assocTotalPaid,
      outstanding_balance: assocOutstandingBalance,
      credit_balance: assocUnallocatedCredit,
      financial_status: finStatus,
      last_payment_date: lastPaymentDate,
      next_due_date: nextDueDate,
      grace_period_days: gracePeriodDays,
    };
  });

  return {
    summaries,
    kpis: {
      total_recaudo: totalRecaudo,
      deuda_pendiente: totalDeudaPendiente,
      credito_a_favor: totalCreditoAFavor,
      asociados_en_mora: totalAsociadosEnMora,
      currency: "COP",
    },
  };
}

/**
 * Fetches full detailed ledger for a single associate
 */
export async function getAssociateMembershipLedgerDetail(
  supabase: SupabaseClient,
  associateId: string
): Promise<MembershipLedgerDetail | null> {
  const now = new Date();

  const [
    { data: assocData, error: assocErr },
    { data: memData, error: memErr },
    { data: chargesData, error: chrErr },
    { data: paymentsData, error: payErr },
    { data: allocationsData, error: alcErr },
    { data: adjustmentsData, error: adjErr },
    { data: planChangesData, error: pcErr },
  ] = await Promise.all([
    supabase
      .from("associates")
      .select("id, full_name, email, document_number, specialty, status, created_at")
      .eq("id", associateId)
      .maybeSingle(),
    supabase
      .from("associate_memberships")
      .select("*, plan:membership_plans(*), category:membership_categories(*)")
      .eq("associate_id", associateId)
      .maybeSingle(),
    supabase
      .from("membership_charges")
      .select("*")
      .eq("associate_id", associateId)
      .order("due_date", { ascending: false }),
    supabase
      .from("membership_payments")
      .select("*")
      .eq("associate_id", associateId)
      .order("paid_at", { ascending: false }),
    supabase.from("membership_payment_allocations").select("*"),
    supabase
      .from("membership_adjustments")
      .select("*")
      .eq("associate_id", associateId)
      .order("created_at", { ascending: false }),
    supabase
      .from("membership_plan_changes")
      .select("*, old_plan:membership_plans!old_plan_id(*), new_plan:membership_plans!new_plan_id(*)")
      .eq("associate_id", associateId)
      .order("changed_at", { ascending: false }),
  ]);

  if (assocErr || !assocData) return null;
  if (memErr) throw memErr;
  if (chrErr) throw chrErr;
  if (payErr) throw payErr;
  if (alcErr) throw alcErr;
  if (adjErr) throw adjErr;
  if (pcErr) throw pcErr;

  const rawCharges = (chargesData || []) as MembershipCharge[];
  const rawPayments = (paymentsData || []) as MembershipPayment[];
  const rawAllocations = (allocationsData || []) as MembershipPaymentAllocation[];
  const rawAdjustments = (adjustmentsData || []) as MembershipAdjustment[];
  const planChanges = (planChangesData || []) as MembershipPlanChange[];

  const plan = memData?.plan as MembershipPlan | undefined;
  const gracePeriodDays = plan?.grace_period_days ?? 10;

  // Active allocations for completed payments
  const completedPaymentIds = new Set(
    rawPayments.filter((p) => p.status === "completed").map((p) => p.id)
  );

  const activeAllocations = rawAllocations.filter(
    (a) => !a.reversed_at && completedPaymentIds.has(a.payment_id)
  );

  const allocationsByCharge = new Map<string, number>();
  const allocationsByPayment = new Map<string, number>();

  for (const alc of activeAllocations) {
    allocationsByCharge.set(
      alc.charge_id,
      (allocationsByCharge.get(alc.charge_id) || 0) + Number(alc.amount)
    );
    allocationsByPayment.set(
      alc.payment_id,
      (allocationsByPayment.get(alc.payment_id) || 0) + Number(alc.amount)
    );
  }

  const adjustmentsByCharge = new Map<string, number>();
  for (const adj of rawAdjustments) {
    if (!adj.charge_id) continue;
    const current = adjustmentsByCharge.get(adj.charge_id) || 0;
    const isCredit = ["waiver", "discount", "write_off"].includes(adj.type);
    const delta = isCredit ? Number(adj.amount) : -Number(adj.amount);
    adjustmentsByCharge.set(adj.charge_id, current + delta);
  }

  let totalOutstanding = 0;
  let hasOverdue = false;
  let nextDueDate: string | null = null;

  const processedCharges: MembershipCharge[] = rawCharges.map((chg) => {
    const allocated = allocationsByCharge.get(chg.id) || 0;
    const adjustmentsAmt = adjustmentsByCharge.get(chg.id) || 0;
    const netDebt = chg.admin_status === "open"
      ? Math.max(0, Number(chg.original_amount) - allocated - adjustmentsAmt)
      : 0;

    const overdue = chg.admin_status === "open" && netDebt > 0
      ? isDateOverdue(chg.due_date, gracePeriodDays, now)
      : false;

    if (chg.admin_status === "open" && netDebt > 0) {
      totalOutstanding += netDebt;
      if (overdue) hasOverdue = true;
      if (!nextDueDate || new Date(chg.due_date) < new Date(nextDueDate)) {
        nextDueDate = chg.due_date;
      }
    }

    return {
      ...chg,
      allocated_amount: allocated,
      adjustments_amount: adjustmentsAmt,
      net_debt: netDebt,
      is_overdue: overdue,
    };
  });

  let totalPaid = 0;
  let totalUnallocatedCredit = 0;
  let lastPaymentDate: string | null = null;

  const processedPayments: MembershipPayment[] = rawPayments.map((p) => {
    const amountNum = Number(p.amount);
    if (p.status === "completed") {
      totalPaid += amountNum;
      const allocated = allocationsByPayment.get(p.id) || 0;
      const unallocated = Math.max(0, amountNum - allocated);
      totalUnallocatedCredit += unallocated;

      if (!lastPaymentDate || new Date(p.paid_at) > new Date(lastPaymentDate)) {
        lastPaymentDate = p.paid_at;
      }

      return {
        ...p,
        allocated_amount: allocated,
        unallocated_credit: unallocated,
      };
    }

    return {
      ...p,
      allocated_amount: 0,
      unallocated_credit: 0,
    };
  });

  const totalCharged = rawCharges
    .filter((c) => c.admin_status !== "cancelled")
    .reduce((sum, c) => sum + Number(c.original_amount), 0);

  const finStatus = calculateFinancialStatus(
    totalOutstanding,
    totalUnallocatedCredit,
    hasOverdue
  );

  const summary: AssociateMembershipSummary = {
    associate_id: assocData.id,
    full_name: assocData.full_name,
    document_number: assocData.document_number,
    email: assocData.email,
    specialty: assocData.specialty,
    status: assocData.status || "Activo",
    category_name: memData?.category?.name || "Sin categoría",
    plan_name: memData?.plan?.name || "Sin plan asignado",
    billing_status: memData?.billing_status || "-",
    currency: plan?.currency || "COP",
    total_charged: totalCharged,
    total_paid: totalPaid,
    outstanding_balance: totalOutstanding,
    credit_balance: totalUnallocatedCredit,
    financial_status: finStatus,
    last_payment_date: lastPaymentDate,
    next_due_date: nextDueDate,
    grace_period_days: gracePeriodDays,
  };

  return {
    associate: assocData,
    membership: memData as unknown as MembershipLedgerDetail["membership"],
    summary,
    charges: processedCharges,
    payments: processedPayments,
    allocations: rawAllocations,
    adjustments: rawAdjustments,
    plan_changes: planChanges,
  };
}
