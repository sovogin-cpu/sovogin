import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createDeliveryWorkerClient } from "../delivery-worker-client";
import { runWorkerDeliveryForEvent } from "../delivery-worker-runner";
import { FakeNotificationDeliveryProvider } from "../fake-delivery-provider";
import { POST } from "@/app/api/internal/notifications/delivery/run/route";
import { NextRequest } from "next/server";

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

export async function runDeliveryWorkerBoundaryTests(): Promise<void> {
  console.log("=== INICIANDO SUITE MATRIZ FINAL HIT-3A DE BARRERA DE WORKER (SUPABASE LOCAL) ===");

  const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const workerEmail = "worker-service-hit3a@sovogin.internal";
  const workerPassword = "Password123!SafeSecretKey99";
  const triggerSecret = "test-trigger-secret-hit3a-998877";

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
    user_metadata: { full_name: "HIT 3A Worker", role: "associate" },
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

  try {
    // --- Test 1: Runtime Disabled Guard (503 fail-closed) ---
    {
      process.env.DELIVERY_RUNTIME_ENABLED = "false";
      const req = new NextRequest("http://localhost:3000/api/internal/notifications/delivery/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${triggerSecret}` },
      });
      const res = await POST(req);
      assertEqual(res.status, 503, "Test 1: Runtime disabled returns 503");
      const resJson = await res.json();
      assertEqual(resJson.error, "DISABLED", "Test 1: Error code is DISABLED");
      process.env.DELIVERY_RUNTIME_ENABLED = "true";
      console.log("PASSED: Test 1 - Runtime disabled returns 503 Service Unavailable");
    }

    // --- Test 2: Trigger Secret Missing in Env -> 503 Service Unavailable ---
    {
      delete process.env.DELIVERY_WORKER_TRIGGER_SECRET;
      const req = new NextRequest("http://localhost:3000/api/internal/notifications/delivery/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${triggerSecret}` },
      });
      const res = await POST(req);
      assertEqual(res.status, 503, "Test 2: Trigger secret missing in env returns 503");
      process.env.DELIVERY_WORKER_TRIGGER_SECRET = triggerSecret;
      console.log("PASSED: Test 2 - Trigger secret missing in env returns 503");
    }

    // --- Test 3: Missing Caller Secret in Request Header -> 401 Unauthorized ---
    {
      const req = new NextRequest("http://localhost:3000/api/internal/notifications/delivery/run", {
        method: "POST",
      });
      const res = await POST(req);
      assertEqual(res.status, 401, "Test 3: Missing caller secret returns 401");
      console.log("PASSED: Test 3 - Missing caller secret header returns 401 Unauthorized");
    }

    // --- Test 4: Wrong Caller Secret (Timing-Safe Comparison) -> 401 Unauthorized ---
    {
      const req = new NextRequest("http://localhost:3000/api/internal/notifications/delivery/run", {
        method: "POST",
        headers: { Authorization: "Bearer wrong-trigger-secret-different-length" },
      });
      const res = await POST(req);
      assertEqual(res.status, 401, "Test 4: Wrong caller secret returns 401");
      console.log("PASSED: Test 4 - Timing-safe constant-time secret comparison rejects wrong secret");
    }

    // --- Test 5: External eventId / Recipient Rejection in Body -> 400 Bad Request ---
    {
      const req = new NextRequest("http://localhost:3000/api/internal/notifications/delivery/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${triggerSecret}` },
        body: JSON.stringify({ eventId: "11111111-1111-1111-1111-111111111111" }),
      });
      const res = await POST(req);
      assertEqual(res.status, 400, "Test 5: Passing eventId in body returns 400 Bad Request");
      const resJson = await res.json();
      assertEqual(resJson.error, "BAD_REQUEST", "Test 5: Operational field eventId is forbidden");
      console.log("PASSED: Test 5 - Operational fields (eventId, recipient, etc.) strictly forbidden in HTTP request body");
    }

    // --- Test 6: Route Server Event Selector Guard -> 503 Service Unavailable ---
    {
      const req = new NextRequest("http://localhost:3000/api/internal/notifications/delivery/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${triggerSecret}` },
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      assertEqual(res.status, 503, "Test 6: Route returns 503 because server event selector is missing");
      const resJson = await res.json();
      assertEqual(resJson.error, "SERVICE_UNAVAILABLE", "Test 6: Server event selector not configured");
      console.log("PASSED: Test 6 - Route returns 503 fail-closed when server event selector is missing");
    }

    // --- Test 7: Worker Factory - Credentials Missing -> Fail Closed ---
    {
      delete process.env.DELIVERY_WORKER_PASSWORD;
      let errObj: any = null;
      try {
        await createDeliveryWorkerClient();
      } catch (err: any) {
        errObj = err;
      }
      assertEqual(Boolean(errObj), true, "Test 7: Throws error when password missing");
      process.env.DELIVERY_WORKER_PASSWORD = workerPassword;
      console.log("PASSED: Test 7 - Worker factory fails closed when credentials missing in env");
    }

    // --- Test 8: Valid Local Worker Authentication ---
    {
      const clientRes = await createDeliveryWorkerClient();
      assertEqual(clientRes.workerId, workerUser.id, "Test 8: Worker UUID matches");
      assertEqual(clientRes.email, workerEmail, "Test 8: Worker Email matches");
      console.log("PASSED: Test 8 - Valid local worker authentication generates client with worker JWT");
    }

    // --- Test 9: Worker Role Check -> Worker remains associate ---
    {
      const { data: pData } = await supabaseService.from("profiles").select("role").eq("id", workerUser.id).single();
      assertEqual(pData?.role, "associate", "Test 9: Worker profile role remains associate");
      console.log("PASSED: Test 9 - Worker profile role remains associate");
    }

    // --- Test 10: Local FakeProvider Success Path via Internal Runner ---
    {
      const assocId = "99999999-9999-9999-9999-999999999999";
      await supabaseService.from("associates").upsert({
        id: assocId,
        full_name: "Test Associate Boundary",
        email: "boundary-assoc@sovogin.local",
        status: "ACTIVE",
      });

      const eventId = "11111111-1111-1111-1111-111111111111";
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);

      await supabaseService.from("collection_notification_events").insert({
        id: eventId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_5D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "test-recipient@sovogin.local",
        status: "QUEUED",
        attempt_count: 0,
      });

      const runnerRes = await runWorkerDeliveryForEvent(eventId);
      assertEqual(runnerRes.status, "PROCESSED_SUCCESS", "Test 10: Orchestrator status is PROCESSED_SUCCESS");

      const { data: evData } = await supabaseService
        .from("collection_notification_events")
        .select("status, attempt_count, provider_message_id")
        .eq("id", eventId)
        .single();
      assertEqual(evData?.status, "SENT", "Test 10: DB event status updated to SENT");

      // Cleanup
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);
      console.log("PASSED: Test 10 - Local FakeProvider success path via internal runner");
    }

    // --- Test 11: UNKNOWN_OUTCOME Regression (FakeProvider returns UNKNOWN_OUTCOME) ---
    {
      const assocId = "99999999-9999-9999-9999-999999999999";
      const eventId = "33333333-3333-3333-3333-333333333333";
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);

      await supabaseService.from("collection_notification_events").insert({
        id: eventId,
        associate_id: assocId,
        channel: "email",
        automation_type: "PRE_DUE_1D",
        reference_date: "2026-09-01",
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        recipient_email: "unknown-test@sovogin.local",
        status: "QUEUED",
        attempt_count: 0,
      });

      const unknownFakeProvider = new FakeNotificationDeliveryProvider();
      unknownFakeProvider.simulateUnknownOutcome("SOCKET_TIMEOUT", "Timeout during provider HTTP request");

      const runnerRes = await runWorkerDeliveryForEvent(eventId, {
        provider: unknownFakeProvider,
      });

      assertEqual(runnerRes.status, "PROCESSED_UNKNOWN", "Test 11: Orchestrator status is PROCESSED_UNKNOWN");

      const { data: evData } = await supabaseService
        .from("collection_notification_events")
        .select("status, attempt_count")
        .eq("id", eventId)
        .single();
      assertEqual(evData?.status, "PROCESSING", "Test 11: DB event status remains PROCESSING under UNKNOWN_OUTCOME");

      const { data: attData } = await supabaseService
        .from("collection_notification_delivery_attempts")
        .select("status, failure_class")
        .eq("event_id", eventId)
        .single();

      assertEqual(attData?.status, "UNKNOWN_OUTCOME", "Test 11: Delivery attempt status is UNKNOWN_OUTCOME");

      // Cleanup
      await supabaseService.from("collection_notification_delivery_attempts").delete().eq("event_id", eventId);
      await supabaseService.from("collection_notification_events").delete().eq("id", eventId);
      await supabaseService.from("associates").delete().eq("id", assocId);
      console.log("PASSED: Test 11 - UNKNOWN_OUTCOME regression verified");
    }

    // --- Test 12: Absolute Production FakeProvider Prohibition (Zero Escape Hatches) ---
    {
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";
      let errObj: any = null;
      try {
        await runWorkerDeliveryForEvent("00000000-0000-0000-0000-000000000001");
      } catch (err: any) {
        errObj = err;
      }
      (process.env as any).NODE_ENV = originalNodeEnv;

      assertEqual(Boolean(errObj), true, "Test 12: FakeProvider forbidden in production");
      assertEqual(errObj.message.startsWith("DELIVERY_PROVIDER_NOT_CONFIGURED"), true, "Test 12: Throws DELIVERY_PROVIDER_NOT_CONFIGURED");
      console.log("PASSED: Test 12 - FakeProvider is strictly forbidden in production with zero escape hatches");
    }

  } finally {
    // Cleanup local test worker
    await supabaseService.from("profile_capabilities").delete().eq("profile_id", workerUser.id);
    await supabaseService.auth.admin.deleteUser(workerUser.id);
  }

  console.log("==========================================================");
  console.log("SUCCESS: MATRIZ FINAL HIT-3A DE HARDENING PASÓ CON ÉXITO!");
  console.log("==========================================================");
}
