"use client";

import React, { useEffect, useState } from "react";
import {
  Tag,
  Edit2,
  ExternalLink,
  Star,
  Eye,
  EyeOff,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";
import { AdminCommercialBenefit, CommercialBenefit } from "@/lib/commercial-benefits/types";
import {
  formatCommercialBenefitValidity,
  getCommercialBenefitValidityStatus,
} from "@/lib/commercial-benefits/commercial-benefits-utils";
import { createClient } from "@/utils/supabase/client";
import { createCommercialBenefitSignedUrl } from "@/lib/commercial-benefits/commercial-benefits-repository";

interface CommercialBenefitAdminCardProps {
  benefit: AdminCommercialBenefit;
  onEdit: (benefit: AdminCommercialBenefit) => void;
  onToggleActive: (benefit: AdminCommercialBenefit) => Promise<void>;
  onToggleFeatured: (benefit: AdminCommercialBenefit) => Promise<void>;
}

export const CommercialBenefitAdminCard: React.FC<CommercialBenefitAdminCardProps> = ({
  benefit,
  onEdit,
  onToggleActive,
  onToggleFeatured,
}) => {
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (benefit.logo_media_id) {
      const supabase = createClient();
      createCommercialBenefitSignedUrl(supabase, benefit.logo_media_id)
        .then((url) => {
          if (isMounted) setLogoSignedUrl(url);
        })
        .catch(() => {
          // Ignore preview error
        });
    }

    return () => {
      isMounted = false;
    };
  }, [benefit.logo_media_id]);

  const validityStatus = getCommercialBenefitValidityStatus(
    benefit.starts_at,
    benefit.ends_at
  );
  const validityText = formatCommercialBenefitValidity(
    benefit.starts_at,
    benefit.ends_at
  );

  const handleToggleActiveClick = async () => {
    try {
      setIsTogglingActive(true);
      await onToggleActive(benefit);
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleToggleFeaturedClick = async () => {
    try {
      setIsTogglingFeatured(true);
      await onToggleFeatured(benefit);
    } finally {
      setIsTogglingFeatured(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header: Logo & Partner Info */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
            {logoSignedUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoSignedUrl}
                alt={benefit.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Tag className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                {benefit.name}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                #{benefit.display_order}
              </span>
            </div>

            <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
              {benefit.benefit_title}
            </h3>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
          {benefit.short_description}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {/* Active Status */}
          {benefit.is_active ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Eye className="w-3 h-3" />
              Activo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <EyeOff className="w-3 h-3" />
              Inactivo
            </span>
          )}

          {/* Featured Status */}
          {benefit.is_featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
              Destacado
            </span>
          )}

          {/* Validity Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${
              validityStatus === "current"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : validityStatus === "upcoming"
                ? "bg-sky-50 text-sky-800 border-sky-200"
                : validityStatus === "expired"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{validityText}</span>
          </span>

          {benefit.promotional_media_id && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <ImageIcon className="w-3 h-3 text-slate-400" />
              <span>Promo OK</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(benefit)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
        >
          <Edit2 className="w-3.5 h-3.5 text-[#006666]" />
          <span>Editar</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Toggle Featured */}
          <button
            type="button"
            disabled={isTogglingFeatured}
            onClick={handleToggleFeaturedClick}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              benefit.is_featured
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                : "bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-500 hover:bg-amber-50"
            }`}
            title={benefit.is_featured ? "Desmarcar destacado" : "Marcar como destacado"}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Toggle Active */}
          <button
            type="button"
            disabled={isTogglingActive}
            onClick={handleToggleActiveClick}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              benefit.is_active
                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            {isTogglingActive
              ? "..."
              : benefit.is_active
              ? "Desactivar"
              : "Activar"}
          </button>

          {/* Optional Link Button */}
          {benefit.link_url && (
            <a
              href={benefit.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-[#006666] bg-slate-100 hover:bg-emerald-50 rounded-lg border border-slate-200"
              title="Abrir enlace del convenio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
