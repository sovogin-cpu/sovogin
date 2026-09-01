import {
  NotificationDeliveryOrchestrator,
  FreshEligibilityResult,
} from "../delivery-orchestrator";
import { NotificationDeliveryRepository, FailureClass } from "../types";
import { NotificationDeliveryProvider } from "../delivery-provider";

class MockRepository implements NotificationDeliveryRepository {
  public status: string = "QUEUED";
  public suppressionReason: string | null = null;
  public attemptCount: number = 0;
  public claimToken: string = "token_123";

  async claimForDelivery(eventId: string) {
    this.status = "PROCESSING";
    return { event_id: eventId, claim_token: this.claimToken, claim_expires_at: new Date(Date.now() + 300000).toISOString() };
  }

  async claimNextForDelivery() {
    this.status = "PROCESSING";
    return { event_id: "evt_1", claim_token: this.claimToken, claim_expires_at: new Date(Date.now() + 300000).toISOString() };
  }

  async claimNotificationForDelivery(eventId: string) {
    this.status = "PROCESSING";
    return { event_id: eventId, claim_token: this.claimToken, claim_expires_at: new Date(Date.now() + 300000).toISOString() };
  }

  async startDelivery(eventId: string, claimToken: string) {
    this.attemptCount += 1;
    return { event_id: eventId, attempt_id: "att_1", attempt_number: this.attemptCount, provider_idempotency_key: `${eventId}:${this.attemptCount}` };
  }

  async completeDelivery(eventId: string, claimToken: string, attemptId: string, providerMessageId: string) {
    this.status = "SENT";
    return true;
  }

  async failDelivery(eventId: string, claimToken: string, attemptId: string, failureClass: FailureClass, errorCode: string, errorMessage: string) {
    this.status = "FAILED";
    return true;
  }

  async suppressDelivery(eventId: string, claimToken: string, reason: string) {
    this.status = "SUPPRESSED";
    this.suppressionReason = reason;
    return true;
  }

  async recoverExpiredDelivery(eventId: string, attemptId: string, claimToken: string) {
    this.status = "QUEUED";
    return { event_id: eventId, attempt_id: attemptId, attempt_number: 1, status: "EXPIRED" };
  }

  async resumeUnknownDelivery(eventId: string, attemptId: string, claimToken: string) {
    return { event_id: eventId, attempt_id: attemptId, attempt_number: 1, dispatch_count: 2, provider_idempotency_key: `${eventId}:1` };
  }
}

class MockProvider implements NotificationDeliveryProvider {
  public dispatched: boolean = false;
  async dispatch() {
    this.dispatched = true;
    return { outcome: "SUCCESS" as const, providerMessageId: "msg_123", latencyMs: 10 };
  }
}

