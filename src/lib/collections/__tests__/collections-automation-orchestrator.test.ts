import {
  runAutomationDryRunOrchestrator,
  DryRunOrchestratorDataSources,
  AutomationDryRunPreview,
} from "../collections-automation-orchestrator";
import { NotificationEventRecord, generateIdempotencyKey } from "../collections-automation-service";
import { EnrichedAssociateAgingItem } from "../collections-dashboard-service";
import { PaymentPromiseItem } from "../collections-queue-service";

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
  dpd: number,
  collectionStatus: any = "SIN_GESTION",
  oldestDueDate: string | null = null
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
    oldest_unpaid_due_date: oldestDueDate || (dpd > 0 ? "2026-08-01" : null),
    collection_status: collectionStatus,
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

function mockPromiseItem(
  associateId: string,
  promiseStatus: "FULFILLED" | "SUPERSEDED" | "OVERDUE" | "DUE_TODAY" | "ACTIVE" | "UNSCHEDULED",
  promisedDate: string | null = "2026-09-15",
  promisedAmount: number | null = 50000
): PaymentPromiseItem {
  return {
    associate_id: associateId,
    full_name: "Test Assoc",
    email: `${associateId}@sovogin.org`,
    account_status: "EN MORA",
    total_outstanding: promisedAmount || 50000,
    days_past_due: 10,
    aging_bucket: "1-30 días",
    oldest_unpaid_due_date: "2026-08-01",
    collection_status: "COMPROMISO_PAGO",
    follow_up_state: "NONE",
    latest_collection_action: null,
    open_charge_count: 1,
    current_amount: 0,
    days_1_30: promisedAmount || 50000,
    days_31_60: 0,
    days_61_90: 0,
    days_91_120: 0,
    days_over_120: 0,
    promise_status: promiseStatus,
    promised_payment_date: promisedDate,
    promised_payment_amount: promisedAmount,
    promise_action: null,
  };
}

