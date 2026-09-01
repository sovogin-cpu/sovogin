import { createDeliveryWorkerClient } from "./delivery-worker-client";
import { SupabaseNotificationDeliveryRepository } from "./delivery-repository-adapter";
import { FakeNotificationDeliveryProvider } from "./fake-delivery-provider";
import { ResendNotificationDeliveryProvider } from "./resend-delivery-provider";
import { NotificationDeliveryOrchestrator, OrchestratorResult } from "./delivery-orchestrator";
import { NotificationDeliveryProvider } from "./delivery-provider";

export interface WorkerRunnerOptions {
  provider?: NotificationDeliveryProvider;
  leaseSeconds?: number;
}

export interface WorkerRunnerResult {
  eventId: string | null;
  workerId: string;
  status: OrchestratorResult["status"] | "NO_ELIGIBLE_EVENT" | "ALREADY_RUNNING" | "DAILY_LIMIT_REACHED";
  attemptNumber: number | null;
  dispatchCount: number | null;
  providerMessageId: string | null;
  error: string | null;
}

export interface BatchWorkerRunnerOptions {
  provider?: NotificationDeliveryProvider;
  maxEventsPerRun?: number;
  maxEmailsPerDay?: number;
  errorStopThreshold?: number;
  deploymentSha?: string;
  leaseSeconds?: number;
}

export interface BatchWorkerRunnerResult {
  success: boolean;
  runId: string | null;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "STOPPED" | "ALREADY_RUNNING" | "DAILY_LIMIT_REACHED" | "NO_WORK";
  claimedCount: number;
  sentCount: number;
  suppressedCount: number;
  transientFailureCount: number;
  permanentFailureCount: number;
  unknownCount: number;
  technicalFailureCount: number;
  stopReason: string | null;
  noWork: boolean;
}

/**
 * Runs server-controlled single-event notification delivery execution using the authenticated worker identity.
 * Acquires shared durable lease and enforces global daily safety cap before claiming.
 */
