import {
  AutomationTriggerCode,
  AutomationChannel,
} from "./collections-automation-service";
import { DerivedCollectionStatus, FollowUpState } from "./types";
import { AccountStatus } from "../memberships/aging-engine";

export interface AutomationDryRunCandidateDto {
  associate_id: string;
  full_name: string;
  recipient_email: string | null;
  account_status: AccountStatus;
  total_outstanding: number;
  oldest_unpaid_due_date: string | null;
  days_past_due: number;
  collection_status: DerivedCollectionStatus;
  follow_up_state: FollowUpState;
  promise_status: string | null;
  automation_type: AutomationTriggerCode;
  channel: AutomationChannel;
  reference_date: string;
  scheduled_for: string;
  idempotency_key: string;
}

export interface AutomationDryRunSuppressionDto {
  associate_id: string;
  full_name: string;
  account_status: AccountStatus;
  total_outstanding: number;
  collection_status: DerivedCollectionStatus;
  follow_up_state: FollowUpState;
  promise_status: string | null;
  suppression_reason: string;
  trigger_code: AutomationTriggerCode | null;
}

export interface AutomationDryRunApiResponseData {
  generated_at: string;
  timezone: string;
  eval_date: string;
  total_associates_scanned: number;
  total_candidates: number;
  total_suppressed: number;
  candidate_events: AutomationDryRunCandidateDto[];
  suppressed_events: AutomationDryRunSuppressionDto[];
  summary_by_trigger: Record<string, number>;
  summary_by_suppression: Record<string, number>;
}

export interface AutomationDryRunApiResponse {
  success: true;
  data: AutomationDryRunApiResponseData;
}

export interface SuppressionReasonMetadata {
  label: string;
  description: string;
  badgeClass: string;
}

export const SUPPRESSION_REASON_MAP: Record<string, SuppressionReasonMetadata> = {
  SUPPRESSED_ACCOUNT_AL_DIA: {
    label: "Cuenta al día",
    description: "El asociado no registra saldo pendiente de cobro",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  SUPPRESSED_COLLECTION_IN_DISPUTE: {
    label: "Caso en disputa",
    description: "La cuenta registra disputa activa que suspende cobro automático",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
  },
  SUPPRESSED_COLLECTION_ESCALATED: {
    label: "Caso escalado",
    description: "La cuenta fue escalada a gestión especial/legal",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
  SUPPRESSED_INVALID_CONTACT_EMAIL: {
    label: "Correo inválido",
    description: "Sintaxis de correo no válida o ausente",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  SUPPRESSED_24H_FREQUENCY_CAP: {
    label: "Cap de 24 h activo",
    description: "Se envió o programó una notificación en las últimas 24 horas",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
  },
  SUPPRESSED_ACTIVE_PAYMENT_PROMISE: {
    label: "Promesa vigente",
    description: "Promesa de pago activa registrada en fecha futura",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE: {
    label: "Promesa sin fecha — gestión manual",
    description: "Promesa acordada informalmente — seguimiento manual exclusivo",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
  },
  SUPPRESSED_MILESTONE_ALREADY_REGISTERED: {
    label: "Hito ya registrado",
    description: "Este hito específico de automatización ya fue procesado previamente",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
  },
  NO_MATCHING_AUTOMATION_TRIGGER: {
    label: "Sin disparador elegible",
    description: "La cuenta no cumple condiciones de vencimiento ni hitos",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function getSuppressionReasonMeta(reasonCode: string): SuppressionReasonMetadata {
  return (
    SUPPRESSION_REASON_MAP[reasonCode] || {
      label: reasonCode,
      description: "Motivo no especificado",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}

export function getAutomationTriggerLabel(triggerCode: AutomationTriggerCode | null): string {
  if (!triggerCode) return "N/A";
  switch (triggerCode) {
    case "PRE_DUE_5D":
      return "Pre-Vencimiento (5 días)";
    case "PRE_DUE_1D":
      return "Pre-Vencimiento (Mañana)";
    case "DUE_DATE":
      return "Día de Vencimiento";
    case "OVERDUE_1D":
      return "Mora Temprana (Día 1)";
    case "OVERDUE_7D":
      return "Mora Moderada (Día 7)";
    case "OVERDUE_15D":
      return "Mora Grave (Día 15)";
    case "OVERDUE_30D":
      return "Mora Crítica (Día 30+)";
    case "PROMISE_1D":
      return "Recordatorio Promesa (Mañana)";
    case "PROMISE_DUE":
      return "Promesa Vence Hoy";
    case "PROMISE_BROKEN":
      return "Alerta Promesa Incumplida";
    default:
      return triggerCode;
  }
}

export function getChannelLabel(channel: AutomationChannel): string {
  switch (channel) {
    case "email":
      return "Correo Electrónico";
    case "internal_alert":
      return "Alerta Interna";
    case "whatsapp":
      return "WhatsApp (Inactivo)";
    case "sms":
      return "SMS (Inactivo)";
    default:
      return channel;
  }
}
