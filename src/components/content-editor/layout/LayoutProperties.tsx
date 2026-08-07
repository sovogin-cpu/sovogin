"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import {
  BlockAlignment,
  BlockColumns,
  BlockGap,
  BlockWidth,
} from "@/lib/content/block-layout-types";
import { createDefaultBlockLayout } from "@/lib/content/block-layout-utils";
import { LayoutGrid, Maximize2, AlignLeft, Grid } from "lucide-react";

interface LayoutPropertiesProps {
  block: ContentBlock;
  onChange: (updatedBlock: ContentBlock) => void;
}

export function LayoutProperties({ block, onChange }: LayoutPropertiesProps) {
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

  const isColumnsSupported = block.type !== "spacer" && block.type !== "divider";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
        <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
        <span>Distribución y Ancho</span>
      </div>

      {/* Ancho */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Ancho del bloque
        </label>
        <select
          value={layout.width}
          onChange={(e) => updateLayout({ width: e.target.value as BlockWidth })}
          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="container">Contenedor (Normal)</option>
          <option value="full">Pantalla completa (100% ancho)</option>
          <option value="narrow">Estrecho (Lectura)</option>
        </select>
      </div>

      {/* Alineación */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <AlignLeft className="w-3 h-3 text-slate-400" />
          Alineación de contenido
        </label>
        <select
          value={layout.alignment}
          onChange={(e) => updateLayout({ alignment: e.target.value as BlockAlignment })}
          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
          <option value="stretch">Estirar (Ancho completo)</option>
        </select>
      </div>

      {/* Columnas (si aplica) */}
      {isColumnsSupported && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <Grid className="w-3 h-3 text-slate-400" />
              Columnas
            </label>
            <select
              value={layout.columns}
              onChange={(e) => updateLayout({ columns: Number(e.target.value) as BlockColumns })}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={1}>1 Columna</option>
              <option value={2}>2 Columnas</option>
              <option value={3}>3 Columnas</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <LayoutGrid className="w-3 h-3 text-slate-400" />
              Separación
            </label>
            <select
              value={layout.columnGap}
              onChange={(e) => updateLayout({ columnGap: e.target.value as BlockGap })}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="none">Ninguna</option>
              <option value="small">Pequeña</option>
              <option value="medium">Media</option>
              <option value="large">Grande</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
