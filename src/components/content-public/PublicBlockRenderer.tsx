"use client";

import React from "react";
import { ContentBlock, ContentBlockType } from "@/lib/content/types";
import {
  PublicBlockRendererProps,
  PublicViewerType,
  ResolvedPublicMediaMap,
} from "@/lib/content/public-renderer-types";
import { PublicBlockLayout } from "./PublicBlockLayout";

import { ParagraphPublicBlock } from "./renderers/ParagraphPublicBlock";
import { HeadingPublicBlock } from "./renderers/HeadingPublicBlock";
import { ImagePublicBlock } from "./renderers/ImagePublicBlock";
import { YoutubePublicBlock } from "./renderers/YoutubePublicBlock";
import { AttachmentPublicBlock } from "./renderers/AttachmentPublicBlock";
import { HeroPublicBlock } from "./renderers/HeroPublicBlock";
import { ButtonPublicBlock } from "./renderers/ButtonPublicBlock";
import { GalleryPublicBlock } from "./renderers/GalleryPublicBlock";
import { CtaPublicBlock } from "./renderers/CtaPublicBlock";
import { SponsorsPublicBlock } from "./renderers/SponsorsPublicBlock";
import { FormPublicBlock } from "./renderers/FormPublicBlock";
import { MapPublicBlock } from "./renderers/MapPublicBlock";
import { SpacerPublicBlock } from "./renderers/SpacerPublicBlock";
import { DividerPublicBlock } from "./renderers/DividerPublicBlock";
import { QuotePublicBlock } from "./renderers/QuotePublicBlock";

// -----------------------------------------------------------------------------
// PUBLIC BLOCK RENDERERS REGISTRY
// -----------------------------------------------------------------------------

const PUBLIC_RENDERERS: Record<
  ContentBlockType,
  React.ComponentType<PublicBlockRendererProps>
> = {
  paragraph: ParagraphPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  heading: HeadingPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  image: ImagePublicBlock as React.ComponentType<PublicBlockRendererProps>,
  youtube: YoutubePublicBlock as React.ComponentType<PublicBlockRendererProps>,
  attachment: AttachmentPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  hero: HeroPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  button: ButtonPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  gallery: GalleryPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  cta: CtaPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  sponsors: SponsorsPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  form: FormPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  map: MapPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  spacer: SpacerPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  divider: DividerPublicBlock as React.ComponentType<PublicBlockRendererProps>,
  quote: QuotePublicBlock as React.ComponentType<PublicBlockRendererProps>,
};

interface PublicBlockRendererComponentProps {
  block: ContentBlock;
  mediaMap: ResolvedPublicMediaMap;
  viewerType?: PublicViewerType;
}

export function PublicBlockRenderer({
  block,
  mediaMap,
  viewerType = "public",
}: PublicBlockRendererComponentProps) {
  if (!block || !block.type) return null;

  const RendererComponent = PUBLIC_RENDERERS[block.type];
  if (!RendererComponent) return null;

  return (
    <PublicBlockLayout block={block} mediaMap={mediaMap}>
      <RendererComponent
        block={block}
        mediaMap={mediaMap}
        viewerType={viewerType}
      />
    </PublicBlockLayout>
  );
}
