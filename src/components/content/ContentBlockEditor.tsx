"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  ChevronRight,
  Eye,
  Edit3,
} from "lucide-react";
import {
  ContentBlock,
  ContentBlockType,
  ContentDocumentMode,
  HeroBlock,
} from "@/lib/content/types";
import {
  createBlockId,
  createEmptyParagraphBlock,
  createEmptyHeadingBlock,
  createEmptyImageBlock,
  createEmptyYoutubeBlock,
  createEmptyAttachmentBlock,
  createEmptyHeroBlock,
  createEmptyButtonBlock,
  createEmptyGalleryBlock,
  createEmptyCtaBlock,
  createEmptySponsorsBlock,
  createEmptyFormBlock,
  createEmptyMapBlock,
  createEmptySpacerBlock,
  createEmptyDividerBlock,
  createEmptyQuoteBlock,
} from "@/lib/content/block-schema";
import { formatContentBlockType } from "@/lib/content/content-utils";
import { ContentBlockToolbar } from "./ContentBlockToolbar";
import { ContentBlockPreview } from "./ContentBlockPreview";
import { FeaturedMediaSelector } from "./FeaturedMediaSelector";

interface ContentBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  documentMode: ContentDocumentMode;
}

export const ContentBlockEditor: React.FC<ContentBlockEditorProps> = ({
  blocks,
  onChange,
  documentMode,
}) => {
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<string[]>([]);
  const [previewBlockIds, setPreviewBlockIds] = useState<string[]>([]);

  const handleAddBlock = (type: ContentBlockType) => {
    let newBlock: ContentBlock;

    switch (type) {
      case "paragraph":
        newBlock = createEmptyParagraphBlock();
        break;
      case "heading":
        newBlock = createEmptyHeadingBlock();
        break;
      case "image":
        newBlock = createEmptyImageBlock();
        break;
      case "youtube":
        newBlock = createEmptyYoutubeBlock();
        break;
      case "attachment":
        newBlock = createEmptyAttachmentBlock();
        break;
      case "hero":
        newBlock = createEmptyHeroBlock();
        break;
      case "button":
        newBlock = createEmptyButtonBlock();
        break;
      case "gallery":
        newBlock = createEmptyGalleryBlock();
        break;
      case "cta":
        newBlock = createEmptyCtaBlock();
        break;
      case "sponsors":
        newBlock = createEmptySponsorsBlock();
        break;
      case "form":
        newBlock = createEmptyFormBlock();
        break;
      case "map":
        newBlock = createEmptyMapBlock();
        break;
      case "spacer":
        newBlock = createEmptySpacerBlock();
        break;
      case "divider":
        newBlock = createEmptyDividerBlock();
        break;
      case "quote":
        newBlock = createEmptyQuoteBlock();
        break;
    }

    onChange([...blocks, newBlock]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index - 1];
    newBlocks[index - 1] = newBlocks[index];
    newBlocks[index] = temp;
    onChange(newBlocks);
  };

  const handleMoveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index + 1];
    newBlocks[index + 1] = newBlocks[index];
    newBlocks[index] = temp;
    onChange(newBlocks);
  };

  const handleDuplicate = (index: number) => {
    const target = blocks[index];
    const clonedBlock: ContentBlock = JSON.parse(JSON.stringify(target));
    clonedBlock.id = createBlockId();
    clonedBlock.version = 1;

    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, clonedBlock);
    onChange(newBlocks);
  };

  const handleDelete = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  };

  const handleUpdateBlockField = (index: number, updatedFields: Partial<ContentBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      ...updatedFields,
    } as ContentBlock;
    onChange(newBlocks);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const togglePreviewMode = (id: string) => {
    setPreviewBlockIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Blocks List */}
      <div className="space-y-4">
        {blocks.map((block, index) => {
          const isCollapsed = collapsedBlockIds.includes(block.id);
          const isPreviewMode = previewBlockIds.includes(block.id);

          return (
            <div
              key={block.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Block Header Toolbar */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(block.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        !isCollapsed ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  <span className="text-xs font-mono font-bold text-slate-400">
                    #{index + 1}
                  </span>

                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-white text-[#006666] border border-slate-200 shadow-xs">
                    {formatContentBlockType(block.type)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => togglePreviewMode(block.id)}
                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      isPreviewMode
                        ? "bg-[#006666] text-white"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                    title="Alternar vista previa"
                  >
                    {isPreviewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                    title="Mover arriba"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={index === blocks.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                    title="Mover abajo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(index)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Duplicar bloque"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                    title="Eliminar bloque"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Block Body Content */}
              {!isCollapsed && (
                <div className="p-4">
                  {isPreviewMode ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <ContentBlockPreview block={block} />
                    </div>
                  ) : (
                    <BlockFieldsForm
                      block={block}
                      onUpdate={(fields) => handleUpdateBlockField(index, fields)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Toolbar for adding new blocks */}
      <ContentBlockToolbar
        documentMode={documentMode}
        onAddBlock={handleAddBlock}
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// BLOCK FIELDS EDIT FORM COMPONENT
// -----------------------------------------------------------------------------

interface BlockFieldsFormProps {
  block: ContentBlock;
  onUpdate: (fields: Partial<ContentBlock>) => void;
}

const BlockFieldsForm: React.FC<BlockFieldsFormProps> = ({ block, onUpdate }) => {
  switch (block.type) {
    case "paragraph":
      return (
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">Texto del Párrafo</label>
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={4}
            placeholder="Escribe el texto del artículo..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
          />
        </div>
      );

    case "heading":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Texto del Título</label>
            <input
              type="text"
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Ej. Introducción al tema"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Nivel H2/H3</label>
            <select
              value={block.level}
              onChange={(e) => onUpdate({ level: Number(e.target.value) as 2 | 3 })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium"
            >
              <option value={2}>H2 (Sección Principal)</option>
              <option value={3}>H3 (Subsección)</option>
            </select>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Imagen de la Biblioteca</label>
            <FeaturedMediaSelector
              mode="single"
              selectedMediaId={block.mediaId}
              onSelectSingle={(id) => onUpdate({ mediaId: id || "" })}
              allowedType="image"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Leyenda / Pie de imagen</label>
              <input
                type="text"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ caption: e.target.value })}
                placeholder="Descripción visible bajo la foto..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Texto Alt (Accesibilidad)</label>
              <input
                type="text"
                value={block.altText || ""}
                onChange={(e) => onUpdate({ altText: e.target.value })}
                placeholder="Descripción para lectores de pantalla..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
              />
            </div>
          </div>
        </div>
      );

    case "youtube":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">URL del Video de YouTube</label>
            <input
              type="text"
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Pie de video opcional</label>
            <input
              type="text"
              value={block.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Ej. Ponencia Magistral 2026..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>
        </div>
      );

    case "attachment":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Archivo de la Biblioteca</label>
            <FeaturedMediaSelector
              mode="single"
              selectedMediaId={block.mediaId}
              onSelectSingle={(id) => onUpdate({ mediaId: id || "" })}
              allowedType="all"
              buttonLabel="Seleccionar documento / adjunto"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Etiqueta del Botón de Descarga</label>
            <input
              type="text"
              value={block.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Ej. Descargar Guía de Manejo Clínico (PDF)"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>
        </div>
      );

    case "hero":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Título Principal</label>
              <input
                type="text"
                value={block.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Título impactante..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Subtítulo</label>
              <input
                type="text"
                value={block.subtitle || ""}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                placeholder="Subtítulo explicativo..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Imagen de Fondo (Opcional)</label>
            <FeaturedMediaSelector
              mode="single"
              selectedMediaId={block.mediaId || null}
              onSelectSingle={(id) => onUpdate({ mediaId: id || undefined })}
              allowedType="image"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Primary Button */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Botón Primario</span>
              <input
                type="text"
                value={block.primaryButton?.label || ""}
                onChange={(e) =>
                  onUpdate({
                    primaryButton: {
                      label: e.target.value,
                      href: block.primaryButton?.href || "",
                    },
                  } as Partial<HeroBlock>)
                }
                placeholder="Texto del botón..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
              />
              <input
                type="text"
                value={block.primaryButton?.href || ""}
                onChange={(e) =>
                  onUpdate({
                    primaryButton: {
                      label: block.primaryButton?.label || "",
                      href: e.target.value,
                    },
                  } as Partial<HeroBlock>)
                }
                placeholder="URL (ej. /asociarse o https://...)"
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
              />
            </div>

            {/* Secondary Button */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Botón Secundario</span>
              <input
                type="text"
                value={block.secondaryButton?.label || ""}
                onChange={(e) =>
                  onUpdate({
                    secondaryButton: {
                      label: e.target.value,
                      href: block.secondaryButton?.href || "",
                    },
                  } as Partial<HeroBlock>)
                }
                placeholder="Texto del botón..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
              />
              <input
                type="text"
                value={block.secondaryButton?.href || ""}
                onChange={(e) =>
                  onUpdate({
                    secondaryButton: {
                      label: block.secondaryButton?.label || "",
                      href: e.target.value,
                    },
                  } as Partial<HeroBlock>)
                }
                placeholder="URL..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
              />
            </div>
          </div>
        </div>
      );

    case "button":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Etiqueta del Botón</label>
            <input
              type="text"
              value={block.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Ej. Conoce más sobre SOVOGIN"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Variante</label>
            <select
              value={block.variant}
              onChange={(e) =>
                onUpdate({ variant: e.target.value as "primary" | "secondary" | "outline" })
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="primary">Primario (Verde SOVOGIN)</option>
              <option value="secondary">Secundario (Gris)</option>
              <option value="outline">Borde (Outline)</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700">Enlace (href)</label>
            <input
              type="text"
              value={block.href}
              onChange={(e) => onUpdate({ href: e.target.value })}
              placeholder="Ruta relativa /contacto o URL https://..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Imágenes de la Galería</label>
            <FeaturedMediaSelector
              mode="multiple"
              selectedMediaIds={block.mediaIds}
              onSelectMultiple={(ids) => onUpdate({ mediaIds: ids })}
              allowedType="image"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Columnas de Cuadrícula</label>
              <select
                value={block.columns}
                onChange={(e) => onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value={2}>2 Columnas</option>
                <option value={3}>3 Columnas</option>
                <option value={4}>4 Columnas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Pie de Galería</label>
              <input
                type="text"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ caption: e.target.value })}
                placeholder="Descripción para la galería..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Título CTA</label>
              <input
                type="text"
                value={block.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="¿Te interesa afiliarte?"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Estilo Visual</label>
              <select
                value={block.style}
                onChange={(e) => onUpdate({ style: e.target.value as "light" | "dark" | "brand" })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="brand">Marca SOVOGIN</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Texto del Botón</label>
              <input
                type="text"
                value={block.buttonLabel}
                onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
                placeholder="Ir a Pago de Afiliación"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Enlace del Botón</label>
              <input
                type="text"
                value={block.buttonHref}
                onChange={(e) => onUpdate({ buttonHref: e.target.value })}
                placeholder="/pagos"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Texto de la Cita</label>
            <textarea
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              rows={2}
              placeholder="Frase o testimonio..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Autor</label>
              <input
                type="text"
                value={block.author || ""}
                onChange={(e) => onUpdate({ author: e.target.value })}
                placeholder="Dr. Carlos Pérez"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Fuente / Cargo</label>
              <input
                type="text"
                value={block.source || ""}
                onChange={(e) => onUpdate({ source: e.target.value })}
                placeholder="Presidente SOVOGIN 2026"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">Tamaño del Espaciador</label>
          <select
            value={block.size}
            onChange={(e) => onUpdate({ size: e.target.value as "small" | "medium" | "large" })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="small">Pequeño (16px)</option>
            <option value="medium">Mediano (32px)</option>
            <option value="large">Grande (64px)</option>
          </select>
        </div>
      );

    case "divider":
      return (
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">Estilo de Línea</label>
          <select
            value={block.style}
            onChange={(e) => onUpdate({ style: e.target.value as "solid" | "dashed" | "subtle" })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="subtle">Sutil (Gris claro)</option>
            <option value="solid">Sólida (Gris medio)</option>
            <option value="dashed">Punteada (Dashed)</option>
          </select>
        </div>
      );

    case "sponsors":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Título de la Sección</label>
            <input
              type="text"
              value={block.title || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Nuestros Patrocinadores"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Modo de Presentación</label>
            <select
              value={block.displayStyle}
              onChange={(e) => onUpdate({ displayStyle: e.target.value as "grid" | "carousel" })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="grid">Cuadrícula (Grid)</option>
              <option value="carousel">Carrusel Infinito</option>
            </select>
          </div>
        </div>
      );

    case "form":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Clave de Formulario (formKey)</label>
            <input
              type="text"
              value={block.formKey}
              onChange={(e) => onUpdate({ formKey: e.target.value })}
              placeholder="contact"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Título Opcional</label>
            <input
              type="text"
              value={block.title || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Escríbenos tu consulta"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      );

    case "map":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Dirección Física</label>
            <input
              type="text"
              value={block.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
              placeholder="Calle 20 Norte No. 6N – 33, Cali"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">Latitud (-90 a 90)</label>
              <input
                type="number"
                step="0.0001"
                value={block.latitude ?? ""}
                onChange={(e) =>
                  onUpdate({ latitude: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">Longitud (-180 a 180)</label>
              <input
                type="number"
                step="0.0001"
                value={block.longitude ?? ""}
                onChange={(e) =>
                  onUpdate({ longitude: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">Zoom (1 a 20)</label>
              <input
                type="number"
                min={1}
                max={20}
                value={block.zoom ?? 15}
                onChange={(e) => onUpdate({ zoom: Number(e.target.value) })}
                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded"
              />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
