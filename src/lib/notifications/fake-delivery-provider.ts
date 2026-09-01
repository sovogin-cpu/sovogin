import {
  NotificationDeliveryProvider,
  ProviderDeliveryRequest,
  ProviderDeliveryResponse,
} from "./delivery-provider";

export class FakeNotificationDeliveryProvider implements NotificationDeliveryProvider {
  public dispatchedRequests: ProviderDeliveryRequest[] = [];
  private nextResponse: ProviderDeliveryResponse | null = null;
  private queuedResponses: ProviderDeliveryResponse[] = [];

  public setNextResponse(response: ProviderDeliveryResponse): void {
    this.nextResponse = response;
  }

  public queueResponses(responses: ProviderDeliveryResponse[]): void {
    this.queuedResponses.push(...responses);
  }

  public simulateSuccess(providerMessageId = "msg_fake_123", latencyMs = 45): void {
    this.setNextResponse({
      outcome: "SUCCESS",
      providerMessageId,
      providerStatusCode: 200,
      latencyMs,
    });
  }

  public simulateTransientError(
    errorCode = "RATE_LIMIT_EXCEEDED",
    errorMessage = "Too many requests to provider",
    statusCode = 429
  ): void {
    this.setNextResponse({
      outcome: "TRANSIENT_FAILURE",
      failureClass: "RATE_LIMITED",
      errorCode,
      errorMessage,
      providerStatusCode: statusCode,
      latencyMs: 120,
    });
  }

  public simulatePermanentError(
    errorCode = "INVALID_RECIPIENT",
    errorMessage = "Recipient email address rejected",
    statusCode = 400
  ): void {
    this.setNextResponse({
      outcome: "PERMANENT_FAILURE",
      failureClass: "PAYLOAD_VALIDATION",
      errorCode,
      errorMessage,
      providerStatusCode: statusCode,
      latencyMs: 80,
    });
  }

  public simulateUnknownOutcome(
    errorCode = "SOCKET_TIMEOUT",
    errorMessage = "Connection reset after HTTP request dispatch",
    statusCode = 504
  ): void {
    this.setNextResponse({
      outcome: "UNKNOWN_OUTCOME",
      failureClass: "UNKNOWN_OUTCOME",
      errorCode,
      errorMessage,
      providerStatusCode: statusCode,
      latencyMs: 5000,
    });
  }

  async dispatch(request: ProviderDeliveryRequest): Promise<ProviderDeliveryResponse> {
    this.dispatchedRequests.push(request);

    if (this.queuedResponses.length > 0) {
      return this.queuedResponses.shift()!;
    }

    if (this.nextResponse) {
      const resp = this.nextResponse;
      this.nextResponse = null;
      return resp;
    }

    // Default fallback: SUCCESS
    return {
      outcome: "SUCCESS",
      providerMessageId: `msg_auto_${Date.now()}_${request.attemptNumber}`,
      providerStatusCode: 200,
      latencyMs: 25,
    };
  }

  public reset(): void {
    this.dispatchedRequests = [];
    this.nextResponse = null;
    this.queuedResponses = [];
  }
}
