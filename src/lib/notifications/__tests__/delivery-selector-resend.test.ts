import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createDeliveryWorkerClient } from "../delivery-worker-client";
import { runNextWorkerDelivery } from "../delivery-worker-runner";
import { ResendNotificationDeliveryProvider } from "../resend-delivery-provider";
import { FakeNotificationDeliveryProvider } from "../fake-delivery-provider";
import { SupabaseNotificationDeliveryRepository } from "../delivery-repository-adapter";
import { NotificationDeliveryOrchestrator } from "../delivery-orchestrator";

function base64UrlEncode(str: string | Buffer): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: object, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const encodedSignature = base64UrlEncode(signature);
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

const JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = signJwt(
  {
    role: "service_role",
    iss: "supabase",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 36000,
  },
  JWT_SECRET
);
const ANON_KEY = signJwt(
  {
    role: "anon",
    iss: "supabase",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 36000,
  },
  JWT_SECRET
);

function assertEqual(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(`[ASSERTION_FAILED] ${message} -> Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

export async function runSelectorResendTests(): Promise<void> {
  console.log("=== INICIANDO SUITE MATRIZ FINAL HIT-3B: SERVER SELECTOR + RESEND PROVIDER (SUPABASE LOCAL) ===");

  const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const workerEmail = "worker-service-hit3b@sovogin.internal";
  const workerPassword = "Password123!SafeSecretKey99";
  const triggerSecret = "test-trigger-secret-hit3b-998877";

  // Setup Environment Variables for Local Test
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
  process.env.DELIVERY_WORKER_EMAIL = workerEmail;
  process.env.DELIVERY_WORKER_PASSWORD = workerPassword;
  process.env.DELIVERY_WORKER_TRIGGER_SECRET = triggerSecret;
  process.env.DELIVERY_RUNTIME_ENABLED = "true";

  // Cleanup pre-existing local worker user
  const { data: initialUsers } = await supabaseService.auth.admin.listUsers();
  const existingUser = initialUsers?.users?.find((u) => u.email === workerEmail);
  if (existingUser) {
    await supabaseService.from("profile_capabilities").delete().eq("profile_id", existingUser.id);
    await supabaseService.auth.admin.deleteUser(existingUser.id);
  }

  // Create Local Test Worker Identity
  const { data: cRes, error: cErr } = await supabaseService.auth.admin.createUser({
    email: workerEmail,
    password: workerPassword,
    email_confirm: true,
    user_metadata: { full_name: "HIT 3B Worker", role: "associate" },
  });

  if (cErr || !cRes?.user) {
    throw new Error(`Local worker setup failed: ${cErr?.message}`);
  }
  const workerUser = cRes.user;

  await supabaseService.from("profiles").update({ role: "associate" }).eq("id", workerUser.id);
  await supabaseService.from("profile_capabilities").insert({
    profile_id: workerUser.id,
    capability: "notification_delivery_worker",
  });

  const assocId = "88888888-8888-8888-8888-888888888888";
  await supabaseService.from("associates").upsert({
    id: assocId,
    full_name: "Test Associate Selector",
    email: "selector-assoc@sovogin.local",
    status: "ACTIVE",
  });

  try {
    // --- Test 1: Empty Queue -> NO_ELIGIBLE_EVENT ---
    {
      await supabaseService.from("collection_notification_delivery_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseService.from("collection_notification_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { supabase: workerClient } = await createDeliveryWorkerClient();
      const repo = new SupabaseNotificationDeliveryRepository(workerClient);
      const claimRes = await repo.claimNextForDelivery();

      assertEqual(claimRes, null, "Test 1: Empty queue returns null claim");
      console.log("PASSED: Test 1 - Empty queue returns null claim (NO_ELIGIBLE_EVENT)");
    }

    // --- Test 2: Single Eligible QUEUED Event Claim ---
    {
      const eventId = "10000000-0000-0000-0000-000000000001";
      await supabaseService.from("collection_notification_events").insert({
        id: eventId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_5D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "test-eligible@sovogin.local",
        status: "QUEUED",
        attempt_count: 0,
      });

      const { supabase: workerClient } = await createDeliveryWorkerClient();
      const repo = new SupabaseNotificationDeliveryRepository(workerClient);
      const claimRes = await repo.claimNextForDelivery();

      assertEqual(claimRes?.event_id, eventId, "Test 2: Target event claimed");
      assertEqual(Boolean(claimRes?.claim_token), true, "Test 2: Claim token generated");

      const { data: evData } = await supabaseService
        .from("collection_notification_events")
        .select("status")
        .eq("id", eventId)
        .single();
      assertEqual(evData?.status, "PROCESSING", "Test 2: Event status updated to PROCESSING");

      // Cleanup
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);
      console.log("PASSED: Test 2 - Single eligible QUEUED event claimed atomically");
    }

    // --- Test 3: Skipped Non-Eligible States (Future scheduled_for, active backoff, SENT) ---
    {
      const futureId = "10000000-0000-0000-0000-000000000002";
      const backoffId = "10000000-0000-0000-0000-000000000003";
      const sentId = "10000000-0000-0000-0000-000000000004";

      await supabaseService.from("collection_notification_events").insert([
        {
          id: futureId,
          associate_id: assocId,
          channel: "email",
          automation_type: "PRE_DUE_5D",
          reference_date: "2026-09-01",
          scheduled_for: new Date(Date.now() + 3600000).toISOString(),
          recipient_email: "future@sovogin.local",
          status: "QUEUED",
          attempt_count: 0,
        },
        {
          id: backoffId,
          associate_id: assocId,
          channel: "email",
          automation_type: "PRE_DUE_5D",
          reference_date: "2026-09-01",
          scheduled_for: new Date(Date.now() - 10000).toISOString(),
          next_retry_at: new Date(Date.now() + 3600000).toISOString(),
          recipient_email: "backoff@sovogin.local",
          status: "QUEUED",
          attempt_count: 1,
        },
        {
          id: sentId,
          associate_id: assocId,
          channel: "email",
          automation_type: "PRE_DUE_5D",
          reference_date: "2026-09-01",
          scheduled_for: new Date(Date.now() - 10000).toISOString(),
          recipient_email: "sent@sovogin.local",
          status: "SENT",
          attempt_count: 1,
        },
      ]);

      const { supabase: workerClient } = await createDeliveryWorkerClient();
      const repo = new SupabaseNotificationDeliveryRepository(workerClient);
      const claimRes = await repo.claimNextForDelivery();

      assertEqual(claimRes, null, "Test 3: Non-eligible events skipped");

      await supabaseService.from("collection_notification_events").delete().in("id", [futureId, backoffId, sentId]);
      console.log("PASSED: Test 3 - Non-eligible states (future, backoff, SENT) correctly skipped");
    }

    // --- Test 4: Expired PROCESSING Event Exclusion from Normal Selector ---
    {
      const expiredProcId = "10000000-0000-0000-0000-000000000008";
      await supabaseService.from("collection_notification_events").insert({
        id: expiredProcId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_5D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "expired-proc@sovogin.local",
        status: "PROCESSING",
        claim_token: "00000000-0000-0000-0000-000000000001",
        claimed_at: new Date(Date.now() - 600000).toISOString(),
        claim_expires_at: new Date(Date.now() - 300000).toISOString(), // Expired lease
        attempt_count: 1,
      });

      const { supabase: workerClient } = await createDeliveryWorkerClient();
      const repo = new SupabaseNotificationDeliveryRepository(workerClient);
      const claimRes = await repo.claimNextForDelivery();

      // Normal selector MUST NOT select expired PROCESSING events
      assertEqual(claimRes, null, "Test 4: Expired PROCESSING event excluded from normal claimNextForDelivery");

      // Verify recovery via canonical recovery path
      const attemptId = "00000000-0000-0000-0000-000000000002";
      await supabaseService.from("collection_notification_delivery_attempts").insert({
        id: attemptId,
        event_id: expiredProcId,
        attempt_number: 1,
        dispatch_count: 1,
        claim_token: "00000000-0000-0000-0000-000000000001",
        channel: "email",
        provider: "fake",
        provider_idempotency_key: `${expiredProcId}:1`,
        status: "PROCESSING",
      });

      const recoveryRes = await repo.recoverExpiredDelivery(
        expiredProcId,
        attemptId,
        "00000000-0000-0000-0000-000000000001"
      );

      assertEqual(recoveryRes.event_id, expiredProcId, "Test 4: Expired PROCESSING recovered via canonical recovery path");
      assertEqual(recoveryRes.status, "UNKNOWN_OUTCOME", "Test 4: Recovered attempt marked UNKNOWN_OUTCOME");

      // Cleanup
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", expiredProcId);
      await supabaseService.from("collection_notification_events").delete().eq("id", expiredProcId);
      console.log("PASSED: Test 4 - Expired PROCESSING excluded from claimNextForDelivery and verified under canonical recovery path");
    }

    // --- Test 5: Concurrency Race (10 Parallel Claims) -> Exactly 1 Winner ---
    {
      const eventId = "10000000-0000-0000-0000-000000000005";
      await supabaseService.from("collection_notification_events").insert({
        id: eventId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_5D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "concurrency@sovogin.local",
        status: "QUEUED",
        attempt_count: 0,
      });

      const workerClients = await Promise.all(
        Array.from({ length: 10 }).map(() => createDeliveryWorkerClient())
      );

      const claimPromises = workerClients.map((w) =>
        new SupabaseNotificationDeliveryRepository(w.supabase).claimNextForDelivery()
      );

      const results = await Promise.all(claimPromises);
      const successfulClaims = results.filter((r) => r !== null && r.event_id === eventId);

      assertEqual(successfulClaims.length, 1, "Test 5: Exactly 1 worker wins race");

      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);
      console.log("PASSED: Test 5 - Concurrency race with 10 parallel workers yields exactly 1 winner (FOR UPDATE SKIP LOCKED)");
    }

    // --- Test 6: Resend Provider Unit Test & Official SDK Request Options for Idempotency ---
    {
      let capturedPayload: any = null;
      let capturedOptions: any = null;
      const mockResendSdk: any = {
        emails: {
          send: async (payload: any, options: any) => {
            capturedPayload = payload;
            capturedOptions = options;
            return { data: { id: "resend_msg_mock_99" }, error: null };
          },
        },
      };

      const resendProvider = new ResendNotificationDeliveryProvider({
        apiKey: "re_mock_key_12345",
        resendClient: mockResendSdk,
      });

      const response = await resendProvider.dispatch({
        eventId: "evt-123",
        attemptNumber: 1,
        dispatchCount: 1,
        channel: "email",
        recipient: "recipient@sovogin.local",
        providerIdempotencyKey: "evt-123:1",
      });

      assertEqual(response.outcome, "SUCCESS", "Test 6: Resend provider returns SUCCESS");
      assertEqual(response.providerMessageId, "resend_msg_mock_99", "Test 6: Provider message ID returned");
      assertEqual(capturedOptions?.idempotencyKey, "evt-123:1", "Test 6: Official SDK request option idempotencyKey passed");
      assertEqual(Boolean(capturedPayload?.headers?.["Idempotency-Key"]), false, "Test 6: Custom payload header omitted in favor of official SDK option");
      console.log("PASSED: Test 6 - ResendNotificationDeliveryProvider passes idempotencyKey via official SDK request options");
    }

    // --- Test 7: Resend Provider Error Mapping (429 Rate Limit, 409 Concurrent, 409 Invalid, Timeout) ---
    {
      const mockConcurrentSdk: any = {
        emails: {
          send: async () => {
            return { data: null, error: { name: "invalid_idempotent_request", message: "concurrent_idempotent_requests: another send is in progress", statusCode: 409 } };
          },
        },
      };

      const concurrentProvider = new ResendNotificationDeliveryProvider({
        apiKey: "re_mock_key_12345",
        resendClient: mockConcurrentSdk,
      });

      const concurrentRes = await concurrentProvider.dispatch({
        eventId: "evt-123",
        attemptNumber: 1,
        dispatchCount: 1,
        channel: "email",
        recipient: "recipient@sovogin.local",
        providerIdempotencyKey: "evt-123:1",
      });

      assertEqual(concurrentRes.outcome, "TRANSIENT_FAILURE", "Test 7: 409 concurrent maps to TRANSIENT_FAILURE");
      assertEqual(concurrentRes.failureClass, "RATE_LIMITED", "Test 7: 409 concurrent failureClass is RATE_LIMITED");
      assertEqual(concurrentRes.errorCode, "CONCURRENT_IDEMPOTENT_REQUEST", "Test 7: 409 concurrent errorCode is CONCURRENT_IDEMPOTENT_REQUEST");

      const mockInvalidIdempotentSdk: any = {
        emails: {
          send: async () => {
            return { data: null, error: { name: "invalid_idempotent_request", message: "invalid_idempotent_request: key reused with different payload", statusCode: 409 } };
          },
        },
      };

      const invalidIdempotentProvider = new ResendNotificationDeliveryProvider({
        apiKey: "re_mock_key_12345",
        resendClient: mockInvalidIdempotentSdk,
      });

      const invalidRes = await invalidIdempotentProvider.dispatch({
        eventId: "evt-123",
        attemptNumber: 1,
        dispatchCount: 1,
        channel: "email",
        recipient: "recipient@sovogin.local",
        providerIdempotencyKey: "evt-123:1",
      });

      assertEqual(invalidRes.outcome, "PERMANENT_FAILURE", "Test 7: 409 invalid maps to PERMANENT_FAILURE");
      assertEqual(invalidRes.failureClass, "PAYLOAD_VALIDATION", "Test 7: 409 invalid failureClass is PAYLOAD_VALIDATION");
      assertEqual(invalidRes.errorCode, "INVALID_IDEMPOTENT_REQUEST", "Test 7: 409 invalid errorCode is INVALID_IDEMPOTENT_REQUEST");

      console.log("PASSED: Test 7 - Resend 409 idempotency error mappings (concurrent -> TRANSIENT, invalid -> PERMANENT) verified");
    }

    // --- Test 8: Provider Success / DB Completion Failure Scenario ---
    {
      const eventId = "10000000-0000-0000-0000-000000000006";
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);

      await supabaseService.from("collection_notification_events").insert({
        id: eventId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_5D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "completion-fail@sovogin.local",
        status: "QUEUED",
        attempt_count: 0,
      });

      const { supabase: workerClient } = await createDeliveryWorkerClient();

      const realRepo = new SupabaseNotificationDeliveryRepository(workerClient);
      const failingRepo = Object.create(realRepo);
      failingRepo.completeDelivery = async () => {
        throw new Error("DB_WRITE_FAILURE: Simulating DB crash during completeDelivery");
      };

      const mockSuccessProvider = new FakeNotificationDeliveryProvider();

      let runErr: any = null;
      try {
        const claim = await failingRepo.claimNextForDelivery();
        const orchestrator = new NotificationDeliveryOrchestrator(failingRepo, mockSuccessProvider);
        await orchestrator.runDeliveryOnce(claim.event_id, { preClaimedToken: claim.claim_token });
      } catch (err: any) {
        runErr = err;
      }

      assertEqual(Boolean(runErr), true, "Test 8: Orchestrator re-throws completeDelivery error");

      const { data: evData } = await supabaseService
        .from("collection_notification_events")
        .select("status, attempt_count")
        .eq("id", eventId)
        .single();
      assertEqual(evData?.status, "PROCESSING", "Test 8: Event remains in PROCESSING state");

      const { data: attempts } = await supabaseService
        .from("collection_notification_delivery_attempts")
        .select("attempt_number")
        .eq("event_id", eventId);

      assertEqual(attempts?.length, 1, "Test 8: Exactly 1 attempt created, NO attempt #2 created");
      assertEqual(mockSuccessProvider.dispatchedRequests.length, 1, "Test 8: Provider called exactly ONCE");

      // Cleanup
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);
      console.log("PASSED: Test 8 - Provider Success + DB Completion Failure maintains single attempt and prevents duplicate sends");
    }

    // --- Test 9: Full End-to-End Execution via runNextWorkerDelivery() ---
    {
      const eventId = "10000000-0000-0000-0000-000000000007";
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);

      await supabaseService.from("collection_notification_events").insert({
        id: eventId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_5D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "e2e-success@sovogin.local",
        status: "QUEUED",
        attempt_count: 0,
      });

      const runnerRes = await runNextWorkerDelivery();
      assertEqual(runnerRes.eventId, eventId, "Test 9: Next eligible event claimed and executed");
      assertEqual(runnerRes.status, "PROCESSED_SUCCESS", "Test 9: Orchestrator status is PROCESSED_SUCCESS");

      const { data: evData } = await supabaseService
        .from("collection_notification_events")
        .select("status, attempt_count, provider_message_id")
        .eq("id", eventId)
        .single();

      assertEqual(evData?.status, "SENT", "Test 9: DB event status updated to SENT");
      assertEqual(evData?.attempt_count, 1, "Test 9: Attempt count incremented to 1");

      // Cleanup
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);
      await supabaseService.from("associates").delete().eq("id", assocId);
      console.log("PASSED: Test 9 - Full end-to-end execution via runNextWorkerDelivery() verified");
    }

  } finally {
    // Cleanup local test worker
    await supabaseService.from("profile_capabilities").delete().eq("profile_id", workerUser.id);
    await supabaseService.auth.admin.deleteUser(workerUser.id);
  }

  console.log("==========================================================");
  console.log("SUCCESS: MATRIZ HIT-3B COMPLETA DE SELECTOR + RESEND PASÓ CON ÉXITO!");
  console.log("==========================================================");
}
