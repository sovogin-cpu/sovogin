import { SupabaseClient } from "@supabase/supabase-js";

export interface BillingCandidateCharge {
  membershipId: string;
  associateId: string;
  associateName: string;
  planId: string;
  planName: string;
  billingCycleKey: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
  currency: string;
  concept: string;
}

export interface BillingDryRunResult {
  today: string;
  scanned: number;
  eligible: number;
  candidatesCount: number;
  skipped: {
    free: number;
    manual: number;
    inactive_associate: number;
    inactive_plan: number;
    paused_or_terminated: number;
    unsupported_interval: number;
    existing_cycle: number;
    existing_cycle_key: number;
    existing_period_charge: number;
    invalid_anchor_configuration: number;
    future_first_cycle: number;
  };
  candidates: BillingCandidateCharge[];
  catchUpLimitedMembershipsCount: number;
}

export interface BillingExecutionCandidateResult {
  membershipId: string;
  associateId: string;
  billingCycleKey: string;
  periodStart: string;
  amount: number;
  chargeId?: string;
  creditAllocationsCreated?: number;
  status: "CREATED" | "IDEMPOTENT_SKIP" | "FAILED";
  errorCode?: string;
  safeErrorMessage?: string;
}

export interface BillingExecutionResult {
  today: string;
  scanned: number;
  eligible: number;
  candidatesCount: number;
  createdCount: number;
  idempotentSkippedCount: number;
  failedCount: number;
  catchUpLimitedMembershipsCount: number;
  skipped: BillingDryRunResult["skipped"];
  results: BillingExecutionCandidateResult[];
}

/**
 * Returns today's calendar date in YYYY-MM-DD format for America/Bogota timezone.
 */
export function getBogotaTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Generates a deterministic, unique billing cycle key for a given membership and period start date.
 */
export function generateBillingCycleKey(membershipId: string, periodStart: string): string {
  return `SCHED_MEMBERSHIP_${membershipId}_PER_${periodStart}`;
}

/**
 * Pure helper: Adds N months to a YYYY-MM-DD string without UTC offset issues.
 */
