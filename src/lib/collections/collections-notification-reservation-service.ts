import {
  evaluateAutomationRulesForAssociate,
  AutomationChannel,
  AutomationTriggerCode,
  NotificationEventRecord,
} from "./collections-automation-service";
import { EnrichedAssociateAgingItem } from "./collections-dashboard-service";
import { PaymentPromiseItem } from "./collections-queue-service";

export type ReservationOutcome = "RESERVED" | "ALREADY_RESERVED" | "SUPPRESSED";

export interface NewNotificationRecord {
  associate_id: string;
  channel: AutomationChannel;
  automation_type: AutomationTriggerCode;
  reference_date: string;
  status: "QUEUED";
  recipient_email: string | null;
  scheduled_for: string;
}

export interface ReservedNotificationEvent {
  id: string;
  associate_id: string;
  channel: AutomationChannel;
  automation_type: AutomationTriggerCode;
  reference_date: string;
  status: "QUEUED";
  recipient_email: string | null;
  scheduled_for: string;
  created_at: string;
}

export interface ExistingNotificationEvent {
  id?: string;
  associate_id: string;
  channel: AutomationChannel;
  automation_type: AutomationTriggerCode;
  reference_date: string;
  status: string;
  scheduled_for?: string;
}

export type ReservationResult =
  | {
      outcome: "RESERVED";
      event: ReservedNotificationEvent;
    }
  | {
      outcome: "ALREADY_RESERVED";
      existing_event: ExistingNotificationEvent;
    }
  | {
      outcome: "SUPPRESSED";
      reason: string;
    };

export interface NotificationReservationRepository {
  insertQueuedEvent: (record: NewNotificationRecord) => Promise<ReservedNotificationEvent>;
  findExistingEvent: (
    associate_id: string,
    automation_type: AutomationTriggerCode,
    reference_date: string,
    channel: AutomationChannel
  ) => Promise<ExistingNotificationEvent | null>;
}

export interface FreshReservationSnapshot {
  associate: EnrichedAssociateAgingItem;
  promise: PaymentPromiseItem | null;
  history: NotificationEventRecord[];
}

export interface NotificationFreshStateLoader {
  loadFreshState: (associate_id: string) => Promise<FreshReservationSnapshot>;
}

export interface ReservationCandidatePayload {
  associate_id?: string;
  automation_type: AutomationTriggerCode;
  channel: AutomationChannel;
  reference_date: string;
  scheduled_for?: string;
  recipient_email?: string | null;
}

/**
 * Pure Server-Side Notification Event Reservation Service (Fase 4A5.2-E3.1.H2)
 *
 * Exact Precedence & Control-Flow Order:
 * 1. Check Exact Identity Match First: If exact (associate_id, automation_type, reference_date, channel)
 *    already exists in history or repository, return ALREADY_RESERVED immediately (wins over generic suppression).
 * 2. Re-Evaluate Current State using Fresh Server State: Evaluates domain rules (AL DÍA, EN_DISPUTA, ESCALADO, 24h cap).
 * 3. Candidate Drift Validation: Ensures requested (automation_type, reference_date, channel) match freshly evaluated rules.
 * 4. Construct Trusted Record: recipient_email and scheduled_for derived strictly from fresh server-side state.
 * 5. Execute DB Insert: Handles 23505 unique constraint errors cleanly; throws controlled error if missing row.
 */
