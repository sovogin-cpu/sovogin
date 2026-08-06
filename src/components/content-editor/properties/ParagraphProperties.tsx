"use client";

import React from "react";
import { ParagraphBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function ParagraphProperties({
  block,
  onChange,
}: BlockPropertiesProps<ParagraphBlock>) {
  const isTextEmpty = block.text.trim() === "";

  return (
    <PropertySection title="Contenido de Párrafo">
      <PropertyField
        label="Texto"
        required
        warning={isTextEmpty ? "El texto del párrafo no debería estar vacío" : null}
      >
        <textarea
          rows={6}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Escribe aquí el contenido del párrafo..."
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
        />
      </PropertyField>
    </PropertySection>
  );
}
