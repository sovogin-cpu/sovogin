import { createDeliveryWorkerClient } from "./delivery-worker-client";
import { SupabaseNotificationDeliveryRepository } from "./delivery-repository-adapter";
import { FakeNotificationDeliveryProvider } from "./fake-delivery-provider";
import { ResendNotificationDeliveryProvider } from "./resend-delivery-provider";
import { NotificationDeliveryOrchestrator, OrchestratorResult } from "./delivery-orchestrator";
import { NotificationDeliveryProvider } from "./delivery-provider";

export interface WorkerRunnerOptions {
  provider?: NotificationDeliveryProvider;
}

export interface WorkerRunnerResult {
  eventId: string | null;
  workerId: string;
  status: OrchestratorResult["status"] | "NO_ELIGIBLE_EVENT";
  attemptNumber: number | null;
  dispatchCount: number | null;
  providerMessageId: string | null;
  error: string | null;
}

/**
 * Runs server-controlled single-event notification delivery execution using the authenticated worker identity.
 * Claims the next eligible notification atomically via DB RPC.
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

  // Check 2: Absolute Production FakeProvider Prohibition Guard (Zero Escape Hatches)
  if (isProduction && (!provider || provider instanceof FakeNotificationDeliveryProvider)) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Production provider missing or misconfigured; FakeProvider is strictly forbidden in production");
  }

  if (!provider) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Delivery provider not configured");
  }

  // 1. Authenticate worker identity and obtain client carrying worker JWT
  const { supabase, workerId } = await createDeliveryWorkerClient();

  // 2. Instantiate repository adapter using worker Supabase client
  const repository = new SupabaseNotificationDeliveryRepository(supabase);

  // 3. Atomically claim next eligible event via DB server-controlled selector
  const claim = await repository.claimNextForDelivery();
  if (!claim) {
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

  // 4. Instantiate delivery orchestrator
  const orchestrator = new NotificationDeliveryOrchestrator(repository, provider);

  // 5. Run delivery once for claimed event using pre-claimed token from server selector
  const result = await orchestrator.runDeliveryOnce(claim.event_id, {
    preClaimedToken: claim.claim_token,
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
