"use client";

import React from "react";
import { UserCheck, UserX, Percent } from "lucide-react";
import { RegistrationStatsData } from "@/lib/registrations/types";

interface RegistrationCheckInStatsProps {
  stats: RegistrationStatsData;
}

export function RegistrationCheckInStats({
  stats,
}: RegistrationCheckInStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Checked In */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            Ingresaron
          </span>
          <span className="text-2xl font-extrabold text-emerald-900 dark:text-white font-heading">
            {stats.checkedIn}
          </span>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
          <UserCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Pending Check-in */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Pendientes de Ingreso
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-heading">
            {stats.notCheckedIn}
          </span>
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <UserX className="w-5 h-5" />
        </div>
      </div>

      {/* Attendance Percentage */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
            % Asistencia
          </span>
          <span className="text-2xl font-extrabold text-blue-900 dark:text-white font-heading">
            {stats.attendancePercentage}%
          </span>
        </div>
        <div className="w-9 h-9 rounded-xl bg-blue-200/60 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
          <Percent className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