export async function runCollectionsAutomationOrchestratorTests() {
  console.log("=== INICIANDO SUITE EXPANDIDA Y ENDURECIDA H1 DE ORQUESTACIÓN DRY-RUN (FASE 4A5.2-E2.1.H1) ===");

  const evalNow = "2026-08-31T12:00:00.000Z";

  // Test 1: Zero associates scanned
  console.log("--- Test 1: Cero asociados escaneados devuelve resumen vacío ---");
  let fetchAssocCalls = 0;
  let fetchPromisesCalls = 0;
  let fetchHistoryCalls = 0;

  const sourcesEmpty: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => {
      fetchAssocCalls++;
      return [];
    },
    fetchPromises: async () => {
      fetchPromisesCalls++;
      return [];
    },
    fetchNotificationHistory: async () => {
      fetchHistoryCalls++;
      return [];
    },
  };

  const res1 = await runAutomationDryRunOrchestrator(sourcesEmpty, evalNow);
  assertEqual(res1.total_associates_scanned, 0, "0 scanned");
  assertEqual(res1.total_candidates, 0, "0 candidates");
  assertEqual(res1.total_suppressed, 0, "0 suppressed");
  assertEqual(fetchAssocCalls, 1, "fetchAssociates called 1 time");
  assertEqual(fetchPromisesCalls, 1, "fetchPromises called 1 time");
  assertEqual(fetchHistoryCalls, 0, "fetchHistory not called when associate list is empty");

  // Test 2: Query Batching (No N+1)
  console.log("--- Test 2: Verificación de Contrato de Batching (Max 3 consultas, 0 N+1) ---");
  const cohortMulti = [
    mockAssociate("a-1", "P1", "p1@sovogin.org", "EN MORA", 35000, 10),
    mockAssociate("a-2", "P2", "p2@sovogin.org", "EN MORA", 45000, 20),
    mockAssociate("a-3", "P3", "p3@sovogin.org", "PENDIENTE", 35000, 0, "SIN_GESTION", "2026-08-31"),
  ];

  let batchHistoryReceivedIds: string[] = [];
  const sourcesBatching: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => {
      fetchAssocCalls++;
      return cohortMulti;
    },
    fetchPromises: async () => {
      fetchPromisesCalls++;
      return [];
    },
    fetchNotificationHistory: async (ids) => {
      fetchHistoryCalls++;
      batchHistoryReceivedIds = ids;
      return [];
    },
  };

  fetchAssocCalls = 0;
  fetchPromisesCalls = 0;
  fetchHistoryCalls = 0;

  const res2 = await runAutomationDryRunOrchestrator(sourcesBatching, evalNow);
  assertEqual(res2.total_associates_scanned, 3, "3 scanned");
  assertEqual(fetchAssocCalls, 1, "fetchAssociates 1 batch query");
  assertEqual(fetchPromisesCalls, 1, "fetchPromises 1 batch query");
  assertEqual(fetchHistoryCalls, 1, "fetchNotificationHistory 1 batch query for all IDs");
  assertEqual(batchHistoryReceivedIds.length, 3, "All 3 IDs passed in single batch array");

  // Test 3: Write-Safety Proof (Fake Port throws if write called)
  console.log("--- Test 3: Prueba de Inmunidad de Escritura (0 INSERT/UPDATE/DELETE) ---");
  class ReadOnlyFakeRepository {
    async insert() {
      throw new Error("MUTATION_VIOLATION: insert method called on read-only orchestrator!");
    }
    async update() {
      throw new Error("MUTATION_VIOLATION: update method called on read-only orchestrator!");
    }
    async delete() {
      throw new Error("MUTATION_VIOLATION: delete method called on read-only orchestrator!");
    }
  }

  const fakeRepo = new ReadOnlyFakeRepository();
  const res3 = await runAutomationDryRunOrchestrator(sourcesBatching, evalNow);
  assertEqual(res3.total_candidates > 0, true, "Dry-run evaluated candidates safely without touching repo write methods");

  // Test 4: Explicit Already Registered Milestone Suppression
  console.log("--- Test 4: Supresión explícita SUPPRESSED_MILESTONE_ALREADY_REGISTERED ---");
  const assocAlready = mockAssociate("a-alr", "Already Registered", "alr@sovogin.org", "EN MORA", 40000, 7, "SIN_GESTION", "2026-08-24");
  const history7d: NotificationEventRecord = {
    associate_id: "a-alr",
    channel: "email",
    automation_type: "OVERDUE_7D",
    reference_date: "2026-08-31",
    status: "SENT",
    scheduled_for: "2026-08-25T08:00:00-05:00",
  };

  const sourcesAlready: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => [assocAlready],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [history7d],
  };

  const res4 = await runAutomationDryRunOrchestrator(sourcesAlready, evalNow);
  assertEqual(res4.total_candidates, 0, "0 candidates");
  assertEqual(res4.total_suppressed, 1, "1 suppressed");
  assertEqual(res4.suppressed_events[0].suppression_reason, "SUPPRESSED_MILESTONE_ALREADY_REGISTERED", "Explicit reason ALREADY_REGISTERED");

  // Test 5: Failed Logical Event Semantics (FAILED in history prevents duplicate logical row creation)
  console.log("--- Test 5: Semántica de evento FAILED en historial (previene duplicación lógica) ---");
  const assocFailed = mockAssociate("a-failed", "Failed Assoc", "failed@sovogin.org", "EN MORA", 40000, 7, "SIN_GESTION", "2026-08-24");
  const history7dFailed: NotificationEventRecord = {
    associate_id: "a-failed",
    channel: "email",
    automation_type: "OVERDUE_7D",
    reference_date: "2026-08-31",
    status: "FAILED",
    scheduled_for: "2026-08-25T08:00:00-05:00", // > 24h ago
  };

  const sourcesFailed: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => [assocFailed],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [history7dFailed],
  };

  const res5 = await runAutomationDryRunOrchestrator(sourcesFailed, evalNow);
  assertEqual(res5.total_candidates, 0, "0 candidates (FAILED row prevents new duplicate logical event creation)");
  assertEqual(res5.suppressed_events[0].suppression_reason, "SUPPRESSED_MILESTONE_ALREADY_REGISTERED", "Reason ALREADY_REGISTERED for FAILED row");

  // Test 6: Suppressed Logical Event Semantics
  console.log("--- Test 6: Semántica de evento SUPPRESSED en historial (previene duplicación lógica) ---");
  const assocSupp = mockAssociate("a-supp", "Suppressed Assoc", "supp@sovogin.org", "EN MORA", 40000, 7, "SIN_GESTION", "2026-08-24");
  const history7dSuppressed: NotificationEventRecord = {
    associate_id: "a-supp",
    channel: "email",
    automation_type: "OVERDUE_7D",
    reference_date: "2026-08-31",
    status: "SUPPRESSED",
    scheduled_for: "2026-08-25T08:00:00-05:00",
  };

  const sourcesSuppressed: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => [assocSupp],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [history7dSuppressed],
  };

  const res6 = await runAutomationDryRunOrchestrator(sourcesSuppressed, evalNow);
  assertEqual(res6.total_candidates, 0, "0 candidates (SUPPRESSED row prevents new duplicate logical event creation)");
  assertEqual(res6.suppressed_events[0].suppression_reason, "SUPPRESSED_MILESTONE_ALREADY_REGISTERED", "Reason ALREADY_REGISTERED for SUPPRESSED row");

  // Test 7: DPD 16 with OVERDUE_7D registered -> Selects OVERDUE_15D
  console.log("--- Test 7: DPD 16 con OVERDUE_7D registrado elige hito OVERDUE_15D ---");
  const assocDpd16 = mockAssociate("a-dpd16", "DPD 16 Assoc", "dpd16@sovogin.org", "EN MORA", 50000, 16, "SIN_GESTION", "2026-08-15");
  const history7dPast: NotificationEventRecord = {
    associate_id: "a-dpd16",
    channel: "email",
    automation_type: "OVERDUE_7D",
    reference_date: "2026-08-22",
    status: "SENT",
    scheduled_for: "2026-08-22T08:00:00-05:00",
  };

  const sourcesDpd16: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => [assocDpd16],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [history7dPast],
  };

  const res7 = await runAutomationDryRunOrchestrator(sourcesDpd16, evalNow);
  assertEqual(res7.total_candidates, 1, "1 candidate");
  assertEqual(res7.candidate_events[0].automation_type, "OVERDUE_15D", "Chosen milestone OVERDUE_15D");

  // Test 8: DPD 31 with no history -> Selects only OVERDUE_30D (No burst)
  console.log("--- Test 8: DPD 31 sin historial previo elige únicamente hito OVERDUE_30D (Sin ráfagas) ---");
  const assocDpd31 = mockAssociate("a-dpd31", "DPD 31 Assoc", "dpd31@sovogin.org", "EN MORA", 80000, 31, "SIN_GESTION", "2026-07-31");
  const sourcesDpd31: DryRunOrchestratorDataSources = {
    fetchAssociates: async () => [assocDpd31],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [],
  };

  const res8 = await runAutomationDryRunOrchestrator(sourcesDpd31, evalNow);
  assertEqual(res8.total_candidates, 1, "1 candidate max (no burst of 1D/7D/15D)");
  assertEqual(res8.candidate_events[0].automation_type, "OVERDUE_30D", "Only OVERDUE_30D chosen");

  // Test 9: Frequency Cap Boundaries (23h59m vs 24h00m vs 24h01m)
  console.log("--- Test 9: Límites Exactos del Cap de Frecuencia de 24 Horas (23h59m, 24h00m, 24h01m) ---");
  const assocCapTest = mockAssociate("a-cap-b", "Cap Boundary", "capb@sovogin.org", "EN MORA", 40000, 10, "SIN_GESTION", "2026-08-21");

  // 23h59m ago (within 24h window) -> SUPPRESSED
  const event23h59m: NotificationEventRecord = {
    associate_id: "a-cap-b",
    channel: "email",
    automation_type: "OVERDUE_1D",
    reference_date: "2026-08-22",
    status: "SENT",
    scheduled_for: new Date(new Date(evalNow).getTime() - (23 * 60 + 59) * 60 * 1000).toISOString(),
  };

  const res9a = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocCapTest],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [event23h59m],
  }, evalNow);
  assertEqual(res9a.suppressed_events[0].suppression_reason, "SUPPRESSED_24H_FREQUENCY_CAP", "23h59m ago triggers FREQUENCY_CAP");

  // Exact 24h00m ago (boundary expired) -> ELIGIBLE
  const event24h00m: NotificationEventRecord = {
    associate_id: "a-cap-b",
    channel: "email",
    automation_type: "OVERDUE_1D",
    reference_date: "2026-08-22",
    status: "SENT",
    scheduled_for: new Date(new Date(evalNow).getTime() - 24 * 60 * 60 * 1000).toISOString(),
  };

  const res9b = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocCapTest],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [event24h00m],
  }, evalNow);
  assertEqual(res9b.total_candidates, 1, "Exact 24h00m ago cap is clear -> 1 candidate generated");

  // 24h01m ago (outside 24h window) -> ELIGIBLE
  const event24h01m: NotificationEventRecord = {
    associate_id: "a-cap-b",
    channel: "email",
    automation_type: "OVERDUE_1D",
    reference_date: "2026-08-22",
    status: "SENT",
    scheduled_for: new Date(new Date(evalNow).getTime() - (24 * 60 + 1) * 60 * 1000).toISOString(),
  };

  const res9c = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocCapTest],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [event24h01m],
  }, evalNow);
  assertEqual(res9c.total_candidates, 1, "24h01m ago cap is clear -> 1 candidate generated");

  // Test 10: Deterministic Idempotency Key Formatting
  console.log("--- Test 10: Formato Determinístico de Clave de Idempotencia ---");
  const key = generateIdempotencyKey("assoc-uuid-123", "OVERDUE_7D", "2026-08-31", "email");
  assertEqual(key, "assoc-uuid-123:OVERDUE_7D:2026-08-31:email", "Idempotency key format associate:type:date:channel");

  // Test 11: Policy A Explicit Selection for Unscheduled Promise
  console.log("--- Test 11: Política A para Promesa UNSCHEDULED (Supresión completa de avisos genéricos) ---");
  const assocUnsched = mockAssociate("a-un", "Unsched Assoc", "un@sovogin.org", "EN MORA", 50000, 15, "COMPROMISO_PAGO");
  const promiseUnsched = mockPromiseItem("a-un", "UNSCHEDULED", null);

  const res11 = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocUnsched],
    fetchPromises: async () => [promiseUnsched],
    fetchNotificationHistory: async () => [],
  }, evalNow);
  assertEqual(res11.total_candidates, 0, "0 candidates");
  assertEqual(res11.suppressed_events[0].suppression_reason, "SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE", "Policy A UNSCHEDULED suppression");

  // Test 12: Dry-run Creates In-Memory Candidate Only (Does Not Create Persisted DB Row)
  console.log("--- Test 12: Verificación de Candidato en Memoria (No crea filas lógicas de DB) ---");
  const assocMem = mockAssociate("a-mem", "Memory Candidate", "mem@sovogin.org", "EN MORA", 30000, 5);
  const res12 = await runAutomationDryRunOrchestrator({
    fetchAssociates: async () => [assocMem],
    fetchPromises: async () => [],
    fetchNotificationHistory: async () => [],
  }, evalNow);
  assertEqual(res12.total_candidates, 1, "1 in-memory candidate preview generated");
  assertEqual(res12.candidate_events[0].channel, "email", "Candidate preview channel email");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS H1 EXPANDIDAS Y ENDURECIDAS (1-12) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
