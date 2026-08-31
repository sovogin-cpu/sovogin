import { CollectionAction } from "./types";
import { EnrichedAssociateAgingItem } from "./collections-dashboard-service";
import { sortCollectionActionsDeterministically } from "./collections-service";

export type FollowUpQueueUrgency = "OVERDUE" | "DUE_TODAY" | "UPCOMING";

export interface FollowUpQueueItem extends EnrichedAssociateAgingItem {
  follow_up_urgency: FollowUpQueueUrgency;
  follow_up_date: string;
}

export type PromiseStatusCategory =
  | "FULFILLED"
  | "SUPERSEDED"
  | "OVERDUE"
  | "DUE_TODAY"
  | "ACTIVE"
  | "UNSCHEDULED";

export interface PaymentPromiseItem extends EnrichedAssociateAgingItem {
  promise_status: PromiseStatusCategory;
  promised_payment_date: string | null;
  promised_payment_amount: number | null;
  promise_action: CollectionAction | null;
}

export interface OperationalKPIs {
  follow_ups_overdue_count: number;
  follow_ups_today_count: number;
  promises_active_count: number;
  promises_overdue_count: number;
  escalated_count: number;
  disputed_count: number;
  sin_gestion_count: number;
}

/**
 * Returns today's date string (YYYY-MM-DD) in America/Bogota timezone.
 */
export function getBogotaTodayDateString(evalNowIsoStr?: string): string {
  const dateObj = evalNowIsoStr ? new Date(evalNowIsoStr) : new Date();
  return dateObj.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // en-CA produces YYYY-MM-DD
}

/**
 * Returns tomorrow's date string (YYYY-MM-DD) in America/Bogota timezone.
 */
