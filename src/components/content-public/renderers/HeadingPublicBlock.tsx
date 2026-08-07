"use client";

import React from "react";
import { HeadingBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";

export function HeadingPublicBlock({
  block,
}: PublicBlockRendererProps<HeadingBlock>) {
  if (!block.text) return null;

  if (block.level === 3) {
    return (
      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-heading my-2">
        {block.text}
      </h3>
    );
  }

  return (
    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading my-3">
      {block.text}
    </h2>
  );
}
