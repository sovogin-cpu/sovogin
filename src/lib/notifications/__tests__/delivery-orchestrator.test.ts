import { NotificationDeliveryOrchestrator } from "../delivery-orchestrator";
import { FakeNotificationDeliveryProvider } from "../fake-delivery-provider";
import {
  ClaimResult,
  FailureClass,
  NotificationDeliveryRepository,
  RecoverDeliveryResult,
  ResumeDeliveryResult,
  StartDeliveryResult,
} from "../types";

class FakeNotificationDeliveryRepository implements NotificationDeliveryRepository {
  public events: Map<string, any> = new Map();
  public attempts: Map<string, any> = new Map();
  public claimTokens: Map<string, string> = new Map();
  public calls: string[] = [];

  public seedEvent(event: {
    id: string;
    status?: string;
    attempt_count?: number;
    next_retry_at?: string | null;
  }): void {
    this.events.set(event.id, {
      id: event.id,
      status: event.status || "QUEUED",
      attempt_count: event.attempt_count || 0,
      next_retry_at: event.next_retry_at || null,
      claim_token: null,
    });
  }

  public async claimNextForDelivery(): Promise<ClaimResult | null> {
    this.calls.push("claimNextForDelivery");
    const eligibleEvent = Array.from(this.events.values()).find(
      (e) => e.status === "QUEUED"
    );
    if (!eligibleEvent) return null;
    return this.claimForDelivery(eligibleEvent.id);
  }

  async claimForDelivery(eventId: string): Promise<ClaimResult> {
    this.calls.push(`claimForDelivery:${eventId}`);
    const ev = this.events.get(eventId);
    const isClaimable = ev && (ev.status === "QUEUED" || ev.status === "PROCESSING") && ev.claim_token === null;
    if (!isClaimable) {
      throw new Error("NOT_FOUND_OR_NOT_CLAIMABLE: Notification event not found or not claimable.");
    }
    if (ev.next_retry_at && new Date(ev.next_retry_at).getTime() > Date.now()) {
      throw new Error("RETRY_BACKOFF_ACTIVE: Event is in backoff window.");
    }
    const token = `token_${Date.now()}_${Math.random()}`;
    ev.claim_token = token;
    this.claimTokens.set(eventId, token);
    return {
      event_id: eventId,
      claim_token: token,
      claim_expires_at: new Date(Date.now() + 60000).toISOString(),
    };
  }

  async suppressDelivery(eventId: string, claimToken: string, reason: string): Promise<boolean> {
    this.calls.push(`suppressDelivery:${eventId}:${reason}`);
    const ev = this.events.get(eventId);
    if (!ev || ev.claim_token !== claimToken) {
      throw new Error("STALE_CLAIM_FENCING_ERROR");
    }
    ev.status = "SUPPRESSED";
    ev.claim_token = null;
    return true;
  }

  async startDelivery(eventId: string, claimToken: string): Promise<StartDeliveryResult> {
    this.calls.push(`startDelivery:${eventId}`);
    const ev = this.events.get(eventId);
    if (!ev || ev.claim_token !== claimToken) {
      throw new Error("STALE_CLAIM_FENCING_ERROR: Token mismatch or claim expired.");
    }
    ev.attempt_count += 1;
    ev.status = "PROCESSING";

    const attemptId = `att_${eventId}_${ev.attempt_count}`;
    const idempotencyKey = `${eventId}:${ev.attempt_count}`;

    this.attempts.set(attemptId, {
      id: attemptId,
      event_id: eventId,
      attempt_number: ev.attempt_count,
      dispatch_count: 1,
      claim_token: claimToken,
      status: "PROCESSING",
      provider_idempotency_key: idempotencyKey,
    });

    return {
      attempt_id: attemptId,
      event_id: eventId,
      attempt_number: ev.attempt_count,
      provider_idempotency_key: idempotencyKey,
    };
  }

