"use client";

import { Star, Search } from "lucide-react";
import { ContentChannel, ContentVisibility } from "@/lib/content/types";
import { FeaturedMediaSelector } from "./FeaturedMediaSelector";
import { CategorySelector } from "./CategorySelector";

interface ContentPostSettingsProps {
  channel: ContentChannel;
  onChannelChange: (val: ContentChannel) => void;
  visibility: ContentVisibility;
  onVisibilityChange: (val: ContentVisibility) => void;
  publishedAt: string | null;
  onPublishedAtChange: (val: string | null) => void;
  isFeatured: boolean;
  onIsFeaturedChange: (val: boolean) => void;
  featuredMediaId: string | null;
  onFeaturedMediaIdChange: (val: string | null) => void;
  categoryIds: string[];
  onCategoryIdsChange: (val: string[]) => void;
  seoTitle: string;
  onSeoTitleChange: (val: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (val: string) => void;
}

export const ContentPostSettings: React.FC<ContentPostSettingsProps> = ({
  channel,
  onChannelChange,
  visibility,
  onVisibilityChange,
  publishedAt,
  onPublishedAtChange,
  isFeatured,
  onIsFeaturedChange,
  featuredMediaId,
  onFeaturedMediaIdChange,
  categoryIds,
  onCategoryIdsChange,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
}) => {
  // Format ISO string to datetime-local format YYYY-MM-DDTHH:mm
  const formatDatetimeLocal = (isoString: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const handleDatetimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onPublishedAtChange(null);
    } else {
      onPublishedAtChange(new Date(val).toISOString());
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
      <h3 className="font-bold text-slate-900 text-sm tracking-tight border-b border-slate-100 pb-3">
        Ajustes de Publicación
      </h3>

      {/* Channel */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Canal Destino <span className="text-rose-500">*</span>
        </label>
        <select
          value={channel}
          onChange={(e) => onChannelChange(e.target.value as ContentChannel)}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-800"
        >
          <option value="innovation">Innovación</option>
          <option value="community">A la comunidad</option>
          <option value="news">Noticias</option>
          <option value="benefits">Beneficios</option>
        </select>
      </div>

      {/* Visibility */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Visibilidad <span className="text-rose-500">*</span>
        </label>
        <select
          value={visibility}
          onChange={(e) => onVisibilityChange(e.target.value as ContentVisibility)}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-800"
        >
          <option value="public">Público (Abierto a todos)</option>
          <option value="members_only">Solo Asociados (Requiere sesión)</option>
        </select>
      </div>

      {/* Published At Date & Time */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Fecha de Publicación Programada
        </label>
        <input
          type="datetime-local"
          value={formatDatetimeLocal(publishedAt)}
          onChange={handleDatetimeChange}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] text-slate-800"
        />
        <p className="text-[11px] text-slate-500">
          Si se deja vacío al publicar, se asignará la fecha y hora actual.
        </p>
      </div>

      {/* Is Featured Checkbox */}
      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => onIsFeaturedChange(e.target.checked)}
            className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
          />
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-800">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Destacar Publicación</span>
          </div>
        </label>
      </div>

      {/* Featured Media */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Imagen Destacada
        </label>
        <FeaturedMediaSelector
          mode="single"
          selectedMediaId={featuredMediaId}
          onSelectSingle={(mediaId) => onFeaturedMediaIdChange(mediaId)}
          allowedType="image"
          buttonLabel="Elegir portada"
        />
      </div>

      {/* Categories */}
      <div className="pt-4 border-t border-slate-100">
        <CategorySelector
          channel={channel}
          selectedCategoryIds={categoryIds}
          onChange={onCategoryIdsChange}
        />
      </div>

      {/* SEO Section */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Search className="w-4 h-4 text-[#006666]" />
          <span>Configuración SEO / Meta tags</span>
        </div>

        {/* SEO Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700">Título SEO</label>
            <span
              className={`text-[11px] font-mono ${
                seoTitle.length > 60 ? "text-amber-600 font-bold" : "text-slate-400"
              }`}
            >
              {seoTitle.length}/60
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="Título personalizado para buscadores..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
          />
        </div>

        {/* SEO Description */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700">Descripción SEO</label>
            <span
              className={`text-[11px] font-mono ${
                seoDescription.length > 160 ? "text-amber-600 font-bold" : "text-slate-400"
              }`}
            >
              {seoDescription.length}/160
            </span>
          </div>
          <textarea
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Resumen corto optimizado para buscadores..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
          />
        </div>
      </div>
    </div>
  );
};
