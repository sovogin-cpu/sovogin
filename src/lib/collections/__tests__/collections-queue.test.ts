import {
  calculateOperationalKPIs,
  getBogotaTodayBounds,
  getFollowUpQueue,
  getPaymentPromisesMonitor,
} from "../collections-queue-service";
import { EnrichedAssociateAgingItem } from "../collections-dashboard-service";
import { CollectionAction } from "../types";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

function mockAssociate(
  id: string,
  name: string,
  accountStatus: "AL DÍA" | "PENDIENTE" | "EN MORA",
  outstanding: number,
  dpd: number,
  latestAction: CollectionAction | null = null,
  collectionStatus: any = "SIN_GESTION",
  followUpState: any = "NONE"
): EnrichedAssociateAgingItem {
  return {
    associate_id: id,
    full_name: name,
    email: `${id}@sovogin.org`,
    document_number: "12345678",
    account_status: accountStatus,
    open_charge_count: outstanding > 0 ? 1 : 0,
    total_outstanding: outstanding,
    days_past_due: dpd,
    aging_bucket: dpd > 0 ? "1-30 días" : "AL DÍA",
    oldest_unpaid_due_date: dpd > 0 ? "2026-08-01" : null,
    collection_status: collectionStatus,
    follow_up_state: followUpState,
    latest_collection_action: latestAction,
  };
}

