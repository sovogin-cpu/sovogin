"use client";

import React from "react";
import {
  AttachmentBlock,
  ButtonBlock,
  ContentBlock,
  ContentBlockType,
  CtaBlock,
  DividerBlock,
  FormBlock,
  GalleryBlock,
  HeadingBlock,
  HeroBlock,
  ImageBlock,
  MapBlock,
  ParagraphBlock,
  QuoteBlock,
  SpacerBlock,
  SponsorsBlock,
  YoutubeBlock,
} from "@/lib/content/types";
import { getYoutubeEmbedUrl } from "@/lib/content/content-utils";
import {
  FileText,
  Image as ImageIcon,
  Video,
  ExternalLink,
  MapPin,
  FormInput,
  Award,
} from "lucide-react";

export interface BlockRendererProps {
  block: ContentBlock;
  isEditing?: boolean;
  onChange?: (updatedBlock: ContentBlock) => void;
}

interface PreviewBlockProps<T extends ContentBlock> {
  block: T;
}

// -----------------------------------------------------------------------------
// PREVIEW RENDERERS (CLEAN & FOCUSED ON VISUAL PREVIEW)
// -----------------------------------------------------------------------------

function ParagraphRenderer({ block }: PreviewBlockProps<ParagraphBlock>) {
  return (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base whitespace-pre-wrap">
      {block.text || <span className="text-slate-400 italic">Párrafo vacío</span>}
    </p>
  );
}

function HeadingRenderer({ block }: PreviewBlockProps<HeadingBlock>) {
  if (block.level === 3) {
    return (
      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {block.text || <span className="text-slate-400 italic">Título H3 vacío</span>}
      </h3>
    );
  }

  return (
    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
      {block.text || <span className="text-slate-400 italic">Título H2 vacío</span>}
    </h2>
  );
}

function QuoteRenderer({ block }: PreviewBlockProps<QuoteBlock>) {
  return (
    <blockquote className="pl-4 border-l-4 border-indigo-500 italic my-2 text-slate-700 dark:text-slate-300">
      <p className="text-lg font-serif">{block.text || "Cita de texto..."}</p>
      {(block.author || block.source) && (
        <footer className="mt-2 text-xs font-sans not-italic text-slate-500 dark:text-slate-400">
          — {block.author} {block.source ? `(${block.source})` : ""}
        </footer>
      )}
    </blockquote>
  );
}

function ImageRenderer({ block }: PreviewBlockProps<ImageBlock>) {
  return (
    <div className="space-y-2">
      <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-400">
        <ImageIcon className="w-10 h-10 mb-2 opacity-60" />
        <span className="text-xs font-medium">Imagen: {block.mediaId || "Sin seleccionar"}</span>
      </div>
      {block.caption && (
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 italic">
          {block.caption}
        </p>
      )}
    </div>
  );
}

function YoutubeRenderer({ block }: PreviewBlockProps<YoutubeBlock>) {
  const embedUrl = getYoutubeEmbedUrl(block.url);

  return (
    <div className="space-y-2">
      {embedUrl ? (
        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube preview"
          />
        </div>
      ) : (
        <div className="aspect-video bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
          <Video className="w-8 h-8 mb-2 opacity-60" />
          <span className="text-xs font-medium">
            {block.url ? "URL de YouTube no válida" : "Sin video asignado"}
          </span>
        </div>
      )}
      {block.caption && (
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 italic">
          {block.caption}
        </p>
      )}
    </div>
  );
}

function AttachmentRenderer({ block }: PreviewBlockProps<AttachmentBlock>) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block truncate">
          {block.label || "Archivo sin título"}
        </span>
        <span className="text-xs text-slate-500 font-mono">ID: {block.mediaId || "No asignado"}</span>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400" />
    </div>
  );
}

function HeroRenderer({ block }: PreviewBlockProps<HeroBlock>) {
  const alignClass =
    block.alignment === "left"
      ? "text-left items-start"
      : block.alignment === "right"
      ? "text-right items-end"
      : "text-center items-center";

  return (
    <div className={`p-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white flex flex-col ${alignClass} gap-3 shadow-lg`}>
      <h1 className="text-3xl font-extrabold tracking-tight">
        {block.title || "Título de Hero"}
      </h1>
      {block.subtitle && (
        <p className="text-slate-300 max-w-xl text-base">{block.subtitle}</p>
      )}
      {block.primaryButton?.label && (
        <span className="mt-2 px-5 py-2 rounded-lg bg-indigo-500 text-white text-xs font-semibold">
          {block.primaryButton.label}
        </span>
      )}
    </div>
  );
}

