"use client";

import React from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface PropertyFieldProps {
  label: string;
  description?: string;
  warning?: string | null;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}

export function PropertyField({
  label,
  description,
  warning,
  error,
  required,
  children,
}: PropertyFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      </div>

      {children}

      {description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {warning && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{warning}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
