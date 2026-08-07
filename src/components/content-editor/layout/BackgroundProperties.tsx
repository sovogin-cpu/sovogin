"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { BlockBackgroundType } from "@/lib/content/block-layout-types";
import { createDefaultBlockLayout } from "@/lib/content/block-layout-utils";
import { MediaSelectorField } from "@/components/media-selector/MediaSelectorField";
import { Palette } from "lucide-react";

interface BackgroundPropertiesProps {
  block: ContentBlock;
  onChange: (updatedBlock: ContentBlock) => void;
}

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function BackgroundProperties({ block, onChange }: BackgroundPropertiesProps) {
  const layout = block.layout || createDefaultBlockLayout();
  const background = layout.background || { type: "none" };

  const updateBackground = (updates: Partial<typeof background>) => {
    onChange({
      ...block,
      layout: {
        ...layout,
        background: {
          ...background,
          ...updates,
        },
      },
    });
  };

  const handleColorChange = (colorValue: string) => {
    updateBackground({
      type: "color",
      color: colorValue,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
        <Palette className="w-3.5 h-3.5 text-indigo-500" />
        <span>Fondo del Bloque</span>
      </div>

      {/* Tipo de fondo */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Tipo de Fondo
        </label>
        <select
          value={background.type}
          onChange={(e) => {
            const newType = e.target.value as BlockBackgroundType;
            if (newType === "color") {
              updateBackground({ type: "color", color: background.color || "#f8fafc" });
            } else if (newType === "image") {
              updateBackground({ type: "image", overlay: background.overlay ?? true });
            } else {
              updateBackground({ type: "none" });
            }
          }}
          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="none">Sin fondo (Transparente)</option>
          <option value="color">Color sólido</option>
          <option value="image">Imagen de la Biblioteca</option>
        </select>
      </div>

      {/* Opción Color */}
      {background.type === "color" && (
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            Seleccionar Color (HEX)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={HEX_COLOR_REGEX.test(background.color || "") ? background.color : "#f8fafc"}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              value={background.color || ""}
              onChange={(e) => handleColorChange(e.target.value)}
              placeholder="#f8fafc"
              className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 font-mono text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      )}

      {/* Opción Imagen */}
      {background.type === "image" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <MediaSelectorField
            value={background.mediaId || null}
            onChange={(mediaId) => updateBackground({ mediaId: mediaId || undefined })}
            kind="image"
            visibilityRequirement="public"
            label="Imagen de Fondo"
            description="Solo imágenes de la Biblioteca Multimedia pública"
          />

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(background.overlay)}
              onChange={(e) => updateBackground({ overlay: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-700"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Aplicar capa de oscurecimiento (Overlay)
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
