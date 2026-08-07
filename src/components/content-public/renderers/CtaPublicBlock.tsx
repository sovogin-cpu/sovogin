"use client";

import React from "react";
import Link from "next/link";
import { CtaBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import {
  isExternalPublicHref,
  normalizePublicHref,
} from "@/lib/content/public-renderer-utils";
import { PublicMedia } from "../PublicMedia";

export function CtaPublicBlock({
  block,
  mediaMap,
}: PublicBlockRendererProps<CtaBlock>) {
  const buttonHref = normalizePublicHref(block.buttonHref);

  const containerStyle =
    block.style === "dark"
      ? "bg-slate-900 text-white border-slate-800"
      : block.style === "brand"
      ? "bg-gradient-to-r from-[#004d4d] to-slate-900 text-white border-emerald-800"
      : "bg-emerald-50/60 dark:bg-slate-900 border-emerald-100 dark:border-slate-800 text-slate-900 dark:text-white";

  const buttonStyle =
    block.style === "light"
      ? "bg-[#006666] text-white hover:bg-[#004d4d]"
      : "bg-white text-slate-900 hover:bg-emerald-50";

  return (
    <div
      className={`my-6 p-8 sm:p-10 rounded-3xl border ${containerStyle} shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden`}
    >
      <div className="space-y-2 flex-1 min-w-0">
        {block.title && (
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading">
            {block.title}
          </h3>
        )}

        {block.text && (
          <p className="text-sm sm:text-base opacity-90 leading-relaxed max-w-2xl">
            {block.text}
          </p>
        )}
      </div>

      {block.mediaId && (
        <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden shadow">
          <PublicMedia
            mediaId={block.mediaId}
            mediaMap={mediaMap}
            expectedKind="image"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {buttonHref && block.buttonLabel && (
        <div className="shrink-0 pt-2 md:pt-0">
          {isExternalPublicHref(buttonHref) ? (
            <a
              href={buttonHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-6 py-3.5 rounded-2xl font-extrabold text-sm transition-colors shadow-md block ${buttonStyle}`}
            >
              {block.buttonLabel}
            </a>
          ) : (
            <Link
              href={buttonHref}
              className={`px-6 py-3.5 rounded-2xl font-extrabold text-sm transition-colors shadow-md block ${buttonStyle}`}
            >
              {block.buttonLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
