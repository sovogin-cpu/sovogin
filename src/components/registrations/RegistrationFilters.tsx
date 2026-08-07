"use client";

import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RegistrationEventItem, RegistrationFilterState } from "@/lib/registrations/types";

interface RegistrationFiltersProps {
  filters: RegistrationFilterState;
  events: RegistrationEventItem[];
  onChange: (filters: RegistrationFilterState) => void;
  onReset: () => void;
}

export function RegistrationFilters({
  filters,
  events,
  onChange,
  onReset,
}: RegistrationFiltersProps) {
  const hasActiveFilters =
    filters.eventId !== "all" ||
    filters.status !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.origin !== "all" ||
    filters.modality !== "all" ||
    filters.searchQuery.trim() !== "";

  return (
    <div className="space-y-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email, documento o referencia..."
            className="pl-11 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-sm"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onReset}
            className="h-12 px-4 rounded-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium text-xs gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Filtros</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Event Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Evento
          </label>
          <select
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filters.eventId}
            onChange={(e) => onChange({ ...filters, eventId: e.target.value })}
          >
            <option value="all">Todos los Eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>

        {/* Origin Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Origen
          </label>
          <select
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filters.origin}
            onChange={(e) => onChange({ ...filters, origin: e.target.value })}
          >
            <option value="all">Todos los Orígenes</option>
            <option value="openpay">Openpay</option>
            <option value="invited">Invitado</option>
            <option value="courtesy">Cortesía</option>
            <option value="speaker">Ponente</option>
            <option value="sponsor">Patrocinador</option>
            <option value="admin_manual">Manual</option>
          </select>
        </div>

        {/* Status Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Estado Inscripción
          </label>
          <select
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
          >
            <option value="all">Todos los Estados</option>
            <option value="confirmed">Confirmado</option>
            <option value="pending">Pendiente</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        {/* Payment Status Select */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Estado de Pago
          </label>
          <select
            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filters.paymentStatus}
            onChange={(e) => onChange({ ...filters, paymentStatus: e.target.value })}
          >
            <option value="all">Todos los Pagos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="not_required">No requiere pago</option>
          </select>
        </div>
      </div>
    </div>
  );
}