export function addMonthsToDateString(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const targetDate = new Date(y, m - 1 + months, d);
  const expectedMonth = (m - 1 + months) % 12;
  const normalizedExpectedMonth = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;

  if (targetDate.getMonth() !== normalizedExpectedMonth) {
    targetDate.setDate(0);
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pure helper: Adds N years to a YYYY-MM-DD string without UTC offset issues.
 */
export function addYearsToDateString(dateStr: string, years: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const targetDate = new Date(y + years, m - 1, d);
  if (targetDate.getMonth() !== m - 1) {
    targetDate.setDate(0);
  }
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pure helper: Subtracts N days from a YYYY-MM-DD string.
 */
export function subtractDaysFromDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const targetDate = new Date(y, m - 1, d - days);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pure helper: Formats standard billing concept text based on unit and periodStart date.
 */
export function formatBillingConcept(unit: string, periodStart: string): string {
  const [y, m] = periodStart.split("-").map(Number);
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  if (unit === "month") {
    const monthName = monthNames[m - 1] || "";
    return `Cuota de Membresía - ${monthName} ${y}`;
  }
  if (unit === "year") {
    return `Cuota de Membresía - Año ${y}`;
  }
  return `Cuota de Membresía - Periodo ${periodStart}`;
}

/**
 * Pure helper: Calculates the first period start date for monthly recurring plans with fixed anchor day.
 * Business Rule:
 * - Day 1..15 (inclusive): first period starts in the same month as billing_anchor_date.
 * - Day 16..end of month: first period starts in the month following billing_anchor_date.
 * The day of period start is set to fixedAnchorDay (clamped if month has fewer days).
 */
export function calculateFirstMonthlyFixedPeriodStart(
  anchorDateStr: string,
  fixedAnchorDay: number
): string {
  const [y, m, d] = anchorDateStr.split("-").map(Number);
  let targetYear = y;
  let targetMonth = m;

  if (d > 15) {
    if (m === 12) {
      targetYear = y + 1;
      targetMonth = 1;
    } else {
      targetMonth = m + 1;
    }
  }

  // Handle clamping if fixedAnchorDay exceeds target month's maximum days (e.g. day 31 in April)
  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const actualDay = Math.min(fixedAnchorDay, maxDays);

  const paddedMonth = String(targetMonth).padStart(2, "0");
  const paddedDay = String(actualDay).padStart(2, "0");

  return `${targetYear}-${paddedMonth}-${paddedDay}`;
}

/**
 * Calculates candidate charges for a single membership up to maxCycles limit with refined idempotency.
 */
export function calculateMembershipCandidates(params: {
  membershipId: string;
  associateId: string;
  associateName: string;
  planId: string;
  planName: string;
  billingMode: string;
  intervalUnit: string | null;
  intervalCount: number | null;
  anchorMode: string;
  fixedAnchorDay: number | null;
  anchorDateStr: string;
  amount: number;
  currency: string;
  todayStr: string;
  existingKeys: Set<string>;
  existingPeriodKeys: Set<string>;
  maxCatchUpCycles?: number;
}): {
  candidates: BillingCandidateCharge[];
  skippedExistingKeyCount: number;
  skippedExistingPeriodCount: number;
  isCatchUpLimited: boolean;
  skipReason?: string;
} {
  const {
    membershipId,
    associateId,
    associateName,
    planId,
    planName,
    billingMode,
    intervalUnit,
    intervalCount,
    anchorMode,
    fixedAnchorDay,
    anchorDateStr,
    amount,
    currency,
    todayStr,
    existingKeys,
    existingPeriodKeys,
    maxCatchUpCycles = 6,
  } = params;

  if (billingMode === "free") {
    return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "free" };
  }
  if (billingMode === "manual") {
    return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "manual" };
  }
  if (billingMode !== "recurring" || amount <= 0) {
    return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "invalid_mode_or_amount" };
  }

  if (
    !intervalUnit ||
    !intervalCount ||
    (intervalUnit !== "month" && intervalUnit !== "year") ||
    intervalCount !== 1
  ) {
    return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "unsupported_interval" };
  }

  let currentStart = anchorDateStr;

  if (
    billingMode === "recurring" &&
    intervalUnit === "month" &&
    intervalCount === 1 &&
    anchorMode === "fixed"
  ) {
    if (!fixedAnchorDay || fixedAnchorDay < 1 || fixedAnchorDay > 31) {
      return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "invalid_anchor_configuration" };
    }
    currentStart = calculateFirstMonthlyFixedPeriodStart(anchorDateStr, fixedAnchorDay);
  } else if (anchorMode === "fixed") {
    if (!fixedAnchorDay || fixedAnchorDay < 1 || fixedAnchorDay > 31) {
      return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "invalid_anchor_configuration" };
    }
    const [y, m] = currentStart.split("-").map(Number);
    const paddedDay = String(fixedAnchorDay).padStart(2, "0");
    const paddedMonth = String(m).padStart(2, "0");
    currentStart = `${y}-${paddedMonth}-${paddedDay}`;
  }

  // If the calculated first period start is after today, it is not due yet.
  if (currentStart > todayStr) {
    return { candidates: [], skippedExistingKeyCount: 0, skippedExistingPeriodCount: 0, isCatchUpLimited: false, skipReason: "future_first_cycle" };
  }

  const candidates: BillingCandidateCharge[] = [];
  let skippedExistingKeyCount = 0;
  let skippedExistingPeriodCount = 0;
  let isCatchUpLimited = false;
  let cycleIndex = 0;
  const maxIterations = 120;

  while (currentStart <= todayStr && cycleIndex < maxIterations) {
    cycleIndex++;

    let nextStart = "";
    if (intervalUnit === "month") {
      nextStart = addMonthsToDateString(currentStart, 1);
    } else {
      nextStart = addYearsToDateString(currentStart, 1);
    }

    const periodEnd = subtractDaysFromDateString(nextStart, 1);
    const dueDate = currentStart;
    const key = generateBillingCycleKey(membershipId, currentStart);

    // Structural keys for refined Level 1 & Level 2 idempotency check
    const periodStartKey = `MEM_${membershipId}_START_${currentStart}`;
    const periodEndKey = `MEM_${membershipId}_END_${periodEnd}`;
    const legacyManualKey = `MEM_${membershipId}_LEGACY_${currentStart}_AMT_${amount}`;

    if (existingKeys.has(key)) {
      skippedExistingKeyCount++;
    } else if (
      existingPeriodKeys.has(periodStartKey) ||
      existingPeriodKeys.has(periodEndKey) ||
      existingPeriodKeys.has(legacyManualKey)
    ) {
      skippedExistingPeriodCount++;
    } else {
      if (candidates.length < maxCatchUpCycles) {
        candidates.push({
          membershipId,
          associateId,
          associateName,
          planId,
          planName,
          billingCycleKey: key,
          periodStart: currentStart,
          periodEnd,
          dueDate,
          amount,
          currency,
          concept: formatBillingConcept(intervalUnit, currentStart),
        });
      } else {
        isCatchUpLimited = true;
      }
    }

    currentStart = nextStart;
  }

  return {
    candidates,
    skippedExistingKeyCount,
    skippedExistingPeriodCount,
    isCatchUpLimited,
  };
}

