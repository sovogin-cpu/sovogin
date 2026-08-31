import {
  calculateAssociateAgingFromMemory,
  calculateDaysPastDue,
  calculatePortfolioAgingSummary,
  determineAccountStatus,
  determineAgingBucket,
  PureAdjustmentInput,
  PureAllocationInput,
} from "../aging-engine";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

export function runAgingEngineTestSuite() {
  console.log("=== INICIANDO SUITE DE PRUEBAS DEL AGING ENGINE HARDENED (FASE 4A5.1-H1) ===");

  const evalDate = "2026-08-31";

  // Pruebas Límite de Días de Mora y Buckets (Boundary Tests)
  console.log("--- Pruebas de Límites Finitos (Boundary Tests) ---");
  assertEqual(calculateDaysPastDue("2026-08-31", evalDate), 0, "Día 0 (mismo día)");
  assertEqual(determineAgingBucket(0), "CURRENT", "Bucket 0 días");
  assertEqual(determineAccountStatus(0, 0), "AL DÍA", "Status 0 deuda 0 mora");
  assertEqual(determineAccountStatus(100, 0), "PENDIENTE", "Status con deuda sin mora");
  assertEqual(determineAccountStatus(100, 15), "EN MORA", "Status con mora");

  assertEqual(calculateDaysPastDue("2026-08-30", evalDate), 1, "Día 1 de mora");
  assertEqual(determineAgingBucket(1), "1-30 días", "Bucket 1 día");

  assertEqual(calculateDaysPastDue("2026-08-01", evalDate), 30, "Día 30 de mora");
  assertEqual(determineAgingBucket(30), "1-30 días", "Bucket 30 días");

  assertEqual(calculateDaysPastDue("2026-07-31", evalDate), 31, "Día 31 de mora");
  assertEqual(determineAgingBucket(31), "31-60 días", "Bucket 31 días");

  assertEqual(calculateDaysPastDue("2026-07-02", evalDate), 60, "Día 60 de mora");
  assertEqual(determineAgingBucket(60), "31-60 días", "Bucket 60 días");

  assertEqual(calculateDaysPastDue("2026-07-01", evalDate), 61, "Día 61 de mora");
  assertEqual(determineAgingBucket(61), "61-90 días", "Bucket 61 días");

  assertEqual(calculateDaysPastDue("2026-06-02", evalDate), 90, "Día 90 de mora");
  assertEqual(determineAgingBucket(90), "61-90 días", "Bucket 90 días");

  assertEqual(calculateDaysPastDue("2026-06-01", evalDate), 91, "Día 91 de mora");
  assertEqual(determineAgingBucket(91), "91-120 días", "Bucket 91 días");

  assertEqual(calculateDaysPastDue("2026-05-03", evalDate), 120, "Día 120 de mora");
  assertEqual(determineAgingBucket(120), "91-120 días", "Bucket 120 días");

  assertEqual(calculateDaysPastDue("2026-05-02", evalDate), 121, "Día 121 de mora");
  assertEqual(determineAgingBucket(121), "+120 días", "Bucket 121 días");

  // Escenario 1: Asociado sin cargos
  console.log("--- Escenario 1: Asociado sin cargos ---");
  const res1 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-1",
    full_name: "Asociado Sin Cargos",
    email: "sin_cargos@test.com",
    charges: [],
    asOfDateStr: evalDate,
  });
  assertEqual(res1.total_outstanding, 0, "Res1 Total Outstanding");
  assertEqual(res1.open_charge_count, 0, "Res1 Open Charge Count");
  assertEqual(res1.days_past_due, 0, "Res1 DPD");
  assertEqual(res1.aging_bucket, "CURRENT", "Res1 Aging Bucket");
  assertEqual(res1.account_status, "AL DÍA", "Res1 Account Status");

  // Escenario 2: Cargos futuros solamente
  console.log("--- Escenario 2: Cargos futuros solamente ---");
  const res2 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-2",
    full_name: "Asociado Con Cargos Futuros",
    email: "futuro@test.com",
    charges: [
      {
        id: "c-fut-1",
        original_amount: 150000,
        due_date: "2026-09-15",
        admin_status: "open",
      },
    ],
    asOfDateStr: evalDate,
  });
  assertEqual(res2.total_outstanding, 150000, "Res2 Total Outstanding");
  assertEqual(res2.open_charge_count, 1, "Res2 Open Charge Count");
  assertEqual(res2.current_amount, 150000, "Res2 Current Amount");
  assertEqual(res2.days_past_due, 0, "Res2 DPD");
  assertEqual(res2.aging_bucket, "CURRENT", "Res2 Aging Bucket");
  assertEqual(res2.account_status, "PENDIENTE", "Res2 Account Status");

  // Escenario 3: Cargo vencido sin pagos
  console.log("--- Escenario 3: Cargo vencido sin pagos ---");
  const res3 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-3",
    full_name: "Asociado Vencido Sin Pagos",
    email: "vencido@test.com",
    charges: [
      {
        id: "c-venc-1",
        original_amount: 200000,
        due_date: "2026-08-16", // 15 días de mora a 2026-08-31
        admin_status: "open",
      },
    ],
    asOfDateStr: evalDate,
  });
  assertEqual(res3.total_outstanding, 200000, "Res3 Total Outstanding");
  assertEqual(res3.days_past_due, 15, "Res3 DPD 15 días");
  assertEqual(res3.days_1_30, 200000, "Res3 Bucket 1-30 días");
  assertEqual(res3.aging_bucket, "1-30 días", "Res3 Aging Bucket");
  assertEqual(res3.account_status, "EN MORA", "Res3 Account Status");

  // Escenario 4: Cargo pagado completamente
  console.log("--- Escenario 4: Cargo pagado completamente ---");
  const res4 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-4",
    full_name: "Asociado Pagado Completamente",
    email: "pagado@test.com",
    charges: [
      {
        id: "c-pag-1",
        original_amount: 100000,
        allocated_amount: 100000,
        due_date: "2026-07-01",
        admin_status: "open",
      },
    ],
    asOfDateStr: evalDate,
  });
  assertEqual(res4.total_outstanding, 0, "Res4 Total Outstanding");
  assertEqual(res4.open_charge_count, 0, "Res4 Open Charge Count");
  assertEqual(res4.days_past_due, 0, "Res4 DPD");
  assertEqual(res4.aging_bucket, "CURRENT", "Res4 Aging Bucket");
  assertEqual(res4.account_status, "AL DÍA", "Res4 Account Status");

  // Escenario 5: Cargo parcialmente pagado
  console.log("--- Escenario 5: Cargo parcialmente pagado ---");
  const res5 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-5",
    full_name: "Asociado Parcial",
    email: "parcial@test.com",
    charges: [
      {
        id: "c-parc-1",
        original_amount: 300000,
        allocated_amount: 100000, // 200,000 pendiente
        due_date: "2026-07-31", // 31 días de mora a 2026-08-31
        admin_status: "open",
      },
    ],
    asOfDateStr: evalDate,
  });
  assertEqual(res5.total_outstanding, 200000, "Res5 Total Outstanding");
  assertEqual(res5.days_past_due, 31, "Res5 DPD 31 días");
  assertEqual(res5.days_31_60, 200000, "Res5 Bucket 31-60 días");
  assertEqual(res5.aging_bucket, "31-60 días", "Res5 Aging Bucket");
  assertEqual(res5.account_status, "EN MORA", "Res5 Account Status");

  // Escenario 6: Anti-Duplicación por Múltiples Memberships del Mismo Asociado
  console.log("--- Escenario 6: Asociado con múltiples registros de membership no duplica cargos ---");
  const res6 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-6-multi-mem",
    full_name: "Asociado Con Membresia Historica",
    email: "multi_mem@test.com",
    membership_id: "mem-active-current",
    charges: [
      {
        id: "c-mem-1",
        membership_id: "mem-active-current",
        original_amount: 120000,
        due_date: "2026-08-01", // 30 días de mora
        admin_status: "open",
      },
    ],
    asOfDateStr: evalDate,
  });
  assertEqual(res6.total_outstanding, 120000, "Res6 Total Outstanding no duplicado");
  assertEqual(res6.open_charge_count, 1, "Res6 Open Charge Count exacto = 1");

  // Escenario 7: Totalización en Portfolio Summary sin duplicidad
  console.log("--- Escenario 7: portfolio_summary no duplica cartera total ---");
  const portfolioSummary = calculatePortfolioAgingSummary(evalDate, [res1, res2, res3, res4, res5, res6]);
  assertEqual(portfolioSummary.total_associates, 6, "Portfolio total asociados");
  assertEqual(portfolioSummary.total_outstanding, 150000 + 200000 + 200000 + 120000, "Portfolio total outstanding exacto");

  // Escenario 8: Ajuste activo reduce deuda correctamente
  console.log("--- Escenario 8: Ajuste activo (waiver) reduce deuda correctamente ---");
  const adjActive: PureAdjustmentInput[] = [
    {
      id: "adj-waiver-1",
      charge_id: "c-adj-act",
      type: "waiver",
      amount: 50000,
    },
  ];
  const res8 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-8",
    full_name: "Asociado Ajuste Activo",
    email: "adj_active@test.com",
    charges: [
      {
        id: "c-adj-act",
        original_amount: 150000,
        due_date: "2026-08-15",
        admin_status: "open",
      },
    ],
    adjustments: adjActive,
    asOfDateStr: evalDate,
  });
  assertEqual(res8.total_outstanding, 100000, "Res8 Total Outstanding con waiver de 50k");

  // Escenario 9: Reversión de ajuste restaura deuda correctamente
  console.log("--- Escenario 9: Reversión válida de ajuste restaura deuda ---");
  const adjReversed: PureAdjustmentInput[] = [
    {
      id: "adj-waiver-orig",
      charge_id: "c-adj-rev",
      type: "waiver",
      amount: 50000,
    },
    {
      id: "adj-reversal-1",
      charge_id: "c-adj-rev",
      type: "reversal",
      amount: 50000,
      reverses_adjustment_id: "adj-waiver-orig",
    },
  ];
  const res9 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-9",
    full_name: "Asociado Reversión Ajuste",
    email: "adj_rev@test.com",
    charges: [
      {
        id: "c-adj-rev",
        original_amount: 150000,
        due_date: "2026-08-15",
        admin_status: "open",
      },
    ],
    adjustments: adjReversed,
    asOfDateStr: evalDate,
  });
  assertEqual(res9.total_outstanding, 150000, "Res9 Total Outstanding restaurado a 150k tras reversión");

  // Escenario 10: Asignación de pago revertida NO reduce deuda
  console.log("--- Escenario 10: Allocation revertida NO reduce deuda ---");
  const allocReversed: PureAllocationInput[] = [
    {
      id: "alc-rev-1",
      payment_id: "pay-1",
      charge_id: "c-alc-rev",
      amount: 80000,
      reversed_at: "2026-08-20T10:00:00Z",
      payment_status: "completed",
    },
  ];
  const res10 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-10",
    full_name: "Asociado Allocation Revertida",
    email: "alloc_rev@test.com",
    charges: [
      {
        id: "c-alc-rev",
        original_amount: 200000,
        due_date: "2026-08-10",
        admin_status: "open",
      },
    ],
    allocations: allocReversed,
    asOfDateStr: evalDate,
  });
  assertEqual(res10.total_outstanding, 200000, "Res10 Total Outstanding mantiene 200k (allocation revertida ignorada)");

  // Escenario 11: Pago no completado (cancelled/refunded) NO reduce deuda
  console.log("--- Escenario 11: Pago refund/cancelled NO reduce deuda ---");
  const allocUncompleted: PureAllocationInput[] = [
    {
      id: "alc-unc-1",
      payment_id: "pay-refunded",
      charge_id: "c-pay-unc",
      amount: 100000,
      reversed_at: null,
      payment_status: "refunded",
    },
  ];
  const res11 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-11",
    full_name: "Asociado Pago Refunded",
    email: "pay_refunded@test.com",
    charges: [
      {
        id: "c-pay-unc",
        original_amount: 100000,
        due_date: "2026-08-01",
        admin_status: "open",
      },
    ],
    allocations: allocUncompleted,
    asOfDateStr: evalDate,
  });
  assertEqual(res11.total_outstanding, 100000, "Res11 Total Outstanding no se reduce con pago refunded");

  // Escenario 12: Cancelled charge tiene net_debt = 0
  console.log("--- Escenario 12: Cargo anulado (cancelled) tiene net_debt = 0 ---");
  const res12 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-12",
    full_name: "Asociado Cargo Anulado",
    email: "cancelled@test.com",
    charges: [
      {
        id: "c-can-1",
        original_amount: 500000,
        due_date: "2026-01-01", // Mora muy antigua pero anulado
        admin_status: "cancelled",
      },
    ],
    asOfDateStr: evalDate,
  });
  assertEqual(res12.total_outstanding, 0, "Res12 Total Outstanding = 0 para cargo anulado");
  assertEqual(res12.account_status, "AL DÍA", "Res12 Status AL DÍA para cargo anulado");

  // Escenario 13: Allocation con payment_status undefined NO reduce la deuda (estricto como SQL)
  console.log("--- Escenario 13: Allocation con payment_status undefined NO reduce la deuda ---");
  const allocUndefinedStatus: PureAllocationInput[] = [
    {
      id: "alc-undef-1",
      payment_id: "pay-undef",
      charge_id: "c-pay-undef",
      amount: 50000,
      reversed_at: null,
      payment_status: undefined,
    },
  ];
  const res13 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-13",
    full_name: "Asociado Status Undefined",
    email: "status_undef@test.com",
    charges: [
      {
        id: "c-pay-undef",
        original_amount: 100000,
        due_date: "2026-08-01",
        admin_status: "open",
      },
    ],
    allocations: allocUndefinedStatus,
    asOfDateStr: evalDate,
  });
  assertEqual(res13.total_outstanding, 100000, "Res13 Total Outstanding mantiene 100k con payment_status undefined");

  // Escenario 14: Allocation con payment_status completed SÍ reduce la deuda
  console.log("--- Escenario 14: Allocation con payment_status completed SÍ reduce la deuda ---");
  const allocCompletedStatus: PureAllocationInput[] = [
    {
      id: "alc-comp-1",
      payment_id: "pay-completed",
      charge_id: "c-pay-comp",
      amount: 40000,
      reversed_at: null,
      payment_status: "completed",
    },
  ];
  const res14 = calculateAssociateAgingFromMemory({
    associate_id: "assoc-14",
    full_name: "Asociado Status Completed",
    email: "status_completed@test.com",
    charges: [
      {
        id: "c-pay-comp",
        original_amount: 100000,
        due_date: "2026-08-01",
        admin_status: "open",
      },
    ],
    allocations: allocCompletedStatus,
    asOfDateStr: evalDate,
  });
  assertEqual(res14.total_outstanding, 60000, "Res14 Total Outstanding se reduce a 60k con payment_status completed");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS HARDENED (1-14) PASARON CON ÉXITO!");
  console.log("==========================================================");
}

if (require.main === module) {
  runAgingEngineTestSuite();
}