export async function runNextWorkerDelivery(
  options?: WorkerRunnerOptions
): Promise<WorkerRunnerResult> {
  const isProduction = process.env.NODE_ENV === "production";
  const runtimeEnabled = process.env.DELIVERY_RUNTIME_ENABLED === "true";

  // Check 1: Runtime Enablement Check
  if (!runtimeEnabled) {
    throw new Error("WORKER_RUNTIME_DISABLED: Delivery worker runtime is disabled in server environment (DELIVERY_RUNTIME_ENABLED !== 'true')");
  }

  let provider = options?.provider;
  if (!provider) {
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "") {
      provider = new ResendNotificationDeliveryProvider();
    } else if (!isProduction) {
      provider = new FakeNotificationDeliveryProvider();
    }
  }

  // Check 2: Absolute Production FakeProvider Prohibition Guard
  if (isProduction && (!provider || provider instanceof FakeNotificationDeliveryProvider)) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Production provider missing or misconfigured; FakeProvider is strictly forbidden in production");
  }

  if (!provider) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Delivery provider not configured");
  }

  const maxEmailsPerDay = parseInt(process.env.DELIVERY_MAX_EMAILS_PER_DAY || "10", 10);
  const leaseSeconds = options?.leaseSeconds || 300;
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || "local";

  const { supabase, workerId } = await createDeliveryWorkerClient();
  const repository = new SupabaseNotificationDeliveryRepository(supabase);

  // 1. Record Run Start
  const { data: createdRunId } = await supabase.rpc("record_delivery_run_start", {
    p_source: "manual",
    p_sha: deploymentSha,
  });
  const runId = createdRunId || null;

  if (!runId) {
    throw new Error("WORKER_ERROR: Unable to record delivery run start ID");
  }

  // 2. Acquire Shared Durable Execution Lease (Same lease lock used by cron)
  const { data: leaseAcquired, error: leaseErr } = await supabase.rpc("try_acquire_delivery_scheduler_lease", {
    p_run_id: runId,
    p_lease_seconds: leaseSeconds,
  });

  if (leaseErr || !leaseAcquired) {
    await supabase.rpc("record_delivery_run_finish", {
      p_run_id: runId,
      p_status: "ALREADY_RUNNING",
      p_claimed: 0,
      p_sent: 0,
      p_suppressed: 0,
      p_transient: 0,
      p_permanent: 0,
      p_unknown: 0,
      p_technical: 0,
      p_stop_reason: "CONCURRENCY_LEASE_DENIED",
    });

    return {
      eventId: null,
      workerId,
      status: "ALREADY_RUNNING",
      attemptNumber: null,
      dispatchCount: null,
      providerMessageId: null,
      error: "CONCURRENCY_LEASE_DENIED: Execution already in progress under active lease",
    };
  }

  try {
    // 3. Check Global Daily Safety Cap
    const { data: dailyCount, error: dailyErr } = await supabase.rpc("check_daily_delivery_count");
    if (!dailyErr && typeof dailyCount === "number" && dailyCount >= maxEmailsPerDay) {
      await supabase.rpc("record_delivery_run_finish", {
        p_run_id: runId,
        p_status: "DAILY_LIMIT_REACHED",
        p_claimed: 0,
        p_sent: 0,
        p_suppressed: 0,
        p_transient: 0,
        p_permanent: 0,
        p_unknown: 0,
        p_technical: 0,
        p_stop_reason: "DAILY_SAFETY_CAP_REACHED",
      });

      return {
        eventId: null,
        workerId,
        status: "DAILY_LIMIT_REACHED",
        attemptNumber: null,
        dispatchCount: null,
        providerMessageId: null,
        error: "DAILY_SAFETY_CAP_REACHED: Global daily email delivery cap reached",
      };
    }

    // 4. Atomically claim next eligible event
    const claim = await repository.claimNextForDelivery();
    if (!claim) {
      await supabase.rpc("record_delivery_run_finish", {
        p_run_id: runId,
        p_status: "NO_WORK",
        p_claimed: 0,
        p_sent: 0,
        p_suppressed: 0,
        p_transient: 0,
        p_permanent: 0,
        p_unknown: 0,
        p_technical: 0,
        p_stop_reason: "NO_ELIGIBLE_EVENT",
      });

      return {
        eventId: null,
        workerId,
        status: "NO_ELIGIBLE_EVENT",
        attemptNumber: null,
        dispatchCount: null,
        providerMessageId: null,
        error: null,
      };
    }

    // 5. Run delivery once for claimed event
    const orchestrator = new NotificationDeliveryOrchestrator(repository, provider);
    const result = await orchestrator.runDeliveryOnce(claim.event_id, {
      preClaimedToken: claim.claim_token,
      eligibilityEvaluator: createDbEligibilityEvaluator(supabase, claim.claim_token),
    });

    let runStatus = "SUCCESS";
    if (result.status === "PROCESSED_SUPPRESSED") runStatus = "SUPPRESSED";
    else if (result.status === "PROCESSED_FAILED") runStatus = "FAILED";

    await supabase.rpc("record_delivery_run_finish", {
      p_run_id: runId,
      p_status: runStatus,
      p_claimed: 1,
      p_sent: result.status === "PROCESSED_SUCCESS" ? 1 : 0,
      p_suppressed: result.status === "PROCESSED_SUPPRESSED" ? 1 : 0,
      p_transient: result.status === "PROCESSED_FAILED" ? 1 : 0,
      p_permanent: 0,
      p_unknown: 0,
      p_technical: 0,
      p_stop_reason: result.error,
    });

    return {
      eventId: result.eventId,
      workerId,
      status: result.status,
      attemptNumber: result.attemptNumber,
      dispatchCount: result.dispatchCount,
      providerMessageId: result.providerMessageId,
      error: result.error,
    };
  } finally {
    // 6. Release Lease in Finally Block (Owner check enforced by RPC)
    await supabase.rpc("release_delivery_scheduler_lease", { p_run_id: runId });
  }
}

/**
 * Runs bounded batch notification delivery with durable cross-request lease locking, daily safety cap, error thresholds, and run auditing.
 */
