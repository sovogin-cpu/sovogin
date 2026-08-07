"use client";

import React from "react";
import { MediaItem } from "@/lib/media/types";
import { MediaSelectorCard } from "./MediaSelectorCard";
import { AlertCircle, FolderKanban, Loader2 } from "lucide-react";

interface MediaSelectorGridProps {
  items: MediaItem[];
  signedUrls: Record<string, string>;
  selectedIds: string[];
  loading: boolean;
  errorMsg: string | null;
  onToggleSelect: (item: MediaItem) => void;
}

export function MediaSelectorGrid({
  items,
  signedUrls,
  selectedIds,
  loading,
  errorMsg,
  onToggleSelect,
}: MediaSelectorGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
        <p className="text-xs font-medium">Cargando archivos multimedia...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-center my-4 min-h-[200px]">
        <AlertCircle className="w-8 h-8 mb-2 text-red-500" />
        <p className="text-xs font-semibold">{errorMsg}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 text-center min-h-[300px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <FolderKanban className="w-10 h-10 mb-2 opacity-50 text-indigo-500" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          No se encontraron archivos
        </h4>
        <p className="text-xs max-w-sm">
          No hay elementos multimedia activos que coincidan con la búsqueda o filtro seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
      {items.map((item) => (
        <MediaSelectorCard
          key={item.id}
          item={item}
          signedUrl={signedUrls[item.id]}
          isSelected={selectedIds.includes(item.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
