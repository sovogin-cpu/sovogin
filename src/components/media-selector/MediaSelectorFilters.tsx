"use client";

import React, { useEffect, useState } from "react";
import { MediaCategory } from "@/lib/media/types";
import { MediaSelectorKind } from "@/lib/media/media-selector-types";
import { Search, RotateCcw } from "lucide-react";

interface MediaSelectorFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryId: string;
  onCategoryChange: (catId: string) => void;
  kind: MediaSelectorKind;
  onKindChange: (kind: MediaSelectorKind) => void;
  categories: MediaCategory[];
  allowedKind?: MediaSelectorKind;
  onResetFilters: () => void;
}

export function MediaSelectorFilters({
  searchQuery,
  onSearchChange,
  categoryId,
  onCategoryChange,
  kind,
  onKindChange,
  categories,
  allowedKind = "any",
  onResetFilters,
}: MediaSelectorFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [prevQuery, setPrevQuery] = useState(searchQuery);

  if (searchQuery !== prevQuery) {
    setPrevQuery(searchQuery);
    setLocalSearch(searchQuery);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800">
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar por título o archivo..."
          className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Kind Filter (if allowedKind is "any") */}
      {allowedKind === "any" ? (
        <select
          value={kind}
          onChange={(e) => onKindChange(e.target.value as MediaSelectorKind)}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="any">Todos los tipos</option>
          <option value="image">Imágenes</option>
          <option value="document">Documentos / Adjuntos</option>
        </select>
      ) : (
        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-semibold flex items-center capitalize">
          Tipo: {allowedKind === "image" ? "Imágenes" : "Documentos"}
        </div>
      )}

      {/* Category Filter & Reset */}
      <div className="flex items-center gap-2">
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onResetFilters}
          title="Limpiar filtros"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
