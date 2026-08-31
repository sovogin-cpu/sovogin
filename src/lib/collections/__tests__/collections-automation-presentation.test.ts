import {
  getSuppressionReasonMeta,
  getAutomationTriggerLabel,
  getChannelLabel,
  SUPPRESSION_REASON_MAP,
} from "../collections-automation-presentation";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} - Esperado: ${expected}, Obtenido: ${actual}`);
  }
}

export async function runCollectionsAutomationPresentationTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS EXPANDIDA DE PRESENTACIÓN Y ETIQUETAS (FASE 4A5.2-E2.2.H1) ===");

  // Test 1: Complete coverage of all 9 suppression reason labels
  console.log("--- Test 1: Cobertura completa de las 9 razones de supresión a español legibles ---");
  const knownReasons = [
    "SUPPRESSED_ACCOUNT_AL_DIA",
    "SUPPRESSED_COLLECTION_IN_DISPUTE",
    "SUPPRESSED_COLLECTION_ESCALATED",
    "SUPPRESSED_INVALID_CONTACT_EMAIL",
    "SUPPRESSED_24H_FREQUENCY_CAP",
    "SUPPRESSED_ACTIVE_PAYMENT_PROMISE",
    "SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE",
    "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
    "NO_MATCHING_AUTOMATION_TRIGGER",
  ];

  for (const reason of knownReasons) {
    const meta = getSuppressionReasonMeta(reason);
    assertEqual(typeof meta.label, "string", `Label for ${reason} is string`);
    assertEqual(typeof meta.description, "string", `Description for ${reason} is string`);
    assertEqual(typeof meta.badgeClass, "string", `Badge class for ${reason} is string`);
    assertEqual(meta.label !== reason, true, `Label for ${reason} is translated to human readable Spanish`);
  }

  // Test 2: Specific Spanish Label Verification
  console.log("--- Test 2: Verificación de etiquetas específicas en español ---");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_ACCOUNT_AL_DIA.label, "Cuenta al día", "AL_DIA label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_COLLECTION_IN_DISPUTE.label, "Caso en disputa", "IN_DISPUTE label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_COLLECTION_ESCALATED.label, "Caso escalado", "ESCALATED label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_INVALID_CONTACT_EMAIL.label, "Correo inválido", "INVALID_EMAIL label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_24H_FREQUENCY_CAP.label, "Cap de 24 h activo", "24H_CAP label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_ACTIVE_PAYMENT_PROMISE.label, "Promesa vigente", "ACTIVE_PROMISE label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE.label, "Promesa sin fecha — gestión manual", "UNSCHEDULED_PROMISE label");
  assertEqual(SUPPRESSION_REASON_MAP.SUPPRESSED_MILESTONE_ALREADY_REGISTERED.label, "Hito ya registrado", "ALREADY_REGISTERED label");
  assertEqual(SUPPRESSION_REASON_MAP.NO_MATCHING_AUTOMATION_TRIGGER.label, "Sin disparador elegible", "NO_MATCHING label");

  // Test 3: Fallback for unknown suppression code
  console.log("--- Test 3: Fallback seguro para código de supresión no conocido ---");
  const fallbackMeta = getSuppressionReasonMeta("UNKNOWN_CUSTOM_CODE");
  assertEqual(fallbackMeta.label, "UNKNOWN_CUSTOM_CODE", "Fallback returns code as label");

  // Test 4: Automation Trigger Labels
  console.log("--- Test 4: Etiquetas humanas de todos los disparadores de automatización ---");
  assertEqual(getAutomationTriggerLabel("PRE_DUE_5D"), "Pre-Vencimiento (5 días)", "PRE_DUE_5D");
  assertEqual(getAutomationTriggerLabel("PRE_DUE_1D"), "Pre-Vencimiento (Mañana)", "PRE_DUE_1D");
  assertEqual(getAutomationTriggerLabel("DUE_DATE"), "Día de Vencimiento", "DUE_DATE");
  assertEqual(getAutomationTriggerLabel("OVERDUE_1D"), "Mora Temprana (Día 1)", "OVERDUE_1D");
  assertEqual(getAutomationTriggerLabel("OVERDUE_7D"), "Mora Moderada (Día 7)", "OVERDUE_7D");
  assertEqual(getAutomationTriggerLabel("OVERDUE_15D"), "Mora Grave (Día 15)", "OVERDUE_15D");
  assertEqual(getAutomationTriggerLabel("OVERDUE_30D"), "Mora Crítica (Día 30+)", "OVERDUE_30D");
  assertEqual(getAutomationTriggerLabel("PROMISE_1D"), "Recordatorio Promesa (Mañana)", "PROMISE_1D");
  assertEqual(getAutomationTriggerLabel("PROMISE_DUE"), "Promesa Vence Hoy", "PROMISE_DUE");
  assertEqual(getAutomationTriggerLabel("PROMISE_BROKEN"), "Alerta Promesa Incumplida", "PROMISE_BROKEN");
  assertEqual(getAutomationTriggerLabel(null), "N/A", "Null trigger code label");

  // Test 5: Channel Labels
  console.log("--- Test 5: Etiquetas humanas de todos los canales ---");
  assertEqual(getChannelLabel("email"), "Correo Electrónico", "email");
  assertEqual(getChannelLabel("internal_alert"), "Alerta Interna", "internal_alert");
  assertEqual(getChannelLabel("whatsapp"), "WhatsApp (Inactivo)", "whatsapp");
  assertEqual(getChannelLabel("sms"), "SMS (Inactivo)", "sms");

  // Test 6: Currency COP & Bogotá Time Formatting
  console.log("--- Test 6: Verificación de formateadores de Moneda COP y Zona Horaria Bogotá ---");
  const sampleAmount = 50000;
  const formattedMoney = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(sampleAmount);
  assertEqual(formattedMoney.includes("50.000"), true, "COP formatted string includes 50.000");

  const sampleDateIso = "2026-08-31T17:00:00.000Z";
  const formattedBogotaDate = new Date(sampleDateIso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "medium",
  });
  assertEqual(typeof formattedBogotaDate, "string", "Bogotá formatted date is string");

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS PRUEBAS DE PRESENTACIÓN H1 (1-6) PASARON CON ÉXITO!");
  console.log("==========================================================");
}
