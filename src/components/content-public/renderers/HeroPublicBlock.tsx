"use client";

import React from "react";
import Link from "next/link";
import { HeroBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import {
  isExternalPublicHref,
  normalizePublicHref,
} from "@/lib/content/public-renderer-utils";

export function HeroPublicBlock({
  block,
  mediaMap,
}: PublicBlockRendererProps<HeroBlock>) {
  const bgItem = block.mediaId ? mediaMap[block.mediaId] : undefined;
  const bgUrl = bgItem?.signedUrl;

  const alignClasses =
    block.alignment === "left"
      ? "text-left items-start"
      : block.alignment === "right"
      ? "text-right items-end"
      : "text-center items-center";

  const primaryHref = normalizePublicHref(block.primaryButton?.href);
  const primaryIsExternal = isExternalPublicHref(primaryHref);

  const secondaryHref = normalizePublicHref(block.secondaryButton?.href);
  const secondaryIsExternal = isExternalPublicHref(secondaryHref);

  return (
    <div
      className={`relative my-6 p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-slate-900 via-[#003333] to-slate-900 text-white flex flex-col ${alignClasses} gap-4 shadow-xl overflow-hidden`}
      style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {bgUrl && (block.overlay ?? true) && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />
      )}

      <div className={`relative z-10 flex flex-col ${alignClasses} gap-4 max-w-3xl`}>
        {block.title && (
          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight leading-tight">
            {block.title}
          </h1>
        )}

        {block.subtitle && (
          <p className="text-slate-200 text-base sm:text-xl font-light leading-relaxed">
            {block.subtitle}
          </p>
        )}

        {(primaryHref || secondaryHref) && (
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {primaryHref && block.primaryButton?.label && (
              primaryIsExternal ? (
                <a
                  href={primaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-emerald-50 font-bold text-sm transition-colors shadow-lg"
                >
                  {block.primaryButton.label}
                </a>
              ) : (
                <Link
                  href={primaryHref}
                  className="px-6 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-emerald-50 font-bold text-sm transition-colors shadow-lg"
                >
                  {block.primaryButton.label}
                </Link>
              )
            )}

            {secondaryHref && block.secondaryButton?.label && (
              secondaryIsExternal ? (
                <a
                  href={secondaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-sm border border-white/20 transition-colors"
                >
                  {block.secondaryButton.label}
                </a>
              ) : (
                <Link
                  href={secondaryHref}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-sm border border-white/20 transition-colors"
                >
                  {block.secondaryButton.label}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
