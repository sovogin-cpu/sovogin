export type BillingMode = "recurring" | "manual" | "free";
export type BillingIntervalUnit = "day" | "week" | "month" | "year";
export type BillingAnchorMode = "anniversary" | "fixed" | "manual";
export type MemberBillingStatus = "active" | "paused" | "terminated";
export type ChargeAdminStatus = "open" | "cancelled";
export type ChargeSource = "system" | "manual_admin" | "opening_balance";
export type PaymentStatus = "completed" | "refunded" | "cancelled";
export type AdjustmentType = "waiver" | "discount" | "write_off" | "reversal";
export type FinancialStatus = "EN MORA" | "PENDIENTE" | "A FAVOR" | "AL DÍA";

export interface MembershipCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  standard_amount: number;
  billing_mode: BillingMode;
  billing_interval_unit?: BillingIntervalUnit | null;
  billing_interval_count?: number | null;
  billing_anchor_mode: BillingAnchorMode;
  fixed_anchor_month?: number | null;
  fixed_anchor_day?: number | null;
  allow_partial_payments: boolean;
  allow_overpayments: boolean;
  allow_custom_amount: boolean;
  minimum_payment_amount: number;
  grace_period_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssociateMembership {
  id: string;
  associate_id: string;
  membership_plan_id?: string | null;
  category_id?: string | null;
  started_at: string;
  billing_anchor_date: string;
  billing_status: MemberBillingStatus;
  created_at: string;
  updated_at: string;
  plan?: MembershipPlan | null;
  category?: MembershipCategory | null;
}

export interface MembershipCharge {
  id: string;
  associate_id: string;
  membership_id?: string | null;
  concept: string;
  original_amount: number;
  currency: string;
  due_date: string;
  period_start?: string | null;
  period_end?: string | null;
  billing_cycle_key?: string | null;
  admin_status: ChargeAdminStatus;
  source: ChargeSource;
  created_at: string;
  updated_at: string;
  // Calculated fields
  allocated_amount?: number;
  adjustments_amount?: number;
  net_debt?: number;
  is_overdue?: boolean;
}

export interface MembershipPayment {
  id: string;
  associate_id: string;
  membership_id?: string | null;
  amount: number;
  currency: string;
  payment_order_id?: string | null;
  payment_method: string;
  status: PaymentStatus;
  paid_at: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  // Calculated fields
  allocated_amount?: number;
  unallocated_credit?: number;
}

export interface MembershipPaymentAllocation {
  id: string;
  payment_id: string;
  charge_id: string;
  amount: number;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  created_at: string;
}

export interface MembershipAdjustment {
  id: string;
  associate_id: string;
  charge_id?: string | null;
  type: AdjustmentType;
  amount: number;
  reverses_adjustment_id?: string | null;
  reason: string;
  created_by?: string | null;
  created_at: string;
}

export interface MembershipPlanChange {
  id: string;
  associate_id: string;
  old_plan_id?: string | null;
  new_plan_id: string;
  reason?: string | null;
  changed_by?: string | null;
  changed_at: string;
  old_plan?: MembershipPlan | null;
  new_plan?: MembershipPlan | null;
}

export interface AssociateMembershipSummary {
  associate_id: string;
  full_name: string;
  document_number?: string | null;
  email: string;
  specialty?: string | null;
  status: string; // Gremiat status ('Activo', 'Inactivo')
  category_name: string;
  plan_name: string;
  billing_status: string; // 'active', 'paused', 'terminated' or '-'
  currency: string;
  total_charged: number;
  total_paid: number;
  outstanding_balance: number; // Deuda pendiente
  credit_balance: number; // Crédito a favor
  financial_status: FinancialStatus;
  last_payment_date?: string | null;
  next_due_date?: string | null;
  grace_period_days: number;
}

export interface MembershipLedgerDetail {
  associate: {
    id: string;
    full_name: string;
    email: string;
    document_number?: string | null;
    specialty?: string | null;
    status: string;
    created_at: string;
  };
  membership?: AssociateMembership | null;
  summary: AssociateMembershipSummary;
  charges: MembershipCharge[];
  payments: MembershipPayment[];
  allocations: MembershipPaymentAllocation[];
  adjustments: MembershipAdjustment[];
  plan_changes: MembershipPlanChange[];
}

export interface OverallPortfolioKpis {
  total_recaudo: number;
  deuda_pendiente: number;
  credito_a_favor: number;
  asociados_en_mora: number;
  currency: string;
}
