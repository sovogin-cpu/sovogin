"use client";

import React, { useState } from "react";
import { GalleryBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";
import { Plus, Trash2 } from "lucide-react";

export function GalleryProperties({
  block,
  onChange,
}: BlockPropertiesProps<GalleryBlock>) {
  const [newIdInput, setNewIdInput] = useState("");

  const handleAddId = () => {
    const trimmed = newIdInput.trim();
    if (!trimmed) return;
    if (!block.mediaIds.includes(trimmed)) {
      onChange({ ...block, mediaIds: [...block.mediaIds, trimmed] });
    }
    setNewIdInput("");
  };

  const handleRemoveId = (index: number) => {
    const updated = [...block.mediaIds];
    updated.splice(index, 1);
    onChange({ ...block, mediaIds: updated });
  };

  const handleUpdateId = (index: number, val: string) => {
    const updated = [...block.mediaIds];
    updated[index] = val;
    onChange({ ...block, mediaIds: updated });
  };

  return (
    <PropertySection title="Galería de Imágenes">
      <PropertyField label="Número de Columnas">
        <select
          value={block.columns}
          onChange={(e) =>
            onChange({
              ...block,
              columns: Number(e.target.value) as 2 | 3 | 4,
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value={2}>2 Columnas</option>
          <option value={3}>3 Columnas</option>
          <option value={4}>4 Columnas</option>
        </select>
      </PropertyField>

      <PropertyField label="Leyenda General" description="Pie de foto descriptivo de la galería">
        <input
          type="text"
          value={block.caption || ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Ej: Galería de fotos del evento"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Lista de IDs de Imágenes (mediaIds)">
        <div className="space-y-2">
          {block.mediaIds.map((mediaId, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <input
                type="text"
                value={mediaId}
                onChange={(e) => handleUpdateId(idx, e.target.value)}
                className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => handleRemoveId(idx)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                title="Eliminar ID"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newIdInput}
              onChange={(e) => setNewIdInput(e.target.value)}
              placeholder="Añadir nuevo mediaId..."
              className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
            />
            <button
              type="button"
              onClick={handleAddId}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </div>
      </PropertyField>
    </PropertySection>
  );
}
