import { AccountStatus } from "../memberships/aging-engine";

export type CollectionChannel =
  | "email"
  | "phone"
  | "whatsapp"
  | "in_person"
  | "other"
  | "system";

export type CollectionActionType =
  | "initial_reminder"
  | "payment_notice"
  | "follow_up"
  | "payment_promise"
  | "dispute"
  | "escalation"
  | "note";

export type CollectionResultStatus =
  | "contacted"
  | "no_answer"
  | "promise_agreed"
  | "disputed"
  | "pending";

export type DerivedCollectionStatus =
  | "RESUELTO"
  | "SIN_GESTION"
  | "ESCALADO"
  | "EN_DISPUTA"
  | "COMPROMISO_PAGO"
  | "SIN_RESPUESTA"
  | "CONTACTADO";

export type FollowUpState = "NONE" | "SCHEDULED" | "DUE";

export interface CollectionAction {
  id: string;
  associate_id: string;
  performed_by: string;
  channel: CollectionChannel;
  action_type: CollectionActionType;
  result_status: CollectionResultStatus;
  notes?: string | null;
  promised_payment_date?: string | null;
  promised_payment_amount?: number | null;
  next_follow_up_at?: string | null;
  created_at: string;
}

export interface CreateCollectionActionInput {
  associate_id: string;
  channel: CollectionChannel;
  action_type: CollectionActionType;
  result_status: CollectionResultStatus;
  notes?: string | null;
  promised_payment_date?: string | null;
  promised_payment_amount?: number | null;
  next_follow_up_at?: string | null;
}
