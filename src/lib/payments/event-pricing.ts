export interface EventPricingTier {
  name: string;
  presencial?: number | null;
  virtual?: number | null;
}

export interface EventPricingData {
  id: string;
  title: string;
  price?: number | null;
  tiered_pricing?: {
    tiers?: EventPricingTier[];
  } | null;
}

export interface ResolvedRegistrationPrice {
  amount: number;
  category: string;
  modality: "presencial" | "virtual";
  isTiered: boolean;
}

/**
 * Calcula y valida el precio exacto de inscripción server-side
 * basándose en la configuración de precios por categorías y modalidades del evento.
 */
export function resolveEventRegistrationPrice(
  event: EventPricingData,
  requestedCategory?: string | null,
  requestedModality?: string | null
): ResolvedRegistrationPrice {
  const tiers = event.tiered_pricing?.tiers;
  const hasTiers = Array.isArray(tiers) && tiers.length > 0;

  if (hasTiers) {
    const cleanCategory = typeof requestedCategory === "string" ? requestedCategory.trim() : "";
    if (!cleanCategory) {
      throw new Error("Debes seleccionar una categoría de inscripción válida para este evento.");
    }

    const targetCategoryLower = cleanCategory.toLowerCase();
    const tier = tiers.find(
      (t) => t && typeof t.name === "string" && t.name.trim().toLowerCase() === targetCategoryLower
    );

    if (!tier) {
      throw new Error(`La categoría de inscripción seleccionada no es válida para este evento.`);
    }

    const cleanModality = typeof requestedModality === "string" ? requestedModality.trim().toLowerCase() : "";
    if (cleanModality !== "presencial" && cleanModality !== "virtual") {
      throw new Error("Debes seleccionar una modalidad de asistencia válida ('presencial' o 'virtual').");
    }

    const rawPrice = tier[cleanModality];
    if (rawPrice === undefined || rawPrice === null || typeof rawPrice !== "number" || !Number.isFinite(rawPrice) || rawPrice < 0) {
      throw new Error(`La modalidad ${cleanModality} no está disponible para la categoría ${tier.name}.`);
    }

    return {
      amount: Number(rawPrice),
      category: tier.name,
      modality: cleanModality as "presencial" | "virtual",
      isTiered: true,
    };
  }

  // Fallback para eventos de tarifa plana (sin tiered_pricing)
  const amount = Number(event.price);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Este evento no tiene un precio válido configurado.");
  }

  const cleanCategory = typeof requestedCategory === "string" && requestedCategory.trim() ? requestedCategory.trim() : "General";
  const cleanModality = requestedModality === "virtual" ? "virtual" : "presencial";

  return {
    amount,
    category: cleanCategory,
    modality: cleanModality,
    isTiered: false,
  };
}
