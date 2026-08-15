import { BreBPaymentStatus } from "./breb-types";

export function isBreBPaymentOrder(
  paymentMethod?: string | null,
  reference?: string | null
): boolean {
  if (paymentMethod && paymentMethod.toLowerCase() === "breb_qr") {
    return true;
  }
  if (reference && reference.toUpperCase().startsWith("SOV-BREB-")) {
    return true;
  }
  return false;
}

export function canSubmitBreBPaymentForVerification(
  status?: string | null
): boolean {
  if (!status) return false;
  return status.toLowerCase() === "pending";
}

export function canApproveBreBPayment(status?: string | null): boolean {
  if (!status) return false;
  const st = status.toLowerCase() as BreBPaymentStatus;
  return st === "pending_verification" || st === "pending";
}

export function canRejectBreBPayment(status?: string | null): boolean {
  if (!status) return false;
  const st = status.toLowerCase() as BreBPaymentStatus;
  return st === "pending_verification" || st === "pending";
}

export function normalizeBreBTransactionReference(
  ref?: string | null
): string | null {
  if (!ref || typeof ref !== "string") return null;
  const clean = ref.trim().toUpperCase();
  return clean.length > 0 ? clean : null;
}

export function createBreBPaymentReference(): string {
  const timestamp = Date.now();
  const randomToken = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
  return `SOV-BREB-${timestamp}-${randomToken}`;
}
