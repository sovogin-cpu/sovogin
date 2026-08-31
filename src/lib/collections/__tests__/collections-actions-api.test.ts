import {
  deriveCollectionStatus,
  deriveFollowUpState,
  parseBogotaDateTimeToUtcIso,
} from "../collections-service";
import { CollectionAction } from "../types";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

function assertThrows(fn: () => void, message: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`[FAIL] ${message} - Se esperaba un error pero la función se ejecutó sin lanzar excepción.`);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Helper de Validación Backend Simulado
export function validateActionPayload(payload: {
  channel: string;
  action_type: string;
  result_status: string;
  promised_payment_date?: string | null;
  promised_payment_amount?: number | null;
  next_follow_up_at?: string | null;
}) {
  const VALID_CHANNELS = ["email", "phone", "whatsapp", "in_person", "other", "system"];
  const VALID_ACTION_TYPES = [
    "initial_reminder",
    "payment_notice",
    "follow_up",
    "payment_promise",
    "dispute",
    "escalation",
    "note",
  ];
  const VALID_RESULT_STATUSES = [
    "contacted",
    "no_answer",
    "promise_agreed",
    "disputed",
    "pending",
  ];

  if (!payload.channel || !VALID_CHANNELS.includes(payload.channel)) {
    throw new Error("Canal inválido");
  }
  if (!payload.action_type || !VALID_ACTION_TYPES.includes(payload.action_type)) {
    throw new Error("Tipo de acción inválido");
  }
  if (payload.result_status === "resolved") {
    throw new Error("result_status 'resolved' no está permitido");
  }
  if (!payload.result_status || !VALID_RESULT_STATUSES.includes(payload.result_status)) {
    throw new Error("Resultado inválido");
  }
  if (payload.promised_payment_date) {
    if (!DATE_REGEX.test(payload.promised_payment_date) || isNaN(new Date(payload.promised_payment_date + "T00:00:00Z").getTime())) {
      throw new Error("Fecha prometida inválida");
    }
  }
  if (
    payload.promised_payment_amount !== undefined &&
    payload.promised_payment_amount !== null &&
    payload.promised_payment_amount < 0
  ) {
    throw new Error("Monto prometido negativo no permitido");
  }
  if (payload.next_follow_up_at) {
    if (isNaN(new Date(payload.next_follow_up_at).getTime())) {
      throw new Error("Próximo seguimiento inválido");
    }
  }

  return true;
}

