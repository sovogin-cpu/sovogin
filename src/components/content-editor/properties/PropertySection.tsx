"use client";

import React from "react";

interface PropertySectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PropertySection({
  title,
  description,
  children,
}: PropertySectionProps) {
  return (
    <div className="py-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0 space-y-3">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {title}
        </h4>
        {description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}
