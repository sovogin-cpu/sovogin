export type RegistrationOrigin =
  | "openpay"
  | "breb"
  | "invited"
  | "courtesy"
  | "speaker"
  | "sponsor"
  | "admin_manual";

export type RegistrationStatus = "pending" | "confirmed" | "cancelled";

export type RegistrationPaymentStatus = "pending" | "paid" | "not_required";

export interface RegistrationEventItem {
  id: string;
  title: string;
}

export interface Registration {
  id: string;
  user_id?: string | null;
  event_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  customer_document_type?: string | null;
  document_number?: string | null;
  amount?: number | null;
  modality?: string | null;
  category?: string | null;
  status?: RegistrationStatus | string | null;
  payment_status?: RegistrationPaymentStatus | string | null;
  payment_id?: string | null;
  payment_order_id?: string | null;
  payment_reference?: string | null;
  openpay_transaction_id?: string | null;
  authorization_code?: string | null;
  paid_at?: string | null;
  origin?: RegistrationOrigin | string | null;
  created_at: string;
  events?: RegistrationEventItem | null;
}

export interface CreateManualRegistrationDTO {
  event_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  customer_document_type?: string | null;
  document_number?: string | null;
  amount?: number;
  modality: string;
  category?: string | null;
  origin: "invited" | "courtesy" | "speaker" | "sponsor" | "admin_manual";
  status: RegistrationStatus;
  payment_status: RegistrationPaymentStatus;
}

export interface UpdateRegistrationDTO {
  full_name?: string;
  email?: string;
  phone?: string | null;
  customer_document_type?: string | null;
  document_number?: string | null;
  amount?: number;
  modality?: string;
  category?: string | null;
  status?: RegistrationStatus;
  payment_status?: RegistrationPaymentStatus;
}

export interface RegistrationFilterState {
  eventId: string;
  status: string;
  paymentStatus: string;
  origin: string;
  modality: string;
  searchQuery: string;
}
