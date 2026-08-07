"use client";

import React from "react";
import { AttachmentBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import { PublicMedia } from "../PublicMedia";

export function AttachmentPublicBlock({
  block,
  mediaMap,
}: PublicBlockRendererProps<AttachmentBlock>) {
  if (!block.mediaId) return null;

  return (
    <div className="my-3">
      <PublicMedia
        mediaId={block.mediaId}
        mediaMap={mediaMap}
        expectedKind="any"
        alt={block.label}
      />
    </div>
  );
}