export async function reserveNotificationEvent(
  freshStateInput: FreshReservationSnapshot | NotificationFreshStateLoader,
  candidatePayload: ReservationCandidatePayload,
  repository: NotificationReservationRepository,
  evalNowIso?: string
): Promise<ReservationResult> {
  const evalNow = evalNowIso || new Date().toISOString();

  // Load fresh state from loader or snapshot
  const freshSnapshot = "loadFreshState" in freshStateInput
    ? await freshStateInput.loadFreshState(candidatePayload.associate_id || "")
    : freshStateInput;

  const freshAssociate = freshSnapshot.associate;
  const freshAssocPromise = freshSnapshot.promise;
  const freshAssocHistory = freshSnapshot.history;
  const associateId = freshAssociate.associate_id;

  // Step 1: EXACT IDENTITY PRECEDENCE CHECK (ALREADY_RESERVED Wins Over Generic Suppression)
  const exactInHistory = freshAssocHistory.find(
    (h) =>
      h.associate_id === associateId &&
      h.automation_type === candidatePayload.automation_type &&
      h.reference_date === candidatePayload.reference_date &&
      h.channel === candidatePayload.channel
  );

  if (exactInHistory) {
    return {
      outcome: "ALREADY_RESERVED",
      existing_event: {
        id: exactInHistory.id,
        associate_id: exactInHistory.associate_id,
        channel: exactInHistory.channel,
        automation_type: exactInHistory.automation_type,
        reference_date: exactInHistory.reference_date,
        status: exactInHistory.status,
        scheduled_for: exactInHistory.scheduled_for,
      },
    };
  }

  const existingInRepo = await repository.findExistingEvent(
    associateId,
    candidatePayload.automation_type,
    candidatePayload.reference_date,
    candidatePayload.channel
  );

  if (existingInRepo) {
    return {
      outcome: "ALREADY_RESERVED",
      existing_event: existingInRepo,
    };
  }

  // Step 2: Re-Evaluate Current State using Fresh Server Snapshot
  const evalResult = evaluateAutomationRulesForAssociate(
    freshAssociate,
    freshAssocPromise,
    freshAssocHistory,
    evalNow
  );

  if (!evalResult.eligible || !evalResult.candidateEvent) {
    return {
      outcome: "SUPPRESSED",
      reason: evalResult.suppressionReason || "UNKNOWN_SUPPRESSION",
    };
  }

  const freshCandidate = evalResult.candidateEvent;

  // Step 3: Strict Candidate Drift Validation
  if (candidatePayload.automation_type !== freshCandidate.automation_type) {
    return {
      outcome: "SUPPRESSED",
      reason: "STALE_AUTOMATION_TYPE_DRIFT",
    };
  }

  if (candidatePayload.reference_date !== freshCandidate.reference_date) {
    return {
      outcome: "SUPPRESSED",
      reason: "STALE_REFERENCE_DATE_DRIFT",
    };
  }

  if (candidatePayload.channel !== freshCandidate.channel) {
    return {
      outcome: "SUPPRESSED",
      reason: "STALE_CHANNEL_DRIFT",
    };
  }

  // Step 4: Construct Trusted QUEUED Record from Fresh State
  const trustedRecipientEmail = freshCandidate.channel === "email" ? (freshAssociate.email || null) : null;

  const newRecord: NewNotificationRecord = {
    associate_id: freshCandidate.associate_id,
    channel: freshCandidate.channel,
    automation_type: freshCandidate.automation_type,
    reference_date: freshCandidate.reference_date,
    status: "QUEUED",
    recipient_email: trustedRecipientEmail,
    scheduled_for: freshCandidate.scheduled_for,
  };

  // Step 5: Idempotent Database Insert with PostgreSQL 23505 Unique Constraint Protection
  try {
    const reserved = await repository.insertQueuedEvent(newRecord);
    return {
      outcome: "RESERVED",
      event: reserved,
    };
  } catch (error: any) {
    const is23505 =
      error?.code === "23505" ||
      error?.message?.includes("23505") ||
      error?.message?.includes("uq_collection_notification_idempotency") ||
      error?.message?.includes("duplicate key value violates unique constraint");

    if (is23505) {
      const existing = await repository.findExistingEvent(
        freshCandidate.associate_id,
        freshCandidate.automation_type,
        freshCandidate.reference_date,
        freshCandidate.channel
      );

      if (!existing) {
        throw new Error("Repository Integrity Violation: Unique constraint 23505 error caught during notification event reservation, but existing event record could not be found.");
      }

      return {
        outcome: "ALREADY_RESERVED",
        existing_event: existing,
      };
    }

    throw error;
  }
}
