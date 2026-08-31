import {
  evaluateAutomationRulesForAssociate,
  generateIdempotencyKey,
  isValidEmailSyntax,
  runAutomationDryRun,
  NotificationEventRecord,
} from "../collections-automation-service";
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

export function runCollectionsAutomationTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS DE AUTOMATIZACIONES Y DRY-RUN (FASE 4A5.2-E1 + H2) ===");

  const evalNow = "2026-08-31T12:00:00.000Z";

  // Test 1: Idempotency Key formatting
  console.log("--- Test 1: Generación de clave de idempotencia única ---");
  const key = generateIdempotencyKey("assoc-1", "OVERDUE_7D", "2026-08-08", "email");
  assertEqual(key, "assoc-1:OVERDUE_7D:2026-08-08:email", "Formato de clave idempotencia");

  // Test 2: Valid Email Syntax
  console.log("--- Test 2: Sintaxis de correo válido ---");
  assertEqual(isValidEmailSyntax("socio@sovogin.org"), true, "Valid email");

  // Test 3: Invalid Email Syntax
  console.log("--- Test 3: Sintaxis de correo inválido es rechazada ---");
  assertEqual(isValidEmailSyntax("socio-invalido-sin-arroba"), false, "Invalid email");

  // Test 4: Null/Undefined Email Syntax
  console.log("--- Test 4: Correo nulo o no especificado es rechazado ---");
  assertEqual(isValidEmailSyntax(null), false, "Null email");

  // Test 5: AL DÍA Suppression Rule
  console.log("--- Test 5: Supresión absoluta para asociado AL DÍA ---");
  const assocAlDia = mockAssociate("a-1", "Pedro López", "pedro@sovogin.org", "AL DÍA", 0, 0);
  const eval1 = evaluateAutomationRulesForAssociate(assocAlDia, null, [], evalNow);
  assertEqual(eval1.eligible, false, "Not eligible");
  assertEqual(eval1.suppressionReason, "SUPPRESSED_ACCOUNT_AL_DIA", "Suppressed AL DIA");

  // Test 6: EN_DISPUTA Suppression Rule
  console.log("--- Test 6: Supresión absoluta para caso EN_DISPUTA ---");
  const assocDispute = mockAssociate("a-2", "Ana Gómez", "ana@sovogin.org", "EN MORA", 50000, 10, "EN_DISPUTA");
  const eval2 = evaluateAutomationRulesForAssociate(assocDispute, null, [], evalNow);
  assertEqual(eval2.eligible, false, "Not eligible");
  assertEqual(eval2.suppressionReason, "SUPPRESSED_COLLECTION_IN_DISPUTE", "Suppressed DISPUTE");

  // Test 7: ESCALADO Suppression Rule
  console.log("--- Test 7: Supresión absoluta para caso ESCALADO ---");
  const assocEscalated = mockAssociate("a-3", "Carlos Pérez", "carlos@sovogin.org", "EN MORA", 90000, 25, "ESCALADO");
  const eval3 = evaluateAutomationRulesForAssociate(assocEscalated, null, [], evalNow);
  assertEqual(eval3.eligible, false, "Not eligible");
  assertEqual(eval3.suppressionReason, "SUPPRESSED_COLLECTION_ESCALATED", "Suppressed ESCALATED");

  // Test 8: Invalid Contact Email Suppression
  console.log("--- Test 8: Supresión por correo electrónico inválido ---");
  const assocBadEmail = mockAssociate("a-4", "Jorge Ramos", "email-invalido", "EN MORA", 35000, 5);
  const eval4 = evaluateAutomationRulesForAssociate(assocBadEmail, null, [], evalNow);
  assertEqual(eval4.eligible, false, "Not eligible");
  assertEqual(eval4.suppressionReason, "SUPPRESSED_INVALID_CONTACT_EMAIL", "Suppressed BAD EMAIL");

  // Test 9: 24-Hour Frequency Cap Suppression
  console.log("--- Test 9: Supresión por Cap de Frecuencia de 24 Horas ---");
  const assocCap = mockAssociate("a-5", "Laura Ruiz", "laura@sovogin.org", "EN MORA", 35000, 5);
  const recentEvent: NotificationEventRecord = {
    associate_id: "a-5",
    channel: "email",
    automation_type: "OVERDUE_1D",
    reference_date: "2026-08-31",
    status: "SENT",
    scheduled_for: "2026-08-31T08:00:00-05:00",
  };
  const eval5 = evaluateAutomationRulesForAssociate(assocCap, null, [recentEvent], evalNow);
  assertEqual(eval5.eligible, false, "Not eligible");
  assertEqual(eval5.suppressionReason, "SUPPRESSED_24H_FREQUENCY_CAP", "Suppressed 24H CAP");

  // Test 10: Active Promise suppresses generic overdue reminder
  console.log("--- Test 10: Promesa activa futura suprime aviso genérico de mora ---");
  const assocActivePromise = mockAssociate("a-6", "Mario Silva", "mario@sovogin.org", "EN MORA", 40000, 10, "COMPROMISO_PAGO");
  const promiseActive = mockPromiseItem("a-6", "ACTIVE", "2026-09-15");
  const eval6 = evaluateAutomationRulesForAssociate(assocActivePromise, promiseActive, [], evalNow);
  assertEqual(eval6.eligible, false, "Not eligible");
  assertEqual(eval6.suppressionReason, "SUPPRESSED_ACTIVE_PAYMENT_PROMISE", "Suppressed ACTIVE PROMISE");

  // Test 11: PROMISE_1D trigger when payment promise is due tomorrow
  console.log("--- Test 11: Trigger PROMISE_1D cuando la promesa vence mañana ---");
  const promise1d = mockPromiseItem("a-6b", "ACTIVE", "2026-09-01");
  const assocPromise1d = mockAssociate("a-6b", "Mario Silva", "mario@sovogin.org", "EN MORA", 40000, 10, "COMPROMISO_PAGO");
  const eval6b = evaluateAutomationRulesForAssociate(assocPromise1d, promise1d, [], evalNow);
  assertEqual(eval6b.eligible, true, "Eligible PROMISE_1D");
  assertEqual(eval6b.triggerCode, "PROMISE_1D", "Trigger PROMISE_1D");
  assertEqual(eval6b.candidateEvent?.status, "QUEUED", "Candidate default status QUEUED");

  // Test 12: PROMISE_DUE trigger
  console.log("--- Test 12: Trigger PROMISE_DUE cuando la promesa vence hoy ---");
  const promiseToday = mockPromiseItem("a-7", "DUE_TODAY", "2026-08-31");
  const assocPromiseToday = mockAssociate("a-7", "Sofía Vargas", "sofia@sovogin.org", "EN MORA", 50000, 10, "COMPROMISO_PAGO");
  const eval7 = evaluateAutomationRulesForAssociate(assocPromiseToday, promiseToday, [], evalNow);
  assertEqual(eval7.eligible, true, "Eligible PROMISE_DUE");
  assertEqual(eval7.triggerCode, "PROMISE_DUE", "Trigger PROMISE_DUE");

  // Test 13: PROMISE_BROKEN trigger (Internal Admin Alert)
  console.log("--- Test 13: Trigger PROMISE_BROKEN (alerta interna) cuando promesa vence ---");
  const promiseOverdue = mockPromiseItem("a-8", "OVERDUE", "2026-08-20");
  const assocPromiseOverdue = mockAssociate("a-8", "Elena Morales", "elena@sovogin.org", "EN MORA", 50000, 15, "COMPROMISO_PAGO");
  const eval8 = evaluateAutomationRulesForAssociate(assocPromiseOverdue, promiseOverdue, [], evalNow);
  assertEqual(eval8.eligible, true, "Eligible PROMISE_BROKEN");
  assertEqual(eval8.triggerCode, "PROMISE_BROKEN", "Trigger PROMISE_BROKEN");
  assertEqual(eval8.channel, "internal_alert", "Channel internal_alert");

  // Test 14: OVERDUE_1D trigger (1-6 days past due) with milestone reference date
  console.log("--- Test 14: Trigger OVERDUE_1D con fecha de referencia del hito ---");
  const assocOverdue1d = mockAssociate("a-9", "Diego Mendoza", "diego@sovogin.org", "EN MORA", 35000, 3, "SIN_GESTION", "2026-08-28");
  const eval9 = evaluateAutomationRulesForAssociate(assocOverdue1d, null, [], evalNow);
  assertEqual(eval9.eligible, true, "Eligible OVERDUE_1D");
  assertEqual(eval9.triggerCode, "OVERDUE_1D", "Trigger OVERDUE_1D");
  assertEqual(eval9.candidateEvent?.reference_date, "2026-08-29", "Milestone ref date (due date + 1d)");

  // Test 15: OVERDUE_7D trigger (7-14 days past due) with milestone reference date
  console.log("--- Test 15: Trigger OVERDUE_7D con fecha de referencia del hito (2026-08-01 + 7d = 2026-08-08) ---");
  const assocOverdue7d = mockAssociate("a-10", "Beatriz Castro", "beatriz@sovogin.org", "EN MORA", 35000, 10, "SIN_GESTION", "2026-08-01");
  const eval10 = evaluateAutomationRulesForAssociate(assocOverdue7d, null, [], evalNow);
  assertEqual(eval10.eligible, true, "Eligible OVERDUE_7D");
  assertEqual(eval10.triggerCode, "OVERDUE_7D", "Trigger OVERDUE_7D");
  assertEqual(eval10.candidateEvent?.reference_date, "2026-08-08", "Milestone ref date (due date + 7d)");

  // Test 16: OVERDUE_15D trigger (15-29 days past due)
  console.log("--- Test 16: Trigger OVERDUE_15D (15 a 29 días mora) ---");
  const assocOverdue15d = mockAssociate("a-11", "Gabriel Ortiz", "gabriel@sovogin.org", "EN MORA", 35000, 20, "SIN_GESTION", "2026-08-01");
  const eval11 = evaluateAutomationRulesForAssociate(assocOverdue15d, null, [], evalNow);
  assertEqual(eval11.eligible, true, "Eligible OVERDUE_15D");
  assertEqual(eval11.triggerCode, "OVERDUE_15D", "Trigger OVERDUE_15D");
  assertEqual(eval11.candidateEvent?.reference_date, "2026-08-16", "Milestone ref date (due date + 15d)");

  // Test 17: OVERDUE_30D trigger (>=30 days past due)
  console.log("--- Test 17: Trigger OVERDUE_30D (>=30 días mora) ---");
  const assocOverdue30d = mockAssociate("a-12", "Héctor León", "hector@sovogin.org", "EN MORA", 35000, 45, "SIN_GESTION", "2026-07-01");
  const eval12 = evaluateAutomationRulesForAssociate(assocOverdue30d, null, [], evalNow);
  assertEqual(eval12.eligible, true, "Eligible OVERDUE_30D");
  assertEqual(eval12.triggerCode, "OVERDUE_30D", "Trigger OVERDUE_30D");
  assertEqual(eval12.candidateEvent?.reference_date, "2026-07-31", "Milestone ref date (due date + 30d)");

  // Test 18: PRE_DUE_5D trigger for PENDIENTE associate
  console.log("--- Test 18: Trigger PRE_DUE_5D para cuota que vence en 5 días ---");
  const assocPreDue5d = mockAssociate("a-13a", "Roberto Díaz", "roberto@sovogin.org", "PENDIENTE", 35000, 0, "SIN_GESTION", "2026-09-05");
  const eval13a = evaluateAutomationRulesForAssociate(assocPreDue5d, null, [], evalNow);
  assertEqual(eval13a.eligible, true, "Eligible PRE_DUE_5D");
  assertEqual(eval13a.triggerCode, "PRE_DUE_5D", "Trigger PRE_DUE_5D");

  // Test 19: PRE_DUE_1D trigger for PENDIENTE associate
  console.log("--- Test 19: Trigger PRE_DUE_1D para cuota que vence mañana ---");
  const assocPreDue1d = mockAssociate("a-13b", "Marta Soler", "marta@sovogin.org", "PENDIENTE", 35000, 0, "SIN_GESTION", "2026-09-01");
  const eval13b = evaluateAutomationRulesForAssociate(assocPreDue1d, null, [], evalNow);
  assertEqual(eval13b.eligible, true, "Eligible PRE_DUE_1D");
  assertEqual(eval13b.triggerCode, "PRE_DUE_1D", "Trigger PRE_DUE_1D");

  // Test 20: DUE_DATE trigger for PENDIENTE associate
  console.log("--- Test 20: Trigger DUE_DATE para asociado PENDIENTE con cuota vence hoy ---");
  const assocDueDate = mockAssociate("a-13c", "Isabel Gil", "isabel@sovogin.org", "PENDIENTE", 35000, 0, "SIN_GESTION", "2026-08-31");
  const eval13c = evaluateAutomationRulesForAssociate(assocDueDate, null, [], evalNow);
  assertEqual(eval13c.eligible, true, "Eligible DUE_DATE");
  assertEqual(eval13c.triggerCode, "DUE_DATE", "Trigger DUE_DATE");

  // Test 21: Fallback NO_MATCHING_AUTOMATION_TRIGGER
  console.log("--- Test 21: Fallback NO_MATCHING_AUTOMATION_TRIGGER ---");
  const assocNoMatch = mockAssociate("a-14", "Lucía Peña", "lucia@sovogin.org", "PENDIENTE", 35000, 0, "SIN_GESTION", "2026-09-25");
  const eval14 = evaluateAutomationRulesForAssociate(assocNoMatch, null, [], evalNow);
  assertEqual(eval14.eligible, false, "Not eligible");
  assertEqual(eval14.suppressionReason, "NO_MATCHING_AUTOMATION_TRIGGER", "No matching trigger");

  // Test 22: Dry-Run Simulation Cohort
  console.log("--- Test 22: Motor de Simulación Dry-Run (runAutomationDryRun) ---");
  const cohort = [assocAlDia, assocDispute, assocOverdue7d, assocPromiseToday];
  const promisesCohort = [promiseToday];
  const dryRunRes = runAutomationDryRun(cohort, promisesCohort, [], evalNow);

  // Test 23: Dry-Run cuenta de asociados escaneados ---
  console.log("--- Test 23: Dry-Run cuenta de asociados escaneados ---");
  assertEqual(dryRunRes.totalAssociatesScanned, 4, "Scanned count");

  // Test 24: Dry-Run Candidate Count
  console.log("--- Test 24: Dry-Run candidatos elegibles generados ---");
  assertEqual(dryRunRes.totalCandidates, 2, "Candidates count (assocOverdue7d + assocPromiseToday)");

  // Test 25: Dry-Run Suppressed Count
  console.log("--- Test 25: Dry-Run asociados suprimidos ---");
  assertEqual(dryRunRes.totalSuppressed, 2, "Suppressed count (assocAlDia + assocDispute)");

  // Test 26: Candidate Event Status DRY_RUN in simulation
  console.log("--- Test 26: Estado de eventos en Dry-Run es mapeado a DRY_RUN ---");
  assertEqual(dryRunRes.candidateEvents[0].status, "DRY_RUN", "Status DRY_RUN");

  // Test 27: Reference Date Bogota
  console.log("--- Test 27: Reference Date es la fecha de hoy en Bogotá ---");
  assertEqual(dryRunRes.evalDate, "2026-08-31", "Eval date Bogota");

  // Test 28: Scheduled for ISO Start of Today Bogota
  console.log("--- Test 28: Scheduled For es el inicio del día ISO Bogotá ---");
  assertEqual(dryRunRes.candidateEvents[0].scheduled_for, "2026-08-31T05:00:00.000Z", "Scheduled For start of today ISO");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS DE AUTOMATIZACIONES Y DRY-RUN (1-28) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
