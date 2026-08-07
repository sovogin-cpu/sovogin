"use client";

import React from "react";
import { formatRegistrationPaymentStatusLabel } from "@/lib/registrations/registration-utils";
import { DollarSign, Clock, ShieldCheck } from "lucide-react";

interface PaymentStatusBadgeProps {
  paymentStatus?: string | null;
}

export function PaymentStatusBadge({ paymentStatus }: PaymentStatusBadgeProps) {
  const normalized = (paymentStatus || "pending").toLowerCase();
  const label = formatRegistrationPaymentStatusLabel(paymentStatus);

  switch (normalized) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <DollarSign className="w-3 h-3 text-emerald-600" />
          <span>{label}</span>
        </span>
      );

    case "not_required":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <ShieldCheck className="w-3 h-3 text-slate-500" />
          <span>{label}</span>
        </span>
      );

    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{label}</span>
        </span>
      );
  }
}
