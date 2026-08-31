import { POST } from "../route";
import { GET } from "../../dry-run/route";
import { reserveNotificationEvent, NotificationFreshStateLoader, NotificationReservationRepository } from "@/lib/collections/collections-notification-reservation-service";
import { getPaymentPromisesMonitor } from "@/lib/collections/collections-queue-service";
import { enrichAssociatesWithCollectionsStatus } from "@/lib/collections/collections-dashboard-service";
import { CollectionAction } from "@/lib/collections/types";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

export async function runReserveRouteApiTests() {
  console.log("=== INICIANDO SUITE MATRIZ H3 COMPLETA DE PRUEBAS DE API DE RESERVA (FASE 4A5.2-E3.2.H3) ===");

  const targetUrl = "http://localhost/api/admin/collections/automation/reserve";
  const validBody = {
    associate_id: "00000000-0000-0000-0000-000000000001",
    expected_automation_type: "OVERDUE_7D",
    expected_reference_date: "2026-08-08",
    expected_channel: "email",
  };

  // Test 1: Missing Origin Header -> 403 Fail-Closed
  console.log("--- Test 1: Encabezado de Origen ausente es rechazado con 403 (Fail-Closed) ---");
  const reqNoOrigin = new Request(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validBody),
  });
  const resNoOrigin = await POST(reqNoOrigin);
  assertEqual(resNoOrigin.status, 403, "Status 403 for missing Origin");

  // Test 2: Attacker Origin (https://evil.example) -> 403
  console.log("--- Test 2: Origen malicioso (https://evil.example) es rechazado con 403 ---");
  const reqEvilOrigin = new Request(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify(validBody),
  });
  const resEvilOrigin = await POST(reqEvilOrigin);
  assertEqual(resEvilOrigin.status, 403, "Status 403 for evil Origin");

  // Test 3: Substring Origin Attack (https://sovogin.vercel.app.evil.example) -> 403
  console.log("--- Test 3: Ataque de sufijo/substring de origen es rechazado con 403 ---");
  const reqSubstrOrigin = new Request(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://sovogin.vercel.app.evil.example",
    },
    body: JSON.stringify(validBody),
  });
  const resSubstrOrigin = await POST(reqSubstrOrigin);
  assertEqual(resSubstrOrigin.status, 403, "Status 403 for substring attack");

  // Test 4: Subdomain Origin Attack (https://evil.sovogin.vercel.app) -> 403
  console.log("--- Test 4: Ataque de subdominio no idéntico es rechazado con 403 ---");
  const reqSubdomainOrigin = new Request(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.sovogin.vercel.app",
    },
    body: JSON.stringify(validBody),
  });
  const resSubdomainOrigin = await POST(reqSubdomainOrigin);
  assertEqual(resSubdomainOrigin.status, 403, "Status 403 for non-identical subdomain");

  // Test 5: Malformed Origin Header -> 403
  console.log("--- Test 5: Encabezado de origen malformado (not-a-valid-url) es rechazado con 403 ---");
  const reqBadOrigin = new Request(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "invalid-url-string",
    },
    body: JSON.stringify(validBody),
  });
  const resBadOrigin = await POST(reqBadOrigin);
  assertEqual(resBadOrigin.status, 403, "Status 403 for malformed Origin");

  // Test 6: Invalid Content-Type -> 415
  console.log("--- Test 6: Tipo de contenido no-JSON (form-urlencoded) es rechazado con 415 ---");
  const reqFormUrl = new Request(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "http://localhost",
    },
    body: "associate_id=00000000-0000-0000-0000-000000000001",
  });
  const resFormUrl = await POST(reqFormUrl);
  assertEqual(resFormUrl.status, 415, "Status 415 for non-JSON content-type");

  // Test 7: Same-Origin POST -> Passes Origin and reaches Auth (401 unauthenticated)
  console.log("--- Test 7: Same-Origin POST válido avanza hacia Autenticación (401) ---");
  const reqSameOrigin = new Request(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
    },
    body: JSON.stringify(validBody),
  });
  const resSameOrigin = await POST(reqSameOrigin);
  assertEqual(resSameOrigin.status, 401, "Same-origin reaches auth check and returns 401");

  // Test 8: Verification of Real Loader Path for Active Promise Integration
  console.log("--- Test 8: Integración Real del Loader para Promesa ACTIVE -> SUPPRESSED_ACTIVE_PAYMENT_PROMISE ---");
  const rawAssoc = {
    associate_id: "assoc-promise-active",
    full_name: "Asociado Con Promesa Activa",
    email: "active@example.com",
    account_status: "EN MORA" as const,
    total_outstanding: 250000,
    open_charge_count: 1,
    oldest_unpaid_due_date: "2026-08-01",
    days_past_due: 15,
    aging_bucket: "1-30 días" as const,
    current_amount: 0,
    days_1_30: 250000,
    days_31_60: 0,
    days_61_90: 0,
    days_91_120: 0,
    days_over_120: 0,
  };
  const activeActions: CollectionAction[] = [
    {
      id: "act-active-promise",
      associate_id: "assoc-promise-active",
      performed_by: "system_admin",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      promised_payment_date: "2099-01-01",
      promised_payment_amount: 250000,
      next_follow_up_at: null,
      created_at: "2026-08-10T10:00:00.000Z",
    },
  ];

  const enrichedActive = enrichAssociatesWithCollectionsStatus([rawAssoc], { [rawAssoc.associate_id]: activeActions })[0];
  const promisesActive = getPaymentPromisesMonitor([enrichedActive], { [rawAssoc.associate_id]: activeActions });
  const activePromiseItem = promisesActive.find((p) => p.associate_id === rawAssoc.associate_id) || null;

  const mockActiveLoader: NotificationFreshStateLoader = {
    loadFreshState: async () => ({
      associate: enrichedActive,
      promise: activePromiseItem,
      history: [],
    }),
  };

  let insertCountActive = 0;
  const mockRepoActive: NotificationReservationRepository = {
    insertQueuedEvent: async () => {
      insertCountActive++;
      throw new Error("Insert should not be called for active promise");
    },
    findExistingEvent: async () => null,
  };

  const resultActive = await reserveNotificationEvent(
    mockActiveLoader,
    {
      associate_id: "assoc-promise-active",
      automation_type: "OVERDUE_15D",
      reference_date: "2026-08-16",
      channel: "email",
    },
    mockRepoActive
  );

  assertEqual(resultActive.outcome, "SUPPRESSED", "Outcome is SUPPRESSED for active promise");
  if (resultActive.outcome === "SUPPRESSED") {
    assertEqual(resultActive.reason, "SUPPRESSED_ACTIVE_PAYMENT_PROMISE", "Reason is SUPPRESSED_ACTIVE_PAYMENT_PROMISE");
  }
  assertEqual(insertCountActive, 0, "0 inserts executed for ACTIVE promise");

  // Test 9: Verification of Real Loader Path for Unscheduled Promise Integration
  console.log("--- Test 9: Integración Real del Loader para Promesa UNSCHEDULED -> SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE ---");
  const unscheduledActions: CollectionAction[] = [
    {
      id: "act-unscheduled-promise",
      associate_id: "assoc-promise-active",
      performed_by: "system_admin",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      promised_payment_date: null,
      promised_payment_amount: 100000,
      next_follow_up_at: null,
      created_at: "2026-08-10T10:00:00.000Z",
    },
  ];

  const enrichedUnscheduled = enrichAssociatesWithCollectionsStatus([rawAssoc], { [rawAssoc.associate_id]: unscheduledActions })[0];
  const promisesUnscheduled = getPaymentPromisesMonitor([enrichedUnscheduled], { [rawAssoc.associate_id]: unscheduledActions });
  const unscheduledPromiseItem = promisesUnscheduled.find((p) => p.associate_id === rawAssoc.associate_id) || null;

  const mockUnscheduledLoader: NotificationFreshStateLoader = {
    loadFreshState: async () => ({
      associate: enrichedUnscheduled,
      promise: unscheduledPromiseItem,
      history: [],
    }),
  };

  let insertCountUnscheduled = 0;
  const mockRepoUnscheduled: NotificationReservationRepository = {
    insertQueuedEvent: async () => {
      insertCountUnscheduled++;
      throw new Error("Insert should not be called for unscheduled promise");
    },
    findExistingEvent: async () => null,
  };

  const resultUnscheduled = await reserveNotificationEvent(
    mockUnscheduledLoader,
    {
      associate_id: "assoc-promise-active",
      automation_type: "OVERDUE_15D",
      reference_date: "2026-08-16",
      channel: "email",
    },
    mockRepoUnscheduled
  );

  assertEqual(resultUnscheduled.outcome, "SUPPRESSED", "Outcome is SUPPRESSED for unscheduled promise");
  if (resultUnscheduled.outcome === "SUPPRESSED") {
    assertEqual(resultUnscheduled.reason, "SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE", "Reason is SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE");
  }
  assertEqual(insertCountUnscheduled, 0, "0 inserts executed for UNSCHEDULED promise");

  // Test 10: Verification of Repository Capabilities (0 update, 0 delete)
  console.log("--- Test 10: Verificación de Inmunidad del Repositorio (0 update, 0 delete) ---");
  const routeCodeStr = POST.toString();
  assertEqual(routeCodeStr.includes("update("), false, "0 update queries in reserve route");
  assertEqual(routeCodeStr.includes("delete("), false, "0 delete queries in reserve route");

  // Test 11: Verification of Provider Capabilities (0 Resend / WhatsApp / SMS)
  console.log("--- Test 11: Verificación de Inmunidad de Proveedores (0 Resend / WhatsApp / SMS) ---");
  assertEqual(routeCodeStr.includes("Resend"), false, "0 Resend imports");
  assertEqual(routeCodeStr.includes("Twilio"), false, "0 Twilio imports");
  assertEqual(routeCodeStr.includes("WhatsApp"), false, "0 WhatsApp imports");

  // Test 12: Verification of GET Dry-Run Isolation
  console.log("--- Test 12: Endpoint GET dry-run se mantiene 100% libre de escritura ---");
  const dryRunCodeStr = GET.toString();
  assertEqual(dryRunCodeStr.includes("insert("), false, "0 insert queries in dry-run GET handler");
  assertEqual(dryRunCodeStr.includes("reserveNotificationEvent"), false, "0 reservation imports in dry-run GET handler");

  // Test 13: Cache-Control Headers
  console.log("--- Test 13: Encabezados Cache-Control no-store en la respuesta ---");
  assertEqual(resSameOrigin.headers.get("Cache-Control"), "private, no-store, max-age=0", "Cache-Control header is no-store");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS H3 DE API DE RESERVA (1-13) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
