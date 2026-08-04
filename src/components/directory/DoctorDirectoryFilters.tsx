"use client";

import React from "react";
import { Search, X, Video } from "lucide-react";

interface DoctorDirectoryFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  specialty: string;
  onSpecialtyChange: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  telemedicineOnly: boolean;
  onTelemedicineOnlyChange: (val: boolean) => void;
  specialties: string[];
  cities: string[];
  onClearFilters: () => void;
  totalResults: number;
}

export const DoctorDirectoryFilters: React.FC<DoctorDirectoryFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  specialty,
  onSpecialtyChange,
  city,
  onCityChange,
  telemedicineOnly,
  onTelemedicineOnlyChange,
  specialties,
  cities,
  onClearFilters,
  totalResults,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    specialty !== "all" ||
    city !== "all" ||
    telemedicineOnly;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 my-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Buscar especialista por nombre..."
            className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white text-slate-800 font-medium"
          />
        </div>

        {/* Specialty Filter */}
        <div>
          <select
            value={specialty}
            onChange={(e) => onSpecialtyChange(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-700"
          >
            <option value="all">Todas las especialidades</option>
            {specialties.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-700"
          >
            <option value="all">Todas las ciudades</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Telemedicine Checkbox */}
        <div className="flex items-center bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={telemedicineOnly}
              onChange={(e) => onTelemedicineOnlyChange(e.target.checked)}
              className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
            />
            <Video className="w-3.5 h-3.5 text-emerald-600" />
            <span>Telemedicina disponible</span>
          </label>
        </div>
      </div>

      {/* Results & Clear Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>
          Especialistas encontrados: <strong className="text-slate-800">{totalResults}</strong>
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-[#006666] hover:text-[#004d4d] font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar todos los filtros</span>
          </button>
        )}
      </div>
    </div>
  );
};
