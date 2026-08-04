import React from "react";
import { createClient } from "@/utils/supabase/server";
import {
  listCurrentCommercialBenefits,
  resolveCommercialBenefitMediaBatch,
  CommercialBenefitPublicResolved,
} from "@/lib/commercial-benefits/public-commercial-benefits-service";
import { CommercialBenefitPublicCard } from "@/components/commercial-benefits/CommercialBenefitPublicCard";

async function loadBenefits(): Promise<CommercialBenefitPublicResolved[]> {
  const supabase = await createClient();
  const rawBenefits = await listCurrentCommercialBenefits(supabase);
  if (!rawBenefits || rawBenefits.length === 0) return [];
  return resolveCommercialBenefitMediaBatch(supabase, rawBenefits);
}

export async function CommercialBenefitsSection() {
  let resolvedItems: CommercialBenefitPublicResolved[] = [];

  try {
    resolvedItems = await loadBenefits();
  } catch (err: unknown) {
    console.error("Error al cargar la sección pública de beneficios comerciales:", err);
    return null;
  }

  if (resolvedItems.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-slate-50/70 border-t border-slate-100">
      <div className="container mx-auto px-4 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-[#006666] font-extrabold uppercase tracking-[0.2em] text-xs">
            Convenios y Ventajas Exclusivas
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Beneficios Comerciales
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Disfrute de los descuentos, alianzas institucionales y beneficios especiales gestionados exclusivamente para nuestros médicos asociados.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resolvedItems.map((item) => (
            <CommercialBenefitPublicCard key={item.benefit.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