export function getBogotaTomorrowDateString(evalNowIsoStr?: string): string {
  const dateObj = evalNowIsoStr ? new Date(evalNowIsoStr) : new Date();
  dateObj.setDate(dateObj.getDate() + 1);
  return dateObj.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

/**
 * Returns half-open ISO bounds [startOfToday, startOfTomorrow) for America/Bogota timezone.
 */
export function getBogotaTodayBounds(evalNowIsoStr?: string): {
  todayStr: string;
  tomorrowStr: string;
  startOfTodayIso: string;
  startOfTomorrowIso: string;
} {
  const todayStr = getBogotaTodayDateString(evalNowIsoStr);

  // Compute tomorrowStr deterministically by adding 1 day in UTC/Bogota
  const todayDateObj = new Date(`${todayStr}T12:00:00-05:00`);
  todayDateObj.setDate(todayDateObj.getDate() + 1);
  const tomorrowStr = todayDateObj.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const startOfTodayIso = new Date(`${todayStr}T00:00:00-05:00`).toISOString();
  const startOfTomorrowIso = new Date(`${tomorrowStr}T00:00:00-05:00`).toISOString();

  return { todayStr, tomorrowStr, startOfTodayIso, startOfTomorrowIso };
}

/**
 * Filters and prioritizes associates in the Follow-Up Queue.
 * Superseding Rule: Only the latest collection action determines active next_follow_up_at.
 * Precedence Rule: AL DÍA associates are suppressed from debt follow-up queues.
 * Boundary Rule: Half-open interval [startOfToday, startOfTomorrow).
 */
export function getFollowUpQueue(
  associates: EnrichedAssociateAgingItem[] = [],
  evalNowIsoStr?: string
): FollowUpQueueItem[] {
  const { startOfTodayIso, startOfTomorrowIso } = getBogotaTodayBounds(evalNowIsoStr);
  const queueItems: FollowUpQueueItem[] = [];

  for (const assoc of associates) {
    // Financial AL DÍA associates do NOT have active debt follow-ups
    if (assoc.account_status === "AL DÍA" || assoc.total_outstanding <= 0) {
      continue;
    }

    const latestAction = assoc.latest_collection_action;
    if (!latestAction || !latestAction.next_follow_up_at) {
      continue;
    }

    const followUpIso = new Date(latestAction.next_follow_up_at).toISOString();

    let urgency: FollowUpQueueUrgency = "UPCOMING";
    if (followUpIso < startOfTodayIso) {
      urgency = "OVERDUE";
    } else if (followUpIso >= startOfTodayIso && followUpIso < startOfTomorrowIso) {
      urgency = "DUE_TODAY";
    } else {
      urgency = "UPCOMING";
    }

    queueItems.push({
      ...assoc,
      follow_up_urgency: urgency,
      follow_up_date: latestAction.next_follow_up_at,
    });
  }

  // Prioritization Order:
  // 1. OVERDUE -> DUE_TODAY -> UPCOMING
  // 2. Oldest follow-up date (ASC)
  // 3. Highest outstanding balance (DESC)
  // 4. Highest DPD (DESC)
  // 5. Tiebreaker associate_id (ASC)
  const urgencyWeight = { OVERDUE: 1, DUE_TODAY: 2, UPCOMING: 3 };

  queueItems.sort((a, b) => {
    if (urgencyWeight[a.follow_up_urgency] !== urgencyWeight[b.follow_up_urgency]) {
      return urgencyWeight[a.follow_up_urgency] - urgencyWeight[b.follow_up_urgency];
    }

    const dateA = new Date(a.follow_up_date).getTime();
    const dateB = new Date(b.follow_up_date).getTime();
    if (dateA !== dateB) {
      return dateA - dateB; // Oldest follow-up date first
    }

    if (b.total_outstanding !== a.total_outstanding) {
      return b.total_outstanding - a.total_outstanding;
    }

    if (b.days_past_due !== a.days_past_due) {
      return b.days_past_due - a.days_past_due;
    }

    return a.associate_id.localeCompare(b.associate_id);
  });

  return queueItems;
}

/**
 * Filters and monitors Payment Promises across all associates.
 * Classification: FULFILLED | OVERDUE | DUE_TODAY | ACTIVE | UNSCHEDULED | SUPERSEDED.
 */
export function getPaymentPromisesMonitor(
  associates: EnrichedAssociateAgingItem[] = [],
  actionsByAssociateId: Record<string, CollectionAction[]> = {},
  evalNowIsoStr?: string
): PaymentPromiseItem[] {
  const { todayStr } = getBogotaTodayBounds(evalNowIsoStr);
  const promiseItems: PaymentPromiseItem[] = [];

  for (const assoc of associates) {
    const rawActions = actionsByAssociateId[assoc.associate_id] || [];
    const sortedActions = sortCollectionActionsDeterministically(rawActions);

    // Find all payment promise actions for this associate
    const promiseActions = sortedActions.filter(
      (a) => a.action_type === "payment_promise" || a.result_status === "promise_agreed"
    );

    if (promiseActions.length === 0) {
      continue;
    }

    const latestPromise = promiseActions[0];

    let promise_status: PromiseStatusCategory = "ACTIVE";

    if (assoc.account_status === "AL DÍA" || assoc.total_outstanding <= 0) {
      promise_status = "FULFILLED";
    } else if (!latestPromise.promised_payment_date) {
      promise_status = "UNSCHEDULED";
    } else if (latestPromise.promised_payment_date < todayStr) {
      promise_status = "OVERDUE";
    } else if (latestPromise.promised_payment_date === todayStr) {
      promise_status = "DUE_TODAY";
    } else {
      promise_status = "ACTIVE";
    }

    promiseItems.push({
      ...assoc,
      promise_status,
      promised_payment_date: latestPromise.promised_payment_date ?? null,
      promised_payment_amount: latestPromise.promised_payment_amount ?? null,
      promise_action: latestPromise,
    });
  }

  // Prioritization Order:
  // 1. OVERDUE -> DUE_TODAY -> ACTIVE -> UNSCHEDULED -> FULFILLED -> SUPERSEDED
  // 2. Oldest promised_payment_date ASC (nulls last)
  // 3. Highest promised_payment_amount DESC (nulls last)
  // 4. Tiebreaker associate_id ASC
  const statusWeight = {
    OVERDUE: 1,
    DUE_TODAY: 2,
    ACTIVE: 3,
    UNSCHEDULED: 4,
    FULFILLED: 5,
    SUPERSEDED: 6,
  };

  promiseItems.sort((a, b) => {
    if (statusWeight[a.promise_status] !== statusWeight[b.promise_status]) {
      return statusWeight[a.promise_status] - statusWeight[b.promise_status];
    }

    // Date ASC (older dates first for overdue)
    if (a.promised_payment_date && b.promised_payment_date) {
      if (a.promised_payment_date !== b.promised_payment_date) {
        return a.promised_payment_date.localeCompare(b.promised_payment_date);
      }
    } else if (a.promised_payment_date) {
      return -1;
    } else if (b.promised_payment_date) {
      return 1;
    }

    // Amount DESC
    const amountA = a.promised_payment_amount;
    const amountB = b.promised_payment_amount;
    if (amountA !== null && amountB !== null) {
      if (amountB !== amountA) {
        return amountB - amountA;
      }
    } else if (amountA !== null) {
      return -1;
    } else if (amountB !== null) {
      return 1;
    }

    return a.associate_id.localeCompare(b.associate_id);
  });

  return promiseItems;
}

/**
 * Calculates operational KPIs for dashboard reporting.
 */
export function calculateOperationalKPIs(
  associates: EnrichedAssociateAgingItem[] = [],
  actionsByAssociateId: Record<string, CollectionAction[]> = {},
  evalNowIsoStr?: string
): OperationalKPIs {
  const followUpQueue = getFollowUpQueue(associates, evalNowIsoStr);
  const promiseMonitor = getPaymentPromisesMonitor(associates, actionsByAssociateId, evalNowIsoStr);

  const follow_ups_overdue_count = followUpQueue.filter((i) => i.follow_up_urgency === "OVERDUE").length;
  const follow_ups_today_count = followUpQueue.filter((i) => i.follow_up_urgency === "DUE_TODAY").length;

  const promises_active_count = promiseMonitor.filter(
    (i) => i.promise_status === "ACTIVE" || i.promise_status === "DUE_TODAY" || i.promise_status === "UNSCHEDULED"
  ).length;
  const promises_overdue_count = promiseMonitor.filter((i) => i.promise_status === "OVERDUE").length;

  const escalated_count = associates.filter((a) => a.collection_status === "ESCALADO").length;
  const disputed_count = associates.filter((a) => a.collection_status === "EN_DISPUTA").length;
  const sin_gestion_count = associates.filter((a) => a.collection_status === "SIN_GESTION").length;

  return {
    follow_ups_overdue_count,
    follow_ups_today_count,
    promises_active_count,
    promises_overdue_count,
    escalated_count,
    disputed_count,
    sin_gestion_count,
  };
}
