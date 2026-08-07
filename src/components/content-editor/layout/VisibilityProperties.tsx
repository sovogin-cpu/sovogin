"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { BlockVisibilityMode } from "@/lib/content/block-layout-types";
import { createDefaultBlockLayout } from "@/lib/content/block-layout-utils";
import { Eye, Lock, Globe, Users } from "lucide-react";

interface VisibilityPropertiesProps {
  block: ContentBlock;
  onChange: (updatedBlock: ContentBlock) => void;
}

export function VisibilityProperties({ block, onChange }: VisibilityPropertiesProps) {
  const layout = block.layout || createDefaultBlockLayout();
  const visibility = layout.visibility || { mode: "always" };

  const updateVisibility = (mode: BlockVisibilityMode) => {
    onChange({
      ...block,
      layout: {
        ...layout,
        visibility: {
          ...visibility,
          mode,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
        <Eye className="w-3.5 h-3.5 text-indigo-500" />
        <span>Visibilidad del Bloque</span>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
          Acceso al Bloque
        </label>

        <div className="space-y-2">
          {/* Siempre visible */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <input
              type="radio"
              name={`visibility_${block.id}`}
              checked={visibility.mode === "always"}
              onChange={() => updateVisibility("always")}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-600"
            />
            <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Siempre visible
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Accesible para todo público y miembros
              </span>
            </div>
          </label>

          {/* Solo público */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <input
              type="radio"
              name={`visibility_${block.id}`}
              checked={visibility.mode === "public_only"}
              onChange={() => updateVisibility("public_only")}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-600"
            />
            <Users className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Solo público
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Visible únicamente para visitantes sin sesión iniciada
              </span>
            </div>
          </label>

          {/* Solo asociados */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <input
              type="radio"
              name={`visibility_${block.id}`}
              checked={visibility.mode === "members_only"}
              onChange={() => updateVisibility("members_only")}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-600"
            />
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Solo asociados SOVOGIN
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Exclusivo para médicos asociados activos
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
