"use client";

import React, { useState } from "react";
import { X, Tag, CheckCircle2, Star } from "lucide-react";
import {
  AdminCommercialBenefit,
  CommercialBenefit,
  CommercialBenefitFormData,
} from "@/lib/commercial-benefits/types";
import { CommercialBenefitMediaSelector } from "./CommercialBenefitMediaSelector";

interface CommercialBenefitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CommercialBenefitFormData) => Promise<void>;
  benefitToEdit?: AdminCommercialBenefit | null;
}

export const CommercialBenefitDialog: React.FC<CommercialBenefitDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  benefitToEdit,
}) => {
  if (!isOpen) return null;

  return (
    <CommercialBenefitDialogForm
      onClose={onClose}
      onSave={onSave}
      benefitToEdit={benefitToEdit}
    />
  );
};

interface CommercialBenefitDialogFormProps {
  onClose: () => void;
  onSave: (payload: CommercialBenefitFormData) => Promise<void>;
  benefitToEdit?: AdminCommercialBenefit | null;
}

const CommercialBenefitDialogForm: React.FC<CommercialBenefitDialogFormProps> = ({
  onClose,
  onSave,
  benefitToEdit,
}) => {
  const isEditing = Boolean(benefitToEdit);

  const [name, setName] = useState(benefitToEdit?.name || "");
  const [benefitTitle, setBenefitTitle] = useState(benefitToEdit?.benefit_title || "");
  const [shortDescription, setShortDescription] = useState(
    benefitToEdit?.short_description || ""
  );
  const [fullDescription, setFullDescription] = useState(
    benefitToEdit?.full_description || ""
  );
  const [logoMediaId, setLogoMediaId] = useState<string | null>(
    benefitToEdit?.logo_media_id || null
  );
  const [promotionalMediaId, setPromotionalMediaId] = useState<string | null>(
    benefitToEdit?.promotional_media_id || null
  );
  const [linkUrl, setLinkUrl] = useState(benefitToEdit?.link_url || "");
  const [startsAt, setStartsAt] = useState(
    benefitToEdit?.starts_at ? benefitToEdit.starts_at.slice(0, 10) : ""
  );
  const [endsAt, setEndsAt] = useState(
    benefitToEdit?.ends_at ? benefitToEdit.ends_at.slice(0, 10) : ""
  );
  const [displayOrder, setDisplayOrder] = useState<number>(
    benefitToEdit?.display_order ?? 0
  );
  const [isActive, setIsActive] = useState<boolean>(
    benefitToEdit?.is_active ?? true
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(
    benefitToEdit?.is_featured ?? false
  );

  const [discountCode, setDiscountCode] = useState(benefitToEdit?.discount_code || "");
  const [redemptionInstructions, setRedemptionInstructions] = useState(
    benefitToEdit?.redemption_instructions || ""
  );
  const [exclusiveLinkUrl, setExclusiveLinkUrl] = useState(
    benefitToEdit?.exclusive_link_url || ""
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("El nombre de la empresa o aliado es obligatorio.");
      return;
    }

    const trimmedTitle = benefitTitle.trim();
    if (!trimmedTitle) {
      setErrorMsg("El título del beneficio es obligatorio.");
      return;
    }

    const trimmedShort = shortDescription.trim();
    if (!trimmedShort) {
      setErrorMsg("La descripción corta es obligatoria.");
      return;
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (end < start) {
        setErrorMsg("La fecha de finalización no puede ser anterior a la fecha de inicio.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: trimmedName,
        benefit_title: trimmedTitle,
        short_description: trimmedShort,
        full_description: fullDescription.trim() || null,
        logo_media_id: logoMediaId,
        promotional_media_id: promotionalMediaId,
        link_url: linkUrl.trim() || null,
        discount_code: discountCode.trim() || null,
        redemption_instructions: redemptionInstructions.trim() || null,
        exclusive_link_url: exclusiveLinkUrl.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        display_order: displayOrder >= 0 ? displayOrder : 0,
        is_active: isActive,
        is_featured: isFeatured,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar el beneficio comercial.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#006666]" />
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? "Editar Beneficio Comercial" : "Nuevo Beneficio Comercial"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Benefit Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Empresa / Aliado <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Clínica Santa Sofía"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Título del Beneficio <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={benefitTitle}
                onChange={(e) => setBenefitTitle(e.target.value)}
                placeholder="Ej. 20% Dto en Procedimientos Especializados"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
                required
              />
            </div>
          </div>

          {/* Short Description with visual counter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Descripción Corta <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  shortDescription.length > 180 ? "text-amber-600" : "text-slate-400"
                }`}
              >
                {shortDescription.length}/180 caracteres
              </span>
            </div>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              placeholder="Resumen ejecutivo del convenio para la tarjeta principal..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
              required
            />
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descripción Ampliada (Términos y Condiciones)
            </label>
            <textarea
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              rows={3}
              placeholder="Detalles completos del convenio, restricciones y modo de redención..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>

          {/* Media Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-100 py-3">
            <CommercialBenefitMediaSelector
              label="Logo de la Empresa / Aliado"
              selectedMediaId={logoMediaId}
              onSelectMediaId={setLogoMediaId}
            />
            <CommercialBenefitMediaSelector
              label="Imagen Promocional (Opcional)"
              selectedMediaId={promotionalMediaId}
              onSelectMediaId={setPromotionalMediaId}
            />
          </div>

          {/* SECCIÓN DATOS EXCLUSIVOS PARA ASOCIADOS (PORTAL FASE 3A) */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#006666]" />
              <span className="text-xs font-bold text-[#006666] uppercase tracking-wider">
                Datos Exclusivos para Asociados (Portal del Asociado)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Descuento / Cupón (Opcional)
                </label>
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Ej. SOVOGIN2026"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Enlace Directo Exclusivo (Opcional)
                </label>
                <input
                  type="text"
                  value={exclusiveLinkUrl}
                  onChange={(e) => setExclusiveLinkUrl(e.target.value)}
                  placeholder="https://aliado.com/landing-privada-sovogin"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Instrucciones de Redención para Asociados (Opcional)
              </label>
              <textarea
                value={redemptionInstructions}
                onChange={(e) => setRedemptionInstructions(e.target.value)}
                rows={2}
                placeholder="Ej. Presentar carné gremial en recepción o ingresar el código al momento de reservar..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Link URL Público */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Enlace Web Público / URL del Aliado
            </label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://ejemplo.com/beneficio-sovogin"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Validity Range: Starts At & Ends At */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Inicio (Vigencia)
              </label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Finalización (Vigencia)
              </label>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Display Order, Active, Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Orden de Despliegue
              </label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="is_active_check"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
              />
              <label
                htmlFor="is_active_check"
                className="text-xs font-bold text-slate-800 select-none cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Beneficio Activo</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="is_featured_check"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
              />
              <label
                htmlFor="is_featured_check"
                className="text-xs font-bold text-slate-800 select-none cursor-pointer flex items-center gap-1"
              >
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Destacado</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#006666] hover:bg-[#004d4d] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditing
                ? "Actualizar Beneficio"
                : "Crear Beneficio Comercial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
