/**
 * SOVOGIN Event Pricing Engine — Version 2
 * Core domain rules for registration type pricing, dual V1/V2 parsing,
 * strict server-authoritative price resolution, and safe legacy normalization.
 */

export const MODALITY_SENTINEL = "registration_type";

export interface EventPricingTierV2 {
  name: string;
  price: number;
}

export interface EventPricingData {
  id?: string;
  title?: string;
  price?: number | null;
  tiered_pricing?: {
    version?: number;
    tiers?: any[];
  } | null;
}

export interface ResolvedRegistrationPrice {
  amount: number;
  category: string;
  modality: string;
  isTiered: boolean;
  isV2?: boolean;
}

export interface NormalizationInspectionResult {
  tiers: EventPricingTierV2[];
  isAmbiguous: boolean;
  ambiguousTiers: string[];
}

/**
 * Inspects legacy V1 or V2 pricing tier arrays for safe normalization into V2 tier structures ({ name, price }).
 * Strict legacy conversion rules:
 * A. p === v → price = p
 * B. p > 0 && v === 0 → price = p
 * C. v > 0 && p === 0 → price = v
 * D. p === 0 && v === 0 → price = 0
 * E. p > 0 && v > 0 && p !== v → AMBIGUOUS LEGACY TIER (flagged for manual review)
 */
export function inspectPricingTiersNormalization(
  tieredPricing?: EventPricingData["tiered_pricing"]
): NormalizationInspectionResult {
  if (!tieredPricing || !Array.isArray(tieredPricing.tiers)) {
    return { tiers: [], isAmbiguous: false, ambiguousTiers: [] };
  }

  const seen = new Set<string>();
  const result: EventPricingTierV2[] = [];
  const ambiguousTiers: string[] = [];

  for (const tier of tieredPricing.tiers) {
    if (!tier || typeof tier.name !== "string") continue;
    const cleanName = tier.name.trim();
    if (!cleanName) continue;

    const lowerName = cleanName.toLowerCase();
    if (seen.has(lowerName)) continue;
    seen.add(lowerName);

    let price = 0;
    if (typeof tier.price === "number" && Number.isFinite(tier.price)) {
      price = tier.price;
    } else {
      const p = typeof tier.presencial === "number" && Number.isFinite(tier.presencial) ? tier.presencial : 0;
      const v = typeof tier.virtual === "number" && Number.isFinite(tier.virtual) ? tier.virtual : 0;

      if (p === v) {
        price = p;
      } else if (p > 0 && v === 0) {
        price = p;
      } else if (v > 0 && p === 0) {
        price = v;
      } else if (p === 0 && v === 0) {
        price = 0;
      } else {
        // Case E: p > 0 && v > 0 && p !== v → Ambiguous legacy tier
        ambiguousTiers.push(cleanName);
        price = p;
      }
    }

    result.push({ name: cleanName, price });
  }

  return {
    tiers: result,
    isAmbiguous: ambiguousTiers.length > 0,
    ambiguousTiers,
  };
}

/**
 * Normalizes legacy V1 or V2 pricing tier arrays into clean V2 tier structures ({ name, price }).
 * Throws an Error if any ambiguous V1 tier (p > 0 && v > 0 && p !== v) is detected to prevent silent auto-conversion.
 */
export function normalizePricingTiersToV2(
  tieredPricing?: EventPricingData["tiered_pricing"]
): EventPricingTierV2[] {
  const inspection = inspectPricingTiersNormalization(tieredPricing);
  if (inspection.isAmbiguous) {
    throw new Error(
      `Este evento tiene precios históricos diferentes para Presencial y Virtual en los tipos: ${inspection.ambiguousTiers.join(", ")}. Revise y convierta manualmente los tipos de inscripción antes de guardar.`
    );
  }
  return inspection.tiers;
}

/**
 * Server-authoritative price resolver for V2 registration types.
 * Accepts a registration type name and resolves the exact configured price.
 */
export function resolveEventRegistrationTypePrice(
  event: EventPricingData,
  requestedType?: string | null
): ResolvedRegistrationPrice {
  const cleanType = typeof requestedType === "string" ? requestedType.trim() : "";
  if (!cleanType) {
    throw new Error("Debe especificar el tipo de inscripción deseado.");
  }

  const tiers = normalizePricingTiersToV2(event.tiered_pricing);
  if (tiers.length === 0) {
    // Direct single price fallback for non-tiered events
    const directPrice = typeof event.price === "number" && Number.isFinite(event.price) ? event.price : 0;
    if (directPrice < 0) {
      throw new Error(`El evento posee un precio inválido configurado (${directPrice}).`);
    }
    return {
      amount: directPrice,
      category: cleanType,
      modality: MODALITY_SENTINEL,
      isTiered: false,
      isV2: true,
    };
  }

  const matchedTier = tiers.find(
    (t) => t.name.toLowerCase() === cleanType.toLowerCase()
  );

  if (!matchedTier) {
    throw new Error(`El tipo de inscripción "${cleanType}" no es válido para este evento.`);
  }

  if (matchedTier.price < 0) {
    throw new Error(`El tipo de inscripción "${matchedTier.name}" tiene un precio inválido configurado (${matchedTier.price}).`);
  }

  return {
    amount: matchedTier.price,
    category: matchedTier.name,
    modality: MODALITY_SENTINEL,
    isTiered: true,
    isV2: true,
  };
}

