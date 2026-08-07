"use client";

import React from "react";
import { ResolvedPublicMediaMap } from "@/lib/content/public-renderer-types";
import { FileText, Download } from "lucide-react";

interface PublicMediaProps {
  mediaId: string;
  mediaMap: ResolvedPublicMediaMap;
  expectedKind?: "image" | "document" | "any";
  alt?: string;
  className?: string;
}

export function PublicMedia({
  mediaId,
  mediaMap,
  expectedKind = "any",
  alt,
  className,
}: PublicMediaProps) {
  if (!mediaId) return null;

  const item = mediaMap[mediaId];
  if (!item || !item.signedUrl) return null;

  const isImage = item.mime_type.startsWith("image/");

  if (expectedKind === "image" && !isImage) {
    return null;
  }

  if (expectedKind === "document" && isImage) {
    return null;
  }

  if (isImage) {
    return (
      <img
        src={item.signedUrl}
        alt={alt || item.alt_text || item.title || "Imagen de contenido"}
        className={className || "w-full h-auto object-cover rounded-xl"}
      />
    );
  }

  // Document renderer
  return (
    <a
      href={item.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        "inline-flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200"
      }
    >
      <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-[#006666] dark:text-emerald-400 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-sm block truncate">
          {item.title || item.original_filename}
        </span>
        <span className="text-xs text-slate-500 font-medium">
          Descargar documento seguro
        </span>
      </div>
      <Download className="w-4 h-4 text-slate-400 shrink-0" />
    </a>
  );
}
