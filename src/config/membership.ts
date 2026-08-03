export const NEW_MEMBERSHIP_FEE_COP = 350_200;

export function formatCopAmount(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
