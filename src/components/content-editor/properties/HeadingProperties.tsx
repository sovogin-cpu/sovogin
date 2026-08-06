"use client";

import React from "react";
import { HeadingBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function HeadingProperties({
  block,
  onChange,
}: BlockPropertiesProps<HeadingBlock>) {
  const isTextEmpty = block.text.trim() === "";

  return (
    <PropertySection title="Propiedades de Título">
      <PropertyField
        label="Texto del Título"
        required
        warning={isTextEmpty ? "El título no debería estar vacío" : null}
      >
        <input
          type="text"
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Escribe el título de la sección..."
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Nivel Jerárquico" description="Determina el tamaño y semántica (H2 o H3)">
        <select
          value={block.level}
          onChange={(e) =>
            onChange({ ...block, level: Number(e.target.value) as 2 | 3 })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value={2}>H2 - Título Principal</option>
          <option value={3}>H3 - Subtítulo</option>
        </select>
      </PropertyField>
    </PropertySection>
  );
}
