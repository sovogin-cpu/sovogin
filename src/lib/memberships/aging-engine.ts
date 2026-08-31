import { SupabaseClient } from "@supabase/supabase-js";
import { parseMembershipDateOnly } from "./date-utils";

export type AgingBucket =
  | "CURRENT"
  | "1-30 días"
  | "31-60 días"
  | "61-90 días"
  | "91-120 días"
  | "+120 días";

export type AccountStatus = "AL DÍA" | "PENDIENTE" | "EN MORA";

export interface AssociateAgingResult {
  associate_id: string;
  full_name: string;
  document_number?: string | null;
  email: string;
  membership_id?: string | null;
  total_outstanding: number;
  open_charge_count: number;
  oldest_unpaid_due_date: string | null;
  days_past_due: number;
  aging_bucket: AgingBucket;
  account_status: AccountStatus;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  days_over_120: number;
}

export interface PortfolioAgingSummary {
  as_of_date: string;
  total_associates: number;
  total_outstanding: number;
  total_open_charges: number;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  days_over_120: number;
  associates_al_dia: number;
  associates_pendiente: number;
  associates_en_mora: number;
}

export interface AgingReportResponse {
  success: boolean;
  as_of_date: string;
  summary: PortfolioAgingSummary;
  associates: AssociateAgingResult[];
}

export interface PureAllocationInput {
  id: string;
  payment_id: string;
  charge_id: string;
  amount: number;
  reversed_at?: string | null;
  payment_status?: "completed" | "refunded" | "cancelled";
}

export interface PureAdjustmentInput {
  id: string;
  charge_id: string;
  type: "waiver" | "discount" | "write_off" | "reversal";
  amount: number;
  reverses_adjustment_id?: string | null;
}

export interface PureChargeInput {
  id: string;
  membership_id?: string | null;
  original_amount: number;
  due_date: string;
  admin_status: "open" | "cancelled";
  allocated_amount?: number;
  adjustments_amount?: number;
}

/**
 * Pure Helper: Calculates difference in calendar days between evaluation date and due date.
 * Returns 0 if due date is today or in the future.
 */
