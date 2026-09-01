import { AutomationChannel, AutomationTriggerCode } from "../collections/collections-automation-service";

export type DeliveryAttemptStatus =
  | "PROCESSING"
  | "UNKNOWN_OUTCOME"
  | "SUCCESS"
  | "FAILED"
  | "SUPPRESSED";

export type FailureClass =
  | "TRANSIENT"
  | "PERMANENT"
  | "UNKNOWN_OUTCOME"
  | "RATE_LIMITED"
  | "AUTH_CONFIGURATION"
  | "PAYLOAD_VALIDATION";

export type NotificationLifecycleStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "COMPLAINED"
  | "FAILED"
  | "SUPPRESSED"
  | "RECONCILIATION_REQUIRED";

export interface DeliveryAttemptRecord {
  id: string;
  event_id: string;
  attempt_number: number;
  dispatch_count: number;
  claim_token: string;
  channel: AutomationChannel;
  provider: string;
  provider_idempotency_key: string;
  started_at: string;
  last_dispatched_at: string;
  completed_at: string | null;
  status: DeliveryAttemptStatus;
  provider_status_code: number | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  failure_class: FailureClass | null;
  latency_ms: number | null;
  created_at: string;
}

export interface ClaimResult {
  event_id: string;
  claim_token: string;
  claim_expires_at: string;
}

export interface StartDeliveryResult {
  attempt_id: string;
  event_id: string;
  attempt_number: number;
  provider_idempotency_key: string;
}

export interface ResumeDeliveryResult {
  attempt_id: string;
  event_id: string;
  attempt_number: number;
  dispatch_count: number;
  provider_idempotency_key: string;
}

export interface RecoverDeliveryResult {
  event_id: string;
  attempt_id: string;
  attempt_number: number;
  status: string;
}

export interface NotificationDeliveryRepository {
  claimForDelivery: (eventId: string) => Promise<ClaimResult>;
  suppressDelivery: (eventId: string, claimToken: string, reason: string) => Promise<boolean>;
  startDelivery: (eventId: string, claimToken: string) => Promise<StartDeliveryResult>;
  recoverExpiredDelivery: (eventId: string, attemptId: string, claimToken: string) => Promise<RecoverDeliveryResult>;
  resumeUnknownDelivery: (eventId: string, attemptId: string, claimToken: string) => Promise<ResumeDeliveryResult>;
  completeDelivery: (
    eventId: string,
    claimToken: string,
    attemptId: string,
    providerMessageId: string,
    providerStatusCode?: number,
    latencyMs?: number
  ) => Promise<boolean>;
  failDelivery: (
    eventId: string,
    claimToken: string,
    attemptId: string,
    failureClass: FailureClass,
    errorCode: string,
    errorMessage: string,
    providerStatusCode?: number,
    latencyMs?: number
  ) => Promise<boolean>;
}
