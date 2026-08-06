"use client";

import React from "react";
import { CtaBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function CtaProperties({
  block,
  onChange,
}: BlockPropertiesProps<CtaBlock>) {
  return (
    <PropertySection title="Llamado a la Acción (CTA)">
      <PropertyField label="Título" required>
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Ej: ¿Deseas afiliarte a SOVOGIN?"
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Texto Descriptivo">
        <textarea
          rows={3}
          value={block.text || ""}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Explicación o beneficios del llamado..."
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Texto del Botón" required>
        <input
          type="text"
          value={block.buttonLabel}
          onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })}
          placeholder="Ej: Conoce los requisitos"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Enlace del Botón (Href)" required>
        <input
          type="text"
          value={block.buttonHref}
          onChange={(e) => onChange({ ...block, buttonHref: e.target.value })}
          placeholder="/asociarse"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Estilo Visual">
        <select
          value={block.style}
          onChange={(e) =>
            onChange({
              ...block,
              style: e.target.value as "light" | "dark" | "brand",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="brand">Marca (Índigo)</option>
          <option value="dark">Oscuro</option>
          <option value="light">Claro</option>
        </select>
      </PropertyField>
    </PropertySection>
  );
}
