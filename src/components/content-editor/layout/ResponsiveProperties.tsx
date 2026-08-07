"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { createDefaultBlockLayout } from "@/lib/content/block-layout-utils";
import { Smartphone, Tablet, Monitor, Info } from "lucide-react";

interface ResponsivePropertiesProps {
  block: ContentBlock;
  onChange: (updatedBlock: ContentBlock) => void;
}

export function ResponsiveProperties({ block, onChange }: ResponsivePropertiesProps) {
  const layout = block.layout || createDefaultBlockLayout();
  const responsive = layout.responsive || {
    hideOnMobile: false,
    hideOnTablet: false,
    hideOnDesktop: false,
  };

  const updateResponsive = (updates: Partial<typeof responsive>) => {
    onChange({
      ...block,
      layout: {
        ...layout,
        responsive: {
          ...responsive,
          ...updates,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
        <Monitor className="w-3.5 h-3.5 text-indigo-500" />
        <span>Adaptabilidad Responsive</span>
      </div>

      {/* Switches para Ocultar por dispositivo */}
      <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
          Visibilidad por Dispositivo
        </span>

        <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            Ocultar en Móvil (&lt;640px)
          </span>
          <input
            type="checkbox"
            checked={responsive.hideOnMobile}
            onChange={(e) => updateResponsive({ hideOnMobile: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-700"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Tablet className="w-3.5 h-3.5 text-slate-400" />
            Ocultar en Tablet (640px - 1024px)
          </span>
          <input
            type="checkbox"
            checked={responsive.hideOnTablet}
            onChange={(e) => updateResponsive({ hideOnTablet: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-700"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            Ocultar en Escritorio (&gt;1024px)
          </span>
          <input
            type="checkbox"
            checked={responsive.hideOnDesktop}
            onChange={(e) => updateResponsive({ hideOnDesktop: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-700"
          />
        </label>
      </div>

      {/* Columnas específicas para Móvil y Tablet */}
      {layout.columns > 1 && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Cols en Móvil
            </label>
            <select
              value={responsive.mobileColumns || 1}
              onChange={(e) =>
                updateResponsive({
                  mobileColumns: Number(e.target.value) as 1 | 2,
                })
              }
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={1}>1 Columna</option>
              <option value={2}>2 Columnas</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Cols en Tablet
            </label>
            <select
              value={responsive.tabletColumns || (layout.columns > 2 ? 2 : layout.columns)}
              onChange={(e) =>
                updateResponsive({
                  tabletColumns: Number(e.target.value) as 1 | 2 | 3,
                })
              }
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={1}>1 Columna</option>
              <option value={2}>2 Columnas</option>
              <option value={3}>3 Columnas</option>
            </select>
          </div>
        </div>
      )}

      {/* Notice Message */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <span>
          Los controles responsive modifican únicamente la presentación del bloque, no su contenido.
        </span>
      </div>
    </div>
  );
}