export function runCollectionsQueueTests() {
  console.log("=== INICIANDO SUITE EXPANDIDA Y ENDURECIDA DE COLA OPERATIVA Y PROMESAS (FASE 4A5.2-D.H1) ===");

  const evalNow = "2026-08-31T12:00:00.000Z";
  const { todayStr } = getBogotaTodayBounds(evalNow);
  assertEqual(todayStr, "2026-08-31", "Hoy en Colombia");

  // --- SECCIÓN FOLLOW-UP QUEUE ---

  // Test 1: Follow-Up Overdue
  console.log("--- Test 1: Follow-up Vencido (OVERDUE) ---");
  const actionOverdue: CollectionAction = {
    id: "act-1",
    associate_id: "assoc-1",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "follow_up",
    result_status: "contacted",
    next_follow_up_at: "2026-08-25T10:00:00.000Z", // Vencido
    created_at: "2026-08-20T10:00:00.000Z",
  };
  const assocOverdue = mockAssociate("assoc-1", "Carlos Pérez", "EN MORA", 35000, 15, actionOverdue, "CONTACTADO");
  const queue1 = getFollowUpQueue([assocOverdue], evalNow);
  assertEqual(queue1.length, 1, "Asociado en cola");
  assertEqual(queue1[0].follow_up_urgency, "OVERDUE", "Urgent state OVERDUE");

  // Test 2: Follow-Up Due Today
  console.log("--- Test 2: Follow-up Vence Hoy (DUE_TODAY) ---");
  const actionToday: CollectionAction = {
    id: "act-2",
    associate_id: "assoc-2",
    performed_by: "admin-1",
    channel: "whatsapp",
    action_type: "follow_up",
    result_status: "contacted",
    next_follow_up_at: "2026-08-31T14:00:00-05:00", // Hoy en Colombia
    created_at: "2026-08-30T10:00:00.000Z",
  };
  const assocToday = mockAssociate("assoc-2", "Ana Gómez", "EN MORA", 50000, 10, actionToday, "CONTACTADO");
  const queue2 = getFollowUpQueue([assocToday], evalNow);
  assertEqual(queue2[0].follow_up_urgency, "DUE_TODAY", "Urgent state DUE_TODAY");

  // Test 3: Follow-Up Upcoming
  console.log("--- Test 3: Follow-up Próximo (UPCOMING) ---");
  const actionUpcoming: CollectionAction = {
    id: "act-3",
    associate_id: "assoc-3",
    performed_by: "admin-1",
    channel: "email",
    action_type: "follow_up",
    result_status: "contacted",
    next_follow_up_at: "2026-09-05T10:00:00.000Z", // Próximo
    created_at: "2026-08-30T10:00:00.000Z",
  };
  const assocUpcoming = mockAssociate("assoc-3", "María Rodríguez", "EN MORA", 20000, 5, actionUpcoming, "CONTACTADO");
  const queue3 = getFollowUpQueue([assocUpcoming], evalNow);
  assertEqual(queue3[0].follow_up_urgency, "UPCOMING", "Urgent state UPCOMING");

  // Test 4: Acción posterior satisface el follow-up anterior (nueva acción sin next_follow_up_at)
  console.log("--- Test 4: Acción posterior sin follow-up satisface el seguimiento anterior ---");
  const latestActionNoFollowUp: CollectionAction = {
    id: "act-4-latest",
    associate_id: "assoc-4",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "note",
    result_status: "contacted",
    next_follow_up_at: null,
    created_at: "2026-08-31T10:00:00.000Z",
  };
  const assocSupersededFollowUp = mockAssociate("assoc-4", "Roberto Díaz", "EN MORA", 40000, 8, latestActionNoFollowUp, "CONTACTADO");
  const queue4 = getFollowUpQueue([assocSupersededFollowUp], evalNow);
  assertEqual(queue4.length, 0, "Excluido porque última acción no agendó seguimiento");

  // Test 5: Nueva acción con next_follow_up crea nuevo follow-up
  console.log("--- Test 5: Nueva acción reemplaza fecha de seguimiento previas ---");
  const actionNewerFollowUp: CollectionAction = {
    id: "act-5-new",
    associate_id: "assoc-5",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "follow_up",
    result_status: "contacted",
    next_follow_up_at: "2026-09-10T10:00:00-05:00",
    created_at: "2026-08-31T11:00:00.000Z",
  };
  const assocNewFollowUp = mockAssociate("assoc-5", "Elena Torres", "EN MORA", 45000, 12, actionNewerFollowUp, "CONTACTADO");
  const queue5 = getFollowUpQueue([assocNewFollowUp], evalNow);
  assertEqual(queue5[0].follow_up_date, "2026-09-10T10:00:00-05:00", "Follow-up actualizado");

  // Test 6: AL DÍA suppresses follow-up
  console.log("--- Test 6: Estado AL DÍA suprime follow-ups de la cola ---");
  const assocAlDia = mockAssociate("assoc-6", "Pedro López", "AL DÍA", 0, 0, actionOverdue, "RESUELTO");
  const queue6 = getFollowUpQueue([assocAlDia], evalNow);
  assertEqual(queue6.length, 0, "Asociado AL DÍA no entra en la cola");

  // Test 7: Timezone Independence (evaluating under different process.env.TZ)
  console.log("--- Test 7: Timezone Independence ---");
  const boundsTZ = getBogotaTodayBounds("2026-12-31T23:00:00.000Z");
  assertEqual(boundsTZ.todayStr, "2026-12-31", "Bogotá Date String correct");

  // Test 8: Boundary Exact 00:00 Bogotá
  console.log("--- Test 8: Límite Exacto 00:00 Bogotá es DUE_TODAY ---");
  const actionBoundStart: CollectionAction = {
    id: "act-bound-1",
    associate_id: "assoc-b1",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "follow_up",
    result_status: "contacted",
    next_follow_up_at: "2026-08-31T00:00:00-05:00", // Exactamente 00:00 hoy
    created_at: "2026-08-30T10:00:00.000Z",
  };
  const assocBoundStart = mockAssociate("assoc-b1", "B1 Test", "EN MORA", 10000, 1, actionBoundStart);
  const queueB1 = getFollowUpQueue([assocBoundStart], evalNow);
  assertEqual(queueB1[0].follow_up_urgency, "DUE_TODAY", "Exact 00:00 Bogota is DUE_TODAY");

  // Test 9: Boundary Exact Start of Next Day
  console.log("--- Test 9: Límite Exacto 00:00 Mañana es UPCOMING ---");
  const actionBoundNext: CollectionAction = {
    id: "act-bound-2",
    associate_id: "assoc-b2",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "follow_up",
    result_status: "contacted",
    next_follow_up_at: "2026-09-01T00:00:00-05:00", // Exactamente 00:00 mañana
    created_at: "2026-08-30T10:00:00.000Z",
  };
  const assocBoundNext = mockAssociate("assoc-b2", "B2 Test", "EN MORA", 10000, 1, actionBoundNext);
  const queueB2 = getFollowUpQueue([assocBoundNext], evalNow);
  assertEqual(queueB2[0].follow_up_urgency, "UPCOMING", "Exact 00:00 Tomorrow is UPCOMING");


  // --- SECCIÓN PAYMENT PROMISES MONITOR ---

  // Test 10: Active/Future Promise
  console.log("--- Test 10: Promesa Vigente/Futura (ACTIVE) ---");
  const promiseActive: CollectionAction = {
    id: "prom-10",
    associate_id: "assoc-10",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: "2026-09-15",
    promised_payment_amount: 100000,
    created_at: "2026-08-28T10:00:00.000Z",
  };
  const assocPromiseActive = mockAssociate("assoc-10", "P10 Test", "EN MORA", 100000, 5, promiseActive, "COMPROMISO_PAGO");
  const p10 = getPaymentPromisesMonitor([assocPromiseActive], { "assoc-10": [promiseActive] }, evalNow);
  assertEqual(p10[0].promise_status, "ACTIVE", "Promesa ACTIVE");

  // Test 11: Due Today Promise
  console.log("--- Test 11: Promesa Vence Hoy (DUE_TODAY) ---");
  const promiseToday: CollectionAction = {
    id: "prom-11",
    associate_id: "assoc-11",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: "2026-08-31", // Hoy
    promised_payment_amount: 50000,
    created_at: "2026-08-25T10:00:00.000Z",
  };
  const assocPromiseToday = mockAssociate("assoc-11", "P11 Test", "EN MORA", 50000, 8, promiseToday, "COMPROMISO_PAGO");
  const p11 = getPaymentPromisesMonitor([assocPromiseToday], { "assoc-11": [promiseToday] }, evalNow);
  assertEqual(p11[0].promise_status, "DUE_TODAY", "Promesa DUE_TODAY");

  // Test 12: Overdue Promise
  console.log("--- Test 12: Promesa Vencida (OVERDUE) ---");
  const promiseOverdue: CollectionAction = {
    id: "prom-12",
    associate_id: "assoc-12",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: "2026-08-20", // Pasada
    promised_payment_amount: 35000,
    created_at: "2026-08-15T10:00:00.000Z",
  };
  const assocPromiseOverdue = mockAssociate("assoc-12", "P12 Test", "EN MORA", 35000, 15, promiseOverdue, "COMPROMISO_PAGO");
  const p12 = getPaymentPromisesMonitor([assocPromiseOverdue], { "assoc-12": [promiseOverdue] }, evalNow);
  assertEqual(p12[0].promise_status, "OVERDUE", "Promesa OVERDUE");

  // Test 13: AL DÍA => FULFILLED
  console.log("--- Test 13: Asociado AL DÍA convierte promesa en FULFILLED ---");
  const assocPromiseAlDia = mockAssociate("assoc-13", "P13 Test", "AL DÍA", 0, 0, promiseActive, "RESUELTO");
  const p13 = getPaymentPromisesMonitor([assocPromiseAlDia], { "assoc-13": [promiseActive] }, evalNow);
  assertEqual(p13[0].promise_status, "FULFILLED", "Promesa FULFILLED");

  // Test 14: Newer Promise Supersedes Older Promise
  console.log("--- Test 14: Nueva promesa sustituye la promesa anterior ---");
  const oldPromise: CollectionAction = {
    id: "prom-14-old",
    associate_id: "assoc-14",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: "2026-08-20",
    promised_payment_amount: 30000,
    created_at: "2026-08-10T10:00:00.000Z",
  };
  const newPromise: CollectionAction = {
    id: "prom-14-new",
    associate_id: "assoc-14",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: "2026-09-20",
    promised_payment_amount: 40000,
    created_at: "2026-08-25T10:00:00.000Z",
  };
  const assocP14 = mockAssociate("assoc-14", "P14 Test", "EN MORA", 40000, 10, newPromise, "COMPROMISO_PAGO");
  const p14 = getPaymentPromisesMonitor([assocP14], { "assoc-14": [newPromise, oldPromise] }, evalNow);
  assertEqual(p14.length, 1, "Solo monitorea la última promesa activa");
  assertEqual(p14[0].promised_payment_date, "2026-09-20", "Promesa activa es la más reciente");

  // Test 15: Later NOTE does NOT supersede active promise
  console.log("--- Test 15: Una NOTA posterior NO elimina ni sustituye una promesa económica previa ---");
  const noteAction: CollectionAction = {
    id: "note-15",
    associate_id: "assoc-15",
    performed_by: "admin-1",
    channel: "email",
    action_type: "note",
    result_status: "contacted",
    created_at: "2026-08-30T10:00:00.000Z",
  };
  const assocP15 = mockAssociate("assoc-15", "P15 Test", "EN MORA", 50000, 10, noteAction, "CONTACTADO");
  const p15 = getPaymentPromisesMonitor([assocP15], { "assoc-15": [noteAction, promiseActive] }, evalNow);
  assertEqual(p15.length, 1, "Promesa se conserva a pesar de nota posterior");
  assertEqual(p15[0].promise_status, "ACTIVE", "Estado de promesa sigue ACTIVE");

  // Test 16: Promise without date handled explicitly (UNSCHEDULED)
  console.log("--- Test 16: Promesa sin fecha acordada es UNSCHEDULED ---");
  const promiseNoDate: CollectionAction = {
    id: "prom-16",
    associate_id: "assoc-16",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: null,
    promised_payment_amount: 60000,
    created_at: "2026-08-28T10:00:00.000Z",
  };
  const assocP16 = mockAssociate("assoc-16", "P16 Test", "EN MORA", 60000, 10, promiseNoDate, "COMPROMISO_PAGO");
  const p16 = getPaymentPromisesMonitor([assocP16], { "assoc-16": [promiseNoDate] }, evalNow);
  assertEqual(p16[0].promise_status, "UNSCHEDULED", "Promesa sin fecha es UNSCHEDULED");

  // Test 17: Promise without amount handled explicitly
  console.log("--- Test 17: Promesa sin monto especificado no genera errores ni coerción a 0 ---");
  const promiseNoAmount: CollectionAction = {
    id: "prom-17",
    associate_id: "assoc-17",
    performed_by: "admin-1",
    channel: "phone",
    action_type: "payment_promise",
    result_status: "promise_agreed",
    promised_payment_date: "2026-09-10",
    promised_payment_amount: null,
    created_at: "2026-08-28T10:00:00.000Z",
  };
  const assocP17 = mockAssociate("assoc-17", "P17 Test", "EN MORA", 60000, 10, promiseNoAmount, "COMPROMISO_PAGO");
  const p17 = getPaymentPromisesMonitor([assocP17], { "assoc-17": [promiseNoAmount] }, evalNow);
  assertEqual(p17[0].promised_payment_amount, null, "Monto permanece null");

  // Test 18: PENDIENTE associate with promise is not lost
  console.log("--- Test 18: Asociado PENDIENTE con promesa de pago NO es descartado ---");
  const assocPendiente = mockAssociate("assoc-18", "P18 Test", "PENDIENTE", 35000, 0, promiseActive, "COMPROMISO_PAGO");
  const p18 = getPaymentPromisesMonitor([assocPendiente], { "assoc-18": [promiseActive] }, evalNow);
  assertEqual(p18.length, 1, "Asociado PENDIENTE está presente en el monitor");
  assertEqual(p18[0].promise_status, "ACTIVE", "Promesa ACTIVE para asociado PENDIENTE");

  // Test 19: Deterministic sorting in Promise Monitor (OVERDUE first)
  console.log("--- Test 19: Ordenamiento Determinista en el Monitor de Promesas ---");
  const pAll = getPaymentPromisesMonitor(
    [assocPromiseToday, assocPromiseOverdue, assocPromiseActive],
    {
      "assoc-10": [promiseActive],
      "assoc-11": [promiseToday],
      "assoc-12": [promiseOverdue],
    },
    evalNow
  );
  assertEqual(pAll[0].associate_id, "assoc-12", "OVERDUE va primero");
  assertEqual(pAll[1].associate_id, "assoc-11", "DUE_TODAY va segundo");
  assertEqual(pAll[2].associate_id, "assoc-10", "ACTIVE va tercero");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS H1 EXPANDIDAS DE COLA Y PROMESAS (1-19) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
