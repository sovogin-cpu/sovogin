"use client";

import React from "react";
import { AttachmentBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AttachmentProperties({
  block,
  onChange,
}: BlockPropertiesProps<AttachmentBlock>) {
  const isLabelEmpty = block.label.trim() === "";
  const isUuidValid = UUID_REGEX.test(block.mediaId.trim());

  return (
    <PropertySection title="Archivo Adjunto">
      <PropertyField
        label="Etiqueta del Archivo"
        required
        description="Texto del enlace descargable"
        warning={isLabelEmpty ? "La etiqueta no debería estar vacía" : null}
      >
        <input
          type="text"
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Ej: Descargar programa oficial en PDF"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField
        label="ID Multimedia (mediaId)"
        required
        description="Identificador del documento en la biblioteca multimedia"
        warning={!isUuidValid ? "Formato UUID de mediaId no es válido" : null}
      >
        <input
          type="text"
          value={block.mediaId}
          onChange={(e) => onChange({ ...block, mediaId: e.target.value })}
          placeholder="123e4567-e89b-12d3-a456-426614174000"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>
    </PropertySection>
  );
}