  async recoverExpiredDelivery(
    eventId: string,
    attemptId: string,
    claimToken: string
  ): Promise<RecoverDeliveryResult> {
    this.calls.push(`recoverExpiredDelivery:${eventId}:${attemptId}`);
    const att = this.attempts.get(attemptId);
    if (!att || att.status !== "PROCESSING") {
      throw new Error("INVALID_ATTEMPT_STATE: Attempt not in PROCESSING status.");
    }
    att.status = "UNKNOWN_OUTCOME";
    return {
      event_id: eventId,
      attempt_id: attemptId,
      attempt_number: att.attempt_number,
      status: "UNKNOWN_OUTCOME",
    };
  }

  async resumeUnknownDelivery(
    eventId: string,
    attemptId: string,
    claimToken: string
  ): Promise<ResumeDeliveryResult> {
    this.calls.push(`resumeUnknownDelivery:${eventId}:${attemptId}`);
    const att = this.attempts.get(attemptId);
    if (!att || att.status !== "UNKNOWN_OUTCOME") {
      throw new Error("INVALID_ATTEMPT_STATE: Attempt not in UNKNOWN_OUTCOME status.");
    }
    att.status = "PROCESSING";
    att.dispatch_count += 1;
    att.claim_token = claimToken;

    return {
      attempt_id: attemptId,
      event_id: eventId,
      attempt_number: att.attempt_number,
      dispatch_count: att.dispatch_count,
      provider_idempotency_key: att.provider_idempotency_key,
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
    this.calls.push(`completeDelivery:${eventId}:${attemptId}`);
    const ev = this.events.get(eventId);
    const att = this.attempts.get(attemptId);

    if (!ev || ev.claim_token !== claimToken || !att || att.claim_token !== claimToken) {
      throw new Error("STALE_CLAIM_FENCING_ERROR: Stale claim token rejected.");
    }

    ev.status = "SENT";
    ev.claim_token = null;
    att.status = "SUCCESS";
    att.provider_message_id = providerMessageId;
    return true;
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
    this.calls.push(`failDelivery:${eventId}:${attemptId}:${failureClass}`);
    const ev = this.events.get(eventId);
    const att = this.attempts.get(attemptId);

    if (!ev || ev.claim_token !== claimToken || !att || att.claim_token !== claimToken) {
      throw new Error("STALE_CLAIM_FENCING_ERROR: Stale claim token rejected.");
    }

    if (failureClass === "UNKNOWN_OUTCOME") {
      ev.status = "PROCESSING";
      att.status = "UNKNOWN_OUTCOME";
    } else {
      const isPermanent = failureClass === "PERMANENT" || failureClass === "AUTH_CONFIGURATION" || failureClass === "PAYLOAD_VALIDATION";
      ev.status = isPermanent ? "FAILED" : "QUEUED";
      att.status = "FAILED";
      ev.claim_token = null;
    }
    return true;
  }
}

function assertEqual(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(`[ASSERTION_FAILED] ${message} -> Expected: ${expected}, Got: ${actual}`);
  }
}

