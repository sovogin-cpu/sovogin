"use client";

import React from "react";
import { MapBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import { createSafeMapsUrl } from "@/lib/content/public-renderer-utils";
import { MapPin, ExternalLink } from "lucide-react";

export function MapPublicBlock({
  block,
}: PublicBlockRendererProps<MapBlock>) {
  if (!block.address) return null;

  const mapsUrl = createSafeMapsUrl(
    block.address,
    block.latitude,
    block.longitude
  );

  return (
    <div className="my-4 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
          <MapPin className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-base text-slate-900 dark:text-white font-heading">
            {block.title || "Ubicación"}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {block.address}
          </p>
        </div>
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors shadow-sm inline-flex items-center gap-2 shrink-0"
      >
        <span>Abrir en Mapa</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
