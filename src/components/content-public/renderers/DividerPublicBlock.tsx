"use client";

import React from "react";
import { DividerBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";

export function DividerPublicBlock({
  block,
}: PublicBlockRendererProps<DividerBlock>) {
  const borderStyle =
    block.style === "dashed"
      ? "border-dashed border-slate-300 dark:border-slate-700"
      : block.style === "solid"
      ? "border-solid border-slate-400 dark:border-slate-600"
      : "border-solid border-slate-200 dark:border-slate-800/80";

  return <hr className={`my-8 border-t ${borderStyle}`} />;
}
