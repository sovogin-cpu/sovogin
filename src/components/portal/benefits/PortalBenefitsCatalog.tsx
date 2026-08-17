"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Gift,
  Info,
  Loader2,
  AlertCircle,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalCommercialBenefit } from "@/lib/commercial-benefits/types";

export const PortalBenefitsCatalog: React.FC = () => {
  const [benefits, setBenefits] = useState<PortalCommercialBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadBenefits() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/portal/benefits");
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "No se pudieron cargar los convenios de la asociación.");
          return;
        }

        setBenefits(data.benefits || []);
      } catch (err: unknown) {
        console.error("Error al cargar beneficios:", err);
        setError("Error de conexión al cargar la lista de convenios.");
      } finally {
        setLoading(false);
      }
    }

    void loadBenefits();
  }, []);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Cargando convenios y beneficios de asociado...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/15 border border-rose-500/30 p-8 rounded-3xl text-center space-y-3 max-w-xl mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error de Carga</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#006666]/30 border border-slate-800 p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold rounded-full uppercase tracking-wider">
            <Award className="w-4 h-4 text-teal-400" />
            Convenios Gremiados Exclusivos
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-heading">
            Beneficios para Asociados SOVOGIN
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Acceda a descuentos comerciales, tarifas preferenciales en servicios médicos y códigos de promoción reservados para miembros activos.
          </p>
        </div>
      </div>

      {/* Grid de Convenios */}
      {benefits.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-[2.5rem] text-center space-y-3 max-w-2xl mx-auto">
          <Gift className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay convenios activos en este momento</h3>
          <p className="text-xs text-slate-400">
            Estamos gestionando nuevos alianzas y descuentos comerciales para la comunidad SOVOGIN.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((item) => {
            const hasDiscountCode = Boolean(item.discount_code && item.discount_code.trim() !== "");
            const hasInstructions = Boolean(item.redemption_instructions && item.redemption_instructions.trim() !== "");
            const hasExclusiveLink = Boolean(item.exclusive_link_url && item.exclusive_link_url.trim() !== "");
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-xl flex flex-col justify-between relative group transition-all"
              >
                {item.is_featured && (
                  <div className="absolute top-6 right-6 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Destacado
                  </div>
                )}

                <div className="space-y-5">
                  {/* Aliado & Logo */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-2 shadow-inner">
                      {item.logoSignedUrl ? (
                        <img
                          src={item.logoSignedUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Award className="w-8 h-8 text-teal-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest block">
                        {item.name}
                      </span>
                      <h3 className="text-lg font-extrabold text-white font-heading leading-tight">
                        {item.benefit_title}
                      </h3>
                    </div>
                  </div>

                  {/* Descripción corta */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.short_description}
                  </p>

                  {/* Imagen Promocional Opcional */}
                  {item.promotionalSignedUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-48">
                      <img
                        src={item.promotionalSignedUrl}
                        alt={item.benefit_title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Descripción extendida */}
                  {item.full_description && (
                    <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                      {item.full_description}
                    </p>
                  )}

                  {/* SECCIÓN EXCLUSIVA DE ASOCIADO */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-teal-500/30 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                      <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>Acceso Exclusivo de Asociado SOVOGIN</span>
                    </div>

                    {/* Código de descuento */}
                    {hasDiscountCode && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs text-slate-400 font-medium">Cupón:</span>
                          <span className="font-mono font-extrabold text-white text-sm tracking-wider">
                            {item.discount_code}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleCopyCode(item.id, item.discount_code!)}
                          className="bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ¡Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Código
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Instrucciones de uso */}
                    {hasInstructions && (
                      <div className="text-xs text-slate-300 leading-relaxed space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                        <span className="font-bold text-slate-200 block">Instrucciones de redención:</span>
                        <p className="text-slate-400">{item.redemption_instructions}</p>
                      </div>
                    )}

                    {/* Botón de Enlace Exclusivo */}
                    {hasExclusiveLink && (
                      <a
                        href={item.exclusive_link_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 rounded-xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Acceder al Convenio Exclusivo
                      </a>
                    )}
                  </div>
                </div>

                {/* Enlace Público Genérico si existe */}
                {item.link_url && !hasExclusiveLink && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visitar sitio web del aliado ({item.name})
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
