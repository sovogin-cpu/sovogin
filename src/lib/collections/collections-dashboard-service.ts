import {
  AssociateAgingResult,
  PortfolioAgingSummary,
} from "../memberships/aging-engine";
import { CollectionAction, DerivedCollectionStatus, FollowUpState } from "./types";
import {
  deriveCollectionStatus,
  deriveFollowUpState,
  sortCollectionActionsDeterministically,
} from "./collections-service";

export interface EnrichedAssociateAgingItem extends AssociateAgingResult {
  collection_status: DerivedCollectionStatus;
  follow_up_state: FollowUpState;
  latest_collection_action: CollectionAction | null;
}

export interface CollectionsDashboardFilterOptions {
  search?: string;
  accountStatusFilter?: string;
  agingBucketFilter?: string;
  collectionStatusFilter?: string;
  sortOption?: string;
}

/**
 * Pure Helper: Calculates total overdue debt strictly from summary buckets.
 * Formula: days_1_30 + days_31_60 + days_61_90 + days_91_120 + days_over_120.
 */
export function getOverduePortfolioAmount(
  summary: PortfolioAgingSummary | null | undefined
): number {
  if (!summary) return 0;
  return (
    Number(summary.days_1_30 || 0) +
    Number(summary.days_31_60 || 0) +
    Number(summary.days_61_90 || 0) +
    Number(summary.days_91_120 || 0) +
    Number(summary.days_over_120 || 0)
  );
}

/**
 * Pure Helper: Enriches Associate Aging results with collection interaction status,
 * follow-up state, and latest action deterministically.
 */
export function enrichAssociatesWithCollectionsStatus(
  rawAssociates: AssociateAgingResult[] = [],
  actionsByAssociateId: Record<string, CollectionAction[]> = {},
  evalNowIsoStr?: string
): EnrichedAssociateAgingItem[] {
  return rawAssociates.map((assoc) => {
    const assocActions = actionsByAssociateId[assoc.associate_id] || [];
    const sortedActions = sortCollectionActionsDeterministically(assocActions);
    const latestAction = sortedActions.length > 0 ? sortedActions[0] : null;

    const collection_status = deriveCollectionStatus(
      assoc.account_status,
      sortedActions
    );
    const follow_up_state = deriveFollowUpState(sortedActions, evalNowIsoStr);

    return {
      ...assoc,
      collection_status,
      follow_up_state,
      latest_collection_action: latestAction,
    };
  });
}

/**
 * Pure Helper: Applies multi-criteria filtering and deterministic sorting.
 */
export function filterAndSortEnrichedAssociates(
  associates: EnrichedAssociateAgingItem[] = [],
  options: CollectionsDashboardFilterOptions = {}
): EnrichedAssociateAgingItem[] {
  const search = options.search?.trim().toLowerCase() || "";
  const accountStatusFilter = options.accountStatusFilter || "ALL";
  const agingBucketFilter = options.agingBucketFilter || "ALL";
  const collectionStatusFilter = options.collectionStatusFilter || "ALL";
  const sortOption = options.sortOption || "dpd_desc";

  const filtered = associates.filter((item) => {
    // 1. Text Search (full_name, email, document_number)
    if (search) {
      const nameMatch = item.full_name.toLowerCase().includes(search);
      const emailMatch = item.email.toLowerCase().includes(search);
      const docMatch = item.document_number
        ? item.document_number.toLowerCase().includes(search)
        : false;

      if (!nameMatch && !emailMatch && !docMatch) {
        return false;
      }
    }

    // 2. Financial Account Status Filter
    if (
      accountStatusFilter !== "ALL" &&
      item.account_status !== accountStatusFilter
    ) {
      return false;
    }

    // 3. Aging Bucket Filter
    if (
      agingBucketFilter !== "ALL" &&
      item.aging_bucket !== agingBucketFilter
    ) {
      return false;
    }

    // 4. Collection Operational Status Filter
    if (
      collectionStatusFilter !== "ALL" &&
      item.collection_status !== collectionStatusFilter
    ) {
      return false;
    }

    return true;
  });

  // Deterministic Sorting with associate_id ASC tiebreaker
  filtered.sort((a, b) => {
    switch (sortOption) {
      case "outstanding_desc":
        if (b.total_outstanding !== a.total_outstanding) {
          return b.total_outstanding - a.total_outstanding;
        }
        if (b.days_past_due !== a.days_past_due) {
          return b.days_past_due - a.days_past_due;
        }
        return a.associate_id.localeCompare(b.associate_id);

      case "oldest_due_asc":
        if (a.oldest_unpaid_due_date && b.oldest_unpaid_due_date) {
          if (a.oldest_unpaid_due_date !== b.oldest_unpaid_due_date) {
            return a.oldest_unpaid_due_date.localeCompare(
              b.oldest_unpaid_due_date
            );
          }
        } else if (a.oldest_unpaid_due_date) {
          return -1; // Non-null dates come first
        } else if (b.oldest_unpaid_due_date) {
          return 1;
        }
        if (b.days_past_due !== a.days_past_due) {
          return b.days_past_due - a.days_past_due;
        }
        return a.associate_id.localeCompare(b.associate_id);

      case "name_asc":
        const nameCmp = a.full_name.localeCompare(b.full_name);
        if (nameCmp !== 0) return nameCmp;
        return a.associate_id.localeCompare(b.associate_id);

      case "dpd_desc":
      default:
        if (b.days_past_due !== a.days_past_due) {
          return b.days_past_due - a.days_past_due;
        }
        if (b.total_outstanding !== a.total_outstanding) {
          return b.total_outstanding - a.total_outstanding;
        }
        return a.associate_id.localeCompare(b.associate_id);
    }
  });

  return filtered;
}
