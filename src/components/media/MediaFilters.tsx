"use client";

import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaCategory, MediaFilterState, MediaTypeFilter } from "@/lib/media/types";

interface MediaFiltersProps {
  filters: MediaFilterState;
  categories: MediaCategory[];
  onChange: (newFilters: MediaFilterState) => void;
  onReset: () => void;
}

export function MediaFilters({
  filters,
  categories,
  onChange,
  onReset,
}: MediaFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, categoryId: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      status: e.target.value as MediaFilterState["status"],
    });
  };

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      visibility: e.target.value as MediaFilterState["visibility"],
    });
  };

  const handleTypeChange = (type: MediaTypeFilter) => {
    onChange({ ...filters, mediaType: type });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por título o nombre original..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="pl-11 h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm font-medium"
          />
        </div>

        {/* Media Type Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl overflow-x-auto">
          {[
            { id: "all", label: "Todos" },
            { id: "image", label: "Imágenes" },
            { id: "document", label: "Documentos" },
            { id: "other", label: "Otros" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTypeChange(tab.id as MediaTypeFilter)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                filters.mediaType === tab.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Select Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Categoría
          </label>
          <select
            value={filters.categoryId}
            onChange={handleCategoryChange}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Estado
          </label>
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
          </select>
        </div>

        {/* Visibility */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Visibilidad
          </label>
          <select
            value={filters.visibility}
            onChange={handleVisibilityChange}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="all">Todas</option>
            <option value="public">Pública</option>
            <option value="private">Privada</option>
          </select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="w-full h-11 rounded-xl border-slate-200 text-slate-600 hover:text-primary gap-2 font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
