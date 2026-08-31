import {
  evaluateAutomationRulesForAssociate,
  generateIdempotencyKey,
  AutomationChannel,
  AutomationTriggerCode,
  NotificationEventRecord,
} from "./collections-automation-service";
import { EnrichedAssociateAgingItem } from "./collections-dashboard-service";
import { PaymentPromiseItem, getBogotaTodayBounds } from "./collections-queue-service";

export interface AutomationCandidatePreview {
  associate_id: string;
  full_name: string;
  recipient_email: string | null;
  account_status: "AL DÍA" | "PENDIENTE" | "EN MORA";
  total_outstanding: number;
  oldest_unpaid_due_date: string | null;
  days_past_due: number;
  collection_status: string;
  follow_up_state: string;
  promise_status?: string | null;
  automation_type: AutomationTriggerCode;
  channel: AutomationChannel;
  reference_date: string;
  scheduled_for: string;
  idempotency_key: string;
}

export interface AutomationSuppressionPreview {
  associate_id: string;
  full_name: string;
  suppression_reason: string;
  account_status: string;
  total_outstanding: number;
  days_past_due: number;
  collection_status: string;
}

export interface AutomationDryRunPreview {
  generated_at: string;
  timezone: string;
  eval_date: string;
  total_associates_scanned: number;
  total_candidates: number;
  total_suppressed: number;
  candidate_events: AutomationCandidatePreview[];
  suppressed_events: AutomationSuppressionPreview[];
  summary_by_trigger: Record<string, number>;
  summary_by_suppression: Record<string, number>;
}

export interface DryRunOrchestratorDataSources {
  fetchAssociates: () => Promise<EnrichedAssociateAgingItem[]>;
  fetchPromises: () => Promise<PaymentPromiseItem[]>;
  fetchNotificationHistory: (associateIds: string[]) => Promise<NotificationEventRecord[]>;
}

/**
 * Pure Server-Side Orchestrator for Collections Automation Dry-Run Preview.
 * Strictly READ-ONLY: 0 inserts, 0 updates, 0 deletes, 0 provider calls.
 */
export async function runAutomationDryRunOrchestrator(
  dataSources: DryRunOrchestratorDataSources,
  evalNowIsoStr?: string
): Promise<AutomationDryRunPreview> {
  const { todayStr } = getBogotaTodayBounds(evalNowIsoStr);
  const nowIso = evalNowIsoStr || new Date().toISOString();

  // Step 1: Batch Data Fetching (Max 3 queries, no N+1)
  const associates = await dataSources.fetchAssociates();
  const associateIds = associates.map((a) => a.associate_id);

  const promises = await dataSources.fetchPromises();
  const history = associateIds.length > 0 ? await dataSources.fetchNotificationHistory(associateIds) : [];

  // Step 2: Index Batch Data in Memory
  const promiseMap: Record<string, PaymentPromiseItem> = {};
  for (const p of promises) {
    promiseMap[p.associate_id] = p;
  }

  const historyMap: Record<string, NotificationEventRecord[]> = {};
  for (const h of history) {
    if (!historyMap[h.associate_id]) {
      historyMap[h.associate_id] = [];
    }
    historyMap[h.associate_id].push(h);
  }

  // Step 3: Domain Evaluation & Preview Generation
  const candidateEvents: AutomationCandidatePreview[] = [];
  const suppressedEvents: AutomationSuppressionPreview[] = [];
  const summaryByTrigger: Record<string, number> = {};
  const summaryBySuppression: Record<string, number> = {};

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
      const candidate = evalResult.candidateEvent;
      const key = generateIdempotencyKey(
        candidate.associate_id,
        candidate.automation_type,
        candidate.reference_date,
        candidate.channel
      );

      const candidatePreview: AutomationCandidatePreview = {
        associate_id: assoc.associate_id,
        full_name: assoc.full_name,
        recipient_email: candidate.recipient_email || assoc.email || null,
        account_status: assoc.account_status,
        total_outstanding: assoc.total_outstanding,
        oldest_unpaid_due_date: assoc.oldest_unpaid_due_date,
        days_past_due: assoc.days_past_due,
        collection_status: assoc.collection_status,
        follow_up_state: assoc.follow_up_state,
        promise_status: assocPromise?.promise_status || null,
        automation_type: candidate.automation_type,
        channel: candidate.channel,
        reference_date: candidate.reference_date,
        scheduled_for: candidate.scheduled_for,
        idempotency_key: key,
      };

      candidateEvents.push(candidatePreview);
      summaryByTrigger[candidate.automation_type] = (summaryByTrigger[candidate.automation_type] || 0) + 1;
    } else {
      const reason = evalResult.suppressionReason || "UNKNOWN_SUPPRESSION";
      suppressedEvents.push({
        associate_id: assoc.associate_id,
        full_name: assoc.full_name,
        suppression_reason: reason,
        account_status: assoc.account_status,
        total_outstanding: assoc.total_outstanding,
        days_past_due: assoc.days_past_due,
        collection_status: assoc.collection_status,
      });

      summaryBySuppression[reason] = (summaryBySuppression[reason] || 0) + 1;
    }
  }

  return {
    generated_at: nowIso,
    timezone: "America/Bogota",
    eval_date: todayStr,
    total_associates_scanned: associates.length,
    total_candidates: candidateEvents.length,
    total_suppressed: suppressedEvents.length,
    candidate_events: candidateEvents,
    suppressed_events: suppressedEvents,
    summary_by_trigger: summaryByTrigger,
    summary_by_suppression: summaryBySuppression,
  };
}
