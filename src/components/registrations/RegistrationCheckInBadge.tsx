"use client";

import React from "react";
import { UserCheck, UserX } from "lucide-react";

interface RegistrationCheckInBadgeProps {
  checkedInAt?: string | null;
}

export function RegistrationCheckInBadge({
  checkedInAt,
}: RegistrationCheckInBadgeProps) {
  if (checkedInAt) {
    const timeStr = new Date(checkedInAt).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <span
        title={`Ingreso registrado: ${new Date(checkedInAt).toLocaleString("es-CO")}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
      >
        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Ingresó ({timeStr})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      <UserX className="w-3.5 h-3.5 text-slate-400" />
      <span>No ha ingresado</span>
    </span>
  );
}
