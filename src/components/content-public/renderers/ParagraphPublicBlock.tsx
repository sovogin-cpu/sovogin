"use client";

import React from "react";
import { ParagraphBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";

export function ParagraphPublicBlock({
  block,
}: PublicBlockRendererProps<ParagraphBlock>) {
  if (!block.text) return null;

  return (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base sm:text-lg whitespace-pre-wrap my-1 font-sans">
      {block.text}
    </p>
  );
}
