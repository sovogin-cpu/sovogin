"use client";

import React from "react";
import { GalleryBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import { PublicMedia } from "../PublicMedia";

export function GalleryPublicBlock({
  block,
  mediaMap,
}: PublicBlockRendererProps<GalleryBlock>) {
  if (!block.mediaIds || block.mediaIds.length === 0) return null;

  const uniqueIds = Array.from(new Set(block.mediaIds));

  const colsClass =
    block.columns === 4
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
      : block.columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

  return (
    <figure className="space-y-3 my-4">
      <div className={`grid ${colsClass} gap-4`}>
        {uniqueIds.map((mediaId) => (
          <div
            key={mediaId}
            className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
          >
            <PublicMedia
              mediaId={mediaId}
              mediaMap={mediaMap}
              expectedKind="image"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        ))}
      </div>
      {block.caption && (
        <figcaption className="text-xs text-center text-slate-500 dark:text-slate-400 italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
