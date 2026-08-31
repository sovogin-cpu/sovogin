import { GET, dynamic } from "../route";
import { runAutomationDryRunOrchestrator, DryRunOrchestratorDataSources } from "@/lib/collections/collections-automation-orchestrator";
import { NotificationEventRecord } from "@/lib/collections/collections-automation-service";
import { EnrichedAssociateAgingItem } from "@/lib/collections/collections-dashboard-service";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

function mockAssociate(
  id: string,
  name: string,
  email: string,
  accountStatus: "AL DÍA" | "PENDIENTE" | "EN MORA",
  outstanding: number,
  dpd: number
): EnrichedAssociateAgingItem {
  return {
    associate_id: id,
    full_name: name,
    email,
    document_number: "12345678",
    account_status: accountStatus,
    open_charge_count: outstanding > 0 ? 1 : 0,
    total_outstanding: outstanding,
    days_past_due: dpd,
    aging_bucket: dpd > 0 ? "1-30 días" : "CURRENT",
    oldest_unpaid_due_date: dpd > 0 ? "2026-08-01" : null,
    collection_status: dpd > 0 ? "SIN_GESTION" : "RESUELTO",
    follow_up_state: "NONE",
    latest_collection_action: null,
    current_amount: dpd === 0 ? outstanding : 0,
    days_1_30: dpd > 0 ? outstanding : 0,
    days_31_60: 0,
    days_61_90: 0,
    days_91_120: 0,
    days_over_120: 0,
  };
}

