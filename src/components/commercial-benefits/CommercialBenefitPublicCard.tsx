import React from "react";
import Link from "next/link";
import { Tag, ExternalLink, Calendar, Star, ArrowRight } from "lucide-react";
import { CommercialBenefitPublicResolved } from "@/lib/commercial-benefits/public-commercial-benefits-service";
import { formatCommercialBenefitValidity } from "@/lib/commercial-benefits/commercial-benefits-utils";

interface CommercialBenefitPublicCardProps {
  item: CommercialBenefitPublicResolved;
}

export const CommercialBenefitPublicCard: React.FC<CommercialBenefitPublicCardProps> = ({
  item,
}) => {
  const { benefit, logoSignedUrl, promotionalSignedUrl } = item;
  const validityText = formatCommercialBenefitValidity(
    benefit.starts_at,
    benefit.ends_at
  );

  const isInternalLink = benefit.link_url?.startsWith("/");

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Featured Accent Indicator */}
      {benefit.is_featured && (
        <div className="absolute top-0 right-0 bg-[#006666] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-bl-2xl flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>Destacado</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Header: Logo & Partner Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-2 overflow-hidden shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
            {logoSignedUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoSignedUrl}
                alt={`Logo oficial de ${benefit.name}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <Tag className="w-6 h-6 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-xs font-extrabold text-[#006666] uppercase tracking-wider block truncate">
              {benefit.name}
            </span>
            <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#006666] transition-colors">
              {benefit.benefit_title}
            </h3>
          </div>
        </div>

        {/* Promotional Image (Optional) */}
        {promotionalSignedUrl && (
          <div className="h-36 w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={promotionalSignedUrl}
              alt={`Promoción de ${benefit.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        {/* Short Description */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
          {benefit.short_description}
        </p>
      </div>

      {/* Footer: Validity & Action Link */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{validityText}</span>
        </div>

        {benefit.link_url && (
          isInternalLink ? (
            <Link
              href={benefit.link_url}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006666] hover:text-[#004d4d] transition-colors group/btn shrink-0"
            >
              <span>Ver beneficio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <a
              href={benefit.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006666] hover:text-[#004d4d] transition-colors group/btn shrink-0"
              aria-label={`Ver beneficio de ${benefit.name} en sitio externo (abre en nueva pestaña)`}
            >
              <span>Acceder al convenio</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </a>
          )
        )}
      </div>
    </div>
  );
};
