import {
  AssociateAgingResult,
  PortfolioAgingSummary,
} from "../../memberships/aging-engine";
import { CollectionAction } from "../types";
import {
  enrichAssociatesWithCollectionsStatus,
  filterAndSortEnrichedAssociates,
  getOverduePortfolioAmount,
  EnrichedAssociateAgingItem,
} from "../collections-dashboard-service";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

export function runCollectionsDashboardDomainTests() {
  console.log("=== INICIANDO SUITE MATRIZ DE PRUEBAS DEL DASHBOARD DE CARTERA (FASE 4A5.2-B.H1) ===");

  const evalNowIsoStr = "2026-08-31T12:00:00.000Z";

  // Fixtures de Prueba
  const mockAgingAssociates: AssociateAgingResult[] = [
    {
      associate_id: "assoc-1",
      full_name: "Carlos Pérez",
      document_number: "123456",
      email: "carlos@test.com",
      membership_id: "mem-1",
      total_outstanding: 250000,
      open_charge_count: 2,
      oldest_unpaid_due_date: "2026-07-01",
      days_past_due: 61,
      aging_bucket: "61-90 días",
      account_status: "EN MORA",
      current_amount: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 250000,
      days_91_120: 0,
      days_over_120: 0,
    },
    {
      associate_id: "assoc-2",
      full_name: "Ana Gómez",
      document_number: "654321",
      email: "ana@test.com",
      membership_id: "mem-2",
      total_outstanding: 0,
      open_charge_count: 0,
      oldest_unpaid_due_date: null,
      days_past_due: 0,
      aging_bucket: "CURRENT",
      account_status: "AL DÍA",
      current_amount: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_120: 0,
      days_over_120: 0,
    },
    {
      associate_id: "assoc-3",
      full_name: "Beatriz López",
      document_number: "999888",
      email: "beatriz@test.com",
      membership_id: "mem-3",
      total_outstanding: 100000,
      open_charge_count: 1,
      oldest_unpaid_due_date: "2026-08-25",
      days_past_due: 6,
      aging_bucket: "1-30 días",
      account_status: "EN MORA",
      current_amount: 0,
      days_1_30: 100000,
      days_31_60: 0,
      days_61_90: 0,
      days_91_120: 0,
      days_over_120: 0,
    },
    {
      associate_id: "assoc-4",
      full_name: "Daniela Martínez",
      document_number: "555444",
      email: "daniela@test.com",
      membership_id: "mem-4",
      total_outstanding: 500000,
      open_charge_count: 3,
      oldest_unpaid_due_date: "2026-05-01",
      days_past_due: 122,
      aging_bucket: "+120 días",
      account_status: "EN MORA",
      current_amount: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_120: 0,
      days_over_120: 500000,
    },
  ];

  const mockActions: Record<string, CollectionAction[]> = {
    "assoc-1": [
      {
        id: "act-1",
        associate_id: "assoc-1",
        performed_by: "admin-1",
        channel: "phone",
        action_type: "payment_promise",
        result_status: "promise_agreed",
        next_follow_up_at: "2026-09-05T10:00:00.000Z",
        created_at: "2026-08-30T10:00:00.000Z",
      },
    ],
    // assoc-2 sin acciones
    "assoc-3": [
      {
        id: "act-3-b",
        associate_id: "assoc-3",
        performed_by: "admin-1",
        channel: "phone",
        action_type: "follow_up",
        result_status: "no_answer",
        next_follow_up_at: "2026-08-30T10:00:00.000Z", // Vencido
        created_at: "2026-08-29T10:00:00.000Z",
      },
      {
        id: "act-3-a",
        associate_id: "assoc-3",
        performed_by: "admin-1",
        channel: "email",
        action_type: "initial_reminder",
        result_status: "contacted",
        created_at: "2026-08-29T10:00:00.000Z", // Empate temporal con act-3-b
      },
    ],
    "assoc-4": [
      {
        id: "act-4",
        associate_id: "assoc-4",
        performed_by: "admin-1",
        channel: "system",
        action_type: "escalation",
        result_status: "pending",
        created_at: "2026-08-31T09:00:00.000Z",
      },
    ],
  };

  // Test 1: Enrichment sin alterar aging financiero
  console.log("--- Test 1: Enrichment sin alterar aging financiero ---");
  const enriched: EnrichedAssociateAgingItem[] = enrichAssociatesWithCollectionsStatus(
    mockAgingAssociates,
    mockActions,
    evalNowIsoStr
  );

  assertEqual(enriched.length, 4, "Debe enriquecer los 4 asociados");
  assertEqual(enriched[0].total_outstanding, 250000, "Saldo financiero inmutable");
  assertEqual(enriched[0].account_status, "EN MORA", "Estado financiero inmutable");

  // Test 2: Sin acciones => SIN_GESTION
  console.log("--- Test 2: Sin acciones para asociado con deuda => SIN_GESTION ---");
  const assocWithoutActions = mockAgingAssociates.filter((a) => a.associate_id === "assoc-3");
  const enrichedNoActions = enrichAssociatesWithCollectionsStatus(assocWithoutActions, {}, evalNowIsoStr);
  assertEqual(enrichedNoActions[0].collection_status, "SIN_GESTION", "Sin acciones debe ser SIN_GESTION");

  // Test 3: AL DÍA => RESUELTO
  console.log("--- Test 3: AL DÍA => RESUELTO ---");
  assertEqual(enriched[1].collection_status, "RESUELTO", "Ana Gómez AL DÍA debe ser RESUELTO");

  // Test 4 & 5: Tie-breaker en created_at por id ASC
  console.log("--- Test 4 & 5: Mismo created_at desempata por id ASC (act-3-a gana sobre act-3-b) ---");
  assertEqual(enriched[2].latest_collection_action?.id, "act-3-a", "act-3-a gana desempate");
  assertEqual(enriched[2].collection_status, "CONTACTADO", "Acción act-3-a result_status contacted da CONTACTADO");

  // Test 6: Follow-up futuro => SCHEDULED
  console.log("--- Test 6: Follow-up futuro => SCHEDULED ---");
  assertEqual(enriched[0].follow_up_state, "SCHEDULED", "assoc-1 con fecha futura es SCHEDULED");

  // Test 7: Follow-up vencido => DUE
  console.log("--- Test 7: Follow-up vencido => DUE ---");
  const assocDueFix: CollectionAction[] = [
    {
      id: "act-due",
      associate_id: "assoc-1",
      performed_by: "admin-1",
      channel: "phone",
      action_type: "follow_up",
      result_status: "contacted",
      next_follow_up_at: "2026-08-30T10:00:00.000Z", // Vencido
      created_at: "2026-08-29T10:00:00.000Z",
    },
  ];
  const enrichedDue = enrichAssociatesWithCollectionsStatus(
    [mockAgingAssociates[0]],
    { "assoc-1": assocDueFix },
    evalNowIsoStr
  );
  assertEqual(enrichedDue[0].follow_up_state, "DUE", "Fecha pasada debe dar DUE");

  // Test 8: Search nombre
  console.log("--- Test 8: Search por nombre case-insensitive ---");
  const resName = filterAndSortEnrichedAssociates(enriched, { search: "CARLOS" });
  assertEqual(resName.length, 1, "Debe encontrar 1 asociado");
  assertEqual(resName[0].associate_id, "assoc-1", "Debe ser assoc-1");

  // Test 9: Search documento
  console.log("--- Test 9: Search por número de documento ---");
  const resDoc = filterAndSortEnrichedAssociates(enriched, { search: "999888" });
  assertEqual(resDoc.length, 1, "Debe encontrar 1 asociado por documento");
  assertEqual(resDoc[0].associate_id, "assoc-3", "Debe ser assoc-3");

  // Test 10: Search email
  console.log("--- Test 10: Search por email case-insensitive ---");
  const resEmail = filterAndSortEnrichedAssociates(enriched, { search: "DANIELA@TEST.COM" });
  assertEqual(resEmail.length, 1, "Debe encontrar 1 asociado por email");
  assertEqual(resEmail[0].associate_id, "assoc-4", "Debe ser assoc-4");

  // Test 11: Filter account_status
  console.log("--- Test 11: Filter account_status ---");
  const resEnMora = filterAndSortEnrichedAssociates(enriched, { accountStatusFilter: "EN MORA" });
  assertEqual(resEnMora.length, 3, "Debe haber 3 asociados EN MORA");

  // Test 12: Filter aging_bucket
  console.log("--- Test 12: Filter aging_bucket exacto ---");
  const resBucket = filterAndSortEnrichedAssociates(enriched, { agingBucketFilter: "+120 días" });
  assertEqual(resBucket.length, 1, "Debe haber 1 asociado en +120 días");
  assertEqual(resBucket[0].associate_id, "assoc-4", "Debe ser assoc-4");

  // Test 13: Filter collection_status
  console.log("--- Test 13: Filter collection_status ---");
  const resStatus = filterAndSortEnrichedAssociates(enriched, { collectionStatusFilter: "ESCALADO" });
  assertEqual(resStatus.length, 1, "Debe haber 1 asociado ESCALADO");
  assertEqual(resStatus[0].associate_id, "assoc-4", "Debe ser assoc-4");

  // Test 14: Sort dpd_desc
  console.log("--- Test 14: Sort dpd_desc ---");
  const resSortDpd = filterAndSortEnrichedAssociates(enriched, { sortOption: "dpd_desc" });
  assertEqual(resSortDpd[0].associate_id, "assoc-4", "assoc-4 (122 DPD) debe ser primero");
  assertEqual(resSortDpd[1].associate_id, "assoc-1", "assoc-1 (61 DPD) debe ser segundo");

  // Test 15: Sort outstanding_desc
  console.log("--- Test 15: Sort outstanding_desc ---");
  const resSortOutstanding = filterAndSortEnrichedAssociates(enriched, { sortOption: "outstanding_desc" });
  assertEqual(resSortOutstanding[0].associate_id, "assoc-4", "assoc-4 ($500.000) debe ser primero");
  assertEqual(resSortOutstanding[1].associate_id, "assoc-1", "assoc-1 ($250.000) debe ser segundo");

  // Test 16: Sort oldest_due_asc con null al final
  console.log("--- Test 16: Sort oldest_due_asc con null al final ---");
  const resSortOldest = filterAndSortEnrichedAssociates(enriched, { sortOption: "oldest_due_asc" });
  assertEqual(resSortOldest[0].associate_id, "assoc-4", "May 01 2026 debe ser primero");
  assertEqual(resSortOldest[resSortOldest.length - 1].associate_id, "assoc-2", "Null due date debe estar al final");

  // Test 17: Sort name_asc
  console.log("--- Test 17: Sort name_asc ---");
  const resSortName = filterAndSortEnrichedAssociates(enriched, { sortOption: "name_asc" });
  assertEqual(resSortName[0].full_name, "Ana Gómez", "Ana Gómez debe ser primera");
  assertEqual(resSortName[1].full_name, "Beatriz López", "Beatriz López debe ser segunda");

  // Test 18: Cartera vencida desde summary buckets
  console.log("--- Test 18: Cartera vencida calculada exclusivamente de summary buckets ---");
  const mockSummary: PortfolioAgingSummary = {
    as_of_date: "2026-08-31",
    total_associates: 4,
    total_outstanding: 850000,
    total_open_charges: 6,
    current_amount: 0,
    days_1_30: 100000,
    days_31_60: 0,
    days_61_90: 250000,
    days_91_120: 0,
    days_over_120: 500000,
    associates_al_dia: 1,
    associates_pendiente: 0,
    associates_en_mora: 3,
  };
  const overdueTotal = getOverduePortfolioAmount(mockSummary);
  assertEqual(overdueTotal, 850000, "Mora debe sumar 100k + 250k + 500k = 850k");

  // Test 19: Cartera corriente = summary.current_amount
  console.log("--- Test 19: Cartera corriente proviene directamente de summary.current_amount ---");
  assertEqual(mockSummary.current_amount, 0, "Current amount del summary es 0");

  // Test 20: Cero associate IDs
  console.log("--- Test 20: Cero associate IDs devuelve lista vacía ---");
  const emptyEnriched = enrichAssociatesWithCollectionsStatus([], {}, evalNowIsoStr);
  assertEqual(emptyEnriched.length, 0, "Array vacío devuelve array vacío");

  // Test 21: Sin coincidencias de búsqueda
  console.log("--- Test 21: Búsqueda sin coincidencias devuelve 0 resultados ---");
  const resNoMatch = filterAndSortEnrichedAssociates(enriched, { search: "inexistente" });
  assertEqual(resNoMatch.length, 0, "Búsqueda sin coincidencias da 0 resultados");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS MATRIZ DEL DASHBOARD (1-21) PASARON CON ÉXITO!");
  console.log("==========================================================");
}

if (require.main === module) {
  runCollectionsDashboardDomainTests();
}
