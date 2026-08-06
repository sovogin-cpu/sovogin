"use client";

import React from "react";
import { YoutubeBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { getYoutubeEmbedUrl } from "@/lib/content/content-utils";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function YoutubeProperties({
  block,
  onChange,
}: BlockPropertiesProps<YoutubeBlock>) {
  const embedUrl = getYoutubeEmbedUrl(block.url);
  const isValid = Boolean(embedUrl);

  return (
    <PropertySection title="Video de YouTube">
      <PropertyField
        label="URL del Video"
        required
        description="Enlace completo de YouTube (ej: https://www.youtube.com/watch?v=... o https://youtu.be/...)"
        warning={!isValid && block.url.trim() !== "" ? "La URL ingresada no es un enlace válido de YouTube" : null}
      >
        <input
          type="url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Leyenda" description="Texto descriptivo opcional visible al pie del video">
        <input
          type="text"
          value={block.caption || ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Ej: Resumen del simposio de ginecología 2026"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>
    </PropertySection>
  );
}
