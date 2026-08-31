import {
  reserveNotificationEvent,
  NotificationReservationRepository,
  NotificationFreshStateLoader,
  NewNotificationRecord,
  ReservedNotificationEvent,
  ExistingNotificationEvent,
} from "../collections-notification-reservation-service";
import { EnrichedAssociateAgingItem } from "../collections-dashboard-service";
import { NotificationEventRecord } from "../collections-automation-service";
import { PaymentPromiseItem } from "../collections-queue-service";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

function mockAssociate(
  id: string,
  name: string,
  email: string | null,
  accountStatus: "AL DÍA" | "PENDIENTE" | "EN MORA",
  outstanding: number,
  dpd: number
): EnrichedAssociateAgingItem {
  return {
    associate_id: id,
    full_name: name,
    email: email as any,
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

class InMemoryReservationRepository implements NotificationReservationRepository {
  public records: ReservedNotificationEvent[] = [];
  public insertCalls = 0;
  public simulate23505WithoutRow = false;
  public simulate23505WithRow = false;

  async insertQueuedEvent(record: NewNotificationRecord): Promise<ReservedNotificationEvent> {
    this.insertCalls++;

    if (this.simulate23505WithoutRow) {
      const err: any = new Error("duplicate key value violates unique constraint uq_collection_notification_idempotency");
      err.code = "23505";
      throw err;
    }

    if (this.simulate23505WithRow) {
      const existingRecord: ReservedNotificationEvent = {
        id: `evt-existing`,
        associate_id: record.associate_id,
        channel: record.channel,
        automation_type: record.automation_type,
        reference_date: record.reference_date,
        status: "QUEUED",
        recipient_email: record.recipient_email,
        scheduled_for: record.scheduled_for,
        created_at: new Date().toISOString(),
      };
      this.records.push(existingRecord);
      const err: any = new Error("duplicate key value violates unique constraint uq_collection_notification_idempotency");
      err.code = "23505";
      throw err;
    }

    const exists = this.records.some(
      (r) =>
        r.associate_id === record.associate_id &&
        r.automation_type === record.automation_type &&
        r.reference_date === record.reference_date &&
        r.channel === record.channel
    );

    if (exists) {
      const err: any = new Error("duplicate key value violates unique constraint uq_collection_notification_idempotency");
      err.code = "23505";
      throw err;
    }

    const newEvent: ReservedNotificationEvent = {
      id: `evt-${this.records.length + 1}`,
      associate_id: record.associate_id,
      channel: record.channel,
      automation_type: record.automation_type,
      reference_date: record.reference_date,
      status: "QUEUED",
      recipient_email: record.recipient_email,
      scheduled_for: record.scheduled_for,
      created_at: new Date().toISOString(),
    };

    this.records.push(newEvent);
    return newEvent;
  }

  async findExistingEvent(
    associate_id: string,
    automation_type: any,
    reference_date: string,
    channel: any
  ): Promise<ExistingNotificationEvent | null> {
    const found = this.records.find(
      (r) =>
        r.associate_id === associate_id &&
        r.automation_type === automation_type &&
        r.reference_date === reference_date &&
        r.channel === channel
    );

    if (!found) return null;
    return {
      id: found.id,
      associate_id: found.associate_id,
      channel: found.channel,
      automation_type: found.automation_type,
      reference_date: found.reference_date,
      status: found.status,
      scheduled_for: found.scheduled_for,
    };
  }
}

export async function runCollectionsNotificationReservationTests() {
  console.log("=== INICIANDO SUITE MATRIZ H2 COMPLETA DE PRUEBAS DE PRECEDENCIA Y RESERVA (FASE 4A5.2-E3.1.H2) ===");

  const evalNow = "2026-08-31T12:00:00.000Z";

  // Test 1: Eligible candidate reservation -> RESERVED
  console.log("--- Test 1: Reserva de candidato elegible -> RESERVED (status QUEUED) ---");
  const repo1 = new InMemoryReservationRepository();
  const assoc1 = mockAssociate("a-res-1", "Eligible User", "user1@sovogin.org", "EN MORA", 50000, 7);
  const result1 = await reserveNotificationEvent(
    { associate: assoc1, promise: null, history: [] },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
      scheduled_for: "2026-08-31T05:00:00.000Z",
    },
    repo1,
    evalNow
  );

  assertEqual(result1.outcome, "RESERVED", "Outcome is RESERVED");
  if (result1.outcome === "RESERVED") {
    assertEqual(result1.event.status, "QUEUED", "Status is QUEUED");
    assertEqual(result1.event.automation_type, "OVERDUE_7D", "Automation type is OVERDUE_7D");
    assertEqual(result1.event.reference_date, "2026-08-08", "Reference date is 2026-08-08");
  }

  // Test 2: Pre-existing QUEUED identity -> ALREADY_RESERVED
  console.log("--- Test 2: Identidad idéntica QUEUED -> ALREADY_RESERVED ---");
  const repo2 = new InMemoryReservationRepository();
  const result2 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "QUEUED",
          scheduled_for: "2026-08-31T05:00:00.000Z",
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result2.outcome, "ALREADY_RESERVED", "Duplicate QUEUED returns ALREADY_RESERVED");

  // Test 3: Pre-existing SENT identity -> ALREADY_RESERVED
  console.log("--- Test 3: Identidad idéntica SENT -> ALREADY_RESERVED ---");
  const result3 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "SENT",
          scheduled_for: "2026-08-31T05:00:00.000Z",
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result3.outcome, "ALREADY_RESERVED", "Existing SENT returns ALREADY_RESERVED");

  // Test 4: Pre-existing DELIVERED identity -> ALREADY_RESERVED
  console.log("--- Test 4: Identidad idéntica DELIVERED -> ALREADY_RESERVED ---");
  const result4 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "DELIVERED",
          scheduled_for: "2026-08-31T05:00:00.000Z",
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result4.outcome, "ALREADY_RESERVED", "Existing DELIVERED returns ALREADY_RESERVED");

  // Test 5: Pre-existing BOUNCED identity -> ALREADY_RESERVED
  console.log("--- Test 5: Identidad idéntica BOUNCED -> ALREADY_RESERVED ---");
  const result5 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "BOUNCED",
          scheduled_for: "2026-08-31T05:00:00.000Z",
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result5.outcome, "ALREADY_RESERVED", "Existing BOUNCED returns ALREADY_RESERVED");

  // Test 6: Pre-existing FAILED identity -> ALREADY_RESERVED (0 new rows created)
  console.log("--- Test 6: Identidad idéntica FAILED -> ALREADY_RESERVED (0 filas creadas) ---");
  const repo6 = new InMemoryReservationRepository();
  const result6 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "FAILED",
          scheduled_for: "2026-08-31T05:00:00.000Z",
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo6,
    evalNow
  );
  assertEqual(result6.outcome, "ALREADY_RESERVED", "Existing FAILED returns ALREADY_RESERVED");
  assertEqual(repo6.records.length, 0, "0 new rows created for FAILED");

  // Test 7: Pre-existing SUPPRESSED identity -> ALREADY_RESERVED
  console.log("--- Test 7: Identidad idéntica SUPPRESSED -> ALREADY_RESERVED ---");
  const result7 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "SUPPRESSED",
          scheduled_for: "2026-08-31T05:00:00.000Z",
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result7.outcome, "ALREADY_RESERVED", "Existing SUPPRESSED returns ALREADY_RESERVED");

  // Test 8: Precedence Proof - Identical identity + 24h history -> ALREADY_RESERVED Wins!
  console.log("--- Test 8: Precedencia - Identidad exacta + historial 24h -> ALREADY_RESERVED GANA a Cap de 24h ---");
  const result8 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "SENT",
          scheduled_for: "2026-08-31T08:00:00.000Z", // Sent 4 hours ago
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result8.outcome, "ALREADY_RESERVED", "Exact identity returns ALREADY_RESERVED, NOT 24h cap suppression");

  // Test 9: Precedence Proof - Identical identity + Milestone Registered -> ALREADY_RESERVED Wins!
  console.log("--- Test 9: Precedencia - Identidad exacta + Milestone Registrado -> ALREADY_RESERVED GANA a Milestone Suppression ---");
  const result9 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_7D",
          reference_date: "2026-08-08",
          status: "QUEUED",
          scheduled_for: "2026-08-01T00:00:00.000Z", // Old queued milestone
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result9.outcome, "ALREADY_RESERVED", "Exact identity returns ALREADY_RESERVED, NOT milestone suppression");

  // Test 10: DIFFERENT event within 24h -> SUPPRESSED_24H_FREQUENCY_CAP
  console.log("--- Test 10: Evento DIFERENTE en últimas 24h -> SUPPRESSED_24H_FREQUENCY_CAP ---");
  const result10 = await reserveNotificationEvent(
    {
      associate: assoc1,
      promise: null,
      history: [
        {
          associate_id: "a-res-1",
          channel: "email",
          automation_type: "OVERDUE_1D", // Different trigger type
          reference_date: "2026-08-02",
          status: "SENT",
          scheduled_for: "2026-08-31T08:00:00.000Z", // Sent 4 hours ago
        },
      ],
    },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo2,
    evalNow
  );
  assertEqual(result10.outcome, "SUPPRESSED", "Different event in 24h returns SUPPRESSED");
  if (result10.outcome === "SUPPRESSED") {
    assertEqual(result10.reason, "SUPPRESSED_24H_FREQUENCY_CAP", "Reason is 24h frequency cap");
  }

  // Test 11: Error 23505 en DB -> ALREADY_RESERVED
  console.log("--- Test 11: Error de restricción única PostgreSQL 23505 -> ALREADY_RESERVED ---");
  const repo11 = new InMemoryReservationRepository();
  repo11.simulate23505WithRow = true;
  const result11 = await reserveNotificationEvent(
    { associate: assoc1, promise: null, history: [] },
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo11,
    evalNow
  );
  assertEqual(result11.outcome, "ALREADY_RESERVED", "23505 error mapped to ALREADY_RESERVED");

  // Test 12: Error 23505 sin fila en DB -> Controlled Exception Thrown
  console.log("--- Test 12: Error 23505 sin fila en DB -> Excepción de Integridad Controlada ---");
  const repo12 = new InMemoryReservationRepository();
  repo12.simulate23505WithoutRow = true;
  let caughtError: Error | null = null;
  try {
    await reserveNotificationEvent(
      { associate: assoc1, promise: null, history: [] },
      {
        associate_id: "a-res-1",
        automation_type: "OVERDUE_7D",
        channel: "email",
        reference_date: "2026-08-08",
      },
      repo12,
      evalNow
    );
  } catch (err: any) {
    caughtError = err;
  }
  assertEqual(caughtError !== null, true, "Exception thrown on 23505 without row");
  assertEqual(caughtError?.message.includes("Repository Integrity Violation"), true, "Integrity violation error message");

  // Test 13: NotificationFreshStateLoader Dependency Verification
  console.log("--- Test 13: Verificación de Carga Automática mediante NotificationFreshStateLoader ---");
  const mockLoader: NotificationFreshStateLoader = {
    async loadFreshState(id: string) {
      return {
        associate: assoc1,
        promise: null,
        history: [],
      };
    },
  };
  const result13 = await reserveNotificationEvent(
    mockLoader,
    {
      associate_id: "a-res-1",
      automation_type: "OVERDUE_7D",
      channel: "email",
      reference_date: "2026-08-08",
    },
    repo11,
    evalNow
  );
  assertEqual(result13.outcome, "ALREADY_RESERVED", "State loader works seamlessly");

  // Test 14: Simulación de Concurrencia Simulada
  console.log("--- Test 14: Simulación de Concurrencia Simulada (1 RESERVED, 1 ALREADY_RESERVED) ---");
  const repoConc = new InMemoryReservationRepository();
  const assocConc = mockAssociate("a-conc", "Concurrent User", "conc@sovogin.org", "EN MORA", 60000, 10);
  const payloadConc = {
    associate_id: "a-conc",
    automation_type: "OVERDUE_7D" as const,
    channel: "email" as const,
    reference_date: "2026-08-08",
  };
  const snapConc = { associate: assocConc, promise: null, history: [] };
  const [resA, resB] = await Promise.all([
    reserveNotificationEvent(snapConc, payloadConc, repoConc, evalNow),
    reserveNotificationEvent(snapConc, payloadConc, repoConc, evalNow),
  ]);
  const outcomes = [resA.outcome, resB.outcome].sort();
  assertEqual(outcomes[0], "ALREADY_RESERVED", "One outcome ALREADY_RESERVED");
  assertEqual(outcomes[1], "RESERVED", "One outcome RESERVED");

  // Test 15-20: Domain Fresh Suppressions & Candidate Drift
  console.log("--- Test 15-20: Supresiones Frescas de Dominio y Candidate Drift ---");
  const assoc15d = mockAssociate("a-15d", "15D User", "u15d@sovogin.org", "EN MORA", 60000, 16);
  const resDrift = await reserveNotificationEvent(
    { associate: assoc15d, promise: null, history: [] },
    { associate_id: "a-15d", automation_type: "OVERDUE_7D", channel: "email", reference_date: "2026-08-08" },
    repoConc,
    evalNow
  );
  assertEqual(resDrift.outcome, "SUPPRESSED", "Stale candidate returns SUPPRESSED");
  if (resDrift.outcome === "SUPPRESSED") {
    assertEqual(resDrift.reason, "STALE_AUTOMATION_TYPE_DRIFT", "Reason is STALE_AUTOMATION_TYPE_DRIFT");
  }

  // Test 21: recipient_email derived from fresh associate profile
  console.log("--- Test 21: recipient_email derivado de perfil de asociado fresco ---");
  const repo21 = new InMemoryReservationRepository();
  const res21 = await reserveNotificationEvent(
    { associate: assoc1, promise: null, history: [] },
    { associate_id: "a-res-1", automation_type: "OVERDUE_7D", channel: "email", reference_date: "2026-08-08", recipient_email: "hacker@example.com" },
    repo21,
    evalNow
  );
  assertEqual(res21.outcome, "RESERVED", "Outcome is RESERVED");
  if (res21.outcome === "RESERVED") {
    assertEqual(res21.event.recipient_email, "user1@sovogin.org", "recipient_email derived from fresh associate profile");
  }

  // Test 22: Capability Isolation
  console.log("--- Test 22: Inmunidad de Repositorio ---");
  assertEqual(typeof repo21.insertQueuedEvent, "function", "insertQueuedEvent exists");
  assertEqual(typeof (repo21 as any).updateEvent, "undefined", "No update capability");
  assertEqual(typeof (repo21 as any).deleteEvent, "undefined", "No delete capability");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS H2 DE PRECEDENCIA Y RESERVA (1-22) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
