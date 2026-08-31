import {
  deriveCollectionStatus,
  deriveFollowUpState,
  sortCollectionActionsDeterministically,
} from "../collections-service";
import { CollectionAction } from "../types";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

export function runCollectionsTestSuite() {
  console.log("=== INICIANDO SUITE DE PRUEBAS HARDENED DE COLLECTIONS H2 (FASE 4A5.2-A.H2) ===");

  const nowIsoStr = "2026-08-31T12:00:00.000Z";

  // Test 1: AL DÍA + historial => RESUELTO
  console.log("--- Test 1: AL DÍA con historial previo => RESUELTO ---");
  const actionsHist: CollectionAction[] = [
    {
      id: "act-1",
      associate_id: "assoc-1",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "follow_up",
      result_status: "contacted",
      created_at: "2026-08-15T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("AL DÍA", actionsHist), "RESUELTO", "AL DÍA debe ser RESUELTO");

  // Test 2: EN MORA + sin acciones => SIN_GESTION
  console.log("--- Test 2: EN MORA sin acciones => SIN_GESTION ---");
  assertEqual(deriveCollectionStatus("EN MORA", []), "SIN_GESTION", "Sin acciones debe ser SIN_GESTION");

  // Test 3: escalation => ESCALADO
  console.log("--- Test 3: Escalamiento => ESCALADO ---");
  const actionsEscalation: CollectionAction[] = [
    {
      id: "act-3",
      associate_id: "assoc-3",
      performed_by: "admin-1",
      channel: "system",
      action_type: "escalation",
      result_status: "pending",
      created_at: "2026-08-30T15:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsEscalation), "ESCALADO", "Escalamiento debe ser ESCALADO");

  // Test 4: dispute => EN_DISPUTA
  console.log("--- Test 4: Disputa => EN_DISPUTA ---");
  const actionsDispute: CollectionAction[] = [
    {
      id: "act-4",
      associate_id: "assoc-4",
      performed_by: "admin-1",
      channel: "email",
      action_type: "dispute",
      result_status: "disputed",
      notes: "Asociado objeta cobro",
      created_at: "2026-08-28T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsDispute), "EN_DISPUTA", "Disputa debe ser EN_DISPUTA");

  // Test 5: payment promise => COMPROMISO_PAGO
  console.log("--- Test 5: Promesa de pago => COMPROMISO_PAGO ---");
  const actionsPromise: CollectionAction[] = [
    {
      id: "act-5",
      associate_id: "assoc-5",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      promised_payment_date: "2026-09-05",
      promised_payment_amount: 150000,
      created_at: "2026-08-29T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsPromise), "COMPROMISO_PAGO", "Promesa de pago debe ser COMPROMISO_PAGO");

  // Test 6: no_answer => SIN_RESPUESTA
  console.log("--- Test 6: Sin respuesta => SIN_RESPUESTA ---");
  const actionsNoAnswer: CollectionAction[] = [
    {
      id: "act-6",
      associate_id: "assoc-6",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "follow_up",
      result_status: "no_answer",
      created_at: "2026-08-30T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsNoAnswer), "SIN_RESPUESTA", "No answer debe ser SIN_RESPUESTA");

  // Test 7: contacto normal => CONTACTADO
  console.log("--- Test 7: Contacto normal => CONTACTADO ---");
  const actionsNormal: CollectionAction[] = [
    {
      id: "act-7",
      associate_id: "assoc-7",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "initial_reminder",
      result_status: "contacted",
      created_at: "2026-08-25T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsNormal), "CONTACTADO", "Contacto normal debe ser CONTACTADO");

  // Test 8: CONTACTADO + follow-up futuro => CONTACTADO + SCHEDULED
  console.log("--- Test 8: CONTACTADO + follow-up futuro => CONTACTADO + SCHEDULED ---");
  const actionsContactedScheduled: CollectionAction[] = [
    {
      id: "act-8",
      associate_id: "assoc-8",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "initial_reminder",
      result_status: "contacted",
      next_follow_up_at: "2026-09-05T10:00:00.000Z", // Futuro
      created_at: "2026-08-30T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsContactedScheduled), "CONTACTADO", "Estado interacción debe ser CONTACTADO");
  assertEqual(deriveFollowUpState(actionsContactedScheduled, nowIsoStr), "SCHEDULED", "Estado agenda debe ser SCHEDULED");

  // Test 9: CONTACTADO + follow-up vencido => CONTACTADO + DUE
  console.log("--- Test 9: CONTACTADO + follow-up vencido => CONTACTADO + DUE ---");
  const actionsContactedDue: CollectionAction[] = [
    {
      id: "act-9",
      associate_id: "assoc-9",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "initial_reminder",
      result_status: "contacted",
      next_follow_up_at: "2026-08-30T10:00:00.000Z", // Vencido ayer
      created_at: "2026-08-29T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsContactedDue), "CONTACTADO", "Estado interacción mantiene CONTACTADO");
  assertEqual(deriveFollowUpState(actionsContactedDue, nowIsoStr), "DUE", "Estado agenda es DUE");

  // Test 10: COMPROMISO_PAGO + futuro => COMPROMISO_PAGO + SCHEDULED
  console.log("--- Test 10: COMPROMISO_PAGO + futuro => COMPROMISO_PAGO + SCHEDULED ---");
  const actionsPromiseScheduled: CollectionAction[] = [
    {
      id: "act-10",
      associate_id: "assoc-10",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      next_follow_up_at: "2026-09-05T10:00:00.000Z",
      created_at: "2026-08-30T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsPromiseScheduled), "COMPROMISO_PAGO", "Interacción es COMPROMISO_PAGO");
  assertEqual(deriveFollowUpState(actionsPromiseScheduled, nowIsoStr), "SCHEDULED", "Agenda es SCHEDULED");

  // Test 11: COMPROMISO_PAGO + vencido => COMPROMISO_PAGO + DUE
  console.log("--- Test 11: COMPROMISO_PAGO + vencido => COMPROMISO_PAGO + DUE ---");
  const actionsPromiseDue: CollectionAction[] = [
    {
      id: "act-11",
      associate_id: "assoc-11",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      next_follow_up_at: "2026-08-30T10:00:00.000Z", // Vencido
      created_at: "2026-08-29T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsPromiseDue), "COMPROMISO_PAGO", "Interacción es COMPROMISO_PAGO");
  assertEqual(deriveFollowUpState(actionsPromiseDue, nowIsoStr), "DUE", "Agenda es DUE (no borra compromiso)");

  // Test 12: SIN_RESPUESTA + futuro => SIN_RESPUESTA + SCHEDULED
  console.log("--- Test 12: SIN_RESPUESTA + futuro => SIN_RESPUESTA + SCHEDULED ---");
  const actionsNoAnswerScheduled: CollectionAction[] = [
    {
      id: "act-12",
      associate_id: "assoc-12",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "follow_up",
      result_status: "no_answer",
      next_follow_up_at: "2026-09-02T10:00:00.000Z",
      created_at: "2026-08-30T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsNoAnswerScheduled), "SIN_RESPUESTA", "Interacción es SIN_RESPUESTA");
  assertEqual(deriveFollowUpState(actionsNoAnswerScheduled, nowIsoStr), "SCHEDULED", "Agenda es SCHEDULED");

  // Test 13: SIN_RESPUESTA + vencido => SIN_RESPUESTA + DUE
  console.log("--- Test 13: SIN_RESPUESTA + vencido => SIN_RESPUESTA + DUE ---");
  const actionsNoAnswerDue: CollectionAction[] = [
    {
      id: "act-13",
      associate_id: "assoc-13",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "follow_up",
      result_status: "no_answer",
      next_follow_up_at: "2026-08-30T10:00:00.000Z",
      created_at: "2026-08-29T10:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsNoAnswerDue), "SIN_RESPUESTA", "Interacción es SIN_RESPUESTA");
  assertEqual(deriveFollowUpState(actionsNoAnswerDue, nowIsoStr), "DUE", "Agenda es DUE");

  // Test 14: ordenamiento created_at determinista
  console.log("--- Test 14: Ordenamiento created_at DESC ---");
  const actionsOrder: CollectionAction[] = [
    {
      id: "act-old",
      associate_id: "assoc-14",
      performed_by: "admin-1",
      channel: "email",
      action_type: "dispute",
      result_status: "disputed",
      created_at: "2026-08-10T10:00:00.000Z",
    },
    {
      id: "act-new",
      associate_id: "assoc-14",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      created_at: "2026-08-30T10:00:00.000Z",
    },
  ];
  const sorted = sortCollectionActionsDeterministically(actionsOrder);
  assertEqual(sorted[0].id, "act-new", "Fecha más reciente debe ser primera");

  // Test 15: empate created_at con desempate estable (id ASC)
  console.log("--- Test 15: Empate created_at desempata por ID ASC ---");
  const sameTime = "2026-08-30T10:00:00.000Z";
  const actionsTie: CollectionAction[] = [
    {
      id: "act-z",
      associate_id: "assoc-15",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "dispute",
      result_status: "disputed",
      created_at: sameTime,
    },
    {
      id: "act-a",
      associate_id: "assoc-15",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      created_at: sameTime,
    },
  ];
  const sortedTie = sortCollectionActionsDeterministically(actionsTie);
  assertEqual(sortedTie[0].id, "act-a", "Desempate debe ser act-a");
  assertEqual(deriveCollectionStatus("EN MORA", actionsTie), "COMPROMISO_PAGO", "Evaluado determinísticamente con act-a");

  // Test 16: independencia de timezone / evalNow explícito
  console.log("--- Test 16: Independencia timezone con evalNow explícito ---");
  const tzTime = "2026-08-31T23:59:59.999Z";
  const actionsTz: CollectionAction[] = [
    {
      id: "act-tz",
      associate_id: "assoc-16",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "follow_up",
      result_status: "contacted",
      next_follow_up_at: "2026-09-01T00:00:00.000Z",
      created_at: "2026-08-31T10:00:00.000Z",
    },
  ];
  assertEqual(deriveFollowUpState(actionsTz, tzTime), "SCHEDULED", "Follow-up evaluado correctamente con evalNow UTC");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS HARDENED H2 DE COLLECTIONS (1-16) PASARON CON ÉXITO!");
  console.log("==========================================================");
}

if (require.main === module) {
  runCollectionsTestSuite();
}
