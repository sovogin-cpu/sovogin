"use client";

import React from "react";
import { YoutubeBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import { getYoutubeEmbedUrl } from "@/lib/content/content-utils";

export function YoutubePublicBlock({
  block,
}: PublicBlockRendererProps<YoutubeBlock>) {
  const embedUrl = getYoutubeEmbedUrl(block.url);
  if (!embedUrl) return null;

  return (
    <figure className="space-y-2 my-4">
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 bg-black">
        <iframe
          src={embedUrl}
          title={block.caption || "Video incrustado de YouTube"}
          loading="lazy"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {block.caption && (
        <figcaption className="text-xs text-center text-slate-500 dark:text-slate-400 italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
