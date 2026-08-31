import { AccountStatus } from "../memberships/aging-engine";
import { DerivedCollectionStatus, FollowUpState } from "./types";
import { EnrichedAssociateAgingItem } from "./collections-dashboard-service";
import { PaymentPromiseItem, getBogotaTodayBounds } from "./collections-queue-service";

export type AutomationChannel = "email" | "internal_alert" | "whatsapp" | "sms";

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

export type AutomationEventStatus = "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "FAILED" | "SUPPRESSED" | "DRY_RUN";

export type AutomationSuppressionReason =
  | "SUPPRESSED_ACCOUNT_AL_DIA"
  | "SUPPRESSED_COLLECTION_IN_DISPUTE"
  | "SUPPRESSED_COLLECTION_ESCALATED"
  | "SUPPRESSED_INVALID_CONTACT_EMAIL"
  | "SUPPRESSED_24H_FREQUENCY_CAP"
  | "SUPPRESSED_ACTIVE_PAYMENT_PROMISE"
  | "SUPPRESSED_UNSCHEDULED_PAYMENT_PROMISE"
  | "SUPPRESSED_MILESTONE_ALREADY_REGISTERED"
  | "NO_MATCHING_AUTOMATION_TRIGGER";

export interface NotificationEventRecord {
  id?: string;
  associate_id: string;
  channel: AutomationChannel;
  automation_type: AutomationTriggerCode;
  reference_date: string;
  status: AutomationEventStatus;
  provider_message_id?: string | null;
  recipient_email?: string | null;
  scheduled_for: string;
  sent_at?: string | null;
  attempt_count?: number;
  last_attempt_at?: string | null;
  next_retry_at?: string | null;
  suppression_reason?: AutomationSuppressionReason | string | null;
  failure_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationCandidateEvent {
  associate_id: string;
  channel: AutomationChannel;
  automation_type: AutomationTriggerCode;
  reference_date: string;
  status: "QUEUED" | "DRY_RUN";
  recipient_email?: string | null;
  scheduled_for: string;
  attempt_count: 1;
}

export interface AutomationEvaluationResult {
  eligible: boolean;
  triggerCode?: AutomationTriggerCode | null;
  channel?: AutomationChannel | null;
  candidateEvent?: AutomationCandidateEvent | null;
  suppressionReason?: AutomationSuppressionReason | null;
}

export interface AutomationSuppressionRecord {
  associate_id: string;
  full_name: string;
  account_status: AccountStatus;
  total_outstanding: number;
  collection_status: DerivedCollectionStatus;
  follow_up_state: FollowUpState;
  promise_status: string | null;
  suppression_reason: AutomationSuppressionReason;
  automation_type?: AutomationTriggerCode;
}

export function isValidEmailSyntax(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

export function generateIdempotencyKey(
  associateId: string,
  automationType: AutomationTriggerCode,
  referenceDate: string,
  channel: AutomationChannel
): string {
  return `${associateId}:${automationType}:${referenceDate}:${channel}`;
}

function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function evaluateAutomationRulesForAssociate(
  assoc: EnrichedAssociateAgingItem,
  promiseItem: PaymentPromiseItem | null,
  recentEventsForAssociate: NotificationEventRecord[],
  evalNowIsoStr?: string
): AutomationEvaluationResult {
  const nowMs = evalNowIsoStr ? new Date(evalNowIsoStr).getTime() : Date.now();
  const { todayStr, startOfTodayIso } = getBogotaTodayBounds(evalNowIsoStr);

  // Rule 1: Absolute Suppression for AL DÍA
  if (assoc.account_status === "AL DÍA" || assoc.total_outstanding <= 0) {
    return {
      eligible: false,
      suppressionReason: "SUPPRESSED_ACCOUNT_AL_DIA",
    };
  }

  // Rule 2: Absolute Suppression for Active Disputa or Escalation
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

  // Rule 3: 24-Hour Frequency Cap
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

  // Function helper to check email syntax only for email channel candidates
  const checkEmailOrSuppress = (candidate: AutomationEvaluationResult): AutomationEvaluationResult => {
    if (candidate.eligible && candidate.candidateEvent?.channel === "email") {
      if (!isValidEmailSyntax(assoc.email)) {
        return {
          eligible: false,
          suppressionReason: "SUPPRESSED_INVALID_CONTACT_EMAIL",
        };
      }
    }
    return candidate;
  };

  // Rule 4: Evaluate Payment Promises Precedence (POLICY A: UNSCHEDULED suppresses external outreach)
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
        return checkEmailOrSuppress({
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
        });
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
      return checkEmailOrSuppress({
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
      });
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

  // Rule 5: Evaluate Overdue Debt Reminders with Catch-Up & Explicit Already-Registered Tracking
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

      return checkEmailOrSuppress({
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
      });
    } else if (primaryMilestone && registeredTypesSet.has(primaryMilestone)) {
      return {
        eligible: false,
        suppressionReason: "SUPPRESSED_MILESTONE_ALREADY_REGISTERED",
        triggerCode: primaryMilestone,
      };
    }
  }

