import { AccountStatus } from "../memberships/aging-engine";
import {
  CollectionAction,
  DerivedCollectionStatus,
  FollowUpState,
} from "./types";

/**
 * Sorts collection actions deterministically.
 * Primary: created_at DESC (most recent first)
 * Tiebreaker: id ASC (stable string comparison)
 */
export function sortCollectionActionsDeterministically(
  actions: CollectionAction[]
): CollectionAction[] {
  return [...actions].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();

    if (timeA !== timeB) {
      return timeB - timeA; // Most recent first
    }
    return a.id.localeCompare(b.id); // Stable tiebreaker
  });
}

/**
 * Pure Deterministic Function: Derives operational interaction status.
 * Depends EXCLUSIVELY on accountStatus and the nature/result of the latest action.
 * Does NOT depend on next_follow_up_at.
 */
export function deriveCollectionStatus(
  accountStatus: AccountStatus,
  actions: CollectionAction[] = []
): DerivedCollectionStatus {
  // Rule 1: Financial AL DÍA => RESUELTO
  if (accountStatus === "AL DÍA") {
    return "RESUELTO";
  }

  // Rule 2: No actions => SIN_GESTION
  if (!actions || actions.length === 0) {
    return "SIN_GESTION";
  }

  const sortedActions = sortCollectionActionsDeterministically(actions);
  const latestAction = sortedActions[0];

  // Rule 3: Escalation
  if (latestAction.action_type === "escalation") {
    return "ESCALADO";
  }

  // Rule 4: Dispute
  if (
    latestAction.action_type === "dispute" ||
    latestAction.result_status === "disputed"
  ) {
    return "EN_DISPUTA";
  }

  // Rule 5: Payment Promise
  if (
    latestAction.action_type === "payment_promise" ||
    latestAction.result_status === "promise_agreed"
  ) {
    return "COMPROMISO_PAGO";
  }

  // Rule 6: No Answer
  if (latestAction.result_status === "no_answer") {
    return "SIN_RESPUESTA";
  }

  // Rule 7: Default for all other contacted actions
  return "CONTACTADO";
}

/**
 * Pure Deterministic Function: Derives follow-up agenda state (NONE | SCHEDULED | DUE).
 * Depends EXCLUSIVELY on next_follow_up_at of the latest action and evalNow.
 */
export function deriveFollowUpState(
  actions: CollectionAction[] = [],
  nowIsoStr?: string
): FollowUpState {
  if (!actions || actions.length === 0) {
    return "NONE";
  }

  const sortedActions = sortCollectionActionsDeterministically(actions);
  const latestAction = sortedActions[0];

  if (!latestAction.next_follow_up_at) {
    return "NONE";
  }

  const evalNow = nowIsoStr ? new Date(nowIsoStr) : new Date();
  const followUpTime = new Date(latestAction.next_follow_up_at).getTime();

  if (followUpTime > evalNow.getTime()) {
    return "SCHEDULED";
  }

  return "DUE";
}
