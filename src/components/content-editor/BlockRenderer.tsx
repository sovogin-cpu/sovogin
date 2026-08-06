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
  isEditing: boolean;
  onChange: (updatedBlock: ContentBlock) => void;
}

interface SpecificBlockProps<T extends ContentBlock> {
  block: T;
  isEditing: boolean;
  onChange: (updatedBlock: T) => void;
}

// -----------------------------------------------------------------------------
// INDIVIDUAL RENDERERS
// -----------------------------------------------------------------------------

function ParagraphRenderer({ block, isEditing, onChange }: SpecificBlockProps<ParagraphBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Texto del párrafos
        </label>
        <textarea
          rows={4}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Escribe aquí el contenido del párrafo..."
          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
    );
  }

  return (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base whitespace-pre-wrap">
      {block.text || <span className="text-slate-400 italic">Párrafo vacío</span>}
    </p>
  );
}

function HeadingRenderer({ block, isEditing, onChange }: SpecificBlockProps<HeadingBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Texto del Título
            </label>
            <input
              type="text"
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder="Título de la sección..."
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nivel
            </label>
            <select
              value={block.level}
              onChange={(e) =>
                onChange({ ...block, level: Number(e.target.value) as 2 | 3 })
              }
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value={2}>H2 - Título Principal</option>
              <option value={3}>H3 - Subtítulo</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

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

function QuoteRenderer({ block, isEditing, onChange }: SpecificBlockProps<QuoteBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Texto de la cita
          </label>
          <textarea
            rows={3}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Texto destacado de la cita..."
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Autor
            </label>
            <input
              type="text"
              value={block.author || ""}
              onChange={(e) => onChange({ ...block, author: e.target.value })}
              placeholder="Nombre del autor"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fuente / Cargo
            </label>
            <input
              type="text"
              value={block.source || ""}
              onChange={(e) => onChange({ ...block, source: e.target.value })}
              placeholder="Libro, evento o institución"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

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

function ImageRenderer({ block, isEditing, onChange }: SpecificBlockProps<ImageBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ID Multimedia (mediaId)
          </label>
          <input
            type="text"
            value={block.mediaId}
            onChange={(e) => onChange({ ...block, mediaId: e.target.value })}
            placeholder="ID de archivo en la biblioteca..."
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Leyenda (Caption)
            </label>
            <input
              type="text"
              value={block.caption || ""}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              placeholder="Descripción visible bajo la imagen"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Texto Alternativo (Alt)
            </label>
            <input
              type="text"
              value={block.altText || ""}
              onChange={(e) => onChange({ ...block, altText: e.target.value })}
              placeholder="Texto accesible para lectores"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

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

function YoutubeRenderer({ block, isEditing, onChange }: SpecificBlockProps<YoutubeBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            URL de Video YouTube
          </label>
          <input
            type="url"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Leyenda opcional
          </label>
          <input
            type="text"
            value={block.caption || ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Descripción del video"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
    );
  }

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
        <div className="aspect-video bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col items-center justify-center text-red-500 p-4 text-center">
          <Video className="w-8 h-8 mb-2" />
          <span className="text-xs font-medium">Ingresa una URL válida de YouTube</span>
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

function AttachmentRenderer({ block, isEditing, onChange }: SpecificBlockProps<AttachmentBlock>) {
  if (isEditing) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Etiqueta del Archivo
          </label>
          <input
            type="text"
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Ej: Descargar PDF de la presentación"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ID Multimedia (mediaId)
          </label>
          <input
            type="text"
            value={block.mediaId}
            onChange={(e) => onChange({ ...block, mediaId: e.target.value })}
            placeholder="ID de archivo"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
    );
  }

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

function HeroRenderer({ block, isEditing, onChange }: SpecificBlockProps<HeroBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Título del Hero
          </label>
          <input
            type="text"
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Título principal del banner..."
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Subtítulo
          </label>
          <input
            type="text"
            value={block.subtitle || ""}
            onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
            placeholder="Subtítulo secundario..."
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alineación
            </label>
            <select
              value={block.alignment}
              onChange={(e) =>
                onChange({
                  ...block,
                  alignment: e.target.value as "left" | "center" | "right",
                })
              }
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Media ID de Fondo
            </label>
            <input
              type="text"
              value={block.mediaId || ""}
              onChange={(e) => onChange({ ...block, mediaId: e.target.value })}
              placeholder="ID imagen de fondo"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

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

function ButtonRenderer({ block, isEditing, onChange }: SpecificBlockProps<ButtonBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Texto del Botón
            </label>
            <input
              type="text"
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="Ej: Ver más información"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Enlace (Href)
            </label>
            <input
              type="text"
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="https://..."
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Estilo
            </label>
            <select
              value={block.variant}
              onChange={(e) =>
                onChange({
                  ...block,
                  variant: e.target.value as "primary" | "secondary" | "outline",
                })
              }
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="primary">Primario</option>
              <option value="secondary">Secundario</option>
              <option value="outline">Borde (Outline)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alineación
            </label>
            <select
              value={block.alignment}
              onChange={(e) =>
                onChange({
                  ...block,
                  alignment: e.target.value as "left" | "center" | "right",
                })
              }
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

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

function GalleryRenderer({ block, isEditing, onChange }: SpecificBlockProps<GalleryBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            IDs de Imágenes (separadas por coma)
          </label>
          <input
            type="text"
            value={block.mediaIds.join(", ")}
            onChange={(e) =>
              onChange({
                ...block,
                mediaIds: e.target.value.split(",").map((s) => s.trim()),
              })
            }
            placeholder="media_id_1, media_id_2..."
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Columnas
            </label>
            <select
              value={block.columns}
              onChange={(e) =>
                onChange({
                  ...block,
                  columns: Number(e.target.value) as 2 | 3 | 4,
                })
              }
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value={2}>2 Columnas</option>
              <option value={3}>3 Columnas</option>
              <option value={4}>4 Columnas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Leyenda opcional
            </label>
            <input
              type="text"
              value={block.caption || ""}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              placeholder="Pie de foto de la galería"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

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

function CtaRenderer({ block, isEditing, onChange }: SpecificBlockProps<CtaBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Título del CTA
          </label>
          <input
            type="text"
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Título destacado del llamado a la acción"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Texto explicativo
          </label>
          <input
            type="text"
            value={block.text || ""}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Descripción secundaría"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Texto del Botón
            </label>
            <input
              type="text"
              value={block.buttonLabel}
              onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })}
              placeholder="Ej: Registrarse"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Estilo Visual
            </label>
            <select
              value={block.style}
              onChange={(e) =>
                onChange({
                  ...block,
                  style: e.target.value as "light" | "dark" | "brand",
                })
              }
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="brand">Marca (Índigo)</option>
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

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

function SponsorsRenderer({ block, isEditing, onChange }: SpecificBlockProps<SponsorsBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Título del bloque
          </label>
          <input
            type="text"
            value={block.title || ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Nuestros Patrocinadores"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={block.showAllActive}
              onChange={(e) =>
                onChange({ ...block, showAllActive: e.target.checked })
              }
              className="rounded text-indigo-600"
            />
            <span>Mostrar todos los activos</span>
          </label>
        </div>
      </div>
    );
  }

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

function FormRenderer({ block, isEditing, onChange }: SpecificBlockProps<FormBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Clave del Formulario (formKey)
          </label>
          <input
            type="text"
            value={block.formKey}
            onChange={(e) => onChange({ ...block, formKey: e.target.value })}
            placeholder="contact, registry, etc."
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Título opcional
          </label>
          <input
            type="text"
            value={block.title || ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Título del formulario"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
    );
  }

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

function MapRenderer({ block, isEditing, onChange }: SpecificBlockProps<MapBlock>) {
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={block.address}
            onChange={(e) => onChange({ ...block, address: e.target.value })}
            placeholder="Calle 20 Norte No. 6N – 33, Cali"
            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
    );
  }

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

function SpacerRenderer({ block, isEditing, onChange }: SpecificBlockProps<SpacerBlock>) {
  if (isEditing) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Tamaño del Espacio
        </label>
        <select
          value={block.size}
          onChange={(e) =>
            onChange({
              ...block,
              size: e.target.value as "small" | "medium" | "large",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="small">Pequeño (16px)</option>
          <option value="medium">Mediano (32px)</option>
          <option value="large">Grande (64px)</option>
        </select>
      </div>
    );
  }

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

function DividerRenderer({ block, isEditing, onChange }: SpecificBlockProps<DividerBlock>) {
  if (isEditing) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Estilo de Línea
        </label>
        <select
          value={block.style}
          onChange={(e) =>
            onChange({
              ...block,
              style: e.target.value as "solid" | "dashed" | "subtle",
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="solid">Sólido</option>
          <option value="dashed">Punteado</option>
          <option value="subtle">Sutil</option>
        </select>
      </div>
    );
  }

  const borderClass =
    block.style === "dashed"
      ? "border-dashed border-slate-300 dark:border-slate-700"
      : block.style === "solid"
      ? "border-solid border-slate-400 dark:border-slate-600"
      : "border-solid border-slate-200 dark:border-slate-800";

  return <hr className={`my-4 border-t ${borderClass}`} />;
}

// -----------------------------------------------------------------------------
// RENDERER REGISTRY (NO GIANT SWITCH CASE)
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

export function BlockRenderer({ block, isEditing, onChange }: BlockRendererProps) {
  const TargetComponent = BLOCK_RENDERERS[block.type];

  if (!TargetComponent) {
    return (
      <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
        Tipo de bloque desconocido: {(block as ContentBlock).type}
      </div>
    );
  }

  return <TargetComponent block={block} isEditing={isEditing} onChange={onChange} />;
}
