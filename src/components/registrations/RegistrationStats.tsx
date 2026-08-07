"use client";

import React from "react";
import { RegistrationStatsData } from "@/lib/registrations/types";
import {
  formatCopCurrency,
  formatRegistrationOriginLabel,
} from "@/lib/registrations/registration-utils";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  ShieldCheck,
  Monitor,
  Building2,
  Tags,
  Compass,
} from "lucide-react";

interface RegistrationStatsProps {
  stats: RegistrationStatsData;
  selectedEventTitle?: string;
}

export function RegistrationStats({
  stats,
  selectedEventTitle,
}: RegistrationStatsProps) {
  const categoryEntries = Object.entries(stats.byCategory);

  return (
    <div className="space-y-6">
      {/* Scope Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
          Resumen Ejecutivo {selectedEventTitle ? `— ${selectedEventTitle}` : "(Todos los eventos)"}
        </h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inscritos
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
            {stats.total}
          </p>
        </div>

        {/* Status Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Estados de Asistencia
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 text-xs font-bold">
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {stats.confirmed} Conf.
            </span>
            <span className="text-amber-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {stats.pending} Pend.
            </span>
            <span className="text-red-500 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {stats.cancelled} Canc.
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recaudación Confirmada
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#006666] dark:text-emerald-400 font-heading truncate">
            {formatCopCurrency(stats.totalRevenue)}
          </p>
        </div>

        {/* Payment Type Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Modalidades de Pago
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs font-bold">
            <span className="text-emerald-700 dark:text-emerald-400">
              {stats.paid} Pagados
            </span>
            <span className="text-slate-500">
              {stats.notRequired} Cortesía/Inv.
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Modality Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Por Modalidad</span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Presencial
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats.byModality["presencial"] || 0}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Monitor className="w-3.5 h-3.5 text-slate-400" /> Virtual
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats.byModality["virtual"] || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs">
            <Tags className="w-4 h-4 text-indigo-600" />
            <span>Por Categoría</span>
          </div>

          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
            {categoryEntries.length > 0 ? (
              categoryEntries.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[150px]">
                    {cat}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{count}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">Sin categorías registradas</span>
            )}
          </div>
        </div>

        {/* Origin Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs">
            <Compass className="w-4 h-4 text-amber-600" />
            <span>Por Origen</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            {Object.entries(stats.byOrigin).map(([orig, count]) => (
              <div key={orig} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {formatRegistrationOriginLabel(orig)}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
