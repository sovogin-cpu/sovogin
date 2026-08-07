"use client";

import React from "react";
import { AttachmentBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";
import { MediaSelectorField } from "@/components/media-selector/MediaSelectorField";

export function AttachmentProperties({
  block,
  onChange,
}: BlockPropertiesProps<AttachmentBlock>) {
  const isLabelEmpty = block.label.trim() === "";

  return (
    <PropertySection title="Archivo Adjunto">
      <PropertyField
        label="Etiqueta del Archivo"
        required
        description="Texto visible del enlace de descarga"
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

      <MediaSelectorField
        value={block.mediaId}
        onChange={(mediaId) => onChange({ ...block, mediaId: mediaId || "" })}
        kind="document"
        visibilityRequirement="public"
        label="Documento desde la Biblioteca"
        description="Selecciona un PDF, Word o archivo descargable activo"
      />
    </PropertySection>
  );
}
