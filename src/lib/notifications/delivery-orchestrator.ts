import { AutomationChannel } from "../collections/collections-automation-service";
import { NotificationDeliveryProvider, ProviderDeliveryResponse } from "./delivery-provider";
import { FailureClass, NotificationDeliveryRepository } from "./types";

export interface FreshEligibilityResult {
  eligible: boolean;
  suppressionReason?: string;
  recipient?: string;
  channel?: AutomationChannel;
  subject?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export type FreshEligibilityEvaluator = (
  eventId: string
) => Promise<FreshEligibilityResult>;

export type OrchestratorStatus =
  | "PROCESSED_SUCCESS"
  | "PROCESSED_SUPPRESSED"
  | "PROCESSED_FAILED"
  | "PROCESSED_UNKNOWN"
  | "SKIPPED_NOT_CLAIMABLE"
  | "SKIPPED_BACKOFF_ACTIVE"
  | "RECOVERED_AND_RESUMED";

export interface OrchestratorResult {
  status: OrchestratorStatus;
  eventId: string;
  attemptNumber: number | null;
  dispatchCount: number | null;
  providerIdempotencyKey: string | null;
  providerMessageId: string | null;
  error: string | null;
}

export class NotificationDeliveryOrchestrator {
  constructor(
    private readonly repository: NotificationDeliveryRepository,
    private readonly provider: NotificationDeliveryProvider,
    private readonly defaultEligibilityEvaluator?: FreshEligibilityEvaluator
  ) {}

  /**
   * Execute a single delivery lifecycle iteration for a given eventId.
   */
  async runDeliveryOnce(
    eventId: string,
    options?: {
      eligibilityEvaluator?: FreshEligibilityEvaluator;
      preClaimedToken?: string;
      openAttemptRecovery?: {
        attemptId: string;
        isExpiredLease?: boolean;
      };
    }
  ): Promise<OrchestratorResult> {
    // 1. Claim event lease from repository (or use pre-claimed token from server selector)
    let claimToken: string;
    if (options?.preClaimedToken) {
      claimToken = options.preClaimedToken;
    } else {
      try {
        const claim = await this.repository.claimForDelivery(eventId);
        claimToken = claim.claim_token;
      } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("NOT_FOUND_OR_NOT_CLAIMABLE")) {
        return {
          status: "SKIPPED_NOT_CLAIMABLE",
          eventId,
          attemptNumber: null,
          dispatchCount: null,
          providerIdempotencyKey: null,
          providerMessageId: null,
          error: msg,
        };
      }
      if (msg.includes("RETRY_BACKOFF_ACTIVE")) {
        return {
          status: "SKIPPED_BACKOFF_ACTIVE",
          eventId,
          attemptNumber: null,
          dispatchCount: null,
          providerIdempotencyKey: null,
          providerMessageId: null,
          error: msg,
        };
      }
      throw err;
    }
    }

    // 2. Evaluate fresh eligibility before first dispatch
    const evaluator = options?.eligibilityEvaluator || this.defaultEligibilityEvaluator;
    if (evaluator) {
      try {
        const eligibility = await evaluator(eventId);
        if (!eligibility.eligible) {
          const suppressionReason =
            eligibility.suppressionReason || "INELIGIBLE_AT_DISPATCH_TIME";
          await this.repository.suppressDelivery(eventId, claimToken, suppressionReason);
          return {
            status: "PROCESSED_SUPPRESSED",
            eventId,
            attemptNumber: null,
            dispatchCount: null,
            providerIdempotencyKey: null,
            providerMessageId: null,
            error: suppressionReason,
          };
        }
      } catch (evalErr: any) {
        // Technical failure during eligibility evaluation (e.g. RLS error, DB connection error, fencing error)
        // MUST NOT suppress the event! Return PROCESSED_FAILED to fail closed without mutating event status.
        return {
          status: "PROCESSED_FAILED",
          eventId,
          attemptNumber: null,
          dispatchCount: null,
          providerIdempotencyKey: null,
          providerMessageId: null,
          error: evalErr.message || "TECHNICAL_ELIGIBILITY_EVALUATION_ERROR",
        };
      }
    }

    // 3. Determine if we are starting a fresh attempt or resuming/recovering an open attempt
    let attemptId: string;
    let attemptNumber: number;
    let dispatchCount = 1;
    let providerIdempotencyKey: string;
    let isResumeRecovery = false;