  // Rule 6: Evaluate Pre-Due & Due Date Reminders for PENDIENTE status
  if (assoc.account_status === "PENDIENTE" && assoc.oldest_unpaid_due_date) {
    const dueStr = assoc.oldest_unpaid_due_date;
    const pre5Date = addDaysToDateString(dueStr, -5);
    const pre1Date = addDaysToDateString(dueStr, -1);

    if (todayStr === pre5Date && !registeredTypesSet.has("PRE_DUE_5D")) {
      const trigger: AutomationTriggerCode = "PRE_DUE_5D";
      return checkEmailOrSuppress({
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: dueStr,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      });
    }

    if (todayStr === pre1Date && !registeredTypesSet.has("PRE_DUE_1D")) {
      const trigger: AutomationTriggerCode = "PRE_DUE_1D";
      return checkEmailOrSuppress({
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: dueStr,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      });
    }

    if (todayStr === dueStr && !registeredTypesSet.has("DUE_DATE")) {
      const trigger: AutomationTriggerCode = "DUE_DATE";
      return checkEmailOrSuppress({
        eligible: true,
        triggerCode: trigger,
        channel: "email",
        candidateEvent: {
          associate_id: assoc.associate_id,
          channel: "email",
          automation_type: trigger,
          reference_date: dueStr,
          status: "QUEUED",
          recipient_email: assoc.email,
          scheduled_for: startOfTodayIso,
          attempt_count: 1,
        },
      });
    }
  }

  // Fallback: No matching trigger
  return {
    eligible: false,
    suppressionReason: "NO_MATCHING_AUTOMATION_TRIGGER",
  };
}

export interface DryRunSummary {
  totalAssociatesScanned: number;
  totalCandidates: number;
  totalSuppressed: number;
  candidateEvents: AutomationCandidateEvent[];
  suppressedRecords: AutomationSuppressionRecord[];
  evalDate: string;
}

export function runAutomationDryRun(
  associates: EnrichedAssociateAgingItem[],
  promises: PaymentPromiseItem[],
  historyEvents: NotificationEventRecord[],
  evalNowIsoStr?: string
): DryRunSummary {
  const { todayStr } = getBogotaTodayBounds(evalNowIsoStr);

  const promiseMap: Record<string, PaymentPromiseItem> = {};
  for (const p of promises) {
    if (p && p.associate_id) {
      promiseMap[p.associate_id] = p;
    }
  }

  const historyMap: Record<string, NotificationEventRecord[]> = {};
  for (const h of historyEvents) {
    if (h && h.associate_id) {
      if (!historyMap[h.associate_id]) {
        historyMap[h.associate_id] = [];
      }
      historyMap[h.associate_id].push(h);
    }
  }

  const candidateEvents: AutomationCandidateEvent[] = [];
  const suppressedRecords: AutomationSuppressionRecord[] = [];

  for (const assoc of associates) {
    const assocPromise = promiseMap[assoc.associate_id] || null;
    const assocHistory = historyMap[assoc.associate_id] || [];

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
      suppressedRecords.push({
        associate_id: assoc.associate_id,
        full_name: assoc.full_name,
        account_status: assoc.account_status,
        total_outstanding: assoc.total_outstanding,
        collection_status: assoc.collection_status,
        follow_up_state: assoc.follow_up_state,
        promise_status: assocPromise?.promise_status || null,
        suppression_reason: evalResult.suppressionReason || "NO_MATCHING_AUTOMATION_TRIGGER",
        automation_type: evalResult.triggerCode || undefined,
      });
    }
  }

  return {
    totalAssociatesScanned: associates.length,
    totalCandidates: candidateEvents.length,
    totalSuppressed: suppressedRecords.length,
    candidateEvents,
    suppressedRecords,
    evalDate: todayStr,
  };
}
