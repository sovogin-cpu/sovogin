import { RegistrationOrigin, RegistrationPaymentStatus, RegistrationStatus } from "./types";

export function formatRegistrationOriginLabel(origin?: string | null): string {
  if (!origin) return "Manual";

  switch (origin.toLowerCase() as RegistrationOrigin) {
    case "openpay":
      return "Openpay";
    case "breb":
      return "Bre-B";
    case "invited":
      return "Invitado";
    case "courtesy":
      return "Cortesía";
    case "speaker":
      return "Ponente";
    case "sponsor":
      return "Patrocinador";
    case "admin_manual":
      return "Manual";
    default:
      return origin;
  }
}

export function formatRegistrationStatusLabel(status?: string | null): string {
  if (!status) return "Pendiente";

  switch (status.toLowerCase() as RegistrationStatus) {
    case "confirmed":
      return "Confirmado";
    case "pending":
      return "Pendiente";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function formatRegistrationPaymentStatusLabel(
  paymentStatus?: string | null
): string {
  if (!paymentStatus) return "No especificado";

  switch (paymentStatus.toLowerCase() as RegistrationPaymentStatus) {
    case "paid":
      return "Pagado";
    case "pending":
      return "Pendiente";
    case "not_required":
      return "No requiere pago";
    default:
      return paymentStatus;
  }
}

export function maskDocument(docType?: string | null, docNum?: string | null): string {
  if (!docNum || typeof docNum !== "string") return "-";
  const clean = docNum.trim();
  if (!clean) return "-";
  if (clean.length <= 4) return `${docType ? docType + " - " : ""}${clean}`;
  const masked = "*".repeat(Math.max(0, clean.length - 4)) + clean.slice(-4);
  return `${docType ? docType + " - " : ""}${masked}`;
}

export function isManualRegistrationOrigin(origin?: string | null): boolean {
  if (!origin) return true;
  const normalized = origin.toLowerCase();
  return normalized !== "openpay" && normalized !== "breb";
}

export function cleanEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function formatCopCurrency(amount?: number | null): string {
  const num = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return `$${new Intl.NumberFormat("es-CO").format(num)} COP`;
}
