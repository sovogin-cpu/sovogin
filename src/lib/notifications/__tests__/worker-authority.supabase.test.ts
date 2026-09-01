import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SupabaseNotificationDeliveryRepository } from "../delivery-repository-adapter";

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
    throw new Error(`[ASSERTION_FAILED] ${message} -> Expected: ${expected}, Got: ${actual}`);
  }
}

export async function runWorkerAuthorityTests(): Promise<void> {
  console.log("=== INICIANDO SUITE COMPLETA H1/H2 DE PRUEBAS DE AUTORIZACIÓN DE WORKER E4.2-C (SUPABASE LOCAL) ===");

  const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminEmail = "admin-e42c-h2@sovogin.local";
  const assocAEmail = "assoc-a-e42c-h2@sovogin.local";
  const assocBEmail = "assoc-b-e42c-h2@sovogin.local";
  const workerEmail = "worker-e42c-h2@sovogin.local";
  const testPassword = "Password123!";

  // 1. Setup GoTrue Test Users
  let { data: usersList } = await supabaseService.auth.admin.listUsers();
  let adminUser = usersList?.users?.find((u) => u.email === adminEmail) || null;
  let assocAUser = usersList?.users?.find((u) => u.email === assocAEmail) || null;
  let assocBUser = usersList?.users?.find((u) => u.email === assocBEmail) || null;
  let workerUser = usersList?.users?.find((u) => u.email === workerEmail) || null;

  if (!adminUser) {
    const { data: c } = await supabaseService.auth.admin.createUser({ email: adminEmail, password: testPassword, email_confirm: true });
    if (c?.user) adminUser = c.user;
  }
  if (!assocAUser) {
    const { data: c } = await supabaseService.auth.admin.createUser({ email: assocAEmail, password: testPassword, email_confirm: true });
    if (c?.user) assocAUser = c.user;
  }
  if (!assocBUser) {
    const { data: c } = await supabaseService.auth.admin.createUser({ email: assocBEmail, password: testPassword, email_confirm: true });
    if (c?.user) assocBUser = c.user;
  }
  if (!workerUser) {
    const { data: c } = await supabaseService.auth.admin.createUser({ email: workerEmail, password: testPassword, email_confirm: true });
    if (c?.user) workerUser = c.user;
  }

  if (!adminUser || !assocAUser || !assocBUser || !workerUser) {
    throw new Error("Failed to create/find test GoTrue users for H2 suite.");
  }

  // Seed Profiles
  await supabaseService.from("profiles").upsert([
    { id: adminUser.id, email: adminEmail, role: "admin", full_name: "Admin E42C H2" },
    { id: assocAUser.id, email: assocAEmail, role: "associate", full_name: "Assoc A E42C H2" },
    { id: assocBUser.id, email: assocBEmail, role: "associate", full_name: "Assoc B E42C H2" },
    { id: workerUser.id, email: workerEmail, role: "associate", full_name: "Worker E42C H2" },
  ]);

  // Grant Capability to workerUser
  await supabaseService.from("profile_capabilities").upsert({
    profile_id: workerUser.id,
    capability: "notification_delivery_worker",
  });

  // Authenticate Clients
  const adminClientAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const assocAClientAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const assocBClientAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const workerClientAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: adminAuth } = await adminClientAnon.auth.signInWithPassword({ email: adminEmail, password: testPassword });
  const { data: assocAAuth } = await assocAClientAnon.auth.signInWithPassword({ email: assocAEmail, password: testPassword });
  const { data: assocBAuth } = await assocBClientAnon.auth.signInWithPassword({ email: assocBEmail, password: testPassword });
  const { data: workerAuth } = await workerClientAnon.auth.signInWithPassword({ email: workerEmail, password: testPassword });

  const adminClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${adminAuth.session!.access_token}` } } });
  const assocAClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${assocAAuth.session!.access_token}` } } });
  const assocBClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${assocBAuth.session!.access_token}` } } });
  const workerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${workerAuth.session!.access_token}` } } });
  const unauthClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const adminRepo = new SupabaseNotificationDeliveryRepository(adminClient);
  const assocARepo = new SupabaseNotificationDeliveryRepository(assocAClient);
  const workerRepo = new SupabaseNotificationDeliveryRepository(workerClient);
  const anonRepo = new SupabaseNotificationDeliveryRepository(unauthClient);

  // Seed Event
  const testAssocId = "00000000-0000-0000-0000-000000000077";
  await supabaseService.from("associates").upsert({
    id: testAssocId,
    full_name: "Test Assoc H2",
    email: "h2-assoc@sovogin.local",
    status: "ACTIVE",
  });
  const uniqueRefDate = new Date(Date.now() + Math.floor(Math.random() * 500000000000) + 100000000000).toISOString().slice(0, 10);
  const { data: testEv } = await supabaseService.from("collection_notification_events").insert({
    associate_id: testAssocId,
    channel: "email",
    automation_type: "OVERDUE_7D",
    reference_date: uniqueRefDate,
    status: "QUEUED",
    recipient_email: "e42c-h2@sovogin.org",
    scheduled_for: new Date(Date.now() - 5000).toISOString(),
  }).select("id").single();

  if (!testEv) throw new Error("Failed to insert test notification event");

  // --- Scenario 1: Anonymous Delivery RPC -> UNAUTHORIZED ---
  {
    let err = "";
    try { await anonRepo.claimForDelivery(testEv.id); } catch (e: any) { err = e.message; }
    assertEqual(err.includes("UNAUTHORIZED"), true, "S1: Anonymous claim rejected");
    console.log("PASSED: Scenario 1 - Anonymous Delivery RPC Rejected");
  }

  // --- Scenario 2: Associate without capability -> UNAUTHORIZED ---
  {
    let err = "";
    try { await assocARepo.claimForDelivery(testEv.id); } catch (e: any) { err = e.message; }
    assertEqual(err.includes("UNAUTHORIZED"), true, "S2: Associate claim rejected");
    console.log("PASSED: Scenario 2 - Associate Without Capability Rejected");
  }

  // --- Scenario 3: Worker with capability -> AUTHORIZED ---
  {
    const claim = await workerRepo.claimForDelivery(testEv.id);
    assertEqual(typeof claim.claim_token, "string", "S3: Worker claim succeeds");
    await workerRepo.suppressDelivery(testEv.id, claim.claim_token, "RESET_FOR_TEST");
    await supabaseService.from("collection_notification_events").update({ status: "QUEUED", claim_token: null }).eq("id", testEv.id);
    console.log("PASSED: Scenario 3 - Worker With Capability Authorized");
  }

  // --- Scenario 4: Admin -> AUTHORIZED ---
  {
    const claim = await adminRepo.claimForDelivery(testEv.id);
    assertEqual(typeof claim.claim_token, "string", "S4: Admin claim succeeds");
    await adminRepo.suppressDelivery(testEv.id, claim.claim_token, "RESET_FOR_TEST");
    await supabaseService.from("collection_notification_events").update({ status: "QUEUED", claim_token: null }).eq("id", testEv.id);
    console.log("PASSED: Scenario 4 - Admin Authorized");
  }

  // --- Scenario 5: Associate Self-Grant Capability -> DENIED ---
  {
    const { error: insertErr } = await assocAClient.from("profile_capabilities").insert({
      profile_id: assocAUser.id,
      capability: "notification_delivery_worker",
    });
    assertEqual(Boolean(insertErr), true, "S5: Associate self-grant must fail with RLS error");
    console.log("PASSED: Scenario 5 - Associate Self-Grant Denied");
  }

  // --- Scenario 6: Associate Cross-User Capability Grant -> DENIED ---
  {
    const { error: insertErr } = await assocAClient.from("profile_capabilities").insert({
      profile_id: assocBUser.id,
      capability: "notification_delivery_worker",
    });
    assertEqual(Boolean(insertErr), true, "S6: Associate cross-grant must fail with RLS error");
    console.log("PASSED: Scenario 6 - Cross-User Capability Grant Denied");
  }

  // --- Scenario 7: Anonymous Capability Mutation -> DENIED ---
  {
    const { error: insertErr } = await unauthClient.from("profile_capabilities").insert({
      profile_id: assocAUser.id,
      capability: "notification_delivery_worker",
    });
    assertEqual(Boolean(insertErr), true, "S7: Anonymous capability mutation denied");
    console.log("PASSED: Scenario 7 - Anonymous Capability Mutation Denied");
  }

  // --- Scenario 8: H2 Real Non-Delivery General-Admin Denial (3 Surfaces) ---
  {
    // Surface 1: Chatbot RLS Documents direct insert
    const { error: chatErr } = await workerClient.from("chatbot_documents").insert({
      title: "H2 Test Document",
      content_raw: "Raw text content",
      source_type: "MANUAL",
    });
    assertEqual(Boolean(chatErr), true, "S8.1: Worker chatbot_documents insert denied");

    // Surface 2: BREB Payment Orders direct select / update
    const { data: brebData, error: brebErr } = await workerClient.from("breb_payment_orders").select("*");
    assertEqual((brebData?.length || 0) === 0 || Boolean(brebErr), true, "S8.2: Worker breb_payment_orders select empty/denied");

    // Surface 3: Collection Rules direct insert
    const { error: ruleErr } = await workerClient.from("collection_rules").insert({
      name: "H2 Test Rule",
      automation_type: "OVERDUE_7D",
      channel: "email",
      is_enabled: true,
    });
    assertEqual(Boolean(ruleErr), true, "S8.3: Worker collection_rules insert denied");

    console.log("PASSED: Scenario 8 - Real Non-Delivery General-Admin Denial (3 Surfaces Tested)");
  }

  // --- Scenario 9: Direct Delivery Tables Write Matrix (Events & Attempts) ---
  {
    // Events: INSERT, UPDATE, DELETE
    const { error: evInsertErr } = await workerClient.from("collection_notification_events").insert({
      associate_id: testAssocId,
      channel: "email",
      automation_type: "OVERDUE_14D",
      reference_date: "2099-01-01",
      status: "QUEUED",
      recipient_email: "h2@sovogin.org",
      scheduled_for: new Date().toISOString(),
    });
    assertEqual(Boolean(evInsertErr), true, "S9.1: Worker direct INSERT to events denied");

    const { data: evUpdData, error: evUpdateErr } = await workerClient.from("collection_notification_events").update({ status: "SENT" }).eq("id", testEv.id).select();
    assertEqual(Boolean(evUpdateErr) || (evUpdData?.length || 0) === 0, true, "S9.2: Worker direct UPDATE to events denied (0 rows updated)");

    const { data: evDelData, error: evDeleteErr } = await workerClient.from("collection_notification_events").delete().eq("id", testEv.id).select();
    assertEqual(Boolean(evDeleteErr) || (evDelData?.length || 0) === 0, true, "S9.3: Worker direct DELETE to events denied (0 rows deleted)");

    // Attempts: INSERT, UPDATE, DELETE
    const { error: attInsertErr } = await workerClient.from("collection_notification_delivery_attempts").insert({
      event_id: testEv.id,
      attempt_number: 99,
      dispatch_count: 1,
      claim_token: testEv.id,
      channel: "email",
      provider: "resend",
      provider_idempotency_key: `${testEv.id}:99`,
      status: "PROCESSING",
    });
    assertEqual(Boolean(attInsertErr), true, "S9.4: Worker direct INSERT to attempts denied");

    const { data: attUpdData, error: attUpdateErr } = await workerClient.from("collection_notification_delivery_attempts").update({ status: "SUCCESS" }).eq("event_id", testEv.id).select();
    assertEqual(Boolean(attUpdateErr) || (attUpdData?.length || 0) === 0, true, "S9.5: Worker direct UPDATE to attempts denied (0 rows updated)");

    const { data: attDelData, error: attDeleteErr } = await workerClient.from("collection_notification_delivery_attempts").delete().eq("event_id", testEv.id).select();
    assertEqual(Boolean(attDeleteErr) || (attDelData?.length || 0) === 0, true, "S9.6: Worker direct DELETE to attempts denied (0 rows deleted)");

    console.log("PASSED: Scenario 9 - Direct Delivery Table Write Matrix Denied (Events & Attempts)");
  }

  // --- Scenario 10: Anonymous & Associate Direct Delivery Table Writes Denied ---
  {
    const { data: anonEvData, error: anonEvErr } = await unauthClient.from("collection_notification_events").update({ status: "SENT" }).eq("id", testEv.id).select();
    assertEqual(Boolean(anonEvErr) || (anonEvData?.length || 0) === 0, true, "S10.1: Anonymous direct UPDATE to events denied (0 rows updated)");

    const { data: assocEvData, error: assocEvErr } = await assocAClient.from("collection_notification_events").update({ status: "SENT" }).eq("id", testEv.id).select();
    assertEqual(Boolean(assocEvErr) || (assocEvData?.length || 0) === 0, true, "S10.2: Associate direct UPDATE to events denied (0 rows updated)");

    console.log("PASSED: Scenario 10 - Anonymous & Associate Direct Delivery Table Writes Denied");
  }

  // --- Scenario 11: All 7 RPCs Recognize Worker Capability & Auth Precedes Leakage ---
  {
    const dummyId = "00000000-0000-0000-0000-000000000000";
    const dummyToken = "00000000-0000-0000-0000-000000000000";

    try { await workerRepo.claimForDelivery(dummyId); } catch (e: any) {
      assertEqual(e.message.includes("NOT_FOUND"), true, "S11.1: Worker claim passed auth, failed at lifecycle NOT_FOUND");
    }
    try { await workerRepo.suppressDelivery(dummyId, dummyToken, "REASON"); } catch (e: any) {
      assertEqual(e.message.includes("STALE_CLAIM"), true, "S11.2: Worker suppress passed auth, failed at lifecycle STALE_CLAIM");
    }
    try { await workerRepo.startDelivery(dummyId, dummyToken); } catch (e: any) {
      assertEqual(e.message.includes("NOT_FOUND"), true, "S11.3: Worker start passed auth, failed at lifecycle NOT_FOUND");
    }
    try { await workerRepo.recoverExpiredDelivery(dummyId, dummyId, dummyToken); } catch (e: any) {
      assertEqual(e.message.includes("INVALID_ATTEMPT_STATE"), true, "S11.4: Worker recover passed auth, failed at lifecycle INVALID_ATTEMPT_STATE");
    }
    try { await workerRepo.resumeUnknownDelivery(dummyId, dummyId, dummyToken); } catch (e: any) {
      assertEqual(e.message.includes("STALE_CLAIM"), true, "S11.5: Worker resume passed auth, failed at lifecycle STALE_CLAIM");
    }
    try { await workerRepo.completeDelivery(dummyId, dummyToken, dummyId, "msg_1"); } catch (e: any) {
      assertEqual(e.message.includes("STALE_CLAIM"), true, "S11.6: Worker complete passed auth, failed at lifecycle STALE_CLAIM");
    }
    try { await workerRepo.failDelivery(dummyId, dummyToken, dummyId, "PERMANENT", "ERR", "MSG"); } catch (e: any) {
      assertEqual(e.message.includes("STALE_CLAIM"), true, "S11.7: Worker fail passed auth, failed at lifecycle STALE_CLAIM");
    }

    console.log("PASSED: Scenario 11 - All 7 RPCs Recognize Worker Capability & Auth Precedes Leakage");
  }

  // --- Scenario 12: Direct Helper Function Execution Denied to External Clients ---
  {
    const { data: unauthRes, error: unauthErr } = await unauthClient.rpc("can_execute_notification_delivery");
    assertEqual(Boolean(unauthErr) || unauthRes === null || unauthRes === undefined, true, "S12.1: Helper direct call denied/null for unauthenticated client");

    const { data: assocRes, error: assocErr } = await assocAClient.rpc("can_execute_notification_delivery");
    assertEqual(Boolean(assocErr) || assocRes === null || assocRes === undefined, true, "S12.2: Helper direct call denied/null for associate client");

    const { data: workerRes, error: workerErr } = await workerClient.rpc("can_execute_notification_delivery");
    assertEqual(Boolean(workerErr) || workerRes === null || workerRes === undefined, true, "S12.3: Helper direct call denied/null for worker client");

    console.log("PASSED: Scenario 12 - Direct Helper Function Execution Strictly Denied to All External Clients");
  }

  // --- Cleanup Fixtures ---
  await supabaseService.from("collection_notification_events").delete().eq("id", testEv.id);
  await supabaseService.from("profile_capabilities").delete().eq("profile_id", workerUser.id);

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS DE AUTORIZACIÓN H2 PASARON CON ÉXITO!");
  console.log("==========================================================");
}
