"use client";

import React from "react";
import { ImageBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import { PublicMedia } from "../PublicMedia";

export function ImagePublicBlock({
  block,
  mediaMap,
}: PublicBlockRendererProps<ImageBlock>) {
  if (!block.mediaId) return null;

  return (
    <figure className="space-y-2 my-4">
      <PublicMedia
        mediaId={block.mediaId}
        mediaMap={mediaMap}
        expectedKind="image"
        alt={block.altText || block.caption || "Imagen de publicación"}
        className="w-full h-auto rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 object-cover"
      />
      {block.caption && (
        <figcaption className="text-xs text-center text-slate-500 dark:text-slate-400 italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