function ButtonRenderer({ block }: PreviewBlockProps<ButtonBlock>) {
  const justify =
    block.alignment === "left"
      ? "justify-start"
      : block.alignment === "right"
      ? "justify-end"
      : "justify-center";

  return (
    <div className={`flex ${justify} py-1`}>
      <span className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm shadow">
        {block.label || "Botón sin texto"}
      </span>
    </div>
  );
}

function GalleryRenderer({ block }: PreviewBlockProps<GalleryBlock>) {
  return (
    <div className="space-y-2">
      <div className={`grid grid-cols-${block.columns} gap-2`}>
        {block.mediaIds.length === 0 ? (
          <div className="col-span-full p-6 text-center text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            Galería vacía (sin imágenes seleccionadas)
          </div>
        ) : (
          block.mediaIds.map((id, idx) => (
            <div
              key={idx}
              className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs font-mono"
            >
              Img #{idx + 1}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CtaRenderer({ block }: PreviewBlockProps<CtaBlock>) {
  return (
    <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
          {block.title || "Llamado a la Acción"}
        </h4>
        {block.text && (
          <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1">
            {block.text}
          </p>
        )}
      </div>
      <span className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-xs shrink-0 shadow">
        {block.buttonLabel || "Acción"}
      </span>
    </div>
  );
}

function SponsorsRenderer({ block }: PreviewBlockProps<SponsorsBlock>) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
      <Award className="w-5 h-5 text-indigo-500" />
      <div>
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          {block.title || "Patrocinadores y Aliados"}
        </span>
        <span className="block text-xs text-slate-500">
          Módulo de patrocinadores ({block.displayStyle})
        </span>
      </div>
    </div>
  );
}

function FormRenderer({ block }: PreviewBlockProps<FormBlock>) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
      <FormInput className="w-5 h-5 text-indigo-500" />
      <div>
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          Formulario: {block.formKey}
        </span>
        <span className="block text-xs text-slate-500">
          {block.title || "Incrustación de formulario dinámico"}
        </span>
      </div>
    </div>
  );
}

function MapRenderer({ block }: PreviewBlockProps<MapBlock>) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
      <MapPin className="w-5 h-5 text-emerald-500" />
      <div>
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          {block.title || "Ubicación Geográfica"}
        </span>
        <span className="block text-xs text-slate-500">{block.address}</span>
      </div>
    </div>
  );
}

function SpacerRenderer({ block }: PreviewBlockProps<SpacerBlock>) {
  const heightClass =
    block.size === "small"
      ? "h-4"
      : block.size === "large"
      ? "h-16"
      : "h-8";

  return (
    <div className={`w-full ${heightClass} bg-slate-100/50 dark:bg-slate-800/30 rounded border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono`}>
      Espaciador ({block.size})
    </div>
  );
}

function DividerRenderer({ block }: PreviewBlockProps<DividerBlock>) {
  const borderClass =
    block.style === "dashed"
      ? "border-dashed border-slate-300 dark:border-slate-700"
      : block.style === "solid"
      ? "border-solid border-slate-400 dark:border-slate-600"
      : "border-solid border-slate-200 dark:border-slate-800";

  return <hr className={`my-4 border-t ${borderClass}`} />;
}

// -----------------------------------------------------------------------------
// RENDERER REGISTRY (PREVIEW ENFOCADO - NO GIANT SWITCH CASE)
// -----------------------------------------------------------------------------

const BLOCK_RENDERERS: Record<ContentBlockType, React.FC<BlockRendererProps>> = {
  paragraph: ParagraphRenderer as React.FC<BlockRendererProps>,
  heading: HeadingRenderer as React.FC<BlockRendererProps>,
  image: ImageRenderer as React.FC<BlockRendererProps>,
  youtube: YoutubeRenderer as React.FC<BlockRendererProps>,
  attachment: AttachmentRenderer as React.FC<BlockRendererProps>,
  hero: HeroRenderer as React.FC<BlockRendererProps>,
  button: ButtonRenderer as React.FC<BlockRendererProps>,
  gallery: GalleryRenderer as React.FC<BlockRendererProps>,
  cta: CtaRenderer as React.FC<BlockRendererProps>,
  sponsors: SponsorsRenderer as React.FC<BlockRendererProps>,
  form: FormRenderer as React.FC<BlockRendererProps>,
  map: MapRenderer as React.FC<BlockRendererProps>,
  spacer: SpacerRenderer as React.FC<BlockRendererProps>,
  divider: DividerRenderer as React.FC<BlockRendererProps>,
  quote: QuoteRenderer as React.FC<BlockRendererProps>,
};

export function BlockRenderer({ block }: BlockRendererProps) {
  const TargetComponent = BLOCK_RENDERERS[block.type];

  if (!TargetComponent) {
    return (
      <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
        Tipo de bloque desconocido: {(block as ContentBlock).type}
      </div>
    );
  }

  return <TargetComponent block={block} />;
}
