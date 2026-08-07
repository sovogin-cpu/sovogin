"use client";

import React from "react";
import { formatRegistrationOriginLabel } from "@/lib/registrations/registration-utils";
import {
  CreditCard,
  Gift,
  Sparkles,
  Mic,
  Award,
  UserCheck,
  QrCode,
} from "lucide-react";

interface RegistrationOriginBadgeProps {
  origin?: string | null;
}

export function RegistrationOriginBadge({ origin }: RegistrationOriginBadgeProps) {
  const normalized = (origin || "admin_manual").toLowerCase();
  const label = formatRegistrationOriginLabel(origin);

  switch (normalized) {
    case "openpay":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <CreditCard className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );

    case "breb":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <QrCode className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );

    case "invited":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Gift className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );

    case "courtesy":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );

    case "speaker":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Mic className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );

    case "sponsor":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Award className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );

    case "admin_manual":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <UserCheck className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );
  }
}
