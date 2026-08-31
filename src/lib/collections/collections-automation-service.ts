import { EnrichedAssociateAgingItem } from "./collections-dashboard-service";
import { PaymentPromiseItem } from "./collections-queue-service";
import { getBogotaTodayBounds } from "./collections-queue-service";

export type AutomationTriggerCode =
  | "PRE_DUE_5D"
  | "PRE_DUE_1D"
  | "DUE_DATE"
  | "OVERDUE_1D"
  | "OVERDUE_7D"
  | "OVERDUE_15D"
  | "OVERDUE_30D"
  | "PROMISE_1D"
  | "PROMISE_DUE"
  | "PROMISE_BROKEN";

export type AutomationChannel = "email" | "internal_alert" | "whatsapp" | "sms";

export type AutomationStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "FAILED"
  | "SUPPRESSED"
  | "DRY_RUN";

export interface NotificationEventRecord {
  id?: string;
  associate_id: string;
  channel: AutomationChannel;
  automation_type: AutomationTriggerCode;
  reference_date: string; // YYYY-MM-DD
  status: AutomationStatus;
  provider_message_id?: string | null;
  recipient_email?: string | null;
  scheduled_for: string; // TIMESTAMPTZ
  sent_at?: string | null;
  attempt_count?: number;
  last_attempt_at?: string | null;
  next_retry_at?: string | null;
  suppression_reason?: string | null;
  failure_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationEvaluationResult {
  eligible: boolean;
  triggerCode?: AutomationTriggerCode;
  channel?: AutomationChannel;
  suppressionReason?: string;
  candidateEvent?: NotificationEventRecord;
}

export interface DryRunSummary {
  evalDate: string;
  totalAssociatesScanned: number;
  totalCandidates: number;
  totalSuppressed: number;
  candidateEvents: NotificationEventRecord[];
  suppressedEvents: { associate_id: string; reason: string; triggerCode?: string }[];
}

/**
 * Returns a deterministic composite idempotency key for deduplication.
 */
export function generateIdempotencyKey(
  associateId: string,
  automationType: string,
  referenceDate: string,
  channel: string
): string {
  return `${associateId}:${automationType}:${referenceDate}:${channel}`;
}

/**
 * Validates syntax of an email address.
 */
export function isValidEmailSyntax(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  if (!clean || clean.length < 5) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(clean);
}

/**
 * Helper to add days to a YYYY-MM-DD date string deterministically.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Evaluates operational automation triggers and suppression rules for a single associate.
 */
export function evaluateAutomationRulesForAssociate(
  assoc: EnrichedAssociateAgingItem,
  promiseItem: PaymentPromiseItem | null,
  recentEventsForAssociate: NotificationEventRecord[] = [],
  evalNowIsoStr?: string
): AutomationEvaluationResult {
  const { todayStr, startOfTodayIso } = getBogotaTodayBounds(evalNowIsoStr);
  const nowMs = evalNowIsoStr ? new Date(evalNowIsoStr).getTime() : new Date().getTime();

  // Rule 1: Absolute Suppression for AL DÍA associates
  if (assoc.account_status === "AL DÍA" || assoc.total_outstanding <= 0) {
    return {
      eligible: false,
      suppressionReason: "SUPPRESSED_ACCOUNT_AL_DIA",
    };
  }

  // Rule 2: Absolute Suppression for Dispute or Escalated collection status
  if (assoc.collection_status === "EN_DISPUTA") {
    return {
      eligible: false,
      suppressionReason: "SUPPRESSED_COLLECTION_IN_DISPUTE",
    };
  }

  if (assoc.collection_status === "ESCALADO") {
    return {
      eligible: false,
      suppressionReason: "SUPPRESSED_COLLECTION_ESCALATED",
    };
  }

  // Rule 3: Validate Contact Email
  if (!isValidEmailSyntax(assoc.email)) {
    return {
      eligible: false,
      suppressionReason: "SUPPRESSED_INVALID_CONTACT_EMAIL",
    };
  }

  // Rule 4: 24-Hour Frequency Cap
  // Statuses QUEUED, SENT, DELIVERED, BOUNCED, FAILED consume 24h cap. SUPPRESSED & DRY_RUN do NOT.
  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;

  const hasRecentNotification = recentEventsForAssociate.some((e) => {
    if (e.status === "SUPPRESSED" || e.status === "DRY_RUN") return false;
    const schedMs = new Date(e.scheduled_for).getTime();
    return schedMs > twentyFourHoursAgoMs;
  });

  if (hasRecentNotification) {
    return {
      eligible: false,
      suppressionReason: "SUPPRESSED_24H_FREQUENCY_CAP",
    };
  }

  // Set of all logical notifications already registered in history (QUEUED, SENT, DELIVERED, BOUNCED, FAILED, SUPPRESSED)
  const registeredTypesSet = new Set(
    recentEventsForAssociate
      .filter((e) => e.status !== "DRY_RUN")
      .map((e) => e.automation_type)
  );

  // Rule 5: Evaluate Payment Promises Precedence (POLICY A: UNSCHEDULED suppresses external outreach)
  if (promiseItem && promiseItem.promise_status !== "FULFILLED" && promiseItem.promise_status !== "SUPERSEDED") {
    if (!promiseItem.promised_payment_date || promiseItem.promise_status === "UNSCHEDULED") {
      return {
        eligible: false,
        suppressionReason: "SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE",
      };
    }

    if (promiseItem.promise_status === "ACTIVE") {
      const target1dDate = addDaysToDateString(todayStr, 1);
      if (promiseItem.promised_payment_date === target1dDate) {
        if (registeredTypesSet.has("PROMISE_1D")) {
          return {
            eligible: false,
            suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
            triggerCode: "PROMISE_1D",
          };
        }
        const trigger: AutomationTriggerCode = "PROMISE_1D";
        return {
          eligible: true,
          triggerCode: trigger,
          channel: "email",
          candidateEvent: {
            associate_id: assoc.associate_id,
            channel: "email",
            automation_type: trigger,
            reference_date: promiseItem.promised_payment_date,
            status: "QUEUED",
            recipient_email: assoc.email,
            scheduled_for: startOfTodayIso,
            attempt_count: 1,
          },
        };
      }

      // Future active promise suppresses generic overdue reminders
      return {
        eligible: false,
        suppressionReason: "SUPPRESSED_ACTIVE_PAYMENT_PROMISE",
      };
    }

    if (promiseItem.promise_status === "DUE_TODAY") {
      if (registeredTypesSet.has("PROMISE_DUE")) {
        return {
          eligible: false,
          suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
          triggerCode: "PROMISE_DUE",
        };
      }
      const trigger: AutomationTriggerCode = "PROMISE_DUE";
      const refDate = promiseItem.promised_payment_date;
      return {
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: refDate,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      };
    }

    if (promiseItem.promise_status === "OVERDUE") {
      if (registeredTypesSet.has("PROMISE_BROKEN")) {
        return {
          eligible: false,
          suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
          triggerCode: "PROMISE_BROKEN",
        };
      }
      const trigger: AutomationTriggerCode = "PROMISE_BROKEN";
      const refDate = promiseItem.promised_payment_date;
      return {
        eligible: true,
        triggerCode: trigger,
        channel: "internal_alert",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "internal_alert",
          automation_type: trigger,
          reference_date: refDate,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      };
    }
  }

  // Rule 6: Evaluate Overdue Debt Reminders with Catch-Up & Explicit Already-Registered Tracking
  if (assoc.account_status === "EN MORA" && assoc.days_past_due > 0) {
    let trigger: AutomationTriggerCode | null = null;
    let offsetDays = 0;
    let primaryMilestone: AutomationTriggerCode | null = null;

    if (assoc.days_past_due >= 30) {
      primaryMilestone = "OVERDUE_30D";
      if (!registeredTypesSet.has("OVERDUE_30D")) {
        trigger = "OVERDUE_30D";
        offsetDays = 30;
      }
    } else if (assoc.days_past_due >= 15) {
      primaryMilestone = "OVERDUE_15D";
      if (!registeredTypesSet.has("OVERDUE_15D")) {
        trigger = "OVERDUE_15D";
        offsetDays = 15;
      }
    } else if (assoc.days_past_due >= 7) {
      primaryMilestone = "OVERDUE_7D";
      if (!registeredTypesSet.has("OVERDUE_7D")) {
        trigger = "OVERDUE_7D";
        offsetDays = 7;
      }
    } else if (assoc.days_past_due >= 1) {
      primaryMilestone = "OVERDUE_1D";
      if (!registeredTypesSet.has("OVERDUE_1D")) {
        trigger = "OVERDUE_1D";
        offsetDays = 1;
      }
    }

    if (trigger) {
      const refDate = assoc.oldest_unpaid_due_date
        ? addDaysToDateString(assoc.oldest_unpaid_due_date, offsetDays)
        : todayStr;

      return {
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: refDate,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      };
    } else if (primaryMilestone && registeredTypesSet.has(primaryMilestone)) {
      return {
        eligible: false,
        suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
        triggerCode: primaryMilestone,
      };
    }
  }

  // Rule 7: Evaluate Pre-Due Reminders for PENDIENTE (PRE_DUE_5D, PRE_DUE_1D, DUE_DATE)
  if (assoc.account_status === "PENDIENTE" && assoc.oldest_unpaid_due_date) {
    const dueDate = assoc.oldest_unpaid_due_date;
    const date5d = addDaysToDateString(todayStr, 5);
    const date1d = addDaysToDateString(todayStr, 1);

    if (dueDate === date5d) {
      if (registeredTypesSet.has("PRE_DUE_5D")) {
        return {
          eligible: false,
          suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
          triggerCode: "PRE_DUE_5D",
        };
      }
      const trigger: AutomationTriggerCode = "PRE_DUE_5D";
      return {
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: dueDate,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      };
    }

    if (dueDate === date1d) {
      if (registeredTypesSet.has("PRE_DUE_1D")) {
        return {
          eligible: false,
          suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
          triggerCode: "PRE_DUE_1D",
        };
      }
      const trigger: AutomationTriggerCode = "PRE_DUE_1D";
      return {
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: dueDate,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      };
    }

    if (dueDate === todayStr) {
      if (registeredTypesSet.has("DUE_DATE")) {
        return {
          eligible: false,
          suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
          triggerCode: "DUE_DATE",
        };
      }
      const trigger: AutomationTriggerCode = "DUE_DATE";
      return {
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: dueDate,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      };
    }
  }

  return {
    eligible: false,
    suppressionReason: "NO_MATCHING_AUTOMATION_TRIGGER",
  };
}

/**
 * Runs a pure dry-run simulation across a cohort of associates.
 */
export function runAutomationDryRun(
  associates: EnrichedAssociateAgingItem[] = [],
  promiseItems: PaymentPromiseItem[] = [],
  existingEvents: NotificationEventRecord[] = [],
  evalNowIsoStr?: string
): DryRunSummary {
  const { todayStr } = getBogotaTodayBounds(evalNowIsoStr);
  const promiseMap: Record<string, PaymentPromiseItem> = {};
  promiseItems.forEach((p) => {
    promiseMap[p.associate_id] = p;
  });

  const eventsMapByAssoc: Record<string, NotificationEventRecord[]> = {};
  existingEvents.forEach((e) => {
    if (!eventsMapByAssoc[e.associate_id]) {
      eventsMapByAssoc[e.associate_id] = [];
    }
    eventsMapByAssoc[e.associate_id].push(e);
  });

  const candidateEvents: NotificationEventRecord[] = [];
  const suppressedEvents: { associate_id: string; reason: string; triggerCode?: string }[] = [];

  for (const assoc of associates) {
    const assocPromise = promiseMap[assoc.associate_id] || null;
    const assocHistory = eventsMapByAssoc[assoc.associate_id] || [];

    const evalResult = evaluateAutomationRulesForAssociate(
      assoc,
      assocPromise,
      assocHistory,
      evalNowIsoStr
    );

    if (evalResult.eligible && evalResult.candidateEvent) {
      candidateEvents.push({
        ...evalResult.candidateEvent,
        status: "DRY_RUN",
      });
    } else {
      suppressedEvents.push({
        associate_id: assoc.associate_id,
        reason: evalResult.suppressionReason || "UNKNOWN_SUPPRESSION",
        triggerCode: evalResult.triggerCode,
      });
    }
  }

  return {
    evalDate: todayStr,
    totalAssociatesScanned: associates.length,
    totalCandidates: candidateEvents.length,
    totalSuppressed: suppressedEvents.length,
    candidateEvents,
    suppressedEvents,
  };
}
