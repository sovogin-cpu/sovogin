"use client";

import React from "react";
import { QuoteBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";

export function QuotePublicBlock({
  block,
}: PublicBlockRendererProps<QuoteBlock>) {
  if (!block.text) return null;

  return (
    <blockquote className="my-6 pl-6 border-l-4 border-[#006666] dark:border-emerald-400 italic text-slate-800 dark:text-slate-200">
      <p className="text-lg sm:text-xl font-serif leading-relaxed">
        &ldquo;{block.text}&rdquo;
      </p>
      {(block.author || block.source) && (
        <footer className="mt-3 text-xs sm:text-sm font-sans not-italic text-slate-500 dark:text-slate-400 font-medium">
          — {block.author}
          {block.source && (
            <cite className="ml-1 not-italic font-normal text-slate-400">
              ({block.source})
            </cite>
          )}
        </footer>
      )}
    </blockquote>
  );
}
