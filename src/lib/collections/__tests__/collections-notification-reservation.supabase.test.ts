import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { POST as reserveRouteHandler } from "@/app/api/admin/collections/automation/reserve/route";
import {
  reserveNotificationEvent,
  NotificationFreshStateLoader,
  NotificationReservationRepository,
  NewNotificationRecord,
  ReservedNotificationEvent,
  ExistingNotificationEvent,
} from "../collections-notification-reservation-service";
import { getMembershipAgingReport } from "@/lib/memberships/aging-engine";
import { enrichAssociatesWithCollectionsStatus } from "../collections-dashboard-service";
import { getPaymentPromisesMonitor } from "../collections-queue-service";
import { AutomationTriggerCode, AutomationChannel } from "../collections-automation-service";
import { CollectionAction } from "../types";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

function createProductionSupabaseRepository(supabase: SupabaseClient): NotificationReservationRepository {
  return {
    insertQueuedEvent: async (record: NewNotificationRecord): Promise<ReservedNotificationEvent> => {
      const { data, error } = await supabase
        .from("collection_notification_events")
        .insert({
          associate_id: record.associate_id,
          channel: record.channel,
          automation_type: record.automation_type,
          reference_date: record.reference_date,
          status: "QUEUED",
          recipient_email: record.recipient_email,
          scheduled_for: record.scheduled_for,
        })
        .select("id, associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for, created_at")
        .single();

      if (error) {
        const errObj = new Error(error.message || JSON.stringify(error));
        Object.assign(errObj, error);
        throw errObj;
      }
      return data as ReservedNotificationEvent;
    },
    findExistingEvent: async (
      assocId: string,
      autoType: AutomationTriggerCode,
      refDate: string,
      chan: AutomationChannel
    ): Promise<ExistingNotificationEvent | null> => {
      const { data, error } = await supabase
        .from("collection_notification_events")
        .select("id, associate_id, channel, automation_type, reference_date, status, scheduled_for")
        .eq("associate_id", assocId)
        .eq("automation_type", autoType)
        .eq("reference_date", refDate)
        .eq("channel", chan)
        .maybeSingle();

      if (error) {
        const errObj = new Error(error.message || JSON.stringify(error));
        Object.assign(errObj, error);
        throw errObj;
      }
      return data as ExistingNotificationEvent | null;
    },
  };
}

