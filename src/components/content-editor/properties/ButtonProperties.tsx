"use client";

import React from "react";
import { ButtonBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { isValidSafeHref } from "@/lib/content/block-schema";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function ButtonProperties({
  block,
  onChange,
}: BlockPropertiesProps<ButtonBlock>) {
  const isHrefValid = isValidSafeHref(block.href);

  return (
    <PropertySection title="Botón de Acción">
      <PropertyField label="Texto del Botón" required>
        <input
          type="text"
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Ej: Inscribirme ahora"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField
        label="Enlace (Href)"
        required
        description="URL relativa (/eventos) o absoluta (https://...)"
        warning={!isHrefValid && block.href.trim() !== "" ? "El enlace ingresado no tiene un formato seguro o válido" : null}
      >
        <input
          type="text"
          value={block.href}
          onChange={(e) => onChange({ ...block, href: e.target.value })}
          placeholder="/contacto o https://..."
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Estilo del Botón">
        <select
          value={block.variant}
          onChange={(e) =>
            onChange({
              ...block,
              variant: e.target.value as "primary" | "secondary" | "outline",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="primary">Primario (Solido Índigo)</option>
          <option value="secondary">Secundario (Gris Oscuro)</option>
          <option value="outline">Borde (Outline)</option>
        </select>
      </PropertyField>

      <PropertyField label="Alineación Horizontal">
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

      <PropertyField label="Destino">
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={block.openInNewTab}
            onChange={(e) => onChange({ ...block, openInNewTab: e.target.checked })}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Abrir enlace en nueva pestaña (_blank)</span>
        </label>
      </PropertyField>
    </PropertySection>
  );
}