export async function runBatchWorkerDelivery(
  options?: BatchWorkerRunnerOptions
): Promise<BatchWorkerRunnerResult> {
  const isProduction = process.env.NODE_ENV === "production";
  const runtimeEnabled = process.env.DELIVERY_RUNTIME_ENABLED === "true";

  if (!runtimeEnabled) {
    throw new Error("WORKER_RUNTIME_DISABLED: Delivery worker runtime is disabled in server environment (DELIVERY_RUNTIME_ENABLED !== 'true')");
  }

  let provider = options?.provider;
  if (!provider) {
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "") {
      provider = new ResendNotificationDeliveryProvider();
    } else if (!isProduction) {
      provider = new FakeNotificationDeliveryProvider();
    }
  }

  if (isProduction && (!provider || provider instanceof FakeNotificationDeliveryProvider)) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Production provider missing or misconfigured; FakeProvider is strictly forbidden in production");
  }

  if (!provider) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Delivery provider not configured");
  }

  // Parse server-side configurations with conservative defaults (1 / 10 / 1)
  let rawMaxEvents = options?.maxEventsPerRun !== undefined ? options.maxEventsPerRun : parseInt(process.env.DELIVERY_MAX_EVENTS_PER_RUN || "1", 10);
  if (isNaN(rawMaxEvents) || rawMaxEvents < 1) rawMaxEvents = 1;
  const maxEventsPerRun = Math.min(25, rawMaxEvents); // Hard maximum 25

  let rawMaxDaily = options?.maxEmailsPerDay !== undefined ? options.maxEmailsPerDay : parseInt(process.env.DELIVERY_MAX_EMAILS_PER_DAY || "10", 10);
  if (isNaN(rawMaxDaily) || rawMaxDaily < 1) rawMaxDaily = 10;
  const maxEmailsPerDay = rawMaxDaily;

  let rawStopThreshold = options?.errorStopThreshold !== undefined ? options.errorStopThreshold : parseInt(process.env.DELIVERY_ERROR_STOP_THRESHOLD || "1", 10);
  if (isNaN(rawStopThreshold) || rawStopThreshold < 1) rawStopThreshold = 1;
  const errorStopThreshold = rawStopThreshold;

  const leaseSeconds = options?.leaseSeconds || 300;
  const deploymentSha = options?.deploymentSha || process.env.VERCEL_GIT_COMMIT_SHA || "local";

  const { supabase } = await createDeliveryWorkerClient();
  const repository = new SupabaseNotificationDeliveryRepository(supabase);
  const orchestrator = new NotificationDeliveryOrchestrator(repository, provider);

  // 1. Record Run Start to get unique runId
  const { data: createdRunId } = await supabase.rpc("record_delivery_run_start", {
    p_source: "scheduler",
    p_sha: deploymentSha,
  });
  const runId = createdRunId || null;

  if (!runId) {
    throw new Error("SCHEDULER_ERROR: Unable to record delivery run start ID");
  }

  // 2. Acquire Durable Cross-Request Singleton Lease
  const { data: leaseAcquired, error: leaseErr } = await supabase.rpc("try_acquire_delivery_scheduler_lease", {
    p_run_id: runId,
    p_lease_seconds: leaseSeconds,
  });

  if (leaseErr || !leaseAcquired) {
    await supabase.rpc("record_delivery_run_finish", {
      p_run_id: runId,
      p_status: "ALREADY_RUNNING",
      p_claimed: 0,
      p_sent: 0,
      p_suppressed: 0,
      p_transient: 0,
      p_permanent: 0,
      p_unknown: 0,
      p_technical: 0,
      p_stop_reason: "CONCURRENCY_LEASE_DENIED",
    });

    return {
      success: true,
      runId,
      status: "ALREADY_RUNNING",
      claimedCount: 0,
      sentCount: 0,
      suppressedCount: 0,
      transientFailureCount: 0,
      permanentFailureCount: 0,
      unknownCount: 0,
      technicalFailureCount: 0,
      stopReason: "CONCURRENCY_LEASE_DENIED",
      noWork: false,
    };
  }

  try {
    // 3. Check Daily Safety Cap
    const { data: dailyCount, error: dailyErr } = await supabase.rpc("check_daily_delivery_count");
    if (!dailyErr && typeof dailyCount === "number" && dailyCount >= maxEmailsPerDay) {
      await supabase.rpc("record_delivery_run_finish", {
        p_run_id: runId,
        p_status: "DAILY_LIMIT_REACHED",
        p_claimed: 0,
        p_sent: 0,
        p_suppressed: 0,
        p_transient: 0,
        p_permanent: 0,
        p_unknown: 0,
        p_technical: 0,
        p_stop_reason: "DAILY_SAFETY_CAP_REACHED",
      });

      return {
        success: true,
        runId,
        status: "DAILY_LIMIT_REACHED",
        claimedCount: 0,
        sentCount: 0,
        suppressedCount: 0,
        transientFailureCount: 0,
        permanentFailureCount: 0,
        unknownCount: 0,
        technicalFailureCount: 0,
        stopReason: "DAILY_SAFETY_CAP_REACHED",
        noWork: false,
      };
    }

    let claimedCount = 0;
    let sentCount = 0;
    let suppressedCount = 0;
    let transientFailureCount = 0;
    let permanentFailureCount = 0;
    let unknownCount = 0;
    let technicalFailureCount = 0;
    let consecutiveFailures = 0;
    let stopReason: string | null = null;
    let finalStatus: BatchWorkerRunnerResult["status"] = "SUCCESS";

    // 4. Bounded Loop
    for (let i = 0; i < maxEventsPerRun; i++) {
      // Re-verify Daily Cap
      const { data: currentDaily } = await supabase.rpc("check_daily_delivery_count");
      if (typeof currentDaily === "number" && currentDaily >= maxEmailsPerDay) {
        stopReason = "DAILY_SAFETY_CAP_REACHED";
        finalStatus = "STOPPED";
        break;
      }

      const claim = await repository.claimNextForDelivery();
      if (!claim) {
        if (claimedCount === 0) {
          finalStatus = "NO_WORK";
        }
        break;
      }

      claimedCount++;

      const result = await orchestrator.runDeliveryOnce(claim.event_id, {
        preClaimedToken: claim.claim_token,
        eligibilityEvaluator: createDbEligibilityEvaluator(supabase, claim.claim_token),
      });

      if (result.status === "PROCESSED_SUCCESS") {
        sentCount++;
        consecutiveFailures = 0;
      } else if (result.status === "PROCESSED_SUPPRESSED") {
        suppressedCount++;
        consecutiveFailures = 0;
      } else if (result.status === "PROCESSED_FAILED") {
        if (result.error?.includes("UNKNOWN_OUTCOME")) {
          unknownCount++;
          stopReason = "UNKNOWN_OUTCOME_OCCURRED";
          finalStatus = "STOPPED";
          break;
        } else {
          technicalFailureCount++;
          consecutiveFailures++;
        }
      }

      if (consecutiveFailures >= errorStopThreshold) {
        stopReason = "ERROR_STOP_THRESHOLD_REACHED";
        finalStatus = "STOPPED";
        break;
      }
    }

    await supabase.rpc("record_delivery_run_finish", {
      p_run_id: runId,
      p_status: finalStatus,
      p_claimed: claimedCount,
      p_sent: sentCount,
      p_suppressed: suppressedCount,
      p_transient: transientFailureCount,
      p_permanent: permanentFailureCount,
      p_unknown: unknownCount,
      p_technical: technicalFailureCount,
      p_stop_reason: stopReason,
    });

    return {
      success: true,
      runId,
      status: finalStatus,
      claimedCount,
      sentCount,
      suppressedCount,
      transientFailureCount,
      permanentFailureCount,
      unknownCount,
      technicalFailureCount,
      stopReason,
      noWork: finalStatus === "NO_WORK",
    };
  } finally {
    // 5. Always Release Lease in Finally Block (Owner check enforced by RPC)
    await supabase.rpc("release_delivery_scheduler_lease", { p_run_id: runId });
  }
}