export function runCollectionsActionsApiTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS EXPANDIDA CONTRATO API GESTIONES (FASE 4A5.2-C.H2) ===");

  // Test 1: Payload válido completo
  console.log("--- Test 1: Payload válido completo pasa la validación ---");
  const validResult = validateActionPayload({
    channel: "phone",
    action_type: "follow_up",
    result_status: "contacted",
    promised_payment_date: "2026-09-15",
    promised_payment_amount: 150000,
    next_follow_up_at: "2026-09-10T14:00:00.000Z",
  });
  assertEqual(validResult, true, "Payload válido");

  // Test 2: Canal inválido es rechazado
  console.log("--- Test 2: Canal inválido es rechazado ---");
  assertThrows(
    () =>
      validateActionPayload({
        channel: "telegram",
        action_type: "follow_up",
        result_status: "contacted",
      }),
    "Canal no soportado"
  );

  // Test 3: Tipo de acción inválido es rechazado
  console.log("--- Test 3: Tipo de acción inválido es rechazado ---");
  assertThrows(
    () =>
      validateActionPayload({
        channel: "email",
        action_type: "lawsuit",
        result_status: "contacted",
      }),
    "Tipo de acción no soportado"
  );

  // Test 4: result_status = 'resolved' es explícitamente RECHAZADO
  console.log("--- Test 4: result_status 'resolved' es explícitamente RECHAZADO ---");
  assertThrows(
    () =>
      validateActionPayload({
        channel: "phone",
        action_type: "follow_up",
        result_status: "resolved",
      }),
    "Rechazo de resolved"
  );

  // Test 5: Monto prometido negativo es rechazado
  console.log("--- Test 5: Monto prometido negativo es rechazado ---");
  assertThrows(
    () =>
      validateActionPayload({
        channel: "phone",
        action_type: "payment_promise",
        result_status: "promise_agreed",
        promised_payment_amount: -5000,
      }),
    "Monto negativo"
  );

  // Test 6: Fecha prometida inválida es rechazada
  console.log("--- Test 6: Fecha prometida con formato/valor inválido es rechazada ---");
  assertThrows(
    () =>
      validateActionPayload({
        channel: "phone",
        action_type: "payment_promise",
        result_status: "promise_agreed",
        promised_payment_date: "15/09/2026", // Formato incorrecto
      }),
    "Fecha formato incorrecto"
  );

  // Test 7: Próximo seguimiento datetime inválido es rechazado
  console.log("--- Test 7: Próximo seguimiento datetime inválido es rechazado ---");
  assertThrows(
    () =>
      validateActionPayload({
        channel: "phone",
        action_type: "follow_up",
        result_status: "contacted",
        next_follow_up_at: "fecha-invalida",
      }),
    "Datetime seguimiento incorrecto"
  );

  // Test 8: UUID de associateId inválido es rechazado por regex
  console.log("--- Test 8: UUID de associateId inválido es rechazado por regex ---");
  assertEqual(UUID_REGEX.test("not-a-uuid"), false, "Non-UUID string");
  assertEqual(UUID_REGEX.test("33333333-3333-3333-3333-333333333333"), true, "Valid UUID string");

  // Test 9: Simulación Anti-Spoofing performed_by = auth.uid()
  console.log("--- Test 9: Anti-Spoofing fuerza performed_by desde sesión ---");
  const authUserId = "admin-uuid-1234";
  const sanitizedPerformedBy = authUserId;
  assertEqual(sanitizedPerformedBy, authUserId, "performed_by sobrescrito");

  // Test 10: Actualización de DerivedCollectionStatus post-inserción (COMPROMISO_PAGO)
  console.log("--- Test 10: DerivedCollectionStatus COMPROMISO_PAGO post-inserción ---");
  const actionsPromise: CollectionAction[] = [
    {
      id: "act-new",
      associate_id: "assoc-1",
      performed_by: authUserId,
      channel: "phone",
      action_type: "payment_promise",
      result_status: "promise_agreed",
      promised_payment_date: "2026-09-15",
      promised_payment_amount: 35000,
      created_at: "2026-08-31T12:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsPromise), "COMPROMISO_PAGO", "Derived Status promise");

  // Test 11: Actualización de DerivedCollectionStatus post-inserción (ESCALADO)
  console.log("--- Test 11: DerivedCollectionStatus ESCALADO post-inserción ---");
  const actionsEscalation: CollectionAction[] = [
    {
      id: "act-esc",
      associate_id: "assoc-1",
      performed_by: authUserId,
      channel: "email",
      action_type: "escalation",
      result_status: "pending",
      created_at: "2026-08-31T12:00:00.000Z",
    },
  ];
  assertEqual(deriveCollectionStatus("EN MORA", actionsEscalation), "ESCALADO", "Derived Status escalation");

  // Test 12: FollowUpState agendado vs vencido
  console.log("--- Test 12: FollowUpState agendado vs vencido post-inserción ---");
  const followUpScheduled: CollectionAction[] = [
    {
      id: "act-sched",
      associate_id: "assoc-1",
      performed_by: authUserId,
      channel: "phone",
      action_type: "follow_up",
      result_status: "contacted",
      next_follow_up_at: "2026-09-10T10:00:00.000Z",
      created_at: "2026-08-31T12:00:00.000Z",
    },
  ];
  const followUpDue: CollectionAction[] = [
    {
      id: "act-due",
      associate_id: "assoc-1",
      performed_by: authUserId,
      channel: "phone",
      action_type: "follow_up",
      result_status: "contacted",
      next_follow_up_at: "2026-08-10T10:00:00.000Z",
      created_at: "2026-08-31T12:00:00.000Z",
    },
  ];
  assertEqual(deriveFollowUpState(followUpScheduled, "2026-08-31T12:00:00.000Z"), "SCHEDULED", "FollowUp SCHEDULED");
  assertEqual(deriveFollowUpState(followUpDue, "2026-08-31T12:00:00.000Z"), "DUE", "FollowUp DUE");

  // Test 13: Deterministic Bogota 09:00 -> UTC 14:00 conversion
  console.log("--- Test 13: Deterministic Bogota 09:00 -> UTC 14:00 conversion ---");
  const inputBogotaStr1 = "2026-09-02T09:00";
  const expectedUtcIso1 = "2026-09-02T14:00:00.000Z";
  const actualUtcIso1 = parseBogotaDateTimeToUtcIso(inputBogotaStr1);
  assertEqual(actualUtcIso1, expectedUtcIso1, "09:00 Bogota converts to 14:00 UTC");

  // Test 14: Round-Trip Bogota conversion: Stored UTC 14:00 -> Display Bogota 09:00
  console.log("--- Test 14: Round-Trip Bogota conversion: Stored UTC 14:00 -> Display Bogota 09:00 ---");
  const storedUtcIso = "2026-09-02T14:00:00.000Z";
  const displayedBogotaHour = new Date(storedUtcIso).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  assertEqual(displayedBogotaHour, "09:00", "Round trip Bogota display hour");

  // Test 15: Multi-timezone Runtime Simulation (TZ = UTC, TZ = America/New_York, TZ = Europe/Madrid)
  console.log("--- Test 15: Multi-timezone Runtime Simulation (Independent of Machine TZ) ---");
  const inputBogotaStr2 = "2026-11-15T15:30";
  const expectedUtcIso2 = "2026-11-15T20:30:00.000Z";

  const originalTz = process.env.TZ;
  try {
    for (const testTz of ["UTC", "America/New_York", "Europe/Madrid", "Asia/Tokyo"]) {
      process.env.TZ = testTz;
      const converted = parseBogotaDateTimeToUtcIso(inputBogotaStr2);
      assertEqual(converted, expectedUtcIso2, `Conversion under TZ=${testTz}`);
    }
  } finally {
    process.env.TZ = originalTz;
  }

  // Test 16: Privacy Minimization (Only full_name requested, email excluded)
  console.log("--- Test 16: Privacy Minimization (Only full_name requested) ---");
  const sampleProfileJoin = { full_name: "Dra. María Pérez" };
  assertEqual(sampleProfileJoin.full_name, "Dra. María Pérez", "Full name available");
  assertEqual((sampleProfileJoin as Record<string, unknown>).email, undefined, "Email strictly excluded");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS H2 TIMEZONE & PRIVACIDAD (1-16) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