export function calculateDaysPastDue(dueDateStr: string, asOfDateStr: string): number {
  if (!dueDateStr || !asOfDateStr) return 0;
  const due = parseMembershipDateOnly(dueDateStr);
  const evalDate = parseMembershipDateOnly(asOfDateStr);

  const diffMs = evalDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Pure Helper: Maps days past due to aging bucket.
 */
export function determineAgingBucket(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return "CURRENT";
  if (daysPastDue <= 30) return "1-30 días";
  if (daysPastDue <= 60) return "31-60 días";
  if (daysPastDue <= 90) return "61-90 días";
  if (daysPastDue <= 120) return "91-120 días";
  return "+120 días";
}

/**
 * Pure Helper: Maps total outstanding debt and days past due to account status.
 */
export function determineAccountStatus(
  totalOutstanding: number,
  daysPastDue: number
): AccountStatus {
  if (totalOutstanding <= 0) return "AL DÍA";
  if (daysPastDue <= 0) return "PENDIENTE";
  return "EN MORA";
}

/**
 * Pure Helper: Calculates active net allocations for a charge from allocations and payments.
 * ONLY includes non-reversed allocations belonging to 'completed' payments.
 */
export function calculateActiveAllocationsForCharge(
  chargeId: string,
  allocations: PureAllocationInput[]
): number {
  return allocations
    .filter(
      (a) =>
        a.charge_id === chargeId &&
        !a.reversed_at &&
        a.payment_status === "completed"
    )
    .reduce((sum, a) => sum + Number(a.amount), 0);
}

/**
 * Pure Helper: Calculates net non-reversed adjustments for a charge.
 */
export function calculateNetAdjustmentsForCharge(
  chargeId: string,
  adjustments: PureAdjustmentInput[]
): number {
  const chargeAdjs = adjustments.filter((a) => a.charge_id === chargeId);
  const reversedAdjIds = new Set(
    chargeAdjs
      .filter((a) => a.type === "reversal" && a.reverses_adjustment_id)
      .map((a) => a.reverses_adjustment_id as string)
  );

  return chargeAdjs
    .filter(
      (a) =>
        ["waiver", "discount", "write_off"].includes(a.type) &&
        !reversedAdjIds.has(a.id)
    )
    .reduce((sum, a) => sum + Number(a.amount), 0);
}

/**
 * Pure Helper: Calculates net debt of a single charge after active allocations and adjustments.
 */
export function calculateChargeNetDebt(
  originalAmount: number,
  allocatedAmount = 0,
  adjustmentsAmount = 0,
  adminStatus: "open" | "cancelled" = "open"
): number {
  if (adminStatus === "cancelled") return 0;
  return Math.max(0, originalAmount - allocatedAmount - adjustmentsAmount);
}

/**
 * Pure Engine Calculation Function for In-Memory evaluation (Deterministic, anti-duplication).
 */
export function calculateAssociateAgingFromMemory(params: {
  associate_id: string;
  full_name: string;
  email: string;
  document_number?: string | null;
  membership_id?: string | null;
  charges: PureChargeInput[];
  allocations?: PureAllocationInput[];
  adjustments?: PureAdjustmentInput[];
  asOfDateStr: string;
}): AssociateAgingResult {
  const {
    associate_id,
    full_name,
    email,
    document_number,
    membership_id,
    charges,
    allocations = [],
    adjustments = [],
    asOfDateStr,
  } = params;

  let total_outstanding = 0;
  let open_charge_count = 0;
  let oldest_unpaid_due_date: string | null = null;
  let current_amount = 0;
  let days_1_30 = 0;
  let days_31_60 = 0;
  let days_61_90 = 0;
  let days_91_120 = 0;
  let days_over_120 = 0;

  for (const c of charges) {
    if (c.admin_status === "cancelled") continue;

    const activeAllocated =
      c.allocated_amount !== undefined
        ? c.allocated_amount
        : calculateActiveAllocationsForCharge(c.id, allocations);

    const netAdjustments =
      c.adjustments_amount !== undefined
        ? c.adjustments_amount
        : calculateNetAdjustmentsForCharge(c.id, adjustments);

    const netDebt = calculateChargeNetDebt(
      c.original_amount,
      activeAllocated,
      netAdjustments,
      c.admin_status
    );

    if (netDebt <= 0) continue;

    total_outstanding += netDebt;
    open_charge_count += 1;

    if (!oldest_unpaid_due_date || c.due_date < oldest_unpaid_due_date) {
      oldest_unpaid_due_date = c.due_date;
    }

    const dpd = calculateDaysPastDue(c.due_date, asOfDateStr);

    if (c.due_date >= asOfDateStr || dpd === 0) {
      current_amount += netDebt;
    } else if (dpd <= 30) {
      days_1_30 += netDebt;
    } else if (dpd <= 60) {
      days_31_60 += netDebt;
    } else if (dpd <= 90) {
      days_61_90 += netDebt;
    } else if (dpd <= 120) {
      days_91_120 += netDebt;
    } else {
      days_over_120 += netDebt;
    }
  }

  let days_past_due = 0;
  if (oldest_unpaid_due_date && oldest_unpaid_due_date < asOfDateStr) {
    days_past_due = calculateDaysPastDue(oldest_unpaid_due_date, asOfDateStr);
  }

  const aging_bucket = determineAgingBucket(days_past_due);
  const account_status = determineAccountStatus(total_outstanding, days_past_due);

  return {
    associate_id,
    full_name,
    document_number,
    email,
    membership_id,
    total_outstanding,
    open_charge_count,
    oldest_unpaid_due_date,
    days_past_due,
    aging_bucket,
    account_status,
    current_amount,
    days_1_30,
    days_31_60,
    days_61_90,
    days_91_120,
    days_over_120,
  };
}

/**
 * Pure Helper: Totalizes portfolio summary from array of associate aging results without duplication.
 */
export function calculatePortfolioAgingSummary(
  asOfDateStr: string,
  associates: AssociateAgingResult[]
): PortfolioAgingSummary {
  let total_outstanding = 0;
  let total_open_charges = 0;
  let current_amount = 0;
  let days_1_30 = 0;
  let days_31_60 = 0;
  let days_61_90 = 0;
  let days_91_120 = 0;
  let days_over_120 = 0;
  let associates_al_dia = 0;
  let associates_pendiente = 0;
  let associates_en_mora = 0;

  for (const a of associates) {
    total_outstanding += a.total_outstanding;
    total_open_charges += a.open_charge_count;
    current_amount += a.current_amount;
    days_1_30 += a.days_1_30;
    days_31_60 += a.days_31_60;
    days_61_90 += a.days_61_90;
    days_91_120 += a.days_91_120;
    days_over_120 += a.days_over_120;

    if (a.account_status === "AL DÍA") associates_al_dia++;
    else if (a.account_status === "PENDIENTE") associates_pendiente++;
    else if (a.account_status === "EN MORA") associates_en_mora++;
  }

  return {
    as_of_date: asOfDateStr,
    total_associates: associates.length,
    total_outstanding,
    total_open_charges,
    current_amount,
    days_1_30,
    days_31_60,
    days_61_90,
    days_91_120,
    days_over_120,
    associates_al_dia,
    associates_pendiente,
    associates_en_mora,
  };
}

/**
 * Fetches the Aging Engine Report from Supabase DB via RPC.
 */
export async function getMembershipAgingReport(
  supabase: SupabaseClient,
  options?: {
    asOfDate?: string;
    associateId?: string;
  }
): Promise<AgingReportResponse> {
  const { data, error } = await supabase.rpc("get_membership_aging_report", {
    p_as_of_date: options?.asOfDate || null,
    p_associate_id: options?.associateId || null,
  });

  if (error) {
    console.error("Error al obtener reporte de aging desde RPC:", error);
    throw new Error(`Error en RPC get_membership_aging_report: ${error.message}`);
  }

  return data as AgingReportResponse;
}
