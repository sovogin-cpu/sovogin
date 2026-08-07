import {
  Registration,
  RegistrationCheckInMethod,
  RegistrationOrigin,
  RegistrationPaymentStatus,
  RegistrationStatus,
  RegistrationStatsData,
} from "./types";

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

export function formatRegistrationCheckInMethodLabel(
  method?: string | null
): string {
  if (!method) return "—";

  switch (method.toLowerCase() as RegistrationCheckInMethod) {
    case "manual":
      return "Manual";
    case "document":
      return "Por Documento";
    case "qr":
      return "Escaneo QR";
    default:
      return method;
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

export function slugifyEventTitle(title?: string): string {
  if (!title) return "todos";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function calculateRegistrationStats(
  registrations: Registration[]
): RegistrationStatsData {
  const stats: RegistrationStatsData = {
    total: registrations.length,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    paid: 0,
    notRequired: 0,
    totalRevenue: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    attendancePercentage: 0,
    byModality: {},
    byCategory: {},
    byOrigin: {},
  };

  for (const r of registrations) {
    // Status counts
    const st = (r.status || "pending").toLowerCase();
    if (st === "confirmed") stats.confirmed++;
    else if (st === "cancelled") stats.cancelled++;
    else stats.pending++;

    // Payment Status counts & revenue
    const pst = (r.payment_status || "pending").toLowerCase();
    if (pst === "paid") {
      stats.paid++;
      if (typeof r.amount === "number" && r.amount > 0) {
        stats.totalRevenue += r.amount;
      }
    } else if (pst === "not_required") {
      stats.notRequired++;
    }

    // Check-in status
    if (r.checked_in_at) {
      stats.checkedIn++;
    } else {
      stats.notCheckedIn++;
    }

    // Modality breakdown
    const modalityKey = (r.modality || "presencial").toLowerCase();
    stats.byModality[modalityKey] = (stats.byModality[modalityKey] || 0) + 1;

    // Category breakdown
    const catKey = (r.category || "Sin Categoría").trim();
    stats.byCategory[catKey] = (stats.byCategory[catKey] || 0) + 1;

    // Origin breakdown
    const originKey = (r.origin || "admin_manual").toLowerCase();
    stats.byOrigin[originKey] = (stats.byOrigin[originKey] || 0) + 1;
  }

  stats.attendancePercentage =
    stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  return stats;
}
