"use client";

import React from "react";
import Link from "next/link";
import { ButtonBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import {
  isExternalPublicHref,
  normalizePublicHref,
} from "@/lib/content/public-renderer-utils";

export function ButtonPublicBlock({
  block,
}: PublicBlockRendererProps<ButtonBlock>) {
  const href = normalizePublicHref(block.href);
  if (!href || !block.label) return null;

  const isExternal = block.openInNewTab || isExternalPublicHref(href);

  const justifyClass =
    block.alignment === "left"
      ? "justify-start text-left"
      : block.alignment === "right"
      ? "justify-end text-right"
      : "justify-center text-center";

  const variantClass =
    block.variant === "secondary"
      ? "bg-slate-800 text-white hover:bg-slate-700 shadow-md"
      : block.variant === "outline"
      ? "border-2 border-[#006666] text-[#006666] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
      : "bg-[#006666] text-white hover:bg-[#004d4d] shadow-lg shadow-emerald-900/10";

  const buttonContent = (
    <span
      className={`inline-flex items-center justify-center px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${variantClass}`}
    >
      {block.label}
    </span>
  );

  return (
    <div className={`flex w-full ${justifyClass} my-3`}>
      {isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={block.label}
        >
          {buttonContent}
        </a>
      ) : (
        <Link href={href} aria-label={block.label}>
          {buttonContent}
        </Link>
      )}
    </div>
  );
}
