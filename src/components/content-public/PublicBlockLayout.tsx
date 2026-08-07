"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import {
  createDefaultBlockLayout,
  getBlockAlignmentClasses,
  getBlockBackgroundClasses,
  getBlockColumnClasses,
  getBlockGapClasses,
  getBlockSpacingClasses,
  getBlockWidthClasses,
} from "@/lib/content/block-layout-utils";
import {
  blockSupportsColumns,
  getResponsiveVisibilityClasses,
} from "@/lib/content/public-renderer-utils";
import { ResolvedPublicMediaMap } from "@/lib/content/public-renderer-types";

interface PublicBlockLayoutProps {
  block: ContentBlock;
  mediaMap: ResolvedPublicMediaMap;
  children: React.ReactNode;
}

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function PublicBlockLayout({
  block,
  mediaMap,
  children,
}: PublicBlockLayoutProps) {
  const layout = block.layout || createDefaultBlockLayout();

  const widthClasses = getBlockWidthClasses(layout.width);
  const alignmentClasses = getBlockAlignmentClasses(layout.alignment);
  const spacingClasses = getBlockSpacingClasses(layout);
  const responsiveClasses = getResponsiveVisibilityClasses(layout.responsive);
  const bgClasses = getBlockBackgroundClasses(layout.background);

  const supportsGrid = blockSupportsColumns(block.type);
  const columnClasses = supportsGrid
    ? getBlockColumnClasses(layout.columns, layout.responsive)
    : "w-full";
  const gapClasses = supportsGrid ? getBlockGapClasses(layout.columnGap) : "";

  const isColorBg =
    layout.background.type === "color" &&
    layout.background.color &&
    HEX_COLOR_REGEX.test(layout.background.color);

  const isImageBg =
    layout.background.type === "image" && layout.background.mediaId;

  const bgMediaItem = isImageBg
    ? mediaMap[layout.background.mediaId!]
    : undefined;
  const bgImageUrl = bgMediaItem?.signedUrl;

  return (
    <section
      className={`relative w-full ${responsiveClasses} ${spacingClasses}`}
    >
      <div
        className={`relative overflow-hidden transition-all ${widthClasses} ${bgClasses}`}
        style={{
          ...(isColorBg ? { backgroundColor: layout.background.color } : {}),
          ...(bgImageUrl ? { backgroundImage: `url(${bgImageUrl})` } : {}),
        }}
      >
        {/* Background Overlay */}
        {bgImageUrl && layout.background.overlay && (
          <div className="absolute inset-0 bg-slate-950/60 pointer-events-none z-0" />
        )}

        <div
          className={`relative z-10 ${
            supportsGrid ? columnClasses : "w-full"
          } ${gapClasses} ${alignmentClasses}`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
