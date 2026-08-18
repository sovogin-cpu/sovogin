import { FinancialStatus } from "@/lib/memberships/types";

export interface PortalMembershipSummary {
  category_name: string;
  plan_name: string;
  billing_mode: string;
  billing_status: string;
  financial_status: FinancialStatus;
  currency: string;
  outstanding_balance: number;
  credit_balance: number;
  total_paid: number;
  total_charged: number;
  next_due_date: string | null;
  grace_period_days: number;
  has_active_membership: boolean;
}

export interface PortalChargeDTO {
  id: string;
  concept: string;
  original_amount: number;
  allocated_amount: number;
  adjustments_amount: number;
  net_debt: number;
  due_date: string;
  admin_status: string;
  is_overdue: boolean;
}

export interface PortalPaymentDTO {
  id: string;
  amount: number;
  paid_at: string;
  payment_method: string;
  status: string;
  currency: string;
}

export interface PortalMembershipDTO {
  summary: PortalMembershipSummary;
  charges: PortalChargeDTO[];
  payments: PortalPaymentDTO[];
}
