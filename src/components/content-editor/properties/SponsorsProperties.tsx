"use client";

import React, { useState } from "react";
import { SponsorsBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";
import { Plus, Trash2 } from "lucide-react";

export function SponsorsProperties({
  block,
  onChange,
}: BlockPropertiesProps<SponsorsBlock>) {
  const [newSponsorId, setNewSponsorId] = useState("");

  const handleAddSponsorId = () => {
    const trimmed = newSponsorId.trim();
    if (!trimmed) return;
    const currentList = block.sponsorIds || [];
    if (!currentList.includes(trimmed)) {
      onChange({ ...block, sponsorIds: [...currentList, trimmed] });
    }
    setNewSponsorId("");
  };

  const handleRemoveSponsorId = (index: number) => {
    const currentList = [...(block.sponsorIds || [])];
    currentList.splice(index, 1);
    onChange({ ...block, sponsorIds: currentList });
  };

  return (
    <PropertySection title="Patrocinadores y Aliados">
      <PropertyField label="Título de la Sección">
        <input
          type="text"
          value={block.title || ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Nuestros Patrocinadores"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Modo de Selección de Patrocinadores">
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={block.showAllActive}
            onChange={(e) => onChange({ ...block, showAllActive: e.target.checked })}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Mostrar automáticamente todos los patrocinadores activos</span>
        </label>
      </PropertyField>

      <PropertyField label="Estilo de Visualización">
        <select
          value={block.displayStyle}
          onChange={(e) =>
            onChange({
              ...block,
              displayStyle: e.target.value as "grid" | "carousel",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="grid">Cuadrícula (Grid)</option>
          <option value="carousel">Carrusel Infinito</option>
        </select>
      </PropertyField>

      {!block.showAllActive && (
        <PropertyField label="Selección Manual de Patrocinadores (sponsorIds)">
          <div className="space-y-2">
            {(block.sponsorIds || []).map((id, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="flex-1 p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono truncate">
                  {id}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSponsorId(idx)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSponsorId}
                onChange={(e) => setNewSponsorId(e.target.value)}
                placeholder="ID de patrocinador..."
                className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono outline-none"
              />
              <button
                type="button"
                onClick={handleAddSponsorId}
                className="p-1.5 bg-indigo-600 text-white rounded text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </PropertyField>
      )}
    </PropertySection>
  );
}
