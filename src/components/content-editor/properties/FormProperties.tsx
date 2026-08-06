"use client";

import React from "react";
import { FormBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function FormProperties({
  block,
  onChange,
}: BlockPropertiesProps<FormBlock>) {
  return (
    <PropertySection title="Formulario Interactivo">
      <PropertyField
        label="Clave del Formulario (formKey)"
        required
        description="Identificador del tipo de formulario (ej: contact, registration)"
      >
        <input
          type="text"
          value={block.formKey}
          onChange={(e) => onChange({ ...block, formKey: e.target.value })}
          placeholder="contact"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Título Encabezado">
        <input
          type="text"
          value={block.title || ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Ej: Contáctanos"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Descripción">
        <textarea
          rows={3}
          value={block.description || ""}
          onChange={(e) => onChange({ ...block, description: e.target.value })}
          placeholder="Instrucciones para el usuario..."
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>
    </PropertySection>
  );
}