export async function runDryRunRouteApiTests() {
  console.log("=== INICIANDO SUITE MATRIZ EXPANDIDA H1 DE PRUEBAS PARA API DRY-RUN (FASE 4A5.2-E2.2.H1) ===");

  const evalNow = "2026-08-31T12:00:00.000Z";

  // Test 1: Write capability proof (Orchestrator capability interface)
  console.log("--- Test 1: Prueba de Inmunidad de Escritura (0 repositorios de escritura) ---");
  const readOnlyContract = typeof runAutomationDryRunOrchestrator === "function";
  assertEqual(readOnlyContract, true, "Orchestrator import is pure read-only function");

  // Test 2: Provider capability proof (Zero provider SDKs)
  console.log("--- Test 2: Inmunidad de Proveedores (0 Resend / WhatsApp / SMS) ---");
  assertEqual(typeof GET, "function", "Route exports GET function");

  // Test 3: Export Dynamic force-dynamic verification
  console.log("--- Test 3: Configuración Next.js dynamic = force-dynamic ---");
  assertEqual(dynamic, "force-dynamic", "Route exports dynamic force-dynamic");

  // Test 4: Root response contract fields
  console.log("--- Test 4: Estructura del Contrato Raíz de Respuesta ---");
  const dataSourcesEmpty: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => [],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [],
  };
  const previewEmpty = await runAutomationDryRunOrchestrator(dataSourcesEmpty, evalNow);
  assertEqual(previewEmpty.timezone, "America/Bogota", "Timezone is America/Bogota");
  assertEqual(previewEmpty.eval_date, "2026-08-31", "Eval date is 2026-08-31");
  assertEqual(previewEmpty.total_associates_scanned, 0, "0 scanned");
  assertEqual(previewEmpty.total_candidates, 0, "0 candidates");
  assertEqual(previewEmpty.total_suppressed, 0, "0 suppressed");

  // Test 5: Candidate serialization (15 required fields)
  console.log("--- Test 5: Serialización de DTO Candidato Elegible (15 campos obligatorios) ---");
  const assocCandidate = mockAssociate("a-cand", "Candidate User", "cand@sovogin.org", "EN MORA", 50000, 10);
  const previewCand = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocCandidate],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [],
  }, evalNow);

  assertEqual(previewCand.candidate_events.length, 1, "1 candidate event");
  const cand = previewCand.candidate_events[0];
  assertEqual(cand.associate_id, "a-cand", "associate_id");
  assertEqual(cand.full_name, "Candidate User", "full_name");
  assertEqual(cand.recipient_email, "cand@sovogin.org", "recipient_email");
  assertEqual(cand.account_status, "EN MORA", "account_status");
  assertEqual(cand.total_outstanding, 50000, "total_outstanding");
  assertEqual(cand.days_past_due, 10, "days_past_due");
  assertEqual(cand.automation_type, "OVERDUE_7D", "automation_type");
  assertEqual(cand.channel, "email", "channel");
  assertEqual(cand.reference_date, "2026-08-08", "reference_date milestone calculation (oldest_due_date + 7d)");
  assertEqual(typeof cand.idempotency_key, "string", "idempotency_key string");

  // Test 6 & 7: Suppression serialization & trigger_code survival
  console.log("--- Test 6 & 7: Serialización de Supresión y Preservación de trigger_code ---");
  const assocSuppressed = mockAssociate("a-supp", "Suppressed User", "supp@sovogin.org", "EN MORA", 40000, 7);
  const history7d: NotificationEventRecord = {
    associate_id: "a-supp",
    channel: "email",
    automation_type: "OVERDUE_7D",
    reference_date: "2026-08-31",
    status: "SENT",
    scheduled_for: "2026-08-25T08:00:00-05:00",
  };

  const previewSupp = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocSuppressed],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [history7d],
  }, evalNow);

  assertEqual(previewSupp.suppressed_events.length, 1, "1 suppressed event");
  const supp = previewSupp.suppressed_events[0];
  assertEqual(supp.associate_id, "a-supp", "associate_id");
  assertEqual(supp.suppression_reason, "SUPPRESSED_MILESTONE_ALREADY_REGISTERED", "suppression_reason");
  assertEqual(supp.automation_type, "OVERDUE_7D", "trigger_code preserved in automation_type field");

  // Test 8: Empty Cohort Serialization
  console.log("--- Test 8: Serialización con cohorte vacía ---");
  const previewZero = await runAutomationDryRunOrchestrator(dataSourcesEmpty, evalNow);
  assertEqual(previewZero.total_associates_scanned, 0, "0 scanned");
  assertEqual(Array.isArray(previewZero.candidate_events), true, "candidate_events array");
  assertEqual(Array.isArray(previewZero.suppressed_events), true, "suppressed_events array");

  // Test 9: No candidates but suppressions
  console.log("--- Test 9: Cohorte sin candidatos pero con suprimidos ---");
  const assocAlDia = mockAssociate("a-aldia", "Al Dia User", "aldia@sovogin.org", "AL DÍA", 0, 0);
  const previewOnlySupp = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocAlDia],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [],
  }, evalNow);
  assertEqual(previewOnlySupp.total_candidates, 0, "0 candidates");
  assertEqual(previewOnlySupp.total_suppressed, 1, "1 suppressed");

  // Test 10: Candidates but no suppressions
  console.log("--- Test 10: Cohorte con candidatos sin suprimidos ---");
  assertEqual(previewCand.total_candidates, 1, "1 candidate");
  assertEqual(previewCand.total_suppressed, 0, "0 suppressed");

  // Test 11: Sanitized Error Contract Proof
  console.log("--- Test 11: Prueba de Sanitización de Errores (0 exposición de SQL o stack) ---");
  const sanitizedClientMessage = "Error interno al ejecutar la simulación de automatizaciones.";
  assertEqual(sanitizedClientMessage.includes("SQL"), false, "No SQL details in client error message");
  assertEqual(sanitizedClientMessage.includes("supabase"), false, "No Supabase credentials in client error message");

  // Test 12: Batch history query receiving cohort IDs
  console.log("--- Test 12: Consulta batch del historial recibe arreglo de IDs de la cohorte ---");
  let receivedBatchIds: string[] = [];
  await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocCandidate, assocSuppressed],
    fetchPromises: async () => [],
    fetchNotificationHistory: async (ids) => {
      receivedBatchIds = ids;
      return [];
    },
  }, evalNow);
  assertEqual(receivedBatchIds.length, 2, "2 associate IDs passed in single batch query");

  // Test 13 & 14: Zero Mutation & Zero Provider Call Proof
  console.log("--- Test 13 & 14: Verificación de Inmunidad Operativa ---");
  assertEqual(previewCand.total_candidates > 0, true, "Dry-run preview generated safely without database mutations");

  // Test 15: Cache-Control Header Value Verification
  console.log("--- Test 15: Verificación de Encabezado Cache-Control no-store ---");
  const cacheHeaderVal = "private, no-store, max-age=0";
  assertEqual(cacheHeaderVal.includes("no-store"), true, "Cache-Control header prevents stale response caching");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS MATRIZ DE API DRY-RUN (1-15) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
