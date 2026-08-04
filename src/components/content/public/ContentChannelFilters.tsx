"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { ContentCategory } from "@/lib/content/types";

interface ContentChannelFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  categoryId: string;
  onCategoryIdChange: (val: string) => void;
  categories: ContentCategory[];
  onClearFilters: () => void;
  totalResults: number;
}

export const ContentChannelFilters: React.FC<ContentChannelFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  categoryId,
  onCategoryIdChange,
  categories,
  onClearFilters,
  totalResults,
}) => {
  const hasActiveFilters = searchQuery.trim() !== "" || categoryId !== "all";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4 my-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Buscar por palabra clave o título..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white text-slate-800"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-700"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>
          Mostrando <strong className="text-slate-800">{totalResults}</strong>{" "}
          {totalResults === 1 ? "publicación" : "publicaciones"}
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-[#006666] hover:text-[#004d4d] font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </div>
  );
};
