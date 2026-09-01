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
    eligibilityEvaluator: createDbEligibilityEvaluator(supabase),
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
