"use client";

import React, { useState } from "react";
import { MediaItem } from "@/lib/media/types";
import {
  formatMediaDimensions,
  formatMediaFileSize,
  isMediaItemImage,
} from "@/lib/media/media-selector-utils";
import { Check, FileText, Image as ImageIcon } from "lucide-react";

interface MediaSelectorCardProps {
  item: MediaItem;
  signedUrl?: string;
  isSelected: boolean;
  onToggleSelect: (item: MediaItem) => void;
}

export function MediaSelectorCard({
  item,
  signedUrl,
  isSelected,
  onToggleSelect,
}: MediaSelectorCardProps) {
  const [imgError, setImgError] = useState(false);
  const isImage = isMediaItemImage(item);
  const dimensions = formatMediaDimensions(item.width, item.height);
  const fileSize = formatMediaFileSize(item.file_size_bytes);

  return (
    <div
      onClick={() => onToggleSelect(item)}
      className={`relative rounded-xl border p-2.5 bg-white dark:bg-slate-900 cursor-pointer transition-all duration-150 flex flex-col justify-between group select-none ${
        isSelected
          ? "border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
          : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm"
      }`}
    >
      {/* Selection Checkmark Badge */}
      <div
        className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-colors ${
          isSelected
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-transparent"
        }`}
      >
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </div>

      {/* Thumbnail or File Icon Box */}
      <div className="h-28 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center mb-2.5 relative">
        {isImage && signedUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={signedUrl}
            alt={item.alt_text || item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : isImage ? (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8 mb-1 opacity-70" />
            <span className="text-[10px]">Imagen</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-8 h-8 mb-1 text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {item.file_extension || "DOC"}
            </span>
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
          {item.title}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {item.original_filename}
        </p>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>{fileSize}</span>
          {dimensions ? (
            <span>{dimensions}</span>
          ) : (
            <span className="capitalize">{item.media_categories?.name || "General"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
