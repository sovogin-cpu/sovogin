"use client";

import React from "react";
import { MapBlock } from "@/lib/content/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";

export function MapProperties({
  block,
  onChange,
}: BlockPropertiesProps<MapBlock>) {
  const isLatOutOfRange =
    block.latitude !== undefined && (block.latitude < -90 || block.latitude > 90);
  const isLngOutOfRange =
    block.longitude !== undefined && (block.longitude < -180 || block.longitude > 180);
  const isZoomOutOfRange =
    block.zoom !== undefined && (block.zoom < 1 || block.zoom > 20);

  return (
    <PropertySection title="Mapa Geográfico">
      <PropertyField label="Título del Mapa">
        <input
          type="text"
          value={block.title || ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Ej: Nuestra Sede Principal"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField label="Dirección" required>
        <input
          type="text"
          value={block.address}
          onChange={(e) => onChange({ ...block, address: e.target.value })}
          placeholder="Calle 20 Norte No. 6N – 33, Cali"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <div className="grid grid-cols-2 gap-2">
        <PropertyField
          label="Latitud"
          warning={isLatOutOfRange ? "La latitud debe estar entre -90 y 90" : null}
        >
          <input
            type="number"
            step="any"
            value={block.latitude ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                latitude: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="3.4516"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
          />
        </PropertyField>

        <PropertyField
          label="Longitud"
          warning={isLngOutOfRange ? "La longitud debe estar entre -180 y 180" : null}
        >
          <input
            type="number"
            step="any"
            value={block.longitude ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                longitude: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="-76.5320"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
          />
        </PropertyField>
      </div>

      <PropertyField
        label="Nivel de Zoom"
        description="Valor entre 1 (mapa mundial) y 20 (nivel de calle)"
        warning={isZoomOutOfRange ? "El zoom debe estar entre 1 y 20" : null}
      >
        <input
          type="number"
          min={1}
          max={20}
          value={block.zoom ?? 15}
          onChange={(e) =>
            onChange({
              ...block,
              zoom: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
        />
      </PropertyField>
    </PropertySection>
  );
}
