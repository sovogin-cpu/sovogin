"use client";

import React from "react";
import { HeroBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function HeroProperties({
  block,
  onChange,
}: BlockPropertiesProps<HeroBlock>) {
  return (
    <PropertySection title="Encabezado Principal (Hero)">
      <PropertyField label="Título Principal" required>
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Título de gran impacto..."
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Subtítulo">
        <textarea
          rows={3}
          value={block.subtitle || ""}
          onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
          placeholder="Texto secundario o bajada..."
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Alineación">
        <select
          value={block.alignment}
          onChange={(e) =>
            onChange({
              ...block,
              alignment: e.target.value as "left" | "center" | "right",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </PropertyField>

      <PropertyField label="Fondo (mediaId)" description="ID de imagen de fondo opcional">
        <input
          type="text"
          value={block.mediaId || ""}
          onChange={(e) => onChange({ ...block, mediaId: e.target.value })}
          placeholder="ID de imagen de fondo"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Capa de Oscurecimiento (Overlay)">
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(block.overlay)}
            onChange={(e) => onChange({ ...block, overlay: e.target.checked })}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Oscurecer fondo para mayor legibilidad del texto</span>
        </label>
      </PropertyField>

      {/* Primary Button */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
          Botón Principal
        </h5>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={block.primaryButton?.label || ""}
            onChange={(e) =>
              onChange({
                ...block,
                primaryButton: {
                  label: e.target.value,
                  href: block.primaryButton?.href || "",
                },
              })
            }
            placeholder="Texto botón"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
          />
          <input
            type="text"
            value={block.primaryButton?.href || ""}
            onChange={(e) =>
              onChange({
                ...block,
                primaryButton: {
                  label: block.primaryButton?.label || "",
                  href: e.target.value,
                },
              })
            }
            placeholder="URL (/asociarse)"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>
      </div>
    </PropertySection>
  );
}
