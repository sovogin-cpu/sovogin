"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { BlockSpacing } from "@/lib/content/block-layout-types";
import { createDefaultBlockLayout } from "@/lib/content/block-layout-utils";
import { MoveVertical } from "lucide-react";

interface SpacingPropertiesProps {
  block: ContentBlock;
  onChange: (updatedBlock: ContentBlock) => void;
}

const SPACING_OPTIONS: Array<{ value: BlockSpacing; label: string }> = [
  { value: "none", label: "Ninguno (0px)" },
  { value: "small", label: "Pequeño (16px)" },
  { value: "medium", label: "Medio (32px)" },
  { value: "large", label: "Grande (48px)" },
  { value: "xl", label: "Extra Grande (64px)" },
];

export function SpacingProperties({ block, onChange }: SpacingPropertiesProps) {
  const layout = block.layout || createDefaultBlockLayout();

  const updateLayout = (updates: Partial<typeof layout>) => {
    onChange({
      ...block,
      layout: {
        ...layout,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
        <MoveVertical className="w-3.5 h-3.5 text-indigo-500" />
        <span>Espaciado Interno y Externo</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Padding Superior */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Padding Superior
          </label>
          <select
            value={layout.paddingTop}
            onChange={(e) => updateLayout({ paddingTop: e.target.value as BlockSpacing })}
            className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {SPACING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Padding Inferior */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Padding Inferior
          </label>
          <select
            value={layout.paddingBottom}
            onChange={(e) => updateLayout({ paddingBottom: e.target.value as BlockSpacing })}
            className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {SPACING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Margen Superior */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Margen Superior
          </label>
          <select
            value={layout.marginTop}
            onChange={(e) => updateLayout({ marginTop: e.target.value as BlockSpacing })}
            className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {SPACING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Margen Inferior */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Margen Inferior
          </label>
          <select
            value={layout.marginBottom}
            onChange={(e) => updateLayout({ marginBottom: e.target.value as BlockSpacing })}
            className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {SPACING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