/**
 * Internal/test-only function for targeted single-event execution.
 */
export async function runWorkerDeliveryForEvent(
  eventId: string,
  options?: WorkerRunnerOptions
): Promise<WorkerRunnerResult> {
  if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
    throw new Error("INVALID_EVENT_ID: eventId parameter must be a non-empty string");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const runtimeEnabled = process.env.DELIVERY_RUNTIME_ENABLED === "true";

  if (!runtimeEnabled) {
    throw new Error("WORKER_RUNTIME_DISABLED: Delivery worker runtime is disabled in server environment (DELIVERY_RUNTIME_ENABLED !== 'true')");
  }

  const provider = options?.provider || (process.env.RESEND_API_KEY ? new ResendNotificationDeliveryProvider() : new FakeNotificationDeliveryProvider());

  if (isProduction && provider instanceof FakeNotificationDeliveryProvider) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Production provider missing and FakeProvider is strictly forbidden in production");
  }

  const { supabase, workerId } = await createDeliveryWorkerClient();
  const repository = new SupabaseNotificationDeliveryRepository(supabase);
  const orchestrator = new NotificationDeliveryOrchestrator(repository, provider);

  const result = await orchestrator.runDeliveryOnce(eventId.trim());

  return {
    eventId: result.eventId,
    workerId,
    status: result.status,
    attemptNumber: result.attemptNumber,
    dispatchCount: result.dispatchCount,
    providerMessageId: result.providerMessageId,
    error: result.error,
  };
}

