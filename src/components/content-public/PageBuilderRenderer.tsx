"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  PageBuilderRendererProps,
  ResolvedPublicMediaMap,
} from "@/lib/content/public-renderer-types";
import {
  collectBlockMediaIds,
  resolvePublicMediaBatch,
  shouldRenderBlock,
} from "@/lib/content/public-renderer-utils";
import { PublicBlockRenderer } from "./PublicBlockRenderer";

export function PageBuilderRenderer({
  blocks,
  viewerType = "public",
  className = "w-full space-y-4",
}: PageBuilderRendererProps) {
  const [mediaMap, setMediaMap] = useState<ResolvedPublicMediaMap>({});

  useEffect(() => {
    let isCancelled = false;

    async function loadBatchMedia() {
      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        return;
      }

      try {
        const supabase = createClient();
        const mediaIds = collectBlockMediaIds(blocks);
        if (mediaIds.length === 0) {
          return;
        }

        const resolved = await resolvePublicMediaBatch(supabase, mediaIds);
        if (!isCancelled) {
          setMediaMap(resolved);
        }
      } catch (error) {
        console.error("Error al resolver multimedia para PageBuilderRenderer:", error);
      }
    }

    void loadBatchMedia();

    return () => {
      isCancelled = true;
    };
  }, [blocks]);

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  // Filter blocks by visibility rules
  const visibleBlocks = blocks.filter((b) => shouldRenderBlock(b, viewerType));
  if (visibleBlocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {visibleBlocks.map((block) => {
        if (!block || !block.id || !block.type) {
          return null;
        }

        try {
          return (
            <PublicBlockRenderer
              key={block.id}
              block={block}
              mediaMap={mediaMap}
              viewerType={viewerType}
            />
          );
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`Error al renderizar bloque ${block.id} (${block.type}):`, error);
          }
          return null;
        }
      })}
    </div>
  );
}