export async function runSupabaseIntegrationTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS INTEGRACIÓN SUPABASE LOCAL AUTH + POSTGREST (FASE 4A5.2-E3.3-B) ===");

  // 1. FAIL-CLOSED ENVIRONMENT GUARD
  const urlObj = new URL(LOCAL_SUPABASE_URL);
  if (urlObj.hostname !== "127.0.0.1" && urlObj.hostname !== "localhost") {
    throw new Error("[SECURITY ABORT] Intento de ejecutar pruebas de Supabase contra host no local: " + urlObj.hostname);
  }
  if (LOCAL_SUPABASE_URL.includes("supabase.co") || LOCAL_SUPABASE_URL.includes("uxzpzygfbmpeymlfcznd")) {
    throw new Error("[SECURITY ABORT] Project Ref de producción detectado en URL!");
  }
  console.log("--- Guard de Seguridad: Confirmado Supabase Local en http://127.0.0.1:54321 ---");

  // Privileged setup client for fixtures
  const supabaseService = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testAssociateId = "00000000-0000-0000-0000-000000000099";

  // Clean test fixtures via service role before running assertions
  await supabaseService.from("collection_notification_events").delete().eq("associate_id", testAssociateId);
  await supabaseService.from("collection_actions").delete().eq("associate_id", testAssociateId);
  await supabaseService.from("membership_charges").delete().eq("associate_id", testAssociateId);
  await supabaseService.from("associate_memberships").delete().eq("associate_id", testAssociateId);
  await supabaseService.from("associates").delete().eq("id", testAssociateId);

  // Insert associate fixture
  const { error: assocInsErr } = await supabaseService.from("associates").upsert({
    id: testAssociateId,
    full_name: "Asociado Mora Supabase Local",
    email: "supabase-local@sovogin.org",
    document_number: "88887777",
    status: "active",
  });
  if (assocInsErr) {
    throw new Error("No se pudo crear asociado de prueba: " + assocInsErr.message);
  }

  // Obtain authenticated sessions
  const anonClient = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY);

  const adminClient = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY);
  const { data: adminAuthData, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: "admin-e33@sovogin.local",
    password: "AdminPassword123!",
  });
  if (adminAuthErr || !adminAuthData.session) {
    throw new Error("No se pudo autenticar usuario admin local: " + adminAuthErr?.message);
  }

  const assocClient = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY);
  const { data: assocAuthData, error: assocAuthErr } = await assocClient.auth.signInWithPassword({
    email: "associate-e33@sovogin.local",
    password: "AssociatePassword123!",
  });
  if (assocAuthErr || !assocAuthData.session) {
    throw new Error("No se pudo autenticar usuario asociado local: " + assocAuthErr?.message);
  }

  console.log("--- Autenticación Exitosa: JWTs reales de Supabase Auth obtenidos ---");

  try {
    // Test 1: Anonymous PostgREST Insert Rejection
    console.log("--- Test 1: Rechazo de inserción PostgREST para usuario anónimo ---");
    const { error: anonErr } = await anonClient
      .from("collection_notification_events")
      .insert({
        associate_id: testAssociateId,
        channel: "email",
        automation_type: "OVERDUE_7D",
        reference_date: "2026-08-08",
        status: "QUEUED",
        scheduled_for: new Date().toISOString(),
      });
    assertEqual(anonErr !== null, true, "Anonymous PostgREST insert rejected");
    assertEqual(anonErr?.code === "42501" || anonErr?.message?.includes("security policy"), true, "Anon error is RLS denial");

    // Test 2: Associate PostgREST Insert Rejection
    console.log("--- Test 2: Rechazo de inserción PostgREST para rol no-admin (associate) ---");
    const { error: assocErr } = await assocClient
      .from("collection_notification_events")
      .insert({
        associate_id: testAssociateId,
        channel: "email",
        automation_type: "OVERDUE_7D",
        reference_date: "2026-08-08",
        status: "QUEUED",
        scheduled_for: new Date().toISOString(),
      });
    assertEqual(assocErr !== null, true, "Associate PostgREST insert rejected");
    assertEqual(assocErr?.code === "42501" || assocErr?.message?.includes("security policy"), true, "Associate error is RLS denial");

    // Test 3: Admin PostgREST Insert Success
    console.log("--- Test 3: Inserción PostgREST exitosa para usuario Admin autenticado ---");
    const adminRepo = createProductionSupabaseRepository(adminClient);
    const candidatePayload = {
      associate_id: testAssociateId,
      automation_type: "OVERDUE_7D" as AutomationTriggerCode,
      reference_date: "2026-08-08",
      channel: "email" as AutomationChannel,
    };

    const makeEligibleLoader = (oldestDue: string): NotificationFreshStateLoader => ({
      loadFreshState: async () => ({
        associate: {
          associate_id: testAssociateId,
          full_name: "Asociado Mora Supabase Local",
          email: "supabase-local@sovogin.org",
          account_status: "EN MORA",
          total_outstanding: 300000,
          open_charge_count: 1,
          oldest_unpaid_due_date: oldestDue,
          days_past_due: 7,
          aging_bucket: "1-30 días",
          current_amount: 0,
          days_1_30: 300000,
          days_31_60: 0,
          days_61_90: 0,
          days_91_120: 0,
          days_over_120: 0,
          collection_status: "SIN_GESTION",
          follow_up_state: "NONE",
          last_contacted_at: null,
          next_follow_up_at: null,
          latest_collection_action: null,
        },
        promise: null,
        history: [],
      }),
    });

    const eligibleLoader = makeEligibleLoader("2026-08-01");

    const reserveRes1 = await reserveNotificationEvent(eligibleLoader, candidatePayload, adminRepo);
    assertEqual(reserveRes1.outcome, "RESERVED", "Admin PostgREST outcome is RESERVED");
    if (reserveRes1.outcome === "RESERVED") {
      assertEqual(reserveRes1.event.status, "QUEUED", "Status is QUEUED");
    }

    // Verify DB count via admin client
    const { count: count1 } = await adminClient
      .from("collection_notification_events")
      .select("*", { count: "exact", head: true })
      .eq("associate_id", testAssociateId);
    assertEqual(count1, 1, "Exactly 1 DB row created in local Supabase DB");

    // Test 4: Sequential Duplicate via Admin PostgREST Adapter (ALREADY_RESERVED)
    console.log("--- Test 4: Intento secuencial duplicado via PostgREST retorna ALREADY_RESERVED ---");
    const reserveRes2 = await reserveNotificationEvent(eligibleLoader, candidatePayload, adminRepo);
    assertEqual(reserveRes2.outcome, "ALREADY_RESERVED", "Sequential duplicate is ALREADY_RESERVED");

    const { count: count2 } = await adminClient
      .from("collection_notification_events")
      .select("*", { count: "exact", head: true })
      .eq("associate_id", testAssociateId);
    assertEqual(count2, 1, "DB count remains exactly 1");

    // Test 5: Real `getMembershipAgingReport(adminClient)` Execution over PostgREST
    console.log("--- Test 5: Ejecución real de getMembershipAgingReport(adminClient) sobre PostgREST ---");
    const { data: mbData } = await supabaseService.from("associate_memberships").insert({
      associate_id: testAssociateId,
      started_at: "2026-01-01",
      billing_anchor_date: "2026-01-01",
      billing_status: "active",
    }).select().single();

    await supabaseService.from("membership_charges").insert({
      associate_id: testAssociateId,
      membership_id: mbData?.id,
      original_amount: 300000,
      due_date: "2026-08-01",
      admin_status: "open",
      concept: "Cuota de sostenimiento",
    });

    const agingReportResult = await getMembershipAgingReport(adminClient);
    const agingReport = agingReportResult.associates;
    const testAgingItem = agingReport.find((item) => item.associate_id === testAssociateId);
    assertEqual(testAgingItem !== undefined, true, "Aging report contains test associate");
    assertEqual(testAgingItem?.account_status, "EN MORA", "Aging report status is EN MORA");
    assertEqual(testAgingItem?.total_outstanding, 300000, "Total outstanding matches charge");

    // Test 6: Complete Fresh State Loader Chain
    console.log("--- Test 6: Trace de Cadena Completa de Carga Fresh (getMembershipAgingReport -> RLS -> Loader) ---");
    const actionsRes = await adminClient
      .from("collection_actions")
      .select("*")
      .eq("associate_id", testAssociateId);

    const actionsMap: Record<string, CollectionAction[]> = {
      [testAssociateId]: (actionsRes.data || []) as CollectionAction[],
    };

    const enrichedList = enrichAssociatesWithCollectionsStatus(agingReport, actionsMap);
    const promisesMonitor = getPaymentPromisesMonitor(enrichedList, actionsMap);
    const testPromise = promisesMonitor.find((p) => p.associate_id === testAssociateId) || null;

    const realFreshLoader: NotificationFreshStateLoader = {
      loadFreshState: async (assocId) => {
        const freshAgingObj = await getMembershipAgingReport(adminClient);
        const freshAssoc = freshAgingObj.associates.find((a) => a.associate_id === assocId);
        if (!freshAssoc) throw new Error("Associate not found");
        const freshEnriched = enrichAssociatesWithCollectionsStatus([freshAssoc], actionsMap)[0];
        return {
          associate: freshEnriched,
          promise: testPromise,
          history: [],
        };
      },
    };

    // Test 7: PostgREST Concurrency Race Condition Test (10 Iterations)
    console.log("--- Test 7: Concurrencia PostgREST con Adaptador de Producción (10 Iteraciones) ---");
    let totalReserved = 0;
    let totalAlreadyReserved = 0;
    let totalUnexpected = 0;

    function get7DaysPriorDateStr(dateStr: string): string {
      const dt = new Date(dateStr + "T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate() - 7);
      return dt.toISOString().slice(0, 10);
    }

    for (let iter = 1; iter <= 10; iter++) {
      const iterRefDate = `2026-11-${String(iter).padStart(2, "0")}`;
      const iterOldestDue = get7DaysPriorDateStr(iterRefDate);
      const iterLoader = makeEligibleLoader(iterOldestDue);

      const iterPayload = {
        associate_id: testAssociateId,
        automation_type: "OVERDUE_7D" as AutomationTriggerCode,
        reference_date: iterRefDate,
        channel: "email" as AutomationChannel,
      };

      const [resA, resB] = await Promise.all([
        reserveNotificationEvent(iterLoader, iterPayload, adminRepo),
        reserveNotificationEvent(iterLoader, iterPayload, adminRepo),
      ]);

      const outcomes = [resA.outcome, resB.outcome];
      const reservedCount = outcomes.filter((o) => o === "RESERVED").length;
      const alreadyReservedCount = outcomes.filter((o) => o === "ALREADY_RESERVED").length;
      const unexpectedCount = outcomes.filter((o) => o !== "RESERVED" && o !== "ALREADY_RESERVED").length;

      totalReserved += reservedCount;
      totalAlreadyReserved += alreadyReservedCount;
      totalUnexpected += unexpectedCount;

      assertEqual(reservedCount, 1, `PostgREST Iteración ${iter}: exactamente 1 RESERVED`);
      assertEqual(alreadyReservedCount, 1, `PostgREST Iteración ${iter}: exactamente 1 ALREADY_RESERVED`);
    }

    assertEqual(totalReserved, 10, "10 iteraciones PostgREST resultaron en 10 RESERVED totales");
    assertEqual(totalAlreadyReserved, 10, "10 iteraciones PostgREST resultaron en 10 ALREADY_RESERVED totales");
    assertEqual(totalUnexpected, 0, "0 errores inesperados en carreras PostgREST");

    // Test 8: End-to-End Route Validation (POST /api/admin/collections/automation/reserve)
    console.log("--- Test 8: Validación de Route Productiva Local POST /api/admin/collections/automation/reserve ---");
    const testAssociateIdRoute = "00000000-0000-0000-0000-000000000088";

    // Clean and setup dedicated associate fixture for route test
    await supabaseService.from("collection_notification_events").delete().eq("associate_id", testAssociateIdRoute);
    await supabaseService.from("membership_charges").delete().eq("associate_id", testAssociateIdRoute);
    await supabaseService.from("associate_memberships").delete().eq("associate_id", testAssociateIdRoute);
    await supabaseService.from("associates").delete().eq("id", testAssociateIdRoute);

    await supabaseService.from("associates").upsert({
      id: testAssociateIdRoute,
      full_name: "Asociado Route Test",
      email: "route-test@sovogin.org",
      document_number: "99998888",
      status: "active",
    });

    const { data: mbRoute } = await supabaseService.from("associate_memberships").insert({
      associate_id: testAssociateIdRoute,
      started_at: "2026-01-01",
      billing_anchor_date: "2026-01-01",
      billing_status: "active",
    }).select().single();

    await supabaseService.from("membership_charges").insert({
      associate_id: testAssociateIdRoute,
      membership_id: mbRoute?.id,
      original_amount: 500000,
      due_date: "2026-08-01",
      admin_status: "open",
      concept: "Cuota extraordinaria",
    });

    const routePayload = {
      associate_id: testAssociateIdRoute,
      expected_automation_type: "OVERDUE_30D",
      expected_reference_date: "2026-08-31",
      expected_channel: "email",
    };

    // Helper to inject authenticated client into utils/supabase/server via module cache without touching production code
    const setTestClientAndGetRoute = (client: SupabaseClient) => {
      const serverPath = require.resolve("@/utils/supabase/server");
      require(serverPath);
      require.cache[serverPath]!.exports = { createClient: async () => client };

      const routePath = require.resolve("@/app/api/admin/collections/automation/reserve/route");
      delete require.cache[routePath];
      const routeModule = require("@/app/api/admin/collections/automation/reserve/route");
      return routeModule.POST;
    };

    // 8a. Admin Request with Valid Origin -> HTTP 200 RESERVED
    const adminRouteHandler = setTestClientAndGetRoute(adminClient);

    const reqAdmin = new NextRequest("http://localhost:3000/api/admin/collections/automation/reserve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(routePayload),
    });

    const respAdmin1 = await adminRouteHandler(reqAdmin);
    assertEqual(respAdmin1.status, 200, "Admin route request returns HTTP 200");
    const jsonAdmin1 = await respAdmin1.json();
    assertEqual(jsonAdmin1.outcome, "RESERVED", "First route call outcome is RESERVED");

    // 8b. Duplicate Admin Request -> HTTP 200 ALREADY_RESERVED
    const reqAdminDup = new NextRequest("http://localhost:3000/api/admin/collections/automation/reserve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(routePayload),
    });

    const respAdmin2 = await adminRouteHandler(reqAdminDup);
    assertEqual(respAdmin2.status, 200, "Duplicate route request returns HTTP 200");
    const jsonAdmin2 = await respAdmin2.json();
    assertEqual(jsonAdmin2.outcome, "ALREADY_RESERVED", "Second route call outcome is ALREADY_RESERVED");

    // 8c. Associate Request -> HTTP 403 Forbidden
    const assocRouteHandler = setTestClientAndGetRoute(assocClient);

    const reqAssoc = new NextRequest("http://localhost:3000/api/admin/collections/automation/reserve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(routePayload),
    });

    const respAssoc = await assocRouteHandler(reqAssoc);
    assertEqual(respAssoc.status, 403, "Associate route request returns HTTP 403 Forbidden");

    // 8d. Missing Origin Header -> HTTP 403 Forbidden
    const reqNoOrigin = new NextRequest("http://localhost:3000/api/admin/collections/automation/reserve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(routePayload),
    });

    const respNoOrigin = await adminRouteHandler(reqNoOrigin);
    assertEqual(respNoOrigin.status, 403, "Missing Origin header returns HTTP 403 Forbidden");

    // Clean route test fixture
    await supabaseService.from("collection_notification_events").delete().eq("associate_id", testAssociateIdRoute);
    await supabaseService.from("membership_charges").delete().eq("associate_id", testAssociateIdRoute);
    await supabaseService.from("associate_memberships").delete().eq("associate_id", testAssociateIdRoute);
    await supabaseService.from("associates").delete().eq("id", testAssociateIdRoute);

    // Reset global test client
    (globalThis as any).__TEST_SUPABASE_CLIENT__ = undefined;

    console.log("==========================================================");
    console.log("SUCCESS: TODAS LAS PRUEBAS DE INTEGRACIÓN SUPABASE LOCAL + POSTGREST (1-8) PASARON CON ÉXITO!");
    console.log("==========================================================");
  } finally {
    // Teardown Test Fixtures
    console.log("--- Limpiando datos de prueba en la base de datos Supabase Local ---");
    await supabaseService.from("collection_notification_events").delete().eq("associate_id", testAssociateId);
    await supabaseService.from("collection_actions").delete().eq("associate_id", testAssociateId);
    await supabaseService.from("membership_charges").delete().eq("associate_id", testAssociateId);
    await supabaseService.from("associate_memberships").delete().eq("associate_id", testAssociateId);
    await supabaseService.from("associates").delete().eq("id", testAssociateId);
  }
}
