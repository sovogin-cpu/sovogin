import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getMembershipAgingReport, AccountStatus } from "@/lib/memberships/aging-engine";
import { CollectionAction, DerivedCollectionStatus, FollowUpState } from "@/lib/collections/types";
import {
  enrichAssociatesWithCollectionsStatus,
} from "@/lib/collections/collections-dashboard-service";
import {
  getPaymentPromisesMonitor,
} from "@/lib/collections/collections-queue-service";
import {
  runAutomationDryRunOrchestrator,
  DryRunOrchestratorDataSources,
} from "@/lib/collections/collections-automation-orchestrator";
import { NotificationEventRecord } from "@/lib/collections/collections-automation-service";
import {
  AutomationDryRunCandidateDto,
  AutomationDryRunSuppressionDto,
  AutomationDryRunApiResponse,
} from "@/lib/collections/collections-automation-presentation";

// Ensure server-side dynamic evaluation (no static response caching)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Authentication Check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        }
      );
    }

    // 2. Authorization Check (Minimal query, user.id from session only)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        {
          status: 403,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        }
      );
    }

    // 3. Server-side Batch Data Source Adapter (Zero N+1, Pure Read-Only)
    const dataSources: DryRunOrchestratorDataSources = {
      fetchAssociates: async () => {
        const agingReport = await getMembershipAgingReport(supabase);
        const rawAssociates = agingReport.associates || [];
        const uniqueAssociateIds = Array.from(new Set(rawAssociates.map((a) => a.associate_id)));

        const actionsByAssociateId: Record<string, CollectionAction[]> = {};
        if (uniqueAssociateIds.length > 0) {
          const { data: actionsData, error: actionsErr } = await supabase
            .from("collection_actions")
            .select("id, associate_id, action_type, result_status, promised_payment_date, promised_payment_amount, next_follow_up_at, created_at")
            .in("associate_id", uniqueAssociateIds)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true });

          if (actionsErr) {
            console.error("Error al consultar collection_actions:", actionsErr);
            throw new Error("Error al consultar las gestiones de cobranza de la base de datos.");
          }

          if (actionsData) {
            for (const act of actionsData as CollectionAction[]) {
              if (!actionsByAssociateId[act.associate_id]) {
                actionsByAssociateId[act.associate_id] = [];
              }
              actionsByAssociateId[act.associate_id].push(act);
            }
          }
        }

        return enrichAssociatesWithCollectionsStatus(rawAssociates, actionsByAssociateId);
      },
      fetchPromises: async () => {
        const agingReport = await getMembershipAgingReport(supabase);
        const rawAssociates = agingReport.associates || [];
        const uniqueAssociateIds = Array.from(new Set(rawAssociates.map((a) => a.associate_id)));

        const actionsByAssociateId: Record<string, CollectionAction[]> = {};
        if (uniqueAssociateIds.length > 0) {
          const { data: actionsData } = await supabase
            .from("collection_actions")
            .select("id, associate_id, action_type, result_status, promised_payment_date, promised_payment_amount, next_follow_up_at, created_at")
            .in("associate_id", uniqueAssociateIds)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true });

          if (actionsData) {
            for (const act of actionsData as CollectionAction[]) {
              if (!actionsByAssociateId[act.associate_id]) {
                actionsByAssociateId[act.associate_id] = [];
              }
              actionsByAssociateId[act.associate_id].push(act);
            }
          }
        }

        const enriched = enrichAssociatesWithCollectionsStatus(rawAssociates, actionsByAssociateId);
        return getPaymentPromisesMonitor(enriched, actionsByAssociateId);
      },
      fetchNotificationHistory: async (associateIds: string[]) => {
        if (!associateIds || associateIds.length === 0) return [];

        const { data, error } = await supabase
          .from("collection_notification_events")
          .select("id, associate_id, channel, automation_type, reference_date, status, scheduled_for, sent_at")
          .in("associate_id", associateIds);

        if (error) {
          console.warn("Notification history query warning (table might be empty or unmigrated):", error.message);
          return [];
        }

        return (data || []) as NotificationEventRecord[];
      },
    };

    // 4. Run Server-side Pure Orchestrator (0 writes, 0 provider calls)
    const rawPreview = await runAutomationDryRunOrchestrator(dataSources);

    // 5. Serialize into Stable DTO Contract
    const candidateDtos: AutomationDryRunCandidateDto[] = rawPreview.candidate_events.map((c) => ({
      associate_id: c.associate_id,
      full_name: c.full_name,
      recipient_email: c.recipient_email,
      account_status: c.account_status as AccountStatus,
      total_outstanding: c.total_outstanding,
      oldest_unpaid_due_date: c.oldest_unpaid_due_date,
      days_past_due: c.days_past_due,
      collection_status: c.collection_status as DerivedCollectionStatus,
      follow_up_state: c.follow_up_state as FollowUpState,
      promise_status: c.promise_status || null,
      automation_type: c.automation_type,
      channel: c.channel,
      reference_date: c.reference_date,
      scheduled_for: c.scheduled_for,
      idempotency_key: c.idempotency_key,
    }));

    const suppressionDtos: AutomationDryRunSuppressionDto[] = rawPreview.suppressed_events.map((s) => ({
      associate_id: s.associate_id,
      full_name: s.full_name,
      account_status: s.account_status as AccountStatus,
      total_outstanding: s.total_outstanding,
      collection_status: s.collection_status as DerivedCollectionStatus,
      follow_up_state: s.follow_up_state as FollowUpState,
      promise_status: s.promise_status || null,
      suppression_reason: s.suppression_reason,
      trigger_code: s.automation_type || null,
    }));

    const responseBody: AutomationDryRunApiResponse = {
      success: true,
      data: {
        generated_at: rawPreview.generated_at,
        timezone: rawPreview.timezone,
        eval_date: rawPreview.eval_date,
        total_associates_scanned: rawPreview.total_associates_scanned,
        total_candidates: rawPreview.total_candidates,
        total_suppressed: rawPreview.total_suppressed,
        candidate_events: candidateDtos,
        suppressed_events: suppressionDtos,
        summary_by_trigger: rawPreview.summary_by_trigger,
        summary_by_suppression: rawPreview.summary_by_suppression,
      },
    };

    return NextResponse.json(responseBody, {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error: unknown) {
    console.error("Error crítico en GET /api/admin/collections/automation/dry-run:", error);

    return NextResponse.json(
      {
        error: "Error interno al ejecutar la simulación de automatizaciones.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  }
}
