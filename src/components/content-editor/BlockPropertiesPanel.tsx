"use client";

import React from "react";
import { ContentBlock, ContentBlockType } from "@/lib/content/types";
import { BlockPropertiesProps, EditorMode } from "@/lib/content/editor-types";
import { formatContentBlockType } from "@/lib/content/content-utils";
import { X, SlidersHorizontal } from "lucide-react";

import { ParagraphProperties } from "./properties/ParagraphProperties";
import { HeadingProperties } from "./properties/HeadingProperties";
import { ImageProperties } from "./properties/ImageProperties";
import { YoutubeProperties } from "./properties/YoutubeProperties";
import { AttachmentProperties } from "./properties/AttachmentProperties";
import { HeroProperties } from "./properties/HeroProperties";
import { ButtonProperties } from "./properties/ButtonProperties";
import { GalleryProperties } from "./properties/GalleryProperties";
import { CtaProperties } from "./properties/CtaProperties";
import { SponsorsProperties } from "./properties/SponsorsProperties";
import { FormProperties } from "./properties/FormProperties";
import { MapProperties } from "./properties/MapProperties";
import { SpacerProperties } from "./properties/SpacerProperties";
import { DividerProperties } from "./properties/DividerProperties";
import { QuoteProperties } from "./properties/QuoteProperties";

interface BlockPropertiesPanelProps {
  block: ContentBlock | null;
  onChange: (updatedBlock: ContentBlock) => void;
  onClose: () => void;
  mode?: EditorMode;
}

// -----------------------------------------------------------------------------
// TYPED PROPERTY EDITORS REGISTRY (NO GIANT SWITCH CASE)
// -----------------------------------------------------------------------------

const PROPERTY_EDITORS: Record<
  ContentBlockType,
  React.ComponentType<BlockPropertiesProps>
> = {
  paragraph: ParagraphProperties as React.ComponentType<BlockPropertiesProps>,
  heading: HeadingProperties as React.ComponentType<BlockPropertiesProps>,
  image: ImageProperties as React.ComponentType<BlockPropertiesProps>,
  youtube: YoutubeProperties as React.ComponentType<BlockPropertiesProps>,
  attachment: AttachmentProperties as React.ComponentType<BlockPropertiesProps>,
  hero: HeroProperties as React.ComponentType<BlockPropertiesProps>,
  button: ButtonProperties as React.ComponentType<BlockPropertiesProps>,
  gallery: GalleryProperties as React.ComponentType<BlockPropertiesProps>,
  cta: CtaProperties as React.ComponentType<BlockPropertiesProps>,
  sponsors: SponsorsProperties as React.ComponentType<BlockPropertiesProps>,
  form: FormProperties as React.ComponentType<BlockPropertiesProps>,
  map: MapProperties as React.ComponentType<BlockPropertiesProps>,
  spacer: SpacerProperties as React.ComponentType<BlockPropertiesProps>,
  divider: DividerProperties as React.ComponentType<BlockPropertiesProps>,
  quote: QuoteProperties as React.ComponentType<BlockPropertiesProps>,
};

export function BlockPropertiesPanel({
  block,
  onChange,
  onClose,
  mode = "article",
}: BlockPropertiesPanelProps) {
  if (!block) return null;

  const EditorComponent = PROPERTY_EDITORS[block.type];

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-lg shrink-0 overflow-hidden rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {formatContentBlockType(block.type)}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              ID: {block.id} (v{block.version})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Cerrar panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {EditorComponent ? (
          <EditorComponent block={block} onChange={onChange} mode={mode} />
        ) : (
          <div className="text-xs text-red-500 p-3 bg-red-50 rounded-lg">
            No hay editor configurado para este tipo de bloque.
          </div>
        )}
      </div>
    </aside>
  );
}