async function runEligibilityAuthorityTests() {
  console.log("=== INICIANDO SUITE DE AUDITORÍA Y MATRIZ COMPLETA (FASE 4A5.2-E4.2-F) ===");

  // --- SECTION A: ORCHESTRATOR ERROR SEMANTICS MATRIX ---

  // 1. Technical Exception in Eligibility Evaluator DOES NOT Suppress Event
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const throwingEvaluator = async (): Promise<FreshEligibilityResult> => {
      throw new Error("PGRST116: Cannot coerce result / RLS error");
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, throwingEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "token_123" });

    if (result.status !== "PROCESSED_FAILED") {
      throw new Error(`Expected status PROCESSED_FAILED, got ${result.status}`);
    }
    if (repo.status === "SUPPRESSED") {
      throw new Error("FAIL CLOSED VIOLATION: Event was incorrectly SUPPRESSED upon technical evaluator error!");
    }
    if (provider.dispatched) {
      throw new Error("Provider was dispatched despite technical eligibility error!");
    }
    if (repo.attemptCount !== 0) {
      throw new Error(`Expected attemptCount = 0, got ${repo.attemptCount}`);
    }
    console.log("PASSED: Test 1 - Technical Evaluator Exception Fails Closed (NOT Suppressed, NOT Dispatched)");
  }

  // 2. Legitimate Business Ineligibility (AL DÍA) SUPPRESSES Event
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const ineligibleEvaluator = async (): Promise<FreshEligibilityResult> => {
      return { eligible: false, suppressionReason: "SUPPRESSED_ACCOUNT_AL_DIA" };
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, ineligibleEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "token_123" });

    if (result.status !== "PROCESSED_SUPPRESSED") {
      throw new Error(`Expected status PROCESSED_SUPPRESSED, got ${result.status}`);
    }
    if (repo.status !== "SUPPRESSED") {
      throw new Error(`Expected repo status SUPPRESSED, got ${repo.status}`);
    }
    if (repo.suppressionReason !== "SUPPRESSED_ACCOUNT_AL_DIA") {
      throw new Error(`Expected suppression reason SUPPRESSED_ACCOUNT_AL_DIA, got ${repo.suppressionReason}`);
    }
    if (provider.dispatched) {
      throw new Error("Provider was dispatched despite business ineligibility!");
    }
    console.log("PASSED: Test 2 - Legitimate Business Ineligibility (AL DÍA) Suppresses Event");
  }

  // 3. Legitimate Business Ineligibility (Inactive Member) SUPPRESSES Event
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const inactiveEvaluator = async (): Promise<FreshEligibilityResult> => {
      return { eligible: false, suppressionReason: "SUPPRESSED_ASSOCIATE_INACTIVE" };
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, inactiveEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "token_123" });

    if (result.status !== "PROCESSED_SUPPRESSED") {
      throw new Error(`Expected status PROCESSED_SUPPRESSED, got ${result.status}`);
    }
    if (repo.suppressionReason !== "SUPPRESSED_ASSOCIATE_INACTIVE") {
      throw new Error(`Expected SUPPRESSED_ASSOCIATE_INACTIVE, got ${repo.suppressionReason}`);
    }
    console.log("PASSED: Test 3 - Inactive Member Suppresses Event");
  }

  // 4. Legitimate Business Ineligibility (Invalid Contact Email) SUPPRESSES Event
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const invalidEmailEvaluator = async (): Promise<FreshEligibilityResult> => {
      return { eligible: false, suppressionReason: "SUPPRESSED_INVALID_CONTACT_EMAIL" };
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, invalidEmailEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "token_123" });

    if (result.status !== "PROCESSED_SUPPRESSED") {
      throw new Error(`Expected status PROCESSED_SUPPRESSED, got ${result.status}`);
    }
    if (repo.suppressionReason !== "SUPPRESSED_INVALID_CONTACT_EMAIL") {
      throw new Error(`Expected SUPPRESSED_INVALID_CONTACT_EMAIL, got ${repo.suppressionReason}`);
    }
    console.log("PASSED: Test 4 - Invalid Contact Email Suppresses Event");
  }

  // 5. Valid Business Eligibility Dispatches Provider Successfully
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const eligibleEvaluator = async (): Promise<FreshEligibilityResult> => {
      return { eligible: true, recipient: "associate@sovogin.org", channel: "email", subject: "Test", body: "Test" };
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, eligibleEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "token_123" });

    if (result.status !== "PROCESSED_SUCCESS") {
      throw new Error(`Expected status PROCESSED_SUCCESS, got ${result.status}`);
    }
    if (repo.status !== "SENT") {
      throw new Error(`Expected repo status SENT, got ${repo.status}`);
    }
    if (!provider.dispatched) {
      throw new Error("Provider was NOT dispatched for eligible event!");
    }
    if (repo.attemptCount !== 1) {
      throw new Error(`Expected attemptCount = 1, got ${repo.attemptCount}`);
    }
    console.log("PASSED: Test 5 - Valid Business Eligibility Dispatches Provider Successfully");
  }

  // 6. Claim Fencing Failure Throws Technical Exception
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const fencedEvaluator = async (): Promise<FreshEligibilityResult> => {
      throw new Error("ELIGIBILITY_FENCING_ERROR: Claim fencing validation failed for event evt_1");
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, fencedEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "wrong_token" });

    if (result.status !== "PROCESSED_FAILED") {
      throw new Error(`Expected status PROCESSED_FAILED, got ${result.status}`);
    }
    if (repo.status === "SUPPRESSED") {
      throw new Error("Fencing failure incorrectly suppressed event!");
    }
    console.log("PASSED: Test 6 - Claim Fencing Mismatch Fails Closed (NOT Suppressed)");
  }

  // 7. DB Query Exception Throws Technical Failure
  {
    const repo = new MockRepository();
    const provider = new MockProvider();
    const dbErrEvaluator = async (): Promise<FreshEligibilityResult> => {
      throw new Error("DATABASE_ERROR: Connection timeout");
    };

    const orchestrator = new NotificationDeliveryOrchestrator(repo, provider, dbErrEvaluator);
    const result = await orchestrator.runDeliveryOnce("evt_1", { preClaimedToken: "token_123" });

    if (result.status !== "PROCESSED_FAILED") {
      throw new Error(`Expected status PROCESSED_FAILED, got ${result.status}`);
    }
    if (repo.status === "SUPPRESSED") {
      throw new Error("DB Error incorrectly suppressed event!");
    }
    console.log("PASSED: Test 7 - Database Error Fails Closed (NOT Suppressed)");
  }

  // 8. Expired Claim Recovery Semantics Test
  {
    const repo = new MockRepository();
    const recoveryResult = await repo.recoverExpiredDelivery("evt_1", "att_1", "token_123");
    if (recoveryResult.status !== "EXPIRED") {
      throw new Error(`Expected EXPIRED recovery status, got ${recoveryResult.status}`);
    }
    if (repo.status !== "QUEUED") {
      throw new Error(`Expected repo status QUEUED after recovery, got ${repo.status}`);
    }
    console.log("PASSED: Test 8 - Expired Claim Recovery Restores Event Safely");
  }

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS DE LA SUITE PASARON CON ÉXITO!");
  console.log("==========================================================");
}

runEligibilityAuthorityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