/**
 * Runs a server-side DRY-RUN simulation across all associate memberships in Supabase DB.
 * DOES NOT INSERT ANY CHARGES OR CALL MUTATIONS.
 */
export async function runBillingDryRun(supabase: SupabaseClient): Promise<BillingDryRunResult> {
  const todayStr = getBogotaTodayDateString();

  // 1. Fetch all associate memberships with associate and plan details
  const { data: memberships, error: memError } = await supabase
    .from("associate_memberships")
    .select(`
      id,
      associate_id,
      billing_anchor_date,
      billing_status,
      associates!inner (
        id,
        full_name,
        status
      ),
      membership_plans (
        id,
        name,
        standard_amount,
        currency,
        billing_mode,
        billing_interval_unit,
        billing_interval_count,
        billing_anchor_mode,
        fixed_anchor_day,
        fixed_anchor_month,
        is_active
      )
    `);

  if (memError || !memberships) {
    throw new Error(`Error al consultar membresías: ${memError?.message || "Sin datos"}`);
  }

  // 2. Fetch all active (non-cancelled) charges to build Level 1 and Level 2 idempotency sets
  const { data: existingCharges, error: chgError } = await supabase
    .from("membership_charges")
    .select("id, associate_id, membership_id, concept, original_amount, period_start, period_end, due_date, source, admin_status, billing_cycle_key")
    .neq("admin_status", "cancelled");

  if (chgError) {
    throw new Error(`Error al consultar cargos existentes: ${chgError.message}`);
  }

  const existingKeys = new Set<string>();
  const existingPeriodKeys = new Set<string>();

  for (const chg of existingCharges || []) {
    if (chg.billing_cycle_key) {
      existingKeys.add(chg.billing_cycle_key);
    }

    if (chg.membership_id) {
      if (chg.period_start) {
        existingPeriodKeys.add(`MEM_${chg.membership_id}_START_${chg.period_start}`);
      }
      if (chg.period_end) {
        existingPeriodKeys.add(`MEM_${chg.membership_id}_END_${chg.period_end}`);
      }

      // Legacy manual charge matching: if period_start is missing, match structurally by membership_id + due_date + original_amount
      if (!chg.period_start && chg.due_date && chg.original_amount) {
        const sourceMatch = chg.source === "manual_admin" || chg.source === "opening_balance";
        const conceptLower = (chg.concept || "").toLowerCase();
        const isInscriptionOrEvent = conceptLower.includes("inscripci") || conceptLower.includes("evento");

        if (sourceMatch && !isInscriptionOrEvent) {
          existingPeriodKeys.add(`MEM_${chg.membership_id}_LEGACY_${chg.due_date}_AMT_${Number(chg.original_amount)}`);
        }
      }
    }
  }

  const scanned = memberships.length;
  let eligible = 0;
  let candidatesCount = 0;
  let catchUpLimitedMembershipsCount = 0;
  const allCandidates: BillingCandidateCharge[] = [];

  const skipped = {
    free: 0,
    manual: 0,
    inactive_associate: 0,
    inactive_plan: 0,
    paused_or_terminated: 0,
    unsupported_interval: 0,
    existing_cycle: 0,
    existing_cycle_key: 0,
    existing_period_charge: 0,
    invalid_anchor_configuration: 0,
    future_first_cycle: 0,
  };

  for (const mem of memberships) {
    const assoc = mem.associates as unknown as { id: string; full_name: string; status: string } | null;
    const plan = mem.membership_plans as unknown as {
      id: string;
      name: string;
      standard_amount: number;
      currency: string;
      billing_mode: string;
      billing_interval_unit: string | null;
      billing_interval_count: number | null;
      billing_anchor_mode: string;
      fixed_anchor_day: number | null;
      fixed_anchor_month: number | null;
      is_active: boolean;
    } | null;

    if (!assoc || assoc.status !== "Activo") {
      skipped.inactive_associate++;
      continue;
    }

    if (mem.billing_status !== "active") {
      skipped.paused_or_terminated++;
      continue;
    }

    if (!plan || !plan.is_active) {
      skipped.inactive_plan++;
      continue;
    }

    if (plan.billing_mode === "free") {
      skipped.free++;
      continue;
    }

    if (plan.billing_mode === "manual") {
      skipped.manual++;
      continue;
    }

    if (
      !plan.billing_interval_unit ||
      !plan.billing_interval_count ||
      (plan.billing_interval_unit !== "month" && plan.billing_interval_unit !== "year") ||
      plan.billing_interval_count !== 1
    ) {
      skipped.unsupported_interval++;
      continue;
    }

    if (!mem.billing_anchor_date) {
      skipped.invalid_anchor_configuration++;
      continue;
    }

    eligible++;

    const res = calculateMembershipCandidates({
      membershipId: mem.id,
      associateId: assoc.id,
      associateName: assoc.full_name || "Asociado",
      planId: plan.id,
      planName: plan.name,
      billingMode: plan.billing_mode,
      intervalUnit: plan.billing_interval_unit,
      intervalCount: plan.billing_interval_count,
      anchorMode: plan.billing_anchor_mode,
      fixedAnchorDay: plan.fixed_anchor_day,
      anchorDateStr: mem.billing_anchor_date,
      amount: Number(plan.standard_amount),
      currency: plan.currency || "COP",
      todayStr,
      existingKeys,
      existingPeriodKeys,
      maxCatchUpCycles: 6,
    });

    if (res.skipReason) {
      if (res.skipReason === "invalid_anchor_configuration") {
        skipped.invalid_anchor_configuration++;
      } else if (res.skipReason === "future_first_cycle") {
        skipped.future_first_cycle++;
      }
      continue;
    }

    skipped.existing_cycle_key += res.skippedExistingKeyCount;
    skipped.existing_period_charge += res.skippedExistingPeriodCount;
    skipped.existing_cycle += (res.skippedExistingKeyCount + res.skippedExistingPeriodCount);

    if (res.isCatchUpLimited) {
      catchUpLimitedMembershipsCount++;
    }

    if (res.candidates.length > 0) {
      candidatesCount += res.candidates.length;
      allCandidates.push(...res.candidates);
    }
  }

  return {
    today: todayStr,
    scanned,
    eligible,
    candidatesCount,
    skipped,
    candidates: allCandidates,
    catchUpLimitedMembershipsCount,
  };
}

