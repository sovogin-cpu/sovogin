"use client";

import React from "react";
import { Search, X, Video } from "lucide-react";

interface DoctorDirectoryFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  specialty: string;
  onSpecialtyChange: (val: string) => void;
  country: string;
  onCountryChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  telemedicineOnly: boolean;
  onTelemedicineOnlyChange: (val: boolean) => void;
  specialties: string[];
  countries: string[];
  departments: string[];
  cities: string[];
  onClearFilters: () => void;
  totalResults: number;
}

export const DoctorDirectoryFilters: React.FC<DoctorDirectoryFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  specialty,
  onSpecialtyChange,
  country,
  onCountryChange,
  department,
  onDepartmentChange,
  city,
  onCityChange,
  telemedicineOnly,
  onTelemedicineOnlyChange,
  specialties,
  countries,
  departments,
  cities,
  onClearFilters,
  totalResults,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    specialty !== "all" ||
    country !== "all" ||
    department !== "all" ||
    city !== "all" ||
    telemedicineOnly;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 my-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-1">
          <label htmlFor="search-input" className="sr-only">
            Buscar por nombre o clínica
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Buscar por nombre o clínica..."
            className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white text-slate-800 font-medium"
          />
        </div>

        {/* Specialty Filter */}
        <div>
          <label htmlFor="specialty-select" className="sr-only">
            Filtrar por especialidad
          </label>
          <select
            id="specialty-select"
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

        {/* Department Filter */}
        <div>
          <label htmlFor="department-select" className="sr-only">
            Filtrar por departamento
          </label>
          <select
            id="department-select"
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-700"
          >
            <option value="all">Todos los departamentos</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div>
          <label htmlFor="city-select" className="sr-only">
            Filtrar por ciudad
          </label>
          <select
            id="city-select"
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
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 w-full">
            <input
              type="checkbox"
              checked={telemedicineOnly}
              onChange={(e) => onTelemedicineOnlyChange(e.target.checked)}
              className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
            />
            <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Telemedicina</span>
          </label>
        </div>
      </div>

      {/* Country Filter (Visible if multiple countries exist) */}
      {countries.length > 1 && (
        <div className="flex items-center gap-2 pt-2 text-xs">
          <span className="font-semibold text-slate-500">País:</span>
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">Todos los países</option>
            {countries.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>
      )}

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
