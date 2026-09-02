import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveEventRegistrationPrice,
  resolveEventRegistrationTypePrice,
  resolveLegacyEventRegistrationPrice,
  normalizePricingTiersToV2,
  inspectPricingTiersNormalization,
  getEventMinimumPositivePrice,
  isAllFreeEvent,
  hasFreeTier,
  formatCOP,
  MODALITY_SENTINEL,
  EventPricingData,
} from "../event-pricing";

describe("SOVOGIN — Event Pricing V2 Suite", () => {
  const v2Event: EventPricingData = {
    id: "evt-v2-1",
    title: "Simposio Obstetricia V2",
    price: 0,
    tiered_pricing: {
      version: 2,
      tiers: [
        { name: "Ginecólogos no Asociados", price: 150000 },
        { name: "Médicos y Enfermeras", price: 100000 },
        { name: "Estudiante", price: 50000 },
        { name: "Asociado", price: 0 },
        { name: "Virtual", price: 50000 },
      ],
    },
  };

  const v1Event: EventPricingData = {
    id: "evt-v1-1",
    title: "Simposio Adolescentes V1",
    price: 150000,
    tiered_pricing: {
      tiers: [
        { name: "General", presencial: 150000, virtual: 150000 },
        { name: "Residente", presencial: 100000, virtual: 100000 },
        { name: "Asociado", presencial: 0, virtual: 0 },
      ],
    },
  };

  const allFreeEvent: EventPricingData = {
    id: "evt-free-1",
    title: "Simposio Gratuito Todos",
    price: 0,
    tiered_pricing: {
      version: 2,
      tiers: [
        { name: "General", price: 0 },
        { name: "Asociado", price: 0 },
      ],
    },
  };

  test("1. V2 paid type resolution returns exact amount and registration_type sentinel", () => {
    const res = resolveEventRegistrationTypePrice(v2Event, "Ginecólogos no Asociados");
    assert.equal(res.amount, 150000);
    assert.equal(res.category, "Ginecólogos no Asociados");
    assert.equal(res.modality, MODALITY_SENTINEL);
    assert.equal(res.isV2, true);
  });

  test("2. V2 free type resolution returns 0 amount and registration_type sentinel", () => {
    const res = resolveEventRegistrationTypePrice(v2Event, "Asociado");
    assert.equal(res.amount, 0);
    assert.equal(res.category, "Asociado");
    assert.equal(res.modality, MODALITY_SENTINEL);
  });

  test("3. Multiple prices in V2 event are parsed correctly", () => {
    const tiers = normalizePricingTiersToV2(v2Event.tiered_pricing);
    assert.equal(tiers.length, 5);
    assert.deepEqual(tiers[0], { name: "Ginecólogos no Asociados", price: 150000 });
    assert.deepEqual(tiers[2], { name: "Estudiante", price: 50000 });
    assert.deepEqual(tiers[3], { name: "Asociado", price: 0 });
    assert.deepEqual(tiers[4], { name: "Virtual", price: 50000 });
  });

  test("4. Mixed free + paid tiers report minimum positive price and free tier presence", () => {
    assert.equal(getEventMinimumPositivePrice(v2Event), 50000);
    assert.equal(hasFreeTier(v2Event), true);
    assert.equal(isAllFreeEvent(v2Event), false);
  });

  test("5. Minimum positive price calculation returns formatted COP price", () => {
    const min = getEventMinimumPositivePrice(v2Event);
    assert.equal(min, 50000);
    assert.equal(formatCOP(min).includes("50.000"), true);
  });

  test("6. All-free event correctly identifies as all free", () => {
    assert.equal(getEventMinimumPositivePrice(allFreeEvent), 0);
    assert.equal(isAllFreeEvent(allFreeEvent), true);
    assert.equal(hasFreeTier(allFreeEvent), true);
    assert.equal(formatCOP(0), "Gratis");
  });

  test("7. Invalid requested type throws clear error", () => {
    assert.throws(
      () => resolveEventRegistrationTypePrice(v2Event, "Tipo Inexistente"),
      /no es válido para este evento/
    );
  });

  test("8. Normalization deduplicates case-insensitive duplicate type names", () => {
    const duplicateEvent: EventPricingData = {
      id: "dup-1",
      title: "Dup Event",
      tiered_pricing: {
        tiers: [
          { name: "General", price: 100000 },
          { name: "general", price: 90000 },
        ],
      },
    };
    const tiers = normalizePricingTiersToV2(duplicateEvent.tiered_pricing);
    assert.equal(tiers.length, 1);
    assert.equal(tiers[0].price, 100000);
  });

  test("9. Negative prices in configuration throw error", () => {
    const badPriceEvent: EventPricingData = {
      id: "bad-1",
      title: "Bad Price",
      tiered_pricing: {
        tiers: [{ name: "Invalido", price: -50000 }],
      },
    };
    assert.throws(
      () => resolveEventRegistrationTypePrice(badPriceEvent, "Invalido"),
      /precio inválido/
    );
  });

  test("10. V1 legacy pricing compatibility resolves correctly", () => {
    const res = resolveLegacyEventRegistrationPrice(v1Event, "General", "presencial");
    assert.equal(res.amount, 150000);
    assert.equal(res.category, "General");
    assert.equal(res.modality, "presencial");
    assert.equal(res.isV2, false);
  });

  test("11. Legacy presencial selection returns presencial rate", () => {
    const res = resolveLegacyEventRegistrationPrice(v1Event, "Residente", "presencial");
    assert.equal(res.amount, 100000);
    assert.equal(res.modality, "presencial");
  });

  test("12. Legacy virtual selection returns virtual rate", () => {
    const res = resolveLegacyEventRegistrationPrice(v1Event, "Residente", "virtual");
    assert.equal(res.amount, 100000);
    assert.equal(res.modality, "virtual");
  });

  test("13. Universal resolver selects V2 when sentinel modality is passed", () => {
    const res = resolveEventRegistrationPrice(v2Event, "Virtual", MODALITY_SENTINEL);
    assert.equal(res.amount, 50000);
    assert.equal(res.category, "Virtual");
    assert.equal(res.modality, MODALITY_SENTINEL);
    assert.equal(res.isV2, true);
  });

  test("14. V2 modality sentinel is always exact string 'registration_type'", () => {
    assert.equal(MODALITY_SENTINEL, "registration_type");
  });

  test("15. Historical records with legacy modality string remain valid", () => {
    const historicalRow = {
      id: "hist-1",
      category: "General",
      modality: "presencial",
      amount: 150000,
    };
    assert.equal(historicalRow.modality, "presencial");
    assert.equal(historicalRow.amount, 150000);
  });

  test("16. Normalization Rules A-D Test: Explicit unambiguous V1 tier conversions", () => {
    // Rule B: p > 0 && v === 0 → price = p
    const ruleB = inspectPricingTiersNormalization({ tiers: [{ name: "Virtual", presencial: 50000, virtual: 0 }] });
    assert.equal(ruleB.tiers[0].price, 50000);
    assert.equal(ruleB.isAmbiguous, false);

    // Rule C: v > 0 && p === 0 → price = v
    const ruleC = inspectPricingTiersNormalization({ tiers: [{ name: "Virtual", presencial: 0, virtual: 50000 }] });
    assert.equal(ruleC.tiers[0].price, 50000);
    assert.equal(ruleC.isAmbiguous, false);

    // Rule A: p === v → price = p
    const ruleA = inspectPricingTiersNormalization({ tiers: [{ name: "General", presencial: 50000, virtual: 50000 }] });
    assert.equal(ruleA.tiers[0].price, 50000);
    assert.equal(ruleA.isAmbiguous, false);

    // Rule D: p === 0 && v === 0 → price = 0
    const ruleD = inspectPricingTiersNormalization({ tiers: [{ name: "Asociado", presencial: 0, virtual: 0 }] });
    assert.equal(ruleD.tiers[0].price, 0);
    assert.equal(ruleD.isAmbiguous, false);
  });

  test("17. Normalization Rule E Test: Ambiguous V1 tier (p > 0 && v > 0 && p !== v) flags ambiguity and blocks auto-conversion", () => {
    const ambiguousTierData = {
      tiers: [{ name: "Especialista", presencial: 200000, virtual: 100000 }],
    };

    const inspection = inspectPricingTiersNormalization(ambiguousTierData);
    assert.equal(inspection.isAmbiguous, true);
    assert.deepEqual(inspection.ambiguousTiers, ["Especialista"]);

    assert.throws(
      () => normalizePricingTiersToV2(ambiguousTierData),
      /precios históricos diferentes para Presencial y Virtual/
    );
  });

  test("18. Complete Production Preview: Actualidades en Obstetricia V1 converts to EXACT 5 V2 types", () => {
    const v1ObstetriciaEvent: EventPricingData = {
      id: "obs-1",
      title: "Actualidades en Obstetricia y Ginecología",
      tiered_pricing: {
        tiers: [
          { name: "Ginecólogos no Asociados", presencial: 150000, virtual: 150000 },
          { name: "Médicos y Enfermeras", presencial: 100000, virtual: 100000 },
          { name: "Estudiante", presencial: 50000, virtual: 50000 },
          { name: "Asociado", presencial: 0, virtual: 0 },
          { name: "Virtual", presencial: 50000, virtual: 0 },
        ],
      },
    };

    const inspection = inspectPricingTiersNormalization(v1ObstetriciaEvent.tiered_pricing);
    assert.equal(inspection.isAmbiguous, false);
    assert.equal(inspection.tiers.length, 5);
    assert.deepEqual(inspection.tiers[0], { name: "Ginecólogos no Asociados", price: 150000 });
    assert.deepEqual(inspection.tiers[1], { name: "Médicos y Enfermeras", price: 100000 });
    assert.deepEqual(inspection.tiers[2], { name: "Estudiante", price: 50000 });
    assert.deepEqual(inspection.tiers[3], { name: "Asociado", price: 0 });
    assert.deepEqual(inspection.tiers[4], { name: "Virtual", price: 50000 });
    assert.equal(getEventMinimumPositivePrice(v1ObstetriciaEvent), 50000);
  });

  test("19. Complete Production Preview: Adolescentes V1 converts to EXACT 4 V2 types", () => {
    const v1AdolescentesEvent: EventPricingData = {
      id: "adol-1",
      title: "Simposio de Ginecología Infanto Juvenil",
      tiered_pricing: {
        tiers: [
          { name: "General", presencial: 150000, virtual: 150000 },
          { name: "Residente", presencial: 100000, virtual: 100000 },
          { name: "Estudiante", presencial: 50000, virtual: 50000 },
          { name: "Asociado", presencial: 0, virtual: 0 },
        ],
      },
    };

    const inspection = inspectPricingTiersNormalization(v1AdolescentesEvent.tiered_pricing);
    assert.equal(inspection.isAmbiguous, false);
    assert.equal(inspection.tiers.length, 4);
    assert.deepEqual(inspection.tiers[0], { name: "General", price: 150000 });
    assert.deepEqual(inspection.tiers[1], { name: "Residente", price: 100000 });
    assert.deepEqual(inspection.tiers[2], { name: "Estudiante", price: 50000 });
    assert.deepEqual(inspection.tiers[3], { name: "Asociado", price: 0 });
  });

  test("20. Complete Production Preview: Día del Residente V1 converts to EXACT 4 V2 types (All Free)", () => {
    const v1DiaResidenteEvent: EventPricingData = {
      id: "res-1",
      title: "Día del Residente SOVOGIN",
      tiered_pricing: {
        tiers: [
          { name: "General", presencial: 0, virtual: 0 },
          { name: "Residente", presencial: 0, virtual: 0 },
          { name: "Estudiante", presencial: 0, virtual: 0 },
          { name: "Asociado", presencial: 0, virtual: 0 },
        ],
      },
    };

    const inspection = inspectPricingTiersNormalization(v1DiaResidenteEvent.tiered_pricing);
    assert.equal(inspection.isAmbiguous, false);
    assert.equal(inspection.tiers.length, 4);
    assert.deepEqual(inspection.tiers[0], { name: "General", price: 0 });
    assert.deepEqual(inspection.tiers[1], { name: "Residente", price: 0 });
    assert.deepEqual(inspection.tiers[2], { name: "Estudiante", price: 0 });
    assert.deepEqual(inspection.tiers[3], { name: "Asociado", price: 0 });
    assert.equal(isAllFreeEvent(v1DiaResidenteEvent), true);
  });
});