/**
 * Runs server-side real billing execution across all associate memberships.
 * Reuses runBillingDryRun to get candidates, then calls public.create_membership_charge RPC for each candidate.
 */
export async function runBillingExecution(supabaseAdmin: SupabaseClient): Promise<BillingExecutionResult> {
  const dryRunResult = await runBillingDryRun(supabaseAdmin);

  let createdCount = 0;
  let idempotentSkippedCount = 0;
  let failedCount = 0;
  const executionResults: BillingExecutionCandidateResult[] = [];

  for (const cand of dryRunResult.candidates) {
    try {
      const { data, error } = await supabaseAdmin.rpc("create_membership_charge", {
        p_associate_id: cand.associateId,
        p_membership_id: cand.membershipId,
        p_concept: cand.concept,
        p_original_amount: cand.amount,
        p_currency: cand.currency,
        p_due_date: cand.dueDate,
        p_period_start: cand.periodStart,
        p_period_end: cand.periodEnd,
        p_billing_cycle_key: cand.billingCycleKey,
        p_source: "system",
      });

      if (error) {
        // Check for 23505 (unique_violation on billing_cycle_key)
        const is23505 =
          error.code === "23505" ||
          (error.message && error.message.toLowerCase().includes("billing_cycle_key")) ||
          (error.message && error.message.toLowerCase().includes("unique constraint"));

        if (is23505) {
          idempotentSkippedCount++;
          executionResults.push({
            membershipId: cand.membershipId,
            associateId: cand.associateId,
            billingCycleKey: cand.billingCycleKey,
            periodStart: cand.periodStart,
            amount: cand.amount,
            status: "IDEMPOTENT_SKIP",
          });
        } else {
          failedCount++;
          executionResults.push({
            membershipId: cand.membershipId,
            associateId: cand.associateId,
            billingCycleKey: cand.billingCycleKey,
            periodStart: cand.periodStart,
            amount: cand.amount,
            status: "FAILED",
            errorCode: error.code || "RPC_ERROR",
            safeErrorMessage: error.message || "Error al invocar create_membership_charge",
          });
        }
      } else if (data && data.success === true) {
        createdCount++;
        executionResults.push({
          membershipId: cand.membershipId,
          associateId: cand.associateId,
          billingCycleKey: cand.billingCycleKey,
          periodStart: cand.periodStart,
          amount: cand.amount,
          chargeId: data.charge_id,
          creditAllocationsCreated: Number(data.credit_allocations_created || 0),
          status: "CREATED",
        });
      } else {
        failedCount++;
        executionResults.push({
          membershipId: cand.membershipId,
          associateId: cand.associateId,
          billingCycleKey: cand.billingCycleKey,
          periodStart: cand.periodStart,
          amount: cand.amount,
          status: "FAILED",
          errorCode: "UNKNOWN_RESPONSE",
          safeErrorMessage: data?.error || "Respuesta no exitosa de create_membership_charge",
        });
      }
    } catch (err: unknown) {
      failedCount++;
      executionResults.push({
        membershipId: cand.membershipId,
        associateId: cand.associateId,
        billingCycleKey: cand.billingCycleKey,
        periodStart: cand.periodStart,
        amount: cand.amount,
        status: "FAILED",
        errorCode: "EXCEPTION",
        safeErrorMessage: err instanceof Error ? err.message : "Excepción no controlada",
      });
    }
  }

  return {
    today: dryRunResult.today,
    scanned: dryRunResult.scanned,
    eligible: dryRunResult.eligible,
    candidatesCount: dryRunResult.candidatesCount,
    createdCount,
    idempotentSkippedCount,
    failedCount,
    catchUpLimitedMembershipsCount: dryRunResult.catchUpLimitedMembershipsCount,
    skipped: dryRunResult.skipped,
    results: executionResults,
  };
}
