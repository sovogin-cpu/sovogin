import { createClient } from "@supabase/supabase-js";
import { SupabaseNotificationDeliveryRepository } from "../delivery-repository-adapter";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`[ASSERTION_FAILED] ${msg} -> Expected: ${expected}, Got: ${actual}`);
  }
}

export async function runSupabaseDeliveryFoundationTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS INTEGRACIÓN SUPABASE LOCAL AUTH + POSTGREST (FASE 4A5.2-E4.2-A) ===");

  const urlObj = new URL(LOCAL_SUPABASE_URL);
  if (urlObj.hostname !== "127.0.0.1" && urlObj.hostname !== "localhost") {
    throw new Error("[SECURITY ABORT] Host no local detectado: " + urlObj.hostname);
  }

  const supabaseService = createClient(LOCAL_SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const supabaseAnon = createClient(LOCAL_SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Setup test users in GoTrue local
  const adminEmail = "admin-e42a@sovogin.local";
  const assocEmail = "associate-e42a@sovogin.local";
  const pass = "TestPassword123!";

  const { data: adminAuthData, error: adminCreateErr } = await supabaseService.auth.admin.createUser({
    email: adminEmail,
    password: pass,
    email_confirm: true,
  });

  const { data: assocAuthData, error: assocCreateErr } = await supabaseService.auth.admin.createUser({
    email: assocEmail,
    password: pass,
    email_confirm: true,
  });

  let adminUser = adminAuthData?.user;
  let assocUser = assocAuthData?.user;

  if (!adminUser || !assocUser) {
    // If users already exist in GoTrue, list and find them
    const { data: usersList } = await supabaseService.auth.admin.listUsers();
    adminUser = adminUser || usersList?.users?.find(u => u.email === adminEmail) || null;
    assocUser = assocUser || usersList?.users?.find(u => u.email === assocEmail) || null;
  }

  if (!adminUser || !assocUser) {
    throw new Error(`Failed to create/get GoTrue local auth users. AdminErr: ${adminCreateErr?.message}, AssocErr: ${assocCreateErr?.message}`);
  }

  await supabaseService.from("profiles").upsert({
    id: adminUser.id,
    role: "admin",
    full_name: "E42A Admin User",
  });

  await supabaseService.from("profiles").upsert({
    id: assocUser.id,
    role: "associate",
    full_name: "E42A Associate User",
  });

  // Authenticate sessions via real GoTrue signInWithPassword
  const { data: adminSessionData, error: adminAuthErr } = await supabaseAnon.auth.signInWithPassword({
    email: adminEmail,
    password: pass,
  });
  if (adminAuthErr || !adminSessionData.session?.access_token) throw new Error("GoTrue admin auth failed");

  const { data: assocSessionData, error: assocAuthErr } = await supabaseAnon.auth.signInWithPassword({
    email: assocEmail,
    password: pass,
  });
  if (assocAuthErr || !assocSessionData.session?.access_token) throw new Error("GoTrue associate auth failed");

  console.log("PASSED: Usuarios GoTrue creados e iniciados con JWTs reales del servidor local");

  const adminClient = createClient(LOCAL_SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${adminSessionData.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const assocClient = createClient(LOCAL_SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${assocSessionData.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminRepo = new SupabaseNotificationDeliveryRepository(adminClient);
  const assocRepo = new SupabaseNotificationDeliveryRepository(assocClient);
  const anonRepo = new SupabaseNotificationDeliveryRepository(supabaseAnon);

  const testAssocId = "00000000-0000-0000-0000-000000000066";
  const dummyUuid = "00000000-0000-0000-0000-000000000001";

  // Clean test fixtures
  await supabaseService.from("collection_notification_delivery_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseService.from("collection_notification_events").delete().eq("associate_id", testAssocId);
  await supabaseService.from("associates").upsert({
    id: testAssocId,
    name: "E42A Supabase Associate",
    email: "e42a-supabase@sovogin.org",
    associate_number: "E42A-002",
    status: "active",
    category: "MEDICO_TITULAR",
    join_date: "2025-01-01",
  });

  try {
    // SECTION 1: AUTHORIZATION MATRIX ACROSS RPCS
    console.log("--- Test 1: Matriz de Autorización PostgREST (Anónimo & Asociado Rechazados con UNAUTHORIZED) ---");

    // Anonymous checks
    try { await anonRepo.claimForDelivery(dummyUuid); throw new Error("Anon claim should fail"); }
    catch (err: any) { if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) throw err; }

    try { await anonRepo.startDelivery(dummyUuid, dummyUuid); throw new Error("Anon start should fail"); }
    catch (err: any) { if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) throw err; }

    try { await anonRepo.suppressDelivery(dummyUuid, dummyUuid, "PAID"); throw new Error("Anon suppress should fail"); }
    catch (err: any) { if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) throw err; }

    // Associate checks
    try { await assocRepo.claimForDelivery(dummyUuid); throw new Error("Assoc claim should fail"); }
    catch (err: any) { if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) throw err; }

    try { await assocRepo.startDelivery(dummyUuid, dummyUuid); throw new Error("Assoc start should fail"); }
    catch (err: any) { if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) throw err; }

    try { await assocRepo.suppressDelivery(dummyUuid, dummyUuid, "PAID"); throw new Error("Assoc suppress should fail"); }
    catch (err: any) { if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) throw err; }

    console.log("PASSED: Matriz de autorización PostgREST verificada (UNAUTHORIZED en llamadas no admin)");

    // SECTION 2: DIRECT RLS ACCESS AUDIT
    console.log("--- Test 2: RLS Direct Table Access Audit via PostgREST ---");
    const { data: anonDirectSelect, error: anonSelectErr } = await supabaseAnon.from("collection_notification_delivery_attempts").select("*");
    if (!anonSelectErr && anonDirectSelect && anonDirectSelect.length > 0) throw new Error("Anonymous direct table select should be empty/denied");

    const { error: anonDirectInsertErr } = await supabaseAnon.from("collection_notification_delivery_attempts").insert({
      event_id: dummyUuid, attempt_number: 1, dispatch_count: 1, claim_token: dummyUuid, channel: "email", provider: "resend", provider_idempotency_key: "key", status: "PROCESSING"
    });
    if (!anonDirectInsertErr) throw new Error("Anonymous direct table insert should be denied by RLS");

    const { error: assocDirectInsertErr } = await assocClient.from("collection_notification_delivery_attempts").insert({
      event_id: dummyUuid, attempt_number: 1, dispatch_count: 1, claim_token: dummyUuid, channel: "email", provider: "resend", provider_idempotency_key: "key", status: "PROCESSING"
    });
    if (!assocDirectInsertErr) throw new Error("Associate direct table insert should be denied by RLS");

    console.log("PASSED: RLS Direct Access denegado para clientes Anónimo y Asociado");

    // SECTION 3: FULL REPOSITORY LIFECYCLE (QUEUED -> SENT)
    console.log("--- Test 3: Ciclo de Vida Completo del Adaptador sobre PostgREST ---");
    const { data: newEvent, error: insertErr } = await supabaseService.from("collection_notification_events").insert({
      associate_id: testAssocId,
      channel: "email",
      automation_type: "OVERDUE_7D",
      reference_date: "2026-08-25",
      status: "QUEUED",
      recipient_email: "e42a-supabase@sovogin.org",
      scheduled_for: new Date(Date.now() - 5000).toISOString(),
    }).select("id, status, attempt_count").single();

    if (insertErr || !newEvent) throw insertErr;
    assertEqual(newEvent.status, "QUEUED", "Status inicial es QUEUED");
    assertEqual(newEvent.attempt_count, 0, "attempt_count inicial es 0");

    const claimResult = await adminRepo.claimForDelivery(newEvent.id);
    assertEqual(claimResult.event_id, newEvent.id, "claimForDelivery retorna event_id correcto");
    if (!claimResult.claim_token) throw new Error("claim_token de retorno ausente");

    const startResult = await adminRepo.startDelivery(newEvent.id, claimResult.claim_token);
    assertEqual(startResult.attempt_number, 1, "startDelivery genera attempt_number 1");
    assertEqual(startResult.provider_idempotency_key, `${newEvent.id}:1`, "provider_idempotency_key es event_id:1");

    const completeSuccess = await adminRepo.completeDelivery(
      newEvent.id,
      claimResult.claim_token,
      startResult.attempt_id,
      "res_supabase_test_999",
      200,
      120
    );
    assertEqual(completeSuccess, true, "completeDelivery retorna true");

    const { data: checkFinal } = await supabaseService.from("collection_notification_events").select("status, provider_message_id, attempt_count, claim_token, sent_at").eq("id", newEvent.id).single();
    assertEqual(checkFinal?.status, "SENT", "Estado final en BD es SENT");
    assertEqual(checkFinal?.provider_message_id, "res_supabase_test_999", "provider_message_id almacenado correctamente");
    assertEqual(checkFinal?.attempt_count, 1, "attempt_count final es 1");
    assertEqual(checkFinal?.claim_token, null, "claim_token restablecido a null");
    if (!checkFinal?.sent_at) throw new Error("sent_at debe ser poblado al completar");
    console.log("PASSED: Ciclo de vida completo del adaptador verificado sobre PostgREST");

    // SECTION 4: UNKNOWN_OUTCOME RECOVERY LIFECYCLE VIA POSTGREST
    console.log("--- Test 4: UNKNOWN_OUTCOME Recovery Flow via PostgREST ---");
    const { data: unkEvent } = await supabaseService.from("collection_notification_events").insert({
      associate_id: testAssocId,
      channel: "email",
      automation_type: "OVERDUE_15D",
      reference_date: "2026-08-20",
      status: "QUEUED",
      recipient_email: "e42a-supabase@sovogin.org",
      scheduled_for: new Date(Date.now() - 5000).toISOString(),
    }).select("id").single();

    if (!unkEvent) throw new Error("Failed to insert unkEvent");

    // Scenario: Worker A starts attempt #1 (status PROCESSING), then lease expires without Worker A finishing
    const claimA = await adminRepo.claimForDelivery(unkEvent.id);
    const startA = await adminRepo.startDelivery(unkEvent.id, claimA.claim_token);

    // Expire lease while attempt is in PROCESSING
    await supabaseService.from("collection_notification_events").update({ claim_expires_at: new Date(Date.now() - 60000).toISOString() }).eq("id", unkEvent.id);

    // Worker B claims expired lease and recovers attempt #1 to UNKNOWN_OUTCOME
    const claimB = await adminRepo.claimForDelivery(unkEvent.id);
    const recovered = await adminRepo.recoverExpiredDelivery(unkEvent.id, startA.attempt_id, claimB.claim_token);
    assertEqual(recovered.status, "UNKNOWN_OUTCOME", "recoverExpiredDelivery debe transicionar a UNKNOWN_OUTCOME");

    // Worker B resumes attempt #1 from UNKNOWN_OUTCOME to PROCESSING
    const resumed = await adminRepo.resumeUnknownDelivery(unkEvent.id, startA.attempt_id, claimB.claim_token);
    assertEqual(resumed.attempt_number, 1, "resumeUnknownDelivery mantiene attempt_number 1");
    assertEqual(resumed.dispatch_count, 2, "resumeUnknownDelivery incrementa dispatch_count a 2");

    // Verify Worker A token is fenced
    try {
      await adminRepo.completeDelivery(unkEvent.id, claimA.claim_token, startA.attempt_id, "res_stale", 200, 100);
      throw new Error("Worker A stale token should be fenced");
    } catch (err: any) {
      if (!err.message.includes("STALE_CLAIM_FENCING_ERROR")) throw err;
    }
    console.log("PASSED: UNKNOWN_OUTCOME recovery flow verificado sobre PostgREST (dispatch_count: start=1, recover=1, resume=2)");

    // SECTION 5: RETRY_BACKOFF_ACTIVE EXCEPTION PRESERVATION
    console.log("--- Test 5: Preservación de RETRY_BACKOFF_ACTIVE via PostgREST ---");
    const { data: backoffEvent } = await supabaseService.from("collection_notification_events").insert({
      associate_id: testAssocId,
      channel: "email",
      automation_type: "OVERDUE_30D",
      reference_date: "2026-08-01",
      status: "QUEUED",
      recipient_email: "e42a-supabase@sovogin.org",
      scheduled_for: new Date(Date.now() - 5000).toISOString(),
    }).select("id").single();

    if (!backoffEvent) throw new Error("Failed to insert backoffEvent");

    const bClaim = await adminRepo.claimForDelivery(backoffEvent.id);
    const bStart = await adminRepo.startDelivery(backoffEvent.id, bClaim.claim_token);
    await adminRepo.failDelivery(backoffEvent.id, bClaim.claim_token, bStart.attempt_id, "TRANSIENT", "500", "Server Error");

    try {
      await adminRepo.claimForDelivery(backoffEvent.id);
      throw new Error("Claim during active backoff window should fail with RETRY_BACKOFF_ACTIVE");
    } catch (err: any) {
      if (!err.message.includes("RETRY_BACKOFF_ACTIVE")) throw err;
      console.log("PASSED: Excepción RETRY_BACKOFF_ACTIVE preservada intacta a través del adaptador PostgREST");
    }

    // SECTION 6: CONCURRENCY POSTGREST CLAIM RACES (10 ITERATIONS)
    console.log("--- Test 6: Concurrencia PostgREST con Adaptador de Producción (10 Iteraciones) ---");
    let totalWins = 0;
    let totalFails = 0;

    for (let i = 1; i <= 10; i++) {
      const { data: raceEvent } = await supabaseService.from("collection_notification_events").insert({
        associate_id: testAssocId,
        channel: "email",
        automation_type: `OVERDUE_1D`,
        reference_date: `2026-08-${10 + i}`,
        status: "QUEUED",
        recipient_email: "e42a-supabase@sovogin.org",
        scheduled_for: new Date(Date.now() - 5000).toISOString(),
      }).select("id").single();

      if (!raceEvent) continue;

      const results = await Promise.allSettled([
        adminRepo.claimForDelivery(raceEvent.id),
        adminRepo.claimForDelivery(raceEvent.id),
      ]);

      const wins = results.filter((r) => r.status === "fulfilled").length;
      const fails = results.filter((r) => r.status === "rejected").length;

      if (wins === 1 && fails === 1) {
        totalWins++;
        totalFails++;
      } else {
        throw new Error(`Race iteration ${i} failed: wins=${wins}, fails=${fails}`);
      }
    }

    assertEqual(totalWins, 10, "10 iteraciones de carrera PostgREST arrojaron exactamente 1 ganador");
    assertEqual(totalFails, 10, "10 iteraciones de carrera PostgREST arrojaron exactamente 1 rechazo");
    console.log("PASSED: 10/10 carreras de concurrencia PostgREST validadas con FOR UPDATE SKIP LOCKED");

    console.log("==========================================================");
    console.log("SUCCESS: TODAS LAS PRUEBAS DE INTEGRACIÓN SUPABASE LOCAL AUTH + POSTGREST PASARON CON ÉXITO!");
    console.log("==========================================================");
  } finally {
    // Teardown test auth users
    if (adminUser) {
      await supabaseService.from("profiles").delete().eq("id", adminUser.id);
      await supabaseService.auth.admin.deleteUser(adminUser.id);
    }
    if (assocUser) {
      await supabaseService.from("profiles").delete().eq("id", assocUser.id);
      await supabaseService.auth.admin.deleteUser(assocUser.id);
    }
    await supabaseService.from("collection_notification_delivery_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseService.from("collection_notification_events").delete().eq("associate_id", testAssocId);
  }
}
