import { createDeliveryWorkerClient } from "./delivery-worker-client";
import { SupabaseNotificationDeliveryRepository } from "./delivery-repository-adapter";
import { FakeNotificationDeliveryProvider } from "./fake-delivery-provider";
import { NotificationDeliveryOrchestrator, OrchestratorResult } from "./delivery-orchestrator";
import { NotificationDeliveryProvider } from "./delivery-provider";

export interface WorkerRunnerOptions {
  provider?: NotificationDeliveryProvider;
}

export interface WorkerRunnerResult {
  eventId: string;
  workerId: string;
  status: OrchestratorResult["status"];
  attemptNumber: number | null;
  dispatchCount: number | null;
  providerMessageId: string | null;
  error: string | null;
}

/**
 * Runs notification delivery for a specific event using the authenticated worker identity.
 * Internal application/test function.
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

  // Check 1: Runtime Enablement Check
  if (!runtimeEnabled) {
    throw new Error("WORKER_RUNTIME_DISABLED: Delivery worker runtime is disabled in server environment (DELIVERY_RUNTIME_ENABLED !== 'true')");
  }

  const provider = options?.provider || new FakeNotificationDeliveryProvider();

  // Check 2: Absolute Production FakeProvider Prohibition Guard (Zero Escape Hatches)
  if (isProduction && (provider instanceof FakeNotificationDeliveryProvider || !options?.provider)) {
    throw new Error("DELIVERY_PROVIDER_NOT_CONFIGURED: Production provider missing and FakeProvider is strictly forbidden in production");
  }

  // 1. Authenticate worker identity and obtain client carrying worker JWT
  const { supabase, workerId } = await createDeliveryWorkerClient();

  // 2. Instantiate repository adapter using worker Supabase client
  const repository = new SupabaseNotificationDeliveryRepository(supabase);

  // 3. Instantiate delivery orchestrator
  const orchestrator = new NotificationDeliveryOrchestrator(repository, provider);

  // 4. Run delivery once for specified event
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
