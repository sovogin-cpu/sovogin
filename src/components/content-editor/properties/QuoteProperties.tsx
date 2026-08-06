"use client";

import React from "react";
import { QuoteBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function QuoteProperties({
  block,
  onChange,
}: BlockPropertiesProps<QuoteBlock>) {
  const isTextEmpty = block.text.trim() === "";

  return (
    <PropertySection title="Cita Destacada">
      <PropertyField
        label="Texto de la Cita"
        required
        warning={isTextEmpty ? "El texto de la cita no debería estar vacío" : null}
      >
        <textarea
          rows={4}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Frase o testimonio a destacar..."
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Autor">
        <input
          type="text"
          value={block.author || ""}
          onChange={(e) => onChange({ ...block, author: e.target.value })}
          placeholder="Ej: Dr. Fernando Roncallo"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Fuente / Institución">
        <input
          type="text"
          value={block.source || ""}
          onChange={(e) => onChange({ ...block, source: e.target.value })}
          placeholder="Ej: Presidente SOVOGIN"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>
    </PropertySection>
  );
}
