export type BreBPaymentStatus =
  | "pending"
  | "pending_verification"
  | "paid"
  | "failed"
  | "cancelled";

export type BreBAdminDecision = "approve" | "reject";

export interface BreBPaymentSummary {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: BreBPaymentStatus;
  customerName: string;
  customerEmail: string;
  customerDocumentType?: string | null;
  customerDocumentNumber?: string | null;
  brebTransactionReference?: string | null;
  brebReportedAt?: string | null;
  brebVerifiedAt?: string | null;
  brebVerifiedBy?: string | null;
  brebRejectionReason?: string | null;
  registrationId?: string | null;
  createdAt: string;
}