/**
 * Legacy server price resolver for V1 category + modality (presencial/virtual) requests.
 * Used for backward compatibility with historical payment flows.
 */
export function resolveLegacyEventRegistrationPrice(
  event: EventPricingData,
  requestedCategory?: string | null,
  requestedModality?: string | null
): ResolvedRegistrationPrice {
  const category = typeof requestedCategory === "string" ? requestedCategory.trim() : "General";
  const modality = requestedModality === "virtual" ? "virtual" : "presencial";

  const tieredPricing = event.tiered_pricing;
  if (!tieredPricing || !Array.isArray(tieredPricing.tiers) || tieredPricing.tiers.length === 0) {
    const directPrice = typeof event.price === "number" && Number.isFinite(event.price) ? event.price : 0;
    return {
      amount: directPrice,
      category,
      modality,
      isTiered: false,
      isV2: false,
    };
  }

  const matchedTier = tieredPricing.tiers.find((t: any) => {
    if (!t || typeof t.name !== "string") return false;
    return t.name.trim().toLowerCase() === category.toLowerCase();
  });

  if (!matchedTier) {
    throw new Error(`La categoría "${category}" no es válida para este evento.`);
  }

  const rawAmount = matchedTier[modality];
  const amount = typeof rawAmount === "number" && Number.isFinite(rawAmount) ? rawAmount : 0;

  if (amount < 0) {
    throw new Error(`La tarifa configurada para ${category} (${modality}) es inválida.`);
  }

  return {
    amount,
    category: matchedTier.name,
    modality,
    isTiered: true,
    isV2: false,
  };
}

/**
 * Universal event registration price resolver wrapper.
 * Automatically dispatches to V2 type resolution if event uses V2 pricing
 * or if modality sentinel 'registration_type' is supplied.
 */
export function resolveEventRegistrationPrice(
  event: EventPricingData,
  requestedCategory?: string | null,
  requestedModality?: string | null
): ResolvedRegistrationPrice {
  const isV2 =
    event.tiered_pricing?.version === 2 ||
    requestedModality === MODALITY_SENTINEL ||
    !requestedModality;

  if (isV2) {
    return resolveEventRegistrationTypePrice(event, requestedCategory);
  }

  return resolveLegacyEventRegistrationPrice(event, requestedCategory, requestedModality);
}

/**
 * Calculates the minimum positive registration price across event tiers.
 * Returns 0 if all tiers are free or event has no positive prices.
 */
export function getEventMinimumPositivePrice(event: EventPricingData): number {
  try {
    const inspection = inspectPricingTiersNormalization(event.tiered_pricing);
    const tiers = inspection.tiers;
    if (tiers.length === 0) {
      return typeof event.price === "number" && event.price > 0 ? event.price : 0;
    }

    const positivePrices = tiers.map((t) => t.price).filter((p) => p > 0);
    if (positivePrices.length === 0) return 0;
    return Math.min(...positivePrices);
  } catch {
    return 0;
  }
}

/**
 * Returns true if every registration tier for the event has price = 0.
 */
export function isAllFreeEvent(event: EventPricingData): boolean {
  try {
    const inspection = inspectPricingTiersNormalization(event.tiered_pricing);
    const tiers = inspection.tiers;
    if (tiers.length === 0) {
      return !event.price || event.price === 0;
    }
    return tiers.every((t) => t.price === 0);
  } catch {
    return false;
  }
}

/**
 * Returns true if at least one registration tier for the event is free (price = 0).
 */
export function hasFreeTier(event: EventPricingData): boolean {
  try {
    const inspection = inspectPricingTiersNormalization(event.tiered_pricing);
    const tiers = inspection.tiers;
    if (tiers.length === 0) {
      return !event.price || event.price === 0;
    }
    return tiers.some((t) => t.price === 0);
  } catch {
    return false;
  }
}

/**
 * Formats a numeric price into COP currency format or returns "Gratis" for 0.
 */
export function formatCOP(amount: number): string {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
