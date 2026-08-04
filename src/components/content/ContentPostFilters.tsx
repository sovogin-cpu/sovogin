import React from "react";
import { Search, RotateCcw, Filter } from "lucide-react";
import {
  ContentChannel,
  ContentPostFilters as ContentPostFiltersType,
  ContentPostStatus,
  ContentVisibility,
} from "@/lib/content/types";

interface ContentPostFiltersProps {
  filters: ContentPostFiltersType;
  onChange: (filters: ContentPostFiltersType) => void;
  resultCount?: number;
}

export const ContentPostFilters: React.FC<ContentPostFiltersProps> = ({
  filters,
  onChange,
  resultCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as ContentChannel | "all";
    onChange({
      ...filters,
      channel: val === "all" ? undefined : val,
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as ContentPostStatus | "all";
    onChange({
      ...filters,
      status: val === "all" ? undefined : val,
    });
  };

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as ContentVisibility | "all";
    onChange({
      ...filters,
      visibility: val === "all" ? undefined : val,
    });
  };

  const handleFeaturedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({
      ...filters,
      isFeatured: val === "all" ? undefined : val === "true",
    });
  };

  const handleClearFilters = () => {
    onChange({});
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.channel) ||
    Boolean(filters.status) ||
    Boolean(filters.visibility) ||
    filters.isFeatured !== undefined;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search || ""}
            onChange={handleSearchChange}
            placeholder="Buscar por título o slug..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white transition-all"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel Select */}
          <select
            value={filters.channel || "all"}
            onChange={handleChannelChange}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] text-slate-700 font-medium"
          >
            <option value="all">Todos los canales</option>
            <option value="innovation">Innovación</option>
            <option value="community">A la comunidad</option>
            <option value="news">Noticias</option>
            <option value="benefits">Beneficios</option>
          </select>

          {/* Status Select */}
          <select
            value={filters.status || "all"}
            onChange={handleStatusChange}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] text-slate-700 font-medium"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>

          {/* Visibility Select */}
          <select
            value={filters.visibility || "all"}
            onChange={handleVisibilityChange}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] text-slate-700 font-medium"
          >
            <option value="all">Toda visibilidad</option>
            <option value="public">Público</option>
            <option value="members_only">Solo asociados</option>
          </select>

          {/* Featured Select */}
          <select
            value={
              filters.isFeatured === undefined
                ? "all"
                : filters.isFeatured
                ? "true"
                : "false"
            }
            onChange={handleFeaturedChange}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] text-slate-700 font-medium"
          >
            <option value="all">Todos (Destacados y normal)</option>
            <option value="true">Solo Destacados ⭐</option>
            <option value="false">No Destacados</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
              title="Limpiar filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Count bar */}
      {resultCount !== undefined && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#006666]" />
            <span>
              {resultCount === 1
                ? "1 publicación encontrada"
                : `${resultCount} publicaciones encontradas`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
