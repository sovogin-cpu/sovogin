import { Resend } from "resend";
import {
  NotificationDeliveryProvider,
  ProviderDeliveryRequest,
  ProviderDeliveryResponse,
} from "./delivery-provider";

export interface ResendProviderOptions {
  apiKey?: string;
  fromEmail?: string;
  resendClient?: Resend;
}

export class ResendNotificationDeliveryProvider implements NotificationDeliveryProvider {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor(options?: ResendProviderOptions) {
    const apiKey = options?.apiKey || process.env.RESEND_API_KEY;
    this.fromEmail = options?.fromEmail || process.env.EMAIL_FROM || "SOVOGIN <notificaciones@sovogin.com>";

    if (options?.resendClient) {
      this.resend = options.resendClient;
    } else if (apiKey && apiKey.trim() !== "") {
      this.resend = new Resend(apiKey.trim());
    }
  }

  public async dispatch(
    request: ProviderDeliveryRequest
  ): Promise<ProviderDeliveryResponse> {
    const startTime = Date.now();

    if (!this.resend) {
      return {
        outcome: "PERMANENT_FAILURE",
        failureClass: "AUTH_CONFIGURATION",
        errorCode: "RESEND_API_KEY_MISSING",
        errorMessage: "RESEND_API_KEY is not configured in server environment",
        providerStatusCode: 401,
        latencyMs: Date.now() - startTime,
      };
    }

    if (!request.recipient || request.recipient.trim() === "") {
      return {
        outcome: "PERMANENT_FAILURE",
        failureClass: "PAYLOAD_VALIDATION",
        errorCode: "MISSING_RECIPIENT",
        errorMessage: "Recipient email address is required",
        providerStatusCode: 400,
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      // Forward DB provider idempotency key via official Resend SDK request options parameter
      const replyToEmail = request.replyTo || process.env.EMAIL_REPLY_TO || "sovogin@gmail.com";
      const payload: any = {
        from: this.fromEmail,
        to: [request.recipient.trim()],
        subject: request.subject || "Notificación de Membresía SOVOGIN",
        html: request.body || "<p>Aviso importante de membresía SOVOGIN.</p>",
      };

      if (replyToEmail && replyToEmail.trim() !== "") {
        payload.reply_to = replyToEmail.trim();
      }

      const options = {
        idempotencyKey: request.providerIdempotencyKey,
      };

      const { data, error } = await this.resend.emails.send(payload, options);

      const latencyMs = Date.now() - startTime;

      if (error) {
        const errorMsg = error.message || "Unknown error from Resend API";
        const errorName = error.name || "";
        const statusCode = (error as any).statusCode || (error as any).status || 400;
        const errStr = `${errorName} ${errorMsg}`.toLowerCase();

        // Handle Resend 409 Idempotency Errors
        if (statusCode === 409 || errStr.includes("idempotent")) {
          if (errStr.includes("concurrent")) {
            return {
              outcome: "TRANSIENT_FAILURE",
              failureClass: "RATE_LIMITED",
              errorCode: "CONCURRENT_IDEMPOTENT_REQUEST",
              errorMessage: `Resend 409: ${errorMsg}`,
              providerStatusCode: 409,
              latencyMs,
            };
          }
          if (errStr.includes("invalid")) {
            return {
              outcome: "PERMANENT_FAILURE",
              failureClass: "PAYLOAD_VALIDATION",
              errorCode: "INVALID_IDEMPOTENT_REQUEST",
              errorMessage: `Resend 409: ${errorMsg}`,
              providerStatusCode: 409,
              latencyMs,
            };
          }
          return {
            outcome: "TRANSIENT_FAILURE",
            failureClass: "TRANSIENT",
            errorCode: "RESEND_IDEMPOTENCY_CONFLICT",
            errorMessage: `Resend 409: ${errorMsg}`,
            providerStatusCode: 409,
            latencyMs,
          };
        }

        // Classify Resend 429 & 5xx error outcomes
        if (statusCode === 429 || errStr.includes("rate limit")) {
          return {
            outcome: "TRANSIENT_FAILURE",
            failureClass: "RATE_LIMITED",
            errorCode: "RATE_LIMIT_EXCEEDED",
            errorMessage: errorMsg,
            providerStatusCode: 429,
            latencyMs,
          };
        }

        if (statusCode >= 500) {
          return {
            outcome: "TRANSIENT_FAILURE",
            failureClass: "TRANSIENT",
            errorCode: "RESEND_SERVER_ERROR",
            errorMessage: errorMsg,
            providerStatusCode: statusCode,
            latencyMs,
          };
        }

        return {
          outcome: "PERMANENT_FAILURE",
          failureClass: "PAYLOAD_VALIDATION",
          errorCode: "RESEND_PAYLOAD_ERROR",
          errorMessage: errorMsg,
          providerStatusCode: statusCode,
          latencyMs,
        };
      }

      if (data && data.id) {
        return {
          outcome: "SUCCESS",
          providerMessageId: data.id,
          providerStatusCode: 200,
          latencyMs,
        };
      }

      return {
        outcome: "UNKNOWN_OUTCOME",
        failureClass: "UNKNOWN_OUTCOME",
        errorCode: "NO_MESSAGE_ID_RETURNED",
        errorMessage: "Resend returned no error but missing message ID",
        providerStatusCode: 200,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err?.message || String(err);

      // Timeout / network socket errors during HTTP dispatch -> UNKNOWN_OUTCOME
      if (
        errMsg.includes("timeout") ||
        errMsg.includes("ECONNRESET") ||
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("fetch failed") ||
        errMsg.includes("network")
      ) {
        return {
          outcome: "UNKNOWN_OUTCOME",
          failureClass: "UNKNOWN_OUTCOME",
          errorCode: "NETWORK_TRANSPORT_ERROR",
          errorMessage: `Transport error during send: ${errMsg}`,
          providerStatusCode: 504,
          latencyMs,
        };
      }

      return {
        outcome: "PERMANENT_FAILURE",
        failureClass: "PAYLOAD_VALIDATION",
        errorCode: "UNHANDLED_PROVIDER_EXCEPTION",
        errorMessage: errMsg,
        providerStatusCode: 500,
        latencyMs,
      };
    }
  }
}
