"use client";

import React from "react";
import { ImageBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ImageProperties({
  block,
  onChange,
}: BlockPropertiesProps<ImageBlock>) {
  const isUuidValid = UUID_REGEX.test(block.mediaId.trim());

  return (
    <PropertySection title="Propiedades de Imagen">
      <PropertyField
        label="ID Multimedia (mediaId)"
        required
        description="Identificador UUID único del archivo en Supabase Storage"
        warning={!isUuidValid ? "Formato UUID de mediaId no es válido (ej: 123e4567-e89b-12d3-a456-426614174000)" : null}
      >
        <input
          type="text"
          value={block.mediaId}
          onChange={(e) => onChange({ ...block, mediaId: e.target.value })}
          placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Leyenda (Caption)" description="Texto explicativo visible debajo de la imagen">
        <input
          type="text"
          value={block.caption || ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Ej: Fotografía tomada durante la convención anual"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Texto Alternativo (Alt)" description="Texto para lectores de pantalla y accesibilidad SEO">
        <input
          type="text"
          value={block.altText || ""}
          onChange={(e) => onChange({ ...block, altText: e.target.value })}
          placeholder="Ej: Junta directiva de SOVOGIN 2026"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>
    </PropertySection>
  );
}