export async function runOrchestratorTests(): Promise<void> {
  console.log("=== INICIANDO SUITE DE PRUEBAS DEL ORCHESTRATOR DE ENTREGA (E4.2-B) ===");

  let repo!: FakeNotificationDeliveryRepository;
  let provider!: FakeNotificationDeliveryProvider;
  let orchestrator!: NotificationDeliveryOrchestrator;

  function setup() {
    repo = new FakeNotificationDeliveryRepository();
    provider = new FakeNotificationDeliveryProvider();
    orchestrator = new NotificationDeliveryOrchestrator(repo, provider);
  }

  // Test 1: Successful Dispatch
  {
    setup();
    const eventId = "ev_test_1";
    repo.seedEvent({ id: eventId });
    provider.simulateSuccess("msg_123", 30);

    const result = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result.status, "PROCESSED_SUCCESS", "Test 1: Status must be PROCESSED_SUCCESS");
    assertEqual(result.attemptNumber, 1, "Test 1: Attempt number must be 1");
    assertEqual(result.dispatchCount, 1, "Test 1: Dispatch count must be 1");
    assertEqual(result.providerIdempotencyKey, `${eventId}:1`, "Test 1: Idempotency key must match");
    assertEqual(provider.dispatchedRequests.length, 1, "Test 1: Provider called exactly once");
    assertEqual(repo.events.get(eventId).status, "SENT", "Test 1: Event status must be SENT");
    console.log("PASSED: Test 1 - Successful Dispatch");
  }

  // Test 2: Suppression Before Start
  {
    setup();
    const eventId = "ev_test_2";
    repo.seedEvent({ id: eventId });

    const result = await orchestrator.runDeliveryOnce(eventId, {
      eligibilityEvaluator: async () => ({
        eligible: false,
        suppressionReason: "ASSOCIATE_PAID_BEFORE_DISPATCH",
      }),
    });

    assertEqual(result.status, "PROCESSED_SUPPRESSED", "Test 2: Status must be PROCESSED_SUPPRESSED");
    assertEqual(provider.dispatchedRequests.length, 0, "Test 2: Provider never called if suppressed");
    assertEqual(repo.events.get(eventId).attempt_count, 0, "Test 2: attempt_count remains 0");
    assertEqual(repo.events.get(eventId).status, "SUPPRESSED", "Test 2: Event status is SUPPRESSED");
    console.log("PASSED: Test 2 - Suppression Before Start (attempt_count = 0)");
  }

  // Test 3: Transient Failure
  {
    setup();
    const eventId = "ev_test_3";
    repo.seedEvent({ id: eventId });
    provider.simulateTransientError("RATE_LIMIT_EXCEEDED", "Too many requests", 429);

    const result = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result.status, "PROCESSED_FAILED", "Test 3: Status must be PROCESSED_FAILED");
    assertEqual(provider.dispatchedRequests.length, 1, "Test 3: Provider called once");
    assertEqual(repo.events.get(eventId).status, "QUEUED", "Test 3: Transient failure returns event to QUEUED for retry");
    console.log("PASSED: Test 3 - Transient Failure");
  }

  // Test 4: Permanent Failure
  {
    setup();
    const eventId = "ev_test_4";
    repo.seedEvent({ id: eventId });
    provider.simulatePermanentError("INVALID_RECIPIENT", "Bad email domain", 400);

    const result = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result.status, "PROCESSED_FAILED", "Test 4: Status must be PROCESSED_FAILED");
    assertEqual(repo.events.get(eventId).status, "FAILED", "Test 4: Permanent failure sets event status to FAILED");
    console.log("PASSED: Test 4 - Permanent Failure");
  }

  // Test 5: Unknown Outcome
  {
    setup();
    const eventId = "ev_test_5";
    repo.seedEvent({ id: eventId });
    provider.simulateUnknownOutcome("SOCKET_RESET", "Connection reset", 504);

    const result = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result.status, "PROCESSED_UNKNOWN", "Test 5: Status must be PROCESSED_UNKNOWN");
    assertEqual(repo.events.get(eventId).status, "PROCESSING", "Test 5: Event remains PROCESSING when outcome is unknown");
    assertEqual(repo.events.get(eventId).attempt_count, 1, "Test 5: attempt_count remains 1 (no attempt #2 created)");
    assertEqual(repo.events.get(eventId).next_retry_at, null, "Test 5: no ordinary backoff scheduled");
    assertEqual(repo.attempts.get(`att_${eventId}_1`).status, "UNKNOWN_OUTCOME", "Test 5: Attempt status is UNKNOWN_OUTCOME");
    assertEqual(provider.dispatchedRequests.length, 1, "Test 5: Provider called exactly once for initial physical dispatch");
    console.log("PASSED: Test 5 - Unknown Outcome (Invariants Verified)");
  }

  // Test 6: Stale Claim Fencing
  {
    setup();
    const eventId = "ev_test_6";
    repo.seedEvent({ id: eventId });
    const claim = await repo.claimForDelivery(eventId);
    const start = await repo.startDelivery(eventId, claim.claim_token);

    // Attempting to complete with stale token must throw STALE_CLAIM_FENCING_ERROR
    let threw = false;
    try {
      await repo.completeDelivery(eventId, "stale_token_999", start.attempt_id, "msg_stale");
    } catch (e: any) {
      threw = e.message.includes("STALE_CLAIM_FENCING_ERROR");
    }
    assertEqual(threw, true, "Test 6: Stale token must throw STALE_CLAIM_FENCING_ERROR");
    console.log("PASSED: Test 6 - Stale Claim Fencing");
  }

  // Test 7: Backoff Active
  {
    setup();
    const eventId = "ev_test_7";
    repo.seedEvent({ id: eventId, next_retry_at: new Date(Date.now() + 600000).toISOString() });

    const result = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result.status, "SKIPPED_BACKOFF_ACTIVE", "Test 7: Status must be SKIPPED_BACKOFF_ACTIVE");
    assertEqual(provider.dispatchedRequests.length, 0, "Test 7: Provider never called during backoff");
    console.log("PASSED: Test 7 - Backoff Active");
  }

  // Test 8: Recovery Same Attempt
  {
    setup();
    const eventId = "ev_test_8";
    repo.seedEvent({ id: eventId });

    // Worker A starts attempt 1
    const claimA = await repo.claimForDelivery(eventId);
    const startA = await repo.startDelivery(eventId, claimA.claim_token);

    // Simulate Worker A lease expiration so Worker B can claim
    repo.events.get(eventId).claim_token = null;

    // Worker B recovers expired Worker A lease and resumes attempt 1
    provider.simulateSuccess("msg_rec_888", 50);
    const result = await orchestrator.runDeliveryOnce(eventId, {
      openAttemptRecovery: { attemptId: startA.attempt_id, isExpiredLease: true },
    });

    assertEqual(result.status, "RECOVERED_AND_RESUMED", "Test 8: Status must be RECOVERED_AND_RESUMED");
    assertEqual(result.attemptNumber, 1, "Test 8: attempt_number remains 1");
    assertEqual(result.dispatchCount, 2, "Test 8: dispatch_count incremented to 2");
    assertEqual(result.providerIdempotencyKey, `${eventId}:1`, "Test 8: Idempotency key preserved");
    console.log("PASSED: Test 8 - Recovery Same Attempt");
  }

  // Test 9: Resume Preserves Idempotency Key
  {
    setup();
    const eventId = "ev_test_9";
    repo.seedEvent({ id: eventId });
    const claimA = await repo.claimForDelivery(eventId);
    const startA = await repo.startDelivery(eventId, claimA.claim_token);
    await repo.failDelivery(eventId, claimA.claim_token, startA.attempt_id, "UNKNOWN_OUTCOME", "TIMEOUT", "Timeout");

    // Simulate Worker A lease expiration so Worker B can claim
    repo.events.get(eventId).claim_token = null;

    provider.simulateSuccess("msg_res_999", 40);
    const result = await orchestrator.runDeliveryOnce(eventId, {
      openAttemptRecovery: { attemptId: startA.attempt_id, isExpiredLease: false },
    });

    assertEqual(provider.dispatchedRequests[0].providerIdempotencyKey, `${eventId}:1`, "Test 9: Idempotency key passed to provider must be event_id:1");
    console.log("PASSED: Test 9 - Resume Preserves Idempotency Key");
  }

  // Test 10: True Retry Gets New Attempt Number
  {
    setup();
    const eventId = "ev_test_10";
    repo.seedEvent({ id: eventId });

    // Attempt 1: Transient failure
    provider.simulateTransientError("503", "Service Unavailable", 503);
    await orchestrator.runDeliveryOnce(eventId);
    assertEqual(repo.events.get(eventId).attempt_count, 1, "Test 10: Attempt 1 count is 1");

    // Attempt 2: True retry after QUEUED
    provider.simulateSuccess("msg_retry_200", 35);
    const result2 = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result2.status, "PROCESSED_SUCCESS", "Test 10: Attempt 2 succeeds");
    assertEqual(result2.attemptNumber, 2, "Test 10: Attempt number for true retry is 2");
    assertEqual(result2.providerIdempotencyKey, `${eventId}:2`, "Test 10: True retry gets new idempotency key event_id:2");
    console.log("PASSED: Test 10 - True Retry Gets New Attempt Number");
  }

  // Test 11: No Duplicate Dispatch Under Competing Worker Calls
  {
    setup();
    const eventId = "ev_test_11";
    repo.seedEvent({ id: eventId });
    provider.simulateSuccess();

    // Two workers try to run delivery once concurrently
    const [res1, res2] = await Promise.all([
      orchestrator.runDeliveryOnce(eventId),
      orchestrator.runDeliveryOnce(eventId).catch((e) => e),
    ]);

    const winner = res1.status === "PROCESSED_SUCCESS" ? res1 : res2;
    const loser = res1.status === "SKIPPED_NOT_CLAIMABLE" ? res1 : res2;

    assertEqual(winner.status, "PROCESSED_SUCCESS", "Test 11: Exactly one worker wins");
    assertEqual(loser.status, "SKIPPED_NOT_CLAIMABLE", "Test 11: Competing worker receives SKIPPED_NOT_CLAIMABLE");
    assertEqual(provider.dispatchedRequests.length, 1, "Test 11: Provider dispatched exactly once");
    console.log("PASSED: Test 11 - No Duplicate Dispatch Under Competing Workers");
  }

  // Test 12: Repository Domain Error Preservation
  {
    setup();
    const eventId = "ev_test_12_nonexistent";
    const result = await orchestrator.runDeliveryOnce(eventId);
    assertEqual(result.status, "SKIPPED_NOT_CLAIMABLE", "Test 12: Non-existent event returns SKIPPED_NOT_CLAIMABLE");
    console.log("PASSED: Test 12 - Repository Domain Error Preservation");
  }

  // Test 13: Provider Never Called If Claim Fails
  {
    setup();
    const eventId = "ev_test_13";
    // Do not seed event
    await orchestrator.runDeliveryOnce(eventId);
    assertEqual(provider.dispatchedRequests.length, 0, "Test 13: Provider dispatch count is 0 when claim fails");
    console.log("PASSED: Test 13 - Provider Never Called If Claim Fails");
  }

  // Test 14: Provider Never Called If Suppressed
  {
    setup();
    const eventId = "ev_test_14";
    repo.seedEvent({ id: eventId });

    await orchestrator.runDeliveryOnce(eventId, {
      eligibilityEvaluator: async () => ({ eligible: false, suppressionReason: "ALREADY_RESOLVED" }),
    });
    assertEqual(provider.dispatchedRequests.length, 0, "Test 14: Provider dispatch count is 0 when suppressed");
    console.log("PASSED: Test 14 - Provider Never Called If Suppressed");
  }

  // Test 15: Provider Called Exactly Once in Normal Success Path
  {
    setup();
    const eventId = "ev_test_15";
    repo.seedEvent({ id: eventId });

    await orchestrator.runDeliveryOnce(eventId);
    assertEqual(provider.dispatchedRequests.length, 1, "Test 15: Provider dispatched exactly 1 time");
    assertEqual(provider.dispatchedRequests[0].eventId, eventId, "Test 15: Event ID matches");
    console.log("PASSED: Test 15 - Provider Called Exactly Once in Normal Success Path");
  }

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS 15 PRUEBAS DEL ORCHESTRATOR DE ENTREGA PASARON CON ÉXITO!");
  console.log("==========================================================");
}

runOrchestratorTests().catch(console.error);
