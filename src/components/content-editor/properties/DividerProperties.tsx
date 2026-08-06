"use client";

import React from "react";
import { DividerBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function DividerProperties({
  block,
  onChange,
}: BlockPropertiesProps<DividerBlock>) {
  return (
    <PropertySection title="Separador Horizontal">
      <PropertyField label="Estilo de la Línea">
        <select
          value={block.style}
          onChange={(e) =>
            onChange({
              ...block,
              style: e.target.value as "solid" | "dashed" | "subtle",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="subtle">Sutil (Por defecto)</option>
          <option value="solid">Sólido</option>
          <option value="dashed">Punteado (Dashed)</option>
        </select>
      </PropertyField>
    </PropertySection>
  );
}
