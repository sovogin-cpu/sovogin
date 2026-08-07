"use client";

import React from "react";
import { ImageBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";
import { MediaSelectorField } from "@/components/media-selector/MediaSelectorField";

export function ImageProperties({
  block,
  onChange,
}: BlockPropertiesProps<ImageBlock>) {
  return (
    <PropertySection title="Propiedades de Imagen">
      <MediaSelectorField
        value={block.mediaId}
        onChange={(mediaId) => onChange({ ...block, mediaId: mediaId || "" })}
        kind="image"
        visibilityRequirement="public"
        label="Imagen desde la Biblioteca"
        description="Selecciona una imagen publicada y activa"
      />

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
