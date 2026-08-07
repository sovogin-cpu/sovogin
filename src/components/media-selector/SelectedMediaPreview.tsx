"use client";

import React from "react";
import { MediaItem } from "@/lib/media/types";
import {
  formatMediaDimensions,
  formatMediaFileSize,
  isMediaItemImage,
} from "@/lib/media/media-selector-utils";
import { FileText, Image as ImageIcon, FolderKanban, X } from "lucide-react";

interface SelectedMediaPreviewProps {
  item: MediaItem | null;
  signedUrl?: string;
  onOpenSelector: () => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function SelectedMediaPreview({
  item,
  signedUrl,
  onOpenSelector,
  onClear,
  disabled,
}: SelectedMediaPreviewProps) {
  if (!item) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 shrink-0">
          <ImageIcon className="w-5 h-5 mb-0.5 opacity-60" />
          <span className="text-[9px] font-medium">Vacio</span>
        </div>
        <button
          type="button"
          onClick={onOpenSelector}
          disabled={disabled}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Seleccionar de la Biblioteca</span>
        </button>
      </div>
    );
  }

  const isImage = isMediaItemImage(item);
  const dimensions = formatMediaDimensions(item.width, item.height);
  const fileSize = formatMediaFileSize(item.file_size_bytes);

  return (
    <div className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
      {/* Thumbnail or File Icon */}
      <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
        {isImage && signedUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={signedUrl}
            alt={item.alt_text || item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-7 h-7 text-indigo-500" />
        )}
      </div>

      {/* Info Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
          {item.title}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {item.original_filename}
        </p>
        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
          {fileSize} {dimensions ? `• ${dimensions}` : ""}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenSelector}
          disabled={disabled}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          Cambiar
        </button>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Quitar selección"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
