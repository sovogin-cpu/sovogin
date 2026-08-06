"use client";

import React from "react";
import { SpacerBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function SpacerProperties({
  block,
  onChange,
}: BlockPropertiesProps<SpacerBlock>) {
  return (
    <PropertySection title="Espaciador Vertical">
      <PropertyField label="Tamaño del Espacio" description="Altura de separación en píxeles">
        <select
          value={block.size}
          onChange={(e) =>
            onChange({
              ...block,
              size: e.target.value as "small" | "medium" | "large",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="small">Pequeño (16px)</option>
          <option value="medium">Mediano (32px)</option>
          <option value="large">Grande (64px)</option>
        </select>
      </PropertyField>
    </PropertySection>
  );
}
