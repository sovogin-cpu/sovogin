import { AutomationChannel } from "../collections/collections-automation-service";
import { FailureClass } from "./types";

export type ProviderOutcome =
  | "SUCCESS"
  | "TRANSIENT_FAILURE"
  | "PERMANENT_FAILURE"
  | "UNKNOWN_OUTCOME";

export interface ProviderDeliveryRequest {
  eventId: string;
  attemptNumber: number;
  dispatchCount: number;
  channel: AutomationChannel;
  recipient: string;
  providerIdempotencyKey: string;
  subject?: string;
  body?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderDeliveryResponse {
  outcome: ProviderOutcome;
  providerMessageId?: string;
  providerStatusCode?: number;
  failureClass?: FailureClass;
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
}

export interface NotificationDeliveryProvider {
  dispatch: (request: ProviderDeliveryRequest) => Promise<ProviderDeliveryResponse>;
}
