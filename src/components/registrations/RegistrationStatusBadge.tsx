"use client";

import React from "react";
import { formatRegistrationStatusLabel } from "@/lib/registrations/registration-utils";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface RegistrationStatusBadgeProps {
  status?: string | null;
}

export function RegistrationStatusBadge({ status }: RegistrationStatusBadgeProps) {
  const normalized = (status || "pending").toLowerCase();
  const label = formatRegistrationStatusLabel(status);

  switch (normalized) {
    case "confirmed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>{label}</span>
        </span>
      );

    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
          <XCircle className="w-3.5 h-3.5 text-red-500" />
          <span>{label}</span>
        </span>
      );

    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{label}</span>
        </span>
      );
  }
}
