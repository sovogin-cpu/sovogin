"use client";

import React from "react";
import { SpacerBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";

export function SpacerPublicBlock({
  block,
}: PublicBlockRendererProps<SpacerBlock>) {
  const heightClass =
    block.size === "small"
      ? "h-6 sm:h-8"
      : block.size === "large"
      ? "h-20 sm:h-24"
      : "h-12 sm:h-16";

  return <div className={`w-full ${heightClass}`} aria-hidden="true" />;
}
