import { SupabaseClient } from "@supabase/supabase-js";
import {
  ClaimResult,
  FailureClass,
  NotificationDeliveryRepository,
  RecoverDeliveryResult,
  ResumeDeliveryResult,
  StartDeliveryResult,
} from "./types";

export class SupabaseNotificationDeliveryRepository implements NotificationDeliveryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async claimForDelivery(eventId: string): Promise<ClaimResult> {
    const { data, error } = await this.client.rpc("claim_notification_for_delivery", {
      p_event_id: eventId,
    });

    if (error) {
      throw new Error(`claimForDelivery RPC error: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("NOT_FOUND_OR_NOT_CLAIMABLE: Notification event not found or not claimable.");
    }

    return {
      event_id: row.event_id,
      claim_token: row.claim_token,
      claim_expires_at: row.claim_expires_at,
    };
  }

  async suppressDelivery(eventId: string, claimToken: string, reason: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("suppress_notification_delivery", {
      p_event_id: eventId,
      p_claim_token: claimToken,
      p_reason: reason,
    });

    if (error) {
      throw new Error(`suppressDelivery RPC error: ${error.message}`);
    }

    return Boolean(data);
  }

  async startDelivery(eventId: string, claimToken: string): Promise<StartDeliveryResult> {
    const { data, error } = await this.client.rpc("start_notification_delivery", {
      p_event_id: eventId,
      p_claim_token: claimToken,
    });

    if (error) {
      throw new Error(`startDelivery RPC error: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("STALE_CLAIM_FENCING_ERROR: Failed to start delivery attempt.");
    }

    return {
      attempt_id: row.attempt_id,
      event_id: row.event_id,
      attempt_number: row.attempt_number,
      provider_idempotency_key: row.provider_idempotency_key,
    };
  }

  async recoverExpiredDelivery(
    eventId: string,
    attemptId: string,
    claimToken: string
  ): Promise<RecoverDeliveryResult> {
    const { data, error } = await this.client.rpc("recover_expired_notification_delivery", {
      p_event_id: eventId,
      p_attempt_id: attemptId,
      p_claim_token: claimToken,
    });

    if (error) {
      throw new Error(`recoverExpiredDelivery RPC error: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("INVALID_ATTEMPT_STATE: Failed to recover expired delivery attempt.");
    }

    return {
      event_id: row.event_id,
      attempt_id: row.attempt_id,
      attempt_number: row.attempt_number,
      status: row.status,
    };
  }

  async resumeUnknownDelivery(
    eventId: string,
    attemptId: string,
    claimToken: string
  ): Promise<ResumeDeliveryResult> {
    const { data, error } = await this.client.rpc("resume_unknown_notification_delivery", {
      p_event_id: eventId,
      p_attempt_id: attemptId,
      p_claim_token: claimToken,
    });

    if (error) {
      throw new Error(`resumeUnknownDelivery RPC error: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("INVALID_ATTEMPT_STATE: Failed to resume unknown delivery attempt.");
    }

    return {
      attempt_id: row.attempt_id,
      event_id: row.event_id,
      attempt_number: row.attempt_number,
      dispatch_count: row.dispatch_count,
      provider_idempotency_key: row.provider_idempotency_key,
    };
  }

  async completeDelivery(
    eventId: string,
    claimToken: string,
    attemptId: string,
    providerMessageId: string,
    providerStatusCode?: number,
    latencyMs?: number
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc("complete_notification_delivery", {
      p_event_id: eventId,
      p_claim_token: claimToken,
      p_attempt_id: attemptId,
      p_provider_message_id: providerMessageId,
      p_provider_status_code: providerStatusCode ?? 200,
      p_latency_ms: latencyMs ?? null,
    });

    if (error) {
      throw new Error(`completeDelivery RPC error: ${error.message}`);
    }

    return Boolean(data);
  }

  async failDelivery(
    eventId: string,
    claimToken: string,
    attemptId: string,
    failureClass: FailureClass,
    errorCode: string,
    errorMessage: string,
    providerStatusCode?: number,
    latencyMs?: number
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc("fail_notification_delivery", {
      p_event_id: eventId,
      p_claim_token: claimToken,
      p_attempt_id: attemptId,
      p_failure_class: failureClass,
      p_error_code: errorCode,
      p_error_message: errorMessage,
      p_provider_status_code: providerStatusCode ?? null,
      p_latency_ms: latencyMs ?? null,
    });

    if (error) {
      throw new Error(`failDelivery RPC error: ${error.message}`);
    }

    return Boolean(data);
  }
}