export function createDbEligibilityEvaluator(supabase: any, claimToken?: string) {
  return async (eventId: string) => {
    if (!claimToken) {
      throw new Error("ELIGIBILITY_EVALUATION_ERROR: claimToken parameter is required for fresh delivery eligibility evaluation");
    }

    const { data, error } = await supabase.rpc("evaluate_notification_delivery_eligibility", {
      p_event_id: eventId,
      p_claim_token: claimToken,
    });

    if (error) {
      throw new Error(`ELIGIBILITY_EVALUATION_ERROR: ${error.message}`);
    }

    const res = Array.isArray(data) ? data[0] : data;

    if (!res || !res.event_exists) {
      throw new Error(`ELIGIBILITY_EVALUATION_ERROR: Event ${eventId} not found or inaccessible`);
    }

    if (!res.fencing_valid) {
      throw new Error(`ELIGIBILITY_FENCING_ERROR: Claim fencing validation failed for event ${eventId} (${res.error_code || "INVALID_CLAIM_TOKEN"})`);
    }

    if (!res.business_eligible) {
      return {
        eligible: false,
        suppressionReason: res.ineligibility_reason || "SUPPRESSED_ACCOUNT_AL_DIA",
      };
    }

    const recipient = res.recipient_email || "bopsoluciones@gmail.com";
    const associateName = res.associate_name || "Asociado";

    const subject = "Recordatorio: Su membresía SOVOGIN presenta un saldo pendiente de pago";
    const body = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e1e8ed;">
    <h2 style="color: #0f172a;">SOVOGIN — Sociedad de Ginecología y Obstetricia</h2>
    <p>Estimado(a) <strong>${associateName}</strong>,</p>
    <p>Le informamos que su membresía en SOVOGIN registra un saldo pendiente de pago correspondiente a su cuota de membresía.</p>
    <p>Para mantener activos sus beneficios y su estado como miembro en nuestra asociación, le invitamos a revisar su estado de cuenta y realizar su pago en nuestro portal oficial:</p>
    <p style="text-align: center; margin: 25px 0;">
      <a href="https://sovogin.vercel.app/portal/membresia" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver Estado de Cuenta y Pagar</a>
    </p>
    <p style="font-size: 14px; color: #64748b;">Si tiene dudas o requiere asistencia con su pago, puede responder directamente a este correo o contactarnos en <a href="mailto:sovogin@gmail.com">sovogin@gmail.com</a>.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;">
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sociedad de Ginecología y Obstetricia — SOVOGIN<br>https://sovogin.vercel.app</p>
  </div>
</body>
</html>`;

    return {
      eligible: true,
      recipient,
      channel: res.channel || "email",
      subject,
      body,
    };
  };
}