    if (options?.openAttemptRecovery) {
      const { attemptId: targetAttemptId, isExpiredLease } = options.openAttemptRecovery;
      if (isExpiredLease) {
        // Recover expired lease -> transitions attempt to UNKNOWN_OUTCOME
        await this.repository.recoverExpiredDelivery(eventId, targetAttemptId, claimToken);
      }

      // Resume UNKNOWN_OUTCOME attempt -> transitions to PROCESSING, increments dispatch_count to 2
      const resumeResult = await this.repository.resumeUnknownDelivery(
        eventId,
        targetAttemptId,
        claimToken
      );

      attemptId = resumeResult.attempt_id;
      attemptNumber = resumeResult.attempt_number;
      dispatchCount = resumeResult.dispatch_count;
      providerIdempotencyKey = resumeResult.provider_idempotency_key;
      isResumeRecovery = true;
    } else {
      // Start fresh attempt (attempt_count +1, dispatch_count = 1)
      const startResult = await this.repository.startDelivery(eventId, claimToken);
      attemptId = startResult.attempt_id;
      attemptNumber = startResult.attempt_number;
      providerIdempotencyKey = startResult.provider_idempotency_key;
    }

    // 4. Evaluate recipient and channel payload defaults
    let channel: AutomationChannel = "email";
    let recipient = "unknown@sovogin.org";
    let subject: string | undefined;
    let body: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (evaluator) {
      const eligibility = await evaluator(eventId);
      if (eligibility.recipient) recipient = eligibility.recipient;
      if (eligibility.channel) channel = eligibility.channel;
      subject = eligibility.subject;
      body = eligibility.body;
      metadata = eligibility.metadata;
    }

    // 5. Dispatch request to Provider Port abstraction
    let providerResp: ProviderDeliveryResponse;
    try {
      providerResp = await this.provider.dispatch({
        eventId,
        attemptNumber,
        dispatchCount,
        channel,
        recipient,
        providerIdempotencyKey,
        subject,
        body,
        metadata,
      });
    } catch (dispatchErr: any) {
      // Network reset or unhandled provider SDK crash -> treats as UNKNOWN_OUTCOME
      providerResp = {
        outcome: "UNKNOWN_OUTCOME",
        failureClass: "UNKNOWN_OUTCOME",
        errorCode: "UNHANDLED_DISPATCH_EXCEPTION",
        errorMessage: dispatchErr.message || "Provider dispatch thrown unhandled exception",
        latencyMs: 0,
      };
    }

    // 6. Map Provider Outcome to Repository Completion / Failure
    const latencyMs = providerResp.latencyMs ?? 0;
    const providerStatusCode = providerResp.providerStatusCode ?? 500;

    if (providerResp.outcome === "SUCCESS") {
      const providerMsgId = providerResp.providerMessageId || `msg_${eventId}_${attemptNumber}`;
      await this.repository.completeDelivery(
        eventId,
        claimToken,
        attemptId,
        providerMsgId,
        providerStatusCode,
        latencyMs
      );

      return {
        status: isResumeRecovery ? "RECOVERED_AND_RESUMED" : "PROCESSED_SUCCESS",
        eventId,
        attemptNumber,
        dispatchCount,
        providerIdempotencyKey,
        providerMessageId: providerMsgId,
        error: null,
      };
    }

    if (providerResp.outcome === "TRANSIENT_FAILURE" || providerResp.outcome === "PERMANENT_FAILURE") {
      const failureClass: FailureClass = providerResp.failureClass || (providerResp.outcome === "TRANSIENT_FAILURE" ? "TRANSIENT" : "PERMANENT");
      const errCode = providerResp.errorCode || "PROVIDER_DISPATCH_FAILED";
      const errMsg = providerResp.errorMessage || "Provider reported failure";

      await this.repository.failDelivery(
        eventId,
        claimToken,
        attemptId,
        failureClass,
        errCode,
        errMsg,
        providerStatusCode,
        latencyMs
      );

      return {
        status: "PROCESSED_FAILED",
        eventId,
        attemptNumber,
        dispatchCount,
        providerIdempotencyKey,
        providerMessageId: null,
        error: `${failureClass}:${errCode}:${errMsg}`,
      };
    }

    // UNKNOWN_OUTCOME handling
    const failureClass: FailureClass = "UNKNOWN_OUTCOME";
    const errCode = providerResp.errorCode || "UNKNOWN_DISPATCH_OUTCOME";
    const errMsg = providerResp.errorMessage || "Epistemologically uncertain provider response";

    await this.repository.failDelivery(
      eventId,
      claimToken,
      attemptId,
      failureClass,
      errCode,
      errMsg,
      providerStatusCode,
      latencyMs
    );

    return {
      status: "PROCESSED_UNKNOWN",
      eventId,
      attemptNumber,
      dispatchCount,
      providerIdempotencyKey,
      providerMessageId: null,
      error: `${failureClass}:${errCode}:${errMsg}`,
    };
  }
}
